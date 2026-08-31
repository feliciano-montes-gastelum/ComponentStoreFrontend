import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { InventoryForm } from './inventory-form';
import { ApiPaths } from '../../../../core/api-paths';
import { ComponentTypeResponse, InventoryResponse, PageResponse } from '../../../../core/models';

function emptyPage<T>(): PageResponse<T> {
  return { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, first: true, last: true, numberOfElements: 0, empty: true };
}

const COMPONENT_TYPE: ComponentTypeResponse = {
  id: 'type-1',
  code: 'RES',
  name: 'Resistor',
  description: null,
  active: true,
  createDate: '2026-01-01T00:00:00',
  updateDate: '2026-01-01T00:00:00',
  updateUser: 'system',
  version: 1,
};

describe('InventoryForm (admin)', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryForm],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('rejects submission when required fields are missing', async () => {
    const fixture = TestBed.createComponent(InventoryForm);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ApiPaths.componentTypes.collection).flush({ ...emptyPage(), content: [COMPONENT_TYPE] });
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      form: { invalid: boolean; markAllAsTouched: () => void };
      submit: () => void;
    };
    component.submit();

    expect(component.form.invalid).toBe(true);
    httpMock.expectNone(ApiPaths.inventory.collection);
  });

  it('creates a new component with the entered values', async () => {
    const fixture = TestBed.createComponent(InventoryForm);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ApiPaths.componentTypes.collection).flush({ ...emptyPage(), content: [COMPONENT_TYPE] });
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      form: { patchValue: (v: Record<string, unknown>) => void };
      submit: () => void;
    };
    component.form.patchValue({
      componentTypeId: 'type-1',
      name: 'New Resistor',
      quantity: 10,
      unitPrice: 1.5,
    });
    component.submit();

    const req = httpMock.expectOne(ApiPaths.inventory.collection);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ name: 'New Resistor', quantity: 10, unitPrice: 1.5, active: true });

    const created: InventoryResponse = {
      id: 'inv-99',
      componentTypeId: 'type-1',
      componentTypeCode: 'RES',
      componentTypeName: 'Resistor',
      name: 'New Resistor',
      partNumber: null,
      serialNumber: null,
      description: null,
      manufacturer: null,
      quantity: 10,
      unitPrice: 1.5,
      location: null,
      imageUrl: null,
      active: true,
      createDate: '2026-01-01T00:00:00',
      updateDate: '2026-01-01T00:00:00',
      updateUser: 'admin',
      version: 1,
    };
    req.flush(created);
  });

  it('applies a quick quantity delta to the quantity field in edit mode', async () => {
    const fixture = TestBed.createComponent(InventoryForm);
    fixture.componentRef.setInput('id', 'inv-1');
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === ApiPaths.componentTypes.collection).flush({ ...emptyPage(), content: [COMPONENT_TYPE] });
    const existing: InventoryResponse = {
      id: 'inv-1',
      componentTypeId: 'type-1',
      componentTypeCode: 'RES',
      componentTypeName: 'Resistor',
      name: 'Existing Resistor',
      partNumber: null,
      serialNumber: null,
      description: null,
      manufacturer: null,
      quantity: 20,
      unitPrice: 0.5,
      location: null,
      imageUrl: null,
      active: true,
      createDate: '2026-01-01T00:00:00',
      updateDate: '2026-01-01T00:00:00',
      updateUser: 'admin',
      version: 1,
    };
    httpMock.expectOne(ApiPaths.inventory.item('inv-1')).flush(existing);
    httpMock.expectOne((r) => r.url === ApiPaths.inventoryHistory.forInventory('inv-1')).flush(emptyPage());
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      quantityDelta: { set: (v: number) => void };
      applyQuantityDelta: () => void;
      form: { get: (name: string) => { value: number } };
    };
    component.quantityDelta.set(5);
    component.applyQuantityDelta();

    expect(component.form.get('quantity').value).toBe(25);
  });
});
