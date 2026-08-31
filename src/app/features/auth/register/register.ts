import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/models';
import { applyServerFieldErrors, describeControlError } from '../../../shared/utils/form-errors.util';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

// Mirrors the backend's UserRegistrationRequest.password @Pattern(".*\\p{Punct}.*") — Java's
// POSIX \p{Punct} class is exactly this fixed ASCII punctuation set, not full Unicode punctuation.
const SPECIAL_CHARACTER_PATTERN = /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]/;

function passwordSpecialCharacterValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string | null;
  if (!value) {
    return null;
  }
  return SPECIAL_CHARACTER_PATTERN.test(value) ? null : { missingSpecialCharacter: true };
}

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly hidePassword = signal(true);

  protected readonly form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(100), passwordSpecialCharacterValidator],
      ],
      confirmPassword: ['', [Validators.required]],
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
    },
    { validators: passwordsMatchValidator }
  );

  protected describeError(field: string, label: string): string | null {
    return describeControlError(this.form.get(field), label);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { confirmPassword, ...registration } = this.form.getRawValue();
    void confirmPassword;

    this.auth.register(registration).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl('/');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof HttpErrorResponse) {
          const apiError = error.error as ApiError | undefined;
          applyServerFieldErrors(this.form, apiError);
          this.errorMessage.set(apiError?.message ?? 'Unable to create your account. Please try again.');
        } else {
          this.errorMessage.set('Unable to create your account. Please try again.');
        }
      },
    });
  }
}
