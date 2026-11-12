import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { Textarea } from 'primeng/textarea';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { VentasService, Venta } from '../../../core/services/ventas.service';
import { NotifyService } from '../../../core/ui/notify';
import { TicketViewer } from '../../../shared/components/ticket-viewer/ticket-viewer';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, Button, Dialog, InputText, Message, SelectButton, TableModule, Textarea, AdminTable, TicketViewer],
  templateUrl: './caja.html',
})
export class Caja implements OnInit {
  private svc = inject(VentasService);
  private notify = inject(NotifyService);

  // Estados de Vista
  pendientes = signal<Venta[]>([]);
  completadasTurno = signal<any[]>([]);
  seleccionId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  cancelando = signal(false);
  error = signal<string | null>(null);

  visorTicket = signal(false);
  ticketGeneradoId = signal<number | null>(null);

  // Modal de Cierre / Arqueo de Caja
  mostrarModalCierre = signal(false);
  cajaCerradaExito = signal(false);
  efectivoFisico: number | null = null;
  observacionesCierre = '';
  fechaCierre: Date = new Date();

  // Formulario de Cobranza
  busquedaPending = signal('');
  tipoComprobante: 'boleta' | 'factura' = 'boleta';
  metodoPago = 'efectivo';
  montoRecibido: number | null = null;
  numeroOperacion = '';
  fondoInicial = 100.00;
  readonly comprobantes = [
    { label: 'Boleta', value: 'boleta' },
    { label: 'Factura', value: 'factura' },
  ];
  readonly metodos = [
    { label: 'Efectivo', value: 'efectivo' },
    { label: 'Yape', value: 'yape' },
    { label: 'Plin', value: 'plin' },
    { label: 'Tarjeta', value: 'tarjeta' },
    { label: 'Transferencia', value: 'transferencia' },
  ];

  ventaSeleccionada = computed(() => this.pendientes().find(v => v.id === this.seleccionId()) ?? null);
  porCobrar = computed(() => this.pendientes().reduce((sum, v) => sum + (parseFloat(String(v.total ?? 0)) || 0), 0));

  ventasFiltradas = computed(() => {
    const q = this.busquedaPending().toLowerCase().trim();
    const list = this.pendientes();
    if (!q) return list;
    return list.filter(v =>
      v.id.toString().includes(q) ||
      (v.cliente?.nombre_completo || '').toLowerCase().includes(q)
    );
  });

  // Cálculos reactivos de Totales por Método para Arqueo de Caja
  totalVentasCobradas = computed(() => this.completadasTurno());

  totalEfectivoTurno = computed(() => {
    return this.completadasTurno()
      .filter(v => (v.metodo_pago || 'efectivo') === 'efectivo')
      .reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
  });

  totalYapeTurno = computed(() => {
    return this.completadasTurno()
      .filter(v => v.metodo_pago === 'yape')
      .reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
  });

  totalPlinTurno = computed(() => {
    return this.completadasTurno()
      .filter(v => v.metodo_pago === 'plin')
      .reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
  });

  totalTarjetaTurno = computed(() => {
    return this.completadasTurno()
      .filter(v => v.metodo_pago === 'tarjeta')
      .reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
  });

  efectivoEsperado = computed(() => {
    return this.fondoInicial + this.totalEfectivoTurno();
  });

  diferenciaEfectivo = computed(() => {
    if (this.efectivoFisico === null) return 0;
    return this.efectivoFisico - this.efectivoEsperado();
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      pendientes: this.svc.getAll('pendiente'),
      completadas: this.svc.getAll('completada'),
    }).subscribe({
      next: ({ pendientes, completadas }) => {
        this.pendientes.set(pendientes);
        this.completadasTurno.set(completadas.filter(venta => this.esDeHoy(venta)));
        if (!pendientes.some(v => v.id === this.seleccionId())) {
          const primera = pendientes[0];
          this.seleccionId.set(primera?.id ?? null);
          this.montoRecibido = primera ? parseFloat(String(primera.total)) : null;
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las ventas pendientes.');
        this.loading.set(false);
      },
    });
  }

