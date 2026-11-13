import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { map } from 'rxjs';
import { apiMessage } from '../../../core/api/api-message';
import { Page } from '../../../core/api/envelope';
import { PagedList } from '../../../core/api/paged-list';
import { Appointment, VetService } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { ClinicService, UsersService } from '../../../core/services/clinic-reports.service';
import { SalesService } from '../../../core/services/commerce.service';
import { PetsService } from '../../../core/services/parties.service';
import { fechaCorta, soles } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { RemoteOption, RemoteSelect } from '../../../shared/components/remote-select/remote-select';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, Select, AdminTable, ConfirmDialog, RemoteSelect],
  templateUrl: './citas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Citas implements OnInit {
  private readonly svc = inject(ClinicService);
  private readonly pets = inject(PetsService);
  private readonly users = inject(UsersService);
  private readonly sales = inject(SalesService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Appointment>(
    (query) => this.svc.appointments(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudo cargar la agenda.')),
  );
  readonly servicios = signal<VetService[]>([]);
  readonly personal = signal<{ label: string; value: number }[]>([]);
  readonly modal = signal(false);
  readonly cita = signal<Appointment | null>(null);
  readonly accion = signal<'atender' | 'insumo' | 'cobrar' | null>(null);
  readonly cancelar = signal<Appointment | null>(null);
  readonly saving = signal(false);
  fecha = '';
  estado = '';
  agenda = { pet_id: null as number | null, clinic_service_id: null as number | null, staff_user_id: null as number | null, scheduled_at: '', notes: '' };
  nota = { diagnostico: '', tratamiento: '' };
  insumo = { variant_id: null as number | null, quantity: 1 };
  cobro = { method: 'efectivo', amount: 0 };
  readonly estados = [
    { label: 'Todos', value: '' },
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Atendida', value: 'atendida' },
    { label: 'Cancelada', value: 'cancelada' },
  ];
  readonly metodos = [
    { label: 'Efectivo', value: 'efectivo' },
    { label: 'Yape', value: 'yape' },
    { label: 'Tarjeta', value: 'tarjeta' },
  ];
  readonly buscarMascotas = (term: string) => this.pets.list({ page: 1, perPage: 20, q: term }).pipe(
    map((page) => page.items.map((row): RemoteOption => ({ id: row.id, label: `${row.nombre} · ${row.cliente?.name || 'Tutor'}` }))),
  );
  readonly buscarVariantes = (term: string) => this.sales.search({ page: 1, perPage: 20, q: term }).pipe(
    map((page) => page.items.map((row): RemoteOption => ({ id: row.variant_id, label: row.nombre }))),
  );

  ngOnInit(): void {
    this.list.load(1);
    this.svc.services({ page: 1, perPage: 50 }).subscribe({
      next: (result) => this.servicios.set(this.lista(result)),
    });
    this.users.list({ page: 1, perPage: 50 }).subscribe({
      next: (page) => this.personal.set(page.items.map((user) => ({ label: user.name, value: user.id }))),
    });
  }

  filtrar(): void {
    this.list.extra = { date: this.fecha || undefined, status: this.estado || undefined };
    this.list.load(1);
  }

  agendar(): void {
    if (!this.agenda.pet_id || !this.agenda.clinic_service_id || !this.agenda.staff_user_id || !this.agenda.scheduled_at) {
      this.notify.warn('Completa mascota, servicio, personal y fecha.');
      return;
    }
    this.saving.set(true);
    this.svc.createAppointment({
      pet_id: this.agenda.pet_id,
      clinic_service_id: this.agenda.clinic_service_id,
      staff_user_id: this.agenda.staff_user_id,
      scheduled_at: this.agenda.scheduled_at,
      notes: this.agenda.notes || null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success('Cita agendada.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo agendar.'));
      },
    });
  }

  abrir(row: Appointment, accion: 'atender' | 'insumo' | 'cobrar'): void {
    this.cita.set(row);
    this.accion.set(accion);
    this.cobro.amount = Number(row.sale_price ?? 0);
  }

  atender(): void {
    const row = this.cita();
    if (!row) return;
    this.svc.attend(row.id, { diagnostico: this.nota.diagnostico, tratamiento: this.nota.tratamiento }).subscribe({
      next: () => this.cerrar('Consulta registrada.'),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo atender la cita.')),
    });
  }

  descontar(): void {
    const row = this.cita();
    if (!row || !this.insumo.variant_id) {
      this.notify.warn('Elige el insumo.');
      return;
    }
    this.svc.consume(row.id, this.insumo.variant_id, this.insumo.quantity).subscribe({
      next: () => this.cerrar('Insumo descontado.'),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo descontar el insumo.')),
    });
  }

  cobrar(): void {
    const row = this.cita();
    if (!row) return;
    this.svc.charge(row.id, [{ method: this.cobro.method, amount: this.cobro.amount }]).subscribe({
      next: () => this.cerrar('Cita cobrada.'),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo cobrar la cita.')),
    });
  }

  confirmarCancelar(): void {
    const row = this.cancelar();
    if (!row) return;
    this.svc.cancel(row.id).subscribe({
      next: () => {
        this.notify.success('Cita cancelada.');
        this.cancelar.set(null);
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo cancelar la cita.')),
    });
  }

  fechaHora(value: string | null): string {
    if (!value) return '—';
    return `${fechaCorta(value)} ${value.slice(11, 16)}`;
  }

  soles(value: string | number | null | undefined): string { return soles(value); }

  private cerrar(message: string): void {
    this.notify.success(message);
    this.accion.set(null);
    this.cita.set(null);
    this.list.load();
  }

  private lista(result: VetService[] | Page<VetService>): VetService[] {
    return Array.isArray(result) ? result : result.items;
  }
}
