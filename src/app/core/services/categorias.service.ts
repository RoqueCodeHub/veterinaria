import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoriaForm {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

interface CategoriasResponse {
  message: string;
  total: number;
  categorias: Categoria[];
}

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/categorias`;

  getAll(): Observable<Categoria[]> {
    return this.http.get<CategoriasResponse>(this.url).pipe(map(r => r.categorias));
  }

  getById(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.url}/${id}`);
  }

  create(data: CategoriaForm): Observable<Categoria> {
    return this.http.post<Categoria>(this.url, data);
  }

  update(id: number, data: Partial<CategoriaForm>): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