  seleccionarVenta(v: Venta): void {
    this.seleccionId.set(v.id);
    this.montoRecibido = parseFloat(String(v.total ?? 0)) || 0;
    this.numeroOperacion = '';
    this.error.set(null);
  }

  cambiarMetodo(metodo: string): void {
    this.metodoPago = metodo;
    this.error.set(null);
  }

  totalDe(v: Venta): number {
    return parseFloat(String(v.total ?? 0)) || 0;
  }

  get vuelto(): number {
    const venta = this.ventaSeleccionada();
    if (!venta) return 0;
    const recibido = Number(this.montoRecibido) || 0;
    return recibido - this.totalDe(venta);
  }

  esPagoValido(): boolean {
    const venta = this.ventaSeleccionada();
    if (!venta) return false;

    if (this.metodoPago === 'efectivo') {
      return this.vuelto >= 0;
    } else {
      return this.numeroOperacion.trim().length >= 3;
    }
  }

  procesarCobro(): void {
    const venta = this.ventaSeleccionada();
    if (!venta) {
      this.error.set('Selecciona una venta pendiente.');
      return;
    }

    if (!this.esPagoValido()) {
      if (this.metodoPago === 'efectivo') {
        this.error.set('El monto recibido es menor al total.');
      } else {
        this.error.set(`Ingresa el número de operación de ${this.metodoPago.toUpperCase()} para validar la cobranza.`);
      }
      return;
    }

    const total = this.totalDe(venta);
    this.saving.set(true);
    this.error.set(null);

    const payload = {
      invoice_type: this.tipoComprobante,
      payments: [
        {
          method: this.metodoPago,
          amount: total,
          reference: this.metodoPago !== 'efectivo' ? this.numeroOperacion.trim() : null
        }
      ]
    };

    this.svc.cobrar(venta.id, payload).subscribe({
      next: () => {
        this.notify.success(`Ticket #${venta.id}. El cobro quedó registrado y el stock se actualizó.`);
        this.ticketGeneradoId.set(venta.id);
        this.visorTicket.set(true);
        this.saving.set(false);
        this.montoRecibido = null;
        this.numeroOperacion = '';
        this.seleccionId.set(null);
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo procesar el cobro.';
        this.notify.error(msg);
        this.saving.set(false);
      },
    });
  }

  private esDeHoy(venta: Venta): boolean {
    const raw = venta.created_at || venta.fecha || '';
    if (!raw) return false;
    const instante = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
    if (Number.isNaN(instante.getTime())) return false;
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    return instante >= inicio;
  }

  // --- MÉTODOS DE ARQUEO Y CIERRE DE CAJA ---
  abrirModalCierre(): void {
    this.fechaCierre = new Date();
    this.efectivoFisico = null;
    this.observacionesCierre = '';
    this.cajaCerradaExito.set(false);
    this.mostrarModalCierre.set(true);
  }

  cerrarModalCierre(): void {
    this.mostrarModalCierre.set(false);
  }

  confirmarCierreTurno(): void {
    this.fechaCierre = new Date();
    this.cajaCerradaExito.set(true);
    this.notify.success('Turno de caja cerrado.');
  }

  imprimirReporteZ(): void {
    window.print();
  }

  finalizarSesionCaja(): void {
    this.mostrarModalCierre.set(false);
    this.completadasTurno.set([]);
    this.load();
  }

  anularVenta(id: number): void {
    const motivo = prompt('Ingresa el motivo de la anulación:');
    if (!motivo) return;

    this.cancelando.set(true);
    this.error.set(null);

    this.svc.anular(id, motivo).subscribe({
      next: (res) => {
        this.notify.success(res?.message || `Venta #${id} anulada.`);
        this.cancelando.set(false);
        this.montoRecibido = null;
        this.numeroOperacion = '';
        this.seleccionId.set(null);
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo anular la venta.';
        this.notify.error(msg);
        this.cancelando.set(false);
      },
    });
  }
}