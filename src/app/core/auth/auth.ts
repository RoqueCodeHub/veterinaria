import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  roles?: string[];
  puede_cobrar?: boolean;
}

// Estructura real que devuelve la API
export interface LoginResponse {
  message: string;
  token: string;
  type: string;
  user: {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    role_id: number;
    role: {
      id: number;
      nombre: string;
      descripcion: string;
    };
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) { }


  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          const { token, user } = response;
          this.saveToken(token);
          this.saveUser(this.mapUser(user));
        })
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}).pipe(
      tap({
        next: () => this.clearSession(),
        error: () => this.clearSession()  // limpiar sesión local aunque el API falle
      })
    );
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const token = localStorage.getItem(this.TOKEN_KEY);
    // Descartar valores corruptos que pudo haber guardado código anterior
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
  }

  getUser(): User | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  refreshProfile(): Observable<User | null> {
    return this.http.get<{ user: LoginResponse['user'] & { roles?: string[]; puede_cobrar?: boolean } }>(
      `${environment.apiUrl}/auth/me`,
    ).pipe(
      tap((response) => this.saveUser(this.mapUser(response.user))),
      map(() => this.getUser()),
    );
  }

  private mapUser(user: LoginResponse['user'] & { roles?: string[]; puede_cobrar?: boolean }): User {
    return {
      id: user.id,
      nombre: user.name,
      email: user.email,
      activo: true,
      email_verified_at: user.email_verified_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
      roles: user.roles ?? [],
      puede_cobrar: user.puede_cobrar !== false,
    };
  }

  private saveToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  private saveUser(user: User): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }
}
