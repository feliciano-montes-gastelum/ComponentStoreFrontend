import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule, MatCheckboxChange } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Subject, takeUntil } from 'rxjs';

import { PurchaseBagService } from '../../../core/services/purchase-bag.service';
import { InventoryImageService } from '../../../core/services/inventory-image.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { PickupAvailabilityService } from '../../../core/services/pickup-availability.service';
import {
  AdminPickupUpdateRequest,
  ApiError,
  CurrentUserResponse,
  PickupDayAvailabilityResponse,
  PurchaseBagItemResponse,
  PurchaseBagResponse,
  PurchaseBagSaleItemRequest,
} from '../../../core/models';
import { NotificationService } from '../../../core/error-handling/notification.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { BagStatusChip } from '../../../shared/components/bag-status-chip/bag-status-chip';
import { PickupStatusChip } from '../../../shared/components/pickup-status-chip/pickup-status-chip';
import { ImageWithFallback } from '../../../shared/components/image-with-fallback/image-with-fallback';
import { QuantityInput } from '../../../shared/components/quantity-input/quantity-input';
import {
  PickupTimeSlot,
  describeAppliedScope,
  formatDateTimeInZone,
  generateTimeSlots,
  toDateParam,
  toOffsetDateTimeString,
} from '../../../shared/utils/pickup-time.util';

interface SaleSelection {
  selected: boolean;
  quantity: number;
}

const CURRENCY_FORMAT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

@Component({
  selector: 'app-admin-purchase-bag-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    PageHeader,
    LoadingSpinner,
    EmptyState,
    BagStatusChip,
    PickupStatusChip,
    ImageWithFallback,
    QuantityInput,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './admin-purchase-bag-detail.html',
  styleUrl: './admin-purchase-bag-detail.css',
})
export class AdminPurchaseBagDetail implements OnInit, OnDestroy {
  private readonly bagService = inject(PurchaseBagService);
  private readonly inventoryImageService = inject(InventoryImageService);
  private readonly userManagement = inject(UserManagementService);
  private readonly pickupAvailability = inject(PickupAvailabilityService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyed = new Subject<void>();

  readonly id = input.required<string>();

  protected readonly Math = Math;

  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly bag = signal<PurchaseBagResponse | null>(null);
  protected readonly customer = signal<CurrentUserResponse | null>(null);
  protected readonly customerLoadFailed = signal(false);
  protected readonly imageUrls = signal<Record<string, string>>({});
  protected readonly busyItemId = signal<string | null>(null);
  protected readonly selling = signal(false);

  /** Per-item "sell this now?" + "how many of it to sell now" state, driving the sale below. */
  protected readonly saleSelections = signal<Record<string, SaleSelection>>({});

  protected readonly canSell = computed(() => {
    const bag = this.bag();
    return !!bag && bag.status === 'OPEN' && this.selectedSaleItems().length > 0;
  });

  // -- Pickup date/time + status change (uses the same availability-resolution endpoint as the
  // customer-facing selector in MyBag) -------------------------------------------------------
  protected readonly minPickupDate = new Date();
  protected readonly pickupDateControl = new FormControl<Date | null>(null);
  protected readonly pickupTimeControl = new FormControl<string | null>({ value: null, disabled: true });
  protected readonly checkingAvailability = signal(false);
  protected readonly availabilityCheckFailed = signal(false);
  protected readonly dateAvailability = signal<PickupDayAvailabilityResponse | null>(null);
  protected readonly updatingPickup = signal(false);
  protected readonly describeAppliedScope = describeAppliedScope;

  ngOnInit(): void {
    this.load();
    this.pickupDateControl.valueChanges.pipe(takeUntil(this.destroyed)).subscribe((date) => this.onPickupDateChange(date));
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  protected maxSellable(item: PurchaseBagItemResponse): number {
    return Math.min(item.quantity, item.availableQuantity);
  }

  protected toggleSelected(item: PurchaseBagItemResponse, checked: MatCheckboxChange | boolean): void {
    const isChecked = typeof checked === 'boolean' ? checked : checked.checked;
    this.saleSelections.update((current) => ({
      ...current,
      [item.id]: { ...current[item.id], selected: isChecked },
    }));
  }

  protected updateSaleQuantity(item: PurchaseBagItemResponse, quantity: number): void {
    this.saleSelections.update((current) => ({
      ...current,
      [item.id]: { ...current[item.id], quantity },
    }));
  }

  protected performSale(): void {
    const bag = this.bag();
    const itemsToSell = this.selectedSaleItems();
    if (!bag || !this.canSell() || this.selling()) {
      return;
    }

    const total = itemsToSell.reduce((sum, entry) => sum + entry.quantity * entry.unitPrice, 0);
    const skippedCount = bag.items.length - itemsToSell.length;

    this.confirmDialog
      .confirm({
        title: 'Perform this sale?',
        message:
          `This sells ${itemsToSell.length} item(s) from ${bag.username}'s bag totaling ${CURRENCY_FORMAT.format(total)}, ` +
          `reduces inventory for just those items, and creates sales-history records. ` +
          (skippedCount > 0
            ? `The other ${skippedCount} item(s) — unselected or only partially sold — will remain in the bag for later. `
            : '') +
          `This can't be undone.`,
        confirmLabel: 'Perform sale',
        destructive: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        const request: { items: PurchaseBagSaleItemRequest[] } = {
          items: itemsToSell.map((entry) => ({ itemId: entry.itemId, quantity: entry.quantity })),
        };
        this.selling.set(true);
        this.bagService.sell(bag.id, request).subscribe({
          next: (updated) => {
            this.selling.set(false);
            this.notifications.success('Sale completed. Inventory and sales history have been updated.');
            this.applyBag(updated);
          },
          error: (error: unknown) => {
            this.selling.set(false);
            this.notifications.error(this.messageOf(error, 'Unable to complete this sale right now.'));
          },
        });
      });
  }

  /**
   * Directly edits how much of this item is sitting in the bag — unlike the "quantity to sell"
   * stepper, this is never capped by live stock (the backend's own `ensureBagQuantity` is a flat
   * 1-99 range per component, independent of `availableQuantity`; the real stock check only
   * happens when the sale is actually performed).
   */
  protected updateBagQuantity(item: PurchaseBagItemResponse, quantity: number): void {
    const bag = this.bag();
    if (!bag || this.busyItemId() || quantity === item.quantity || quantity < 1) {
      return;
    }
    this.busyItemId.set(item.id);
    this.bagService.adminUpdateItemQuantity(bag.id, item.id, quantity).subscribe({
      next: (updated) => {
        this.busyItemId.set(null);
        this.applyBag(updated);
      },
      error: (error: unknown) => {
        this.busyItemId.set(null);
        this.notifications.error(this.messageOf(error, "Unable to update this item's quantity."));
      },
    });
  }

  protected removeItem(item: PurchaseBagItemResponse): void {
    const bag = this.bag();
    if (!bag) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: 'Remove this item from the bag?',
        message: `This permanently removes "${item.inventoryName}" from ${bag.username}'s bag. It won't affect inventory. This can't be undone.`,
        confirmLabel: 'Remove item',
        destructive: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.busyItemId.set(item.id);
        this.bagService.adminRemoveItem(bag.id, item.id).subscribe({
          next: (updated) => {
            this.busyItemId.set(null);
            this.notifications.success(`Removed "${item.inventoryName}" from the bag.`);
            this.applyBag(updated);
          },
          error: (error: unknown) => {
            this.busyItemId.set(null);
            this.notifications.error(this.messageOf(error, 'Unable to remove this item.'));
          },
        });
      });
  }

