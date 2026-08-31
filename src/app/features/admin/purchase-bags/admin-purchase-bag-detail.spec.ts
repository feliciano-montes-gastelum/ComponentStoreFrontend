import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { AdminPurchaseBagDetail } from './admin-purchase-bag-detail';
import { ApiPaths } from '../../../core/api-paths';
import { PurchaseBagResponse } from '../../../core/models';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';

function bagOf(items: PurchaseBagResponse['items'], status: PurchaseBagResponse['status'] = 'OPEN'): PurchaseBagResponse {
  return {
    id: 'bag-1',
    userAuthenticationId: 'user-1',
    username: 'jdoe',
    status,
    totalPrice: items.reduce((sum, item) => sum + item.subtotal, 0),
    createdAt: '2026-01-01T00:00:00',
    closedAt: null,
    closedBy: null,
    requestedPickupAt: null,
    confirmedPickupAt: null,
    pickupStatus: 'NOT_REQUESTED',
    pickupNotes: null,
    items,
  };
}

const IN_STOCK_ITEM: PurchaseBagResponse['items'][number] = {
  id: 'item-1',
  inventoryId: 'inv-1',
  inventoryName: 'Resistor',
  partNumber: null,
  availableQuantity: 10,
  quantity: 2,
  unitPrice: 1,
  subtotal: 2,
};

const OUT_OF_STOCK_ITEM: PurchaseBagResponse['items'][number] = {
  id: 'item-2',
  inventoryId: 'inv-2',
  inventoryName: 'Capacitor',
  partNumber: null,
  availableQuantity: 0,
  quantity: 3,
  unitPrice: 2,
  subtotal: 6,
};

const EMPTY_IMAGE_PAGE = {
  content: [], totalElements: 0, totalPages: 0, size: 5, number: 0, first: true, last: true, numberOfElements: 0, empty: true,
};

