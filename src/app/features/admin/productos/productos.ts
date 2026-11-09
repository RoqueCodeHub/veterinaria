import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService, Producto, ProductoForm } from '../../../core/services/productos.service';
import { ProveedoresService, Proveedor } from '../../../core/services/proveedores.service';
import { CategoriasService, Categoria } from '../../../core/services/categorias.service';

export interface ProductoFormExtended extends ProductoForm {
  // Ficha Médica y Regulación
  principio_activo?: string;
  concentracion?: string;
  tipo_receta?: 'OTC' | 'RECETA_SIMPLE' | 'CONTROLADO';
  especies_destino?: string[];
  cadena_frio?: boolean;
  tiempo_retiro_dias?: number;
  
  // Fraccionamiento y Dosis
  permite_fraccionamiento?: boolean;
  unidad_dispensacion?: string;
  factor_conversion?: number;
  precio_venta_dosis?: number;
  
  // Trazabilidad de Lotes
  codigo_lote?: string;
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './productos.html',
  styleUrl: './productos.css',
})
export class Productos implements OnInit {
  private svc = inject(ProductosService);
  private proveedoresSvc = inject(ProveedoresService);
  private categoriasSvc = inject(CategoriasService);

  // Estados de datos (Signals)
  productos = signal<Producto[]>([]);
  proveedores = signal<Proveedor[]>([]);
  categorias = signal<Categoria[]>([]);
  
  loading = signal(false);
  savingModal = signal(false);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  // Modales y Pestañas
  showModal = signal(false);
  modalTab = signal<'general' | 'medico' | 'fraccionamiento'>('general');
  editingId = signal<number | null>(null);
  deleteConfirmId = signal<number | null>(null);

  // Filtros reactivos con Signals
  busquedaTexto = signal('');
  filtroCategoria = signal<number | 'todas'>('todas');
  filtroEstado = signal<'todos' | 'activos' | 'stock-bajo' | 'por-vencer'>('todos');

  // Catálogo de Especies Destino
  readonly listaEspecies: string[] = ['Caninos 🐶', 'Felinos 🐱', 'Bovinos 🐮', 'Equinos 🐴', 'Porcinos 🐷', 'Aves 🐔', 'Exóticos 🐰'];

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

  // Lista Filtrada Reactiva (incluye búsqueda por Principio Activo)
  productosFiltrados = computed(() => {
    const q = this.busquedaTexto().toLowerCase().trim();
    const catId = this.filtroCategoria();
    const est = this.filtroEstado();

    return this.productos().filter((p: any) => {
      // Filtro texto (Nombre, código, categoría o principio activo)
      const coincideTexto = !q || 
        p.nombre.toLowerCase().includes(q) || 
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.categoria || '').toLowerCase().includes(q) ||
        (p.principio_activo || '').toLowerCase().includes(q) ||
        this.presentacionesDe(p).some(item => item.toLowerCase().includes(q));

      // Filtro categoría
      const coincideCat = catId === 'todas' || p.categoria_id === catId;

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

      return coincideTexto && coincideCat && coincideEstado;
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

    this.svc.getAll().subscribe({
      next: (data) => {
        this.productos.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar la lista de productos.');
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
    this.error.set(null);
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

    this.form = {
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      codigo: p.codigo ?? '',
      categoria_id: p.categoria_id ?? this.categorias().find(c => c.nombre === p.categoria)?.id,
      proveedor_id: p.proveedor?.id ?? p.proveedor_id,
      precio_compra: Number(p.precio_compra) || 0,
      precio_venta: Number(p.precio_venta) || 0,
      stock_actual: Number(p.stock_disponible ?? p.stock_actual) || 0,
      stock_minimo: Number(p.stock_minimo) || 0,
      unidad_medida: p.unidad_medida ?? 'unidad',
      fecha_vencimiento: p.fecha_vencimiento ? p.fecha_vencimiento.split('T')[0] : '',
      requiere_receta: p.requiere_receta ?? (tipoRecetaCalc !== 'OTC'),
      activo: p.activo ?? true,
      
      // Ficha clínica
      principio_activo: p.principio_activo ?? '',
      concentracion: p.concentracion ?? '',
      tipo_receta: tipoRecetaCalc,
      especies_destino: especiesArray,
      cadena_frio: p.cadena_frio ?? false,
      tiempo_retiro_dias: p.tiempo_retiro_dias ? Number(p.tiempo_retiro_dias) : undefined,
      
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
    this.error.set(null);
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
      this.error.set('El nombre del producto es obligatorio.');
      return;
    }

    this.savingModal.set(true);
    this.error.set(null);

    // Sincronizar campo heredado requiere_receta con el selector tipo_receta
    const requiereRecetaBool = this.form.tipo_receta === 'RECETA_SIMPLE' || this.form.tipo_receta === 'CONTROLADO';

    const payload: ProductoFormExtended = {
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
      requiere_receta: requiereRecetaBool,

      // Atributos Médico-Veterinarios
      principio_activo: this.form.principio_activo?.trim() || undefined,
      concentracion: this.form.concentracion?.trim() || undefined,
      tipo_receta: this.form.tipo_receta || 'OTC',
      especies_destino: this.form.especies_destino || [],
      cadena_frio: !!this.form.cadena_frio,
      tiempo_retiro_dias: this.form.tiempo_retiro_dias ? Number(this.form.tiempo_retiro_dias) : undefined,

      // Atributos de Fraccionamiento
      permite_fraccionamiento: !!this.form.permite_fraccionamiento,
      unidad_dispensacion: this.form.unidad_dispensacion?.trim() || undefined,
      factor_conversion: Number(this.form.factor_conversion) || 1,
      precio_venta_dosis: Number(this.form.precio_venta_dosis) || 0,

      // Lote
      codigo_lote: this.form.codigo_lote?.trim() || undefined
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
        this.aviso.set(id ? '✅ Producto actualizado correctamente.' : '✅ Producto registrado en el catálogo.');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        const apiErrors = err?.error?.errors;
        const detail = apiErrors ? Object.values(apiErrors).flat().join(' ') : err?.error?.message;
        this.error.set(detail || 'Error al guardar el producto.');
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
        this.aviso.set('✅ Producto eliminado del catálogo.');
        this.deleteConfirmId.set(null);
        this.load();
      },
      error: () => {
        this.error.set('No se pudo eliminar el producto.');
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
      categoria_id: undefined,
      proveedor_id: undefined,
      precio_compra: 0,
      precio_venta: 0,
      stock_actual: 0,
      stock_minimo: 5,
      unidad_medida: 'unidad',
      fecha_vencimiento: '',
      requiere_receta: false,
      activo: true,

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