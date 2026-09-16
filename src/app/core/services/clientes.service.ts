import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Cliente {
  id: number;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  tipo_documento?: string;
  numero_documento?: string;
  telefono?: string;
  email?: string | null;
  direccion?: string;
  activo: boolean;
  observaciones?: string | null;
}

export interface ClienteForm {
  nombres: string;
  apellidos: string;
  tipo_documento?: string;
  numero_documento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo?: boolean;
  observaciones?: string;
}

interface ClientesResponse {
  message: string;
  total: number;
  clientes: Cliente[];
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/clientes`;

  getAll(): Observable<Cliente[]> {
    return this.http.get<ClientesResponse>(this.url).pipe(map(r => r.clientes));
  }

  getById(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.url}/${id}`);
  }

  create(data: ClienteForm): Observable<Cliente> {
    return this.http.post<Cliente>(this.url, data);
  }

  update(id: number, data: Partial<ClienteForm>): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
