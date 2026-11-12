import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { VentasService } from '../../../core/services/ventas.service';
import { ProductosService } from '../../../core/services/productos.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { CategoriasService, Categoria } from '../../../core/services/categorias.service';
import { NotifyService } from '../../../core/ui/notify';
import { TicketViewer } from '../../../shared/components/ticket-viewer/ticket-viewer';

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
  ejemplo?: boolean;
}

export interface CartItem {
  producto: ProductoItem;
  cantidad: number;
  subtotal: number;
}

@Component({
  selector: 'app-nueva-venta',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, Button, Dialog, InputText, Select, TicketViewer],
  templateUrl: './nueva-venta.html',
})
export class NuevaVentaComponent implements OnInit {
  private ventasSvc = inject(VentasService);
  private productosSvc = inject(ProductosService);
  private clientesSvc = inject(ClientesService);
  private categoriasSvc = inject(CategoriasService);
  private router = inject(Router);
  private notify = inject(NotifyService);

  @ViewChild('buscador') buscador?: ElementRef<HTMLInputElement>;
  @ViewChild('descuentoCampo') descuentoCampo?: ElementRef<HTMLInputElement>;

  productos = signal<ProductoItem[]>([]);
  clientes = signal<ClienteItem[]>([]);
  loadingProductos = signal(false);
  loadingClientes = signal(false);
  savingVenta = signal(false);
  error = signal<string | null>(null);

  busqueda = '';
  categoriaSeleccionada = 'todas';
  verMasCategorias = signal(false);
  arbol = signal<Categoria[]>([]);
  filtros = computed(() =>
    this.arbol()
      .filter(c => this.esPrincipal(c))
      .map(c => c.nombre)
      .sort((a, b) => a.localeCompare(b, 'es'))
  );
  categoriasVisibles = computed(() => {
    const fuente = this.datosDeEjemplo()
      ? [...new Set(this.ejemplos.map(item => item.categoria))]
      : this.filtros();
    return this.verMasCategorias() ? fuente : fuente.slice(0, 5);
  });
  hayMasCategorias = computed(() => {
    const total = this.datosDeEjemplo() ? new Set(this.ejemplos.map(item => item.categoria)).size : this.filtros().length;
    return total > 5;
  });

  cart = signal<CartItem[]>([]);
  clienteSeleccionadoId: number | null = null;
  mascotas = signal<string[]>([]);
  mascotaActiva = signal<string | null>(null);
  nuevaMascota = '';
  agregandoMascota = signal(false);
  metodoPago = signal<'efectivo' | 'yape' | 'tarjeta' | 'transferencia'>('efectivo');
  readonly metodosPago = [
    { id: 'efectivo' as const, label: 'Efectivo', icon: 'pi pi-wallet' },
    { id: 'yape' as const, label: 'Yape / Plin', icon: 'pi pi-mobile' },
    { id: 'tarjeta' as const, label: 'Tarjeta', icon: 'pi pi-credit-card' },
    { id: 'transferencia' as const, label: 'Transferencia', icon: 'pi pi-building' },
  ];
  descuento = signal(0);
  descuentoTexto = signal('0.00');
  editandoDescuento = signal(false);
  montoRecibido = signal(0);
  recibidoTexto = signal('0.00');

  visorTicket = signal(false);
  ticketGeneradoId = signal<number | null>(null);
  showNuevoCliente = signal(false);
  guardandoCliente = signal(false);
  clienteError = signal<string | null>(null);
  nuevoCliente = { nombres: '', apellidos: '' };

  disponibles = computed(() => this.productos().filter(p => p.stock > 0).length);
  agotados = computed(() => this.productos().filter(p => p.stock <= 0).length);
  subtotalCart = computed(() => this.cart().reduce((acc, item) => acc + item.subtotal, 0));
  descuentoAplicado = computed(() => Math.min(Math.max(0, this.descuento()), this.subtotalCart()));
  netoCart = computed(() => Math.max(0, this.redondear(this.subtotalCart() - this.descuentoAplicado())));
  baseImponible = computed(() => this.redondear(this.netoCart() / 1.18));
  igvCart = computed(() => this.redondear(this.netoCart() - this.baseImponible()));
  totalCart = computed(() => this.netoCart());
  cantidadItems = computed(() => this.cart().reduce((acc, item) => acc + item.cantidad, 0));
  vuelto = computed(() => this.redondear(Math.max(0, this.montoRecibido() - this.totalCart())));
  datosDeEjemplo = computed(() => !this.loadingProductos() && this.productos().length === 0 && !this.error());

