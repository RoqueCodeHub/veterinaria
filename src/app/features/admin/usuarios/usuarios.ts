import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { StaffAccount } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { UsersService } from '../../../core/services/clinic-reports.service';
import { clearError } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, Button, Checkbox, Dialog, InputText, MultiSelect, AdminTable, ConfirmDialog],
  templateUrl: './usuarios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Usuarios implements OnInit {
  private readonly svc = inject(UsersService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<StaffAccount>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar los usuarios.')),
  );
  readonly roles = signal<{ label: string; value: string }[]>([]);
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<StaffAccount | null>(null);
  readonly confirmar = signal<StaffAccount | null>(null);
  readonly errors = signal<Record<string, string>>({});
  form = { name: '', email: '', password: '', roles: [] as string[], is_active: true };

  ngOnInit(): void {
    this.list.load(1);
    this.svc.roles().subscribe({ next: (roles) => this.roles.set(roles.map((role) => ({ label: role, value: role }))) });
  }

  buscar(event: Event): void { this.list.search((event.target as HTMLInputElement).value); }

  abrir(row?: StaffAccount): void {
    this.errors.set({});
    this.editing.set(row ?? null);
    this.form = row
      ? { name: row.name, email: row.email, password: '', roles: [...row.roles], is_active: row.is_active }
      : { name: '', email: '', password: '', roles: [], is_active: true };
    this.modal.set(true);
  }

  limpiar(key: string): void { this.errors.update((current) => clearError(current, key)); }

  guardar(): void {
    const errors: Record<string, string> = {};
    if (!this.form.name.trim()) errors['name'] = 'Escribe el nombre.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) errors['email'] = 'Escribe un correo válido.';
    if (!this.editing() && this.form.password.length < 8) errors['password'] = 'La contraseña tiene al menos 8 caracteres.';
    if (this.form.password && this.form.password.length < 8) errors['password'] = 'La contraseña tiene al menos 8 caracteres.';
    if (!this.form.roles.length) errors['roles'] = 'Elige al menos un rol.';
    this.errors.set(errors);
    if (Object.keys(errors).length) return;
    this.saving.set(true);
    const id = this.editing()?.id;
    const body = { name: this.form.name, email: this.form.email, roles: this.form.roles, is_active: this.form.is_active, ...(this.form.password ? { password: this.form.password } : {}) };
    const request = id ? this.svc.update(id, body) : this.svc.create({ ...body, password: this.form.password });
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success(id ? 'Usuario actualizado.' : 'Usuario creado.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo guardar el usuario.'));
      },
    });
  }

  aplicarEstado(): void {
    const row = this.confirmar();
    if (!row) return;
    const request = row.is_active ? this.svc.deactivate(row.id) : this.svc.activate(row.id);
    request.subscribe({
      next: () => {
        this.notify.success(row.is_active ? 'Usuario desactivado.' : 'Usuario activado.');
        this.confirmar.set(null);
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo cambiar el estado.')),
    });
  }
}
