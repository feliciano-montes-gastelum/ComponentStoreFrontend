import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forbidden',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="app-page app-error-page">
      <mat-icon aria-hidden="true" class="app-error-page__icon">block</mat-icon>
      <h1>You don't have access to this page</h1>
      <p>
        @if (auth.isAuthenticated()) {
          Your account doesn't have permission to view this. If you believe this is a mistake, contact an
          administrator.
        } @else {
          Sign in with an account that has permission to view this page.
        }
      </p>
      <div class="app-error-page__actions">
        <a mat-flat-button routerLink="/">Back to home</a>
        @if (!auth.isAuthenticated()) {
          <a mat-stroked-button routerLink="/login">Sign in</a>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .app-error-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.75rem;
        padding-top: 4rem;
        padding-bottom: 4rem;
      }
      .app-error-page__icon {
        font-size: 3.5rem;
        width: 3.5rem;
        height: 3.5rem;
        color: var(--mat-sys-outline);
      }
      p {
        max-width: 45ch;
        color: var(--mat-sys-on-surface-variant);
      }
      .app-error-page__actions {
        display: flex;
        gap: 0.5rem;
      }
    `,
  ],
})
export class Forbidden {
  protected readonly auth = inject(AuthService);
}
