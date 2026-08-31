import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { RoleAssignmentResponse, RoleResponse } from '../../../core/models';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { RoleChangeDialog, RoleChangeDialogData } from './role-change-dialog/role-change-dialog';

interface UserRow {
  userAuthenticationId: string;
  username: string;
  assignments: RoleAssignmentResponse[];
}

@Component({
  selector: 'app-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    PageHeader,
    LoadingSpinner,
    EmptyState,
  ],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
})
export class UsersList implements OnInit {
  private readonly userManagement = inject(UserManagementService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly rows = signal<UserRow[]>([]);
  protected readonly roles = signal<RoleResponse[]>([]);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly displayedColumns = ['username', 'roles', 'actions'];

  private readonly searchTerm = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  protected readonly filteredRows = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.rows();
    }
    return this.rows().filter((row) => row.username.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.load();
  }

  protected changeRole(row: UserRow): void {
    const currentRoleId = row.assignments[0]?.roleId ?? null;
    const data: RoleChangeDialogData = {
      username: row.username,
      userAuthenticationId: row.userAuthenticationId,
      currentAssignmentIds: row.assignments.map((a) => a.id),
      currentRoleId,
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

  protected isCurrentUser(row: UserRow): boolean {
    return row.username === this.auth.username();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      roles: this.userManagement.listRoles({ size: 100, sort: 'name,asc' }),
      assignments: this.userManagement.listRoleAssignments({ size: 200 }),
    }).subscribe({
      next: ({ roles, assignments }) => {
        this.roles.set(roles.content);
        this.rows.set(this.groupByUser(assignments.content));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private groupByUser(assignments: RoleAssignmentResponse[]): UserRow[] {
    const byUser = new Map<string, UserRow>();
    for (const assignment of assignments) {
      const existing = byUser.get(assignment.userAuthenticationId);
      if (existing) {
        existing.assignments.push(assignment);
      } else {
        byUser.set(assignment.userAuthenticationId, {
          userAuthenticationId: assignment.userAuthenticationId,
          username: assignment.username,
          assignments: [assignment],
        });
      }
    }
    return Array.from(byUser.values()).sort((a, b) => a.username.localeCompare(b.username));
  }
}
