import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Login } from './login';
import { ApiPaths } from '../../../core/api-paths';
import { AuthenticationResponse } from '../../../core/models';

describe('Login', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('marks required fields invalid when submitted empty, without calling the backend', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;

    (component as unknown as { submit: () => void }).submit();

    const form = (component as unknown as { form: { get: (name: string) => { invalid: boolean } } }).form;
    expect(form.get('usernameOrEmail')?.invalid).toBe(true);
    expect(form.get('password')?.invalid).toBe(true);
    httpMock.expectNone(ApiPaths.auth.login);
  });

  it('submits valid credentials and stores the session on success', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const form = (component as unknown as { form: { setValue: (v: unknown) => void } }).form;

    form.setValue({ usernameOrEmail: 'jdoe', password: 'super-secret-pw' });
    (component as unknown as { submit: () => void }).submit();

    const req = httpMock.expectOne(ApiPaths.auth.login);
    const response: AuthenticationResponse = {
      token: 'jwt-token-value',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      userId: 'user-1',
      username: 'jdoe',
      roles: ['ROLE_GUEST'],
    };
    req.flush(response);

    expect(localStorage.getItem('cs_auth_session')).toContain('jwt-token-value');
  });

  it('shows the backend error message when login fails', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const form = (component as unknown as { form: { setValue: (v: unknown) => void } }).form;

    form.setValue({ usernameOrEmail: 'jdoe', password: 'wrong-password' });
    (component as unknown as { submit: () => void }).submit();

    const req = httpMock.expectOne(ApiPaths.auth.login);
    req.flush(
      { timestamp: '', status: 401, error: 'Unauthorized', message: 'Invalid username or password', path: '', fieldErrors: {} },
      { status: 401, statusText: 'Unauthorized' }
    );

    const errorMessage = (component as unknown as { errorMessage: () => string | null }).errorMessage();
    expect(errorMessage).toBe('Invalid username or password');
  });
});
