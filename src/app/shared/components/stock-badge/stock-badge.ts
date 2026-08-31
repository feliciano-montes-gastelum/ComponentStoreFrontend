import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { stockLevelOf } from '../../../core/models';

@Component({
  selector: 'app-stock-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="app-stock-badge" [class]="'app-stock-badge--' + level()" role="status">
      {{ label() }}
    </span>
  `,
  styles: [
    `
      .app-stock-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .app-stock-badge--in-stock {
        background: var(--app-stock-in-bg);
        color: var(--app-stock-in-fg);
      }
      .app-stock-badge--low-stock {
        background: var(--app-stock-low-bg);
        color: var(--app-stock-low-fg);
      }
      .app-stock-badge--out-of-stock {
        background: var(--app-stock-out-bg);
        color: var(--app-stock-out-fg);
      }
    `,
  ],
})
export class StockBadge {
  readonly quantity = input.required<number>();

  protected readonly level = computed(() => stockLevelOf(this.quantity()));
  protected readonly label = computed(() => {
    switch (this.level()) {
      case 'in-stock':
        return 'In stock';
      case 'low-stock':
        return `Low stock — ${this.quantity()} left`;
      default:
        return 'Out of stock';
    }
  });
}
