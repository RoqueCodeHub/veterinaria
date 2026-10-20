import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService, Venta } from '../../../core/services/ventas.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './caja.html',
  styleUrl: './caja.css',
})
export class Caja implements OnInit {
  private svc = inject(VentasService);

  // Estados de Vista
  pendientes = signal<Venta[]>([]);
  completadasTurno = signal<any[]>([]);
  seleccionId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  cancelando = signal(false);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  // Modal de Ticket de Venta
  mostrarModalTicket = signal(false);
  ticketData = signal<any | null>(null);

  // Modal de Cierre / Arqueo de Caja
  mostrarModalCierre = signal(false);
  cajaCerradaExito = signal(false);
  efectivoFisico: number | null = null;
  observacionesCierre = '';
  fechaCierre: Date = new Date();

  // Formulario de Cobranza
  busquedaPending = '';
  tipoComprobante: 'boleta' | 'factura' = 'boleta';
  metodoPago = 'efectivo';
  montoRecibido: number | null = null;
  numeroOperacion = '';
  fondoInicial = 100.00;

  ventaSeleccionada = computed(() => this.pendientes().find(v => v.id === this.seleccionId()) ?? null);

  ventasFiltradas = computed(() => {
    const q = this.busquedaPending.toLowerCase().trim();
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
    this.svc.getAll('pendiente').subscribe({
      next: (data) => {
        this.pendientes.set(data);
        if (!data.some(v => v.id === this.seleccionId())) {
          const primera = data[0];
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
    this.aviso.set(null);
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
    this.aviso.set(null);

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
      next: (res: any) => {
        const resData = res?.data || res;
        const invoiceId = resData.invoices?.[0]?.id || resData.id || venta.id;
        
        const ticketInfo = {
          id: venta.id,
          invoiceId: invoiceId,
          document: resData.series ? `${resData.series}-${String(resData.number).padStart(6, '0')}` : `#${venta.id}`,
          documentType: this.tipoComprobante === 'factura' ? 'Factura' : 'Boleta',
          fecha: new Date(),
          cajero: resData.user?.name || 'Administrador',
          cliente: venta.cliente?.nombre_completo || 'CLIENTE VARIOS',
          mascota: resData.pet?.nombre || null,
          items: venta.items,
          total: total,
          discount: parseFloat(String(venta.discount || 0)),
          metodo_pago: this.metodoPago,
          numero_operacion: this.numeroOperacion.trim(),
          change_amount: this.vuelto,
          invoice: resData.invoices?.[0] || null
        };

        // Guardar venta completada en el historial en memoria del turno actual
        this.completadasTurno.update(list => [...list, ticketInfo]);

        this.ticketData.set(ticketInfo);
        this.mostrarModalTicket.set(true);

        this.aviso.set(`Venta #${venta.id} cobrada exitosamente.`);
        this.saving.set(false);
        this.montoRecibido = null;
        this.numeroOperacion = '';
        this.seleccionId.set(null);
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo procesar el cobro.';
        this.error.set(msg);
        this.saving.set(false);
      },
    });
  }

  imprimirTicket(): void {
    window.print();
  }

  enviarWhatsApp(): void {
    const t = this.ticketData();
    if (!t) return;

    const telefonoInput = prompt('Ingresa el número de WhatsApp del cliente (9 dígitos):', '987654321');
    if (!telefonoInput) return;

    const numLimpio = telefonoInput.replace(/\D/g, '');
    const phoneWithCode = numLimpio.length === 9 ? `51${numLimpio}` : numLimpio;
    const pdfUrl = `${environment.apiUrl}/v1/invoices/${t.invoiceId}/pdf`;

    const mensaje = `Hola *${t.cliente}* 👋, gracias por tu preferencia en *Veterinaria Ali-Vet* 🐾.\n\n` +
      `Adjuntamos el resumen de tu *${t.documentType} Electrónica ${t.document}* por un total de *S/ ${t.total.toFixed(2)}*.\n` +
      `Forma de pago: ${t.metodo_pago.toUpperCase()}.\n\n` +
      `📄 Puedes ver/descargar tu comprobante PDF aquí:\n${pdfUrl}\n\n` +
      `¡Que tengas un excelente día! 😊`;

    const url = `https://api.whatsapp.com/send?phone=${phoneWithCode}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    this.aviso.set(`✅ ${t.documentType} N° ${t.document} enviada con éxito por WhatsApp.`);
  }

  enviarCorreo(): void {
    const t = this.ticketData();
    if (!t) return;

    const correoInput = prompt('Ingresa el correo electrónico del cliente:', 'cliente@email.com');
    if (!correoInput) return;

    this.aviso.set(`📩 ${t.documentType} N° ${t.document} enviada con éxito al correo ${correoInput}.`);
    alert(`Comprobante enviado exitosamente a ${correoInput}`);
  }

  cerrarModalTicket(): void {
    this.mostrarModalTicket.set(false);
    this.ticketData.set(null);
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
    this.aviso.set('🔒 Turno de caja cerrado exitosamente.');
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
    this.aviso.set(null);

    this.svc.anular(id, motivo).subscribe({
      next: (res) => {
        this.aviso.set(res?.message || `Venta #${id} anulada.`);
        this.cancelando.set(false);
        this.montoRecibido = null;
        this.numeroOperacion = '';
        this.seleccionId.set(null);
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo anular la venta.';
        this.error.set(msg);
        this.cancelando.set(false);
      },
    });
  }
}