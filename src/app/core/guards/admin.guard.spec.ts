import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { adminGuard } from './admin.guard';
import { AuthService } from '../auth/auth.service';

describe('adminGuard', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() => adminGuard({} as never, { url } as never));
  }

  it('redirects to login when the user is not authenticated', () => {
    const result = runGuard('/admin/inventory');

    const tree = result as UrlTree;
    expect(router.serializeUrl(tree)).toBe('/login?returnUrl=%2Fadmin%2Finventory');
  });

  it('redirects to forbidden when an authenticated guest (not an administrator) tries to access an admin route', () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'isAdministrator').mockReturnValue(false);

    const result = runGuard('/admin/inventory');

    const tree = result as UrlTree;
    expect(router.serializeUrl(tree)).toBe('/forbidden');
  });

  it('allows navigation for an authenticated administrator, based on the roles claim', () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'isAdministrator').mockReturnValue(true);

    expect(runGuard('/admin/inventory')).toBe(true);
  });
});
