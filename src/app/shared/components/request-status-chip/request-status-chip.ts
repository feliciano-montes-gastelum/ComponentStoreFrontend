import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ComponentRequestStatus } from '../../../core/models';

const LABELS: Record<ComponentRequestStatus, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  READY_FOR_PICKUP: 'Ready for pickup',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

const TONES: Record<ComponentRequestStatus, 'neutral' | 'positive' | 'warning' | 'negative'> = {
  PENDING: 'neutral',
  APPROVED: 'positive',
  READY_FOR_PICKUP: 'positive',
  COMPLETED: 'positive',
  REJECTED: 'negative',
  EXPIRED: 'negative',
  CANCELLED: 'warning',
};

@Component({
  selector: 'app-request-status-chip',
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
export class RequestStatusChip {
  readonly status = input.required<ComponentRequestStatus>();

  protected readonly label = computed(() => LABELS[this.status()]);
  protected readonly tone = computed(() => TONES[this.status()]);
}
