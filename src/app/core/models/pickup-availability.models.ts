export type PickupAvailabilityScope = 'DAY' | 'WEEK' | 'MONTH';

/** Mirrors java.time.DayOfWeek's enum names, as serialized by Jackson. */
export type IsoDayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

/**
 * An administrator-configured pickup rule. Priority when resolving a date is always
 * DAY > WEEK > MONTH (PickupAvailabilityService.priority() on the backend) — a matching DAY rule
 * overrides every WEEK/MONTH rule for that date, a matching WEEK rule overrides MONTH rules only
 * when no DAY rule matches, and MONTH is the general/default schedule. Multiple rules can exist
 * at the same winning scope for the same date (e.g. two separate available time windows); an
 * unavailable rule at the winning scope closes that date even if available rules also exist at
 * that same scope.
 */
export interface PickupAvailabilityRuleRequest {
  name: string;
  scope: PickupAvailabilityScope;
  /** Required, and cannot repeat, when scope is DAY. "YYYY-MM-DD". */
  specificDate?: string | null;
  /** Required when scope is WEEK. */
  dayOfWeek?: IsoDayOfWeek | null;
  /** Required only for a non-recurring WEEK rule — the exact week (any date within it) the rule applies to. */
  weekStartDate?: string | null;
  /** Required when scope is MONTH. 1-12. */
  month?: number | null;
  /** Required only for a non-recurring MONTH rule. */
  year?: number | null;
  /** DAY rules can never recur. A recurring WEEK rule applies every week; a recurring MONTH rule applies every year. */
  recurring: boolean;
  /** false closes the matching period entirely, regardless of any other available rule at the same scope. */
  available: boolean;
  /** Required when available is true; must be earlier than endTime. "HH:mm:ss". */
  startTime?: string | null;
  endTime?: string | null;
  active: boolean;
}

export interface PickupAvailabilityRuleResponse {
  id: string;
  name: string;
  scope: PickupAvailabilityScope;
  specificDate: string | null;
  dayOfWeek: IsoDayOfWeek | null;
  weekStartDate: string | null;
  month: number | null;
  year: number | null;
  recurring: boolean;
  available: boolean;
  startTime: string | null;
  endTime: string | null;
  active: boolean;
}

export interface PickupTimeWindow {
  startTime: string;
  endTime: string;
}

/** GET /api/pickup-availability/dates/{date} — the fully-resolved outcome for one calendar date. */
export interface PickupDayAvailabilityResponse {
  date: string;
  timezone: string;
  /** null only when no active rule at any scope matches this date at all (treated as unavailable). */
  appliedScope: PickupAvailabilityScope | null;
  available: boolean;
  windows: PickupTimeWindow[];
}
