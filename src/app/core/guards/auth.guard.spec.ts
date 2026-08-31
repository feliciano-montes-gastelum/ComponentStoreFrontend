import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { authGuard } from './auth.guard';
import { AuthService } from '../auth/auth.service';

describe('authGuard', () => {
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
    return TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url } as never)
    );
  }

  it('allows navigation when the user is authenticated', () => {
    expect(auth.isAuthenticated()).toBe(false);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);

    expect(runGuard('/profile')).toBe(true);
  });

  it('redirects to login with a returnUrl when the user is not authenticated', () => {
    const result = runGuard('/profile');

    expect(result).not.toBe(true);
    const tree = result as UrlTree;
    expect(router.serializeUrl(tree)).toBe('/login?returnUrl=%2Fprofile');
  });
});
