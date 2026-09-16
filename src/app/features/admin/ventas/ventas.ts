import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService, Venta, VentaForm } from '../../../core/services/ventas.service';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { ClientesService, Cliente } from '../../../core/services/clientes.service';
import { AuthService, User } from '../../../core/auth/auth';

interface ItemTemp {
    producto_id: number;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
}

@Component({
    selector: 'app-ventas',
    standalone: true,
    imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
    templateUrl: './ventas.html',
    styleUrl: './ventas.css',
})
export class Ventas implements OnInit {
    private svc = inject(VentasService);
    private productosSvc = inject(ProductosService);
    private clientesSvc = inject(ClientesService);
    private authSvc = inject(AuthService);

    currentUser: User | null = null;

    ventas = signal<Venta[]>([]);
    productos = signal<Producto[]>([]);
    clientes = signal<Cliente[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    showModal = signal(false);
    savingModal = signal(false);
    anularConfirmId = signal<number | null>(null);
    detalleVenta = signal<Venta | null>(null);

    // Formulario nueva venta
    items = signal<ItemTemp[]>([]);
    selectedClienteId: number | undefined = undefined;
    descuento = 0;
    observaciones = '';

    // Item en construcción
    selectedProductoId = 0;
    selectedCantidad = 1;

    totalVenta = computed(() =>
        this.items().reduce((sum, i) => sum + i.subtotal, 0)
    );

    ngOnInit(): void {
        this.currentUser = this.authSvc.getUser();
        this.loadProductos();
        this.loadClientes();
        this.loadVentas();
    }

    loadProductos(): void {
        this.productosSvc.getAll().subscribe({
            next: (data) => this.productos.set(data.filter(p => !!p.activo)),
            error: () => {}
        });
    }

    loadClientes(): void {
        this.clientesSvc.getAll().subscribe({
            next: (data) => this.clientes.set(data.filter(c => c.activo)),
            error: () => {}
        });
    }

    loadVentas(): void {
        this.loading.set(true);
        this.error.set(null);
        this.svc.getAll().subscribe({
            next: (data) => { this.ventas.set(data); this.loading.set(false); },
            error: () => { this.error.set('Error al cargar ventas'); this.loading.set(false); }
        });
    }

    openCreate(): void {
        this.items.set([]);
        this.selectedProductoId = 0;
        this.selectedCantidad = 1;
        this.selectedClienteId = undefined;
        this.descuento = 0;
        this.observaciones = '';
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.savingModal.set(false);
    }

    addItem(): void {
        if (!this.selectedProductoId || this.selectedCantidad < 1) return;
        const producto = this.productos().find(p => p.id === this.selectedProductoId);
        if (!producto) return;

        const existing = this.items().findIndex(i => i.producto_id === this.selectedProductoId);
        if (existing >= 0) {
            const updated = [...this.items()];
            updated[existing].cantidad += this.selectedCantidad;
            updated[existing].subtotal = updated[existing].cantidad * updated[existing].precio_unitario;
            this.items.set(updated);
        } else {
            this.items.update(list => [...list, {
                producto_id: producto.id,
                nombre: producto.nombre,
                cantidad: this.selectedCantidad,
                precio_unitario: producto.precio_venta,
                subtotal: producto.precio_venta * this.selectedCantidad,
            }]);
        }
        this.selectedProductoId = 0;
        this.selectedCantidad = 1;
    }

    removeItem(index: number): void {
        this.items.update(list => list.filter((_, i) => i !== index));
    }

    saveVenta(): void {
        if (this.items().length === 0) return;
        this.savingModal.set(true);
        const form: VentaForm = {
            cliente_id: this.selectedClienteId,
            trabajador_id: this.currentUser?.id,
            descuento: this.descuento || undefined,
            observaciones: this.observaciones || undefined,
            items: this.items().map(i => ({
                producto_id: i.producto_id,
                cantidad: i.cantidad,
                precio_unitario: i.precio_unitario,
            })),
        };
        this.svc.create(form).subscribe({
            next: () => { this.closeModal(); this.loadVentas(); },
            error: () => { this.error.set('Error al crear la venta'); this.savingModal.set(false); }
        });
    }

    openDetalle(v: Venta): void {
        this.detalleVenta.set(v);
    }

    closeDetalle(): void {
        this.detalleVenta.set(null);
    }

    confirmAnular(id: number): void {
        this.anularConfirmId.set(id);
    }

    cancelAnular(): void {
        this.anularConfirmId.set(null);
    }

    doAnular(): void {
        const id = this.anularConfirmId()!;
        this.svc.anular(id).subscribe({
            next: () => { this.anularConfirmId.set(null); this.loadVentas(); },
            error: () => { this.error.set('Error al anular la venta'); this.anularConfirmId.set(null); }
        });
    }

    estadoBadgeClass(estado: string): string {
        if (estado === 'anulada') return 'badge-danger';
        if (estado === 'completada') return 'badge-completada';
        return 'badge-success';
    }

    parseMoney(val: string): number {
        return parseFloat(val) || 0;
    }
}
