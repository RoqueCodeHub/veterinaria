import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface MovimientoStock {
  id: number;
  producto_id: number;
  user_id: number;
  variante_id?: number | null;
  producto?: { id: number; nombre: string; codigo: string };
  variante?: { id: number; presentation?: string; sku?: string } | null;
  user?: { id: number; name: string };
  tipo: 'entrada' | 'salida';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  precio_unitario: string;
  motivo?: string;
  referencia?: string;
  created_at: string;
}

export interface MovimientoForm {
  producto_id: number;
  variante_id?: number | null;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  motivo?: string;
}

interface MovimientosResponse {
  message: string;
  total: number;
  movimientos: MovimientoStock[];
}

@Injectable({ providedIn: 'root' })
export class StockService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/movimientos-stock`;

  getAll(): Observable<MovimientoStock[]> {
    return this.http.get<MovimientosResponse>(this.url).pipe(map(r => r.movimientos));
  }

  getById(id: number): Observable<MovimientoStock> {
    return this.http.get<MovimientoStock>(`${this.url}/${id}`);
  }

  getByProducto(productoId: number): Observable<MovimientoStock[]> {
    return this.http.get<MovimientosResponse>(`${this.url}/producto/${productoId}`).pipe(map(r => r.movimientos));
  }

  create(data: MovimientoForm): Observable<MovimientoStock> {
    return this.http.post<MovimientoStock>(this.url, data);
  }
}