  private readonly ejemplos: ProductoItem[] = [
    { id: -1, nombre: 'Alimento húmedo en lata', categoria: 'Alimentos', precio: 7.5, stock: 120, ejemplo: true },
    { id: -2, nombre: 'Antiparasitario externo', categoria: 'Farmacia veterinaria', precio: 45, stock: 8, ejemplo: true },
    { id: -3, nombre: 'Antibiótico inyectable', categoria: 'Farmacia veterinaria', precio: 32, stock: 20, ejemplo: true },
    { id: -4, nombre: 'Vacuna antirrábica', categoria: 'Servicios', precio: 35, stock: 99, ejemplo: true },
    { id: -5, nombre: 'Consulta general', categoria: 'Servicios', precio: 30, stock: 99, ejemplo: true },
    { id: -6, nombre: 'Snack dental', categoria: 'Snacks y premios', precio: 12, stock: 0, ejemplo: true },
    { id: -7, nombre: 'Shampoo medicado', categoria: 'Dermatológicos', precio: 28, stock: 15, ejemplo: true },
  ];

  ngOnInit(): void {
    this.cargarProductosBD();
    this.cargarClientesBD();
    this.cargarCategorias();
  }

  @HostListener('document:keydown', ['$event'])
  enfocarBusqueda(event: KeyboardEvent): void {
    if (event.key !== 'F2') return;
    event.preventDefault();
    this.buscador?.nativeElement.focus();
  }

  visibles(): ProductoItem[] {
    const reales = this.productosFiltrados();
    if (this.datosDeEjemplo()) return this.ejemplosFiltrados();
    return reales;
  }

  productosFiltrados(): ProductoItem[] {
    return this.filtrar(this.productos());
  }

  onBusqueda(valor: string): void {
    this.busqueda = valor;
  }

  seleccionarCategoria(cat: string): void {
    this.categoriaSeleccionada = cat;
  }

