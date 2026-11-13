import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { map } from 'rxjs';
import { apiMessage } from '../../../core/api/api-message';
import { Page } from '../../../core/api/envelope';
import { PagedList } from '../../../core/api/paged-list';
import { VetService } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { ClinicService } from '../../../core/services/clinic-reports.service';
import { clearError, soles } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

@Component({
  selector: 'app-servicios-clinica',
  standalone: true,
  imports: [FormsModule, Button, Checkbox, Dialog, InputText, Select, AdminTable],
  templateUrl: './servicios-clinica.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiciosClinica implements OnInit {
  private readonly svc = inject(ClinicService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<VetService>(
    (query) => this.svc.services(query).pipe(map((result) => this.comoPagina(result))),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar los servicios.')),
  );
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<VetService | null>(null);
  readonly errors = signal<Record<string, string>>({});
  form = { code: '', name: '', duration_minutes: 30, sale_price: 0, staff_role: 'veterinario', activo: true };
  readonly roles = [
    { label: 'Veterinario', value: 'veterinario' },
    { label: 'Peluquería', value: 'groomer' },
    { label: 'Cualquiera', value: 'any' },
  ];

  ngOnInit(): void { this.list.load(1); }

  buscar(event: Event): void { this.list.search((event.target as HTMLInputElement).value); }

  abrir(row?: VetService): void {
    this.errors.set({});
    this.editing.set(row ?? null);
    this.form = row
      ? { code: row.code, name: row.name, duration_minutes: row.duration_minutes ?? 30, sale_price: Number(row.sale_price), staff_role: row.staff_role ?? 'veterinario', activo: row.activo }
      : { code: '', name: '', duration_minutes: 30, sale_price: 0, staff_role: 'veterinario', activo: true };
    this.modal.set(true);
  }

  limpiar(key: string): void { this.errors.update((current) => clearError(current, key)); }

  guardar(): void {
    const errors: Record<string, string> = {};
    if (!this.editing() && !this.form.code.trim()) errors['code'] = 'Escribe el código.';
    if (!this.form.name.trim()) errors['name'] = 'Escribe el nombre del servicio.';
    if (this.form.sale_price < 0) errors['sale_price'] = 'El precio no puede ser negativo.';
    this.errors.set(errors);
    if (Object.keys(errors).length) return;
    this.saving.set(true);
    const id = this.editing()?.id;
    const request = id
      ? this.svc.updateService(id, { name: this.form.name, duration_minutes: this.form.duration_minutes, sale_price: this.form.sale_price, staff_role: this.form.staff_role, activo: this.form.activo })
      : this.svc.createService(this.form);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success(id ? 'Servicio actualizado.' : 'Servicio creado.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo guardar el servicio.'));
      },
    });
  }

  soles(value: string | number): string { return soles(value); }

  private comoPagina(result: VetService[] | Page<VetService>): Page<VetService> {
    if (Array.isArray(result)) {
      return { items: result, meta: { current_page: 1, last_page: 1, total: result.length, per_page: 20 } };
    }
    return result;
  }
}
