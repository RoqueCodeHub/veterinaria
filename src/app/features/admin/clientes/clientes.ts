import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Customer, CustomerForm } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { CustomersService } from '../../../core/services/parties.service';
import { clearError, whatsapp } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [FormsModule, Button, Checkbox, Dialog, InputText, Select, AdminTable],
  templateUrl: './clientes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Clientes implements OnInit {
  private readonly svc = inject(CustomersService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Customer>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar los clientes.')),
  );
  readonly modal = signal(false);
  readonly portal = signal<Customer | null>(null);
  readonly saving = signal(false);
  readonly editing = signal<Customer | null>(null);
  readonly errors = signal<Record<string, string>>({});
  form: CustomerForm = this.vacio();
  acceso = { email: '', password: '' };
  estado = '';
  readonly estados = [
    { label: 'Todos', value: '' },
    { label: 'Activos', value: '1' },
    { label: 'Inactivos', value: '0' },
  ];
  readonly documentos = [
    { label: 'DNI', value: 'DNI' },
    { label: 'RUC', value: 'RUC' },
    { label: 'CE', value: 'CE' },
    { label: 'Pasaporte', value: 'PASAPORTE' },
  ];

  ngOnInit(): void { this.list.load(1); }

  buscar(event: Event): void { this.list.search((event.target as HTMLInputElement).value); }

  filtrar(): void {
    this.list.extra = { activo: this.estado || undefined };
    this.list.load(1);
  }

  abrir(row?: Customer): void {
    this.errors.set({});
    this.editing.set(row ?? null);
    this.form = row
      ? { name: row.name, document_type: row.document_type, document_number: row.document_number, phone: row.phone, notes: row.notes, activo: row.activo }
      : this.vacio();
    this.modal.set(true);
  }

  limpiar(key: string): void { this.errors.update((current) => clearError(current, key)); }

  guardar(): void {
    const errors: Record<string, string> = {};
    if (!this.form.name.trim()) errors['name'] = 'Escribe el nombre del cliente.';
    const doc = (this.form.document_number ?? '').trim();
    const tipo = this.form.document_type ?? 'DNI';
    if (doc && tipo === 'DNI' && !/^\d{8}$/.test(doc)) errors['document_number'] = 'El DNI tiene 8 dígitos.';
    if (doc && tipo === 'RUC' && !/^\d{11}$/.test(doc)) errors['document_number'] = 'El RUC tiene 11 dígitos.';
    if (doc && tipo === 'CE' && !/^[A-Za-z0-9]{9,12}$/.test(doc)) errors['document_number'] = 'El carnet de extranjería tiene entre 9 y 12 caracteres.';
    if (this.form.phone && !/^9\d{8}$/.test(this.form.phone)) errors['phone'] = 'El celular tiene 9 dígitos y empieza con 9.';
    this.errors.set(errors);
    if (Object.keys(errors).length) return;
    this.saving.set(true);
    const id = this.editing()?.id;
    const request = id ? this.svc.update(id, this.form) : this.svc.create(this.form);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success(id ? 'Cliente actualizado.' : 'Cliente creado.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo guardar el cliente.'));
      },
    });
  }

  darAcceso(): void {
    const row = this.portal();
    if (!row || !this.acceso.email || this.acceso.password.length < 8) {
      this.notify.warn('El correo y una contraseña de 8 caracteres son obligatorios.');
      return;
    }
    this.svc.enablePortal(row.id, this.acceso.email, this.acceso.password).subscribe({
      next: () => {
        this.notify.success('Acceso al portal creado.');
        this.portal.set(null);
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo crear el acceso.')),
    });
  }

  wa(phone: string | null): string | null { return whatsapp(phone); }

  private vacio(): CustomerForm {
    return { name: '', document_type: 'DNI', document_number: '', phone: '', notes: '', activo: true };
  }
}
