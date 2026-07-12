import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { OrganizationService } from '../services/organization.service';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

const LICENSE_FREE_ROUTES = new Set(['', '/', '/login', '/sso', '/license-pending', '/account-not-activated']);
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

  // These two pages are always reachable regardless of activation state — otherwise
  // a user with no personal activation could never even see the page explaining that.
  if (routePath === '/license-pending' || routePath === '/account-not-activated') {
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

  let role = '';
  try { role = JSON.parse(localStorage.getItem('crmUser') || '{}')?.role ?? ''; } catch { /* ignore */ }

  const checkRouteAccess = (features: string[]): boolean => {
    // No personal activation at all, and not the one role that's exempt (SYSTEM_ADMIN
    // with a real tenant entitlement) — block EVERYTHING, including dashboard/settings,
    // and send them to the explanation screen instead of quietly showing an empty shell.
    if (features.length === 0 && role !== 'SYSTEM_ADMIN') {
      router.navigate(['/account-not-activated']);
      return false;
    }
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