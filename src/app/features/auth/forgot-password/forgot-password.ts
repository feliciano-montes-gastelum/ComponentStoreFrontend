import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/models';
import { describeControlError } from '../../../shared/utils/form-errors.util';
import { passwordSpecialCharacterValidator, passwordsMatchValidator } from '../../../shared/utils/password-validators.util';

type Step = 'email' | 'code' | 'password' | 'done';

/**
 * "Forgot password" is one route with three sequential steps, since they share state (the email
 * carries through to the code step, and the reset token from the code step is spent in the
 * password step) — POST /api/auth/password-reset/request, then /verify, then /confirm.
 */
@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly step = signal<Step>('email');
  protected readonly submitting = signal(false);
  protected readonly resending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** The backend's own generic "if that email exists, a code was sent" message — shown verbatim, never a custom substitute. */
  protected readonly infoMessage = signal<string | null>(null);
  protected readonly hidePassword = signal(true);

  /** The single-purpose token from verifyPasswordResetCode() — not exposed to the template, only ever read once, in submitPassword(). */
  private resetToken: string | null = null;

  protected readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  protected readonly codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      newPassword: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(100), passwordSpecialCharacterValidator],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator('newPassword', 'confirmPassword') }
  );

  protected describeError(control: AbstractControl | null, label: string): string | null {
    return describeControlError(control, label);
  }

  protected submitEmail(): void {
    if (this.emailForm.invalid || this.submitting()) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.auth.requestPasswordReset(this.emailForm.getRawValue().email).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.infoMessage.set(response.message);
        this.step.set('code');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(this.messageOf(error, 'Unable to process your request right now. Please try again.'));
      },
    });
  }

  /** Re-runs step 1 without leaving the code step — the backend is safe to call again (it silently no-ops within its own cooldown window but still returns the same success message). */
  protected resendCode(): void {
    if (this.resending()) {
      return;
    }
    this.resending.set(true);
    this.errorMessage.set(null);
    this.auth.requestPasswordReset(this.emailForm.getRawValue().email).subscribe({
      next: (response) => {
        this.resending.set(false);
        this.infoMessage.set(response.message);
      },
      error: (error: unknown) => {
        this.resending.set(false);
        this.errorMessage.set(this.messageOf(error, 'Unable to resend the code right now. Please try again.'));
      },
    });
  }

  protected submitCode(): void {
    if (this.codeForm.invalid || this.submitting()) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const email = this.emailForm.getRawValue().email;
    const code = this.codeForm.getRawValue().code;
    this.auth.verifyPasswordResetCode(email, code).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.resetToken = response.resetToken;
        this.infoMessage.set(null);
        this.step.set('password');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(this.messageOf(error, 'That code is invalid or has expired. Please try again or request a new one.'));
      },
    });
  }

  protected submitPassword(): void {
    if (this.passwordForm.invalid || this.submitting() || !this.resetToken) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.auth.resetPassword(this.resetToken, this.passwordForm.getRawValue().newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.resetToken = null;
        this.step.set('done');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          this.messageOf(error, 'This reset link is no longer valid. Please start over and request a new code.')
        );
      },
    });
  }

  /** Lets the user go back and try a different email address before a code has been requested for a new one. */
  protected changeEmail(): void {
    this.step.set('email');
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.codeForm.reset();
  }

  /** Used once a reset token has expired/been rejected: there's nothing left to retry with, so start over. */
  protected startOver(): void {
    this.step.set('email');
    this.resetToken = null;
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.codeForm.reset();
    this.passwordForm.reset();
  }

  protected goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error as ApiError | undefined;
      return apiError?.message ?? fallback;
    }
    return fallback;
  }
}
