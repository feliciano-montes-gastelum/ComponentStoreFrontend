import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../auth/auth.service';
import { ApiPaths } from '../api-paths';
import { AuthenticationResponse } from '../models';
import { environment } from '../../../environments/environment';

const AUTH_RESPONSE: AuthenticationResponse = {
  token: 'jwt-token-value',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  userId: 'user-auth-id-1',
  username: 'jdoe',
  roles: ['ROLE_GUEST'],
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function login(): void {
    auth.login({ usernameOrEmail: 'jdoe', password: 'super-secret-pw' }).subscribe();
    httpMock.expectOne(ApiPaths.auth.login).flush(AUTH_RESPONSE);
  }

  it('does not attach an Authorization header when there is no session', () => {
    http.get(`${environment.apiBaseUrl}/inventory`).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/inventory`);
    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('attaches the bearer token to authenticated requests', () => {
    login();

    http.get(`${environment.apiBaseUrl}/inventory`).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/inventory`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token-value');
  });

  it('attaches the X-User header on mutating requests but not on GET requests', () => {
    login();

    http.post(`${environment.apiBaseUrl}/inventory`, {}).subscribe();
    const postReq = httpMock.expectOne(`${environment.apiBaseUrl}/inventory`);
    expect(postReq.request.headers.get('X-User')).toBe('jdoe');

    http.get(`${environment.apiBaseUrl}/inventory`).subscribe();
    const getReq = httpMock.expectOne(`${environment.apiBaseUrl}/inventory`);
    expect(getReq.request.headers.has('X-User')).toBe(false);
  });

  it('does not attach auth headers to requests outside the backend API', () => {
    login();

    http.get('https://fonts.googleapis.com/some-font').subscribe();
    const req = httpMock.expectOne('https://fonts.googleapis.com/some-font');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });
});
