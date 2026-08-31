import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { InventoryService } from '../../../../core/services/inventory.service';
import { ComponentTypeService } from '../../../../core/services/component-type.service';
import { InventoryHistoryService } from '../../../../core/services/inventory-history.service';
import { ApiError, ComponentTypeResponse, InventoryHistoryResponse } from '../../../../core/models';
import { NotificationService } from '../../../../core/error-handling/notification.service';
import { applyServerFieldErrors, describeControlError } from '../../../../shared/utils/form-errors.util';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-inventory-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    LoadingSpinner,
  ],
  templateUrl: './inventory-form.html',
  styleUrl: './inventory-form.css',
})
export class InventoryForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly componentTypeService = inject(ComponentTypeService);
  private readonly historyService = inject(InventoryHistoryService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  /** Bound from the :id route param — undefined on the "new component" route. */
  readonly id = input<string | undefined>(undefined);

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly componentTypes = signal<ComponentTypeResponse[]>([]);
  protected readonly history = signal<InventoryHistoryResponse[]>([]);
  protected readonly quantityDelta = signal(0);

  protected readonly form = this.fb.nonNullable.group({
    componentTypeId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    partNumber: ['', [Validators.maxLength(100)]],
    serialNumber: ['', [Validators.maxLength(150)]],
    manufacturer: ['', [Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(1000)]],
    quantity: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    unitPrice: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    location: ['', [Validators.maxLength(100)]],
    imageUrl: ['', [Validators.maxLength(255)]],
    active: this.fb.nonNullable.control(true),
  });

  /**
   * A plain method, not computed(): it reads a ReactiveFormsModule control value rather than a
   * signal, so it must re-run on every change-detection pass (which reactive forms already
   * trigger via markForCheck) instead of being memoized against signal dependencies that never change.
   */
  protected projectedQuantity(): number {
    return this.form.get('quantity')?.value ?? 0;
  }

  ngOnInit(): void {
    this.componentTypeService.list({ size: 100, sort: 'name,asc' }).subscribe((page) => this.componentTypes.set(page.content));

    const id = this.id();
    if (!id) {
      this.loading.set(false);
      return;
    }

    this.inventoryService.getById(id).subscribe({
      next: (component) => {
        this.form.patchValue({
          componentTypeId: component.componentTypeId,
          name: component.name,
          partNumber: component.partNumber ?? '',
          serialNumber: component.serialNumber ?? '',
          manufacturer: component.manufacturer ?? '',
          description: component.description ?? '',
          quantity: component.quantity,
          unitPrice: component.unitPrice,
          location: component.location ?? '',
          imageUrl: component.imageUrl ?? '',
          active: component.active,
        });
        this.loading.set(false);
        this.loadHistory(id);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Unable to load this component.');
      },
    });
  }

  protected describeError(field: string, label: string): string | null {
    return describeControlError(this.form.get(field), label);
  }

  /** Applies the entered +/- delta to the quantity field — the backend has no separate adjust endpoint. */
  protected applyQuantityDelta(): void {
    const delta = this.quantityDelta();
    if (!delta) {
      return;
    }
    const current = this.form.get('quantity')?.value ?? 0;
    const next = Math.max(0, current + delta);
    this.form.patchValue({ quantity: next });
    this.quantityDelta.set(0);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      componentTypeId: raw.componentTypeId,
      name: raw.name,
      partNumber: raw.partNumber || undefined,
      serialNumber: raw.serialNumber || undefined,
      manufacturer: raw.manufacturer || undefined,
      description: raw.description || undefined,
      quantity: raw.quantity,
      unitPrice: raw.unitPrice,
      location: raw.location || undefined,
      imageUrl: raw.imageUrl || undefined,
      active: raw.active,
    };

    this.submitting.set(true);
    this.errorMessage.set(null);

    const id = this.id();
    const request = id ? this.inventoryService.update(id, payload) : this.inventoryService.create(payload);

    request.subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.notifications.success(id ? 'Component updated.' : 'Component created.');
        if (id) {
          this.loadHistory(id);
        } else {
          void this.router.navigate(['/admin/inventory', result.id, 'edit']);
        }
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof HttpErrorResponse) {
          const apiError = error.error as ApiError | undefined;
          applyServerFieldErrors(this.form, apiError);
          this.errorMessage.set(apiError?.message ?? 'Unable to save this component. Please try again.');
        } else {
          this.errorMessage.set('Unable to save this component. Please try again.');
        }
      },
    });
  }

  private loadHistory(inventoryId: string): void {
    this.historyService.forInventory(inventoryId, { size: 5, sort: 'createDate,desc' }).subscribe({
      next: (page) => this.history.set(page.content),
      error: () => this.history.set([]),
    });
  }
}
