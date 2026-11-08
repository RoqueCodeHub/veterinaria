import { Component, ElementRef, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VentasService } from '../../../core/services/ventas.service';
import { ProductosService } from '../../../core/services/productos.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { CategoriasService, Categoria } from '../../../core/services/categorias.service';

export interface ClienteItem {
  id: number;
  nombre_completo: string;
}

export interface ProductoItem {
  id: number;
  nombre: string;
  categoria: string;
  categoria_id?: number | null;
  precio: number;
  stock: number;
  codigo_barras?: string;
}

export interface CartItem {
  producto: ProductoItem;
  cantidad: number;
  subtotal: number;
}

@Component({
  selector: 'app-nueva-venta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nueva-venta.html',
  styleUrl: './nueva-venta.css',
})
export class NuevaVentaComponent implements OnInit {
  private ventasSvc = inject(VentasService);
  private productosSvc = inject(ProductosService);
  private clientesSvc = inject(ClientesService);
  private categoriasSvc = inject(CategoriasService);
  private router = inject(Router);

  // Catálogos desde BD
  productos = signal<ProductoItem[]>([]);
  clientes = signal<ClienteItem[]>([]);
  
  // Estados de Carga
  loadingProductos = signal(false);
  loadingClientes = signal(false);
  savingVenta = signal(false);
  error = signal<string | null>(null);

  // Filtros
  busqueda = '';
  categoriaSeleccionada = 'todas';
  arbol = signal<Categoria[]>([]);
  filtros = computed(() =>
    this.arbol()
      .filter(c => this.esPrincipal(c))
      .map(c => c.nombre)
      .sort((a, b) => a.localeCompare(b, 'es'))
  );
  carritoAbierto = signal(false);
  readonly lote = 18;
  mostrados = signal(18);

  @ViewChild('catalogo') catalogo?: ElementRef<HTMLElement>;

  // Carrito y Datos de Cliente
  cart = signal<CartItem[]>([]);
  clienteSeleccionadoId: number | null = null;
  mascotaNombre = '';

  // Modal de Confirmación
  mostrarModalExito = signal(false);
  ticketGeneradoId = signal<number | null>(null);

  productosFiltrados(): ProductoItem[] {
    const q = this.busqueda.toLowerCase().trim();
    const cat = this.categoriaSeleccionada.toLowerCase();
    return this.productos().filter(p => {
      const coincideCat = cat === 'todas' || this.grupoDe(p).toLowerCase() === cat;
      if (!coincideCat) return false;
      if (!q) return p.stock > 0;
      const coincideTexto = p.nombre.toLowerCase().includes(q) || (p.codigo_barras || '').toLowerCase().includes(q);
      return coincideTexto;
    });
  }

  productosVisibles(): ProductoItem[] {
    return this.productosFiltrados().slice(0, this.mostrados());
  }

  quedanMas(): boolean {
    return this.mostrados() < this.productosFiltrados().length;
  }

  onBusqueda(valor: string): void {
    this.busqueda = valor;
    this.reiniciarCarga();
  }

  seleccionarCategoria(cat: string): void {
    this.categoriaSeleccionada = cat;
    this.reiniciarCarga();
  }

