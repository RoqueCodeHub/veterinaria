import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface VentaItem {
  id?: number;
  producto_id: number;
  producto?: { id: number; nombre: string };
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  cliente?: { id: number; nombre_completo: string } | null;
  trabajador?: { id: number; nombre_completo: string } | null;
  items: VentaItem[];
  descuento: string;
  total: string;
  estado: string;
  metodo_pago?: string | null;
  monto_pagado?: string | number | null;
  observaciones: string | null;
  fecha: string | null;
}

export interface VentaForm {
  cliente_id?: number;
  trabajador_id?: number;
  descuento?: number;
  observaciones?: string;
  metodo_pago?: string;
  monto_pagado?: number;
  items: { producto_id: number; cantidad: number; precio_unitario: number }[];
}

interface VentasResponse {
  message: string;
  total: number;
  ventas: Venta[];
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/ventas`;

  getAll(estado?: string): Observable<Venta[]> {
    const params = estado ? { estado } : undefined;
    return this.http.get<VentasResponse>(this.url, { params }).pipe(map(r => r.ventas));
  }

  cobrar(id: number, data: { metodo_pago: string; monto_pagado: number }): Observable<Venta> {
    return this.http.patch<{ venta: Venta }>(`${this.url}/${id}/cobrar`, data).pipe(map(r => r.venta));
  }

  getById(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.url}/${id}`);
  }

  create(data: VentaForm): Observable<Venta> {
    return this.http.post<{ venta: Venta }>(this.url, data).pipe(map(r => r.venta));
  }

  anular(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.url}/${id}/anular`, {});
  }
}
