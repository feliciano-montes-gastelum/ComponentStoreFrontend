import { pickupAvailabilityRuleValidator } from './pickup-availability-form';

function group(value: Record<string, unknown>) {
  return { value } as never;
}

describe('pickupAvailabilityRuleValidator', () => {
  it('rejects an available rule with no start/end time', () => {
    const result = pickupAvailabilityRuleValidator(
      group({ scope: 'MONTH', month: 9, year: 2026, recurring: false, available: true, startTime: null, endTime: null })
    );
    expect(result).toEqual({ timeRangeInvalid: true });
  });

  it('rejects an available rule whose start time is not before its end time', () => {
    const result = pickupAvailabilityRuleValidator(
      group({
        scope: 'MONTH',
        month: 9,
        year: 2026,
        recurring: false,
        available: true,
        startTime: new Date(2000, 0, 1, 16, 0),
        endTime: new Date(2000, 0, 1, 9, 0),
      })
    );
    expect(result).toEqual({ timeRangeInvalid: true });
  });

  it('accepts an available rule whose start time is before its end time', () => {
    const result = pickupAvailabilityRuleValidator(
      group({
        scope: 'MONTH',
        month: 9,
        year: 2026,
        recurring: false,
        available: true,
        startTime: new Date(2000, 0, 1, 9, 0),
        endTime: new Date(2000, 0, 1, 16, 0),
      })
    );
    expect(result).toBeNull();
  });

  it('does not require time fields for an unavailable rule', () => {
    const result = pickupAvailabilityRuleValidator(
      group({ scope: 'MONTH', month: 9, year: 2026, recurring: false, available: false, startTime: null, endTime: null })
    );
    expect(result).toBeNull();
  });

  it('requires a specific date for a DAY rule, and rejects a DAY rule marked recurring', () => {
    expect(
      pickupAvailabilityRuleValidator(
        group({ scope: 'DAY', specificDate: null, recurring: false, available: false, startTime: null, endTime: null })
      )
    ).toEqual({ dayRuleInvalid: true });

    expect(
      pickupAvailabilityRuleValidator(
        group({ scope: 'DAY', specificDate: new Date(2026, 8, 15), recurring: true, available: false, startTime: null, endTime: null })
      )
    ).toEqual({ dayRuleInvalid: true });

    expect(
      pickupAvailabilityRuleValidator(
        group({ scope: 'DAY', specificDate: new Date(2026, 8, 15), recurring: false, available: false, startTime: null, endTime: null })
      )
    ).toBeNull();
  });

  it('requires a day of week for a WEEK rule, and a week-start date only when non-recurring', () => {
    expect(
      pickupAvailabilityRuleValidator(
        group({ scope: 'WEEK', dayOfWeek: null, recurring: true, weekStartDate: null, available: false, startTime: null, endTime: null })
      )
    ).toEqual({ weekRuleInvalid: true });

    // Recurring WEEK rule: day of week alone is enough.
    expect(
      pickupAvailabilityRuleValidator(
        group({ scope: 'WEEK', dayOfWeek: 'SATURDAY', recurring: true, weekStartDate: null, available: false, startTime: null, endTime: null })
      )
    ).toBeNull();

    // Non-recurring WEEK rule: also needs a week-start date.
    expect(
      pickupAvailabilityRuleValidator(
        group({ scope: 'WEEK', dayOfWeek: 'SATURDAY', recurring: false, weekStartDate: null, available: false, startTime: null, endTime: null })
      )
    ).toEqual({ weekRuleInvalid: true });

    expect(
      pickupAvailabilityRuleValidator(
        group({
          scope: 'WEEK',
          dayOfWeek: 'SATURDAY',
          recurring: false,
          weekStartDate: new Date(2026, 8, 14),
          available: false,
          startTime: null,
          endTime: null,
        })
      )
    ).toBeNull();
  });

  it('requires a month for a MONTH rule, and a year only when non-recurring', () => {
    expect(
      pickupAvailabilityRuleValidator(group({ scope: 'MONTH', month: null, recurring: true, year: null, available: false, startTime: null, endTime: null }))
    ).toEqual({ monthRuleInvalid: true });

    expect(
      pickupAvailabilityRuleValidator(group({ scope: 'MONTH', month: 9, recurring: true, year: null, available: false, startTime: null, endTime: null }))
    ).toBeNull();

    expect(
      pickupAvailabilityRuleValidator(group({ scope: 'MONTH', month: 9, recurring: false, year: null, available: false, startTime: null, endTime: null }))
    ).toEqual({ monthRuleInvalid: true });

    expect(
      pickupAvailabilityRuleValidator(group({ scope: 'MONTH', month: 9, recurring: false, year: 2026, available: false, startTime: null, endTime: null }))
    ).toBeNull();
  });
});