  alternarCategorias(): void {
    this.verMasCategorias.update(valor => !valor);
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

  iconoDe(p: ProductoItem): string {
    return this.esServicio(p) ? 'pi pi-heart' : 'pi pi-box';
  }

  tonoDe(p: ProductoItem): string {
    const grupo = this.grupoDe(p).toLowerCase();
    if (grupo.includes('servicio')) return 'is-rose';
    if (grupo.includes('farma') || grupo.includes('dermat')) return 'is-violet';
    if (grupo.includes('snack')) return 'is-amber';
    return 'is-green';
  }

  esServicio(p: ProductoItem): boolean {
    return this.grupoDe(p).toLowerCase().includes('servicio');
  }

  textoStock(p: ProductoItem): string {
    if (p.stock <= 0) return 'Agotado';
    if (this.esServicio(p)) return 'Servicio';
    if (p.stock <= 8) return `Quedan ${p.stock}`;
    return `${p.stock} u.`;
  }

  claseStock(p: ProductoItem): string {
    if (p.stock <= 0) return 'is-off';
    if (this.esServicio(p)) return 'is-service';
    if (p.stock <= 8) return 'is-warn';
    return '';
  }

  cantidadEn(id: number): number {
    return this.cart().find(item => item.producto.id === id)?.cantidad ?? 0;
  }

  cargarProductosBD(): void {
    this.loadingProductos.set(true);
    this.error.set(null);

    this.productosSvc.getAll().subscribe({
      next: (list) => {
        const mapped: ProductoItem[] = list
          .filter(item => item.activo !== false)
          .map(item => ({
            id: item.id,
            nombre: item.nombre || 'Producto sin nombre',
            categoria: item.categoria || 'General',
            categoria_id: item.categoria_id ?? null,
            precio: Number(item.precio_venta) || 0,
            stock: Math.max(0, Math.floor(Number(item.stock_disponible ?? item.stock_actual) || 0)),
            codigo_barras: item.codigo || '',
          }));
        this.productos.set(mapped);
        this.loadingProductos.set(false);
      },
      error: () => {
        this.notify.error('No se pudieron obtener los productos.');
        this.loadingProductos.set(false);
      }
    });
  }

  cargarClientesBD(preferido?: string): void {
    this.loadingClientes.set(true);

    this.clientesSvc.getAll().subscribe({
      next: (list) => {
        const mapped: ClienteItem[] = list
          .filter(c => c.activo !== false)
          .map(c => ({
            id: c.id,
            nombre_completo: c.nombre_completo || `${c.nombres || ''} ${c.apellidos || ''}`.trim() || `Cliente #${c.id}`,
          }));

        this.clientes.set(mapped);
        const elegido = preferido
          ? mapped.find(c => c.nombre_completo.toLowerCase() === preferido.toLowerCase())
          : mapped.find(c => c.id === Number(this.clienteSeleccionadoId));
        this.clienteSeleccionadoId = elegido?.id ?? mapped[0]?.id ?? null;
        this.loadingClientes.set(false);
      },
      error: () => {
        this.notify.error('No se pudieron obtener los clientes.');
        this.loadingClientes.set(false);
      }
    });
  }

  agregarAlCarrito(prod: ProductoItem): void {
    if (prod.ejemplo || prod.stock <= 0) return;

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
      }
      return [...items, { producto: prod, cantidad: 1, subtotal: prod.precio }];
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
    this.descuento.set(0);
    this.descuentoTexto.set('0.00');
    this.editandoDescuento.set(false);
    this.montoRecibido.set(0);
    this.recibidoTexto.set('0.00');
    this.error.set(null);
  }

  elegirMascota(nombre: string): void {
    this.mascotaActiva.set(this.mascotaActiva() === nombre ? null : nombre);
  }

  confirmarMascota(): void {
    const nombre = this.nuevaMascota.trim();
    if (!nombre) return;
    this.mascotas.update(lista => lista.some(item => item.toLowerCase() === nombre.toLowerCase()) ? lista : [...lista, nombre]);
    this.mascotaActiva.set(nombre);
    this.nuevaMascota = '';
    this.agregandoMascota.set(false);
  }

  abrirDescuento(): void {
    this.editandoDescuento.set(true);
    setTimeout(() => this.descuentoCampo?.nativeElement.select());
  }

