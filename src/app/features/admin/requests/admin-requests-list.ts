import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { toSignal } from '@angular/core/rxjs-interop';

import { UserComponentRequestService } from '../../../core/services/user-component-request.service';
import { ComponentRequestStatus, UserComponentRequestResponse } from '../../../core/models';
import { NotificationService } from '../../../core/error-handling/notification.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { RequestStatusChip } from '../../../shared/components/request-status-chip/request-status-chip';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-requests-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatPaginatorModule,
    PageHeader,
    LoadingSpinner,
    EmptyState,
    RequestStatusChip,
  ],
  templateUrl: './admin-requests-list.html',
  styleUrl: './admin-requests-list.css',
})
export class AdminRequestsList implements OnInit {
  private readonly requestService = inject(UserComponentRequestService);
  private readonly notifications = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly loading = signal(true);
  protected readonly requests = signal<UserComponentRequestResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly cancellingId = signal<string | null>(null);
  protected readonly statusControl = new FormControl<ComponentRequestStatus | 'ALL'>('ALL', { nonNullable: true });
  private readonly statusFilter = toSignal(this.statusControl.valueChanges, { initialValue: 'ALL' as ComponentRequestStatus | 'ALL' });

  protected readonly displayedColumns = ['componentName', 'requester', 'type', 'quantity', 'status', 'pickup', 'actions'];

  ngOnInit(): void {
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

  protected cancel(request: UserComponentRequestResponse): void {
    this.confirmDialog
      .confirm({
        title: 'Cancel this request?',
        message: `This cancels "${request.componentName}" requested by ${request.username}.`,
        confirmLabel: 'Cancel request',
        destructive: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.cancellingId.set(request.id);
        this.requestService.cancel(request.id).subscribe({
          next: () => {
            this.notifications.success('Request cancelled.');
            this.cancellingId.set(null);
            this.load();
          },
          error: () => {
            this.notifications.error('Unable to cancel this request.');
            this.cancellingId.set(null);
          },
        });
      });
  }

  private load(): void {
    this.loading.set(true);
    this.requestService.list({ page: this.pageIndex(), size: this.pageSize }).subscribe({
      next: (page) => {
        const status = this.statusFilter();
        const content = status === 'ALL' ? page.content : page.content.filter((r) => r.status === status);
        this.requests.set(content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
