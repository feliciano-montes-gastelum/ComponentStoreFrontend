import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="app-loading" role="status" aria-live="polite">
      <mat-spinner [diameter]="diameter()"></mat-spinner>
      <span>{{ label() }}</span>
    </div>
  `,
  styles: [
    `
      .app-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 2.5rem 1rem;
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class LoadingSpinner {
  readonly label = input('Loading…');
  readonly diameter = input(40);
}
