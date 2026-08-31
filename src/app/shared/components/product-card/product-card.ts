import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { InventoryResponse, ApiError } from '../../../core/models';
import { AuthService } from '../../../core/auth/auth.service';
import { PurchaseBagService } from '../../../core/services/purchase-bag.service';
import { NotificationService } from '../../../core/error-handling/notification.service';
import { ImageWithFallback } from '../image-with-fallback/image-with-fallback';
import { StockBadge } from '../stock-badge/stock-badge';

@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule, ImageWithFallback, StockBadge],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  protected readonly auth = inject(AuthService);
  private readonly bagService = inject(PurchaseBagService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly component = input.required<InventoryResponse>();

  protected readonly addingToBag = signal(false);

  /**
   * The backend allows a bag item's quantity (1–99 per component) regardless of current stock —
   * the real availability check only happens when an administrator closes the sale — so this
   * only gates on the component being active, not on `quantity > 0`.
   */
  protected get canAddToBag(): boolean {
    return this.component().active;
  }

  protected addToBag(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.addingToBag() || !this.canAddToBag) {
      return;
    }

    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: `/components/${this.component().id}` } });
      return;
    }

    this.addingToBag.set(true);
    this.bagService.addItem({ inventoryId: this.component().id, quantity: 1 }).subscribe({
      next: () => {
        this.addingToBag.set(false);
        this.notifications.success(`Added "${this.component().name}" to your bag.`);
      },
      error: (error: unknown) => {
        this.addingToBag.set(false);
        const apiError = error instanceof HttpErrorResponse ? (error.error as ApiError | undefined) : undefined;
        this.notifications.error(apiError?.message ?? 'Unable to add this component to your bag right now.');
      },
    });
  }
}
