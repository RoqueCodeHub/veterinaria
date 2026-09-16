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
  observaciones: string | null;
  fecha: string | null;
}

export interface VentaForm {
  cliente_id?: number;
  trabajador_id?: number;
  descuento?: number;
  observaciones?: string;
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

  getAll(): Observable<Venta[]> {
    return this.http.get<VentasResponse>(this.url).pipe(map(r => r.ventas));
  }

  getById(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.url}/${id}`);
  }

  create(data: VentaForm): Observable<Venta> {
    return this.http.post<Venta>(this.url, data);
  }

  anular(id: number): Observable<Venta> {
    return this.http.patch<Venta>(`${this.url}/${id}/anular`, {});
  }
}