const CUSTOMER_DETAIL = {
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

describe('AdminPurchaseBagDetail', () => {
  let httpMock: HttpTestingController;

  function setup(confirmResult: boolean) {
    TestBed.configureTestingModule({
      imports: [AdminPurchaseBagDetail],
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

  async function loadBag(items: PurchaseBagResponse['items'], status: PurchaseBagResponse['status'] = 'OPEN') {
    const fixture = TestBed.createComponent(AdminPurchaseBagDetail);
    fixture.componentRef.setInput('id', 'bag-1');
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.item('bag-1')).flush(bagOf(items, status));
    httpMock.expectOne((r) => r.url === ApiPaths.users.authenticationItem('user-1')).flush(CUSTOMER_DETAIL);
    for (const item of items) {
      httpMock.expectOne((r) => r.url === ApiPaths.inventoryImages.collection(item.inventoryId)).flush(EMPTY_IMAGE_PAGE);
    }
    await fixture.whenStable();
    return fixture;
  }

  it('disables selling from an already-empty bag', async () => {
    setup(true);
    const fixture = await loadBag([]);
    expect(fixture.componentInstance['canSell']()).toBe(false);
  });

  it('disables selling from a bag that is already closed', async () => {
    setup(true);
    const fixture = await loadBag([IN_STOCK_ITEM], 'CLOSED');
    expect(fixture.componentInstance['canSell']()).toBe(false);
  });

  it('defaults an out-of-stock item to unselected, so it is excluded from the sale by default', async () => {
    setup(true);
    const fixture = await loadBag([IN_STOCK_ITEM, OUT_OF_STOCK_ITEM]);

    const component = fixture.componentInstance;
    expect(component['saleSelections']()['item-1'].selected).toBe(true);
    expect(component['saleSelections']()['item-2'].selected).toBe(false);
    expect(component['maxSellable'](OUT_OF_STOCK_ITEM)).toBe(0);
  });

  it('does not perform a sale when the confirmation dialog is dismissed', async () => {
    setup(false);
    const fixture = await loadBag([IN_STOCK_ITEM]);

    fixture.componentInstance['performSale']();
    await fixture.whenStable();

    httpMock.expectNone(ApiPaths.purchaseBags.sell('bag-1'));
  });

  it('sells only the selected items/quantities, leaving an out-of-stock item behind', async () => {
    setup(true);
    const fixture = await loadBag([IN_STOCK_ITEM, OUT_OF_STOCK_ITEM]);
    const component = fixture.componentInstance;

    expect(component['canSell']()).toBe(true);
    component['performSale']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.sell('bag-1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ items: [{ itemId: 'item-1', quantity: 2 }] });

    // The bag comes back with only the leftover, out-of-stock item still in it — still OPEN.
    req.flush(bagOf([OUT_OF_STOCK_ITEM]));
    httpMock.expectOne((r) => r.url === ApiPaths.inventoryImages.collection('inv-2')).flush(EMPTY_IMAGE_PAGE);
    await fixture.whenStable();

    expect(component['bag']()?.items.length).toBe(1);
    expect(component['bag']()?.items[0].id).toBe('item-2');
  });

  it('reduces the quantity to sell for an item without exceeding its available stock', async () => {
    setup(true);
    const fixture = await loadBag([{ ...IN_STOCK_ITEM, quantity: 5, availableQuantity: 3 }]);
    const component = fixture.componentInstance;

    // Available stock (3) caps the default sell quantity, even though the bag holds 5.
    expect(component['saleSelections']()['item-1'].quantity).toBe(3);

    component['updateSaleQuantity'](component['bag']()!.items[0], 1);
    component['performSale']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.sell('bag-1'));
    expect(req.request.body).toEqual({ items: [{ itemId: 'item-1', quantity: 1 }] });
    req.flush(bagOf([{ ...IN_STOCK_ITEM, quantity: 4, availableQuantity: 2 }]));
    httpMock.expectOne((r) => r.url === ApiPaths.inventoryImages.collection('inv-1')).flush(EMPTY_IMAGE_PAGE);
  });

  it('excludes an item from the sale once unchecked', async () => {
    setup(true);
    const fixture = await loadBag([IN_STOCK_ITEM]);
    const component = fixture.componentInstance;

    component['toggleSelected'](IN_STOCK_ITEM, false);
    expect(component['canSell']()).toBe(false);

    component['performSale']();
    httpMock.expectNone(ApiPaths.purchaseBags.sell('bag-1'));
  });

  it('lets an administrator increase a bag item\'s quantity past its available stock, unlike the sell-quantity stepper', async () => {
    setup(true);
    const fixture = await loadBag([OUT_OF_STOCK_ITEM]); // availableQuantity: 0, quantity: 3
    const component = fixture.componentInstance;

    // The sell stepper is correctly capped by stock (0 available), but adjusting the bag itself is not.
    expect(component['maxSellable'](OUT_OF_STOCK_ITEM)).toBe(0);
    component['updateBagQuantity'](OUT_OF_STOCK_ITEM, 8);

    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.itemForBag('bag-1', 'item-2'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ quantity: 8 });

    req.flush(bagOf([{ ...OUT_OF_STOCK_ITEM, quantity: 8, subtotal: 16 }]));
    httpMock.expectOne((r) => r.url === ApiPaths.inventoryImages.collection('inv-2')).flush(EMPTY_IMAGE_PAGE);
    await fixture.whenStable();

    expect(component['bag']()?.items[0].quantity).toBe(8);
  });

  it('removes an item from the bag via DELETE once confirmed', async () => {
    setup(true);
    const fixture = await loadBag([IN_STOCK_ITEM]);
    const component = fixture.componentInstance;

    component['removeItem'](IN_STOCK_ITEM);

    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.itemForBag('bag-1', 'item-1'));
    expect(req.request.method).toBe('DELETE');
    req.flush(bagOf([]));
  });

  it('resolves availability for a chosen pickup date and only then allows confirming a time', async () => {
    setup(true);
    const fixture = await loadBag([IN_STOCK_ITEM]);
    const component = fixture.componentInstance;

    expect(component['canChangePickup']()).toBe(false);

    component['pickupDateControl'].setValue(new Date(2026, 8, 15));
    httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.date('2026-09-15')).flush({
      date: '2026-09-15',
      timezone: 'America/Phoenix',
      appliedScope: 'MONTH',
      available: true,
      windows: [{ startTime: '09:00:00', endTime: '11:00:00' }],
    });
    await fixture.whenStable();

    expect(component['availableSlots']().length).toBeGreaterThan(0);
    component['pickupTimeControl'].setValue('09:00');
    expect(component['canChangePickup']()).toBe(true);
  });

  it('confirms a pickup via PUT .../pickup with an offset date-time in the resolved timezone, once the confirmation dialog is accepted', async () => {
    setup(true);
    const fixture = await loadBag([IN_STOCK_ITEM]);
    const component = fixture.componentInstance;

    component['pickupDateControl'].setValue(new Date(2026, 8, 15));
    httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.date('2026-09-15')).flush({
      date: '2026-09-15',
      timezone: 'America/Phoenix',
      appliedScope: 'DAY',
      available: true,
      windows: [{ startTime: '09:00:00', endTime: '11:00:00' }],
    });
    await fixture.whenStable();
    component['pickupTimeControl'].setValue('09:00');

    component['confirmPickup']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.pickup('bag-1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'CONFIRMED', pickupAt: '2026-09-15T09:00:00-07:00', pickupNotes: null });
    req.flush(bagOf([IN_STOCK_ITEM]));
    httpMock.expectOne((r) => r.url === ApiPaths.inventoryImages.collection('inv-1')).flush(EMPTY_IMAGE_PAGE);
  });

  it('does not change the pickup when the confirmation dialog is dismissed', async () => {
    setup(false);
    const fixture = await loadBag([IN_STOCK_ITEM]);
    const component = fixture.componentInstance;

    component['pickupDateControl'].setValue(new Date(2026, 8, 15));
    httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.date('2026-09-15')).flush({
      date: '2026-09-15',
      timezone: 'America/Phoenix',
      appliedScope: 'MONTH',
      available: true,
      windows: [{ startTime: '09:00:00', endTime: '11:00:00' }],
    });
    await fixture.whenStable();
    component['pickupTimeControl'].setValue('09:00');

    component['confirmPickup']();

    httpMock.expectNone(ApiPaths.purchaseBags.pickup('bag-1'));
  });
});
