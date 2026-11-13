import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { StockCount } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { InventoryService } from '../../../core/services/inventory.service';
import { fechaCorta } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-conteos',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, AdminTable, ConfirmDialog],
  templateUrl: './conteos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Conteos implements OnInit {
  private readonly svc = inject(InventoryService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<StockCount>(
    (query) => this.svc.counts(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar los conteos.')),
  );
  readonly nuevo = signal(false);
  readonly detalle = signal<StockCount | null>(null);
  readonly aprobar = signal<StockCount | null>(null);
  readonly saving = signal(false);
  notas = '';
  lineas: { id: number; producto: string | null; sku: string | null; system_qty: number; counted_qty: number }[] = [];

  ngOnInit(): void { this.list.load(1); }

  crear(): void {
    this.saving.set(true);
    this.svc.createCount(this.notas.trim() || undefined).subscribe({
      next: (count) => {
        this.saving.set(false);
        this.nuevo.set(false);
        this.notas = '';
        this.notify.success('Conteo creado.');
        this.list.load();
        this.ver(count);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo crear el conteo.'));
      },
    });
  }

  ver(row: StockCount): void {
    this.svc.showCount(row.id).subscribe({
      next: (count) => {
        this.detalle.set(count);
        this.lineas = (count.items ?? []).map((item) => ({
          id: item.id,
          producto: item.producto,
          sku: item.sku,
          system_qty: item.system_qty,
          counted_qty: item.counted_qty ?? item.system_qty,
        }));
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo abrir el conteo.')),
    });
  }

  guardarLineas(): void {
    const count = this.detalle();
    if (!count) return;
    this.saving.set(true);
    this.svc.recordCount(count.id, this.lineas.map((line) => ({ id: line.id, counted_qty: Number(line.counted_qty) }))).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.detalle.set(updated);
        this.notify.success('Conteo guardado.');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo guardar el conteo.'));
      },
    });
  }

  confirmar(): void {
    const count = this.aprobar();
    if (!count) return;
    this.svc.approveCount(count.id).subscribe({
      next: () => {
        this.notify.success('Conteo aprobado.');
        this.aprobar.set(null);
        this.detalle.set(null);
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo aprobar el conteo.')),
    });
  }

  fecha(value: string | null): string { return fechaCorta(value); }
}
