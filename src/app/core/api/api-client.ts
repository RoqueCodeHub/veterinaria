import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope, Page, PageQuery } from './envelope';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiV1Url.replace(/\/$/, '');

  getData<T>(path: string, query?: PageQuery): Observable<T> {
    return this.http.get<ApiEnvelope<T>>(this.url(path), { params: this.params(query) }).pipe(map((body) => body.data));
  }

  getPage<T>(path: string, query: PageQuery = {}): Observable<Page<T>> {
    return this.getData<Page<T>>(path, query);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiEnvelope<T>>(this.url(path), body).pipe(map((response) => response.data));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiEnvelope<T>>(this.url(path), body).pipe(map((response) => response.data));
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<ApiEnvelope<T>>(this.url(path), body).pipe(map((response) => response.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiEnvelope<T>>(this.url(path)).pipe(map((response) => response.data));
  }

  message(path: string, method: 'post' | 'put', body: unknown): Observable<string> {
    const request = method === 'post'
      ? this.http.post<ApiEnvelope<unknown>>(this.url(path), body)
      : this.http.put<ApiEnvelope<unknown>>(this.url(path), body);
    return request.pipe(map((response) => response.message));
  }

  blob(path: string, query?: PageQuery): Observable<Blob> {
    return this.http.get(this.url(path), { params: this.params(query), responseType: 'blob' });
  }

  postForm<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<ApiEnvelope<T>>(this.url(path), form).pipe(map((response) => response.data));
  }

  private url(path: string): string {
    return `${this.base}/${path.replace(/^\//, '')}`;
  }

  private params(query?: PageQuery): HttpParams {
    let params = new HttpParams();
    if (!query) return params;
    if (query.page) params = params.set('page', query.page);
    if (query.perPage) params = params.set('per_page', query.perPage);
    if (query.q) params = params.set('q', query.q);
    for (const [key, value] of Object.entries(query.extra ?? {})) {
      if (value === null || value === undefined || value === '') continue;
      params = params.set(key, String(value));
    }
    return params;
  }
}
