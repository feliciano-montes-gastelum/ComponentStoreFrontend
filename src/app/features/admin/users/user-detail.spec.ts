import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { UserDetail } from './user-detail';
import { ApiPaths } from '../../../core/api-paths';
import { CurrentUserResponse, PageResponse, RoleAssignmentResponse, RoleResponse } from '../../../core/models';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';

function emptyPage<T>(): PageResponse<T> {
  return { content: [], totalElements: 0, totalPages: 0, size: 200, number: 0, first: true, last: true, numberOfElements: 0, empty: true };
}

const DETAIL: CurrentUserResponse = {
  userId: 'user-1',
  userInformationId: 'info-1',
  username: 'jdoe',
  email: 'jdoe@example.com',
  firstName: 'Jane',
  middleName: null,
  lastName: 'Doe',
  secondLastName: null,
  contactNumber: '555-1234',
  addressLine1: '123 Main St',
  addressLine2: null,
  city: 'Tijuana',
  stateProvince: 'BC',
  postalCode: '22000',
  country: 'Mexico',
  studingArea: null,
  schoolID: null,
  principalContact: false,
  active: true,
  twoFactorEnabled: false,
  lastLoginAt: null,
  roles: ['ROLE_GUEST'],
};

const ASSIGNMENTS: RoleAssignmentResponse[] = [
  { id: 'a-1', userAuthenticationId: 'user-1', username: 'jdoe', roleId: 'r-1', roleName: 'ROLE_GUEST' },
];

describe('UserDetail (admin) — personal information lookup', () => {
  let httpMock: HttpTestingController;

  function setup(confirmResult = true) {
    TestBed.configureTestingModule({
      imports: [UserDetail],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmDialogService, useValue: { confirm: () => of(confirmResult) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('fetches and displays personal information via GET /api/users/authentication/{id}', async () => {
    setup();
    const fixture = TestBed.createComponent(UserDetail);
    fixture.componentRef.setInput('id', 'user-1');
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === ApiPaths.users.roles).flush(emptyPage<RoleResponse>());
    httpMock.expectOne((r) => r.url === ApiPaths.users.roleAssignments).flush({ ...emptyPage<RoleAssignmentResponse>(), content: ASSIGNMENTS });
    const req = httpMock.expectOne((r) => r.url === ApiPaths.users.authenticationItem('user-1'));
    expect(req.request.method).toBe('GET');
    req.flush(DETAIL);
    await fixture.whenStable();

    const component = fixture.componentInstance;
    expect(component['loading']()).toBe(false);
    expect(component['detail']()?.email).toBe('jdoe@example.com');
    expect(component['detail']()?.addressLine1).toBe('123 Main St');
  });

  it('shows a not-found state when the account id has no matching account', async () => {
    setup();
    const fixture = TestBed.createComponent(UserDetail);
    fixture.componentRef.setInput('id', 'missing-user');
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === ApiPaths.users.roles).flush(emptyPage<RoleResponse>());
    httpMock.expectOne((r) => r.url === ApiPaths.users.roleAssignments).flush(emptyPage<RoleAssignmentResponse>());
    httpMock.expectOne((r) => r.url === ApiPaths.users.authenticationItem('missing-user')).flush(
      { timestamp: '', status: 404, error: 'Not Found', message: 'Not found', path: '', fieldErrors: {} },
      { status: 404, statusText: 'Not Found' }
    );
    await fixture.whenStable();

    expect(fixture.componentInstance['notFound']()).toBe(true);
  });

  async function loadDetail(fixture: ComponentFixture<UserDetail>, detail: CurrentUserResponse) {
    fixture.componentRef.setInput('id', detail.userId);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ApiPaths.users.roles).flush(emptyPage<RoleResponse>());
    httpMock.expectOne((r) => r.url === ApiPaths.users.roleAssignments).flush(emptyPage<RoleAssignmentResponse>());
    httpMock.expectOne((r) => r.url === ApiPaths.users.authenticationItem(detail.userId)).flush(detail);
    await fixture.whenStable();
  }

  it('only allows setting an administrator with a contact number as the principal contact', async () => {
    setup();
    const fixture = TestBed.createComponent(UserDetail);
    await loadDetail(fixture, { ...DETAIL, roles: ['ROLE_GUEST'] });

    const component = fixture.componentInstance;
    expect(component['canBecomePrincipalContact']()).toBe(false);
    expect(component['principalContactBlockedReason']()).toContain('administrator');
  });

  it('replaces the current principal contact via a confirmation dialog', async () => {
    setup(true);
    const fixture = TestBed.createComponent(UserDetail);
    await loadDetail(fixture, { ...DETAIL, roles: ['ROLE_ADMINISTRATOR'], contactNumber: '555-1234' });

    const component = fixture.componentInstance;
    expect(component['canBecomePrincipalContact']()).toBe(true);
    component['setPrincipalContact']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.users.principalContact('user-1'));
    expect(req.request.method).toBe('PUT');
    req.flush({ firstName: 'Jane', lastName: 'Doe', email: 'jdoe@example.com', contactNumber: '555-1234', whatsappNumber: '5551234' });

    // The page reloads the account detail afterwards to pick up the new principalContact flag.
    httpMock.expectOne((r) => r.url === ApiPaths.users.roles).flush(emptyPage<RoleResponse>());
    httpMock.expectOne((r) => r.url === ApiPaths.users.roleAssignments).flush(emptyPage<RoleAssignmentResponse>());
    httpMock
      .expectOne((r) => r.url === ApiPaths.users.authenticationItem('user-1'))
      .flush({ ...DETAIL, roles: ['ROLE_ADMINISTRATOR'], contactNumber: '555-1234', principalContact: true });
    await fixture.whenStable();

    expect(component['detail']()?.principalContact).toBe(true);
  });

  it('does not call the backend when the replacement confirmation is dismissed', async () => {
    setup(false);
    const fixture = TestBed.createComponent(UserDetail);
    await loadDetail(fixture, { ...DETAIL, roles: ['ROLE_ADMINISTRATOR'], contactNumber: '555-1234' });

    fixture.componentInstance['setPrincipalContact']();

    httpMock.expectNone(ApiPaths.users.principalContact('user-1'));
  });
});
