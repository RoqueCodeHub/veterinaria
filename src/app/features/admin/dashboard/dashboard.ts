import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AuthService, User } from '../../../core/auth/auth';
import { VentasService, Venta } from '../../../core/services/ventas.service';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { ClientesService, Cliente } from '../../../core/services/clientes.service';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, DatePipe],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
    user: User | null = null;
    currentTime = signal(new Date());
    private clockInterval: ReturnType<typeof setInterval> | null = null;

    private authService = inject(AuthService);
    private ventasSvc = inject(VentasService);
    private productosSvc = inject(ProductosService);
    private clientesSvc = inject(ClientesService);

    loading = signal(true);

    ventas = signal<Venta[]>([]);
    productos = signal<Producto[]>([]);
    clientes = signal<Cliente[]>([]);

    totalProductosActivos = computed(() => this.productos().filter(p => !!p.activo).length);
    totalClientesActivos = computed(() => this.clientes().filter(c => c.activo).length);

    ventasHoy = computed(() => {
        const today = new Date().toISOString().slice(0, 10);
        return this.ventas().filter(v => v.fecha?.startsWith(today) && v.estado !== 'anulada');
    });

    totalVentasHoy = computed(() =>
        this.ventasHoy().reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0)
    );

    productosStockBajo = computed(() =>
        this.productos().filter(p => !!p.activo && p.stock_actual <= p.stock_minimo).length
    );

    ultimasVentas = computed(() =>
        [...this.ventas()].reverse().slice(0, 5)
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
                this.ventas.set(ventas);
                this.productos.set(productos);
                this.clientes.set(clientes);
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

    estadoBadgeClass(estado: string): string {
        if (estado === 'anulada') return 'badge-anulada';
        if (estado === 'completada') return 'badge-completada';
        return 'badge-pendiente';
    }
}