  seleccionarMonto(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  onDescuentoTexto(valor: string): void {
    this.descuentoTexto.set(valor);
    this.descuento.set(this.leerMonto(valor));
  }

  formatearDescuento(event: FocusEvent): void {
    const monto = this.leerMonto((event.target as HTMLInputElement).value);
    this.descuento.set(monto);
    this.descuentoTexto.set(monto.toFixed(2));
    if (monto === 0) this.editandoDescuento.set(false);
  }

  abrirNuevoCliente(): void {
    this.nuevoCliente = { nombres: '', apellidos: '' };
    this.clienteError.set(null);
    this.showNuevoCliente.set(true);
  }

  crearCliente(): void {
    const nombres = this.nuevoCliente.nombres.trim();
    const apellidos = this.nuevoCliente.apellidos.trim();
    if (!nombres || !apellidos) {
      this.clienteError.set('Nombres y apellidos son obligatorios.');
      return;
    }
    this.guardandoCliente.set(true);
    this.clienteError.set(null);
    this.clientesSvc.create({
      nombres,
      apellidos,
      tipo_documento: 'DNI',
      numero_documento: '',
      telefono: '',
      email: '',
      direccion: '',
      activo: true,
      observaciones: '',
    }).subscribe({
      next: () => {
        this.guardandoCliente.set(false);
        this.showNuevoCliente.set(false);
        this.cargarClientesBD(`${nombres} ${apellidos}`);
      },
      error: (err) => {
        this.clienteError.set(this.mensajeVisible(err?.error?.message, 'No se pudo registrar el cliente.'));
        this.guardandoCliente.set(false);
      }
    });
  }

  enviarACaja(): void {
    this.registrar(false);
  }

  onRecibidoTexto(valor: string): void {
    this.recibidoTexto.set(valor);
    this.montoRecibido.set(this.leerMonto(valor));
    if (this.montoRecibido() + 0.001 >= this.totalCart()) this.error.set(null);
  }

  formatearRecibido(event: FocusEvent): void {
    const monto = this.leerMonto((event.target as HTMLInputElement).value);
    this.montoRecibido.set(monto);
    this.recibidoTexto.set(monto.toFixed(2));
    if (monto + 0.001 >= this.totalCart()) this.error.set(null);
  }

  cobrarDirecto(): void {
    if (this.metodoPago() === 'efectivo' && this.montoRecibido() + 0.001 < this.totalCart()) {
      this.error.set('El monto recibido no cubre el total.');
      return;
    }
    this.registrar(true);
  }

  irACaja(): void {
    this.visorTicket.set(false);
    this.router.navigate(['/admin/caja']);
  }

  cerrarVisor(): void {
    this.visorTicket.set(false);
  }

  private registrar(cobrar: boolean): void {
    if (this.cart().length === 0) return;
    const clienteId = Number(this.clienteSeleccionadoId);
    if (!clienteId) {
      this.error.set('Selecciona un cliente para registrar la venta.');
      return;
    }
    if (this.descuento() > this.subtotalCart()) {
      this.error.set('El descuento no puede superar el subtotal.');
      return;
    }

    this.savingVenta.set(true);
    this.error.set(null);
    const mascota = this.mascotaActiva()?.trim();
    const monto = this.metodoPago() === 'efectivo' ? this.montoRecibido() : this.totalCart();

    this.ventasSvc.create({
      cliente_id: clienteId,
      descuento: this.descuentoAplicado(),
      observaciones: mascota ? `Mascota: ${mascota}` : undefined,
      metodo_pago: cobrar ? this.metodoPago() : undefined,
      monto_pagado: cobrar ? monto : undefined,
      items: this.cart().map(i => ({
        producto_id: i.producto.id,
        cantidad: i.cantidad,
        precio_unitario: i.producto.precio,
      })),
    }).subscribe({
      next: (venta) => {
        const id = venta?.id ?? null;
        this.ticketGeneradoId.set(id);
        this.savingVenta.set(false);
        this.mascotas.set([]);
        this.mascotaActiva.set(null);
        this.limpiarCarrito();
        this.cargarProductosBD();
        if (!id) return;
        if (cobrar) {
          this.notify.success(`Ticket #${id}. El cobro quedó registrado y el stock se actualizó.`);
          this.visorTicket.set(true);
          return;
        }
        this.notify.success(`Ticket #${id}. La orden quedó pendiente por cobrar en Caja.`);
      },
      error: (err) => {
        this.notify.error(this.mensajeVisible(err?.error?.message, 'No se pudo registrar la venta.'));
        this.savingVenta.set(false);
      }
    });
  }

  private filtrar(lista: ProductoItem[]): ProductoItem[] {
    const q = this.busqueda.toLowerCase().trim();
    const cat = this.categoriaSeleccionada.toLowerCase();
    return lista.filter(p => {
      const grupo = (p.ejemplo ? p.categoria : this.grupoDe(p)).toLowerCase();
      const coincideCat = cat === 'todas' || grupo === cat;
      if (!coincideCat) return false;
      if (!q) return true;
      return p.nombre.toLowerCase().includes(q) || (p.codigo_barras || '').toLowerCase().includes(q);
    });
  }

  private ejemplosFiltrados(): ProductoItem[] {
    return this.filtrar(this.ejemplos);
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

  private leerMonto(valor: string): number {
    const limpio = valor.replace(',', '.').replace(/[^\d.]/g, '');
    const monto = Number(limpio);
    return Number.isFinite(monto) ? this.redondear(monto) : 0;
  }

  private mensajeVisible(message: string | undefined, fallback: string): string {
    if (!message || /SQLSTATE|SQL:|Unknown column|Connection:/i.test(message)) return fallback;
    return message;
  }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }
}
