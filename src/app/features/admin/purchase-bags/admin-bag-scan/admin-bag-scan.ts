import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PurchaseBagService } from '../../../../core/services/purchase-bag.service';
import { UserManagementService } from '../../../../core/services/user-management.service';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';

/**
 * Landing page for the deep link encoded in a user's profile QR code
 * (`${origin}/admin/scan/:userAuthenticationId`). Looks up that user's current open bag and
 * jumps straight to its admin detail page; if they don't have one right now, offers a link to
 * their full bag history instead. Guarded by adminGuard like the rest of /admin/**.
 */
@Component({
  selector: 'app-admin-bag-scan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, LoadingSpinner, EmptyState],
  templateUrl: './admin-bag-scan.html',
  styleUrl: './admin-bag-scan.css',
})
export class AdminBagScan implements OnInit {
  private readonly bagService = inject(PurchaseBagService);
  private readonly userManagement = inject(UserManagementService);
  private readonly router = inject(Router);

  readonly userAuthenticationId = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly noOpenBag = signal(false);
  protected readonly errored = signal(false);
  protected readonly username = signal<string | null>(null);

  ngOnInit(): void {
    this.userManagement.getAuthenticationDetail(this.userAuthenticationId()).subscribe({
      next: (detail) => this.username.set(detail.username),
      error: () => undefined, // cosmetic only — the lookup below still proceeds regardless.
    });

    this.bagService.list({ userAuthenticationId: this.userAuthenticationId(), status: 'OPEN', size: 1 }).subscribe({
      next: (page) => {
        const bag = page.content[0];
        if (bag) {
          void this.router.navigate(['/admin/purchase-bags', bag.id], { replaceUrl: true });
          return;
        }
        this.loading.set(false);
        this.noOpenBag.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.errored.set(true);
      },
    });
  }
}
