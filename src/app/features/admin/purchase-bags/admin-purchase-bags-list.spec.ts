import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminPurchaseBagsList } from './admin-purchase-bags-list';
import { ApiPaths } from '../../../core/api-paths';
import { PageResponse, PurchaseBagResponse, RoleAssignmentResponse } from '../../../core/models';

function emptyPage<T>(): PageResponse<T> {
  return { content: [], totalElements: 0, totalPages: 0, size: 15, number: 0, first: true, last: true, numberOfElements: 0, empty: true };
}

const ASSIGNMENTS: RoleAssignmentResponse[] = [
  { id: 'a-1', userAuthenticationId: 'user-1', username: 'jdoe', roleId: 'r-1', roleName: 'ROLE_GUEST' },
];

describe('AdminPurchaseBagsList', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPurchaseBagsList],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function bootstrap() {
    const fixture = TestBed.createComponent(AdminPurchaseBagsList);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ApiPaths.users.roleAssignments).flush({ ...emptyPage<RoleAssignmentResponse>(), content: ASSIGNMENTS });
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.collection).flush(emptyPage<PurchaseBagResponse>());
    return fixture;
  }

  it('loads the unfiltered list of purchase bags on init', () => {
    const fixture = bootstrap();
    expect(fixture.componentInstance['loading']()).toBe(false);
  });

  it('re-queries with the selected status when the status filter changes', () => {
    const fixture = bootstrap();

    fixture.componentInstance['statusControl'].setValue('OPEN');

    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.collection);
    expect(req.request.params.get('status')).toBe('OPEN');
    req.flush(emptyPage<PurchaseBagResponse>());
  });

  it('re-queries scoped to the selected customer when the user filter changes', () => {
    const fixture = bootstrap();

    fixture.componentInstance['userControl'].setValue('user-1');

    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.collection);
    expect(req.request.params.get('userAuthenticationId')).toBe('user-1');
    req.flush(emptyPage<PurchaseBagResponse>());
  });

  it('combines the customer and status filters in the same request', () => {
    const fixture = bootstrap();

    fixture.componentInstance['userControl'].setValue('user-1');
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.collection).flush(emptyPage<PurchaseBagResponse>());

    fixture.componentInstance['statusControl'].setValue('CLOSED');
    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.collection);
    expect(req.request.params.get('userAuthenticationId')).toBe('user-1');
    expect(req.request.params.get('status')).toBe('CLOSED');
    req.flush(emptyPage<PurchaseBagResponse>());
  });
});
