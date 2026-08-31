import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Attaches `Authorization: Bearer <token>` to every authenticated request, and the backend's
 * required `X-User` header (a free-text audit label, independent of the JWT) to every mutating
 * request — every write endpoint except /api/auth/** rejects requests missing it.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.getToken();
  if (!token) {
    return next(req);
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const username = auth.username();
  if (MUTATING_METHODS.has(req.method) && username) {
    headers['X-User'] = username;
  }

  return next(req.clone({ setHeaders: headers }));
};
