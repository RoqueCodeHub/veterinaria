import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Select } from 'primeng/select';
import { apiMessage } from '../../../core/api/api-message';
import { ExpiryRow, LowStockRow } from '../../../core/api/models';
import { InventoryService } from '../../../core/services/inventory.service';
import { fechaCorta } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

type Plazo = 'todos' | 'vencido' | '30' | '60' | '90';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [FormsModule, Select, AdminTable],
  templateUrl: './alertas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alertas implements OnInit {
  private readonly svc = inject(InventoryService);
  private readonly notify = inject(NotifyService);
  readonly tab = signal<'stock' | 'vencimiento'>('stock');
  readonly bajos = signal<LowStockRow[]>([]);
  readonly vencido = signal<ExpiryRow[]>([]);
  readonly d30 = signal<ExpiryRow[]>([]);
  readonly d60 = signal<ExpiryRow[]>([]);
  readonly d90 = signal<ExpiryRow[]>([]);
  readonly plazo = signal<Plazo>('todos');
  readonly plazos = [
    { label: 'Todos los plazos', value: 'todos' },
    { label: 'Vencidos', value: 'vencido' },
    { label: 'Por vencer en 30 días', value: '30' },
    { label: 'Por vencer en 60 días', value: '60' },
    { label: 'Por vencer en 90 días', value: '90' },
  ];
  readonly filas = computed(() => {
    const plazo = this.plazo();
    const groups: Record<Exclude<Plazo, 'todos'>, ExpiryRow[]> = {
      vencido: this.vencido(),
      '30': this.d30(),
      '60': this.d60(),
      '90': this.d90(),
    };
    if (plazo === 'todos') return [...groups.vencido, ...groups['30'], ...groups['60'], ...groups['90']];
    return groups[plazo];
  });

  ngOnInit(): void {
    this.svc.lowStock().subscribe({
      next: (rows) => this.bajos.set(rows),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo cargar el stock bajo.')),
    });
    this.svc.expiring().subscribe({
      next: (alerts) => {
        this.vencido.set(alerts.vencido);
        this.d30.set(alerts.vence_30);
        this.d60.set(alerts.vence_60);
        this.d90.set(alerts.vence_90);
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudieron cargar los vencimientos.')),
    });
  }

  fecha(value: string | null): string {
    return fechaCorta(value);
  }

  severidad(row: ExpiryRow): string {
    if (this.vencido().some((item) => item.batch_id === row.batch_id && item.expiry_date === row.expiry_date)) return 'Vencido';
    if (this.d30().includes(row)) return '30 días';
    if (this.d60().includes(row)) return '60 días';
    return '90 días';
  }
}
