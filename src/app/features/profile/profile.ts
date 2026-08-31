import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../core/auth/auth.service';
import { ApiError, CurrentUserResponse } from '../../core/models';
import { NotificationService } from '../../core/error-handling/notification.service';
import { applyServerFieldErrors, describeControlError } from '../../shared/utils/form-errors.util';
import { isBrowserPlatform } from '../../shared/utils/platform.util';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { QrCode } from '../../shared/components/qr-code/qr-code';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PageHeader,
    LoadingSpinner,
    EmptyState,
    QrCode,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly isBrowser = isBrowserPlatform();
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly currentUser = signal<CurrentUserResponse | null>(null);

  /**
   * Encodes a deep link an administrator's phone can scan (any camera/QR app recognizes a URL)
   * to jump straight to this user's current bag — see the /admin/scan/:id resolver route, which
   * looks up their open bag via GET /api/purchase-bags?userAuthenticationId=&status=OPEN.
   */
  protected readonly bagQrValue = computed(() => {
    const userId = this.auth.userId();
    if (!userId || !this.isBrowser) {
      return '';
    }
    return `${window.location.origin}/admin/scan/${userId}`;
  });

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    middleName: ['', [Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    secondLastName: ['', [Validators.maxLength(100)]],
    contactNumber: ['', [Validators.maxLength(30)]],
    addressLine1: ['', [Validators.maxLength(200)]],
    addressLine2: ['', [Validators.maxLength(200)]],
    city: ['', [Validators.maxLength(100)]],
    stateProvince: ['', [Validators.maxLength(100)]],
    postalCode: ['', [Validators.maxLength(20)]],
    country: ['', [Validators.maxLength(100)]],
  });

  ngOnInit(): void {
    this.load();
  }

  protected describeError(field: string, label: string): string | null {
    return describeControlError(this.form.get(field), label);
  }

  protected startEditing(): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }
    this.form.reset({
      firstName: user.firstName,
      middleName: user.middleName ?? '',
      lastName: user.lastName,
      secondLastName: user.secondLastName ?? '',
      contactNumber: user.contactNumber ?? '',
      addressLine1: user.addressLine1 ?? '',
      addressLine2: user.addressLine2 ?? '',
      city: user.city ?? '',
      stateProvince: user.stateProvince ?? '',
      postalCode: user.postalCode ?? '',
      country: user.country ?? '',
    });
    this.saveError.set(null);
    this.editing.set(true);
  }

  protected cancelEditing(): void {
    this.editing.set(false);
    this.saveError.set(null);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const raw = this.form.getRawValue();
    this.auth
      .updateCurrentUser({
        firstName: raw.firstName,
        middleName: raw.middleName || undefined,
        lastName: raw.lastName,
        secondLastName: raw.secondLastName || undefined,
        contactNumber: raw.contactNumber || undefined,
        addressLine1: raw.addressLine1 || undefined,
        addressLine2: raw.addressLine2 || undefined,
        city: raw.city || undefined,
        stateProvince: raw.stateProvince || undefined,
        postalCode: raw.postalCode || undefined,
        country: raw.country || undefined,
      })
      .subscribe({
        next: (user) => {
          this.currentUser.set(user);
          this.saving.set(false);
          this.editing.set(false);
          this.notifications.success('Your profile has been updated.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          if (error instanceof HttpErrorResponse) {
            const apiError = error.error as ApiError | undefined;
            applyServerFieldErrors(this.form, apiError);
            this.saveError.set(apiError?.message ?? 'Unable to save your profile. Please try again.');
          } else {
            this.saveError.set('Unable to save your profile. Please try again.');
          }
        },
      });
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.auth.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }
}
