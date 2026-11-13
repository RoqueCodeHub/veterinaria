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
import { CatalogItem, Purchase } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { PurchasesService, SalesService } from '../../../core/services/commerce.service';
import { SuppliersService } from '../../../core/services/parties.service';
import { fechaCorta, soles } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { RemoteOption, RemoteSelect } from '../../../shared/components/remote-select/remote-select';

interface LineaCompra {
  variant_id: number | null;
  batch_code: string;
  expiry_date: string;
  quantity: number;
  cost: number;
}

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, Select, AdminTable, ConfirmDialog, RemoteSelect],
  templateUrl: './compras.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Compras implements OnInit {
  private readonly svc = inject(PurchasesService);
  private readonly sales = inject(SalesService);
  private readonly suppliers = inject(SuppliersService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Purchase>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar las compras.')),
  );
  readonly modal = signal(false);
  readonly detalle = signal<Purchase | null>(null);
  readonly confirmar = signal<Purchase | null>(null);
  readonly historial = signal<{ id: number; cost: string | number; comprobante: string | null; created_at: string | null }[]>([]);
  readonly saving = signal(false);
  estado = '';
  private catalogo: CatalogItem[] = [];
  cabecera = { supplier_id: null as number | null, comprobante: '', fecha: '', due_date: '', notes: '' };
  lineas: LineaCompra[] = [this.linea()];
  pago = { amount: null as number | null, method: 'efectivo', reference: '' };
  readonly estados = [
    { label: 'Todos los estados', value: '' },
    { label: 'Borrador', value: 'draft' },
    { label: 'Confirmada', value: 'confirmed' },
  ];
  readonly metodos = [
    { label: 'Efectivo', value: 'efectivo' },
    { label: 'Transferencia', value: 'transferencia' },
    { label: 'Yape', value: 'yape' },
  ];
  readonly buscarProveedores = (term: string) => this.suppliers.list({ page: 1, perPage: 20, q: term }).pipe(
    map((page) => page.items.map((row): RemoteOption => ({ id: row.id, label: row.name }))),
  );
  readonly buscarVariantes = (term: string) => this.sales.search({ page: 1, perPage: 20, q: term }).pipe(
    tap((page) => { this.catalogo = page.items; }),
    map((page) => page.items.map((item): RemoteOption => ({ id: item.variant_id, label: item.nombre }))),
  );

  ngOnInit(): void { this.list.load(1); }

  buscar(event: Event): void { this.list.search((event.target as HTMLInputElement).value); }

  filtrar(): void {
    this.list.extra = { status: this.estado || undefined };
    this.list.load(1);
  }

  abrir(): void {
    const hoy = new Date().toISOString().slice(0, 10);
    this.cabecera = { supplier_id: null, comprobante: '', fecha: hoy, due_date: '', notes: '' };
    this.lineas = [this.linea()];
    this.modal.set(true);
  }

  agregarLinea(): void { this.lineas = [...this.lineas, this.linea()]; }

  guardar(): void {
    if (!this.cabecera.supplier_id || !this.cabecera.fecha || this.lineas.some((line) => !line.variant_id || !line.batch_code || line.quantity < 1)) {
      this.notify.warn('Completa proveedor, fecha y cada línea con variante, lote y cantidad.');
      return;
    }
    this.saving.set(true);
    this.svc.create({
      supplier_id: this.cabecera.supplier_id,
      comprobante: this.cabecera.comprobante || null,
      fecha: this.cabecera.fecha,
      due_date: this.cabecera.due_date || null,
      notes: this.cabecera.notes || null,
      items: this.lineas.map((line) => ({
        variant_id: line.variant_id as number,
        batch_code: line.batch_code,
        expiry_date: line.expiry_date || null,
        quantity: line.quantity,
        cost: line.cost,
      })),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success('Compra creada.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo crear la compra.'));
      },
    });
  }

  ver(row: Purchase): void {
    this.svc.show(row.id).subscribe({
      next: (purchase) => {
        this.detalle.set(purchase);
        this.pago = { amount: Number(purchase.balance), method: 'efectivo', reference: '' };
        const variantId = purchase.items?.[0]?.variant_id;
        this.historial.set([]);
        if (variantId) {
          this.svc.costHistory(variantId).subscribe({ next: (rows) => this.historial.set(rows) });
        }
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo abrir la compra.')),
    });
  }

  confirmarCompra(): void {
    const row = this.confirmar();
    if (!row) return;
    this.svc.confirm(row.id).subscribe({
      next: (purchase) => {
        this.notify.success('Compra confirmada.');
        this.confirmar.set(null);
        this.detalle.set(purchase);
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo confirmar la compra.')),
    });
  }

  pagar(): void {
    const row = this.detalle();
    if (!row || !this.pago.amount || this.pago.amount <= 0) {
      this.notify.warn('Indica el monto del pago.');
      return;
    }
    this.svc.pay(row.id, { amount: this.pago.amount, method: this.pago.method, reference: this.pago.reference || undefined }).subscribe({
      next: (purchase) => {
        this.notify.success('Pago registrado.');
        this.detalle.set(purchase);
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo registrar el pago.')),
    });
  }

  soles(value: string | number | null | undefined): string { return soles(value); }
  fecha(value: string | null | undefined): string { return fechaCorta(value); }

  private linea(): LineaCompra {
    return { variant_id: null, batch_code: '', expiry_date: '', quantity: 1, cost: 0 };
  }
}
