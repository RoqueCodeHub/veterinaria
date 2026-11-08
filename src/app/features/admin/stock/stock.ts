import { Component, OnInit, inject, signal, computed } from '@angular/core';
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

  // Métricas KPI
  metricas = computed(() => {
    const prods = this.productos();
    const movs = this.movimientos();

    const totalProductos = prods.length;
    const conStockBajo = prods.filter(p => {
      const actual = Number(p.stock_disponible ?? p.stock_actual) || 0;
      const min = Number(p.stock_minimo) || 5;
      return actual > 0 && actual <= min;
    }).length;

    const agotados = prods.filter(p => (Number(p.stock_disponible ?? p.stock_actual) || 0) <= 0).length;

    const totalEntradas = movs
      .filter(m => m.tipo === 'entrada')
      .reduce((sum, m) => sum + Number(m.cantidad || 0), 0);

    const totalSalidas = movs
      .filter(m => m.tipo === 'salida')
      .reduce((sum, m) => sum + Number(m.cantidad || 0), 0);

    return { totalProductos, conStockBajo, agotados, totalEntradas, totalSalidas };
  });

  // 1. Filtrado para Pestaña 1: Lista de Productos
  productosFiltrados = computed(() => {
    const q = this.busquedaTexto().toLowerCase().trim();
    if (!q) return this.productos();

    return this.productos().filter(p => 
      p.nombre.toLowerCase().includes(q) || 
      (p.codigo || '').toLowerCase().includes(q) ||
      (p.categoria || '').toLowerCase().includes(q)
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
      const coincideTexto = !text || 
        prodNombre.toLowerCase().includes(text) || 
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

  openCreateForProduct(prodId: number = 0): void {
    this.form = this.emptyForm();
    if (prodId > 0) {
      this.form.producto_id = prodId;
    } else if (this.productos().length > 0) {
      this.form.producto_id = this.productos()[0].id;
    }
    this.error.set(null);
    this.showModal.set(true);
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

  getProductoStockActual(p: Producto): number {
    return Number(p.stock_disponible ?? p.stock_actual) || 0;
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