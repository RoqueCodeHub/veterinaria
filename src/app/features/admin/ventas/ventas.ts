import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService, Venta, VentaForm } from '../../../core/services/ventas.service';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { ClientesService, Cliente } from '../../../core/services/clientes.service';
import { CategoriasService, Categoria } from '../../../core/services/categorias.service';

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
    private categoriasSvc = inject(CategoriasService);

    ventas = signal<Venta[]>([]);
    productos = signal<Producto[]>([]);
    clientes = signal<Cliente[]>([]);
    categorias = signal<Categoria[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    cajaError = signal<string | null>(null);
    aviso = signal<string | null>(null);
    saving = signal(false);
    anularConfirmId = signal<number | null>(null);
    detalleVenta = signal<Venta | null>(null);

    items = signal<ItemTemp[]>([]);
    busqueda = signal('');
    categoriaFiltro = signal('todas');
    selectedClienteId = signal<number | null>(null);
    metodoPago = 'efectivo';
    montoRecibido: number | null = null;
    descuento = 0;
    observaciones = '';

    readonly metodos = [
        { id: 'efectivo', label: 'Efectivo' },
        { id: 'yape', label: 'Yape' },
        { id: 'plin', label: 'Plin' },
        { id: 'tarjeta', label: 'Tarjeta' },
        { id: 'transferencia', label: 'Transferencia' },
    ];

    totalVenta = computed(() => this.items().reduce((sum, i) => sum + i.subtotal, 0));
    cantidadItems = computed(() => this.items().reduce((sum, i) => sum + i.cantidad, 0));

    filtros = computed(() =>
        this.categorias()
            .filter(c => this.esPrincipal(c))
            .map(c => c.nombre)
            .sort((a, b) => a.localeCompare(b, 'es'))
    );

    productosVisibles = computed(() => {
        const q = this.busqueda().trim().toLowerCase();
        const filtro = this.categoriaFiltro();
        return this.productos().filter(p => {
            if (filtro !== 'todas' && this.grupoDe(p) !== filtro) return false;
            if (!q) return true;
            return p.nombre.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q);
        });
    });

    clienteActual = computed(() =>
        this.clientes().find(c => c.id === this.selectedClienteId()) ?? null
    );

    ngOnInit(): void {
        this.loadProductos();
        this.loadClientes();
        this.loadCategorias();
        this.loadVentas();
    }

    loadProductos(): void {
        this.productosSvc.getAll().subscribe({
            next: (data) => this.productos.set(data.filter(p => !!p.activo)),
            error: () => this.error.set('Error al cargar productos'),
        });
    }

    loadClientes(): void {
        this.clientesSvc.getAll().subscribe({
            next: (data) => this.clientes.set(data.filter(c => c.activo)),
            error: () => this.cajaError.set('No se pudieron cargar los clientes'),
        });
    }

    loadCategorias(): void {
        this.categoriasSvc.getAll().subscribe({
            next: (data) => this.categorias.set(data),
            error: () => {},
        });
    }

    loadVentas(): void {
        this.loading.set(true);
        this.error.set(null);
        this.svc.getAll().subscribe({
            next: (data) => { this.ventas.set(data); this.loading.set(false); },
            error: () => { this.error.set('Error al cargar ventas'); this.loading.set(false); },
        });
    }

    grupoDe(p: Producto): string {
        const porId = new Map(this.categorias().map(c => [c.id, c]));
        let actual = p.categoria_id ? porId.get(p.categoria_id) : undefined;
        if (!actual && p.categoria) {
            actual = this.categorias().find(c => c.nombre === p.categoria);
        }
        if (!actual) return p.categoria || 'Sin categoría';
        while (actual.parent_id) {
            const padre = porId.get(actual.parent_id);
            if (!padre) break;
            actual = padre;
        }
        return actual.nombre;
    }

    private esPrincipal(c: Categoria): boolean {
        const activa = c.activo !== false && c.activo !== 0;
        const esRaiz = c.parent_id == null || c.parent_id === 0;
        const esPrueba = /[0-9a-f]{8,}/i.test(c.nombre);
        return activa && esRaiz && !esPrueba;
    }

    stockDe(p: Producto): number {
        return Math.max(0, Math.floor(Number(p.stock_disponible ?? p.stock_actual) || 0));
    }

    precioDe(p: Producto): number {
        return Number(p.precio_venta) || 0;
    }

    enCarrito(id: number): number {
        return this.items().find(i => i.producto_id === id)?.cantidad ?? 0;
    }

    productoDe(id: number): Producto {
        const encontrado = this.productos().find(p => p.id === id);
        if (encontrado) return encontrado;
        const item = this.items().find(i => i.producto_id === id);
        return {
            id,
            nombre: item?.nombre ?? '',
            precio_compra: 0,
            precio_venta: item?.precio_unitario ?? 0,
            stock_actual: item?.cantidad ?? 0,
            stock_disponible: item?.cantidad ?? 0,
            stock_minimo: 0,
            stock_bajo: false,
        };
    }

    setFiltro(nombre: string): void {
        this.categoriaFiltro.set(nombre);
    }

    agregar(p: Producto): void {
        this.cambiarCantidad(p, this.enCarrito(p.id) + 1);
    }

    cambiarCantidad(p: Producto, cantidad: number): void {
        const precio = this.precioDe(p);
        const stock = this.stockDe(p);
        this.cajaError.set(null);
        if (cantidad < 1) {
            this.items.update(list => list.filter(i => i.producto_id !== p.id));
            return;
        }
        if (precio <= 0) {
            this.cajaError.set(`"${p.nombre}" no tiene precio de venta.`);
            return;
        }
        if (cantidad > stock) {
            this.cajaError.set(`Stock insuficiente para "${p.nombre}". Disponible: ${stock}.`);
            return;
        }
        const actual = this.items();
        const idx = actual.findIndex(i => i.producto_id === p.id);
        if (idx >= 0) {
            const updated = [...actual];
            updated[idx] = { ...updated[idx], cantidad, subtotal: cantidad * precio };
            this.items.set(updated);
        } else {
            this.items.set([...actual, {
                producto_id: p.id,
                nombre: p.nombre,
                cantidad,
                precio_unitario: precio,
                subtotal: precio * cantidad,
            }]);
        }
    }

    quitar(id: number): void {
        this.items.update(list => list.filter(i => i.producto_id !== id));
    }

    totalAPagar(): number {
        return Math.max(0, this.totalVenta() - (Number(this.descuento) || 0));
    }

    montoCobro(): number {
        const ingresado = Number(this.montoRecibido);
        return ingresado > 0 ? ingresado : this.totalAPagar();
    }

    vuelto(): number {
        if (this.metodoPago !== 'efectivo') return 0;
        return Math.max(0, this.montoCobro() - this.totalAPagar());
    }

    registrar(): void {
        this.cajaError.set(null);
        this.aviso.set(null);
        if (!this.selectedClienteId()) {
            this.cajaError.set('Selecciona un cliente para identificar la venta en caja.');
            return;
        }
        if (this.items().length === 0) {
            this.cajaError.set('Agrega al menos un producto al carrito.');
            return;
        }

        const form: VentaForm = {
            cliente_id: this.selectedClienteId()!,
            descuento: Number(this.descuento) || undefined,
            observaciones: this.observaciones.trim() || undefined,
            items: this.items().map(i => ({
                producto_id: i.producto_id,
                cantidad: i.cantidad,
                precio_unitario: i.precio_unitario,
            })),
        };

        this.saving.set(true);
        this.svc.create(form).subscribe({
            next: (venta) => {
                const nombre = venta?.cliente?.nombre_completo || this.clienteActual()?.nombre_completo || 'cliente';
                this.aviso.set(`Venta #${venta?.id ?? ''} registrada a nombre de ${nombre}. Quedó pendiente en Caja.`);
                this.items.set([]);
                this.descuento = 0;
                this.montoRecibido = null;
                this.observaciones = '';
                this.saving.set(false);
                this.loadVentas();
                this.loadProductos();
            },
            error: (err) => {
                this.cajaError.set(err?.error?.message || 'Error al registrar la venta');
                this.saving.set(false);
            },
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
            next: () => {
                this.anularConfirmId.set(null);
                this.loadVentas();
                this.loadProductos();
            },
            error: () => { this.error.set('Error al anular la venta'); this.anularConfirmId.set(null); },
        });
    }

    estadoBadgeClass(estado: string): string {
        if (estado === 'anulada') return 'badge-danger';
        if (estado === 'completada') return 'badge-completada';
        return 'badge-success';
    }

    parseMoney(val: string | number | null | undefined): number {
        return parseFloat(String(val ?? 0)) || 0;
    }

    etiquetaMetodo(metodo?: string | null): string {
        return this.metodos.find(m => m.id === metodo)?.label ?? (metodo || '—');
    }
}
