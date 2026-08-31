import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { InventoryHistoryService } from '../../../core/services/inventory-history.service';
import { InventoryHistoryResponse } from '../../../core/models';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-inventory-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule, PageHeader, LoadingSpinner, EmptyState],
  templateUrl: './admin-inventory-history.html',
  styleUrl: './admin-inventory-history.css',
})
export class AdminInventoryHistory implements OnInit {
  private readonly historyService = inject(InventoryHistoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly entries = signal<InventoryHistoryResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly inventoryId = signal<string | null>(null);

  protected readonly displayedColumns = ['createDate', 'inventoryName', 'action', 'change', 'updateUser'];

  ngOnInit(): void {
    this.inventoryId.set(this.route.snapshot.queryParamMap.get('inventoryId'));
    this.load();
  }

  protected clearFilter(): void {
    this.inventoryId.set(null);
    this.pageIndex.set(0);
    void this.router.navigate([], { queryParams: {} });
    this.load();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const query = { page: this.pageIndex(), size: this.pageSize, sort: 'createDate,desc' };
    const id = this.inventoryId();
    const request = id ? this.historyService.forInventory(id, query) : this.historyService.list(query);

    request.subscribe({
      next: (page) => {
        this.entries.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