  /** A plain method, not computed(): reads reactive-forms control values, which reactive forms already re-triggers change detection for. */
  protected availableSlots(): PickupTimeSlot[] {
    const result = this.dateAvailability();
    return result?.available ? generateTimeSlots(result.windows) : [];
  }

  protected canChangePickup(): boolean {
    const bag = this.bag();
    return (
      !!bag &&
      bag.status === 'OPEN' &&
      !!this.pickupDateControl.value &&
      !!this.pickupTimeControl.value &&
      !!this.dateAvailability()?.available &&
      !this.updatingPickup()
    );
  }

  protected confirmPickup(): void {
    const bag = this.bag();
    if (!this.canChangePickup() || !bag) {
      return;
    }
    const timezone = this.dateAvailability()!.timezone;
    const pickupAt = toOffsetDateTimeString(this.pickupDateControl.value!, this.pickupTimeControl.value!, timezone);
    const formatted = formatDateTimeInZone(new Date(pickupAt), timezone);

    this.confirmDialog
      .confirm({
        title: 'Confirm this pickup time?',
        message: `This sets ${bag.username}'s confirmed pickup to ${formatted}, replacing their previously requested time${bag.requestedPickupAt ? ' of ' + formatDateTimeInZone(new Date(bag.requestedPickupAt), timezone) : ''}.`,
        confirmLabel: 'Confirm pickup',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.applyPickupUpdate(bag.id, bag.pickupNotes, { status: 'CONFIRMED', pickupAt });
        }
      });
  }

  protected rejectPickup(): void {
    const bag = this.bag();
    if (!bag) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: 'Reject this pickup request?',
        message: `This rejects ${bag.username}'s requested pickup time. They'll need to submit a new request.`,
        confirmLabel: 'Reject pickup',
        destructive: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.applyPickupUpdate(bag.id, bag.pickupNotes, { status: 'REJECTED' });
        }
      });
  }

  protected markReadyForPickup(): void {
    const bag = this.bag();
    if (!bag) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: 'Mark this bag ready for pickup?',
        message: `This marks ${bag.username}'s bag as ready for pickup.`,
        confirmLabel: 'Mark ready',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.applyPickupUpdate(bag.id, bag.pickupNotes, { status: 'READY' });
        }
      });
  }

  protected cancelPickup(): void {
    const bag = this.bag();
    if (!bag) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: 'Cancel this pickup?',
        message: `This cancels ${bag.username}'s current pickup request/confirmation. It won't affect the items in their bag.`,
        confirmLabel: 'Cancel pickup',
        destructive: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.applyPickupUpdate(bag.id, bag.pickupNotes, { status: 'CANCELLED' });
        }
      });
  }

  private applyPickupUpdate(
    bagId: string,
    pickupNotes: string | null,
    request: Pick<AdminPickupUpdateRequest, 'status' | 'pickupAt'>
  ): void {
    this.updatingPickup.set(true);
    this.bagService.updatePickup(bagId, { ...request, pickupNotes }).subscribe({
      next: (updated) => {
        this.updatingPickup.set(false);
        this.notifications.success('Pickup updated.');
        this.applyBag(updated);
        this.pickupDateControl.reset(null, { emitEvent: false });
        this.pickupTimeControl.reset(null, { emitEvent: false });
        this.pickupTimeControl.disable({ emitEvent: false });
        this.dateAvailability.set(null);
      },
      error: (error: unknown) => {
        this.updatingPickup.set(false);
        this.notifications.error(this.messageOf(error, 'Unable to update this pickup.'));
      },
    });
  }

  private onPickupDateChange(date: Date | null): void {
    this.pickupTimeControl.reset(null, { emitEvent: false });
    this.dateAvailability.set(null);
    this.availabilityCheckFailed.set(false);
    if (!date) {
      this.pickupTimeControl.disable({ emitEvent: false });
      return;
    }
    this.checkingAvailability.set(true);
    this.pickupAvailability.getAvailability(toDateParam(date)).subscribe({
      next: (result) => {
        this.dateAvailability.set(result);
        this.checkingAvailability.set(false);
        if (result.available) {
          this.pickupTimeControl.enable({ emitEvent: false });
        } else {
          this.pickupTimeControl.disable({ emitEvent: false });
        }
      },
      error: () => {
        this.availabilityCheckFailed.set(true);
        this.checkingAvailability.set(false);
        this.pickupTimeControl.disable({ emitEvent: false });
      },
    });
  }

  private selectedSaleItems(): { itemId: string; quantity: number; unitPrice: number }[] {
    const bag = this.bag();
    if (!bag) {
      return [];
    }
    const selections = this.saleSelections();
    return bag.items
      .map((item) => ({ item, selection: selections[item.id] }))
      .filter(({ selection }) => selection?.selected && selection.quantity > 0)
      .map(({ item, selection }) => ({ itemId: item.id, quantity: selection!.quantity, unitPrice: item.unitPrice }));
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.bagService.getById(this.id()).subscribe({
      next: (bag) => {
        this.loading.set(false);
        this.applyBag(bag);
        this.loadCustomer(bag.userAuthenticationId);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  /** Fetched once per page load — the customer doesn't change across sale/remove operations. */
  private loadCustomer(userAuthenticationId: string): void {
    if (this.customer()?.userId === userAuthenticationId) {
      return;
    }
    this.customerLoadFailed.set(false);
    this.userManagement.getAuthenticationDetail(userAuthenticationId).subscribe({
      next: (detail) => this.customer.set(detail),
      error: () => {
        this.customer.set(null);
        this.customerLoadFailed.set(true);
      },
    });
  }

  /** Applies a (possibly refreshed) bag and resets per-item sale selections to sensible defaults. */
  private applyBag(bag: PurchaseBagResponse): void {
    this.bag.set(bag);
    const selections: Record<string, SaleSelection> = {};
    for (const item of bag.items) {
      const maxSellable = this.maxSellable(item);
      selections[item.id] = { selected: maxSellable > 0, quantity: Math.max(1, maxSellable) };
    }
    this.saleSelections.set(selections);
    this.resolveImages(bag.items);
  }

  private resolveImages(items: PurchaseBagItemResponse[]): void {
    for (const item of items) {
      if (this.imageUrls()[item.inventoryId]) {
        continue;
      }
      this.inventoryImageService.list(item.inventoryId, { size: 5, sort: 'displayOrder,asc' }).subscribe({
        next: (page) => {
          const primary = page.content.find((image) => image.isPrimary) ?? page.content[0];
          if (!primary) {
            return;
          }
          this.imageUrls.update((current) => ({ ...current, [item.inventoryId]: primary.thumbnailUrl || primary.url }));
        },
        error: () => undefined,
      });
    }
  }

  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error as ApiError | undefined;
      return apiError?.message ?? fallback;
    }
    return fallback;
  }
}
