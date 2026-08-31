import { describeAppliedScope, generateTimeSlots, toDateParam, toOffsetDateTimeString } from './pickup-time.util';

describe('toDateParam', () => {
  it('uses the date\'s local calendar fields, never toISOString (which can shift the day in zones behind UTC)', () => {
    expect(toDateParam(new Date(2026, 8, 5))).toBe('2026-09-05');
    expect(toDateParam(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('generateTimeSlots', () => {
  it('generates one slot per interval, start inclusive and end exclusive', () => {
    const slots = generateTimeSlots([{ startTime: '09:00:00', endTime: '10:00:00' }], 15);
    expect(slots.map((slot) => slot.value)).toEqual(['09:00', '09:15', '09:30', '09:45']);
    expect(slots.some((slot) => slot.value === '10:00')).toBe(false);
  });

  it('never offers a time outside the given windows, even across multiple windows at the same priority', () => {
    const slots = generateTimeSlots([
      { startTime: '09:00:00', endTime: '10:00:00' },
      { startTime: '14:00:00', endTime: '15:00:00' },
    ]);
    expect(slots.every((slot) => slot.value < '10:00' || (slot.value >= '14:00' && slot.value < '15:00'))).toBe(true);
  });

  it('renders friendly 12-hour labels', () => {
    const slots = generateTimeSlots([{ startTime: '13:30:00', endTime: '13:45:00' }]);
    expect(slots[0].label).toBe('1:30 PM');
  });

  it('returns nothing for an empty window list (an unavailable date)', () => {
    expect(generateTimeSlots([])).toEqual([]);
  });
});

describe('toOffsetDateTimeString', () => {
  it('builds an offset date-time in the GIVEN timezone, not the test runner\'s own timezone', () => {
    // America/Phoenix never observes DST, so this offset is deterministic year-round.
    expect(toOffsetDateTimeString(new Date(2026, 8, 15), '09:30', 'America/Phoenix')).toBe('2026-09-15T09:30:00-07:00');
  });

  it('builds a positive offset correctly', () => {
    // Europe/Madrid is UTC+2 in September (CEST).
    expect(toOffsetDateTimeString(new Date(2026, 8, 15), '09:30', 'Europe/Madrid')).toBe('2026-09-15T09:30:00+02:00');
  });

  it('round-trips back to the same wall-clock time when parsed in that same zone', () => {
    const iso = toOffsetDateTimeString(new Date(2026, 8, 15), '13:00', 'America/Phoenix');
    const parsed = new Date(iso);
    const rendered = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Phoenix',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(parsed);
    expect(rendered.replace(/^24/, '00')).toBe('13:00');
  });
});

describe('describeAppliedScope', () => {
  it('describes each priority tier distinctly', () => {
    expect(describeAppliedScope('DAY')).toContain('exact date');
    expect(describeAppliedScope('WEEK')).toContain('weekly');
    expect(describeAppliedScope('MONTH')).toContain('month');
    expect(describeAppliedScope(null)).toContain('no configured');
  });
});
