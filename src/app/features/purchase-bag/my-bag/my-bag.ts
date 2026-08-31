import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { PurchaseBagService } from '../../../core/services/purchase-bag.service';
import { InventoryImageService } from '../../../core/services/inventory-image.service';
import { PickupAvailabilityService } from '../../../core/services/pickup-availability.service';
import { WhatsAppOutreachService } from '../../../core/services/whatsapp-outreach.service';
import { ApiError, PickupDayAvailabilityResponse, PurchaseBagItemResponse, PurchaseBagResponse } from '../../../core/models';
import { NotificationService } from '../../../core/error-handling/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ImageWithFallback } from '../../../shared/components/image-with-fallback/image-with-fallback';
import { QuantityInput } from '../../../shared/components/quantity-input/quantity-input';
import { PickupStatusChip } from '../../../shared/components/pickup-status-chip/pickup-status-chip';
import { PickupTimeSlot, describeAppliedScope, generateTimeSlots, toDateParam, toOffsetDateTimeString } from '../../../shared/utils/pickup-time.util';
import { buildPickupWhatsAppMessage } from '../../../shared/utils/whatsapp-message.util';
import { resolveFrontendBaseUrl } from '../../../shared/utils/frontend-url.util';

@Component({
  selector: 'app-my-bag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    PageHeader,
    LoadingSpinner,
    EmptyState,
    ImageWithFallback,
    QuantityInput,
    PickupStatusChip,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './my-bag.html',
  styleUrl: './my-bag.css',
})
export class MyBag implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly bagService = inject(PurchaseBagService);
  private readonly inventoryImageService = inject(InventoryImageService);
  private readonly pickupAvailability = inject(PickupAvailabilityService);
  private readonly whatsapp = inject(WhatsAppOutreachService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyed = new Subject<void>();

  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly bag = signal<PurchaseBagResponse | null>(null);
  protected readonly imageUrls = signal<Record<string, string>>({});
  protected readonly busyItemId = signal<string | null>(null);

  protected readonly itemCount = computed(() => this.bag()?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0);

  protected readonly requestingPickup = signal(false);
  protected readonly minPickupDate = new Date();
  protected readonly pickupForm = this.fb.group({
    pickupDate: this.fb.control<Date | null>(null, [Validators.required]),
    pickupTime: this.fb.control<string | null>(null, [Validators.required]),
    pickupNotes: this.fb.nonNullable.control('', [Validators.maxLength(500)]),
  });
  protected readonly pickupBlockedByEmptyBag = computed(() => this.itemCount() === 0);

  protected readonly checkingAvailability = signal(false);
  protected readonly availabilityCheckFailed = signal(false);
  protected readonly dateAvailability = signal<PickupDayAvailabilityResponse | null>(null);
  protected readonly describeAppliedScope = describeAppliedScope;

  ngOnInit(): void {
    this.load();
    this.pickupForm
      .get('pickupDate')!
      .valueChanges.pipe(takeUntil(this.destroyed))
      .subscribe((date) => this.onPickupDateChange(date));
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  protected describePickupError(): string | null {
    const dateControl = this.pickupForm.get('pickupDate')!;
    const timeControl = this.pickupForm.get('pickupTime')!;
    if (!dateControl.touched && !timeControl.touched) {
      return null;
    }
    if (dateControl.errors?.['required']) {
      return 'Pickup date is required.';
    }
    if (this.dateAvailability() && !this.dateAvailability()!.available) {
      return 'This date is not available for pickup — please choose another date.';
    }
    if (timeControl.errors?.['required']) {
      return 'Pickup time is required.';
    }
    return null;
  }

  /** A plain method, not computed(): it filters against `new Date()` at read time, and reacts to
   *  a reactive-forms control value — both of which must be re-evaluated on every change-detection
   *  pass (which reactive forms already trigger via markForCheck) rather than memoized. */
  protected availableSlots(): PickupTimeSlot[] {
    const result = this.dateAvailability();
    if (!result?.available) {
      return [];
    }
    const slots = generateTimeSlots(result.windows);
    const date = this.pickupForm.get('pickupDate')!.value;
    if (!date || !this.isToday(date)) {
      return slots;
    }
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    return slots.filter((slot) => {
      const [hour, minute] = slot.value.split(':').map(Number);
      return hour * 60 + minute > nowMinutes;
    });
  }

  protected canSubmitPickup(): boolean {
    return (
      !this.pickupBlockedByEmptyBag() &&
      this.pickupForm.valid &&
      !!this.dateAvailability()?.available &&
      !this.checkingAvailability()
    );
  }

  protected requestPickup(): void {
    if (!this.canSubmitPickup() || this.requestingPickup()) {
      this.pickupForm.markAllAsTouched();
      return;
    }

    const date = this.pickupForm.get('pickupDate')!.value!;
    const time = this.pickupForm.get('pickupTime')!.value!;
    const timezone = this.dateAvailability()!.timezone;
    const notes = this.pickupForm.get('pickupNotes')!.value;
    const requestedPickupAt = toOffsetDateTimeString(date, time, timezone);

    // Opened synchronously, from this click, before the async save below — see
    // WhatsAppOutreachService.openPlaceholder() for why that ordering matters.
    const whatsAppPopup = this.whatsapp.openPlaceholder();

    this.requestingPickup.set(true);
    this.bagService.requestPickup({ requestedPickupAt, pickupNotes: notes || undefined }).subscribe({
      next: (bag) => {
        this.bag.set(bag);
        this.requestingPickup.set(false);
        this.notifications.success('Pickup requested.');
        this.notifyAdministrator(whatsAppPopup, bag, requestedPickupAt, timezone, notes);
      },
      error: (error: unknown) => {
        whatsAppPopup?.close();
        this.requestingPickup.set(false);
        this.notifications.error(this.messageOf(error, 'Unable to request pickup right now.'));
      },
    });
  }

  /** Called only after the pickup request has already been saved — never reports its own outcome as a save failure. */
  protected retryWhatsApp(url: string): void {
    window.open(url, '_blank');
  }

  protected onQuantityChange(item: PurchaseBagItemResponse, quantity: number): void {
    if (this.busyItemId() || quantity === item.quantity || quantity < 1) {
      return;
    }
    this.busyItemId.set(item.id);
    this.bagService.updateItemQuantity(item.id, quantity).subscribe({
      next: (bag) => {
        this.bag.set(bag);
        this.busyItemId.set(null);
      },
      error: (error: unknown) => {
        this.busyItemId.set(null);
        this.notifications.error(this.messageOf(error, 'Unable to update this item\'s quantity.'));
        this.load();
      },
    });
  }

  protected removeItem(item: PurchaseBagItemResponse): void {
    this.busyItemId.set(item.id);
    this.bagService.removeItem(item.id).subscribe({
      next: (bag) => {
        this.bag.set(bag);
        this.busyItemId.set(null);
        this.notifications.success(`Removed "${item.inventoryName}" from your bag.`);
      },
      error: (error: unknown) => {
        this.busyItemId.set(null);
        this.notifications.error(this.messageOf(error, 'Unable to remove this item.'));
      },
    });
  }

  private notifyAdministrator(
    popup: Window | null,
    bag: PurchaseBagResponse,
    requestedPickupAtIso: string,
    timezone: string,
    notes: string
  ): void {
    const message = buildPickupWhatsAppMessage({
      customerLabel: this.auth.username() ?? bag.username,
      bagId: bag.id,
      pickupAt: new Date(requestedPickupAtIso),
      timezone,
      itemCount: this.itemCount(),
      pickupNotes: notes || null,
      frontendBaseUrl: resolveFrontendBaseUrl(),
    });
    this.whatsapp.send(popup, message).subscribe((outcome) => {
      if (outcome.kind === 'popup-blocked') {
        this.notifications.warning('Pickup saved, but WhatsApp could not be opened automatically.', {
          label: 'Open WhatsApp',
          onAction: () => this.retryWhatsApp(outcome.url),
        });
      } else if (outcome.kind === 'no-principal-contact') {
        this.notifications.warning('Pickup saved. No principal contact is configured for WhatsApp notifications yet.');
      }
    });
  }

  private onPickupDateChange(date: Date | null): void {
    this.pickupForm.get('pickupTime')!.setValue(null);
    this.dateAvailability.set(null);
    this.availabilityCheckFailed.set(false);
    if (!date) {
      return;
    }
    this.checkingAvailability.set(true);
    this.pickupAvailability.getAvailability(toDateParam(date)).subscribe({
      next: (result) => {
        this.dateAvailability.set(result);
        this.checkingAvailability.set(false);
      },
      error: () => {
        this.availabilityCheckFailed.set(true);
        this.checkingAvailability.set(false);
      },
    });
  }

  private isToday(date: Date): boolean {
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.bagService.getMyOpenBag().subscribe({
      next: (bag) => {
        this.bag.set(bag);
        this.loading.set(false);
        this.resolveImages(bag.items);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  /** PurchaseBagItemResponse has no image field — resolve each item's primary gallery image. */
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
