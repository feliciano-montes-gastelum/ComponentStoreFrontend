import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { InventoryService } from '../../../../core/services/inventory.service';
import { ComponentTypeService } from '../../../../core/services/component-type.service';
import { ComponentTypeResponse, InventoryResponse } from '../../../../core/models';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { StockBadge } from '../../../../shared/components/stock-badge/stock-badge';
import { NotificationService } from '../../../../core/error-handling/notification.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-inventory-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    PageHeader,
    LoadingSpinner,
    EmptyState,
    StockBadge,
  ],
  templateUrl: './inventory-list.html',
  styleUrl: './inventory-list.css',
})
export class InventoryList implements OnInit, OnDestroy {
  private readonly inventoryService = inject(InventoryService);
  private readonly componentTypeService = inject(ComponentTypeService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyed = new Subject<void>();

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly componentTypeControl = new FormControl<string>('', { nonNullable: true });
  protected readonly statusControl = new FormControl<'all' | 'active' | 'inactive'>('all', { nonNullable: true });

  protected readonly loading = signal(true);
  protected readonly items = signal<InventoryResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly componentTypes = signal<ComponentTypeResponse[]>([]);
  protected readonly togglingId = signal<string | null>(null);

  protected readonly displayedColumns = ['name', 'type', 'quantity', 'price', 'status', 'actions'];

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

    this.statusControl.valueChanges.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.pageIndex.set(0);
      this.load();
    });

    this.componentTypeService.list({ size: 100, sort: 'name,asc' }).subscribe((page) => this.componentTypes.set(page.content));
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

  protected toggleActive(item: InventoryResponse): void {
    this.togglingId.set(item.id);
    this.inventoryService
      .update(item.id, {
        componentTypeId: item.componentTypeId,
        name: item.name,
        partNumber: item.partNumber ?? undefined,
        serialNumber: item.serialNumber ?? undefined,
        description: item.description ?? undefined,
        manufacturer: item.manufacturer ?? undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        location: item.location ?? undefined,
        imageUrl: item.imageUrl ?? undefined,
        active: !item.active,
      })
      .subscribe({
        next: () => {
          this.notifications.success(!item.active ? 'Component activated.' : 'Component deactivated.');
          this.togglingId.set(null);
          this.load();
        },
        error: () => {
          this.notifications.error('Unable to update this component right now.');
          this.togglingId.set(null);
        },
      });
  }

  private load(): void {
    this.loading.set(true);
    const status = this.statusControl.value;
    this.inventoryService
      .search({
        name: this.searchControl.value || undefined,
        componentTypeId: this.componentTypeControl.value || undefined,
        active: status === 'all' ? undefined : status === 'active',
        page: this.pageIndex(),
        size: this.pageSize,
        sort: 'name,asc',
      })
      .subscribe({
        next: (page) => {
          this.items.set(page.content);
          this.totalElements.set(page.totalElements);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
