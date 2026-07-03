import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { OrganizationService } from '../services/organization.service';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

const LICENSE_FREE_ROUTES = new Set(['', '/', '/login', '/sso', '/license-pending']);
const ALWAYS_ALLOWED_ROUTES = new Set(['/dashboard', '/settings']);

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const orgSvc = inject(OrganizationService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const routePath = '/' + state.url.split('/')[1].split('?')[0];

  // License-pending page is always accessible to logged-in users
  if (routePath === '/license-pending') {
    return true;
  }

  // Check cached accesspolicy from localStorage first — avoids an API call on every navigation
  const accesspolicy = localStorage.getItem('accesspolicy');
  const licenseStatus = localStorage.getItem('licenseStatus');

  if (accesspolicy && licenseStatus) {
    // No active license → redirect to license-pending
    if (licenseStatus !== 'ACTIVE' && licenseStatus !== 'GRACE') {
      router.navigate(['/license-pending']);
      return false;
    }
    try {
      const features = JSON.parse(accesspolicy) as string[];
      if (ALWAYS_ALLOWED_ROUTES.has(routePath) || LICENSE_FREE_ROUTES.has(routePath)) {
        return true;
      }
      if (features && features.length > 0) {
        const isAllowed = features.includes(routePath);
        if (!isAllowed) {
          router.navigate(['/dashboard']);
          return false;
        }
      }
      return true;
    } catch (e) { /* fall through to API call */ }
  }

  // No cached policy — fetch from license API once and cache for future navigations.
  return orgSvc.getMyLicenseStatus().pipe(
    map(status => {
      const features = status?.features ?? [];
      const licStatus = status?.status ?? 'UNKNOWN';
      localStorage.setItem('accesspolicy', JSON.stringify(features));
      localStorage.setItem('licenseStatus', String(licStatus));

      // SYSTEM_ADMIN (no org) — always allow through
      if (!status?.organizationId) {
        return true;
      }

      // License not active — send to license-pending page
      if (licStatus !== 'ACTIVE' && licStatus !== 'GRACE') {
        router.navigate(['/license-pending']);
        return false;
      }

      if (ALWAYS_ALLOWED_ROUTES.has(routePath) || LICENSE_FREE_ROUTES.has(routePath)) {
        return true;
      }
      if (features.length > 0) {
        const isAllowed = features.includes(routePath);
        if (!isAllowed) {
          router.navigate(['/dashboard']);
          return false;
        }
      }
      return true;
    }),
    catchError(() => of(true))
  );
};