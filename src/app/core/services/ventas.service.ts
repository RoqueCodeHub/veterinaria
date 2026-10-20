import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SaleItem {
  id?: number;
  item_type?: 'producto' | 'servicio';
  variant_id?: number;
  producto_id?: number;
  batch_id?: number;
  description?: string;
  quantity?: number;
  cantidad?: number;
  unit_price?: number;
  precio_unitario?: number;
  discount?: number;
  line_total?: number;
  subtotal?: number;
  producto?: { id: number; nombre: string };
}

export interface SalePayment {
  method: string;
  amount: number;
}

export interface Sale {
  id: number;
  series?: string;
  number?: number;
  subtotal: string;
  discount: string;
  descuento?: string | number | null;
  total: string;            // Cambiado a string para compatibilidad con parseFloat() en dashboard.ts
  status: string;           // Nombre V1 ('pending', 'completed', 'voided')
  estado: string;           // Compatibilidad legacy ('pendiente', 'activa', 'completada', 'anulada')
  payment_status?: string;
  change_amount?: number;

  // Campos de compatibilidad para plantillas HTML (ventas.html)
  metodo_pago?: string | null;
  monto_pagado?: string | number | null;
  observaciones?: string | null;
  notes?: string | null;

  // Modelos de cliente (V1 y compatibilidad legacy)
  customer?: { id: number; displayName?: string; persona?: { nombres: string; apellidos: string; numero_documento: string } } | null;
  cliente?: { id: number; nombre_completo: string } | null;

  user?: { id: number; name: string } | null;
  trabajador?: { id: number; nombre_completo: string } | null;

  items: SaleItem[];
  payments?: SalePayment[];
  invoices?: any[];
  created_at?: string;
  fecha?: string | null;
  message?: string;
}

export interface StoreSaleForm {
  pending?: boolean;
  invoice_type?: 'boleta' | 'factura';
  series?: string;
  customer_id?: number;
  cliente_id?: number;
  pet_id?: number;
  discount?: number;
  descuento?: number;
  idempotency_key?: string;
  notes?: string;
  observaciones?: string;
  metodo_pago?: string;
  monto_pagado?: number;
  items: {
    variant_id?: number;
    producto_id?: number;
    item_type?: 'producto' | 'servicio';
    description?: string;
    quantity?: number;
    cantidad?: number;
    unit_price?: number;
    precio_unitario?: number;
    discount?: number;
  }[];
  payments?: { method: string; amount: number }[];
}

// Aliases de exportación para mantener compatibilidad
export type Venta = Sale;
export type VentaForm = StoreSaleForm;
export type VentaItem = SaleItem;

interface VentasResponse {
  message?: string;
  ventas?: any[];
  venta?: any;
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/ventas`;

  getAll(estado?: string): Observable<Sale[]> {
    const params: Record<string, string> = {};
    if (estado) {
      params['estado'] = estado;
    }

    return this.http
      .get<VentasResponse>(this.url, { params })
      .pipe(
        map(res => (res.ventas || []).map(item => this.mapSale(item)))
      );
  }

  getById(id: number): Observable<Sale> {
    return this.http
      .get<VentasResponse>(`${this.url}/${id}`)
      .pipe(map(res => this.mapSale(res.venta)));
  }

  create(data: StoreSaleForm): Observable<Sale> {
    const payload = {
      cliente_id: data.cliente_id || data.customer_id,
      descuento: data.descuento ?? data.discount ?? 0,
      observaciones: data.observaciones || data.notes,
      metodo_pago: data.metodo_pago,
      monto_pagado: data.monto_pagado,
      items: (data.items || []).map(item => ({
        producto_id: item.producto_id || item.variant_id,
        cantidad: item.cantidad || item.quantity || 1,
        precio_unitario: item.precio_unitario || item.unit_price,
      })),
    };

    return this.http
      .post<VentasResponse>(this.url, payload)
      .pipe(map(res => this.mapSale(res.venta)));
  }

  cobrar(
    id: number,
    data: {
      payments?: { method: string; amount: number }[];
      metodo_pago?: string;
      monto_pagado?: number;
      invoice_type?: string;
    }
  ): Observable<Sale> {
    const payload = {
      metodo_pago: data.metodo_pago || data.payments?.[0]?.method,
      monto_pagado: data.monto_pagado ?? data.payments?.[0]?.amount,
    };

    return this.http
      .patch<VentasResponse>(`${this.url}/${id}/cobrar`, payload)
      .pipe(map(res => this.mapSale(res.venta)));
  }

  anular(id: number, _reason: string = 'Anulación desde caja'): Observable<Sale> {
    return this.http
      .patch<VentasResponse>(`${this.url}/${id}/anular`, {})
      .pipe(
        map(res => {
          const sale = this.mapSale(res.venta ?? { id, estado: 'anulada' });
          sale.message = res.message || `Venta #${id} anulada correctamente`;
          return sale;
        })
      );
  }

  private mapSale(raw: any): Sale {
    if (!raw) return raw;

    const status = raw.status || raw.estado || 'completed';
    const estadoMap: Record<string, string> = {
      'pending': 'pendiente',
      'completed': 'activa',
      'voided': 'anulada',
      'pendiente': 'pendiente',
      'completada': 'activa',
      'anulada': 'anulada'
    };

    const estado = estadoMap[status] || status;

    // Obtener información de pagos
    const payments = raw.payments || [];
    const primerPago = payments[0];
    const metodoPago = primerPago?.method || raw.metodo_pago || 'efectivo';
    const montoPagado = payments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0) || raw.monto_pagado || raw.total || 0;

    // Construcción del cliente para vistas antiguas
    let nombreCliente = 'Cliente Varios';
    if (raw.customer) {
      if (raw.customer.persona) {
        nombreCliente = `${raw.customer.persona.nombres || ''} ${raw.customer.persona.apellidos || ''}`.trim();
      } else if (raw.customer.name) {
        nombreCliente = raw.customer.name;
      }
    } else if (raw.cliente?.nombre_completo) {
      nombreCliente = raw.cliente.nombre_completo;
    }

    const descuentoVal = raw.discount ?? raw.descuento ?? 0;

    return {
      ...raw,
      id: raw.id,
      subtotal: String(raw.subtotal ?? raw.total ?? 0),
      discount: String(descuentoVal),
      descuento: descuentoVal,
      total: String(raw.total ?? 0),
      status: status,
      estado: estado,
      metodo_pago: metodoPago,
      monto_pagado: montoPagado,
      observaciones: raw.notes || raw.observaciones || null,
      notes: raw.notes || raw.observaciones || null,
      fecha: raw.created_at || raw.fecha || null,
      created_at: raw.created_at || raw.fecha,
      customer: raw.customer,
      cliente: raw.customer ? { id: raw.customer.id, nombre_completo: nombreCliente } : raw.cliente,
      items: (raw.items || []).map((it: any) => ({
        ...it,
        producto_id: it.variant_id || it.producto_id,
        cantidad: it.quantity || it.cantidad,
        precio_unitario: it.unit_price || it.precio_unitario,
        subtotal: it.line_total || it.subtotal,
        producto: it.producto || (it.description ? { id: it.variant_id || 0, nombre: it.description } : undefined)
      }))
    };
  }
}