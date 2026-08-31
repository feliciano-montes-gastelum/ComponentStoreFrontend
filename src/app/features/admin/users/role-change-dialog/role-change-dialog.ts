import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserManagementService } from '../../../../core/services/user-management.service';
import { NotificationService } from '../../../../core/error-handling/notification.service';
import { RoleResponse } from '../../../../core/models';

export interface RoleChangeDialogData {
  username: string;
  userAuthenticationId: string;
  currentAssignmentIds: string[];
  currentRoleId: string | null;
  roles: RoleResponse[];
}

@Component({
  selector: 'app-role-change-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatRadioModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Change role for {{ data.username }}</h2>
    <mat-dialog-content>
      <mat-radio-group [(ngModel)]="selectedRoleId" class="app-role-radio-group">
        @for (role of data.roles; track role.id) {
          <mat-radio-button [value]="role.id">{{ role.name }}</mat-radio-button>
        }
      </mat-radio-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="null">Cancel</button>
      <button
        mat-flat-button
        type="button"
        [disabled]="submitting() || selectedRoleId === data.currentRoleId"
        (click)="submit()"
      >
        @if (submitting()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          Save
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .app-role-radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: min(320px, 80vw);
      }
    `,
  ],
})
export class RoleChangeDialog {
  protected readonly data = inject<RoleChangeDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RoleChangeDialog, boolean>);
  private readonly userManagement = inject(UserManagementService);
  private readonly notifications = inject(NotificationService);

  protected selectedRoleId = this.data.currentRoleId ?? undefined;
  protected readonly submitting = signal(false);

  protected submit(): void {
    if (!this.selectedRoleId || this.submitting()) {
      return;
    }
    this.submitting.set(true);

    this.userManagement
      .createRoleAssignment({ userAuthenticationId: this.data.userAuthenticationId, roleId: this.selectedRoleId })
      .subscribe({
        next: () => this.removeOldAssignments(),
        error: () => {
          this.submitting.set(false);
          this.notifications.error('Unable to assign the new role.');
        },
      });
  }

  private removeOldAssignments(): void {
    const idsToRemove = this.data.currentAssignmentIds;
    if (idsToRemove.length === 0) {
      this.finish();
      return;
    }
    let remaining = idsToRemove.length;
    idsToRemove.forEach((assignmentId) => {
      this.userManagement.removeRoleAssignment(assignmentId).subscribe({
        next: () => {
          remaining -= 1;
          if (remaining === 0) {
            this.finish();
          }
        },
        error: () => {
          remaining -= 1;
          if (remaining === 0) {
            this.finish();
          }
        },
      });
    });
  }

  private finish(): void {
    this.submitting.set(false);
    this.dialogRef.close(true);
  }
}
