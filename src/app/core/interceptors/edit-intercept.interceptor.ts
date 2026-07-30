import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EMPTY } from 'rxjs';
import { EditInterceptService } from '../services/edit-intercept.service';

/**
 * Intercepts POST requests to {base}/api/v1/{resource}/edit/{id} — the broken
 * generic branch inside RecordDetailComponent#executeAction — and routes them
 * through EditInterceptService so a parent wrapper component can open a real
 * edit form drawer instead.
 *
 * All other requests pass through unchanged.
 */
export const editInterceptInterceptor: HttpInterceptorFn = (req, next) => {
  const editRe = /\/api\/v1\/[^/]+\/edit\/([^/?]+)$/;
  const match = req.url.match(editRe);

  if (match && req.method === 'POST') {
    const id = match[1];
    const svc = inject(EditInterceptService);
    svc.requestEdit(id);
    return EMPTY;
  }

  return next(req);
};
