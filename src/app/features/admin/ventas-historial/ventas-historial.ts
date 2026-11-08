import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService, Venta } from '../../../core/services/ventas.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-ventas-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './ventas-historial.html',
  styleUrl: './ventas-historial.css',
})
export class VentasHistorialComponent implements OnInit {
  private ventasService = inject(VentasService);

  // Estados principales
  ventas = signal<Venta[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  // Filtros. Son campos normales para que ngModel vuelva a pintar la tabla.
  busqueda = '';
  filtroRangoFecha: 'hoy' | 'semana' | 'mes' | 'todos' = 'todos';
  filtroEstado: 'todos' | 'completada' | 'anulada' | 'pendiente' = 'todos';
  readonly pageSize = 10;
  page = signal(1);

  // Modales
  ventaSeleccionada = signal<Venta | null>(null);
  mostrarModalDetalle = signal(false);
  mostrarModalTicket = signal(false);

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

  totalPages(): number {
    return Math.max(1, Math.ceil(this.ventasFiltradas().length / this.pageSize));
  }

  currentPage(): number {
    return Math.min(this.page(), this.totalPages());
  }

  ventasVisibles(): Venta[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.ventasFiltradas().slice(start, start + this.pageSize);
  }

  rangoPaginacion(): string {
    const total = this.ventasFiltradas().length;
    if (!total) return '0 de 0';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return `${start}–${end} de ${total}`;
  }

  reiniciarPagina(): void {
    this.page.set(1);
  }

  goToPage(pagina: number): void {
    this.page.set(Math.min(Math.max(1, pagina), this.totalPages()));
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

  abrirTicketReimpresion(venta: Venta): void {
    this.ventaSeleccionada.set(venta);
    this.mostrarModalTicket.set(true);
  }

  cerrarModalTicket(): void {
    this.mostrarModalTicket.set(false);
  }

  imprimirComprobante(): void {
    window.print();
  }

  enviarWhatsApp(venta: Venta): void {
    const clienteNombre = venta.cliente?.nombre_completo || 'Cliente';
    const numeroTel = prompt('Ingresa el número de WhatsApp (9 dígitos):', '987654321');
    if (!numeroTel) return;

    const numLimpio = numeroTel.replace(/\D/g, '');
    const phone = numLimpio.length === 9 ? `51${numLimpio}` : numLimpio;
    const total = (parseFloat(String(venta.total)) || 0).toFixed(2);
    const urlPdf = `${environment.apiUrl}/v1/invoices/${venta.id}/pdf`;

    const mensaje = `Hola *${clienteNombre}* 👋, adjuntamos tu comprobante de compra en *Veterinaria Ali-Vet* 🐾.\n\n` +
      `📄 Comprobante: *#${venta.id}*\n` +
      `💰 Total: *S/ ${total}*\n\n` +
      `Puedes descargarlo aquí: ${urlPdf}\n\n` +
      `¡Gracias por tu preferencia!`;

    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(mensaje)}`, '_blank');
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

  anularComprobante(venta: Venta): void {
    const motivo = prompt(`Ingresa el motivo de anulación para la venta #${venta.id}:`);
    if (!motivo) return;

    if (confirm(`¿Estás seguro de emitir Nota de Crédito para anular la venta #${venta.id}?`)) {
      this.ventasService.anular(venta.id, motivo).subscribe({
        next: (res) => {
          this.aviso.set(res?.message || `Venta #${venta.id} anulada correctamente.`);
          this.cargarHistorial();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Error al intentar anular la venta.');
        }
      });
    }
  }
}