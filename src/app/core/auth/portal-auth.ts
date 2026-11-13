import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../api/envelope';
import { StaffUser } from './auth';

interface PortalLoginData {
  token: string;
  token_type: string;
  user: StaffUser;
}

@Injectable({ providedIn: 'root' })
export class PortalAuthService {
  private readonly TOKEN_KEY = 'portal_token';
  private readonly USER_KEY = 'portal_user';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiV1Url;

  login(email: string, password: string): Observable<StaffUser> {
    return this.http.post<ApiEnvelope<PortalLoginData>>(`${this.base}/portal/login`, { email, password }).pipe(
      tap((response) => this.persist(response.data.token, response.data.user)),
      map((response) => response.data.user),
    );
  }

  logout(): Observable<void> {
    this.clear();
    return of(undefined);
  }

  getToken(): string | null {
    const token = this.read(this.TOKEN_KEY);
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
  }

  getUser(): StaffUser | null {
    const raw = this.read(this.USER_KEY);
    return raw ? JSON.parse(raw) as StaffUser : null;
  }

  canAccess(): boolean {
    return (this.getUser()?.permissions ?? []).includes('portal.access');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  clear(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  }

  private persist(token: string, user: StaffUser): void {
    if (!isPlatformBrowser(this.platformId)) return;
    sessionStorage.setItem(this.TOKEN_KEY, token);
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private read(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return sessionStorage.getItem(key);
  }
}
