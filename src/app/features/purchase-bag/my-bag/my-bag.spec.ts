import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MyBag } from './my-bag';
import { ApiPaths } from '../../../core/api-paths';
import { PickupDayAvailabilityResponse, PrincipalContactResponse, PurchaseBagResponse } from '../../../core/models';
import { NotificationService } from '../../../core/error-handling/notification.service';

function bagOf(items: PurchaseBagResponse['items']): PurchaseBagResponse {
  return {
    id: 'bag-1',
    userAuthenticationId: 'user-1',
    username: 'jdoe',
    status: 'OPEN',
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

const ONE_ITEM = [
  { id: 'item-1', inventoryId: 'inv-1', inventoryName: 'Resistor', partNumber: null, availableQuantity: 10, quantity: 1, unitPrice: 1, subtotal: 1 },
];

const EMPTY_IMAGE_PAGE = {
  content: [], totalElements: 0, totalPages: 0, size: 5, number: 0, first: true, last: true, numberOfElements: 0, empty: true,
};

const OPEN_DATE_AVAILABILITY: PickupDayAvailabilityResponse = {
  date: '2026-09-15',
  timezone: 'America/Phoenix',
  appliedScope: 'MONTH',
  available: true,
  windows: [{ startTime: '09:00:00', endTime: '11:00:00' }],
};

const CLOSED_DATE_AVAILABILITY: PickupDayAvailabilityResponse = {
  date: '2026-09-15',
  timezone: 'America/Phoenix',
  appliedScope: 'DAY',
  available: false,
  windows: [],
};

const PRINCIPAL_CONTACT: PrincipalContactResponse = {
  firstName: 'Administrator',
  lastName: 'Test',
  email: 'administrator.test@componentstore.local',
  contactNumber: '555-0102',
  whatsappNumber: '5550102',
};

/** A date safely in the future relative to the fixed "today" this suite assumes. */
const FUTURE_DATE = new Date(2026, 8, 15);

describe('MyBag', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyBag],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  async function loadWithOneItem() {
    const fixture = TestBed.createComponent(MyBag);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.mine).flush(bagOf(ONE_ITEM));
    httpMock.expectOne((r) => r.url === ApiPaths.inventoryImages.collection('inv-1')).flush(EMPTY_IMAGE_PAGE);
    await fixture.whenStable();
    return fixture;
  }

  it('flags that a pickup cannot be requested while the bag has no items', async () => {
    const fixture = TestBed.createComponent(MyBag);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.mine).flush(bagOf([]));
    await fixture.whenStable();

    expect(fixture.componentInstance['pickupBlockedByEmptyBag']()).toBe(true);
  });

  it('no longer flags an empty bag once it has at least one item', async () => {
    const fixture = await loadWithOneItem();
    expect(fixture.componentInstance['pickupBlockedByEmptyBag']()).toBe(false);
  });

  it('resolves availability for the selected date and generates slots only within its windows (priority behavior: DAY/WEEK/MONTH is whatever the backend already resolved)', async () => {
    const fixture = await loadWithOneItem();
    const component = fixture.componentInstance;

    component['pickupForm'].get('pickupDate')!.setValue(FUTURE_DATE);
    const req = httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.date('2026-09-15'));
    req.flush(OPEN_DATE_AVAILABILITY);
    await fixture.whenStable();

    expect(component['dateAvailability']()?.available).toBe(true);
    expect(component['dateAvailability']()?.appliedScope).toBe('MONTH');
    const slots = component['availableSlots']();
    expect(slots.map((slot) => slot.value)).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45']);
    // The window's own end time (11:00) is exclusive, and nothing outside 09:00-11:00 is ever offered.
    expect(slots.some((slot) => slot.value === '11:00')).toBe(false);
  });

  it('blocks submission and explains why when the resolved date is closed for pickup', async () => {
    const fixture = await loadWithOneItem();
    const component = fixture.componentInstance;

    component['pickupForm'].get('pickupDate')!.setValue(FUTURE_DATE);
    httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.date('2026-09-15')).flush(CLOSED_DATE_AVAILABILITY);
    await fixture.whenStable();

    expect(component['availableSlots']()).toEqual([]);
    expect(component['canSubmitPickup']()).toBe(false);
    component['pickupForm'].markAllAsTouched();
    expect(component['describePickupError']()).toContain('not available for pickup');
  });

  it('submits a pickup request built from the selected date + slot + the backend-provided timezone, not the browser timezone', async () => {
    const fixture = await loadWithOneItem();
    const component = fixture.componentInstance;
    vi.spyOn(window, 'open').mockReturnValue(null);

    component['pickupForm'].get('pickupDate')!.setValue(FUTURE_DATE);
    httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.date('2026-09-15')).flush(OPEN_DATE_AVAILABILITY);
    await fixture.whenStable();
    component['pickupForm'].get('pickupTime')!.setValue('09:00');

    expect(component['canSubmitPickup']()).toBe(true);
    component['requestPickup']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.minePickup);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.requestedPickupAt).toBe('2026-09-15T09:00:00-07:00');
    req.flush(bagOf(ONE_ITEM));

    httpMock.expectOne((r) => r.url === ApiPaths.public.principalContact).flush(
      { timestamp: '', status: 404, error: 'Not Found', message: 'not found', path: '', fieldErrors: {} },
      { status: 404, statusText: 'Not Found' }
    );
    await fixture.whenStable();
  });

  it('opens WhatsApp with a wa.me link built from the principal contact after a successful save', async () => {
    const fixture = await loadWithOneItem();
    const component = fixture.componentInstance;
    const fakeWindow = { closed: false, location: { href: '' }, close: vi.fn() } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(fakeWindow);

    component['pickupForm'].get('pickupDate')!.setValue(FUTURE_DATE);
    httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.date('2026-09-15')).flush(OPEN_DATE_AVAILABILITY);
    await fixture.whenStable();
    component['pickupForm'].get('pickupTime')!.setValue('09:00');
    component['pickupForm'].get('pickupNotes')!.setValue('Front desk please');

    component['requestPickup']();
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.minePickup).flush(bagOf(ONE_ITEM));
    httpMock.expectOne((r) => r.url === ApiPaths.public.principalContact).flush(PRINCIPAL_CONTACT);
    await fixture.whenStable();

    expect((fakeWindow.location as Location).href).toContain('https://wa.me/5550102?text=');
    const decoded = decodeURIComponent((fakeWindow.location as Location).href.split('text=')[1]);
    expect(decoded).toContain('Customer:');
    expect(decoded).toContain('Bag: bag-1');
    expect(decoded).toContain('Items: 1');
    expect(decoded).toContain('Notes: Front desk please');
    expect(decoded).toContain('/admin/purchase-bags/bag-1');
  });

  it('shows a retry warning (not a failure) when the backend save succeeds but the WhatsApp popup was blocked', async () => {
    const fixture = await loadWithOneItem();
    const component = fixture.componentInstance;
    const notifications = TestBed.inject(NotificationService);
    const warningSpy = vi.spyOn(notifications, 'warning');
    vi.spyOn(window, 'open').mockReturnValue(null);

    component['pickupForm'].get('pickupDate')!.setValue(FUTURE_DATE);
    httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.date('2026-09-15')).flush(OPEN_DATE_AVAILABILITY);
    await fixture.whenStable();
    component['pickupForm'].get('pickupTime')!.setValue('09:00');

    component['requestPickup']();
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.minePickup).flush(bagOf(ONE_ITEM));
    httpMock.expectOne((r) => r.url === ApiPaths.public.principalContact).flush(PRINCIPAL_CONTACT);
    await fixture.whenStable();

    expect(warningSpy).toHaveBeenCalledTimes(1);
    const [message, action] = warningSpy.mock.calls[0];
    expect(message).toContain('WhatsApp could not be opened');
    expect(action?.label).toBe('Open WhatsApp');

    // Retrying opens a fresh window via a fresh click — it must not resubmit the pickup request.
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    action!.onAction();
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/5550102?text='), '_blank');
    httpMock.expectNone(ApiPaths.purchaseBags.minePickup);
  });

  it('shows a warning, not a failure, when no principal contact is configured', async () => {
    const fixture = await loadWithOneItem();
    const component = fixture.componentInstance;
    const notifications = TestBed.inject(NotificationService);
    const successSpy = vi.spyOn(notifications, 'success');
    const warningSpy = vi.spyOn(notifications, 'warning');
    const fakeWindow = { closed: false, location: { href: '' }, close: vi.fn() } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(fakeWindow);

    component['pickupForm'].get('pickupDate')!.setValue(FUTURE_DATE);
    httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.date('2026-09-15')).flush(OPEN_DATE_AVAILABILITY);
    await fixture.whenStable();
    component['pickupForm'].get('pickupTime')!.setValue('09:00');

    component['requestPickup']();
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.minePickup).flush(bagOf(ONE_ITEM));
    httpMock.expectOne((r) => r.url === ApiPaths.public.principalContact).flush(
      { timestamp: '', status: 404, error: 'Not Found', message: 'Principal contact is not configured', path: '', fieldErrors: {} },
      { status: 404, statusText: 'Not Found' }
    );
    await fixture.whenStable();

    // The pickup request itself is still reported as a success — the missing contact is a separate, secondary notice.
    expect(successSpy).toHaveBeenCalledWith('Pickup requested.');
    expect(warningSpy).toHaveBeenCalledTimes(1);
    expect(warningSpy.mock.calls[0][0]).toContain('No principal contact is configured');
    expect((fakeWindow.close as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('never submits a pickup request while the bag is empty', async () => {
    const fixture = TestBed.createComponent(MyBag);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ApiPaths.purchaseBags.mine).flush(bagOf([]));
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component['requestPickup']();

    httpMock.expectNone(ApiPaths.purchaseBags.minePickup);
  });
});
