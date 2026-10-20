import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService, User } from '../../../core/auth/auth';
import { VentasService, Venta } from '../../../core/services/ventas.service';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { ClientesService, Cliente } from '../../../core/services/clientes.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, RouterModule],
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

  ventas = signal<Venta[]>([]);
  productos = signal<Producto[]>([]);
  clientes = signal<Cliente[]>([]);

  // Métricas Calculadas
  totalProductosActivos = computed(() => this.productos().filter(p => p.activo !== false).length);
  totalClientesActivos = computed(() => this.clientes().filter(c => c.activo !== false).length);

  ventasHoy = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.ventas().filter(v => (v.fecha || '').startsWith(today) && (v.estado || '').toLowerCase() !== 'anulada');
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

  estadoBadgeClass(estado: string): string {
    const st = (estado || '').toLowerCase();
    if (st === 'anulada') return 'badge-anulada';
    if (st === 'completada' || st === 'pagada') return 'badge-completada';
    return 'badge-pendiente';
  }
}