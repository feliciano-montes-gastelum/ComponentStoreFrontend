import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { ApiPaths } from '../api-paths';
import { AuthenticationResponse } from '../models';
import { environment } from '../../../environments/environment';

function futureIso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

const AUTH_RESPONSE: AuthenticationResponse = {
  token: 'jwt-token-value',
  tokenType: 'Bearer',
  expiresAt: futureIso(24),
  userId: 'user-auth-id-1',
  username: 'jdoe',
  roles: ['ROLE_GUEST'],
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('starts unauthenticated with no stored session', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.username()).toBeNull();
    expect(service.getToken()).toBeNull();
  });

  it('stores the session and exposes derived state after a successful login', () => {
    service.login({ usernameOrEmail: 'jdoe', password: 'super-secret-pw' }).subscribe();

    const req = httpMock.expectOne(ApiPaths.auth.login);
    expect(req.request.method).toBe('POST');
    req.flush(AUTH_RESPONSE);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.username()).toBe('jdoe');
    expect(service.userId()).toBe('user-auth-id-1');
    expect(service.roles()).toEqual(['ROLE_GUEST']);
    expect(service.isAdministrator()).toBe(false);
    expect(service.isGuest()).toBe(true);
    expect(service.getToken()).toBe('jwt-token-value');
    expect(localStorage.getItem('cs_auth_session')).toContain('jwt-token-value');
  });

  it('identifies administrators from the roles claim, not a hard-coded username', () => {
    service.login({ usernameOrEmail: 'admin', password: 'super-secret-pw' }).subscribe();
    httpMock.expectOne(ApiPaths.auth.login).flush({ ...AUTH_RESPONSE, username: 'admin', roles: ['ROLE_ADMINISTRATOR'] });

    expect(service.isAdministrator()).toBe(true);
    expect(service.isGuest()).toBe(false);
  });

  it('clears the session on logout', () => {
    service.login({ usernameOrEmail: 'jdoe', password: 'super-secret-pw' }).subscribe();
    httpMock.expectOne(ApiPaths.auth.login).flush(AUTH_RESPONSE);

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(localStorage.getItem('cs_auth_session')).toBeNull();
  });

  it('discards an already-expired session found in storage on startup', () => {
    localStorage.setItem(
      'cs_auth_session',
      JSON.stringify({ ...AUTH_RESPONSE, expiresAt: new Date(Date.now() - 1000).toISOString() })
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    const freshService = TestBed.inject(AuthService);

    expect(freshService.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('cs_auth_session')).toBeNull();
  });

  describe('setDevRole (development-only role switcher)', () => {
    // setDevRole() no-ops unless environment.enableDevRoleSwitcher is true; pin it to true for
    // these tests regardless of which environment file the unit-test build happens to select,
    // and restore it afterwards so other spec files are unaffected (the object is module-shared).
    const originalEnableDevRoleSwitcher = environment.enableDevRoleSwitcher;
    beforeEach(() => {
      environment.enableDevRoleSwitcher = true;
    });
    afterEach(() => {
      environment.enableDevRoleSwitcher = originalEnableDevRoleSwitcher;
    });

    it('does nothing when environment.enableDevRoleSwitcher is false (production and "local")', () => {
      environment.enableDevRoleSwitcher = false;

      service.setDevRole('ROLE_ADMINISTRATOR');

      expect(service.isAuthenticated()).toBe(false);
    });

    it('fabricates a local administrator session without calling the backend', () => {
      service.setDevRole('ROLE_ADMINISTRATOR');

      expect(service.isAuthenticated()).toBe(true);
      expect(service.isAdministrator()).toBe(true);
      expect(service.isDevSession()).toBe(true);
      httpMock.expectNone(ApiPaths.auth.login);
      httpMock.expectNone(ApiPaths.auth.register);
    });

    it('fabricates a local guest session without calling the backend', () => {
      service.setDevRole('ROLE_GUEST');

      expect(service.isAuthenticated()).toBe(true);
      expect(service.isAdministrator()).toBe(false);
      expect(service.isGuest()).toBe(true);
      expect(service.isDevSession()).toBe(true);
    });

    it('logs out when switched to the anonymous (not logged in) option', () => {
      service.setDevRole('ROLE_ADMINISTRATOR');
      service.setDevRole(null);

      expect(service.isAuthenticated()).toBe(false);
      expect(service.isDevSession()).toBe(false);
    });

    it('never marks a real login as a dev session', () => {
      service.login({ usernameOrEmail: 'jdoe', password: 'super-secret-pw' }).subscribe();
      httpMock.expectOne(ApiPaths.auth.login).flush(AUTH_RESPONSE);

      expect(service.isDevSession()).toBe(false);
    });
  });
});
