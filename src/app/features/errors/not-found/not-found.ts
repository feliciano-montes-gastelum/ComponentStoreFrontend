import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="app-page app-error-page">
      <mat-icon aria-hidden="true" class="app-error-page__icon">search_off</mat-icon>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist or may have moved.</p>
      <a mat-flat-button routerLink="/">
        <mat-icon aria-hidden="true">home</mat-icon>
        Back to home
      </a>
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
        max-width: 40ch;
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class NotFound {}
