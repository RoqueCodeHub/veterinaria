import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { StockService, MovimientoStock, MovimientoForm } from '../../../core/services/stock.service';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

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
  imports: [CommonModule, FormsModule, DatePipe, Button, Dialog, InputText, Select, AdminTable],
  templateUrl: './stock.html',
  styleUrl: './stock.css',
})
export class Stock implements OnInit {
  private stockSvc = inject(StockService);
  private notify = inject(NotifyService);
  private productosSvc = inject(ProductosService);

  // Control de Pestañas (Se cambia pestañaActiva por tabActiva)
  tabActiva = signal<'inventario' | 'kardex'>('inventario');

  // Estados de Datos
  movimientos = signal<MovimientoStock[]>([]);
  productos = signal<Producto[]>([]);
  loading = signal(false);
  savingModal = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);

  // Filtros en Signals
  busquedaTexto = signal('');
  filterProductoId = signal<number | null>(null);
  filterTipo = signal<'todos' | 'entrada' | 'salida' | 'ajuste'>('todos');
  filtroNivel = signal<'todos' | 'bajo' | 'agotado'>('todos');
  readonly pestanas: { label: string; value: 'inventario' | 'kardex' }[] = [
    { label: 'Stock actual', value: 'inventario' },
    { label: 'Kardex', value: 'kardex' },
  ];
  readonly tiposMovimiento = [
    { label: 'Todos los tipos', value: 'todos' },
    { label: 'Entradas', value: 'entrada' },
    { label: 'Salidas', value: 'salida' },
  ];
  readonly tiposRegistro = [
    { label: 'Entrada', value: 'entrada' },
    { label: 'Salida', value: 'salida' },
  ];
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
    const nivel = this.filtroNivel();
    return this.filasInventario().filter((fila) => {
      const coincideTexto = !q ||
        fila.nombre.toLowerCase().includes(q) ||
        fila.codigo.toLowerCase().includes(q) ||
        fila.presentacion.toLowerCase().includes(q) ||
        fila.categoria.toLowerCase().includes(q);
      const minimo = fila.stock_minimo || 5;
      const bajo = fila.stock > 0 && fila.stock <= minimo;
      const agotado = fila.stock <= 0;
      const coincideNivel = nivel === 'todos' || (nivel === 'bajo' && bajo) || (nivel === 'agotado' && agotado);
      return coincideTexto && coincideNivel;
    });
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
    this.formError.set(null);
    this.showModal.set(true);
  }

  onSeleccion(key: string): void {
    this.seleccion = key;
    const fila = this.filasInventario().find(f => f.key === key);
    this.form.producto_id = fila?.producto_id ?? 0;
    this.form.variante_id = fila?.variante_id ?? null;
    if (this.form.producto_id) this.formError.set(null);
  }

  onCantidad(valor: number): void {
    this.form.cantidad = Number(valor);
    if (this.form.cantidad > 0) this.formError.set(null);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.savingModal.set(false);
    this.formError.set(null);
  }

  save(): void {
    if (!this.form.producto_id || this.form.producto_id === 0) {
      this.formError.set('Selecciona un producto válido.');
      return;
    }

    if (this.form.cantidad <= 0) {
      this.formError.set('La cantidad debe ser mayor a 0.');
      return;
    }

    this.savingModal.set(true);
    this.formError.set(null);

    this.stockSvc.create(this.form).subscribe({
      next: () => {
        this.notify.success('Stock actualizado.');
        this.closeModal();
        this.loadMovimientos();
        this.loadProductos();
      },
      error: (err) => {
        this.formError.set(err?.error?.message || 'Error al registrar el movimiento.');
        this.savingModal.set(false);
      }
    });
  }

  cambiarTab(tab: 'inventario' | 'kardex'): void {
    this.tabActiva.set(tab);
  }

  onBusqueda(valor: string): void {
    this.busquedaTexto.set(valor);
  }

  onFiltroProducto(id: number | null): void {
    this.filterProductoId.set(id);
  }

  onFiltroTipo(tipo: 'todos' | 'entrada' | 'salida' | 'ajuste'): void {
    this.filterTipo.set(tipo);
  }

  setNivel(nivel: 'todos' | 'bajo' | 'agotado'): void {
    this.filtroNivel.set(nivel);
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