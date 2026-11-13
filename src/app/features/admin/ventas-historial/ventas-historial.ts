import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Sale } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { SalesService } from '../../../core/services/commerce.service';
import { fechaCorta, soles, whatsapp } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { TicketViewer } from '../../../shared/components/ticket-viewer/ticket-viewer';

interface LineaDevolucion {
  sale_item_id: number;
  description: string;
  max: number;
  quantity: number;
  selected: boolean;
}

@Component({
  selector: 'app-ventas-historial',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, Select, AdminTable, TicketViewer],
  templateUrl: './ventas-historial.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasHistorialComponent implements OnInit {
  private readonly svc = inject(SalesService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Sale>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudo cargar el historial.')),
  );
  readonly detalle = signal<Sale | null>(null);
  readonly anular = signal(false);
  readonly devolver = signal(false);
  readonly ticketId = signal<number | null>(null);
  readonly ticketOpen = signal(false);
  estado = '';
  fecha = '';
  motivo = '';
  lineas: LineaDevolucion[] = [];
  readonly estados = [
    { label: 'Todos los estados', value: '' },
    { label: 'Pendiente', value: 'pending' },
    { label: 'Completada', value: 'completed' },
    { label: 'Anulada', value: 'voided' },
  ];

  ngOnInit(): void { this.list.load(1); }

  buscar(event: Event): void { this.list.search((event.target as HTMLInputElement).value); }

  filtrar(): void {
    this.list.extra = { status: this.estado || undefined, fecha: this.fecha || undefined };
    this.list.load(1);
  }

  ver(row: Sale): void {
    this.svc.show(row.id).subscribe({
      next: (sale) => this.detalle.set(sale),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo abrir la venta.')),
    });
  }

  imprimir(row: Sale): void {
    this.ticketId.set(row.id);
    this.ticketOpen.set(true);
  }

  abrirDevolucion(): void {
    const sale = this.detalle();
    if (!sale) return;
    this.lineas = (sale.items ?? []).map((item) => ({
      sale_item_id: item.id,
      description: item.description,
      max: item.quantity,
      quantity: item.quantity,
      selected: false,
    }));
    this.motivo = '';
    this.devolver.set(true);
  }

  confirmarAnular(): void {
    const sale = this.detalle();
    if (!sale || this.motivo.trim().length < 5) {
      this.notify.warn('El motivo debe tener al menos 5 caracteres.');
      return;
    }
    this.svc.void(sale.id, this.motivo.trim()).subscribe({
      next: () => {
        this.notify.success('Venta anulada.');
        this.anular.set(false);
        this.detalle.set(null);
        this.motivo = '';
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo anular la venta.')),
    });
  }

  confirmarDevolucion(): void {
    const sale = this.detalle();
    const items = this.lineas.filter((line) => line.selected && line.quantity > 0 && line.quantity <= line.max);
    if (!sale || items.length === 0 || this.motivo.trim().length < 5) {
      this.notify.warn('Elige líneas, cantidades válidas y un motivo.');
      return;
    }
    this.svc.returnSale(sale.id, {
      reason: this.motivo.trim(),
      refund_method: 'efectivo',
      items: items.map((line) => ({ sale_item_id: line.sale_item_id, quantity: Number(line.quantity) })),
    }).subscribe({
      next: () => {
        this.notify.success('Devolución registrada.');
        this.devolver.set(false);
        this.detalle.set(null);
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo registrar la devolución.')),
    });
  }

  wa(sale: Sale): string | null {
    return whatsapp(null) && sale.cliente ? `https://wa.me/?text=${encodeURIComponent('Ticket ' + sale.document + ' por ' + soles(sale.total))}` : `https://wa.me/?text=${encodeURIComponent('Ticket ' + sale.document)}`;
  }

  soles(value: string | number | null | undefined): string { return soles(value); }
  fechaCorta(value: string | null): string { return fechaCorta(value); }
}
