import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/auth/auth.service';
import { AppRole, ROLE_ADMINISTRATOR, ROLE_GUEST } from '../../../core/models';
import { environment } from '../../../../environments/environment';

type DevRoleOption = AppRole | 'ANONYMOUS';

/**
 * Development-only widget that fabricates a local session (see AuthService.setDevRole) so the
 * app's role-based UI and route guards can be previewed as an anonymous visitor, a guest, or an
 * administrator without a real backend login. Requires the backend's "develop" Spring profile
 * (which disables authorization/JWT validation) to actually be running — otherwise API calls
 * will simply 401/403 like they would for anyone else, since this never talks to the backend.
 *
 * Rendered only when `environment.enableDevRoleSwitcher` is true (see app.html) — on for the
 * "development" environment, off for "production" and for "local" (which is meant for testing
 * different account views by really signing in, without this fabricated-session shortcut).
 * Also no-ops internally as a second guard so it can never do anything even if reused elsewhere.
 */
@Component({
  selector: 'app-dev-role-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonToggleModule, MatIconModule],
  templateUrl: './dev-role-switcher.html',
  styleUrl: './dev-role-switcher.css',
})
export class DevRoleSwitcher {
  protected readonly auth = inject(AuthService);
  protected readonly isEnabled = environment.enableDevRoleSwitcher;

  protected currentOption(): DevRoleOption {
    if (!this.auth.isAuthenticated()) {
      return 'ANONYMOUS';
    }
    return this.auth.isAdministrator() ? ROLE_ADMINISTRATOR : ROLE_GUEST;
  }

  protected onChange(event: MatButtonToggleChange): void {
    if (!environment.enableDevRoleSwitcher) {
      return;
    }
    const value = event.value as DevRoleOption;
    this.auth.setDevRole(value === 'ANONYMOUS' ? null : value);
  }
}
