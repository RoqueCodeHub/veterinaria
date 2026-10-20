import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProveedoresService, Proveedor, ProveedorForm } from '../../../core/services/proveedores.service';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css',
})
export class Proveedores implements OnInit {
  private svc = inject(ProveedoresService);

  // Estados de Datos (Signals)
  proveedores = signal<Proveedor[]>([]);
  loading = signal(false);
  savingModal = signal(false);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  // Modales
  showModal = signal(false);
  editingId = signal<number | null>(null);
  deleteConfirmId = signal<number | null>(null);

  // Filtros reactivos con Signals
  busquedaTexto = signal('');
  filtroTipoDoc = signal<string>('todos');
  filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');

  // Paginación
  page = signal(1);
  readonly pageSize = 10;

  // Formulario
  form: ProveedorForm = this.emptyForm();

  // Métricas KPI
  metricas = computed(() => {
    const list = this.proveedores();
    const total = list.length;
    const activos = list.filter(p => p.activo !== false).length;
    const inactivos = total - activos;
    const empresasConRuc = list.filter(p => p.tipo_documento === 'RUC' || !!p.empresa).length;

    return { total, activos, inactivos, empresasConRuc };
  });

  // Lista Filtrada Reactiva
  proveedoresFiltrados = computed(() => {
    const q = this.busquedaTexto().toLowerCase().trim();
    const docType = this.filtroTipoDoc();
    const est = this.filtroEstado();

    return this.proveedores().filter(p => {
      const nombreFull = (p.nombre_completo || `${p.nombres || ''} ${p.apellidos || ''}`).toLowerCase();
      const empresaStr = (p.empresa || '').toLowerCase();
      const docNum = (p.numero_documento || '').toLowerCase();
      const emailStr = (p.email || '').toLowerCase();
      const telStr = (p.telefono || '').toLowerCase();

      // Filtro por texto
      const coincideTexto = !q || 
        nombreFull.includes(q) || 
        empresaStr.includes(q) || 
        docNum.includes(q) ||
        emailStr.includes(q) ||
        telStr.includes(q);

      // Filtro por Tipo de Documento
      const coincideDoc = docType === 'todos' || (p.tipo_documento || '').toUpperCase() === docType.toUpperCase();

      // Filtro por Estado
      let coincideEstado = true;
      if (est === 'activos') coincideEstado = p.activo !== false;
      if (est === 'inactivos') coincideEstado = p.activo === false;

      return coincideTexto && coincideDoc && coincideEstado;
    });
  });

  // Paginación calculada
  totalPages = computed(() => Math.max(1, Math.ceil(this.proveedoresFiltrados().length / this.pageSize)));
  currentPage = computed(() => Math.min(this.page(), this.totalPages()));

  visibleProveedores = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.proveedoresFiltrados().slice(start, start + this.pageSize);
  });

  rangoPaginacion = computed(() => {
    const total = this.proveedoresFiltrados().length;
    if (!total) return '0 de 0';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return `${start}–${end} de ${total}`;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.svc.getAll().subscribe({
      next: (data) => {
        this.proveedores.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar la lista de proveedores.');
        this.loading.set(false);
      }
    });
  }

  setFiltroEstado(estado: 'todos' | 'activos' | 'inactivos'): void {
    this.filtroEstado.set(estado);
    this.page.set(1);
  }

  goToPage(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.editingId.set(null);
    this.error.set(null);
    this.showModal.set(true);
  }

  openEdit(p: Proveedor): void {
    this.form = {
      nombres: p.nombres || '',
      apellidos: p.apellidos || '',
      tipo_documento: p.tipo_documento ?? 'RUC',
      numero_documento: p.numero_documento ?? '',
      telefono: p.telefono ?? '',
      email: p.email ?? '',
      direccion: p.direccion ?? '',
      empresa: p.empresa ?? '',
      activo: p.activo ?? true,
    };
    this.editingId.set(p.id);
    this.error.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.savingModal.set(false);
  }

  save(): void {
    if (!this.form.nombres.trim() && !this.form.empresa?.trim()) {
      this.error.set('Debes ingresar al menos la Empresa o el Nombre Comercial.');
      return;
    }

    this.savingModal.set(true);
    this.error.set(null);

    const payload: ProveedorForm = {
      ...this.form,
      nombres: this.form.nombres.trim(),
      apellidos: this.form.apellidos?.trim() || '',
      email: this.form.email?.trim() || '',
      telefono: this.form.telefono?.trim() || '',
      numero_documento: this.form.numero_documento?.trim() || '',
      empresa: this.form.empresa?.trim() || '',
      direccion: this.form.direccion?.trim() || '',
    };

    const id = this.editingId();
    const obs = id ? this.svc.update(id, payload) : this.svc.create(payload);

    obs.subscribe({
      next: () => {
        this.aviso.set(id ? '✅ Proveedor actualizado correctamente.' : '✅ Proveedor registrado con éxito.');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        const apiErrors = err?.error?.errors;
        const detail = apiErrors ? Object.values(apiErrors).flat().join(' ') : err?.error?.message;
        this.error.set(detail || 'Error al guardar el proveedor.');
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
        this.aviso.set('✅ Proveedor eliminado del directorio.');
        this.deleteConfirmId.set(null);
        this.load();
      },
      error: () => {
        this.error.set('No se pudo eliminar el proveedor.');
        this.deleteConfirmId.set(null);
      }
    });
  }

  private emptyForm(): ProveedorForm {
    return {
      nombres: '',
      apellidos: '',
      tipo_documento: 'RUC',
      numero_documento: '',
      telefono: '',
      email: '',
      direccion: '',
      empresa: '',
      activo: true,
    };
  }
}