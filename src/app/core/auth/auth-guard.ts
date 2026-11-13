import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstAllowedPath } from './admin-nav';
import { AuthService } from './auth';
import { PortalAuthService } from './portal-auth';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const needed = route.data['permissions'] as string[] | undefined;
  if (!needed?.length || auth.can(...needed)) return true;
  const next = firstAllowedPath((...permissions) => auth.can(...permissions));
  return next ? router.createUrlTree([next]) : router.createUrlTree(['/login']);
};

export const portalGuard: CanActivateFn = () => {
  const portal = inject(PortalAuthService);
  const router = inject(Router);
  if (portal.isLoggedIn() && portal.canAccess()) return true;
  portal.clear();
  return router.createUrlTree(['/portal/login']);
};
