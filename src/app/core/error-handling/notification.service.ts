import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface NotificationAction {
  label: string;
  onAction: () => void;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 4000, panelClass: 'app-snackbar-success' });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 6000, panelClass: 'app-snackbar-error' });
  }

  info(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 4000 });
  }

  /**
   * A secondary, non-blocking notice for something that isn't itself a failure of the primary
   * operation (e.g. "saved, but WhatsApp couldn't be opened"). `action`, when given, renders as
   * the snackbar's action button in place of "Dismiss" — used for a retry that does NOT resubmit
   * the primary request.
   */
  warning(message: string, action?: NotificationAction): void {
    const ref = this.snackBar.open(message, action?.label ?? 'Dismiss', {
      duration: action ? 10000 : 6000,
      panelClass: 'app-snackbar-warning',
    });
    if (action) {
      ref.onAction().subscribe(() => action.onAction());
    }
  }
}
