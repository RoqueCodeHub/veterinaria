import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService, MovimientoStock, MovimientoForm } from '../../../core/services/stock.service';
import { ProductosService, Producto } from '../../../core/services/productos.service';

@Component({
    selector: 'app-stock',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe],
    templateUrl: './stock.html',
    styleUrl: './stock.css',
})
export class Stock implements OnInit {
    private svc = inject(StockService);
    private productosSvc = inject(ProductosService);

    movimientos = signal<MovimientoStock[]>([]);
    productos = signal<Producto[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    showModal = signal(false);
    savingModal = signal(false);

    filterProductoId = signal<number | null>(null);

    form: MovimientoForm = this.emptyForm();

    ngOnInit(): void {
        this.loadProductos();
        this.loadMovimientos();
    }

    loadProductos(): void {
        this.productosSvc.getAll().subscribe({
            next: (data) => this.productos.set(data),
            error: () => {}
        });
    }

    loadMovimientos(): void {
        this.loading.set(true);
        this.error.set(null);
        const filterId = this.filterProductoId();
        const obs = filterId
            ? this.svc.getByProducto(filterId)
            : this.svc.getAll();

        obs.subscribe({
            next: (data) => { this.movimientos.set(data); this.loading.set(false); },
            error: () => { this.error.set('Error al cargar movimientos de stock'); this.loading.set(false); }
        });
    }

    applyFilter(event: Event): void {
        const val = (event.target as HTMLSelectElement).value;
        this.filterProductoId.set(val ? Number(val) : null);
        this.loadMovimientos();
    }

    openCreate(): void {
        this.form = this.emptyForm();
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.savingModal.set(false);
    }

    save(): void {
        this.savingModal.set(true);
        this.svc.create(this.form).subscribe({
            next: () => { this.closeModal(); this.loadMovimientos(); },
            error: () => { this.error.set('Error al registrar movimiento'); this.savingModal.set(false); }
        });
    }

    getProductoNombre(id: number): string {
        return this.productos().find(p => p.id === id)?.nombre ?? `Producto #${id}`;
    }

    private emptyForm(): MovimientoForm {
        return {
            producto_id: 0,
            tipo: 'entrada',
            cantidad: 1,
            motivo: '',
        };
    }
}
