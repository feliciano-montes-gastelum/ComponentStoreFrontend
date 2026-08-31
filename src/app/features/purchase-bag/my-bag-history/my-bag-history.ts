import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { PurchaseBagService } from '../../../core/services/purchase-bag.service';
import { PurchaseBagResponse } from '../../../core/models';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { BagStatusChip } from '../../../shared/components/bag-status-chip/bag-status-chip';

const PAGE_SIZE = 10;

/**
 * There is no per-bag detail route here: GET /api/purchase-bags/{bagId} requires
 * ROLE_ADMINISTRATOR, so a guest can only ever see their own bags via /me and /me/history —
 * both of which already return the full item breakdown, so this page shows it inline instead.
 */
@Component({
  selector: 'app-my-bag-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatPaginatorModule,
    PageHeader,
    LoadingSpinner,
    EmptyState,
    BagStatusChip,
  ],
  templateUrl: './my-bag-history.html',
  styleUrl: './my-bag-history.css',
})
export class MyBagHistory implements OnInit {
  private readonly bagService = inject(PurchaseBagService);

  protected readonly loading = signal(true);
  protected readonly bags = signal<PurchaseBagResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = PAGE_SIZE;

  ngOnInit(): void {
    this.load();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.bagService.getMyHistory({ page: this.pageIndex(), size: this.pageSize }).subscribe({
      next: (page) => {
        this.bags.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
