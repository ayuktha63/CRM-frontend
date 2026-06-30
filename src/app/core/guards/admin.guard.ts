import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Guard that restricts access to ADMIN-only routes.
 * Only users with role === 'ADMIN' can activate these routes.
 * SALES_ADMIN, SALES_USER, and any other role are redirected to /dashboard.
 */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  try {
    const raw = localStorage.getItem('crmUser');
    if (raw) {
      const user = JSON.parse(raw);
      const role: string = (user?.role || user?.roleName || '').toUpperCase();
      if (role === 'ADMIN') {
        return true;
      }
    }
  } catch {
    // malformed stored user → redirect
  }

  // Non-admin: redirect to dashboard silently
  router.navigate(['/dashboard']);
  return false;
};
