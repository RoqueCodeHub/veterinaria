import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { apiMessage } from '../../../core/api/api-message';
import { DashboardReport } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { ALIVET_COLORS } from '../../../core/theme/alivet-preset';
import { ReportsService } from '../../../core/services/clinic-reports.service';
import { CustomersService } from '../../../core/services/parties.service';
import { soles } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';

interface Dia {
  clave: string;
  label: string;
  ingresos: number;
  ordenes: number;
  cobradas: number;
  pendientes: number;
  anuladas: number;
  variacion: number | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, ChartModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly customers = inject(CustomersService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  readonly reporte = signal<DashboardReport | null>(null);
  readonly ahora = signal(new Date());
  readonly cargando = signal(true);
  consulta = '';

  readonly chartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
      y: { display: false, beginAtZero: true },
      y1: { display: false, beginAtZero: true },
    },
  };

  readonly donutOptions = {
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: { legend: { display: false } },
  };

  private readonly ejemploIngresos = [120, 180, 150, 260, 210, 320, 280];
  private readonly ejemploOrdenes = [4, 6, 5, 8, 6, 11, 9];
  private readonly dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  readonly saludo = computed(() => {
    const hour = this.ahora().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly semana = computed<Dia[]>(() => {
    const rows = this.reporte()?.week_days ?? [];
    return rows.map((row, index) => {
      const fecha = new Date(`${row.date}T12:00:00`);
      const ordenes = row.completed + row.pending;
      const anterior = index > 0 ? rows[index - 1].completed + rows[index - 1].pending : null;
      const variacion = anterior == null || anterior === 0 ? null : ((ordenes - anterior) / anterior) * 100;
      return {
        clave: row.date,
        label: this.dias[fecha.getDay()] ?? row.date.slice(5),
        ingresos: row.total,
        ordenes,
        cobradas: row.completed,
        pendientes: row.pending,
        anuladas: row.voided,
        variacion,
      };
    });
  });

  readonly sinActividad = computed(() => this.semana().every((dia) => dia.ingresos === 0 && dia.ordenes === 0 && dia.anuladas === 0));
  readonly ordenesSemana = computed(() => this.semana().reduce((sum, dia) => sum + dia.cobradas + dia.pendientes + dia.anuladas, 0));
  readonly cobradasSemana = computed(() => this.semana().reduce((sum, dia) => sum + dia.cobradas, 0));
  readonly pendientesSemana = computed(() => this.semana().reduce((sum, dia) => sum + dia.pendientes, 0));
  readonly anuladasSemana = computed(() => this.semana().reduce((sum, dia) => sum + dia.anuladas, 0));

  readonly ingresosChart = computed(() => {
    const dias = this.semana();
    const ejemplo = this.sinActividad();
    return {
      labels: ejemplo && dias.length === 0 ? ['Jue', 'Vie', 'Sáb', 'Dom', 'Lun', 'Mar', 'Mié'] : dias.map((dia) => dia.label),
      datasets: [
        {
          label: 'Ingresos (S/)',
          data: ejemplo ? this.ejemploIngresos : dias.map((dia) => dia.ingresos),
          borderColor: ALIVET_COLORS.accent,
          backgroundColor: 'rgba(8, 120, 80, 0.16)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: ALIVET_COLORS.accent,
        },
        {
          label: 'Órdenes',
          yAxisID: 'y1',
          data: ejemplo ? this.ejemploOrdenes : dias.map((dia) => dia.ordenes),
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          fill: false,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    };
  });

  readonly ordenesDonut = computed(() => {
    const cobradas = this.cobradasSemana();
    const pendientes = this.pendientesSemana();
    const anuladas = this.anuladasSemana();
    const vacio = cobradas + pendientes + anuladas === 0;
    return {
      labels: vacio ? ['Sin órdenes'] : ['Cobradas', 'Pendientes', 'Anuladas'],
      datasets: [{
        data: vacio ? [1] : [cobradas, pendientes, anuladas],
        backgroundColor: vacio ? ['#e8eeea'] : [ALIVET_COLORS.accent, '#f59e0b', ALIVET_COLORS.danger],
        borderWidth: 0,
      }],
    };
  });

  ngOnInit(): void {
    interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.ahora.set(new Date()));
    this.reports.dashboard().subscribe({
      next: (reporte) => {
        this.reporte.set(reporte);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.notify.error(apiMessage(error, 'No se pudo cargar el tablero.'));
      },
    });
  }

  buscar(): void {
    const q = this.consulta.trim();
    if (!q) return;
    if (!this.auth.can('customers.view')) {
      void this.router.navigate(['/admin/productos'], { queryParams: { q } });
      return;
    }
    this.customers.list({ page: 1, perPage: 10, q }).subscribe({
      next: (page) => void this.router.navigate([page.items.length ? '/admin/clientes' : '/admin/productos'], { queryParams: { q } }),
      error: () => void this.router.navigate(['/admin/productos'], { queryParams: { q } }),
    });
  }

  soles(value: string | number | null | undefined): string {
    return soles(value);
  }

  comparacionMes(): string {
    const reporte = this.reporte();
    const row = reporte?.comparison?.month;
    const ventas = reporte?.month?.count ?? 0;
    if (!row || row.previous === 0) return `${ventas} ventas en el mes`;
    const signo = row.percent >= 0 ? '+' : '';
    return `${signo}${row.percent}% vs el mes pasado`;
  }

  comparacionHoy(): string {
    const ordenes = this.reporte()?.today.count ?? 0;
    const row = this.reporte()?.comparison?.today;
    if (!row || row.previous === 0 || row.percent === 0) return `${ordenes} órdenes · igual que ayer`;
    if (Math.abs(row.percent) >= 300) {
      return `${ordenes} órdenes · ${row.percent > 0 ? 'muy por encima de ayer' : 'muy por debajo de ayer'}`;
    }
    const signo = row.percent >= 0 ? '+' : '';
    return `${ordenes} órdenes · ${signo}${row.percent}% frente a ayer`;
  }
}
