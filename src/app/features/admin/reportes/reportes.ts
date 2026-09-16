import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { VentasService, Venta } from '../../../core/services/ventas.service';
import { StockService, MovimientoStock } from '../../../core/services/stock.service';

@Component({
    selector: 'app-reportes',
    standalone: true,
    imports: [CommonModule, CurrencyPipe, DatePipe],
    templateUrl: './reportes.html',
    styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
    private productosSvc = inject(ProductosService);
    private ventasSvc = inject(VentasService);
    private stockSvc = inject(StockService);

    loading = signal(true);
    error = signal<string | null>(null);

    stockBajo = signal<Producto[]>([]);
    porVencer = signal<Producto[]>([]);
    ventas = signal<Venta[]>([]);
    movimientos = signal<MovimientoStock[]>([]);

    // Stats
    totalProductos = signal(0);
    totalVentasActivas = signal(0);
    totalMovimientos = signal(0);
    ingresoTotal = signal(0);

    ngOnInit(): void {
        this.loadAll();
    }

    loadAll(): void {
        this.loading.set(true);
        this.error.set(null);
        let completed = 0;
        const done = () => { completed++; if (completed === 5) this.loading.set(false); };

        this.productosSvc.getAll().subscribe({
            next: (data) => { this.totalProductos.set(data.length); done(); },
            error: () => { done(); }
        });

        this.productosSvc.getStockBajo().subscribe({
            next: (data) => { this.stockBajo.set(data); done(); },
            error: () => { done(); }
        });

        this.productosSvc.getPorVencer().subscribe({
            next: (data) => { this.porVencer.set(data); done(); },
            error: () => { done(); }
        });

        this.ventasSvc.getAll().subscribe({
            next: (data) => {
                this.ventas.set(data);
                const activas = data.filter(v => v.estado === 'activa');
                this.totalVentasActivas.set(activas.length);
                this.ingresoTotal.set(activas.reduce((sum, v) => sum + Number(v.total), 0));
                done();
            },
            error: () => { done(); }
        });

        this.stockSvc.getAll().subscribe({
            next: (data) => { this.movimientos.set(data); this.totalMovimientos.set(data.length); done(); },
            error: () => { done(); }
        });
    }

    getRecentVentas(): Venta[] {
        return this.ventas().slice(0, 5);
    }

    getRecentMovimientos(): MovimientoStock[] {
        return this.movimientos().slice(0, 5);
    }
}
