import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientesService, Cliente, ClienteForm } from '../../../core/services/clientes.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
})
export class Clientes implements OnInit {
  private svc = inject(ClientesService);

  // Estados de datos (Signals)
  clientes = signal<Cliente[]>([]);
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
  form: ClienteForm = this.emptyForm();

  // Métricas KPI
  metricas = computed(() => {
    const list = this.clientes();
    const total = list.length;
    const activos = list.filter(c => c.activo !== false).length;
    const inactivos = total - activos;
    const documentados = list.filter(c => !!c.numero_documento).length;

    return { total, activos, inactivos, documentados };
  });

  // Lista Filtrada Reactiva
  clientesFiltrados = computed(() => {
    const q = this.busquedaTexto().toLowerCase().trim();
    const docType = this.filtroTipoDoc();
    const est = this.filtroEstado();

    return this.clientes().filter(c => {
      const nombreFull = (c.nombre_completo || `${c.nombres || ''} ${c.apellidos || ''}`).toLowerCase();
      const docNum = (c.numero_documento || '').toLowerCase();
      const emailStr = (c.email || '').toLowerCase();
      const telStr = (c.telefono || '').toLowerCase();
      const dirStr = (c.direccion || '').toLowerCase();

      // Filtro por texto
      const coincideTexto = !q || 
        nombreFull.includes(q) || 
        docNum.includes(q) || 
        emailStr.includes(q) ||
        telStr.includes(q) ||
        dirStr.includes(q);

      // Filtro por Tipo de Documento
      const coincideDoc = docType === 'todos' || (c.tipo_documento || '').toUpperCase() === docType.toUpperCase();

      // Filtro por Estado
      let coincideEstado = true;
      if (est === 'activos') coincideEstado = c.activo !== false;
      if (est === 'inactivos') coincideEstado = c.activo === false;

      return coincideTexto && coincideDoc && coincideEstado;
    });
  });

  // Paginación calculada
  totalPages = computed(() => Math.max(1, Math.ceil(this.clientesFiltrados().length / this.pageSize)));
  currentPage = computed(() => Math.min(this.page(), this.totalPages()));

  visibleClientes = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.clientesFiltrados().slice(start, start + this.pageSize);
  });

  rangoPaginacion = computed(() => {
    const total = this.clientesFiltrados().length;
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
        this.clientes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar la lista de clientes.');
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

  openEdit(c: Cliente): void {
    this.form = {
      nombres: c.nombres || '',
      apellidos: c.apellidos || '',
      tipo_documento: c.tipo_documento ?? 'DNI',
      numero_documento: c.numero_documento ?? '',
      telefono: c.telefono ?? '',
      email: c.email ?? '',
      direccion: c.direccion ?? '',
      activo: c.activo ?? true,
      observaciones: c.observaciones ?? '',
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
    if (!this.form.nombres.trim()) {
      this.error.set('Los nombres del cliente son obligatorios.');
      return;
    }

    this.savingModal.set(true);
    this.error.set(null);

    const payload: ClienteForm = {
      ...this.form,
      nombres: this.form.nombres.trim(),
      apellidos: this.form.apellidos?.trim() || '',
      email: this.form.email?.trim() || '',
      telefono: this.form.telefono?.trim() || '',
      numero_documento: this.form.numero_documento?.trim() || '',
      direccion: this.form.direccion?.trim() || '',
      observaciones: this.form.observaciones?.trim() || '',
    };

    const id = this.editingId();
    const obs = id ? this.svc.update(id, payload) : this.svc.create(payload);

    obs.subscribe({
      next: () => {
        this.aviso.set(id ? '✅ Cliente actualizado correctamente.' : '✅ Cliente registrado en la base de datos.');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        const apiErrors = err?.error?.errors;
        const detail = apiErrors ? Object.values(apiErrors).flat().join(' ') : err?.error?.message;
        this.error.set(detail || 'Error al guardar los datos del cliente.');
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
        this.aviso.set('✅ Cliente eliminado del directorio.');
        this.deleteConfirmId.set(null);
        this.load();
      },
      error: () => {
        this.error.set('No se pudo eliminar el cliente.');
        this.deleteConfirmId.set(null);
      }
    });
  }

  private emptyForm(): ClienteForm {
    return {
      nombres: '',
      apellidos: '',
      tipo_documento: 'DNI',
      numero_documento: '',
      telefono: '',
      email: '',
      direccion: '',
      activo: true,
      observaciones: '',
    };
  }
}