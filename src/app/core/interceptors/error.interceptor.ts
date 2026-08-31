import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../error-handling/notification.service';
import { ApiError } from '../models';
import { environment } from '../../../environments/environment';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register'];

function isAuthEndpoint(url: string): boolean {
  return AUTH_ENDPOINTS.some((path) => url.includes(path));
}

/**
 * Centralized HTTP error handling: expired/invalid sessions force a logout + redirect to
 * login, 403s on page loads redirect to a friendly forbidden page, and everything else
 * surfaces a notification while still propagating the error so forms can show field-level
 * validation messages from the backend's `ApiError.fieldErrors`.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !req.url.startsWith(environment.apiBaseUrl)) {
        return throwError(() => error);
      }

      if (error.status === 0) {
        notifications.error('Unable to reach the server. Check your connection and try again.');
        return throwError(() => error);
      }

      if (error.status === 401) {
        if (auth.isAuthenticated() && !isAuthEndpoint(req.url)) {
          auth.logout();
          notifications.error('Your session has expired. Please sign in again.');
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
        return throwError(() => error);
      }

      if (error.status === 403) {
        const apiError = error.error as ApiError | undefined;
        notifications.error(apiError?.message ?? 'You do not have permission to perform this action.');
        if (req.method === 'GET') {
          void router.navigate(['/forbidden']);
        }
        return throwError(() => error);
      }

      if (error.status >= 500) {
        const apiError = error.error as ApiError | undefined;
        notifications.error(apiError?.message ?? 'An unexpected error occurred. Please try again later.');
        return throwError(() => error);
      }

      return throwError(() => error);
    })
  );
};
