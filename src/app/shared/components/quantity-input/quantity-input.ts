import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-quantity-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule],
  template: `
    <div class="app-quantity-input" role="group" [attr.aria-label]="label()">
      <button
        mat-icon-button
        type="button"
        [disabled]="disabled || value <= min()"
        (click)="step(-1)"
        aria-label="Decrease quantity"
      >
        <mat-icon aria-hidden="true">remove</mat-icon>
      </button>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="app-quantity-input__field">
        <input
          matInput
          type="number"
          [attr.aria-label]="label()"
          [min]="min()"
          [attr.max]="max() ?? null"
          [(ngModel)]="value"
          [disabled]="disabled"
          (ngModelChange)="onChange(value)"
          (blur)="onTouched()"
        />
      </mat-form-field>
      <button
        mat-icon-button
        type="button"
        [disabled]="disabled || (max() !== undefined && value >= max()!)"
        (click)="step(1)"
        aria-label="Increase quantity"
      >
        <mat-icon aria-hidden="true">add</mat-icon>
      </button>
    </div>
  `,
  styles: [
    `
      .app-quantity-input {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }
      .app-quantity-input__field {
        width: 5rem;
        text-align: center;
      }
      .app-quantity-input__field input {
        text-align: center;
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuantityInput),
      multi: true,
    },
  ],
})
export class QuantityInput implements ControlValueAccessor {
  readonly label = input('Quantity');
  readonly min = input(1);
  readonly max = input<number | undefined>(undefined);

  protected value = 1;
  protected disabled = false;

  protected onChange: (value: number) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: number): void {
    this.value = value ?? this.min();
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected step(delta: number): void {
    const next = this.value + delta;
    const max = this.max();
    if (next < this.min() || (max !== undefined && next > max)) {
      return;
    }
    this.value = next;
    this.onChange(this.value);
  }
}
