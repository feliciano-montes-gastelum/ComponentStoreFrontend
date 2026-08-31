import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { NewRequest } from './new-request';
import { ApiPaths } from '../../../core/api-paths';
import { InventoryResponse, PageResponse } from '../../../core/models';

function emptyInventoryPage(): PageResponse<InventoryResponse> {
  return { content: [], totalElements: 0, totalPages: 0, size: 5, number: 0, first: true, last: true, numberOfElements: 0, empty: true };
}

function pageWith(item: InventoryResponse): PageResponse<InventoryResponse> {
  return { content: [item], totalElements: 1, totalPages: 1, size: 5, number: 0, first: true, last: true, numberOfElements: 1, empty: false };
}

const MATCH: InventoryResponse = {
  id: 'inv-1',
  componentTypeId: 'type-1',
  componentTypeCode: 'RES',
  componentTypeName: 'Resistor',
  name: '10k Ohm Resistor',
  partNumber: 'R-10K',
  serialNumber: null,
  description: null,
  manufacturer: 'Acme',
  quantity: 10,
  unitPrice: 0.5,
  location: null,
  imageUrl: null,
  active: true,
  createDate: '2026-01-01T00:00:00',
  updateDate: '2026-01-01T00:00:00',
  updateUser: 'system',
  version: 1,
};

describe('NewRequest (component-request restricted to unlisted components)', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.setItem(
      'cs_auth_session',
      JSON.stringify({
        token: 'jwt',
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        userId: 'user-1',
        username: 'jdoe',
        roles: ['ROLE_GUEST'],
      })
    );
    await TestBed.configureTestingModule({
      imports: [NewRequest],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  /** Every successful submit also fires a WhatsApp hand-off (GET /api/public/principal-contact) — flush it away for tests that don't care about that outcome. */
  async function flushWhatsAppLookup(fixture: { whenStable(): Promise<unknown> }) {
    httpMock.expectOne((r) => r.url === ApiPaths.public.principalContact).flush(
      { timestamp: '', status: 404, error: 'Not Found', message: 'not configured', path: '', fieldErrors: {} },
      { status: 404, statusText: 'Not Found' }
    );
    await fixture.whenStable();
  }

  it('always submits requestType NEW_COMPONENT — there is no way to pick HOLD_EXISTING from this form', async () => {
    const fixture = TestBed.createComponent(NewRequest);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component['form'].patchValue({ componentName: 'Brand new part' });
    component['searchCatalog']();
    httpMock.expectOne((r) => r.url === ApiPaths.inventory.search).flush(emptyInventoryPage());
    await fixture.whenStable();

    expect(component['matches']().length).toBe(0);
    vi.spyOn(window, 'open').mockReturnValue(null);
    component['submit']();

    const req = httpMock.expectOne(ApiPaths.userComponentRequests.collection);
    expect(req.request.body.requestType).toBe('NEW_COMPONENT');
    expect(req.request.body.inventoryId).toBeUndefined();
    expect(req.request.body.pickupExpiresAt).toBeUndefined();
    req.flush({
      id: 'req-1',
      userAuthenticationId: 'user-1',
      username: 'jdoe',
      requestType: 'NEW_COMPONENT',
      status: 'PENDING',
      inventoryId: null,
      componentName: 'Brand new part',
      partNumber: null,
      manufacturer: null,
      quantity: 1,
      notes: null,
      pickupExpiresAt: null,
    });
    await flushWhatsAppLookup(fixture);
  });

  it('blocks submission when a matching catalog component is found and not yet acknowledged', async () => {
    const fixture = TestBed.createComponent(NewRequest);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component['form'].patchValue({ componentName: '10k Ohm Resistor' });
    component['searchCatalog']();
    httpMock.expectOne((r) => r.url === ApiPaths.inventory.search).flush(pageWith(MATCH));
    await fixture.whenStable();

    expect(component['matches']().length).toBe(1);

    component['submit']();

    expect(component['errorMessage']()).toContain('confirm');
    httpMock.expectNone(ApiPaths.userComponentRequests.collection);
  });

  it('allows submission once the user confirms none of the matches are suitable', async () => {
    const fixture = TestBed.createComponent(NewRequest);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component['form'].patchValue({ componentName: '10k Ohm Resistor' });
    component['searchCatalog']();
    httpMock.expectOne((r) => r.url === ApiPaths.inventory.search).flush(pageWith(MATCH));
    await fixture.whenStable();

    component['form'].patchValue({ confirmedNoMatch: true });
    vi.spyOn(window, 'open').mockReturnValue(null);
    component['submit']();

    const req = httpMock.expectOne(ApiPaths.userComponentRequests.collection);
    expect(req.request.body.componentName).toBe('10k Ohm Resistor');
    req.flush({
      id: 'req-2',
      userAuthenticationId: 'user-1',
      username: 'jdoe',
      requestType: 'NEW_COMPONENT',
      status: 'PENDING',
      inventoryId: null,
      componentName: '10k Ohm Resistor',
      partNumber: null,
      manufacturer: null,
      quantity: 1,
      notes: null,
      pickupExpiresAt: null,
    });
    await flushWhatsAppLookup(fixture);
  });

  it('opens WhatsApp with a component-request message after a successful submission', async () => {
    const fixture = TestBed.createComponent(NewRequest);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component['form'].patchValue({ componentName: 'ESP32 development board' });
    component['searchCatalog']();
    httpMock.expectOne((r) => r.url === ApiPaths.inventory.search).flush(emptyInventoryPage());
    await fixture.whenStable();
    // emitEvent: false — these fields don't need to re-trigger the debounced catalog search.
    component['form'].patchValue(
      { partNumber: 'ESP32-DEVKIT', manufacturer: 'Espressif', quantity: 2, notes: 'USB-C version preferred.' },
      { emitEvent: false }
    );

    const fakeWindow = { closed: false, location: { href: '' }, close: vi.fn() } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(fakeWindow);
    component['submit']();

    httpMock.expectOne(ApiPaths.userComponentRequests.collection).flush({
      id: 'req-3',
      userAuthenticationId: 'user-1',
      username: 'jdoe',
      requestType: 'NEW_COMPONENT',
      status: 'PENDING',
      inventoryId: null,
      componentName: 'ESP32 development board',
      partNumber: 'ESP32-DEVKIT',
      manufacturer: 'Espressif',
      quantity: 2,
      notes: 'USB-C version preferred.',
      pickupExpiresAt: null,
    });
    httpMock
      .expectOne((r) => r.url === ApiPaths.public.principalContact)
      .flush({ firstName: 'Administrator', lastName: 'Test', email: 'administrator.test@componentstore.local', contactNumber: '555-0102', whatsappNumber: '5550102' });
    await fixture.whenStable();

    const href = (fakeWindow.location as Location).href;
    expect(href).toContain('https://wa.me/5550102?text=');
    const decoded = decodeURIComponent(href.split('text=')[1]);
    expect(decoded).toContain('Request ID: req-3');
    expect(decoded).toContain('Component: ESP32 development board');
    expect(decoded).toContain('Part number: ESP32-DEVKIT');
    expect(decoded).toContain('Manufacturer: Espressif');
    expect(decoded).toContain('Quantity: 2');
    expect(decoded).toContain('Notes: USB-C version preferred.');
    expect(decoded).toContain('/admin/requests');
  });
});
