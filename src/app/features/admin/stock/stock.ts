import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService, MovimientoStock, MovimientoForm } from '../../../core/services/stock.service';
import { ProductosService, Producto } from '../../../core/services/productos.service';

interface FilaInventario {
  key: string;
  producto_id: number;
  variante_id: number | null;
  codigo: string;
  nombre: string;
  presentacion: string;
  categoria: string;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
}

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './stock.html',
  styleUrl: './stock.css',
})
export class Stock implements OnInit {
  private stockSvc = inject(StockService);
  private productosSvc = inject(ProductosService);

  // Control de Pestañas (Se cambia pestañaActiva por tabActiva)
  tabActiva = signal<'inventario' | 'kardex'>('inventario');

  // Estados de Datos
  movimientos = signal<MovimientoStock[]>([]);
  productos = signal<Producto[]>([]);
  loading = signal(false);
  savingModal = signal(false);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  // Filtros en Signals
  busquedaTexto = signal('');
  filterProductoId = signal<number | null>(null);
  filterTipo = signal<'todos' | 'entrada' | 'salida' | 'ajuste'>('todos');
  readonly pageSize = 10;
  page = signal(1);

  // Modal
  showModal = signal(false);
  form: MovimientoForm = this.emptyForm();
  seleccion = '';

  filasInventario = computed(() => this.productos().flatMap(p => this.filasDe(p)));

  // Métricas KPI
  metricas = computed(() => {
    const prods = this.productos();
    const filas = this.filasInventario();
    const movs = this.movimientos();

    const totalProductos = prods.length;
    const conStockBajo = filas.filter(f => f.stock > 0 && f.stock <= (f.stock_minimo || 5)).length;

    const agotados = filas.filter(f => f.stock <= 0).length;

    const totalEntradas = movs
      .filter(m => m.tipo === 'entrada')
      .reduce((sum, m) => sum + Number(m.cantidad || 0), 0);

    const totalSalidas = movs
      .filter(m => m.tipo === 'salida')
      .reduce((sum, m) => sum + Number(m.cantidad || 0), 0);

    return { totalProductos, conStockBajo, agotados, totalEntradas, totalSalidas };
  });

  // 1. Filtrado para Pestaña 1: una fila por presentación
  productosFiltrados = computed(() => {
    const q = this.busquedaTexto().toLowerCase().trim();
    if (!q) return this.filasInventario();

    return this.filasInventario().filter(f =>
      f.nombre.toLowerCase().includes(q) ||
      f.codigo.toLowerCase().includes(q) ||
      f.presentacion.toLowerCase().includes(q) ||
      f.categoria.toLowerCase().includes(q)
    );
  });

  // 2. Filtrado para Pestaña 2: Kardex / Historial
  movimientosFiltrados = computed(() => {
    const text = this.busquedaTexto().toLowerCase().trim();
    const prodId = this.filterProductoId();
    const tipo = this.filterTipo();

    return this.movimientos().filter(m => {
      const prodNombre = m.producto?.nombre || this.getProductoNombre(m.producto_id);
      const coincideProd = !prodId || m.producto_id === prodId;
      const coincideTipo = tipo === 'todos' || (m.tipo as string) === tipo;
      const presentacion = m.variante?.presentation || '';
      const coincideTexto = !text || 
        prodNombre.toLowerCase().includes(text) || 
        presentacion.toLowerCase().includes(text) ||
        (m.motivo || '').toLowerCase().includes(text) ||
        (m.referencia || '').toLowerCase().includes(text);

      return coincideProd && coincideTipo && coincideTexto;
    });
  });

  private listaActiva = computed(() =>
    this.tabActiva() === 'inventario' ? this.productosFiltrados() : this.movimientosFiltrados()
  );

  totalPages = computed(() => Math.max(1, Math.ceil(this.listaActiva().length / this.pageSize)));
  currentPage = computed(() => Math.min(this.page(), this.totalPages()));

