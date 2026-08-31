import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { InventoryService } from '../../../core/services/inventory.service';
import { InventoryImageService } from '../../../core/services/inventory-image.service';
import { PurchaseBagService } from '../../../core/services/purchase-bag.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError, ImageResponse, InventoryResponse } from '../../../core/models';
import { ImageWithFallback } from '../../../shared/components/image-with-fallback/image-with-fallback';
import { StockBadge } from '../../../shared/components/stock-badge/stock-badge';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { NotificationService } from '../../../core/error-handling/notification.service';
import { QuantityInput } from '../../../shared/components/quantity-input/quantity-input';

@Component({
  selector: 'app-catalog-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    ImageWithFallback,
    StockBadge,
    LoadingSpinner,
    EmptyState,
    QuantityInput,
  ],
  templateUrl: './catalog-detail.html',
  styleUrl: './catalog-detail.css',
})
export class CatalogDetail {
  private readonly inventoryService = inject(InventoryService);
  private readonly inventoryImageService = inject(InventoryImageService);
  private readonly bagService = inject(PurchaseBagService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  /** Bound from the :id route param via withComponentInputBinding(). */
  readonly id = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly component = signal<InventoryResponse | null>(null);
  protected readonly images = signal<ImageResponse[]>([]);
  protected readonly selectedImageIndex = signal(0);
  protected readonly bagQuantity = signal(1);
  protected readonly addingToBag = signal(false);

  protected readonly galleryImages = computed<{ url: string; alt: string }[]>(() => {
    const gallery = this.images();
    if (gallery.length > 0) {
      return gallery
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((image) => ({ url: image.url, alt: this.component()?.name ?? 'Component image' }));
    }
    const fallbackUrl = this.component()?.imageUrl;
    return fallbackUrl ? [{ url: fallbackUrl, alt: this.component()?.name ?? 'Component image' }] : [];
  });

  protected readonly selectedImage = computed(() => this.galleryImages()[this.selectedImageIndex()] ?? null);

  constructor() {
    effect(() => {
      const id = this.id();
      this.load(id);
    });
  }

  protected selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  protected addToBag(): void {
    const component = this.component();
    if (!component || this.addingToBag()) {
      return;
    }

    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: `/components/${component.id}` } });
      return;
    }

    this.addingToBag.set(true);
    this.bagService.addItem({ inventoryId: component.id, quantity: this.bagQuantity() }).subscribe({
      next: () => {
        this.addingToBag.set(false);
        this.notifications.success(`Added ${this.bagQuantity()} × "${component.name}" to your bag.`);
        this.bagQuantity.set(1);
      },
      error: (error: unknown) => {
        this.addingToBag.set(false);
        const apiError = error instanceof HttpErrorResponse ? (error.error as ApiError | undefined) : undefined;
        this.notifications.error(apiError?.message ?? 'Unable to add this component to your bag right now.');
      },
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.selectedImageIndex.set(0);
    this.bagQuantity.set(1);

    this.inventoryService.getById(id).subscribe({
      next: (component) => {
        this.component.set(component);
        this.loading.set(false);
        this.loadImages(id);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  private loadImages(inventoryId: string): void {
    this.inventoryImageService.list(inventoryId, { size: 20, sort: 'displayOrder,asc' }).subscribe({
      next: (page) => this.images.set(page.content),
      error: () => this.images.set([]),
    });
  }
}
