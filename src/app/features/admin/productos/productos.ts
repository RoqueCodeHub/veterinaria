import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService, Producto, ProductoForm } from '../../../core/services/productos.service';
import { ProveedoresService, Proveedor } from '../../../core/services/proveedores.service';
import { CategoriasService, Categoria } from '../../../core/services/categorias.service';

export interface ProductoFormExtended extends ProductoForm {
  // Presentación Comercial y Forma Farmacéutica
  presentacion?: string | null;
  tipo_presentacion?: string | null;

  // Ficha Médica y Regulación Veterinaria
  principio_activo?: string | null;
  concentracion?: string | null;
  tipo_receta?: 'OTC' | 'RECETA_SIMPLE' | 'CONTROLADO';
  especies_destino?: string[];
  cadena_frio?: boolean;
  tiempo_retiro_dias?: number | null;
  
  // Fraccionamiento y Dosis
  permite_fraccionamiento?: boolean;
  unidad_dispensacion?: string | null;
  factor_conversion?: number;
  precio_venta_dosis?: number;
  
  // Trazabilidad de Lotes
  codigo_lote?: string | null;
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './productos.html',
  styleUrl: './productos.css',
})
export class Productos implements OnInit, OnDestroy {
  private svc = inject(ProductosService);
  private proveedoresSvc = inject(ProveedoresService);
  private categoriasSvc = inject(CategoriasService);

  // Estados de datos (Signals)
  productos = signal<Producto[]>([]);
  proveedores = signal<Proveedor[]>([]);
  categorias = signal<Categoria[]>([]);
  
  loading = signal(false);
  savingModal = signal(false);
  aviso = signal<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  private avisoTimer: ReturnType<typeof setTimeout> | null = null;

  // Modales y Pestañas
  showModal = signal(false);
  modalTab = signal<'general' | 'medico' | 'fraccionamiento'>('general');
  editingId = signal<number | null>(null);
  deleteConfirmId = signal<number | null>(null);

  // Catálogos Veterinarios
  readonly listaTiposPresentacion: string[] = [
    '💉 Inyectable (Solución/Suspensión)',
    '💊 Comprimidos / Tabletas / Cápsulas',
    '🧪 Suspensión / Jarabe Oral',
    '🌾 Polvo Soluble / Granulado / Premezcla',
    '🐴 Gel / Pasta Oral',
    '🧴 Tópico / Spray / Pomada / Crema',
    '💧 Pour-On / Pipeta (Spot-On)',
    '👁️ Gotas Otálgicas / Oftálmicas',
    '💉 Suero / Infusión IV',
    '🧼 Champú / Baño Medicado',
    '📦 Alimento / Suplemento / Accesorio'
  ];

  readonly listaEspecies: string[] = [
    'Caninos 🐶', 'Felinos 🐱', 'Bovinos 🐮', 'Equinos 🐴', 
    'Porcinos 🐷', 'Ovinos/Caprinos 🐐', 'Aves 🐔', 'Exóticos 🐰'
  ];

  // Filtros reactivos con Signals
  busquedaTexto = signal('');
  filtroCategoria = signal<number | 'todas'>('todas');
  filtroEstado = signal<'todos' | 'activos' | 'stock-bajo' | 'por-vencer'>('todos');
  filtroTipoPresentacion = signal<string>('todos');

  // Paginación
  page = signal(1);
  readonly pageSize = 10;

  // Formulario de edición/creación
  form: ProductoFormExtended = this.emptyForm();

  // Métricas KPI
  metricas = computed(() => {
    const list = this.productos();
    const total = list.length;
    const activos = list.filter(p => p.activo !== false).length;
    const stockBajo = list.filter(p => p.stock_bajo || (Number(p.stock_disponible ?? p.stock_actual) <= Number(p.stock_minimo))).length;
    const porVencer = list.filter(p => {
      if (!p.fecha_vencimiento) return false;
      const fVenc = new Date(p.fecha_vencimiento).getTime();
      const hoy = new Date().getTime();
      const dias = (fVenc - hoy) / (1000 * 3600 * 24);
      return dias > 0 && dias <= 30;
    }).length;

    return { total, activos, stockBajo, porVencer };
  });

