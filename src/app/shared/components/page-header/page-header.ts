import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-page-header">
      <div>
        <h1>{{ title() }}</h1>
        @if (description()) {
          <p class="app-page-header__description">{{ description() }}</p>
        }
      </div>
      <div class="app-page-header__actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [
    `
      .app-page-header {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      h1 {
        margin: 0 0 0.25rem;
        font-size: 1.6rem;
      }
      .app-page-header__description {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
        max-width: 60ch;
      }
      .app-page-header__actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
}
