import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PickupAvailabilityForm, PickupAvailabilityFormData } from './pickup-availability-form';
import { ApiPaths } from '../../../../core/api-paths';
import { PickupAvailabilityRuleResponse } from '../../../../core/models';

describe('PickupAvailabilityForm', () => {
  let httpMock: HttpTestingController;
  let closeSpy: (result?: PickupAvailabilityRuleResponse) => void;

  function build(data: PickupAvailabilityFormData = {}) {
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      imports: [PickupAvailabilityForm],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PickupAvailabilityForm);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a MONTH rule (the default scope) without ever changing scope', () => {
    const fixture = build();
    const component = fixture.componentInstance;

    component['form'].get('name')!.setValue('September general hours');
    component['form'].get('month')!.setValue(9);
    component['form'].get('year')!.setValue(2026);
    component['form'].get('startTime')!.setValue(new Date(2000, 0, 1, 9, 0));
    component['form'].get('endTime')!.setValue(new Date(2000, 0, 1, 16, 0));

    component['submit']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.rules);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'September general hours',
      scope: 'MONTH',
      specificDate: null,
      dayOfWeek: null,
      weekStartDate: null,
      month: 9,
      year: 2026,
      recurring: false,
      available: true,
      startTime: '09:00:00',
      endTime: '16:00:00',
      active: true,
    });
  });

  /**
   * Regression test: MONTH is the form's default scope, so its `month`/`year` fields render (and
   * used to carry a real HTML `required` attribute) the instant the dialog opens. Switching the
   * scope selector away from MONTH afterwards used to leave those now-hidden controls stuck at
   * status INVALID with a stale `{required: true}` error — Angular's RequiredValidator directive
   * unregisters on destroy but never re-validates the control, so the leftover error silently
   * poisoned `form.valid` forever, and `submit()` did nothing with no visible error (the group's
   * own cross-field validator had nothing to say about it). Fixed by dropping the native
   * `required` attribute from every scope-conditional field and relying only on the group-level
   * validator, which re-evaluates fresh from live values every time.
   */
  it('creates a WEEK rule after switching away from the default MONTH scope', () => {
    const fixture = build();
    const component = fixture.componentInstance;

    component['form'].get('name')!.setValue('Saturday pickup');
    fixture.detectChanges();

    component['form'].get('scope')!.setValue('WEEK');
    fixture.detectChanges();

    expect(component['form'].get('month')!.status).toBe('VALID');
    expect(component['form'].get('year')!.status).toBe('VALID');

    component['form'].get('dayOfWeek')!.setValue('SATURDAY');
    component['form'].get('recurring')!.setValue(true);
    component['form'].get('startTime')!.setValue(new Date(2000, 0, 1, 10, 0));
    component['form'].get('endTime')!.setValue(new Date(2000, 0, 1, 14, 0));
    fixture.detectChanges();

    expect(component['form'].valid).toBe(true);
    component['submit']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.rules);
    expect(req.request.body).toEqual({
      name: 'Saturday pickup',
      scope: 'WEEK',
      specificDate: null,
      dayOfWeek: 'SATURDAY',
      weekStartDate: null,
      month: null,
      year: null,
      recurring: true,
      available: true,
      startTime: '10:00:00',
      endTime: '14:00:00',
      active: true,
    });
  });

  it('creates a DAY closure rule after switching away from the default MONTH scope', () => {
    const fixture = build();
    const component = fixture.componentInstance;

    component['form'].get('name')!.setValue('Holiday closure');
    fixture.detectChanges();

    component['form'].get('scope')!.setValue('DAY');
    fixture.detectChanges();

    component['form'].get('specificDate')!.setValue(new Date(2026, 11, 25));
    component['form'].get('available')!.setValue(false);
    fixture.detectChanges();

    expect(component['form'].valid).toBe(true);
    component['submit']();

    const req = httpMock.expectOne((r) => r.url === ApiPaths.pickupAvailability.rules);
    expect(req.request.body).toEqual({
      name: 'Holiday closure',
      scope: 'DAY',
      specificDate: '2026-12-25',
      dayOfWeek: null,
      weekStartDate: null,
      month: null,
      year: null,
      recurring: false,
      available: false,
      startTime: null,
      endTime: null,
      active: true,
    });

    req.flush({ id: 'rule-1', name: 'Holiday closure' } as unknown as PickupAvailabilityRuleResponse);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('shows a clear explanation instead of silently doing nothing when a required cross-field condition is missing', () => {
    const fixture = build();
    const component = fixture.componentInstance;

    component['form'].get('name')!.setValue('Incomplete rule');
    component['submit'](); // month/year/times are still empty for the default MONTH scope

    expect(component['form'].valid).toBe(false);
    expect(component['describeFormError']()).toBeTruthy();
    httpMock.expectNone((r) => r.url === ApiPaths.pickupAvailability.rules);
  });
});
