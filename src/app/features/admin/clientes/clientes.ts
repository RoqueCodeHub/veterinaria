import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ClientesService, Cliente, ClienteForm } from '../../../core/services/clientes.service';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

type CampoCliente = 'nombres' | 'apellidos' | 'numero_documento' | 'telefono' | 'email';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Checkbox, Dialog, InputText, Select, Textarea, AdminTable],
  templateUrl: './clientes.html',
})
export class Clientes implements OnInit {
  private svc = inject(ClientesService);
  private notify = inject(NotifyService);
  private route = inject(ActivatedRoute);

  // Estados de datos (Signals)
  clientes = signal<Cliente[]>([]);
  loading = signal(false);
  savingModal = signal(false);
  error = signal<string | null>(null);
  fieldErrors = signal<Partial<Record<CampoCliente, string>>>({});

  // Modales
  showModal = signal(false);
  editingId = signal<number | null>(null);
  deleteConfirmId = signal<number | null>(null);

  // Filtros reactivos con Signals
  busquedaTexto = signal('');
  filtroTipoDoc = signal<string>('todos');
  filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');
  readonly tiposDocumento = [
    { label: 'DNI', value: 'DNI' },
    { label: 'RUC', value: 'RUC' },
    { label: 'Carnet de extranjería', value: 'CE' },
    { label: 'Pasaporte', value: 'PASAPORTE' },
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

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) this.busquedaTexto.set(q);
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
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.editingId.set(null);
    this.fieldErrors.set({});
    this.showModal.set(true);
  }

  openEdit(c: Cliente): void {
    this.form = {
      nombres: c.nombres || '',
      apellidos: c.apellidos || '',
      tipo_documento: this.normalizarTipo(c.tipo_documento),
      numero_documento: c.numero_documento ?? '',
      telefono: this.telefonoVisible(c.telefono ?? ''),
      email: c.email ?? '',
      direccion: c.direccion ?? '',
      activo: c.activo ?? true,
      observaciones: c.observaciones ?? '',
    };
    this.editingId.set(c.id);
    this.fieldErrors.set({});
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.savingModal.set(false);
    this.fieldErrors.set({});
  }

  errorDe(campo: CampoCliente): string {
    return this.fieldErrors()[campo] ?? '';
  }

  onNombres(valor: string): void {
    this.form.nombres = valor;
    if (valor.trim()) this.quitarError('nombres');
  }

  onApellidos(valor: string): void {
    this.form.apellidos = valor;
    if (valor.trim()) this.quitarError('apellidos');
  }

  onTipo(valor: string): void {
    this.form.tipo_documento = valor;
    const documento = this.form.numero_documento?.trim() ?? '';
    if (!documento || !this.mensajeDocumento(documento, valor)) this.quitarError('numero_documento');
  }

  onDocumento(valor: string): void {
    const limpio = this.limpiarDocumento(valor);
    this.form.numero_documento = limpio;
    if (!limpio || !this.mensajeDocumento(limpio, this.form.tipo_documento)) this.quitarError('numero_documento');
  }

  onTelefono(valor: string): void {
    const limpio = valor.replace(/\D/g, '').slice(0, 9);
    this.form.telefono = limpio;
    if (!limpio || /^9\d{8}$/.test(limpio)) this.quitarError('telefono');
  }

  onEmail(valor: string): void {
    this.form.email = valor;
    if (!valor.trim() || this.correoValido(valor)) this.quitarError('email');
  }

  placeholderDocumento(): string {
    switch (this.form.tipo_documento) {
      case 'RUC': return '11 dígitos';
      case 'CE': return '9 a 12 caracteres';
      case 'PASAPORTE': return '6 a 12 caracteres';
      default: return '8 dígitos';
    }
  }

  maxDocumento(): number {
    switch (this.form.tipo_documento) {
      case 'DNI': return 8;
      case 'RUC': return 11;
      default: return 12;
    }
  }

  etiquetaDocumento(cliente: Cliente): string {
    if (!cliente.numero_documento) return '—';
    const tipo = this.normalizarTipo(cliente.tipo_documento);
    const etiqueta = this.tiposDocumento.find((item) => item.value === tipo)?.label ?? tipo;
    return `${etiqueta}: ${cliente.numero_documento}`;
  }

  telefonoVisible(telefono: string): string {
    const digitos = telefono.replace(/\D/g, '');
    if (digitos.startsWith('51') && digitos.length === 11) return digitos.slice(2);
    return digitos || telefono.trim();
  }

  whatsappUrl(telefono: string): string {
    return `https://wa.me/51${this.telefonoVisible(telefono)}`;
  }

  save(): void {
    const errores = this.validar();
    this.fieldErrors.set(errores);
    if (Object.keys(errores).length > 0) return;

    this.savingModal.set(true);
    this.fieldErrors.set({});

    const payload: ClienteForm = {
      ...this.form,
      nombres: this.form.nombres.trim(),
      apellidos: this.form.apellidos?.trim() || '',
      tipo_documento: this.normalizarTipo(this.form.tipo_documento),
      email: this.form.email?.trim() || '',
      telefono: this.telefonoVisible(this.form.telefono ?? ''),
      numero_documento: this.form.numero_documento?.trim() || '',
      direccion: this.form.direccion?.trim() || '',
      observaciones: this.form.observaciones?.trim() || '',
    };

    const id = this.editingId();
    const obs = id ? this.svc.update(id, payload) : this.svc.create(payload);

    obs.subscribe({
      next: () => {
        this.notify.success(id ? 'Cliente actualizado.' : 'Cliente registrado.');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        const apiErrors = err?.error?.errors;
        const detail = apiErrors ? Object.values(apiErrors).flat().join(' ') : err?.error?.message;
        this.fieldErrors.set(this.erroresApi(err, detail));
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
        this.notify.success('Cliente eliminado del directorio.');
        this.deleteConfirmId.set(null);
        this.load();
      },
      error: () => {
        this.notify.error('No se pudo eliminar el cliente.');
        this.deleteConfirmId.set(null);
      }
    });
  }

  private validar(): Partial<Record<CampoCliente, string>> {
    const errores: Partial<Record<CampoCliente, string>> = {};
    if (!this.form.nombres.trim()) errores.nombres = 'Los nombres del cliente son obligatorios.';
    if (!this.form.apellidos.trim()) errores.apellidos = 'Los apellidos del cliente son obligatorios.';

    const documento = this.form.numero_documento?.trim() ?? '';
    const mensajeDocumento = documento ? this.mensajeDocumento(documento, this.form.tipo_documento) : null;
    if (mensajeDocumento) errores.numero_documento = mensajeDocumento;

    const telefono = this.telefonoVisible(this.form.telefono ?? '');
    if (telefono && !/^9\d{8}$/.test(telefono)) {
      errores.telefono = 'El teléfono debe tener 9 dígitos y empezar con 9.';
    }

    const email = this.form.email?.trim() ?? '';
    if (email && !this.correoValido(email)) errores.email = 'Ingresa un correo válido.';
    return errores;
  }

  private mensajeDocumento(numero: string, tipo: string | undefined): string | null {
    switch (this.normalizarTipo(tipo)) {
      case 'DNI':
        return /^\d{8}$/.test(numero) ? null : 'El DNI debe tener 8 dígitos.';
      case 'RUC':
        return /^\d{11}$/.test(numero) ? null : 'El RUC debe tener 11 dígitos.';
      case 'CE':
        return /^[A-Za-z0-9]{9,12}$/.test(numero) ? null : 'El carnet de extranjería debe tener entre 9 y 12 caracteres.';
      default:
        return /^[A-Za-z0-9]{6,12}$/.test(numero) ? null : 'El pasaporte debe tener entre 6 y 12 caracteres.';
    }
  }

  private limpiarDocumento(valor: string): string {
    const tipo = this.normalizarTipo(this.form.tipo_documento);
    const limpio = tipo === 'DNI' || tipo === 'RUC' ? valor.replace(/\D/g, '') : valor.replace(/[^A-Za-z0-9]/g, '');
    return limpio.slice(0, this.maxDocumento());
  }

  private correoValido(valor: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
  }

  private normalizarTipo(tipo: string | null | undefined): string {
    const valor = (tipo || 'DNI').trim().toUpperCase();
    if (valor === 'PASAPORTE' || valor === 'PASSPORT') return 'PASAPORTE';
    if (valor === 'CE' || valor.startsWith('CARNET')) return 'CE';
    if (valor === 'RUC' || valor === 'DNI') return valor;
    return 'DNI';
  }

  private quitarError(campo: CampoCliente): void {
    if (!this.fieldErrors()[campo]) return;
    const siguientes = { ...this.fieldErrors() };
    delete siguientes[campo];
    this.fieldErrors.set(siguientes);
  }

  private erroresApi(err: { error?: { errors?: Record<string, string[]>; message?: string } }, detail: string | undefined): Partial<Record<CampoCliente, string>> {
    const apiErrors = err?.error?.errors;
    const map: Partial<Record<CampoCliente, string>> = {};
    if (apiErrors) {
      for (const [clave, mensajes] of Object.entries(apiErrors)) {
        if (this.esCampo(clave)) map[clave] = mensajes[0] ?? '';
      }
    }
    if (Object.keys(map).length > 0) return map;
    return { nombres: detail || 'Error al guardar los datos del cliente.' };
  }

  private esCampo(clave: string): clave is CampoCliente {
    return clave === 'nombres' || clave === 'apellidos' || clave === 'numero_documento' || clave === 'telefono' || clave === 'email';
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