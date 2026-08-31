import { PickupAvailabilityScope, PickupTimeWindow } from '../../core/models';

/** "2026-09-15" from a calendar Date's LOCAL fields — never toISOString(), which would shift the day near midnight in timezones behind UTC. */
export function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface PickupTimeSlot {
  /** "HH:mm", 24-hour. */
  value: string;
  /** Friendly 12-hour rendering, e.g. "1:30 PM". */
  label: string;
}

/**
 * One slot per `intervalMinutes` strictly within each window — start inclusive, end exclusive,
 * matching the backend's own `!local.toLocalTime().isBefore(start) && local.toLocalTime().isBefore(end)`
 * check in PickupAvailabilityService.validate(), so nothing generated here can ever fail that
 * re-validation.
 */
export function generateTimeSlots(windows: PickupTimeWindow[], intervalMinutes = 15): PickupTimeSlot[] {
  const slots: PickupTimeSlot[] = [];
  for (const window of windows) {
    const [startHour, startMinute] = window.startTime.split(':').map(Number);
    const [endHour, endMinute] = window.endTime.split(':').map(Number);
    const endTotalMinutes = endHour * 60 + endMinute;
    for (let totalMinutes = startHour * 60 + startMinute; totalMinutes < endTotalMinutes; totalMinutes += intervalMinutes) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      slots.push({ value: `${pad(hour)}:${pad(minute)}`, label: formatTimeOfDay(hour, minute) });
    }
  }
  return slots;
}

function formatTimeOfDay(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:${pad(minute)} ${period}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The UTC offset (in minutes, e.g. -420 for UTC-7) that `timeZone` observes at `instant`. */
function utcOffsetMinutesAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(instant);
  const offsetPart = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0';
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(offsetPart);
  if (!match) {
    return 0;
  }
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = match[3] ? Number(match[3]) : 0;
  return sign * (hours * 60 + minutes);
}

/**
 * Builds an ISO-8601 offset date-time string (e.g. "2026-09-15T13:30:00-07:00") for the given
 * calendar date + "HH:mm" time-of-day AS OBSERVED IN `timeZone` — not the browser's own
 * timezone. This is what lets a slot chosen from the backend's own availability windows (already
 * expressed in that timezone) round-trip back to the backend correctly no matter where the
 * customer's or administrator's browser happens to be.
 */
export function toOffsetDateTimeString(date: Date, time: string, timeZone: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Treat the wall-clock time as if it were UTC to get a reference instant, then read the
  // target zone's offset around that instant. Accurate except within the rare hour of a DST
  // transition, which 15-minute pickup slots essentially never straddle in practice.
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMinutes = utcOffsetMinutesAt(utcGuess, timeZone);

  const offsetSign = offsetMinutes <= 0 ? '-' : '+';
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffsetMinutes / 60));
  const offsetMins = pad(absOffsetMinutes % 60);

  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${offsetSign}${offsetHours}:${offsetMins}`;
}

/** e.g. "September 15, 2026 at 9:00 AM (America/Phoenix)" — for on-screen confirmation copy, always in `timeZone` regardless of the viewer's own device zone. */
export function formatDateTimeInZone(date: Date, timeZone: string): string {
  const datePart = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  return `${datePart} at ${timePart} (${timeZone})`;
}

/** A short, user-facing explanation of which priority tier (DAY > WEEK > MONTH) produced a resolved date's availability. */
export function describeAppliedScope(scope: PickupAvailabilityScope | null): string {
  switch (scope) {
    case 'DAY':
      return 'a one-time override set for this exact date';
    case 'WEEK':
      return 'a weekly pickup rule';
    case 'MONTH':
      return "this month's general pickup schedule";
    default:
      return 'no configured pickup rule';
  }
}
