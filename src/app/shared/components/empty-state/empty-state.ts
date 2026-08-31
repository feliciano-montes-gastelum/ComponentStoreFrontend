import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-empty-state">
      @if (icon()) {
        <span class="material-icons app-empty-state__icon" aria-hidden="true">{{ icon() }}</span>
      }
      <p class="app-empty-state__title">{{ title() }}</p>
      @if (description()) {
        <p class="app-empty-state__description">{{ description() }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .app-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.5rem;
        padding: 3rem 1.5rem;
        color: var(--mat-sys-on-surface-variant);
      }
      .app-empty-state__icon {
        font-size: 2.75rem;
        width: 2.75rem;
        height: 2.75rem;
        opacity: 0.6;
        margin-bottom: 0.25rem;
      }
      .app-empty-state__title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }
      .app-empty-state__description {
        margin: 0;
        max-width: 32rem;
      }
    `,
  ],
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  readonly icon = input<string | undefined>('inbox');
}
