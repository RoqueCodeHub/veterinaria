import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Supplier, SupplierForm } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { SuppliersService } from '../../../core/services/parties.service';
import { clearError, whatsapp } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [FormsModule, Button, Checkbox, Dialog, InputText, AdminTable],
  templateUrl: './proveedores.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Proveedores implements OnInit {
  private readonly svc = inject(SuppliersService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Supplier>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar los proveedores.')),
  );
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Supplier | null>(null);
  readonly errors = signal<Record<string, string>>({});
  form: SupplierForm = this.vacio();

  ngOnInit(): void { this.list.load(1); }

  buscar(event: Event): void { this.list.search((event.target as HTMLInputElement).value); }

  abrir(row?: Supplier): void {
    this.errors.set({});
    this.editing.set(row ?? null);
    this.form = row ? { name: row.name, ruc: row.ruc, phone: row.phone, email: row.email, activo: row.activo } : this.vacio();
    this.modal.set(true);
  }

  limpiar(key: string): void { this.errors.update((current) => clearError(current, key)); }

  guardar(): void {
    const errors: Record<string, string> = {};
    if (!this.form.name.trim()) errors['name'] = 'Escribe el nombre del proveedor.';
    if (this.form.ruc && !/^\d{11}$/.test(this.form.ruc)) errors['ruc'] = 'El RUC tiene 11 dígitos.';
    if (this.form.phone && !/^9\d{8}$/.test(this.form.phone)) errors['phone'] = 'El celular tiene 9 dígitos y empieza con 9.';
    if (this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) errors['email'] = 'Escribe un correo válido.';
    this.errors.set(errors);
    if (Object.keys(errors).length) return;
    this.saving.set(true);
    const id = this.editing()?.id;
    const request = id ? this.svc.update(id, this.form) : this.svc.create(this.form);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success(id ? 'Proveedor actualizado.' : 'Proveedor creado.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo guardar el proveedor.'));
      },
    });
  }

  wa(phone: string | null): string | null { return whatsapp(phone); }

  private vacio(): SupplierForm {
    return { name: '', ruc: '', phone: '', email: '', activo: true };
  }
}
