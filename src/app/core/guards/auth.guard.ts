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

  // accesspolicy is the per-user activation list set once at LOGIN (OPAC's
  // resolveUserCrmFeatures) and is never rewritten here — it's the one place that
  // correctly distinguishes "this user personally activated a license" from "the
  // tenant has some license". licenseStatus, by contrast, IS a tenant-wide concept
  // (is the org's license active/expired at all) and is fine to lazily fetch/cache
  // separately — the two must never be conflated or overwrite one another.
  const accesspolicy = localStorage.getItem('accesspolicy');
  const licenseStatus = localStorage.getItem('licenseStatus');

  const checkRouteAccess = (features: string[]): boolean => {
    if (ALWAYS_ALLOWED_ROUTES.has(routePath) || LICENSE_FREE_ROUTES.has(routePath)) {
      return true;
    }
    if (features.length > 0 && !features.includes(routePath)) {
      router.navigate(['/dashboard']);
      return false;
    }
    return true;
  };

  const features: string[] = (() => {
    if (!accesspolicy) return [];
    try { return JSON.parse(accesspolicy) as string[]; } catch { return []; }
  })();

  if (licenseStatus) {
    if (licenseStatus !== 'ACTIVE' && licenseStatus !== 'GRACE') {
      router.navigate(['/license-pending']);
      return false;
    }
    return checkRouteAccess(features);
  }

  // licenseStatus not cached yet — fetch it once (tenant-wide, org license only).
  // accesspolicy is NEVER set from this response; it stays whatever login set it to.
  return orgSvc.getMyLicenseStatus().pipe(
    map(status => {
      const licStatus = status?.status ?? 'UNKNOWN';
      localStorage.setItem('licenseStatus', String(licStatus));

      // SYSTEM_ADMIN (no org) — always allow through
      if (!status?.organizationId) {
        return true;
      }

      if (licStatus !== 'ACTIVE' && licStatus !== 'GRACE') {
        router.navigate(['/license-pending']);
        return false;
      }

      return checkRouteAccess(features);
    }),
    catchError(() => of(true))
  );
};