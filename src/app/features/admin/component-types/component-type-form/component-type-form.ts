import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ComponentTypeService } from '../../../../core/services/component-type.service';
import { ApiError, ComponentTypeResponse } from '../../../../core/models';
import { applyServerFieldErrors, describeControlError } from '../../../../shared/utils/form-errors.util';

export interface ComponentTypeFormData {
  componentType?: ComponentTypeResponse;
}

@Component({
  selector: 'app-component-type-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatProgressSpinnerModule],
  templateUrl: './component-type-form.html',
  styles: [
    `
      .app-component-type-form {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: min(420px, 80vw);
        padding-top: 0.5rem;
      }
      mat-form-field {
        width: 100%;
      }
      .app-form-error {
        background: var(--app-stock-out-bg);
        color: var(--app-stock-out-fg);
        border-radius: var(--app-radius-sm);
        padding: 0.6rem 0.85rem;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class ComponentTypeForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ComponentTypeService);
  protected readonly data = inject<ComponentTypeFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ComponentTypeForm, ComponentTypeResponse>);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isEditMode = !!this.data.componentType;

  protected readonly form = this.fb.nonNullable.group({
    code: [this.data.componentType?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    name: [this.data.componentType?.name ?? '', [Validators.required, Validators.maxLength(100)]],
    description: [this.data.componentType?.description ?? '', [Validators.maxLength(500)]],
    active: this.fb.nonNullable.control(this.data.componentType?.active ?? true),
  });

  protected describeError(field: string, label: string): string | null {
    return describeControlError(this.form.get(field), label);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = { code: raw.code, name: raw.name, description: raw.description || undefined, active: raw.active };

    this.submitting.set(true);
    this.errorMessage.set(null);

    const existing = this.data.componentType;
    const request = existing ? this.service.update(existing.id, payload) : this.service.create(payload);

    request.subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.dialogRef.close(result);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof HttpErrorResponse) {
          const apiError = error.error as ApiError | undefined;
          applyServerFieldErrors(this.form, apiError);
          this.errorMessage.set(apiError?.message ?? 'Unable to save this component type.');
        } else {
          this.errorMessage.set('Unable to save this component type.');
        }
      },
    });
  }
}
