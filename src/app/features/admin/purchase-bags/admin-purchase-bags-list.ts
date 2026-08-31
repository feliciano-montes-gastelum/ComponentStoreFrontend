import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { PurchaseBagService } from '../../../core/services/purchase-bag.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { PurchaseBagResponse, PurchaseBagStatus, RoleAssignmentResponse } from '../../../core/models';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { BagStatusChip } from '../../../shared/components/bag-status-chip/bag-status-chip';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-purchase-bags-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    PageHeader,
    LoadingSpinner,
    EmptyState,
    BagStatusChip,
  ],
  templateUrl: './admin-purchase-bags-list.html',
  styleUrl: './admin-purchase-bags-list.css',
})
export class AdminPurchaseBagsList implements OnInit {
  private readonly bagService = inject(PurchaseBagService);
  private readonly userManagement = inject(UserManagementService);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly bags = signal<PurchaseBagResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly users = signal<RoleAssignmentResponse[]>([]);

  protected readonly userControl = new FormControl<string>('', { nonNullable: true });
  protected readonly statusControl = new FormControl<PurchaseBagStatus | 'ALL'>('ALL', { nonNullable: true });

  protected readonly displayedColumns = ['createdAt', 'username', 'status', 'items', 'total', 'actions'];

  protected readonly uniqueUsers = computed(() => {
    const seen = new Map<string, RoleAssignmentResponse>();
    for (const assignment of this.users()) {
      if (!seen.has(assignment.userAuthenticationId)) {
        seen.set(assignment.userAuthenticationId, assignment);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.username.localeCompare(b.username));
  });

  ngOnInit(): void {
    this.userManagement.listRoleAssignments({ size: 200, sort: 'username,asc' }).subscribe((page) => this.users.set(page.content));

    const preselectedUserId = this.route.snapshot.queryParamMap.get('userAuthenticationId');
    if (preselectedUserId) {
      this.userControl.setValue(preselectedUserId, { emitEvent: false });
    }

    this.userControl.valueChanges.subscribe(() => {
      this.pageIndex.set(0);
      this.load();
    });
    this.statusControl.valueChanges.subscribe(() => {
      this.pageIndex.set(0);
      this.load();
    });

    this.load();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const status = this.statusControl.value;
    this.bagService
      .list({
        userAuthenticationId: this.userControl.value || undefined,
        status: status === 'ALL' ? undefined : status,
        page: this.pageIndex(),
        size: this.pageSize,
      })
      .subscribe({
        next: (page) => {
          this.bags.set(page.content);
          this.totalElements.set(page.totalElements);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
