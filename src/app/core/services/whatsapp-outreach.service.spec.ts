import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { WhatsAppOutcome, WhatsAppOutreachService } from './whatsapp-outreach.service';
import { ApiPaths } from '../api-paths';
import { PrincipalContactResponse } from '../models';

const CONTACT: PrincipalContactResponse = {
  firstName: 'Administrator',
  lastName: 'Test',
  email: 'administrator.test@componentstore.local',
  contactNumber: '555-0102',
  whatsappNumber: '5550102',
};

describe('WhatsAppOutreachService', () => {
  let service: WhatsAppOutreachService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WhatsAppOutreachService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('navigates an already-open popup to the wa.me link once the principal contact resolves', () => {
    const popup = { closed: false, location: { href: '' } } as unknown as Window;
    let outcome: WhatsAppOutcome | undefined;

    service.send(popup, 'Hello Administrator').subscribe((result) => (outcome = result));
    httpMock.expectOne((r) => r.url === ApiPaths.public.principalContact).flush(CONTACT);

    expect(outcome).toEqual({ kind: 'opened' });
    expect((popup.location as Location).href).toBe('https://wa.me/5550102?text=Hello%20Administrator');
  });

  it('returns a popup-blocked outcome (with the built URL) when the popup is null', () => {
    let outcome: WhatsAppOutcome | undefined;

    service.send(null, 'Hello Administrator').subscribe((result) => (outcome = result));
    httpMock.expectOne((r) => r.url === ApiPaths.public.principalContact).flush(CONTACT);

    expect(outcome).toEqual({ kind: 'popup-blocked', url: 'https://wa.me/5550102?text=Hello%20Administrator' });
  });

  it('returns a popup-blocked outcome when the popup was closed in the meantime', () => {
    const popup = { closed: true, location: { href: '' } } as unknown as Window;
    let outcome: WhatsAppOutcome | undefined;

    service.send(popup, 'Hello Administrator').subscribe((result) => (outcome = result));
    httpMock.expectOne((r) => r.url === ApiPaths.public.principalContact).flush(CONTACT);

    expect(outcome?.kind).toBe('popup-blocked');
  });

  it('reports no-principal-contact (never a failure) and closes the popup when none is configured', () => {
    const popup = { closed: false, location: { href: '' }, close: vi.fn() } as unknown as Window;
    let outcome: WhatsAppOutcome | undefined;

    service.send(popup, 'Hello Administrator').subscribe((result) => (outcome = result));
    httpMock.expectOne((r) => r.url === ApiPaths.public.principalContact).flush(
      { timestamp: '', status: 404, error: 'Not Found', message: 'Principal contact is not configured', path: '', fieldErrors: {} },
      { status: 404, statusText: 'Not Found' }
    );

    expect(outcome).toEqual({ kind: 'no-principal-contact' });
    expect(popup.close).toHaveBeenCalled();
  });
});