  grupoDe(p: ProductoItem): string {
    const porId = new Map(this.arbol().map(c => [c.id, c]));
    let actual = p.categoria_id ? porId.get(p.categoria_id) : undefined;
    if (!actual && p.categoria) {
      actual = this.arbol().find(c => c.nombre.toLowerCase() === p.categoria.toLowerCase());
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

  private cargarCategorias(): void {
    this.categoriasSvc.getAll().subscribe({
      next: (data) => this.arbol.set(data),
      error: () => {},
    });
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
      this.cargarMas();
    }
  }

  private reiniciarCarga(): void {
    this.mostrados.set(this.lote);
    this.programarRelleno();
  }

  private cargarMas(): void {
    if (!this.quedanMas()) return;
    const total = this.productosFiltrados().length;
    const siguiente = Math.min(this.mostrados() + this.lote, total);
    if (siguiente === this.mostrados()) return;
    this.mostrados.set(siguiente);
    this.programarRelleno();
  }

  private programarRelleno(): void {
    setTimeout(() => this.llenarSiCabe());
  }

  private llenarSiCabe(): void {
    const el = this.catalogo?.nativeElement;
    if (!el || el.clientHeight < 40 || !this.quedanMas()) return;
    if (el.scrollHeight > el.clientHeight + 80) return;
    this.mostrados.update(n => Math.min(n + this.lote, this.productosFiltrados().length));
    this.programarRelleno();
  }

  // Totales
  subtotalCart = computed(() => this.cart().reduce((acc, item) => acc + item.subtotal, 0));
  totalCart = computed(() => this.subtotalCart());
  cantidadItems = computed(() => this.cart().reduce((acc, item) => acc + item.cantidad, 0));

  ngOnInit(): void {
    this.cargarProductosBD();
    this.cargarClientesBD();
    this.cargarCategorias();
  }

  verCarrito(): void {
    this.carritoAbierto.set(true);
  }

  cerrarCarrito(): void {
    this.carritoAbierto.set(false);
  }

  // 1. Cargar Productos y Stock de la Base de Datos
  cargarProductosBD(): void {
    this.loadingProductos.set(true);
    this.error.set(null);

    this.productosSvc.getAll().subscribe({
      next: (list) => {
        const Mapped: ProductoItem[] = list
          .filter(item => item.activo !== false)
          .map(item => ({
            id: item.id,
            nombre: item.nombre || 'Producto sin nombre',
            categoria: item.categoria || 'General',
            categoria_id: item.categoria_id ?? null,
            precio: Number(item.precio_venta) || 0,
            stock: Math.max(0, Math.floor(Number(item.stock_disponible ?? item.stock_actual) || 0)),
            codigo_barras: item.codigo || '',
          }))
        this.productos.set(Mapped);
        this.loadingProductos.set(false);
        this.reiniciarCarga();
      },
      error: () => {
        this.error.set('No se pudieron obtener los productos de la base de datos.');
        this.loadingProductos.set(false);
      }
    });
  }

  // 2. Cargar Clientes para la selección <select>
  cargarClientesBD(): void {
    this.loadingClientes.set(true);

    this.clientesSvc.getAll().subscribe({
      next: (list) => {
        const Mapped: ClienteItem[] = list
          .filter(c => c.activo !== false)
          .map(c => ({
            id: c.id,
            nombre_completo: c.nombre_completo || `${c.nombres || ''} ${c.apellidos || ''}`.trim() || `Cliente #${c.id}`,
          }));

        this.clientes.set(Mapped);
        const sigue = Mapped.some(c => c.id === Number(this.clienteSeleccionadoId));
        if (!sigue) this.clienteSeleccionadoId = Mapped[0]?.id ?? null;
        this.loadingClientes.set(false);
      },
      error: () => {
        this.error.set('No se pudieron obtener los clientes de la base de datos.');
        this.loadingClientes.set(false);
      }
    });
  }

  agregarAlCarrito(prod: ProductoItem): void {
    if (prod.stock <= 0) return;

    this.error.set(null);
    this.cart.update(items => {
      const index = items.findIndex(i => i.producto.id === prod.id);
      if (index >= 0) {
        const copy = [...items];
        const actual = copy[index];
        if (actual.cantidad + 1 > prod.stock) {
          this.error.set(`Stock máximo alcanzado (${prod.stock} unidades).`);
          return items;
        }
        copy[index] = {
          ...actual,
          cantidad: actual.cantidad + 1,
          subtotal: (actual.cantidad + 1) * prod.precio
        };
        return copy;
      } else {
        return [...items, { producto: prod, cantidad: 1, subtotal: prod.precio }];
      }
    });
  }

  modificarCantidad(item: CartItem, delta: number): void {
    this.error.set(null);
    this.cart.update(items => {
      return items.map(i => {
        if (i.producto.id === item.producto.id) {
          const nuevaCant = i.cantidad + delta;
          if (nuevaCant <= 0) return null;
          if (nuevaCant > i.producto.stock) {
            this.error.set(`Stock máximo disponible: ${i.producto.stock}.`);
            return i;
          }
          return { ...i, cantidad: nuevaCant, subtotal: nuevaCant * i.producto.precio };
        }
        return i;
      }).filter(Boolean) as CartItem[];
    });
  }

  eliminarItem(item: CartItem): void {
    this.cart.update(items => items.filter(i => i.producto.id !== item.producto.id));
  }

  limpiarCarrito(): void {
    this.cart.set([]);
    this.error.set(null);
  }

  // 3. Registrar la venta en la Base de Datos para que aparezca en Caja
  enviarACaja(): void {
    if (this.cart().length === 0) return;
    const clienteId = Number(this.clienteSeleccionadoId);
    if (!clienteId) {
      this.error.set('Selecciona un cliente para registrar la venta.');
      return;
    }

    this.savingVenta.set(true);
    this.error.set(null);
    const mascota = this.mascotaNombre.trim();

    this.ventasSvc.create({
      cliente_id: clienteId,
      observaciones: mascota ? `Mascota: ${mascota}` : undefined,
      items: this.cart().map(i => ({
        producto_id: i.producto.id,
        cantidad: i.cantidad,
        precio_unitario: i.producto.precio,
      })),
    }).subscribe({
      next: (venta) => {
        this.ticketGeneradoId.set(venta?.id ?? null);
        this.carritoAbierto.set(false);
        this.mostrarModalExito.set(true);
        this.cart.set([]);
        this.savingVenta.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al guardar la venta en la base de datos.');
        this.savingVenta.set(false);
      }
    });
  }

  cobrarDirecto(): void {
    this.enviarACaja();
  }

  irACaja(): void {
    this.mostrarModalExito.set(false);
    this.router.navigate(['/admin/caja']);
  }

  cerrarModalYContinuar(): void {
    this.mostrarModalExito.set(false);
    this.mascotaNombre = '';
    this.cargarProductosBD();
  }
}