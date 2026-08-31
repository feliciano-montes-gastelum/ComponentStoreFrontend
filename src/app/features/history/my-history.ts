import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { AuthService } from '../../core/auth/auth.service';
import { UserSalesService } from '../../core/services/user-sales.service';
import { UserSaleResponse } from '../../core/models';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-my-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, MatTableModule, MatPaginatorModule, PageHeader, LoadingSpinner, EmptyState],
  templateUrl: './my-history.html',
  styleUrl: './my-history.css',
})
export class MyHistory implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly salesService = inject(UserSalesService);

  protected readonly loading = signal(true);
  protected readonly sales = signal<UserSaleResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = PAGE_SIZE;

  protected readonly displayedColumns = ['saleDate', 'inventoryName', 'quantity', 'unitPrice', 'totalPrice'];

  ngOnInit(): void {
    this.load();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  private load(): void {
    const userId = this.auth.userId();
    if (!userId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.salesService.forUser(userId, { page: this.pageIndex(), size: this.pageSize }).subscribe({
      next: (page) => {
        this.sales.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
