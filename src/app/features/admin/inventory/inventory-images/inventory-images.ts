import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { InventoryImageService } from '../../../../core/services/inventory-image.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ACCEPTED_IMAGE_CONTENT_TYPES, ImageResponse, MAX_IMAGE_FILE_SIZE_BYTES } from '../../../../core/models';
import { NotificationService } from '../../../../core/error-handling/notification.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ImageWithFallback } from '../../../../shared/components/image-with-fallback/image-with-fallback';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';

interface PendingUpload {
  previewUrl: string;
  progress: number;
}

@Component({
  selector: 'app-inventory-images',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    ImageWithFallback,
    LoadingSpinner,
    EmptyState,
  ],
  templateUrl: './inventory-images.html',
  styleUrl: './inventory-images.css',
})
export class InventoryImages implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly imageService = inject(InventoryImageService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly id = input<string | undefined>(undefined);

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  protected readonly componentName = signal<string>('');
  protected readonly loading = signal(true);
  protected readonly images = signal<ImageResponse[]>([]);
  protected readonly pendingUpload = signal<PendingUpload | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly busyImageId = signal<string | null>(null);

  ngOnInit(): void {
    const inventoryId = this.id();
    if (!inventoryId) {
      return;
    }
    this.inventoryService.getById(inventoryId).subscribe((component) => this.componentName.set(component.name));
    this.loadImages(inventoryId);
  }

  protected triggerFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.uploadError.set(null);

    if (!ACCEPTED_IMAGE_CONTENT_TYPES.includes(file.type)) {
      this.uploadError.set('Only JPEG, PNG, WEBP or GIF images are supported.');
      return;
    }
    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      this.uploadError.set('Image is too large. The maximum size is 10 MB.');
      return;
    }

    const inventoryId = this.id();
    if (!inventoryId) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    this.pendingUpload.set({ previewUrl, progress: 0 });

    this.imageService
      .upload(inventoryId, file, { displayOrder: this.images().length, isPrimary: this.images().length === 0 })
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.pendingUpload.set({ previewUrl, progress: Math.round((event.loaded / event.total) * 100) });
          } else if (event.type === HttpEventType.Response) {
            URL.revokeObjectURL(previewUrl);
            this.pendingUpload.set(null);
            this.notifications.success('Image uploaded.');
            this.loadImages(inventoryId);
          }
        },
        error: () => {
          URL.revokeObjectURL(previewUrl);
          this.pendingUpload.set(null);
          this.notifications.error('Image upload failed. The image storage backend may be disabled or unreachable.');
        },
      });
  }

  protected setPrimary(image: ImageResponse): void {
    const inventoryId = this.id();
    if (!inventoryId || image.isPrimary) {
      return;
    }
    this.busyImageId.set(image.id);
    this.imageService.update(inventoryId, image.id, { ...this.toUpdateRequest(image), isPrimary: true }).subscribe({
      next: () => {
        this.notifications.success('Primary image updated.');
        this.busyImageId.set(null);
        this.loadImages(inventoryId);
      },
      error: () => {
        this.notifications.error('Unable to update the primary image.');
        this.busyImageId.set(null);
      },
    });
  }

  protected updateDisplayOrder(image: ImageResponse, value: string): void {
    const inventoryId = this.id();
    const displayOrder = Number(value);
    if (!inventoryId || Number.isNaN(displayOrder) || displayOrder === image.displayOrder) {
      return;
    }
    this.busyImageId.set(image.id);
    this.imageService.update(inventoryId, image.id, { ...this.toUpdateRequest(image), displayOrder }).subscribe({
      next: () => {
        this.busyImageId.set(null);
        this.loadImages(inventoryId);
      },
      error: () => {
        this.notifications.error('Unable to update display order.');
        this.busyImageId.set(null);
      },
    });
  }

  protected remove(image: ImageResponse): void {
    const inventoryId = this.id();
    if (!inventoryId) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: 'Remove this image?',
        message: 'This permanently removes the image from storage. This cannot be undone.',
        confirmLabel: 'Remove image',
        destructive: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.busyImageId.set(image.id);
        this.imageService.remove(inventoryId, image.id).subscribe({
          next: () => {
            this.notifications.success('Image removed.');
            this.busyImageId.set(null);
            this.loadImages(inventoryId);
          },
          error: () => {
            this.notifications.error('Unable to remove this image.');
            this.busyImageId.set(null);
          },
        });
      });
  }

  private toUpdateRequest(image: ImageResponse) {
    return {
      url: image.url,
      thumbnailUrl: image.thumbnailUrl ?? undefined,
      contentType: image.contentType ?? undefined,
      fileSize: image.fileSize ?? undefined,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      displayOrder: image.displayOrder,
      isPrimary: image.isPrimary,
      active: image.active,
    };
  }

  private loadImages(inventoryId: string): void {
    this.loading.set(true);
    this.imageService.list(inventoryId, { size: 50, sort: 'displayOrder,asc' }).subscribe({
      next: (page) => {
        this.images.set(page.content.slice().sort((a, b) => a.displayOrder - b.displayOrder));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