  // Lista Filtrada Reactiva
  productosFiltrados = computed(() => {
    const q = this.busquedaTexto().toLowerCase().trim();
    const catId = this.filtroCategoria();
    const est = this.filtroEstado();
    const presFiltro = this.filtroTipoPresentacion();

    return this.productos().filter((p: any) => {
      // Filtro por texto
      const coincideTexto = !q || 
        p.nombre.toLowerCase().includes(q) || 
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.categoria || '').toLowerCase().includes(q) ||
        (p.principio_activo || '').toLowerCase().includes(q) ||
        (p.tipo_presentacion || '').toLowerCase().includes(q) ||
        (p.presentacion || '').toLowerCase().includes(q) ||
        this.presentacionesDe(p).some(item => item.toLowerCase().includes(q));

      // Filtro por categoría
      const coincideCat = catId === 'todas' || Number(p.categoria_id) === Number(catId);

      // Filtro por tipo de presentación
      const coincideTipoPres = presFiltro === 'todos' || p.tipo_presentacion === presFiltro;

      // Filtro por Estado / Alerta
      let coincideEstado = true;
      if (est === 'activos') coincideEstado = p.activo !== false;
      if (est === 'stock-bajo') coincideEstado = p.stock_bajo || (Number(p.stock_disponible ?? p.stock_actual) <= Number(p.stock_minimo));
      if (est === 'por-vencer') {
        if (!p.fecha_vencimiento) {
          coincideEstado = false;
        } else {
          const dias = (new Date(p.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
          coincideEstado = dias > 0 && dias <= 30;
        }
      }

      return coincideTexto && coincideCat && coincideTipoPres && coincideEstado;
    });
  });

  // Cálculo de Paginación
  totalPages = computed(() => Math.max(1, Math.ceil(this.productosFiltrados().length / this.pageSize)));
  currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  
  visibleProductos = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.productosFiltrados().slice(start, start + this.pageSize);
  });

  rangoPaginacion = computed(() => {
    const total = this.productosFiltrados().length;
    if (!total) return '0 de 0';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return `${start}–${end} de ${total}`;
  });

  ngOnInit(): void {
    this.loadProveedores();
    this.loadCategorias();
    this.load();
  }

  ngOnDestroy(): void {
    this.limpiarAvisoTimer();
  }

  cerrarAviso(): void {
    this.aviso.set(null);
    this.limpiarAvisoTimer();
  }

  private mostrarAviso(texto: string, tipo: 'ok' | 'error' = 'ok'): void {
    this.aviso.set({ texto, tipo });
    this.limpiarAvisoTimer();
    this.avisoTimer = setTimeout(() => this.cerrarAviso(), 3000);
  }

  private limpiarAvisoTimer(): void {
    if (this.avisoTimer) {
      clearTimeout(this.avisoTimer);
      this.avisoTimer = null;
    }
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

    this.svc.getAll().subscribe({
      next: (data) => {
        this.productos.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.mostrarAviso('No se pudo cargar la lista de productos.', 'error');
        this.loading.set(false);
      }
    });
  }

  setFiltroEstado(estado: 'todos' | 'activos' | 'stock-bajo' | 'por-vencer'): void {
    this.filtroEstado.set(estado);
    this.page.set(1);
  }

  setModalTab(tab: 'general' | 'medico' | 'fraccionamiento'): void {
    this.modalTab.set(tab);
  }

  goToPage(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.modalTab.set('general');
    this.editingId.set(null);
    this.showModal.set(true);
  }

  openEdit(p: any): void {
    const tipoRecetaCalc: 'OTC' | 'RECETA_SIMPLE' | 'CONTROLADO' = 
      p.tipo_receta || (p.requiere_receta ? 'RECETA_SIMPLE' : 'OTC');

    let especiesArray: string[] = [];
    if (Array.isArray(p.especies_destino)) {
      especiesArray = p.especies_destino;
    } else if (typeof p.especies_destino === 'string' && p.especies_destino.trim()) {
      try { especiesArray = JSON.parse(p.especies_destino); } catch { especiesArray = []; }
    }

    const primeraPresentacionAlt = this.presentacionesDe(p)[0] || '';

    this.form = {
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      codigo: p.codigo ?? '',
      categoria_id: p.categoria_id ?? this.categorias().find(c => c.nombre === p.categoria)?.id ?? null,
      proveedor_id: p.proveedor?.id ?? p.proveedor_id ?? null,
      precio_compra: Number(p.precio_compra) || 0,
      precio_venta: Number(p.precio_venta) || 0,
      stock_actual: Number(p.stock_disponible ?? p.stock_actual) || 0,
      stock_minimo: Number(p.stock_minimo) || 0,
      unidad_medida: p.unidad_medida ?? 'unidad',
      fecha_vencimiento: p.fecha_vencimiento ? p.fecha_vencimiento.split('T')[0] : '',
      requiere_receta: p.requiere_receta ?? (tipoRecetaCalc !== 'OTC'),
      activo: p.activo ?? true,
      
      // Presentación Comercial y Forma Farmacéutica
      presentacion: p.presentacion ?? primeraPresentacionAlt,
      tipo_presentacion: p.tipo_presentacion ?? '',

      // Ficha clínica
      principio_activo: p.principio_activo ?? '',
      concentracion: p.concentracion ?? '',
      tipo_receta: tipoRecetaCalc,
      especies_destino: especiesArray,
      cadena_frio: p.cadena_frio ?? false,
      tiempo_retiro_dias: p.tiempo_retiro_dias === null || p.tiempo_retiro_dias === undefined || p.tiempo_retiro_dias === ''
        ? null
        : Number(p.tiempo_retiro_dias),
      
      // Fraccionamiento
      permite_fraccionamiento: p.permite_fraccionamiento ?? false,
      unidad_dispensacion: p.unidad_dispensacion ?? '',
      factor_conversion: Number(p.factor_conversion) || 1,
      precio_venta_dosis: Number(p.precio_venta_dosis) || 0,

      // Lote
      codigo_lote: p.codigo_lote ?? p.lote ?? ''
    };

    this.modalTab.set('general');
    this.editingId.set(p.id);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.savingModal.set(false);
  }

  toggleEspecie(especie: string): void {
    const actuales = [...(this.form.especies_destino || [])];
    const index = actuales.indexOf(especie);
    if (index >= 0) {
      actuales.splice(index, 1);
    } else {
      actuales.push(especie);
    }
    this.form.especies_destino = actuales;
  }

  hasEspecie(especie: string): boolean {
    return (this.form.especies_destino || []).includes(especie);
  }

  calcularPrecioDosisAuto(): void {
    const factor = Number(this.form.factor_conversion) || 1;
    const pVenta = Number(this.form.precio_venta) || 0;
    if (factor > 0 && pVenta > 0) {
      this.form.precio_venta_dosis = Number((pVenta / factor).toFixed(2));
    }
  }

  save(): void {
    if (!this.form.nombre.trim()) {
      this.mostrarAviso('El nombre del producto es obligatorio.', 'error');
      return;
    }

    this.savingModal.set(true);

    const requiereRecetaBool = this.form.tipo_receta === 'RECETA_SIMPLE' || this.form.tipo_receta === 'CONTROLADO';
    const texto = (valor?: string | null) => {
      const limpio = valor?.trim();
      return limpio ? limpio : null;
    };

    const payload: ProductoFormExtended = {
      ...this.form,
      precio_compra: Number(this.form.precio_compra) || 0,
      precio_venta: Number(this.form.precio_venta) || 0,
      stock_minimo: Number(this.form.stock_minimo) || 0,
      codigo: texto(this.form.codigo),
      descripcion: texto(this.form.descripcion),
      unidad_medida: texto(this.form.unidad_medida) || 'unidad',
      fecha_vencimiento: this.form.fecha_vencimiento || null,
      categoria_id: this.form.categoria_id || null,
      proveedor_id: this.form.proveedor_id || null,
      requiere_receta: requiereRecetaBool,
      activo: this.form.activo !== false,

      presentacion: texto(this.form.presentacion),
      tipo_presentacion: texto(this.form.tipo_presentacion),

      principio_activo: texto(this.form.principio_activo),
      concentracion: texto(this.form.concentracion),
      tipo_receta: this.form.tipo_receta || 'OTC',
      especies_destino: this.form.especies_destino || [],
      cadena_frio: !!this.form.cadena_frio,
      tiempo_retiro_dias: this.form.tiempo_retiro_dias === undefined || this.form.tiempo_retiro_dias === null
        ? null
        : Number(this.form.tiempo_retiro_dias),

      permite_fraccionamiento: !!this.form.permite_fraccionamiento,
      unidad_dispensacion: texto(this.form.unidad_dispensacion),
      factor_conversion: Number(this.form.factor_conversion) || 1,
      precio_venta_dosis: Number(this.form.precio_venta_dosis) || 0,
      codigo_lote: texto(this.form.codigo_lote),
    };

    const id = this.editingId();
    if (id) {
      delete payload.stock_actual;
    } else {
      payload.stock_actual = Number(this.form.stock_actual) || 0;
    }

    const obs = id ? this.svc.update(id, payload as any) : this.svc.create(payload as any);
    obs.subscribe({
      next: () => {
        this.mostrarAviso(id ? '✅ Producto actualizado correctamente.' : '✅ Producto registrado en el catálogo.');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        const apiErrors = err?.error?.errors;
        const detail = apiErrors ? Object.values(apiErrors).flat().join(' ') : err?.error?.message;
        this.mostrarAviso(detail || 'No se pudo guardar el producto.', 'error');
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
    const id = this.deleteConfirmId();
    if (!id) return;

    this.svc.delete(id).subscribe({
      next: () => {
        this.mostrarAviso('✅ Producto eliminado del catálogo.');
        this.deleteConfirmId.set(null);
        this.load();
      },
      error: () => {
        this.mostrarAviso('No se pudo eliminar el producto.', 'error');
        this.deleteConfirmId.set(null);
      }
    });
  }

  getStockActual(p: Producto): number {
    return Number(p.stock_disponible ?? p.stock_actual) || 0;
  }

  presentacionesDe(p: Producto): string[] {
    return (p.presentaciones ?? [])
      .map(item => item.presentacion)
      .filter(nombre => !!nombre && nombre !== '—');
  }

  private emptyForm(): ProductoFormExtended {
    return {
      nombre: '',
      descripcion: '',
      codigo: '',
      categoria_id: null,
      proveedor_id: null,
      precio_compra: 0,
      precio_venta: 0,
      stock_actual: 0,
      stock_minimo: 5,
      unidad_medida: 'unidad',
      fecha_vencimiento: '',
      requiere_receta: false,
      activo: true,

      // Presentación Comercial y Forma Farmacéutica
      presentacion: '',
      tipo_presentacion: '',

      // Ficha clínica
      principio_activo: '',
      concentracion: '',
      tipo_receta: 'OTC',
      especies_destino: [],
      cadena_frio: false,
      tiempo_retiro_dias: undefined,

      // Fraccionamiento
      permite_fraccionamiento: false,
      unidad_dispensacion: '',
      factor_conversion: 1,
      precio_venta_dosis: 0,

      // Lote
      codigo_lote: ''
    };
  }
}