import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth';
import { PortalAuthService } from './portal-auth';

let redirecting = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const staff = inject(AuthService);
  const portal = inject(PortalAuthService);
  const router = inject(Router);
  let headers = req.headers.set('Accept', 'application/json');
  const url = req.url;
  const isPortal = url.includes('/api/v1/portal');
  const isPublicAuth = /\/auth\/(login|forgot-password|reset-password)(\?|$)/.test(url)
    || url.includes('/portal/login');

  if (isPortal && !url.includes('/portal/login')) {
    const token = portal.getToken();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  } else if (url.includes('/api/v1/') && !isPublicAuth) {
    const token = staff.getToken();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  }

  return next(req.clone({ headers })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isPublicAuth && !redirecting) {
        redirecting = true;
        if (isPortal) {
          portal.clear();
          void router.navigate(['/portal/login']).finally(releaseRedirect);
        } else if (url.includes('/api/v1/')) {
          staff.clearSession();
          void router.navigate(['/login'], { queryParams: { sesion: 'vencida' } }).finally(releaseRedirect);
        } else {
          redirecting = false;
        }
      }
      return throwError(() => error);
    }),
  );
};

function releaseRedirect(): void {
  setTimeout(() => {
    redirecting = false;
  }, 1500);
}