  productosVisibles = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.productosFiltrados().slice(start, start + this.pageSize);
  });

  movimientosVisibles = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.movimientosFiltrados().slice(start, start + this.pageSize);
  });

  rangoPaginacion = computed(() => {
    const total = this.listaActiva().length;
    if (!total) return '0 de 0';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return `${start}–${end} de ${total}`;
  });

  ngOnInit(): void {
    this.loadProductos();
    this.loadMovimientos();
  }

  loadProductos(): void {
    this.productosSvc.getAll().subscribe({
      next: (data) => this.productos.set(data),
      error: () => this.error.set('No se pudieron cargar los productos del inventario.')
    });
  }

  loadMovimientos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.stockSvc.getAll().subscribe({
      next: (data) => {
        this.movimientos.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el historial de movimientos.');
        this.loading.set(false);
      }
    });
  }

  openCreateForProduct(fila?: FilaInventario): void {
    this.form = this.emptyForm();
    const elegida = fila ?? this.filasInventario()[0];
    if (elegida) {
      this.form.producto_id = elegida.producto_id;
      this.form.variante_id = elegida.variante_id;
      this.seleccion = elegida.key;
    }
    this.error.set(null);
    this.showModal.set(true);
  }

  onSeleccion(key: string): void {
    this.seleccion = key;
    const fila = this.filasInventario().find(f => f.key === key);
    this.form.producto_id = fila?.producto_id ?? 0;
    this.form.variante_id = fila?.variante_id ?? null;
  }

  closeModal(): void {
    this.showModal.set(false);
    this.savingModal.set(false);
  }

  save(): void {
    if (!this.form.producto_id || this.form.producto_id === 0) {
      this.error.set('Selecciona un producto válido.');
      return;
    }

    if (this.form.cantidad <= 0) {
      this.error.set('La cantidad debe ser mayor a 0.');
      return;
    }

    this.savingModal.set(true);
    this.error.set(null);

    this.stockSvc.create(this.form).subscribe({
      next: () => {
        this.aviso.set('✅ Stock actualizado correctamente.');
        this.closeModal();
        this.loadMovimientos();
        this.loadProductos();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al registrar el movimiento.');
        this.savingModal.set(false);
      }
    });
  }

  cambiarTab(tab: 'inventario' | 'kardex'): void {
    this.tabActiva.set(tab);
    this.page.set(1);
  }

  onBusqueda(valor: string): void {
    this.busquedaTexto.set(valor);
    this.page.set(1);
  }

  onFiltroProducto(id: number | null): void {
    this.filterProductoId.set(id);
    this.page.set(1);
  }

  onFiltroTipo(tipo: 'todos' | 'entrada' | 'salida' | 'ajuste'): void {
    this.filterTipo.set(tipo);
    this.page.set(1);
  }

  goToPage(pagina: number): void {
    this.page.set(Math.min(Math.max(1, pagina), this.totalPages()));
  }

  getProductoNombre(id: number): string {
    return this.productos().find(p => p.id === id)?.nombre ?? `Producto #${id}`;
  }

  presentacionDe(m: MovimientoStock): string {
    return m.variante?.presentation || '—';
  }

  private filasDe(p: Producto): FilaInventario[] {
    const presentaciones = p.presentaciones ?? [];
    if (!presentaciones.length) {
      return [{
        key: `${p.id}-0`,
        producto_id: p.id,
        variante_id: null,
        codigo: p.codigo || `#${p.id}`,
        nombre: p.nombre,
        presentacion: '—',
        categoria: p.categoria || 'General',
        precio_venta: Number(p.precio_venta) || 0,
        stock: Number(p.stock_disponible ?? p.stock_actual) || 0,
        stock_minimo: Number(p.stock_minimo) || 0,
      }];
    }

    return presentaciones.map(v => ({
      key: `${p.id}-${v.id}`,
      producto_id: p.id,
      variante_id: v.id,
      codigo: v.sku || p.codigo || `#${p.id}`,
      nombre: p.nombre,
      presentacion: v.presentacion || '—',
      categoria: p.categoria || 'General',
      precio_venta: Number(p.precio_venta) || 0,
      stock: Number(v.stock) || 0,
      stock_minimo: Number(p.stock_minimo) || 0,
    }));
  }

  private emptyForm(): MovimientoForm {
    return {
      producto_id: 0,
      variante_id: null,
      tipo: 'entrada',
      cantidad: 1,
      motivo: '',
    };
  }
}