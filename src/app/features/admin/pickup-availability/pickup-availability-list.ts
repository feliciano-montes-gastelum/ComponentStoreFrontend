import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';

import { PickupAvailabilityService } from '../../../core/services/pickup-availability.service';
import { PickupAvailabilityRuleRequest, PickupAvailabilityRuleResponse, PickupDayAvailabilityResponse } from '../../../core/models';
import { NotificationService } from '../../../core/error-handling/notification.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { describeAppliedScope, generateTimeSlots, toDateParam } from '../../../shared/utils/pickup-time.util';
import { PickupAvailabilityForm, PickupAvailabilityFormData } from './pickup-availability-form/pickup-availability-form';

@Component({
  selector: 'app-pickup-availability-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    PageHeader,
    LoadingSpinner,
    EmptyState,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './pickup-availability-list.html',
  styleUrl: './pickup-availability-list.css',
})
export class PickupAvailabilityList implements OnInit {
  private readonly service = inject(PickupAvailabilityService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly loading = signal(true);
  protected readonly rules = signal<PickupAvailabilityRuleResponse[]>([]);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly displayedColumns = ['name', 'scope', 'details', 'availability', 'active', 'actions'];

  protected readonly describeAppliedScope = describeAppliedScope;

  protected readonly previewDateControl = new FormControl<Date | null>(null);
  protected readonly previewLoading = signal(false);
  protected readonly previewResult = signal<PickupDayAvailabilityResponse | null>(null);
  protected readonly previewError = signal(false);

  ngOnInit(): void {
    this.load();
  }

  protected openCreate(): void {
    const data: PickupAvailabilityFormData = {};
    this.dialog
      .open(PickupAvailabilityForm, { data, width: '520px' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.notifications.success('Pickup availability rule created.');
          this.load();
        }
      });
  }

  protected openEdit(rule: PickupAvailabilityRuleResponse): void {
    const data: PickupAvailabilityFormData = { rule };
    this.dialog
      .open(PickupAvailabilityForm, { data, width: '520px' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.notifications.success('Pickup availability rule updated.');
          this.load();
        }
      });
  }

  protected toggleActive(rule: PickupAvailabilityRuleResponse): void {
    this.togglingId.set(rule.id);
    const request = this.toRequest(rule, { active: !rule.active });
    this.service.updateRule(rule.id, request).subscribe({
      next: () => {
        this.notifications.success(!rule.active ? 'Rule activated.' : 'Rule deactivated.');
        this.togglingId.set(null);
        this.load();
      },
      error: () => {
        this.notifications.error('Unable to update this rule.');
        this.togglingId.set(null);
      },
    });
  }

  protected deleteRule(rule: PickupAvailabilityRuleResponse): void {
    this.confirmDialog
      .confirm({
        title: 'Delete this pickup availability rule?',
        message: `This permanently removes "${rule.name}". It can't be undone.`,
        confirmLabel: 'Delete rule',
        destructive: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.deletingId.set(rule.id);
        this.service.deleteRule(rule.id).subscribe({
          next: () => {
            this.notifications.success('Rule deleted.');
            this.deletingId.set(null);
            this.load();
          },
          error: () => {
            this.notifications.error('Unable to delete this rule.');
            this.deletingId.set(null);
          },
        });
      });
  }

  protected describeRule(rule: PickupAvailabilityRuleResponse): string {
    switch (rule.scope) {
      case 'DAY':
        return rule.specificDate ?? '—';
      case 'WEEK':
        return rule.recurring
          ? `Every ${this.capitalize(rule.dayOfWeek)}`
          : `${this.capitalize(rule.dayOfWeek)} of the week starting ${rule.weekStartDate}`;
      case 'MONTH':
        return rule.recurring ? `Every ${this.monthName(rule.month)} (yearly)` : `${this.monthName(rule.month)} ${rule.year}`;
    }
  }

  protected describeWindow(rule: PickupAvailabilityRuleResponse): string {
    if (!rule.available) {
      return 'Closed';
    }
    return rule.startTime && rule.endTime ? `${rule.startTime.slice(0, 5)} – ${rule.endTime.slice(0, 5)}` : '—';
  }

  protected runPreview(): void {
    const date = this.previewDateControl.value;
    if (!date) {
      return;
    }
    this.previewLoading.set(true);
    this.previewError.set(false);
    this.service.getAvailability(toDateParam(date)).subscribe({
      next: (result) => {
        this.previewResult.set(result);
        this.previewLoading.set(false);
      },
      error: () => {
        this.previewResult.set(null);
        this.previewError.set(true);
        this.previewLoading.set(false);
      },
    });
  }

  protected previewSlots(): { value: string; label: string }[] {
    const result = this.previewResult();
    return result?.available ? generateTimeSlots(result.windows) : [];
  }

  private toRequest(rule: PickupAvailabilityRuleResponse, overrides: Partial<PickupAvailabilityRuleRequest>): PickupAvailabilityRuleRequest {
    return {
      name: rule.name,
      scope: rule.scope,
      specificDate: rule.specificDate,
      dayOfWeek: rule.dayOfWeek,
      weekStartDate: rule.weekStartDate,
      month: rule.month,
      year: rule.year,
      recurring: rule.recurring,
      available: rule.available,
      startTime: rule.startTime,
      endTime: rule.endTime,
      active: rule.active,
      ...overrides,
    };
  }

  private capitalize(value: string | null): string {
    if (!value) {
      return '—';
    }
    return value.charAt(0) + value.slice(1).toLowerCase();
  }

  private monthName(month: number | null): string {
    if (!month) {
      return '—';
    }
    return new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' });
  }

  private load(): void {
    this.loading.set(true);
    this.service.listRules().subscribe({
      next: (rules) => {
        this.rules.set([...rules].sort((a, b) => a.name.localeCompare(b.name)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
