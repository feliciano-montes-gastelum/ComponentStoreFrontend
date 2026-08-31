import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { InventoryService } from '../../../core/services/inventory.service';
import { InventoryImageService } from '../../../core/services/inventory-image.service';
import { ComponentTypeService } from '../../../core/services/component-type.service';
import { ComponentTypeResponse, InventoryResponse } from '../../../core/models';
import { ProductCard } from '../../../shared/components/product-card/product-card';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../../shared/components/page-header/page-header';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-catalog-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule,
    ProductCard,
    LoadingSpinner,
    EmptyState,
    PageHeader,
  ],
  templateUrl: './catalog-list.html',
  styleUrl: './catalog-list.css',
})
export class CatalogList implements OnInit, OnDestroy {
  private readonly inventoryService = inject(InventoryService);
  private readonly inventoryImageService = inject(InventoryImageService);
  private readonly componentTypeService = inject(ComponentTypeService);
  private readonly destroyed = new Subject<void>();

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly componentTypeControl = new FormControl<string>('', { nonNullable: true });

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly results = signal<InventoryResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly componentTypes = signal<ComponentTypeResponse[]>([]);

  protected readonly pageSize = PAGE_SIZE;

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroyed))
      .subscribe(() => {
        this.pageIndex.set(0);
        this.load();
      });

    this.componentTypeControl.valueChanges.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.pageIndex.set(0);
      this.load();
    });

    this.loadComponentTypes();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  protected clearFilters(): void {
    this.searchControl.setValue('');
    this.componentTypeControl.setValue('');
  }

  private loadComponentTypes(): void {
    this.componentTypeService.list({ size: 100, sort: 'name,asc' }).subscribe({
      next: (page) => this.componentTypes.set(page.content),
      // Non-fatal: the filter dropdown just stays empty if this fails.
      error: () => this.componentTypes.set([]),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.inventoryService
      .search({
        name: this.searchControl.value || undefined,
        componentTypeId: this.componentTypeControl.value || undefined,
        active: true,
        page: this.pageIndex(),
        size: this.pageSize,
        sort: 'name,asc',
      })
      .subscribe({
        next: (page) => {
          this.results.set(page.content);
          this.totalElements.set(page.totalElements);
          this.loading.set(false);
          this.resolveMissingImages(page.content);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Unable to load components right now. Please try again.');
        },
      });
  }

  /**
   * `InventoryResponse.imageUrl` is a legacy single-image text field, separate from (and often
   * left empty in favor of) the multi-image gallery managed on the admin "Manage images" screen.
   * For any card whose imageUrl is empty, look up that component's gallery and backfill its
   * primary (or first) image so the catalog actually reflects uploaded photos.
   */
  private resolveMissingImages(items: InventoryResponse[]): void {
    for (const item of items) {
      if (item.imageUrl) {
        continue;
      }
      this.inventoryImageService.list(item.id, { size: 10, sort: 'displayOrder,asc' }).subscribe({
        next: (imagePage) => {
          const primary = imagePage.content.find((image) => image.isPrimary) ?? imagePage.content[0];
          if (!primary) {
            return;
          }
          const resolvedUrl = primary.thumbnailUrl || primary.url;
          this.results.update((current) =>
            current.map((entry) => (entry.id === item.id ? { ...entry, imageUrl: resolvedUrl } : entry))
          );
        },
        // Non-fatal: the card just keeps showing the placeholder if this fails.
        error: () => undefined,
      });
    }
  }
}
