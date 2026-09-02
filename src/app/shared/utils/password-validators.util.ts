import { AbstractControl, ValidationErrors } from '@angular/forms';

// Mirrors the backend's password @Pattern(".*\\p{Punct}.*") — used by both
// UserRegistrationRequest.password and PasswordResetConfirmRequest.newPassword. Java's POSIX
// \p{Punct} class is exactly this fixed ASCII punctuation set, not full Unicode punctuation.
const SPECIAL_CHARACTER_PATTERN = /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]/;

export function passwordSpecialCharacterValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string | null;
  if (!value) {
    return null;
  }
  return SPECIAL_CHARACTER_PATTERN.test(value) ? null : { missingSpecialCharacter: true };
}

/**
 * Cross-field validator factory for a password + confirmation pair. Field names default to
 * `password`/`confirmPassword` (the registration form); pass explicit names for a form that calls
 * its field something else (e.g. `newPassword` on the reset-password form).
 */
export function passwordsMatchValidator(passwordField = 'password', confirmField = 'confirmPassword') {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordField)?.value;
    const confirmPassword = group.get(confirmField)?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  };
}
