import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';

/** Requires ROLE_ADMINISTRATOR, based on the roles claim from the backend/JWT — never a hard-coded username. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (!auth.isAdministrator()) {
    return router.createUrlTree(['/forbidden']);
  }

  return true;
};
