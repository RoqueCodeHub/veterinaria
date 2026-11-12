import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ProveedoresService, Proveedor, ProveedorForm } from '../../../core/services/proveedores.service';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Checkbox, Dialog, InputText, Select, AdminTable],
  templateUrl: './proveedores.html',
})
export class Proveedores implements OnInit {
  private svc = inject(ProveedoresService);
  private notify = inject(NotifyService);

  // Estados de Datos (Signals)
  proveedores = signal<Proveedor[]>([]);
  loading = signal(false);
  savingModal = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);

  // Modales
  showModal = signal(false);
  editingId = signal<number | null>(null);
  deleteConfirmId = signal<number | null>(null);

  // Filtros reactivos con Signals
  busquedaTexto = signal('');
  filtroTipoDoc = signal<string>('todos');
  filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');
  readonly tiposDocumento = [
    { label: 'RUC', value: 'RUC' },
    { label: 'DNI', value: 'DNI' },
    { label: 'Carnet de extranjería', value: 'CE' },
    { label: 'Pasaporte', value: 'Pasaporte' },
  ];
  readonly estadosFiltro = [
    { label: 'Todos los estados', value: 'todos' },
    { label: 'Solo activos', value: 'activos' },
    { label: 'Inactivos', value: 'inactivos' },
  ];
  get opcionesDocumento() {
    return [{ label: 'Todos los documentos', value: 'todos' }, ...this.tiposDocumento];
  }

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
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.editingId.set(null);
    this.formError.set(null);
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
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.savingModal.set(false);
    this.formError.set(null);
  }

  onEmpresa(valor: string): void {
    this.form.empresa = valor;
    this.ocultarErrorProveedor();
  }

  onNombres(valor: string): void {
    this.form.nombres = valor;
    this.ocultarErrorProveedor();
  }

  private ocultarErrorProveedor(): void {
    if (this.form.empresa?.trim() || this.form.nombres.trim()) this.formError.set(null);
  }

  save(): void {
    if (!this.form.nombres.trim() && !this.form.empresa?.trim()) {
      this.formError.set('Debes ingresar al menos la Empresa o el Nombre Comercial.');
      return;
    }

    this.savingModal.set(true);
    this.formError.set(null);

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
        this.notify.success(id ? 'Proveedor actualizado.' : 'Proveedor registrado.');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        const apiErrors = err?.error?.errors;
        const detail = apiErrors ? Object.values(apiErrors).flat().join(' ') : err?.error?.message;
        this.formError.set(detail || 'Error al guardar el proveedor.');
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
        this.notify.success('Proveedor eliminado del directorio.');
        this.deleteConfirmId.set(null);
        this.load();
      },
      error: () => {
        this.notify.error('No se pudo eliminar el proveedor.');
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