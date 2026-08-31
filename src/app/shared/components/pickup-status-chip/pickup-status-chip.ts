import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PickupStatus } from '../../../core/models';

const LABELS: Record<PickupStatus, string> = {
  NOT_REQUESTED: 'Not requested',
  REQUESTED: 'Requested',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  READY: 'Ready for pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const TONES: Record<PickupStatus, 'neutral' | 'positive' | 'warning' | 'negative'> = {
  NOT_REQUESTED: 'neutral',
  REQUESTED: 'warning',
  CONFIRMED: 'positive',
  REJECTED: 'negative',
  READY: 'positive',
  COMPLETED: 'positive',
  CANCELLED: 'negative',
};

@Component({
  selector: 'app-pickup-status-chip',
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
      .app-status-chip--negative {
        background: var(--app-stock-out-bg);
        color: var(--app-stock-out-fg);
      }
    `,
  ],
})
export class PickupStatusChip {
  readonly status = input.required<PickupStatus>();

  protected readonly label = computed(() => LABELS[this.status()]);
  protected readonly tone = computed(() => TONES[this.status()]);
}
