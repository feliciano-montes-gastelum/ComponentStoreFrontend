import { AbstractControl, FormGroup } from '@angular/forms';
import { ApiError } from '../../core/models';

/** Renders a human-readable message for the first active validation error on a control. */
export function describeControlError(control: AbstractControl | null, fieldLabel: string): string | null {
  if (!control || !control.errors) {
    return null;
  }
  const errors = control.errors;
  if (errors['server']) {
    return errors['server'] as string;
  }
  if (errors['required']) {
    return `${fieldLabel} is required.`;
  }
  if (errors['email']) {
    return 'Enter a valid email address.';
  }
  if (errors['minlength']) {
    return `${fieldLabel} must be at least ${errors['minlength'].requiredLength} characters.`;
  }
  if (errors['maxlength']) {
    return `${fieldLabel} must be at most ${errors['maxlength'].requiredLength} characters.`;
  }
  if (errors['min']) {
    return `${fieldLabel} must be at least ${errors['min'].min}.`;
  }
  if (errors['max']) {
    return `${fieldLabel} must be at most ${errors['max'].max}.`;
  }
  if (errors['pattern']) {
    return `${fieldLabel} is not in a valid format.`;
  }
  return `${fieldLabel} is invalid.`;
}

/**
 * Maps a 400 validation `ApiError.fieldErrors` response onto matching form controls so
 * template-level error messages can display the backend's own explanation per field.
 */
export function applyServerFieldErrors(form: FormGroup, apiError: ApiError | undefined | null): void {
  if (!apiError?.fieldErrors) {
    return;
  }
  for (const [field, message] of Object.entries(apiError.fieldErrors)) {
    const control = form.get(field);
    if (control) {
      control.setErrors({ ...control.errors, server: message });
      control.markAsTouched();
    }
  }
}
