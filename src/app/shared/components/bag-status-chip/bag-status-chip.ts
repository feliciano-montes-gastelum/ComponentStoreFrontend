import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PurchaseBagStatus } from '../../../core/models';

const LABELS: Record<PurchaseBagStatus, string> = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const TONES: Record<PurchaseBagStatus, 'neutral' | 'positive' | 'warning'> = {
  OPEN: 'neutral',
  CLOSED: 'positive',
  CANCELLED: 'warning',
};

@Component({
  selector: 'app-bag-status-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="app-status-chip" [class]="'app-status-chip--' + tone()">{{ label() }}</span>`,
  styles: [
    `
      .app-status-chip {
        display: inline-flex;
        align-items: center;
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .app-status-chip--neutral {
        background: var(--mat-sys-surface-container-high);
        color: var(--mat-sys-on-surface-variant);
      }
      .app-status-chip--positive {
        background: var(--app-stock-in-bg);
        color: var(--app-stock-in-fg);
      }
      .app-status-chip--warning {
        background: var(--app-stock-low-bg);
        color: var(--app-stock-low-fg);
      }
    `,
  ],
})
export class BagStatusChip {
  readonly status = input.required<PurchaseBagStatus>();

  protected readonly label = computed(() => LABELS[this.status()]);
  protected readonly tone = computed(() => TONES[this.status()]);
}
