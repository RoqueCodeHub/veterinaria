import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriasService, Categoria, CategoriaForm } from '../../../core/services/categorias.service';

interface CategoriaNodo {
  categoria: Categoria;
  hijas: CategoriaNodo[];
}

interface FilaCategoria {
  categoria: Categoria;
  depth: number;
  childCount: number;
}

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css',
})
export class Categorias implements OnInit {
  private svc = inject(CategoriasService);

  // Estados de datos (Signals)
  categorias = signal<Categoria[]>([]);
  expanded = signal<Set<number>>(new Set());
  loading = signal(false);
  savingModal = signal(false);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  // Filtros reactivos con Signals
  busquedaTexto = signal('');
  filtroEstado = signal<'todos' | 'activas' | 'inactivas'>('todos');

  // Modales
  showModal = signal(false);
  editingId = signal<number | null>(null);
  deleteConfirmId = signal<number | null>(null);

  // Formulario
  form: CategoriaForm & { parent_id?: number | null } = this.emptyForm();

  // Métricas KPI
  metricas = computed(() => {
    const list = this.categorias();
    const total = list.length;
    const principales = list.filter(c => !c.parent_id || c.parent_id === 0).length;
    const subcategorias = total - principales;
    const activas = list.filter(c => c.activo !== false).length;

    return { total, principales, subcategorias, activas };
  });

  // Árbol de categorías
  private arbol = computed(() => this.buildTree(this.categorias()));

  // Filas planas para renderizar la tabla jerárquica
  filas = computed(() => {
    const q = this.busquedaTexto().toLowerCase().trim();
    const est = this.filtroEstado();
    const open = this.expanded();

    // Si hay búsqueda o filtro por estado, mostramos lista plana filtrada
    if (q || est !== 'todos') {
      return this.categorias()
        .filter(c => {
          const coincideTexto = !q || c.nombre.toLowerCase().includes(q) || (c.descripcion || '').toLowerCase().includes(q);
          let coincideEstado = true;
          if (est === 'activas') coincideEstado = c.activo !== false;
          if (est === 'inactivas') coincideEstado = c.activo === false;
          return coincideTexto && coincideEstado;
        })
        .map(c => ({
          categoria: c,
          depth: 0,
          childCount: 0,
        }));
    }

    // Modo jerárquico normal (Árbol desplegable)
    const rows: FilaCategoria[] = [];
    const walk = (nodes: CategoriaNodo[], depth: number) => {
      for (const node of nodes) {
        rows.push({
          categoria: node.categoria,
          depth,
          childCount: node.hijas.length,
        });
        if (node.hijas.length && open.has(node.categoria.id)) {
          walk(node.hijas, depth + 1);
        }
      }
    };
    walk(this.arbol(), 0);
    return rows;
  });

  // Categorías disponibles para ser Padres en el Modal (excluye la categoría en edición)
  categoriasPadreDisponibles = computed(() => {
    const actualId = this.editingId();
    return this.categorias().filter(c => (!actualId || c.id !== actualId) && (!c.parent_id || c.parent_id === 0));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.svc.getAll().subscribe({
      next: (data) => {
        const tree = this.buildTree(data);
        this.categorias.set(data);
        this.expanded.set(this.idsWithChildren(tree));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar la lista de categorías.');
        this.loading.set(false);
      }
    });
  }

  setFiltroEstado(estado: 'todos' | 'activas' | 'inactivas'): void {
    this.filtroEstado.set(estado);
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.editingId.set(null);
    this.error.set(null);
    this.showModal.set(true);
  }

  openEdit(c: Categoria): void {
    this.form = {
      nombre: c.nombre,
      descripcion: c.descripcion ?? '',
      parent_id: c.parent_id ?? null,
      activo: !!c.activo,
    };
    this.editingId.set(c.id);
    this.error.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.savingModal.set(false);
  }

  save(): void {
    if (!this.form.nombre.trim()) {
      this.error.set('El nombre de la categoría es obligatorio.');
      return;
    }

    this.savingModal.set(true);
    this.error.set(null);

    const payload: any = {
      ...this.form,
      nombre: this.form.nombre.trim(),
      descripcion: this.form.descripcion?.trim() || undefined,
      parent_id: this.form.parent_id || undefined,
    };

    const id = this.editingId();
    const obs = id ? this.svc.update(id, payload) : this.svc.create(payload);

    obs.subscribe({
      next: () => {
        this.aviso.set(id ? '✅ Categoría actualizada correctamente.' : '✅ Categoría creada con éxito.');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        const apiErrors = err?.error?.errors;
        const detail = apiErrors ? Object.values(apiErrors).flat().join(' ') : err?.error?.message;
        this.error.set(detail || 'Error al guardar la categoría.');
        this.savingModal.set(false);
      }
    });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  doDelete(): void {
    const id = this.deleteConfirmId();
    if (!id) return;

    this.svc.delete(id).subscribe({
      next: () => {
        this.aviso.set('✅ Categoría eliminada.');
        this.deleteConfirmId.set(null);
        this.load();
      },
      error: () => {
        this.error.set('No se pudo eliminar la categoría. Asegúrate de que no tenga productos asociados.');
        this.deleteConfirmId.set(null);
      }
    });
  }

  toggle(id: number): void {
    const next = new Set(this.expanded());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expanded.set(next);
  }

  isExpanded(id: number): boolean {
    return this.expanded().has(id);
  }

  private emptyForm() {
    return { nombre: '', descripcion: '', parent_id: null, activo: true };
  }

  private buildTree(items: Categoria[]): CategoriaNodo[] {
    const nodes = new Map<number, CategoriaNodo>();
    for (const categoria of items) {
      nodes.set(categoria.id, { categoria, hijas: [] });
    }

    const roots: CategoriaNodo[] = [];
    for (const categoria of items) {
      const node = nodes.get(categoria.id)!;
      const parentId = categoria.parent_id;
      if (parentId != null && parentId !== 0 && nodes.has(parentId)) {
        nodes.get(parentId)!.hijas.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortNodes = (list: CategoriaNodo[]) => {
      list.sort((a, b) => a.categoria.id - b.categoria.id);
      for (const node of list) {
        sortNodes(node.hijas);
      }
    };
    sortNodes(roots);
    return roots;
  }

  private idsWithChildren(nodes: CategoriaNodo[], into = new Set<number>()): Set<number> {
    for (const node of nodes) {
      if (node.hijas.length) {
        into.add(node.categoria.id);
        this.idsWithChildren(node.hijas, into);
      }
    }
    return into;
  }
}