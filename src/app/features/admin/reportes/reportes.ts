import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { VentasService, Venta } from '../../../core/services/ventas.service';
import { ClientesService, Cliente } from '../../../core/services/clientes.service';
import { StockService, MovimientoStock } from '../../../core/services/stock.service';

type RangoFecha = 'hoy' | 'semana' | 'mes' | 'mes_anterior' | 'custom';
type TabReporte = 'financiero' | 'inventario' | 'clientes';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  private productosSvc = inject(ProductosService);
  private ventasSvc = inject(VentasService);
  private clientesSvc = inject(ClientesService);
  private stockSvc = inject(StockService);

  loading = signal(true);
  error = signal<string | null>(null);

  // Datos base desde la API
  productos = signal<Producto[]>([]);
  ventas = signal<Venta[]>([]);
  clientes = signal<Cliente[]>([]);
  stockBajo = signal<Producto[]>([]);
  porVencer = signal<Producto[]>([]);

  // Pestaña Activa y Rango de Fechas
  tabActiva = signal<TabReporte>('financiero');
  rangoSeleccionado = signal<RangoFecha>('mes');
  fechaInicio = signal<string>('');
  fechaFin = signal<string>('');

  ngOnInit(): void {
    this.initFechasDefecto();
    this.loadAll();
  }

  initFechasDefecto(): void {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    this.fechaInicio.set(primerDiaMes.toISOString().slice(0, 10));
    this.fechaFin.set(hoy.toISOString().slice(0, 10));
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      productos: this.productosSvc.getAll(),
      stockBajo: this.productosSvc.getStockBajo(),
      porVencer: this.productosSvc.getPorVencer(),
      ventas: this.ventasSvc.getAll(),
      clientes: this.clientesSvc.getAll(),
    }).subscribe({
      next: ({ productos, stockBajo, porVencer, ventas, clientes }) => {
        this.productos.set(productos || []);
        this.stockBajo.set(stockBajo || []);
        this.porVencer.set(porVencer || []);
        this.ventas.set(ventas || []);
        this.clientes.set(clientes || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo consolidar la información general de reportes.');
        this.loading.set(false);
      }
    });
  }

  // Cambiar rango de fechas prestablecido
  setRangoFecha(rango: RangoFecha): void {
    this.rangoSeleccionado.set(rango);
    const hoy = new Date();

    if (rango === 'hoy') {
      const hoyStr = hoy.toISOString().slice(0, 10);
      this.fechaInicio.set(hoyStr);
      this.fechaFin.set(hoyStr);
    } else if (rango === 'semana') {
      const sieteDiasAtras = new Date();
      sieteDiasAtras.setDate(hoy.getDate() - 7);
      this.fechaInicio.set(sieteDiasAtras.toISOString().slice(0, 10));
      this.fechaFin.set(hoy.toISOString().slice(0, 10));
    } else if (rango === 'mes') {
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      this.fechaInicio.set(inicioMes.toISOString().slice(0, 10));
      this.fechaFin.set(hoy.toISOString().slice(0, 10));
    } else if (rango === 'mes_anterior') {
      const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      this.fechaInicio.set(inicioMesAnt.toISOString().slice(0, 10));
      this.fechaFin.set(finMesAnt.toISOString().slice(0, 10));
    }
  }

  // Ventas Filtradas por el Rango de Fechas
  ventasFiltradas = computed(() => {
    const fIni = this.fechaInicio();
    const fFin = this.fechaFin();

    return this.ventas().filter(v => {
      const fVenta = (v.fecha || '').slice(0, 10);
      const noAnulada = (v.estado || '').toLowerCase() !== 'anulada';
      if (!fIni || !fFin) return noAnulada;
      return noAnulada && fVenta >= fIni && fVenta <= fFin;
    });
  });

  // ----------------------------------------------------
  // METRICAS PESTAÑA 1: FINANCIERO Y VENTAS
  // ----------------------------------------------------
  ingresosFiltrados = computed(() => {
    return this.ventasFiltradas().reduce((sum, v) => sum + (parseFloat(v.total as any) || 0), 0);
  });

  ticketPromedio = computed(() => {
    const total = this.ventasFiltradas().length;
    return total > 0 ? this.ingresosFiltrados() / total : 0;
  });

  // Ganancia Bruta Estimada (Precio Venta - Precio Compra)
  gananciaBrutaEstimada = computed(() => {
    let gananciaTotal = 0;
    const prodsMap = new Map(this.productos().map(p => [p.id, p]));

    for (const v of this.ventasFiltradas()) {
      const detalles = (v as any).detalles || (v as any).items || [];
      if (detalles.length > 0) {
        for (const item of detalles) {
          const prod = prodsMap.get(item.producto_id);
          const pCompra = Number(prod?.precio_compra) || 0;
          const pVenta = Number(item.precio_unitario || item.precio) || Number(prod?.precio_venta) || 0;
          const cant = Number(item.cantidad) || 1;
          gananciaTotal += (pVenta - pCompra) * cant;
        }
      } else {
        // Estimación estándar del 35% de margen si no vienen detalles anidados
        gananciaTotal += (parseFloat(v.total as any) || 0) * 0.35;
      }
    }
    return gananciaTotal;
  });

  // Desglose por Métodos de Pago
  metodosPagoResumen = computed(() => {
    const mapa = { efectivo: 0, yape_plin: 0, tarjeta: 0, transferencia: 0 };
    let totalGeneral = 0;

    for (const v of this.ventasFiltradas()) {
      const monto = parseFloat(v.total as any) || 0;
      totalGeneral += monto;
      const mp = ((v as any).metodo_pago || (v as any).forma_pago || 'efectivo').toLowerCase();

      if (mp.includes('yape') || mp.includes('plin') || mp.includes('qr')) {
        mapa.yape_plin += monto;
      } else if (mp.includes('tarjeta') || mp.includes('pos') || mp.includes('visa')) {
        mapa.tarjeta += monto;
      } else if (mp.includes('transf') || mp.includes('banco')) {
        mapa.transferencia += monto;
      } else {
        mapa.efectivo += monto;
      }
    }

    return {
      efectivo: mapa.efectivo,
      yape_plin: mapa.yape_plin,
      tarjeta: mapa.tarjeta,
      transferencia: mapa.transferencia,
      pctEfectivo: totalGeneral ? (mapa.efectivo / totalGeneral) * 100 : 0,
      pctYape: totalGeneral ? (mapa.yape_plin / totalGeneral) * 100 : 0,
      pctTarjeta: totalGeneral ? (mapa.tarjeta / totalGeneral) * 100 : 0,
      pctTransf: totalGeneral ? (mapa.transferencia / totalGeneral) * 100 : 0,
    };
  });

  // ----------------------------------------------------
  // METRICAS PESTAÑA 2: INVENTARIO Y ALMACÉN
  // ----------------------------------------------------
  valorizacionAlmacenCosto = computed(() => {
    return this.productos().reduce((sum, p) => {
      const stock = Number(p.stock_disponible ?? p.stock_actual) || 0;
      const costo = Number(p.precio_compra) || 0;
      return sum + (stock * costo);
    }, 0);
  });

  valorizacionAlmacenVenta = computed(() => {
    return this.productos().reduce((sum, p) => {
      const stock = Number(p.stock_disponible ?? p.stock_actual) || 0;
      const pVenta = Number(p.precio_venta) || 0;
      return sum + (stock * pVenta);
    }, 0);
  });

  gananciaPotencialStock = computed(() => {
    return this.valorizacionAlmacenVenta() - this.valorizacionAlmacenCosto();
  });

  // Ranking Top 10 Productos Más Vendidos
  topProductosVendidos = computed(() => {
    const conteoMap = new Map<number, { id: number; nombre: string; cantidad: number; totalRecaudado: number }>();

    for (const v of this.ventasFiltradas()) {
      const detalles = (v as any).detalles || (v as any).items || [];
      for (const item of detalles) {
        const prodId = item.producto_id;
        const cant = Number(item.cantidad) || 1;
        const subtotal = Number(item.subtotal) || (cant * (Number(item.precio_unitario) || 0));
        const prodNombre = item.producto?.nombre || `Producto #${prodId}`;

        if (!conteoMap.has(prodId)) {
          conteoMap.set(prodId, { id: prodId, nombre: prodNombre, cantidad: 0, totalRecaudado: 0 });
        }
        const actual = conteoMap.get(prodId)!;
        actual.cantidad += cant;
        actual.totalRecaudado += subtotal;
      }
    }

    return Array.from(conteoMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  });

  // ----------------------------------------------------
  // METRICAS PESTAÑA 3: CLIENTES Y VENDEDORES
  // ----------------------------------------------------
  topClientesVIP = computed(() => {
    const clientesMap = new Map<number, { id: number; nombre: string; comprasCount: number; totalGastado: number }>();

    for (const v of this.ventasFiltradas()) {
      const cId = (v as any).cliente_id || v.cliente?.id || 0;
      if (!cId) continue;

      const nombre = v.cliente?.nombre_completo || (v.cliente as any)?.nombre || `Cliente #${cId}`;
      const total = parseFloat(v.total as any) || 0;

      if (!clientesMap.has(cId)) {
        clientesMap.set(cId, { id: cId, nombre, comprasCount: 0, totalGastado: 0 });
      }
      const actual = clientesMap.get(cId)!;
      actual.comprasCount += 1;
      actual.totalGastado += total;
    }

    return Array.from(clientesMap.values())
      .sort((a, b) => b.totalGastado - a.totalGastado)
      .slice(0, 10);
  });
}