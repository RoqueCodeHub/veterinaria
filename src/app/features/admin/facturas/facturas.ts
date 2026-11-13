import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { map } from 'rxjs';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Invoice } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { InvoicesService, SalesService } from '../../../core/services/commerce.service';
import { fechaCorta, soles } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { RemoteOption, RemoteSelect } from '../../../shared/components/remote-select/remote-select';

@Component({
  selector: 'app-facturas',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, Select, AdminTable, RemoteSelect],
  templateUrl: './facturas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Facturas implements OnInit {
  private readonly svc = inject(InvoicesService);
  private readonly sales = inject(SalesService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Invoice>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar los comprobantes.')),
  );
  readonly series = signal<{ id: number; document_type: string; series: string; next_number: number; active: boolean }[]>([]);
  readonly requisitos = signal<Record<string, unknown>>({});
  readonly modal = signal(false);
  readonly saving = signal(false);
  emit = { sale_id: null as number | null, type: 'boleta' as 'boleta' | 'factura', customer_doc_number: '', customer_name: '' };
  readonly tipos = [
    { label: 'Boleta', value: 'boleta' },
    { label: 'Factura', value: 'factura' },
  ];
  readonly buscarVentas = (term: string) => this.sales.list({ page: 1, perPage: 20, q: term, extra: { status: 'completed' } }).pipe(
    map((page) => page.items.map((row): RemoteOption => ({ id: row.id, label: `${row.document} · ${row.cliente || 'Cliente varios'}` }))),
  );

  ngOnInit(): void {
    this.list.load(1);
    this.svc.series().subscribe({ next: (rows) => this.series.set(rows) });
    this.svc.requirements().subscribe({ next: (rows) => this.requisitos.set(rows) });
  }

  emitir(): void {
    if (!this.emit.sale_id) {
      this.notify.warn('Elige la venta.');
      return;
    }
    this.saving.set(true);
    this.svc.emit(this.emit.sale_id, {
      type: this.emit.type,
      customer_doc_number: this.emit.customer_doc_number || undefined,
      customer_name: this.emit.customer_name || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success('Comprobante enviado.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo emitir el comprobante.'));
      },
    });
  }

  reintentar(row: Invoice): void {
    this.svc.retry(row.id).subscribe({
      next: () => { this.notify.success('Reintento enviado.'); this.list.load(); },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo reintentar.')),
    });
  }

  soles(value: string | number | null | undefined): string { return soles(value); }
  fecha(value: string | null): string { return fechaCorta(value); }
}
