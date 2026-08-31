import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PickupAvailabilityService } from '../../../../core/services/pickup-availability.service';
import { ApiError, IsoDayOfWeek, PickupAvailabilityRuleResponse, PickupAvailabilityScope } from '../../../../core/models';
import { describeControlError } from '../../../../shared/utils/form-errors.util';
import { toDateParam } from '../../../../shared/utils/pickup-time.util';

export interface PickupAvailabilityFormData {
  rule?: PickupAvailabilityRuleResponse;
}

const DAY_OF_WEEK_OPTIONS: { value: IsoDayOfWeek; label: string }[] = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

/** Parses a backend "YYYY-MM-DD" into a local-timezone Date (never via `new Date(string)`, which parses as UTC midnight and can render as the previous day in zones behind UTC). */
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Parses a backend "HH:mm:ss" into a Date carrying just that time-of-day, for binding to a matTimepicker. */
function parseLocalTime(value: string): Date {
  const [hour, minute, second] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, second || 0, 0);
  return date;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

/**
 * Mirrors PickupAvailabilityService.validateRule() on the backend exactly, so invalid rules are
 * caught client-side with the same conditions the server re-checks anyway:
 * - An available rule needs a start time strictly before its end time.
 * - A DAY rule needs a specific date and can never recur.
 * - A WEEK rule needs a day of week; a non-recurring one also needs a week-start date.
 * - A MONTH rule needs a month; a non-recurring one also needs a year.
 */
export function pickupAvailabilityRuleValidator(group: AbstractControl): ValidationErrors | null {
  const value = group.value as {
    scope: PickupAvailabilityScope;
    specificDate: Date | null;
    dayOfWeek: IsoDayOfWeek | null;
    weekStartDate: Date | null;
    month: number | null;
    year: number | null;
    recurring: boolean;
    available: boolean;
    startTime: Date | null;
    endTime: Date | null;
  };
  const errors: ValidationErrors = {};

  if (value.available && (!value.startTime || !value.endTime || value.startTime.getTime() >= value.endTime.getTime())) {
    errors['timeRangeInvalid'] = true;
  }
  if (value.scope === 'DAY' && (!value.specificDate || value.recurring)) {
    errors['dayRuleInvalid'] = true;
  }
  if (value.scope === 'WEEK' && (!value.dayOfWeek || (!value.recurring && !value.weekStartDate))) {
    errors['weekRuleInvalid'] = true;
  }
  if (value.scope === 'MONTH' && (!value.month || (!value.recurring && !value.year))) {
    errors['monthRuleInvalid'] = true;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
  selector: 'app-pickup-availability-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatProgressSpinnerModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './pickup-availability-form.html',
  styleUrl: './pickup-availability-form.css',
})
export class PickupAvailabilityForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PickupAvailabilityService);
  protected readonly data = inject<PickupAvailabilityFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PickupAvailabilityForm, PickupAvailabilityRuleResponse>);

  protected readonly isEditMode = !!this.data.rule;
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly dayOfWeekOptions = DAY_OF_WEEK_OPTIONS;
  protected readonly monthOptions = MONTH_OPTIONS;

  protected readonly form = this.fb.group(
    {
      name: this.fb.nonNullable.control(this.data.rule?.name ?? '', [Validators.required, Validators.maxLength(150)]),
      scope: this.fb.nonNullable.control<PickupAvailabilityScope>(this.data.rule?.scope ?? 'MONTH', [Validators.required]),
      specificDate: this.fb.control<Date | null>(this.data.rule?.specificDate ? parseLocalDate(this.data.rule.specificDate) : null),
      dayOfWeek: this.fb.control<IsoDayOfWeek | null>(this.data.rule?.dayOfWeek ?? null),
      weekStartDate: this.fb.control<Date | null>(
        this.data.rule?.weekStartDate ? parseLocalDate(this.data.rule.weekStartDate) : null
      ),
      month: this.fb.control<number | null>(this.data.rule?.month ?? null),
      year: this.fb.control<number | null>(this.data.rule?.year ?? null),
      recurring: this.fb.nonNullable.control(this.data.rule?.recurring ?? false),
      available: this.fb.nonNullable.control(this.data.rule?.available ?? true),
      startTime: this.fb.control<Date | null>(this.data.rule?.startTime ? parseLocalTime(this.data.rule.startTime) : null),
      endTime: this.fb.control<Date | null>(this.data.rule?.endTime ? parseLocalTime(this.data.rule.endTime) : null),
      active: this.fb.nonNullable.control(this.data.rule?.active ?? true),
    },
    { validators: pickupAvailabilityRuleValidator }
  );

  constructor() {
    // DAY rules can never recur — force it off (and keep the control disabled) the moment DAY is chosen.
    this.form.get('scope')!.valueChanges.subscribe((scope) => {
      if (scope === 'DAY') {
        this.form.get('recurring')!.setValue(false);
      }
    });
  }

  /** A plain method, not computed(): reads a reactive-forms control value, so it must re-run on every change-detection pass (which reactive forms already trigger) rather than being memoized. */
  protected scopeValue(): PickupAvailabilityScope {
    return this.form.get('scope')!.value ?? 'MONTH';
  }

  protected recurringValue(): boolean {
    return this.form.get('recurring')!.value ?? false;
  }

  protected availableValue(): boolean {
    return this.form.get('available')!.value ?? true;
  }

  protected describeError(field: string, label: string): string | null {
    return describeControlError(this.form.get(field), label);
  }

  protected describeFormError(): string | null {
    if (!this.form.touched && !this.form.dirty) {
      return null;
    }
    if (this.form.errors?.['timeRangeInvalid']) {
      return 'Available rules require a start time earlier than the end time.';
    }
    if (this.form.errors?.['dayRuleInvalid']) {
      return 'A DAY rule requires a specific date and cannot repeat.';
    }
    if (this.form.errors?.['weekRuleInvalid']) {
      return 'A WEEK rule requires a day of the week; a one-time WEEK rule also needs the start date of that week.';
    }
    if (this.form.errors?.['monthRuleInvalid']) {
      return 'A MONTH rule requires a month; a one-time MONTH rule also needs a year.';
    }
    return null;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const raw = this.form.getRawValue();
    const scope = raw.scope;
    const payload = {
      name: raw.name,
      scope,
      specificDate: scope === 'DAY' && raw.specificDate ? toDateParam(raw.specificDate) : null,
      dayOfWeek: scope === 'WEEK' ? raw.dayOfWeek : null,
      weekStartDate: scope === 'WEEK' && !raw.recurring && raw.weekStartDate ? toDateParam(raw.weekStartDate) : null,
      month: scope === 'MONTH' ? raw.month : null,
      year: scope === 'MONTH' && !raw.recurring ? raw.year : null,
      recurring: scope === 'DAY' ? false : raw.recurring,
      available: raw.available,
      startTime: raw.available && raw.startTime ? formatTime(raw.startTime) : null,
      endTime: raw.available && raw.endTime ? formatTime(raw.endTime) : null,
      active: raw.active,
    };

    this.submitting.set(true);
    this.errorMessage.set(null);

    const existing = this.data.rule;
    const request = existing ? this.service.updateRule(existing.id, payload) : this.service.createRule(payload);

    request.subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.dialogRef.close(result);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof HttpErrorResponse) {
          const apiError = error.error as ApiError | undefined;
          this.errorMessage.set(apiError?.message ?? 'Unable to save this pickup availability rule.');
        } else {
          this.errorMessage.set('Unable to save this pickup availability rule.');
        }
      },
    });
  }
}
