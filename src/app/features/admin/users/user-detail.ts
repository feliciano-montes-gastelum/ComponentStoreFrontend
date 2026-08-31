import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

import { UserManagementService } from '../../../core/services/user-management.service';
import { ApiError, CurrentUserResponse, RoleAssignmentResponse, ROLE_ADMINISTRATOR, RoleResponse } from '../../../core/models';
import { NotificationService } from '../../../core/error-handling/notification.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { RoleChangeDialog, RoleChangeDialogData } from './role-change-dialog/role-change-dialog';

/**
 * GET /api/users/authentication/{id} (added specifically to close this gap) reuses the same
 * lookup as the self-service GET /api/auth/me, so this page can now show real personal
 * information instead of only what the role-assignments listing knew (username + role).
 */
@Component({
  selector: 'app-user-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    PageHeader,
    LoadingSpinner,
    EmptyState,
  ],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
})
export class UserDetail implements OnInit {
  private readonly userManagement = inject(UserManagementService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly id = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly detail = signal<CurrentUserResponse | null>(null);
  protected readonly assignments = signal<RoleAssignmentResponse[]>([]);
  protected readonly roles = signal<RoleResponse[]>([]);
  protected readonly settingPrincipalContact = signal(false);

  ngOnInit(): void {
    this.load();
  }

  protected changeRole(): void {
    const username = this.detail()?.username ?? '';
    const data: RoleChangeDialogData = {
      username,
      userAuthenticationId: this.id(),
      currentAssignmentIds: this.assignments().map((a) => a.id),
      currentRoleId: this.assignments()[0]?.roleId ?? null,
      roles: this.roles(),
    };
    this.dialog
      .open(RoleChangeDialog, { data, width: '420px' })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) {
          this.load();
        }
      });
  }

  protected isAdministrator(): boolean {
    return this.detail()?.roles.includes(ROLE_ADMINISTRATOR) ?? false;
  }

  /** Mirrors the backend's own preconditions (PrincipalContactService.set) so the button is disabled with a clear reason instead of just failing on click. */
  protected canBecomePrincipalContact(): boolean {
    const user = this.detail();
    return !!user && this.isAdministrator() && !!user.contactNumber && !user.principalContact;
  }

  protected principalContactBlockedReason(): string {
    const user = this.detail();
    if (!user) {
      return '';
    }
    if (user.principalContact) {
      return 'Already the principal contact';
    }
    if (!this.isAdministrator()) {
      return 'Only an administrator can be the principal contact';
    }
    if (!user.contactNumber) {
      return 'This account has no contact number on file';
    }
    return '';
  }

  protected setPrincipalContact(): void {
    const user = this.detail();
    if (!user || !this.canBecomePrincipalContact() || this.settingPrincipalContact()) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: 'Set as principal contact?',
        message: `This makes ${user.username} the principal contact for customer WhatsApp notifications (pickup and component-request alerts). Whoever currently holds it will automatically be replaced.`,
        confirmLabel: 'Set as principal contact',
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.settingPrincipalContact.set(true);
        this.userManagement.setPrincipalContact(this.id()).subscribe({
          next: () => {
            this.settingPrincipalContact.set(false);
            this.notifications.success(`${user.username} is now the principal contact.`);
            this.load();
          },
          error: (error: unknown) => {
            this.settingPrincipalContact.set(false);
            const message =
              error instanceof HttpErrorResponse ? (error.error as ApiError | undefined)?.message : undefined;
            this.notifications.error(message ?? 'Unable to set this user as the principal contact.');
          },
        });
      });
  }

  private load(): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.userManagement.listRoles({ size: 100, sort: 'name,asc' }).subscribe((page) => this.roles.set(page.content));
    this.userManagement.listRoleAssignments({ size: 200 }).subscribe((page) => {
      this.assignments.set(page.content.filter((a) => a.userAuthenticationId === this.id()));
    });
    this.userManagement.getAuthenticationDetail(this.id()).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }
}
