import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminBagScan } from './admin-bag-scan';
import { ApiPaths } from '../../../../core/api-paths';
import { CurrentUserResponse, PageResponse, PurchaseBagResponse } from '../../../../core/models';

function pageOf(content: PurchaseBagResponse[]): PageResponse<PurchaseBagResponse> {
  return { content, totalElements: content.length, totalPages: 1, size: 1, number: 0, first: true, last: true, numberOfElements: content.length, empty: content.length === 0 };
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
  contactNumber: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  stateProvince: null,
  postalCode: null,
  country: null,
  studingArea: null,
  schoolID: null,
  principalContact: false,
  active: true,
  twoFactorEnabled: false,
  lastLoginAt: null,
  roles: ['ROLE_GUEST'],
};

const OPEN_BAG: PurchaseBagResponse = {
  id: 'bag-42',
  userAuthenticationId: 'user-1',
  username: 'jdoe',
  status: 'OPEN',
  totalPrice: 5,
  createdAt: '2026-01-01T00:00:00',
  closedAt: null,
  closedBy: null,
  requestedPickupAt: null,
  confirmedPickupAt: null,
  pickupStatus: 'NOT_REQUESTED',
  pickupNotes: null,
  items: [],
};

describe('AdminBagScan', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBagScan],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('redirects straight to the bag detail page when the customer has an open bag', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(AdminBagScan);
    fixture.componentRef.setInput('userAuthenticationId', 'user-1');
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === ApiPaths.users.authenticationItem('user-1')).flush(DETAIL);
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.collection).flush(pageOf([OPEN_BAG]));
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/purchase-bags', 'bag-42'], { replaceUrl: true });
  });

  it('shows a no-open-bag state, with a link to their history, when there is none', async () => {
    const fixture = TestBed.createComponent(AdminBagScan);
    fixture.componentRef.setInput('userAuthenticationId', 'user-1');
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === ApiPaths.users.authenticationItem('user-1')).flush(DETAIL);
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.collection).flush(pageOf([]));
    await fixture.whenStable();

    const component = fixture.componentInstance;
    expect(component['loading']()).toBe(false);
    expect(component['noOpenBag']()).toBe(true);
    expect(component['username']()).toBe('jdoe');
  });
});
