import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { Select } from 'primeng/select';
import { apiMessage, saveBlob } from '../../../core/api/api-message';
import { AuthService } from '../../../core/auth/auth';
import { ALIVET_COLORS } from '../../../core/theme/alivet-preset';
import { ReportsService } from '../../../core/services/clinic-reports.service';
import { NotifyService } from '../../../core/ui/notify';

type Tab = 'dia' | 'productos' | 'categoria' | 'cajero' | 'utilidad' | 'lentos' | 'inventario';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [DecimalPipe, FormsModule, ChartModule, Select],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reportes implements OnInit {
  private readonly svc = inject(ReportsService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly tab = signal<Tab>('dia');
  readonly rangoActivo = signal<'hoy' | 'semana' | 'mes' | null>('mes');
  readonly from = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  readonly to = signal(new Date().toISOString().slice(0, 10));
  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly profit = signal<{ sales_total: number; cost: number; refund_total: number; profit: number; sales_count: number } | null>(null);
  readonly inventory = signal<{ units: number; value: number } | null>(null);
  readonly chart = signal<{ labels: string[]; datasets: { label: string; data: number[]; backgroundColor?: string[] }[] } | null>(null);
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
    this.profit.set(null);
    this.inventory.set(null);
    const from = this.from();
    const to = this.to();
    const done = () => this.loading.set(false);
    const fail = (error: HttpErrorResponse) => { this.loading.set(false); this.notify.error(apiMessage(error, 'No se pudo cargar el reporte.')); };
    if (this.tab() === 'dia') {
      this.svc.salesByDay(from, to).subscribe({ next: (rows) => { this.rows.set(rows); this.chart.set({ labels: rows.map((row) => row.date), datasets: [{ label: 'Total', data: rows.map((row) => row.total) }] }); done(); }, error: fail });
      return;
    }
    if (this.tab() === 'productos') {
      this.svc.topProducts(from, to).subscribe({ next: (rows) => { this.rows.set(rows); this.chart.set(null); done(); }, error: fail });
      return;
    }
    if (this.tab() === 'categoria') {
      this.svc.byCategory(from, to).subscribe({
        next: (rows) => {
          this.rows.set(rows);
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
      this.svc.byCashier(from, to).subscribe({ next: (rows) => { this.rows.set(rows); done(); }, error: fail });
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
    const report = this.tab() === 'dia' ? 'sales-by-day' : this.tab() === 'productos' ? 'top-products' : this.tab() === 'categoria' ? 'by-category' : this.tab() === 'cajero' ? 'by-cashier' : this.tab() === 'utilidad' ? 'profit' : this.tab() === 'lentos' ? 'slow-movers' : 'inventory-value';
    this.svc.export(report, format, this.from(), this.to()).subscribe({
      next: (blob) => saveBlob(blob, `${report}.${format}`),
      error: () => this.notify.error('No se pudo exportar el reporte.'),
    });
  }
}
