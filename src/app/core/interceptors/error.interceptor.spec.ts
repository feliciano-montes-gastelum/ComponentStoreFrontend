import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../error-handling/notification.service';
import { ApiPaths } from '../api-paths';
import { environment } from '../../../environments/environment';

function seedAuthenticatedSession(): void {
  localStorage.setItem(
    'cs_auth_session',
    JSON.stringify({
      token: 'jwt-token-value',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      userId: 'user-1',
      username: 'jdoe',
      roles: ['ROLE_GUEST'],
    })
  );
}

describe('errorInterceptor — auto-logout on an invalid/expired session', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;
  let notifications: NotificationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('logs out, notifies, and redirects to /login (preserving the current URL) on a 401 from a signed-in session', async () => {
    seedAuthenticatedSession();
    auth = TestBed.inject(AuthService);
    expect(auth.isAuthenticated()).toBe(true);

    const navigateSpy = vi.spyOn(router, 'navigate');
    const errorSpy = vi.spyOn(notifications, 'error');

    http.get(`${environment.apiBaseUrl}/inventory-history`).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/inventory-history`)
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('cs_auth_session')).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('Your session has expired. Please sign in again.');
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: router.url } });
  });

  it('does not log out (there is no session to invalidate) when a 401 happens while already signed out', () => {
    auth = TestBed.inject(AuthService);
    expect(auth.isAuthenticated()).toBe(false);

    const navigateSpy = vi.spyOn(router, 'navigate');
    const errorSpy = vi.spyOn(notifications, 'error');

    http.get(`${environment.apiBaseUrl}/purchase-bags/me`).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/purchase-bags/me`)
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not treat a failed login/register attempt itself as a session-ending 401', () => {
    seedAuthenticatedSession();
    auth = TestBed.inject(AuthService);
    const navigateSpy = vi.spyOn(router, 'navigate');

    http.post(ApiPaths.auth.login, { usernameOrEmail: 'jdoe', password: 'wrong' }).subscribe({ error: () => undefined });
    httpMock.expectOne(ApiPaths.auth.login).flush({ message: 'Invalid username or password' }, { status: 401, statusText: 'Unauthorized' });

    // A wrong password on /auth/login must not blow away an unrelated, still-valid existing session.
    expect(auth.isAuthenticated()).toBe(true);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('shows a permission notice (and redirects a blocked page load to /forbidden) on a 403', () => {
    auth = TestBed.inject(AuthService);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const errorSpy = vi.spyOn(notifications, 'error');

    http.get(`${environment.apiBaseUrl}/users/roles`).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/users/roles`)
      .flush({ message: 'You do not have permission to perform this action.' }, { status: 403, statusText: 'Forbidden' });

    expect(errorSpy).toHaveBeenCalledWith('You do not have permission to perform this action.');
    expect(navigateSpy).toHaveBeenCalledWith(['/forbidden']);
  });

  it('does not redirect to /forbidden for a 403 on a mutating request (only GET page loads)', () => {
    auth = TestBed.inject(AuthService);
    const navigateSpy = vi.spyOn(router, 'navigate');

    http.post(`${environment.apiBaseUrl}/users/roles`, {}).subscribe({ error: () => undefined });
    httpMock.expectOne(`${environment.apiBaseUrl}/users/roles`).flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
