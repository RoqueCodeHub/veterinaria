import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { map, tap } from 'rxjs';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { CatalogItem, KardexLine, StockRow } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { SalesService } from '../../../core/services/commerce.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { fechaCorta } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { RemoteOption, RemoteSelect } from '../../../shared/components/remote-select/remote-select';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, Select, AdminTable, RemoteSelect],
  templateUrl: './stock.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stock implements OnInit {
  private readonly svc = inject(InventoryService);
  private readonly sales = inject(SalesService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<StockRow>(
    (query) => this.svc.stock(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudo cargar el stock.')),
  );
  readonly ingresoOpen = signal(false);
  readonly ajusteOpen = signal(false);
  readonly cajaOpen = signal(false);
  readonly kardexOpen = signal(false);
  readonly kardex = signal<KardexLine[]>([]);
  readonly lotes = signal<{ id: number; label: string }[]>([]);
  readonly saving = signal(false);
  soloBajo = false;
  private catalogo: CatalogItem[] = [];
  ingreso = { variant_id: null as number | null, quantity: 1, cost: null as number | null, batch_code: '', expiry_date: '' };
  ajuste = { variant_id: null as number | null, batch_id: null as number | null, direction: 'entrada' as 'entrada' | 'salida', quantity: 1, reason: '' };
  caja = { variant_id: null as number | null, batch_id: null as number | null, boxes: 1 };
  readonly direcciones = [
    { label: 'Entrada', value: 'entrada' },
    { label: 'Salida', value: 'salida' },
  ];
  readonly buscarVariantes = (term: string) => this.sales.search({ page: 1, perPage: 20, q: term }).pipe(
    tap((page) => { this.catalogo = page.items; }),
    map((page) => page.items.map((item): RemoteOption => ({
      id: item.variant_id,
      label: `${item.nombre}${item.presentacion ? ' · ' + item.presentacion : ''}`,
    }))),
  );

  ngOnInit(): void { this.list.load(1); }

  buscar(event: Event): void { this.list.search((event.target as HTMLInputElement).value); }

  filtrar(): void {
    this.list.extra = { low_stock: this.soloBajo ? 1 : undefined };
    this.list.load(1);
  }

  cargarLotes(variantId: number | null | undefined): void {
    this.lotes.set([]);
    if (!variantId) return;
    this.svc.show(variantId).subscribe({
      next: (detail) => this.lotes.set(detail.batches.map((batch) => ({
        id: batch.id,
        label: `${batch.batch_code || 'Sin lote'} · ${batch.quantity} ud · ${fechaCorta(batch.expiry_date)}`,
      }))),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudieron cargar los lotes.')),
    });
  }

  recibir(): void {
    const item = this.catalogo.find((row) => row.variant_id === this.ingreso.variant_id);
    if (!item || this.ingreso.quantity < 1) {
      this.notify.warn('Elige una variante y una cantidad.');
      return;
    }
    this.saving.set(true);
    this.svc.receive({
      producto_id: item.id,
      variant_id: item.variant_id,
      quantity: this.ingreso.quantity,
      cost: this.ingreso.cost,
      batch_code: this.ingreso.batch_code || null,
      expiry_date: this.ingreso.expiry_date || null,
    }).subscribe({
      next: () => this.listo('Ingreso registrado.', () => this.ingresoOpen.set(false)),
      error: (error: HttpErrorResponse) => this.fallo(error, 'No se pudo registrar el ingreso.'),
    });
  }

  ajustar(): void {
    if (!this.ajuste.batch_id || !this.ajuste.reason.trim() || this.ajuste.quantity < 1) {
      this.notify.warn('Elige el lote, la cantidad y el motivo.');
      return;
    }
    this.saving.set(true);
    this.svc.adjust({
      batch_id: this.ajuste.batch_id,
      direction: this.ajuste.direction,
      quantity: this.ajuste.quantity,
      reason: this.ajuste.reason.trim(),
    }).subscribe({
      next: () => this.listo('Ajuste registrado.', () => this.ajusteOpen.set(false)),
      error: (error: HttpErrorResponse) => this.fallo(error, 'No se pudo ajustar el stock.'),
    });
  }

  abrirCaja(): void {
    if (!this.caja.batch_id || this.caja.boxes < 1) {
      this.notify.warn('Elige el lote y cuántas cajas abrir.');
      return;
    }
    this.saving.set(true);
    this.svc.openBox({ batch_id: this.caja.batch_id, boxes: this.caja.boxes }).subscribe({
      next: () => this.listo('Caja abierta.', () => this.cajaOpen.set(false)),
      error: (error: HttpErrorResponse) => this.fallo(error, 'No se pudo abrir la caja.'),
    });
  }

  verKardex(row: StockRow): void {
    this.svc.kardex(row.variant.id).subscribe({
      next: (lines) => { this.kardex.set(lines); this.kardexOpen.set(true); },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo abrir el kardex.')),
    });
  }

  fecha(value: string | null): string { return fechaCorta(value); }

  private listo(message: string, close: () => void): void {
    this.saving.set(false);
    close();
    this.notify.success(message);
    this.list.load();
  }

  private fallo(error: HttpErrorResponse, fallback: string): void {
    this.saving.set(false);
    this.notify.error(apiMessage(error, fallback));
  }
}
