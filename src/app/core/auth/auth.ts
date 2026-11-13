import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../api/envelope';

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  cliente_id?: number | null;
  roles: string[];
  permissions: string[];
}

interface LoginData {
  token: string;
  token_type: string;
  user: StaffUser;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly REMEMBER_EMAIL_KEY = 'auth_remember_email';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiV1Url;

  login(credentials: LoginRequest): Observable<StaffUser> {
    const remember = credentials.remember === true;
    return this.http.post<ApiEnvelope<LoginData>>(`${this.base}/auth/login`, {
      email: credentials.email,
      password: credentials.password,
    }).pipe(
      tap((response) => {
        this.persistSession(response.data.token, response.data.user, remember);
        this.persistRememberedEmail(remember ? credentials.email : null);
      }),
      map((response) => response.data.user),
    );
  }

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<ApiEnvelope<null>>(`${this.base}/auth/forgot-password`, { email }).pipe(
      map((response) => ({ message: response.message })),
    );
  }

  resetPassword(payload: { email: string; token: string; password: string; password_confirmation: string }): Observable<{ message: string }> {
    return this.http.post<ApiEnvelope<null>>(`${this.base}/auth/reset-password`, payload).pipe(
      map((response) => ({ message: response.message })),
    );
  }

  changePassword(currentPassword: string, password: string, confirmation: string): Observable<{ message: string }> {
    return this.http.put<ApiEnvelope<null>>(`${this.base}/auth/password`, {
      current_password: currentPassword,
      password,
      password_confirmation: confirmation,
    }).pipe(map((response) => ({ message: response.message })));
  }

  rememberedEmail(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(this.REMEMBER_EMAIL_KEY);
  }

  logout(): Observable<void> {
    return this.http.post<ApiEnvelope<null>>(`${this.base}/auth/logout`, {}).pipe(
      map(() => undefined),
      tap({
        next: () => this.clearSession(),
        error: () => this.clearSession(),
      }),
    );
  }

  getToken(): string | null {
    const token = this.readStored(this.TOKEN_KEY);
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
  }

  getUser(): StaffUser | null {
    const raw = this.readStored(this.USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StaffUser;
    return {
      ...parsed,
      roles: parsed.roles ?? [],
      permissions: parsed.permissions ?? [],
    };
  }

  can(...permissions: string[]): boolean {
    const owned = this.getUser()?.permissions ?? [];
    return permissions.some((permission) => owned.includes(permission));
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  refreshProfile(): Observable<StaffUser | null> {
    return this.http.get<ApiEnvelope<StaffUser>>(`${this.base}/auth/me`).pipe(
      tap((response) => this.saveUser(response.data)),
      map(() => this.getUser()),
    );
  }

  clearSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(this.TOKEN_KEY);
      storage.removeItem(this.USER_KEY);
    }
  }

  private saveUser(user: StaffUser): void {
    const persistent = !isPlatformBrowser(this.platformId) || localStorage.getItem(this.TOKEN_KEY) !== null;
    this.writeStored(this.USER_KEY, JSON.stringify(user), persistent);
  }

  private persistSession(token: string, user: StaffUser, remember: boolean): void {
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
