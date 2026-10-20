import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
    stockRevisar = signal(0);
    deleteConfirmId = signal<number | null>(null);
    savingModal = signal(false);

    activeTab = signal<'todos' | 'stock-bajo' | 'por-vencer'>('todos');
    page = signal(1);
    readonly pageSize = 10;

    totalPages = computed(() => Math.max(1, Math.ceil(this.productos().length / this.pageSize)));
    currentPage = computed(() => Math.min(this.page(), this.totalPages()));
    visibleProductos = computed(() => {
        const start = (this.currentPage() - 1) * this.pageSize;
        return this.productos().slice(start, start + this.pageSize);
    });
    pageNumbers = computed(() => {
        const total = this.totalPages();
        const current = this.currentPage();
        const windowSize = 5;
        let start = Math.max(1, current - Math.floor(windowSize / 2));
        let end = Math.min(total, start + windowSize - 1);
        start = Math.max(1, end - windowSize + 1);
        const pages: number[] = [];
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    });
    rango = computed(() => {
        const total = this.productos().length;
        if (!total) return '';
        const start = (this.currentPage() - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage() * this.pageSize, total);
        return `${start}–${end} de ${total}`;
    });

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
            next: (data) => {
                this.productos.set(data);
                const pages = Math.max(1, Math.ceil(data.length / this.pageSize));
                if (this.page() > pages) this.page.set(pages);
                this.loading.set(false);
            },
            error: () => { this.error.set('Error al cargar productos'); this.loading.set(false); }
        });
    }

    setTab(tab: 'todos' | 'stock-bajo' | 'por-vencer'): void {
        this.activeTab.set(tab);
        this.page.set(1);
        this.load();
    }

    goToPage(page: number): void {
        const next = Math.min(Math.max(1, page), this.totalPages());
        this.page.set(next);
    }

    openCreate(): void {
        this.form = this.emptyForm();
        this.editingId.set(null);
        this.stockRevisar.set(0);
        this.error.set(null);
        this.showModal.set(true);
    }

    openEdit(p: Producto): void {
        this.form = {
            nombre: p.nombre,
            descripcion: p.descripcion ?? '',
            codigo: p.codigo ?? '',
            categoria_id: p.categoria_id ?? this.categorias().find(c => c.nombre === p.categoria)?.id,
            proveedor_id: p.proveedor?.id,
            precio_compra: Number(p.precio_compra) || 0,
            precio_venta: Number(p.precio_venta) || 0,
            stock_actual: Number(p.stock_disponible ?? p.stock_actual) || 0,
            stock_minimo: Number(p.stock_minimo) || 0,
            unidad_medida: p.unidad_medida ?? '',
            fecha_vencimiento: p.fecha_vencimiento ? p.fecha_vencimiento.split('T')[0] : '',
            requiere_receta: p.requiere_receta ?? false,
            activo: p.activo ?? true,
        };
        this.stockRevisar.set(Number(p.stock_disponible ?? p.stock_actual) || 0);
        this.editingId.set(p.id);
        this.error.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.savingModal.set(false);
    }

    save(): void {
        this.savingModal.set(true);
        this.error.set(null);
        const payload: ProductoForm = {
            ...this.form,
            precio_compra: Number(this.form.precio_compra) || 0,
            precio_venta: Number(this.form.precio_venta) || 0,
            stock_minimo: Number(this.form.stock_minimo) || 0,
            codigo: this.form.codigo?.trim() || undefined,
            descripcion: this.form.descripcion?.trim() || undefined,
            unidad_medida: this.form.unidad_medida?.trim() || undefined,
            fecha_vencimiento: this.form.fecha_vencimiento || undefined,
            categoria_id: this.form.categoria_id || undefined,
            proveedor_id: this.form.proveedor_id || undefined,
        };
        const id = this.editingId();
        if (id) {
            delete payload.stock_actual;
        } else {
            payload.stock_actual = Number(this.form.stock_actual) || 0;
        }
        const obs = id ? this.svc.update(id, payload) : this.svc.create(payload);
        obs.subscribe({
            next: () => { this.closeModal(); this.load(); },
            error: (err) => {
                const apiErrors = err?.error?.errors;
                const detail = apiErrors
                    ? Object.values(apiErrors).flat().join(' ')
                    : err?.error?.message;
                this.error.set(detail || 'Error al guardar el producto');
                this.savingModal.set(false);
            }
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
