import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Proveedor {
  id: number;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  tipo_documento?: string;
  numero_documento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  empresa?: string;
  activo: boolean;
}

export interface ProveedorForm {
  nombres: string;
  apellidos: string;
  tipo_documento?: string;
  numero_documento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  empresa?: string;
  activo?: boolean;
}

interface ProveedoresResponse {
  message: string;
  total: number;
  proveedores: Proveedor[];
}

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/proveedores`;

  getAll(): Observable<Proveedor[]> {
    return this.http.get<ProveedoresResponse>(this.url).pipe(map(r => r.proveedores));
  }

  getById(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.url}/${id}`);
  }

  create(data: ProveedorForm): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.url, data);
  }

  update(id: number, data: Partial<ProveedorForm>): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
