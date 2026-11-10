import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PresentacionStock {
  id: number;
  presentacion: string;
  sku?: string;
  stock: number;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  codigo?: string;
  categoria_id?: number | null;
  categoria?: string;
  proveedor?: { id: number; nombre: string } | null;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_disponible?: number;
  stock_minimo: number;
  stock_bajo: boolean;
  unidad_medida?: string;
  fecha_vencimiento?: string;
  requiere_receta?: boolean;
  activo?: boolean;
  presentacion?: string | null;
  tipo_presentacion?: string | null;
  presentaciones?: PresentacionStock[];
  principio_activo?: string | null;
  concentracion?: string | null;
  tipo_receta?: 'OTC' | 'RECETA_SIMPLE' | 'CONTROLADO' | null;
  especies_destino?: string[];
  cadena_frio?: boolean;
  tiempo_retiro_dias?: number | null;
  permite_fraccionamiento?: boolean;
  unidad_dispensacion?: string | null;
  factor_conversion?: number | null;
  precio_venta_dosis?: number | null;
  codigo_lote?: string | null;
  proveedor_id?: number | null;
}

export interface ProductoForm {
  nombre: string;
  descripcion?: string | null;
  codigo?: string | null;
  categoria_id?: number | null;
  proveedor_id?: number | null;
  precio_compra: number;
  precio_venta: number;
  stock_actual?: number;
  stock_minimo: number;
  unidad_medida?: string | null;
  fecha_vencimiento?: string | null;
  requiere_receta?: boolean;
  activo?: boolean;
}

interface ProductosResponse {
  message: string;
  total: number;
  productos: Producto[];
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/productos`;

  getAll(): Observable<Producto[]> {
    return this.http.get<ProductosResponse>(this.url).pipe(map(r => r.productos));
  }

  getById(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.url}/${id}`);
  }

  create(data: ProductoForm): Observable<Producto> {
    return this.http.post<Producto>(this.url, data);
  }

  update(id: number, data: Partial<ProductoForm>): Observable<Producto> {
    return this.http.put<Producto>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  getStockBajo(): Observable<Producto[]> {
    return this.http.get<ProductosResponse>(`${this.url}/stock-bajo`).pipe(map(r => r.productos));
  }

  getPorVencer(): Observable<Producto[]> {
    return this.http.get<ProductosResponse>(`${this.url}/por-vencer`).pipe(map(r => r.productos));
  }
}
