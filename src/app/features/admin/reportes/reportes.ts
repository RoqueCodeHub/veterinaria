import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { Select } from 'primeng/select';
import { apiMessage, saveBlob } from '../../../core/api/api-message';
import { AuthService } from '../../../core/auth/auth';
import { ALIVET_COLORS } from '../../../core/theme/alivet-preset';
import { ReportsService } from '../../../core/services/clinic-reports.service';
import { NotifyService } from '../../../core/ui/notify';
import { DashboardReport } from '../../../core/api/models';

type Tab = 'resumen' | 'dia' | 'productos' | 'categoria' | 'cajero' | 'utilidad' | 'lentos' | 'inventario';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [DecimalPipe, FormsModule, ChartModule, Select, RouterLink],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reportes implements OnInit {
  private readonly svc = inject(ReportsService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly tab = signal<Tab>('resumen');
  readonly rangoActivo = signal<'hoy' | 'semana' | 'mes' | null>('mes');
  readonly from = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  readonly to = signal(new Date().toISOString().slice(0, 10));
  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly summary = signal<DashboardReport | null>(null);
  readonly profit = signal<{ sales_total: number; cost: number; refund_total: number; profit: number; sales_count: number } | null>(null);
  readonly inventory = signal<{ units: number; value: number } | null>(null);
  readonly chart = signal<{ labels: string[]; datasets: { label: string; data: number[]; backgroundColor?: string | string[]; borderColor?: string; borderWidth?: number; fill?: boolean; tension?: number; pointRadius?: number; borderRadius?: number; maxBarThickness?: number }[] } | null>(null);
  readonly paymentChart = signal<{ labels: string[]; datasets: { data: number[]; backgroundColor: string[]; borderWidth: number; hoverOffset: number }[] } | null>(null);
  readonly chartType = signal<'line' | 'bar' | 'doughnut'>('line');
  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context: { dataset: { label?: string }; parsed: { y: number } }) => `${context.dataset.label ?? ''}: S/ ${context.parsed.y.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: ALIVET_COLORS.muted, maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: 'rgba(8, 56, 40, 0.08)' }, ticks: { color: ALIVET_COLORS.muted, callback: (value: string | number) => `S/ ${Number(value).toLocaleString('es-PE')}` } },
    },
  };
  readonly countChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context: { parsed: { x: number } }) => `${context.parsed.x.toLocaleString('es-PE')} unidades` } } },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(8, 56, 40, 0.08)' }, ticks: { color: ALIVET_COLORS.muted, precision: 0 } },
      y: { grid: { display: false }, ticks: { color: ALIVET_COLORS.muted } },
    },
  };
  readonly revenueRankChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context: { parsed: { x: number } }) => `S/ ${context.parsed.x.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` } } },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(8, 56, 40, 0.08)' }, ticks: { color: ALIVET_COLORS.muted, callback: (value: string | number) => `S/ ${Number(value).toLocaleString('es-PE')}` } },
      y: { grid: { display: false }, ticks: { color: ALIVET_COLORS.muted } },
    },
  };
  readonly paymentChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context: { label: string; parsed: number }) => `${context.label}: S/ ${context.parsed.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` } } },
  };
  readonly formato = signal<'csv' | 'xlsx' | 'pdf'>('xlsx');
  readonly formatos = [
    { label: 'Excel', value: 'xlsx' },
    { label: 'CSV', value: 'csv' },
    { label: 'PDF', value: 'pdf' },
  ];

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.chart.set(null);
    this.paymentChart.set(null);
    this.summary.set(null);
    this.profit.set(null);
    this.inventory.set(null);
    const from = this.from();
    const to = this.to();
    const done = () => this.loading.set(false);
    const fail = (error: HttpErrorResponse) => { this.loading.set(false); this.notify.error(apiMessage(error, 'No se pudo cargar el reporte.')); };
    if (this.tab() === 'resumen') {
      this.svc.dashboard(from, to).subscribe({
        next: (data) => {
          this.summary.set(data);
          const daily = data.sales_by_day ?? [];
          this.rows.set(daily.map((row) => ({ ...row })));
          this.chartType.set('line');
          this.chart.set({
            labels: daily.map((row) => this.etiquetaFecha(row.date)),
            datasets: [{
              label: 'Ingresos',
              data: daily.map((row) => Number(row.total) || 0),
              borderColor: ALIVET_COLORS.accent,
              backgroundColor: 'rgba(8, 120, 80, 0.14)',
              borderWidth: 3,
              fill: true,
              tension: 0.35,
              pointRadius: 3,
            }],
          });
          const methods = data.by_payment ?? [];
          if (methods.length) {
            this.paymentChart.set({
              labels: methods.map((row) => this.etiquetaMetodo(row.method)),
              datasets: [{
                data: methods.map((row) => Number(row.total) || 0),
                backgroundColor: methods.map((_, index) => this.colorGrafica(index)),
                borderWidth: 0,
                hoverOffset: 5,
              }],
            });
          }
          done();
        },
        error: fail,
      });
      return;
    }
    if (this.tab() === 'dia') {
      this.svc.salesByDay(from, to).subscribe({ next: (rows) => { this.rows.set(rows); this.chartType.set('line'); this.chart.set({ labels: rows.map((row) => this.etiquetaFecha(row.date)), datasets: [{ label: 'Ingresos', data: rows.map((row) => Number(row.total) || 0), borderColor: ALIVET_COLORS.accent, backgroundColor: 'rgba(8, 120, 80, 0.14)', borderWidth: 3, fill: true, tension: 0.35, pointRadius: 3 }] }); done(); }, error: fail });
      return;
    }
    if (this.tab() === 'productos') {
      this.svc.topProducts(from, to).subscribe({ next: (rows) => { this.rows.set(rows); this.chartType.set('bar'); this.chart.set({ labels: rows.map((row) => row.description), datasets: [{ label: 'Unidades', data: rows.map((row) => Number(row.quantity) || 0), backgroundColor: ALIVET_COLORS.sage300, borderRadius: 7, maxBarThickness: 28 }] }); done(); }, error: fail });
      return;
    }
    if (this.tab() === 'categoria') {
      this.svc.byCategory(from, to).subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.chartType.set('doughnut');
          this.chart.set({
            labels: rows.map((row) => row.categoria),
            datasets: [{ label: 'Total', data: rows.map((row) => row.total), backgroundColor: [ALIVET_COLORS.primary, ALIVET_COLORS.accent, ALIVET_COLORS.muted, '#b45309', ALIVET_COLORS.danger] }],
          });
          done();
        },
        error: fail,
      });
      return;
    }
    if (this.tab() === 'cajero') {
      this.svc.byCashier(from, to).subscribe({ next: (rows) => { this.rows.set(rows); this.chartType.set('bar'); this.chart.set({ labels: rows.map((row) => row.cajero), datasets: [{ label: 'Ingresos', data: rows.map((row) => Number(row.total) || 0), backgroundColor: ALIVET_COLORS.sage300, borderRadius: 7, maxBarThickness: 30 }] }); done(); }, error: fail });
      return;
    }
    if (this.tab() === 'utilidad') {
      this.svc.profit(from, to).subscribe({ next: (data) => { this.profit.set(data); this.rows.set([]); done(); }, error: fail });
      return;
    }
    if (this.tab() === 'lentos') {
      this.svc.slowMovers(from, to).subscribe({ next: (rows) => { this.rows.set(rows); done(); }, error: fail });
      return;
    }
    this.svc.inventoryValue().subscribe({ next: (data) => { this.inventory.set(data); this.rows.set([]); done(); }, error: fail });
  }

  rango(clave: 'hoy' | 'semana' | 'mes'): void {
    const hoy = new Date();
    const hasta = hoy.toISOString().slice(0, 10);
    const desde = new Date(hoy);
    if (clave === 'semana') desde.setDate(hoy.getDate() - 6);
    if (clave === 'mes') desde.setDate(1);
    this.from.set(clave === 'hoy' ? hasta : desde.toISOString().slice(0, 10));
    this.to.set(hasta);
    this.rangoActivo.set(clave);
    this.cargar();
  }

  exportar(format: 'csv' | 'xlsx' | 'pdf' = this.formato()): void {
    const report = this.tab() === 'resumen' || this.tab() === 'dia' ? 'sales-by-day' : this.tab() === 'productos' ? 'top-products' : this.tab() === 'categoria' ? 'by-category' : this.tab() === 'cajero' ? 'by-cashier' : this.tab() === 'utilidad' ? 'profit' : this.tab() === 'lentos' ? 'slow-movers' : 'inventory-value';
    this.svc.export(report, format, this.from(), this.to()).subscribe({
      next: (blob) => saveBlob(blob, `${report}.${format}`),
      error: () => this.notify.error('No se pudo exportar el reporte.'),
    });
  }

  ingresosResumen(): number { return (this.summary()?.sales_by_day ?? []).reduce((total, row) => total + (Number(row.total) || 0), 0); }
  ventasResumen(): number { return (this.summary()?.sales_by_day ?? []).reduce((total, row) => total + (Number(row.sales_count) || 0), 0); }
  ticketPromedio(): number { const ventas = this.ventasResumen(); return ventas ? this.ingresosResumen() / ventas : 0; }
  porcentajePago(total: number): number { const ingresos = (this.summary()?.by_payment ?? []).reduce((sum, row) => sum + (Number(row.total) || 0), 0); return ingresos ? total / ingresos * 100 : 0; }
  etiquetaMetodo(method: string): string { return ({ cash: 'Efectivo', efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin', card: 'Tarjeta', tarjeta: 'Tarjeta', transfer: 'Transferencia', transferencia: 'Transferencia' } as Record<string, string>)[method.toLowerCase()] ?? method; }
  colorGrafica(index: number): string { return [ALIVET_COLORS.accent, '#6f93df', '#f2b544', '#b69ae8', ALIVET_COLORS.primary][index % 5]; }
  etiquetaFecha(date: string): string { const value = new Date(`${date}T12:00:00`); return Number.isNaN(value.getTime()) ? date : value.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }); }
  valorNumerico(value: unknown): number { const number = Number(value); return Number.isFinite(number) ? number : 0; }
}
