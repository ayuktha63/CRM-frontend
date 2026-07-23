import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { SessionGuardService } from '../services/session-guard.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const sessionGuard = inject(SessionGuardService);

  if (req.url.includes('/api/v1/auth/login')) {
    return next(req);
  }

  const token = authService.getAccessToken();
  const orgId = authService.getOrganizationId();
  let nextReq = req;

  if (token) {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (orgId) {
      headers['X-Organization-Id'] = orgId;
    }
    nextReq = req.clone({ setHeaders: headers });
  }

  return next(nextReq).pipe(
    catchError((error: any) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        if (req.url.includes('/api/v1/sessions/resume')) {
          // The resume call itself failed (token truly expired) — the service handles
          // that directly, don't re-trigger the popup we're already resolving.
          return throwError(() => error);
        }
        // Leave the current page/data exactly as-is; just offer the grace-period popup
        // instead of immediately wiping the session and redirecting.
        sessionGuard.trigger();
      }
      return throwError(() => error);
    })
  );
};