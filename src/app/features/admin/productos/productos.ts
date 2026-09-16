import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService, Producto, ProductoForm } from '../../../core/services/productos.service';
import { ProveedoresService, Proveedor } from '../../../core/services/proveedores.service';
import { CategoriasService, Categoria } from '../../../core/services/categorias.service';

@Component({
    selector: 'app-productos',
    standalone: true,
    imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
    templateUrl: './productos.html',
    styleUrl: './productos.css',
})
export class Productos implements OnInit {
    private svc = inject(ProductosService);
    private proveedoresSvc = inject(ProveedoresService);
    private categoriasSvc = inject(CategoriasService);

    productos = signal<Producto[]>([]);
    proveedores = signal<Proveedor[]>([]);
    categorias = signal<Categoria[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    showModal = signal(false);
    editingId = signal<number | null>(null);
    deleteConfirmId = signal<number | null>(null);
    savingModal = signal(false);

    activeTab = signal<'todos' | 'stock-bajo' | 'por-vencer'>('todos');

    form: ProductoForm = this.emptyForm();

    ngOnInit(): void {
        this.loadProveedores();
        this.loadCategorias();
        this.load();
    }

    loadProveedores(): void {
        this.proveedoresSvc.getAll().subscribe({
            next: (data) => this.proveedores.set(data),
            error: () => {}
        });
    }

    loadCategorias(): void {
        this.categoriasSvc.getAll().subscribe({
            next: (data) => this.categorias.set(data.filter(c => !!c.activo)),
            error: () => {}
        });
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        const obs = this.activeTab() === 'stock-bajo'
            ? this.svc.getStockBajo()
            : this.activeTab() === 'por-vencer'
                ? this.svc.getPorVencer()
                : this.svc.getAll();

        obs.subscribe({
            next: (data) => { this.productos.set(data); this.loading.set(false); },
            error: () => { this.error.set('Error al cargar productos'); this.loading.set(false); }
        });
    }

    setTab(tab: 'todos' | 'stock-bajo' | 'por-vencer'): void {
        this.activeTab.set(tab);
        this.load();
    }

    openCreate(): void {
        this.form = this.emptyForm();
        this.editingId.set(null);
        this.showModal.set(true);
    }

    openEdit(p: Producto): void {
        this.form = {
            nombre: p.nombre,
            descripcion: p.descripcion ?? '',
            codigo: p.codigo ?? '',
            categoria_id: this.categorias().find(c => c.nombre === p.categoria)?.id,
            proveedor_id: p.proveedor?.id,
            precio_compra: p.precio_compra,
            precio_venta: p.precio_venta,
            stock_actual: p.stock_actual,
            stock_minimo: p.stock_minimo,
            unidad_medida: p.unidad_medida ?? '',
            fecha_vencimiento: p.fecha_vencimiento ? p.fecha_vencimiento.split('T')[0] : '',
            requiere_receta: p.requiere_receta ?? false,
            activo: p.activo ?? true,
        };
        this.editingId.set(p.id);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.savingModal.set(false);
    }

    save(): void {
        this.savingModal.set(true);
        const id = this.editingId();
        const obs = id ? this.svc.update(id, this.form) : this.svc.create(this.form);
        obs.subscribe({
            next: () => { this.closeModal(); this.load(); },
            error: () => { this.error.set('Error al guardar el producto'); this.savingModal.set(false); }
        });
    }

    confirmDelete(id: number): void {
        this.deleteConfirmId.set(id);
    }

    cancelDelete(): void {
        this.deleteConfirmId.set(null);
    }

    doDelete(): void {
        const id = this.deleteConfirmId()!;
        this.svc.delete(id).subscribe({
            next: () => { this.deleteConfirmId.set(null); this.load(); },
            error: () => { this.error.set('Error al eliminar el producto'); this.deleteConfirmId.set(null); }
        });
    }

    isLowStock(p: Producto): boolean {
        return p.stock_bajo;
    }

    private emptyForm(): ProductoForm {
        return {
            nombre: '',
            descripcion: '',
            codigo: '',
            categoria_id: undefined,
            precio_compra: 0,
            precio_venta: 0,
            stock_actual: 0,
            stock_minimo: 0,
            unidad_medida: 'unidad',
            fecha_vencimiento: '',
            requiere_receta: false,
            activo: true,
        };
    }
}
