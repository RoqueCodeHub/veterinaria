import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { AuthService, User } from '../../../core/auth/auth';
import { VentasService, Venta } from '../../../core/services/ventas.service';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { ClientesService, Cliente } from '../../../core/services/clientes.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, FormsModule, RouterModule, ChartModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private ventasSvc = inject(VentasService);
  private productosSvc = inject(ProductosService);
  private clientesSvc = inject(ClientesService);
  private router = inject(Router);

  user: User | null = null;
  currentTime = signal(new Date());
  private clockInterval: ReturnType<typeof setInterval> | null = null;

  loading = signal(true);
  busqueda = signal('');

  ventas = signal<Venta[]>([]);
  productos = signal<Producto[]>([]);
  clientes = signal<Cliente[]>([]);

  private readonly dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Métricas Calculadas
  totalProductosActivos = computed(() => this.productos().filter(p => p.activo !== false).length);
  totalClientesActivos = computed(() => this.clientes().filter(c => c.activo !== false).length);

  ventasHoy = computed(() => {
    const today = this.clave(new Date());
    return this.ventas().filter(v => this.claveVenta(v) === today && this.estadoDe(v) !== 'anulada');
  });

  totalVentasHoy = computed(() =>
    this.ventasHoy().reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0)
  );

  productosStockBajoList = computed(() => {
    return this.productos().filter(p => {
      const stock = Number(p.stock_disponible ?? p.stock_actual) || 0;
      const min = Number(p.stock_minimo) || 5;
      return p.activo !== false && stock <= min;
    }).slice(0, 5); // Top 5 críticos
  });

  productosStockBajoCount = computed(() => {
    return this.productos().filter(p => {
      const stock = Number(p.stock_disponible ?? p.stock_actual) || 0;
      const min = Number(p.stock_minimo) || 5;
      return p.activo !== false && stock <= min;
    }).length;
  });

  ultimasVentas = computed(() =>
    [...this.ventas()].reverse().slice(0, 6)
  );

  semana = computed(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const puntos: {
      clave: string;
      label: string;
      ordenes: number;
      ingresos: number;
      cobradas: number;
      pendientes: number;
      anuladas: number;
      todas: number;
    }[] = [];
    const fin = this.finGrafico(hoy);
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(fin);
      fecha.setDate(fin.getDate() - i);
      const clave = this.clave(fecha);
      const delDia = this.ventas().filter(v => this.claveVenta(v) === clave);
      const vigentes = delDia.filter(v => this.estadoDe(v) !== 'anulada');
      puntos.push({
        clave,
        label: this.dias[fecha.getDay()],
        ordenes: vigentes.length,
        ingresos: vigentes.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0),
        cobradas: delDia.filter(v => this.estadoDe(v) === 'completada').length,
        pendientes: delDia.filter(v => this.estadoDe(v) === 'pendiente').length,
        anuladas: delDia.filter(v => this.estadoDe(v) === 'anulada').length,
        todas: delDia.length,
      });
    }
    return puntos.map((punto, index) => {
      const anterior = index > 0 ? puntos[index - 1].ordenes : null;
      const variacion = anterior == null || anterior === 0
        ? null
        : ((punto.ordenes - anterior) / anterior) * 100;
      return { ...punto, variacion };
    });
  });

  rangoEtiqueta = computed(() => {
    const dias = this.semana();
    const primero = dias[0]?.clave;
    const ultimo = dias.at(-1)?.clave;
    if (!primero || !ultimo || ultimo === this.clave(new Date())) return '7 días';
    const corto = (clave: string) => {
      const [, mes, dia] = clave.split('-');
      return `${Number(dia)}/${Number(mes)}`;
    };
    return `${corto(primero)} – ${corto(ultimo)}`;
  });

  ingresoAyer = computed(() => this.semana().at(-2)?.ingresos ?? 0);

  variacionHoy = computed(() => {
    const ayer = this.ingresoAyer();
    if (!ayer) return null;
    return ((this.totalVentasHoy() - ayer) / ayer) * 100;
  });

  private readonly ejemploIngresos = [120, 180, 150, 260, 210, 320, 280];
  private readonly ejemploOrdenes = [4, 6, 5, 8, 6, 11, 9];

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

  sinActividad = computed(() => this.semana().every((d) => d.ingresos === 0 && d.ordenes === 0));

  ingresosChart = computed(() => {
    const dias = this.semana();
    const ejemplo = this.sinActividad();
    return {
      labels: dias.map((d) => d.label),
      datasets: [
        {
          label: 'Ingresos (S/)',
          data: ejemplo ? this.ejemploIngresos : dias.map((d) => d.ingresos),
          borderColor: '#0f9f6e',
          backgroundColor: 'rgba(15, 159, 110, 0.16)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#0f9f6e',
        },
        {
          label: 'Órdenes',
          yAxisID: 'y1',
          data: ejemplo ? this.ejemploOrdenes : dias.map((d) => d.ordenes),
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

  ordenesDonut = computed(() => {
    const cobradas = this.cobradasSemana();
    const pendientes = this.pendientesSemana();
    const anuladas = this.anuladasSemana();
    const vacio = cobradas + pendientes + anuladas === 0;
    return {
      labels: vacio ? ['Sin órdenes'] : ['Cobradas', 'Pendientes', 'Anuladas'],
      datasets: [
        {
          data: vacio ? [1] : [cobradas, pendientes, anuladas],
          backgroundColor: vacio ? ['#e8eeea'] : ['#0f9f6e', '#f59e0b', '#ef4444'],
          borderWidth: 0,
        },
      ],
    };
  });

  ordenesSemana = computed(() => this.semana().reduce((sum, d) => sum + d.todas, 0));
  cobradasSemana = computed(() => this.semana().reduce((sum, d) => sum + d.cobradas, 0));
  pendientesSemana = computed(() => this.semana().reduce((sum, d) => sum + d.pendientes, 0));
  anuladasSemana = computed(() => this.semana().reduce((sum, d) => sum + d.anuladas, 0));

  maxOrdenes = computed(() => Math.max(...this.semana().map(d => d.ordenes), 1));

  trazoIngresos = computed(() => this.trazo(this.semana().map(d => d.ingresos)));
  areaIngresos = computed(() => this.area(this.semana().map(d => d.ingresos)));
  trazoOrdenes = computed(() => this.trazo(this.semana().map(d => d.ordenes)));
  trazoCobradas = computed(() => this.trazo(this.semana().map(d => d.cobradas)));
  trazoAnuladas = computed(() => this.trazo(this.semana().map(d => d.anuladas)));
  trazoTodas = computed(() => this.trazo(this.semana().map(d => d.todas)));
  areaCobradas = computed(() => this.area(this.semana().map(d => d.cobradas)));
  areaAnuladas = computed(() => this.area(this.semana().map(d => d.anuladas)));
  areaTodas = computed(() => this.area(this.semana().map(d => d.todas)));

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.clockInterval = setInterval(() => this.currentTime.set(new Date()), 1000);
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    forkJoin({
      ventas: this.ventasSvc.getAll(),
      productos: this.productosSvc.getAll(),
      clientes: this.clientesSvc.getAll(),
    }).subscribe({
      next: ({ ventas, productos, clientes }) => {
        this.ventas.set(ventas || []);
        this.productos.set(productos || []);
        this.clientes.set(clientes || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  navegarA(ruta: string): void {
    this.router.navigate([ruta]);
  }

  buscar(event: Event): void {
    event.preventDefault();
    const q = this.busqueda().trim();
    if (!q) return;
    const needle = q.toLowerCase();
    const esCliente = this.clientes().some((cliente) =>
      `${cliente.nombre_completo} ${cliente.nombres} ${cliente.apellidos} ${cliente.telefono ?? ''} ${cliente.numero_documento ?? ''}`
        .toLowerCase()
        .includes(needle)
    );
    this.router.navigate([esCliente ? '/admin/clientes' : '/admin/productos'], { queryParams: { q } });
  }

  comparacionHoy(): string {
    const ordenes = this.ventasHoy().length;
    const variacion = this.variacionHoy();
    if (variacion == null) return `${ordenes} órdenes · igual que ayer`;
    const signo = variacion >= 0 ? '+' : '';
    return `${ordenes} órdenes · ${signo}${variacion.toFixed(0)}% frente a ayer`;
  }

  barra(ordenes: number): number {
    return Math.round((ordenes / this.maxOrdenes()) * 100);
  }

  private finGrafico(hoy: Date): Date {
    const claves = this.ventas()
      .map(v => this.claveVenta(v))
      .filter(clave => /^\d{4}-\d{2}-\d{2}$/.test(clave))
      .sort();
    const ultima = claves.at(-1);
    if (!ultima) return hoy;
    const [anio, mes, dia] = ultima.split('-').map(Number);
    const ultimaFecha = new Date(anio, mes - 1, dia);
    const limite = new Date(hoy);
    limite.setDate(hoy.getDate() - 6);
    return ultimaFecha < limite ? ultimaFecha : hoy;
  }

  private clave(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  private claveVenta(venta: Venta): string {
    return (venta.fecha || venta.created_at || '').slice(0, 10);
  }

  private estadoDe(venta: Venta): 'completada' | 'pendiente' | 'anulada' | 'otra' {
    const estado = (venta.estado || venta.status || '').toLowerCase();
    if (estado === 'anulada' || estado === 'voided' || estado === 'cancelada') return 'anulada';
    if (estado === 'completada' || estado === 'completed' || estado === 'pagada' || estado === 'activa') return 'completada';
    if (estado === 'pendiente' || estado === 'pending') return 'pendiente';
    return 'otra';
  }

  private puntos(valores: number[], ancho = 320, alto = 120): { x: number; y: number }[] {
    if (!valores.length) return [];
    const max = Math.max(...valores, 1);
    const paso = valores.length === 1 ? 0 : ancho / (valores.length - 1);
    return valores.map((valor, i) => ({
      x: i * paso,
      y: alto - (valor / max) * (alto - 18) - 8,
    }));
  }

  private trazo(valores: number[], ancho = 320, alto = 120): string {
    const pts = this.puntos(valores, ancho, alto);
    if (!pts.length) return '';
    const n = (v: number) => v.toFixed(1);
    if (pts.length === 1) return `M${n(pts[0].x)} ${n(pts[0].y)}`;
    let d = `M${n(pts[0].x)} ${n(pts[0].y)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = Math.min(alto - 8, Math.max(6, p1.y + (p2.y - p0.y) / 6));
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = Math.min(alto - 8, Math.max(6, p2.y - (p3.y - p1.y) / 6));
      d += ` C${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(p2.x)} ${n(p2.y)}`;
    }
    return d;
  }

  private area(valores: number[], ancho = 320, alto = 120): string {
    const linea = this.trazo(valores, ancho, alto);
    if (!linea) return '';
    return `${linea} L${ancho} ${alto} L0 ${alto} Z`;
  }

  estadoBadgeClass(estado: string): string {
    const st = this.estadoDe({ estado } as Venta);
    if (st === 'anulada') return 'badge-anulada';
    if (st === 'completada') return 'badge-completada';
    return 'badge-pendiente';
  }

  etiquetaEstado(estado: string): string {
    const st = this.estadoDe({ estado } as Venta);
    if (st === 'anulada') return 'anulada';
    if (st === 'completada') return 'cobrada';
    if (st === 'pendiente') return 'pendiente';
    return estado || '—';
  }
}