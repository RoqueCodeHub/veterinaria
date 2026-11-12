import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { VentasService, Venta } from '../../../core/services/ventas.service';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { TicketViewer } from '../../../shared/components/ticket-viewer/ticket-viewer';

@Component({
  selector: 'app-ventas-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, Button, Dialog, InputText, Select, Textarea, AdminTable, TicketViewer],
  templateUrl: './ventas-historial.html',
})
export class VentasHistorialComponent implements OnInit {
  private ventasService = inject(VentasService);
  private notify = inject(NotifyService);

  // Estados principales
  ventas = signal<Venta[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  // Filtros. Son campos normales para que ngModel vuelva a pintar la tabla.
  busqueda = '';
  filtroRangoFecha: 'hoy' | 'semana' | 'mes' | 'todos' = 'todos';
  filtroEstado: 'todos' | 'completada' | 'anulada' | 'pendiente' = 'todos';
  readonly rangosFecha = [
    { label: 'Todos', value: 'todos' },
    { label: 'Hoy', value: 'hoy' },
    { label: 'Semana', value: 'semana' },
    { label: 'Mes', value: 'mes' },
  ];
  readonly estados = [
    { label: 'Todos', value: 'todos' },
    { label: 'Completada', value: 'completada' },
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Anulada', value: 'anulada' },
  ];
  // Modales
  ventaSeleccionada = signal<Venta | null>(null);
  mostrarModalDetalle = signal(false);
  visorTicket = signal(false);
  ticketId = signal<number | null>(null);
  mostrarWhatsapp = signal(false);
  telefonoWhatsapp = '';
  errorWhatsapp = signal<string | null>(null);
  mostrarAnulacion = signal(false);
  motivoAnulacion = '';
  errorAnulacion = signal<string | null>(null);
  anulando = signal(false);

  metricas(): { cantidad: number; totalSoles: number; promedio: number; anuladas: number } {
    const list = this.ventasFiltradas();
    const completadas = list.filter(v => this.esCompletada(v));
    const totalSoles = completadas.reduce((acc, v) => acc + this.totalDe(v), 0);
    return {
      cantidad: completadas.length,
      totalSoles,
      promedio: completadas.length > 0 ? totalSoles / completadas.length : 0,
      anuladas: list.filter(v => this.esAnulada(v)).length,
    };
  }

  ventasFiltradas(): Venta[] {
    const query = this.busqueda.toLowerCase().trim();
    return this.ventas().filter(v => {
      if (this.filtroEstado === 'completada' && !this.esCompletada(v)) return false;
      if (this.filtroEstado === 'anulada' && !this.esAnulada(v)) return false;
      if (this.filtroEstado === 'pendiente' && !this.esPendiente(v)) return false;
      if (!this.dentroDelRango(v.fecha)) return false;
      if (!query) return true;
      const comprobante = `${v.series ?? ''}-${v.number ?? ''}`.toLowerCase();
      return v.id.toString().includes(query)
        || (v.cliente?.nombre_completo || '').toLowerCase().includes(query)
        || comprobante.includes(query);
    });
  }

  esCompletada(venta: Venta): boolean {
    return ['completada', 'activa', 'completed'].includes(this.estadoDe(venta));
  }

  esAnulada(venta: Venta): boolean {
    return ['anulada', 'voided'].includes(this.estadoDe(venta));
  }

  esPendiente(venta: Venta): boolean {
    return ['pendiente', 'pending'].includes(this.estadoDe(venta));
  }

  etiquetaEstado(venta: Venta): string {
    if (this.esCompletada(venta)) return 'Completada';
    if (this.esAnulada(venta)) return 'Anulada';
    if (this.esPendiente(venta)) return 'Pendiente';
    return venta.estado || venta.status || '—';
  }

  metodoDe(venta: Venta): string {
    return venta.payments?.[0]?.method || venta.metodo_pago || 'efectivo';
  }

  cajeroDe(venta: Venta): string {
    return venta.trabajador?.nombre_completo || venta.user?.name || '—';
  }

  totalDe(venta: Venta): number {
    return parseFloat(String(venta.total)) || 0;
  }

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.loading.set(true);
    this.error.set(null);

    // Consulta de ventas filtradas
    this.ventasService.getAll().subscribe({
      next: (data) => {
        this.ventas.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el historial de ventas.');
        this.loading.set(false);
      }
    });
  }

  // Acciones de Vista
  verDetalle(venta: Venta): void {
    this.ventaSeleccionada.set(venta);
    this.mostrarModalDetalle.set(true);
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle.set(false);
  }

  abrirTicket(venta: Venta): void {
    this.ticketId.set(venta.id);
    this.visorTicket.set(true);
  }

  abrirWhatsapp(venta: Venta): void {
    this.ventaSeleccionada.set(venta);
    this.telefonoWhatsapp = '';
    this.errorWhatsapp.set(null);
    this.mostrarWhatsapp.set(true);
  }

  confirmarWhatsapp(): void {
    const venta = this.ventaSeleccionada();
    const digitos = this.telefonoWhatsapp.replace(/\D/g, '');
    if (!/^9\d{8}$/.test(digitos)) {
      this.errorWhatsapp.set('Ingresa un celular de 9 dígitos que empiece con 9.');
      return;
    }
    if (!venta) return;
    const total = this.totalDe(venta).toFixed(2);
    const cliente = venta.cliente?.nombre_completo || 'cliente';
    const mensaje = `Hola ${cliente}, tu comprobante en Veterinaria Ali-Vet.\nTicket #${venta.id}\nTotal: S/ ${total}\nGracias por tu preferencia.`;
    window.open(`https://api.whatsapp.com/send?phone=51${digitos}&text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener');
    this.mostrarWhatsapp.set(false);
    this.notify.success(`Resumen del ticket #${venta.id} listo para WhatsApp.`);
  }

  abrirAnulacion(venta: Venta): void {
    this.ventaSeleccionada.set(venta);
    this.motivoAnulacion = '';
    this.errorAnulacion.set(null);
    this.mostrarAnulacion.set(true);
  }

  confirmarAnulacion(): void {
    const venta = this.ventaSeleccionada();
    const motivo = this.motivoAnulacion.trim();
    if (!venta) return;
    if (motivo.length < 3) {
      this.errorAnulacion.set('Indica el motivo de la anulación.');
      return;
    }
    this.anulando.set(true);
    this.ventasService.anular(venta.id, motivo).subscribe({
      next: (res) => {
        this.anulando.set(false);
        this.mostrarAnulacion.set(false);
        this.mostrarModalDetalle.set(false);
        this.notify.success(res?.message || `Venta #${venta.id} anulada.`);
        this.cargarHistorial();
      },
      error: (err) => {
        this.anulando.set(false);
        this.notify.error(err?.error?.message || 'No se pudo anular la venta.');
      },
    });
  }

  private estadoDe(venta: Venta): string {
    return String(venta.estado || venta.status || '').toLowerCase();
  }

  private dentroDelRango(fecha: string | null | undefined): boolean {
    if (this.filtroRangoFecha === 'todos') return true;
    if (!fecha) return false;
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return false;
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    if (this.filtroRangoFecha === 'semana') inicio.setDate(inicio.getDate() - 6);
    if (this.filtroRangoFecha === 'mes') inicio.setDate(inicio.getDate() - 29);
    return date >= inicio;
  }

}