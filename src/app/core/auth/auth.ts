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
  remember?: boolean;
}

export interface PasswordResetRequest {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly REMEMBER_EMAIL_KEY = 'auth_remember_email';
  private readonly platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) { }


  login(credentials: LoginRequest): Observable<LoginResponse> {
    const remember = credentials.remember === true;
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        email: credentials.email,
        password: credentials.password,
        remember,
      })
      .pipe(
        tap((response) => {
          const { token, user } = response;
          this.persistSession(token, this.mapUser(user), remember);
          this.persistRememberedEmail(remember ? credentials.email : null);
        })
      );
  }

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(payload: PasswordResetRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, payload);
  }

  rememberedEmail(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(this.REMEMBER_EMAIL_KEY);
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
    const token = this.readStored(this.TOKEN_KEY);
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
  }

  getUser(): User | null {
    const userStr = this.readStored(this.USER_KEY);
    return userStr ? JSON.parse(userStr) as User : null;
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

  private saveUser(user: User): void {
    const persistent = !isPlatformBrowser(this.platformId) || localStorage.getItem(this.TOKEN_KEY) !== null;
    this.writeStored(this.USER_KEY, JSON.stringify(user), persistent);
  }

  clearSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(this.TOKEN_KEY);
      storage.removeItem(this.USER_KEY);
    }
  }

  private persistSession(token: string, user: User, remember: boolean): void {
    this.clearSession();
    this.writeStored(this.TOKEN_KEY, token, remember);
    this.writeStored(this.USER_KEY, JSON.stringify(user), remember);
  }

  private persistRememberedEmail(email: string | null): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (email) {
      localStorage.setItem(this.REMEMBER_EMAIL_KEY, email);
      return;
    }
    localStorage.removeItem(this.REMEMBER_EMAIL_KEY);
  }

  private readStored(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  }

  private writeStored(key: string, value: string, persistent: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem(key, value);
  }
}
