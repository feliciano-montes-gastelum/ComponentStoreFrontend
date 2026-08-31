import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CatalogList } from './catalog-list';
import { ApiPaths } from '../../../core/api-paths';
import { InventoryResponse, PageResponse } from '../../../core/models';

function pageOf(content: InventoryResponse[]): PageResponse<InventoryResponse> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: 12,
    number: 0,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

const SAMPLE_COMPONENT: InventoryResponse = {
  id: 'inv-1',
  componentTypeId: 'type-1',
  componentTypeCode: 'RES',
  componentTypeName: 'Resistor',
  name: '10k Ohm Resistor',
  partNumber: 'R-10K',
  serialNumber: null,
  description: 'A resistor.',
  manufacturer: 'Acme',
  quantity: 42,
  unitPrice: 0.1,
  location: null,
  imageUrl: null,
  active: true,
  createDate: '2026-01-01T00:00:00',
  updateDate: '2026-01-01T00:00:00',
  updateUser: 'system',
  version: 1,
};

describe('CatalogList', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogList],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads and displays components from the inventory search endpoint', async () => {
    const fixture = TestBed.createComponent(CatalogList);
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.inventory.search);
    req.flush(pageOf([SAMPLE_COMPONENT]));
    httpMock.expectOne((r) => r.url === ApiPaths.componentTypes.collection).flush(pageOf([] as never));
    // SAMPLE_COMPONENT has no imageUrl, so CatalogList looks up its gallery to backfill one.
    httpMock.expectOne((r) => r.url === ApiPaths.inventoryImages.collection('inv-1')).flush(pageOf([] as never));

    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as { results: () => InventoryResponse[]; loading: () => boolean };
    expect(component.loading()).toBe(false);
    expect(component.results().length).toBe(1);
    expect(component.results()[0].name).toBe('10k Ohm Resistor');
  });

  it('shows an error state, without requiring sign-in, when the public catalog endpoint fails', async () => {
    const fixture = TestBed.createComponent(CatalogList);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === ApiPaths.inventory.search).flush(
      { timestamp: '', status: 500, error: 'Internal Server Error', message: 'Boom', path: '', fieldErrors: {} },
      { status: 500, statusText: 'Internal Server Error' }
    );
    httpMock.expectOne((r) => r.url === ApiPaths.componentTypes.collection).flush(pageOf([] as never));

    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as { errorMessage: () => string | null; loading: () => boolean };
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBe('Unable to load components right now. Please try again.');
  });
});
