import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ForgotPassword } from './forgot-password';
import { ApiPaths } from '../../../core/api-paths';

function setEmail(component: ForgotPassword, email: string) {
  component['emailForm'].setValue({ email });
}

describe('ForgotPassword', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('requests a reset code and shows the backend\'s own generic message (never revealing whether the email exists)', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    const component = fixture.componentInstance;

    setEmail(component, 'jdoe@example.com');
    component['submitEmail']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.auth.passwordResetRequest);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'jdoe@example.com' });
    req.flush({ message: 'If an active account exists for that email, a reset code has been sent' });

    expect(component['step']()).toBe('code');
    expect(component['infoMessage']()).toBe('If an active account exists for that email, a reset code has been sent');
  });

  it('does not call the backend when the code is not exactly 6 digits', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    const component = fixture.componentInstance;
    setEmail(component, 'jdoe@example.com');
    component['submitEmail']();
    httpMock.expectOne((r) => r.url === ApiPaths.auth.passwordResetRequest).flush({ message: 'ok' });

    component['codeForm'].setValue({ code: '123' });
    component['submitCode']();

    httpMock.expectNone((r) => r.url === ApiPaths.auth.passwordResetVerify);
    expect(component['codeForm'].invalid).toBe(true);
  });

  it('shows an error and stays on the code step when the code is wrong or expired', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    const component = fixture.componentInstance;
    setEmail(component, 'jdoe@example.com');
    component['submitEmail']();
    httpMock.expectOne((r) => r.url === ApiPaths.auth.passwordResetRequest).flush({ message: 'ok' });

    component['codeForm'].setValue({ code: '000000' });
    component['submitCode']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.auth.passwordResetVerify);
    expect(req.request.body).toEqual({ email: 'jdoe@example.com', code: '000000' });
    req.flush(
      { timestamp: '', status: 401, error: 'Unauthorized', message: 'The password reset code is invalid or expired', path: '', fieldErrors: {} },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(component['step']()).toBe('code');
    expect(component['errorMessage']()).toBe('The password reset code is invalid or expired');
  });

  it('resends the code without leaving the code step', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    const component = fixture.componentInstance;
    setEmail(component, 'jdoe@example.com');
    component['submitEmail']();
    httpMock.expectOne((r) => r.url === ApiPaths.auth.passwordResetRequest).flush({ message: 'First message' });

    component['resendCode']();
    const req = httpMock.expectOne((r) => r.url === ApiPaths.auth.passwordResetRequest);
    req.flush({ message: 'Second message' });

    expect(component['step']()).toBe('code');
    expect(component['infoMessage']()).toBe('Second message');
  });

  function advanceToPasswordStep(component: ForgotPassword) {
    setEmail(component, 'jdoe@example.com');
    component['submitEmail']();
    httpMock.expectOne((r) => r.url === ApiPaths.auth.passwordResetRequest).flush({ message: 'ok' });

    component['codeForm'].setValue({ code: '123456' });
    component['submitCode']();
    httpMock
      .expectOne((r) => r.url === ApiPaths.auth.passwordResetVerify)
      .flush({ resetToken: 'jwt-reset-token', tokenType: 'Bearer', expiresAt: new Date(Date.now() + 60_000).toISOString() });
  }

  it('verifies the code and advances to the password step', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    const component = fixture.componentInstance;
    advanceToPasswordStep(component);

    expect(component['step']()).toBe('password');
  });

  it('blocks submission when the passwords do not match', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    const component = fixture.componentInstance;
    advanceToPasswordStep(component);

    component['passwordForm'].setValue({ newPassword: 'Sup3r-Secret!', confirmPassword: 'Different!1' });
    component['submitPassword']();

    httpMock.expectNone((r) => r.url === ApiPaths.auth.passwordResetConfirm);
    expect(component['passwordForm'].errors?.['passwordMismatch']).toBe(true);
  });

  it('blocks submission when the new password has no special character', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    const component = fixture.componentInstance;
    advanceToPasswordStep(component);

    component['passwordForm'].setValue({ newPassword: 'noSpecialChar1', confirmPassword: 'noSpecialChar1' });
    component['submitPassword']();

    httpMock.expectNone((r) => r.url === ApiPaths.auth.passwordResetConfirm);
    expect(component['passwordForm'].get('newPassword')?.errors?.['missingSpecialCharacter']).toBe(true);
  });

  it('resets the password using the token from the verify step, then shows the done step', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    const component = fixture.componentInstance;
    advanceToPasswordStep(component);

    component['passwordForm'].setValue({ newPassword: 'Sup3r-Secret!', confirmPassword: 'Sup3r-Secret!' });
    component['submitPassword']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.auth.passwordResetConfirm);
    expect(req.request.body).toEqual({ token: 'jwt-reset-token', newPassword: 'Sup3r-Secret!' });
    req.flush({ message: 'Password has been reset successfully' });

    expect(component['step']()).toBe('done');

    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    component['goToLogin']();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('shows an error and allows starting over when the reset token is invalid or expired', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    const component = fixture.componentInstance;
    advanceToPasswordStep(component);

    component['passwordForm'].setValue({ newPassword: 'Sup3r-Secret!', confirmPassword: 'Sup3r-Secret!' });
    component['submitPassword']();

    httpMock.expectOne((r) => r.url === ApiPaths.auth.passwordResetConfirm).flush(
      { timestamp: '', status: 401, error: 'Unauthorized', message: 'The password reset token is invalid, expired, or already used', path: '', fieldErrors: {} },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(component['step']()).toBe('password');
    expect(component['errorMessage']()).toBe('The password reset token is invalid, expired, or already used');

    component['startOver']();
    expect(component['step']()).toBe('email');

    // The spent/rejected token must never be reused after starting over.
    component['codeForm'].setValue({ code: '123456' });
    component['submitCode']();
    httpMock
      .expectOne((r) => r.url === ApiPaths.auth.passwordResetVerify)
      .flush({ resetToken: 'brand-new-token', tokenType: 'Bearer', expiresAt: new Date(Date.now() + 60_000).toISOString() });
    component['passwordForm'].setValue({ newPassword: 'Sup3r-Secret!', confirmPassword: 'Sup3r-Secret!' });
    component['submitPassword']();
    const secondReq = httpMock.expectOne((r) => r.url === ApiPaths.auth.passwordResetConfirm);
    expect(secondReq.request.body).toEqual({ token: 'brand-new-token', newPassword: 'Sup3r-Secret!' });
    secondReq.flush({ message: 'Password has been reset successfully' });
  });
});
