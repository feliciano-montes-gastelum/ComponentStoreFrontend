import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PurchaseBagService } from './purchase-bag.service';
import { ApiPaths } from '../api-paths';
import { PurchaseBagResponse } from '../models';

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

describe('PurchaseBagService', () => {
  let service: PurchaseBagService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PurchaseBagService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adds an item and syncs the header item-count signal from the response', () => {
    expect(service.itemCount()).toBe(0);

    service.addItem({ inventoryId: 'inv-1', quantity: 2 }).subscribe();
    const req = httpMock.expectOne(ApiPaths.purchaseBags.mineItems);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ inventoryId: 'inv-1', quantity: 2 });

    req.flush(
      bagOf([{ id: 'item-1', inventoryId: 'inv-1', inventoryName: 'Resistor', partNumber: null, availableQuantity: 10, quantity: 2, unitPrice: 1, subtotal: 2 }])
    );

    expect(service.itemCount()).toBe(2);
  });

  it('updates an item quantity via PUT and re-syncs the total count', () => {
    service.updateItemQuantity('item-1', 5).subscribe();
    const req = httpMock.expectOne(ApiPaths.purchaseBags.mineItem('item-1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ quantity: 5 });

    req.flush(
      bagOf([{ id: 'item-1', inventoryId: 'inv-1', inventoryName: 'Resistor', partNumber: null, availableQuantity: 10, quantity: 5, unitPrice: 1, subtotal: 5 }])
    );

    expect(service.itemCount()).toBe(5);
  });

  it('removes an item via DELETE and drops the count to whatever remains', () => {
    service.removeItem('item-1').subscribe();
    const req = httpMock.expectOne(ApiPaths.purchaseBags.mineItem('item-1'));
    expect(req.request.method).toBe('DELETE');

    req.flush(bagOf([]));

    expect(service.itemCount()).toBe(0);
  });

  it('resets the count to zero once a bag is reported closed', () => {
    service.addItem({ inventoryId: 'inv-1', quantity: 3 }).subscribe();
    httpMock
      .expectOne(ApiPaths.purchaseBags.mineItems)
      .flush(bagOf([{ id: 'item-1', inventoryId: 'inv-1', inventoryName: 'Resistor', partNumber: null, availableQuantity: 10, quantity: 3, unitPrice: 1, subtotal: 3 }]));
    expect(service.itemCount()).toBe(3);

    service.getMyOpenBag().subscribe();
    httpMock.expectOne(ApiPaths.purchaseBags.mine).flush(bagOf([], 'CLOSED'));

    expect(service.itemCount()).toBe(0);
  });

  it('never lets a caller supply another user\'s id — self-service calls only hit the /me routes', () => {
    service.getMyOpenBag().subscribe();
    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.mine);
    expect(req.request.url).not.toContain('userAuthenticationId');
    req.flush(bagOf([]));
  });

  it('updates a bag\'s pickup status/time via PUT /api/purchase-bags/{bagId}/pickup', () => {
    service.updatePickup('bag-1', { status: 'CONFIRMED', pickupAt: '2026-09-15T09:00:00-07:00', pickupNotes: null }).subscribe();
    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.pickup('bag-1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'CONFIRMED', pickupAt: '2026-09-15T09:00:00-07:00', pickupNotes: null });
    req.flush(bagOf([]));
  });
});
