import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { CashSession, Sale } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { CashService, SalesService } from '../../../core/services/commerce.service';
import { soles } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { TicketViewer } from '../../../shared/components/ticket-viewer/ticket-viewer';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, AdminTable, TicketViewer],
  templateUrl: './caja.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Caja implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly cash = inject(CashService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Sale>(
    (query) => this.sales.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar las ventas pendientes.')),
  );
  readonly session = signal<CashSession | null>(null);
  readonly seleccion = signal<Sale | null>(null);
  readonly abrirCaja = signal(false);
  readonly cerrarCaja = signal(false);
  readonly anular = signal(false);
  readonly ticketId = signal<number | null>(null);
  readonly ticketOpen = signal(false);
  readonly saving = signal(false);
  readonly fechaApertura = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima',
  }).format(new Date());
  apertura = 0;
  readonly montosRapidos = [0, 50, 100, 200];
  readonly denominaciones = [200, 100, 50, 20, 10, 5, 2, 1, 0.5];
  conteoBilletes: Record<number, number> = Object.fromEntries(this.denominaciones.map((valor) => [valor, 0]));
  readonly denominacionesCierre = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
  conteoCierre: Record<number, number> = Object.fromEntries(this.denominacionesCierre.map((valor) => [valor, 0]));
  conteo = 0;
  notas = '';
  motivo = '';
  metodo = 'efectivo';
  recibido = 0;
  readonly metodos = [
    { id: 'efectivo', label: 'Efectivo' },
    { id: 'yape', label: 'Yape' },
    { id: 'plin', label: 'Plin' },
    { id: 'tarjeta', label: 'Tarjeta' },
    { id: 'transferencia', label: 'Transferencia' },
  ];
  readonly billetes = [10, 20, 50, 100, 200];

  ngOnInit(): void {
    this.list.extra = { status: 'pending' };
    this.list.load(1);
    this.cash.current().subscribe({
      next: (session) => this.session.set(session),
      error: () => this.session.set(null),
    });
  }

  abrir(): void {
    this.saving.set(true);
    this.cash.open(this.apertura).subscribe({
      next: (session) => {
        this.saving.set(false);
        this.session.set(session);
        this.abrirCaja.set(false);
        this.notify.success('Caja abierta.');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo abrir la caja.'));
      },
    });
  }

  cerrar(): void {
    const session = this.session();
    if (!session) return;
    this.saving.set(true);
    this.cash.close(session.id, this.conteo, this.notas).subscribe({
      next: (closed) => {
        this.saving.set(false);
        this.session.set(closed);
        this.cerrarCaja.set(false);
        this.notify.success('Caja cerrada.');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo cerrar la caja.'));
      },
    });
  }

  iniciarCierre(): void {
    this.conteo = 0;
    this.notas = '';
    this.conteoCierre = Object.fromEntries(this.denominacionesCierre.map((valor) => [valor, 0]));
    this.cerrarCaja.set(true);
  }

  elegir(row: Sale): void {
    this.sales.show(row.id).subscribe({
      next: (sale) => {
        this.seleccion.set(sale);
        this.recibido = Number(sale.balance) || Number(sale.total) || 0;
        this.metodo = 'efectivo';
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo abrir la venta.')),
    });
  }

  cobrar(): void {
    const sale = this.seleccion();
    if (!sale) return;
    const amount = this.metodo === 'efectivo' ? this.recibido : Number(sale.balance) || Number(sale.total);
    this.saving.set(true);
    this.sales.pay(sale.id, [{ method: this.metodo, amount }]).subscribe({
      next: () => {
        this.saving.set(false);
        this.seleccion.set(null);
        this.ticketId.set(sale.id);
        this.ticketOpen.set(true);
        this.notify.success('Cobro registrado.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo cobrar la venta.'));
      },
    });
  }

  confirmarAnular(): void {
    const sale = this.seleccion();
    if (!sale || this.motivo.trim().length < 5) {
      this.notify.warn('Escribe el motivo de la anulación.');
      return;
    }
    this.sales.void(sale.id, this.motivo.trim()).subscribe({
      next: () => {
        this.notify.success('Venta anulada.');
        this.anular.set(false);
        this.seleccion.set(null);
        this.motivo = '';
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo anular la venta.')),
    });
  }

  sumar(valor: number): void { this.recibido = Number(this.recibido) + valor; }

  elegirMontoApertura(valor: number): void { this.apertura = valor; }

  cambiarConteo(valor: number, cambio: number): void {
    this.conteoBilletes = {
      ...this.conteoBilletes,
      [valor]: Math.max(0, (this.conteoBilletes[valor] ?? 0) + cambio),
    };
  }

  totalConteoApertura(): number {
    return this.denominaciones.reduce((total, valor) => total + valor * (this.conteoBilletes[valor] ?? 0), 0);
  }

  usarConteoApertura(): void { this.apertura = this.totalConteoApertura(); }

  cambiarConteoCierre(valor: number, cambio: number): void {
    this.conteoCierre = {
      ...this.conteoCierre,
      [valor]: Math.max(0, (this.conteoCierre[valor] ?? 0) + cambio),
    };
  }

  totalConteoCierre(): number {
    return this.denominacionesCierre.reduce((total, valor) => total + valor * (this.conteoCierre[valor] ?? 0), 0);
  }

  usarConteoCierre(): void { this.conteo = this.totalConteoCierre(); }

  diferenciaCierre(): number {
    return Number(this.conteo) - Number(this.session()?.expected_amount ?? 0);
  }

  vuelto(): number {
    const total = Number(this.seleccion()?.balance ?? this.seleccion()?.total ?? 0);
    if (this.metodo !== 'efectivo') return 0;
    return Math.max(0, Number(this.recibido) - total);
  }
  soles(value: string | number | null | undefined): string { return soles(value); }
}
