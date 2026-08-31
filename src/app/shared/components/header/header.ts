import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';

import { AuthService } from '../../../core/auth/auth.service';
import { PurchaseBagService } from '../../../core/services/purchase-bag.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  protected readonly auth = inject(AuthService);
  protected readonly bag = inject(PurchaseBagService);
  private readonly router = inject(Router);

  constructor() {
    // Keeps the bag badge accurate across sign-in/sign-out without a dedicated cart-state
    // service: refresh it whenever a session starts, and clear it when one ends.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.bag.refreshCount();
      } else {
        this.bag.resetCount();
      }
    });
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/']);
  }
}
