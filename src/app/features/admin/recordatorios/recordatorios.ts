import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Reminder } from '../../../core/api/models';
import { RemindersService } from '../../../core/services/clinic-reports.service';
import { fechaCorta } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-recordatorios',
  standalone: true,
  imports: [FormsModule, Select, AdminTable, ConfirmDialog],
  templateUrl: './recordatorios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recordatorios implements OnInit {
  private readonly svc = inject(RemindersService);
  private readonly notify = inject(NotifyService);
  readonly list = new PagedList<Reminder>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar los recordatorios.')),
  );
  readonly descartar = signal<Reminder | null>(null);
  readonly tipos = [
    { label: 'Todos los tipos', value: '' },
    { label: 'Vacuna', value: 'vacuna' },
    { label: 'Desparasitación', value: 'desparasitacion' },
    { label: 'Cita', value: 'cita' },
    { label: 'Vencimiento', value: 'vencimiento' },
    { label: 'Stock mínimo', value: 'stock_minimo' },
    { label: 'Caja', value: 'diferencia_caja' },
  ];
  readonly audiencias = [
    { label: 'Todas las audiencias', value: '' },
    { label: 'Clientes', value: 'customer' },
    { label: 'Internos', value: 'internal' },
  ];
  tipo = '';
  audiencia = '';

  ngOnInit(): void { this.list.load(1); }

  buscar(event: Event): void {
    this.list.search((event.target as HTMLInputElement).value);
  }

  filtrar(): void {
    this.list.extra = { type: this.tipo || undefined, audience: this.audiencia || undefined };
    this.list.load(1);
  }

  fecha(value: string | null): string { return fechaCorta(value); }

  confirmar(): void {
    const row = this.descartar();
    if (!row) return;
    this.svc.dismiss(row.id).subscribe({
      next: () => {
        this.notify.success('Recordatorio descartado.');
        this.descartar.set(null);
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo descartar.')),
    });
  }
}
