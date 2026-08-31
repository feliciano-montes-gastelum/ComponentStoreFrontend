import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { NotificationService } from './notification.service';

/**
 * Catches uncaught client-side (non-HTTP) errors — HttpErrorResponses are already handled by
 * errorInterceptor and rethrown to the caller, so this only reacts to genuine bugs/crashes.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);

  handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      return;
    }

    console.error('Unhandled application error:', error);
    this.notifications.error('Something went wrong. Please try again.');
  }
}
