import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { UserComponentRequestService } from '../../../core/services/user-component-request.service';
import { PurchaseBagService } from '../../../core/services/purchase-bag.service';
import { WhatsAppOutreachService } from '../../../core/services/whatsapp-outreach.service';
import { ApiError, InventoryResponse, UserComponentRequestResponse } from '../../../core/models';
import { NotificationService } from '../../../core/error-handling/notification.service';
import { applyServerFieldErrors, describeControlError } from '../../../shared/utils/form-errors.util';
import { buildComponentRequestWhatsAppMessage } from '../../../shared/utils/whatsapp-message.util';
import { resolveFrontendBaseUrl } from '../../../shared/utils/frontend-url.util';
import { QuantityInput } from '../../../shared/components/quantity-input/quantity-input';
import { ProductCard } from '../../../shared/components/product-card/product-card';

@Component({
  selector: 'app-new-request',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    QuantityInput,
    ProductCard,
  ],
  templateUrl: './new-request.html',
  styleUrl: './new-request.css',
})
export class NewRequest implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly inventoryService = inject(InventoryService);
  private readonly requestService = inject(UserComponentRequestService);
  protected readonly bagService = inject(PurchaseBagService);
  private readonly whatsapp = inject(WhatsAppOutreachService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyed = new Subject<void>();

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly searching = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly matches = signal<InventoryResponse[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    componentName: ['', [Validators.required, Validators.maxLength(200)]],
    partNumber: ['', [Validators.maxLength(100)]],
    manufacturer: ['', [Validators.maxLength(150)]],
    quantity: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    notes: ['', [Validators.maxLength(1000)]],
    confirmedNoMatch: this.fb.nonNullable.control(false),
  });

  ngOnInit(): void {
    const componentName = this.route.snapshot.queryParamMap.get('componentName');
    if (componentName) {
      this.form.patchValue({ componentName });
    }

    this.form.get('componentName')!.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroyed))
      .subscribe(() => this.searchCatalog());
    this.form.get('partNumber')!.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroyed))
      .subscribe(() => this.searchCatalog());

    // Run once for any prefilled value.
    this.searchCatalog();
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  protected describeError(field: string, label: string): string | null {
    return describeControlError(this.form.get(field), label);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.matches().length > 0 && !this.form.get('confirmedNoMatch')!.value) {
      this.errorMessage.set('Please confirm that none of the matching catalog components meets your need.');
      return;
    }

    const userId = this.auth.userId();
    if (!userId) {
      return;
    }

    const raw = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);

    // Opened synchronously, from this click, before the async save below — see
    // WhatsAppOutreachService.openPlaceholder() for why that ordering matters.
    const whatsAppPopup = this.whatsapp.openPlaceholder();

    this.requestService
      .create({
        userAuthenticationId: userId,
        requestType: 'NEW_COMPONENT',
        componentName: raw.componentName,
        partNumber: raw.partNumber || undefined,
        manufacturer: raw.manufacturer || undefined,
        quantity: raw.quantity,
        notes: raw.notes || undefined,
      })
      .subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.notifications.success('Your request has been submitted.');
          this.notifyAdministrator(whatsAppPopup, created);
          void this.router.navigateByUrl('/my-requests');
        },
        error: (error: unknown) => {
          whatsAppPopup?.close();
          this.submitting.set(false);
          if (error instanceof HttpErrorResponse) {
            const apiError = error.error as ApiError | undefined;
            applyServerFieldErrors(this.form, apiError);
            this.errorMessage.set(apiError?.message ?? 'Unable to submit your request. Please try again.');
          } else {
            this.errorMessage.set('Unable to submit your request. Please try again.');
          }
        },
      });
  }

  /** Called only after the request has already been saved — never reports its own outcome as a save failure. */
  private notifyAdministrator(popup: Window | null, created: UserComponentRequestResponse): void {
    const message = buildComponentRequestWhatsAppMessage({
      customerLabel: this.auth.username() ?? created.username,
      requestId: created.id,
      componentName: created.componentName,
      partNumber: created.partNumber,
      manufacturer: created.manufacturer,
      quantity: created.quantity,
      notes: created.notes,
      frontendBaseUrl: resolveFrontendBaseUrl(),
      reviewPath: '/admin/requests',
    });
    this.whatsapp.send(popup, message).subscribe((outcome) => {
      if (outcome.kind === 'popup-blocked') {
        this.notifications.warning('Request saved, but WhatsApp could not be opened automatically.', {
          label: 'Open WhatsApp',
          onAction: () => window.open(outcome.url, '_blank'),
        });
      } else if (outcome.kind === 'no-principal-contact') {
        this.notifications.warning('Request saved. No principal contact is configured for WhatsApp notifications yet.');
      }
    });
  }

  /**
   * Searches the public catalog by name and/or part number before letting the user submit a
   * "new component" request — the backend's /api/inventory/search endpoint only AND-combines
   * the filters it's given, so to get "name OR part number" semantics this runs one search per
   * non-empty field and merges the results client-side, deduplicated by id.
   */
  private searchCatalog(): void {
    const name = this.form.get('componentName')!.value.trim();
    const partNumber = this.form.get('partNumber')!.value.trim();

    if (!name && !partNumber) {
      this.matches.set([]);
      this.hasSearched.set(false);
      this.form.patchValue({ confirmedNoMatch: false });
      return;
    }

    this.searching.set(true);
    const byName = name ? this.inventoryService.search({ name, active: true, size: 5 }) : of(null);
    const byPartNumber = partNumber ? this.inventoryService.search({ partNumber, active: true, size: 5 }) : of(null);

    forkJoin([byName, byPartNumber])
      .pipe(
        switchMap(([nameResults, partResults]) => {
          const merged = new Map<string, InventoryResponse>();
          for (const item of [...(nameResults?.content ?? []), ...(partResults?.content ?? [])]) {
            merged.set(item.id, item);
          }
          return of(Array.from(merged.values()));
        })
      )
      .subscribe({
        next: (results) => {
          this.matches.set(results);
          this.hasSearched.set(true);
          this.searching.set(false);
          this.form.patchValue({ confirmedNoMatch: false });
        },
        error: () => {
          this.matches.set([]);
          this.hasSearched.set(true);
          this.searching.set(false);
        },
      });
  }
}
