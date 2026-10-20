import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    imports: [CommonModule, FormsModule],
    templateUrl: './categorias.html',
    styleUrl: './categorias.css',
})
export class Categorias implements OnInit {
    private svc = inject(CategoriasService);

    categorias = signal<Categoria[]>([]);
    expanded = signal<Set<number>>(new Set());
    loading = signal(false);
    error = signal<string | null>(null);

    private arbol = computed(() => this.buildTree(this.categorias()));

    filas = computed(() => {
        const open = this.expanded();
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

    showModal = signal(false);
    editingId = signal<number | null>(null);
    deleteConfirmId = signal<number | null>(null);
    savingModal = signal(false);

    form: CategoriaForm = this.emptyForm();

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
            error: () => { this.error.set('Error al cargar categorías'); this.loading.set(false); }
        });
    }

    openCreate(): void {
        this.form = this.emptyForm();
        this.editingId.set(null);
        this.showModal.set(true);
    }

    openEdit(c: Categoria): void {
        this.form = {
            nombre: c.nombre,
            descripcion: c.descripcion ?? '',
            activo: !!c.activo,
        };
        this.editingId.set(c.id);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.savingModal.set(false);
    }

    save(): void {
        this.savingModal.set(true);
        const id = this.editingId();
        const obs = id ? this.svc.update(id, this.form) : this.svc.create(this.form);
        obs.subscribe({
            next: () => { this.closeModal(); this.load(); },
            error: () => { this.error.set('Error al guardar la categoría'); this.savingModal.set(false); }
        });
    }

    confirmDelete(id: number): void {
        this.deleteConfirmId.set(id);
    }

    cancelDelete(): void {
        this.deleteConfirmId.set(null);
    }

    doDelete(): void {
        const id = this.deleteConfirmId()!;
        this.svc.delete(id).subscribe({
            next: () => { this.deleteConfirmId.set(null); this.load(); },
            error: () => { this.error.set('Error al eliminar la categoría'); this.deleteConfirmId.set(null); }
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

    private emptyForm(): CategoriaForm {
        return { nombre: '', descripcion: '', activo: true };
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
