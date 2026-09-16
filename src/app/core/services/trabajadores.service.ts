import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Trabajador {
  id: number;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  cargo?: string;
  activo: boolean;
}

interface TrabajadoresResponse {
  message: string;
  total: number;
  trabajadores: Trabajador[];
}

@Injectable({ providedIn: 'root' })
export class TrabajadoresService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/trabajadores`;

  getAll(): Observable<Trabajador[]> {
    return this.http.get<TrabajadoresResponse>(this.url).pipe(map(r => r.trabajadores));
  }
}
