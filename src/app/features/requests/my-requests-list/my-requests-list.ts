import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/auth/auth.service';
import { UserComponentRequestService } from '../../../core/services/user-component-request.service';
import { UserComponentRequestResponse } from '../../../core/models';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { RequestStatusChip } from '../../../shared/components/request-status-chip/request-status-chip';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { NotificationService } from '../../../core/error-handling/notification.service';

@Component({
  selector: 'app-my-requests-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, PageHeader, LoadingSpinner, EmptyState, RequestStatusChip],
  templateUrl: './my-requests-list.html',
  styleUrl: './my-requests-list.css',
})
export class MyRequestsList implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly requestService = inject(UserComponentRequestService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notifications = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly requests = signal<UserComponentRequestResponse[]>([]);
  protected readonly cancellingId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected cancel(request: UserComponentRequestResponse): void {
    this.confirmDialog
      .confirm({
        title: 'Cancel this request?',
        message: `This will cancel your request for "${request.componentName}". This can't be undone.`,
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
            this.notifications.error('Unable to cancel this request right now.');
            this.cancellingId.set(null);
          },
        });
      });
  }

  private load(): void {
    const userId = this.auth.userId();
    if (!userId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.requestService.forUser(userId, { size: 50, sort: 'componentName,asc' }).subscribe({
      next: (page) => {
        this.requests.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
