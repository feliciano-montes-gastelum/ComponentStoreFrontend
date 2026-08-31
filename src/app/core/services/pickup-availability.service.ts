import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiPaths } from '../api-paths';
import { PickupAvailabilityRuleRequest, PickupAvailabilityRuleResponse, PickupDayAvailabilityResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class PickupAvailabilityService {
  private readonly http = inject(HttpClient);

  /** Any authenticated user. Resolves DAY > WEEK > MONTH priority server-side for one calendar date. */
  getAvailability(date: string): Observable<PickupDayAvailabilityResponse> {
    return this.http.get<PickupDayAvailabilityResponse>(ApiPaths.pickupAvailability.date(date));
  }

  // -- Rule management (ROLE_ADMINISTRATOR only, enforced server-side) -----

  /** Not paginated — the backend returns every rule (active and inactive) in one list. */
  listRules(): Observable<PickupAvailabilityRuleResponse[]> {
    return this.http.get<PickupAvailabilityRuleResponse[]>(ApiPaths.pickupAvailability.rules);
  }

  createRule(request: PickupAvailabilityRuleRequest): Observable<PickupAvailabilityRuleResponse> {
    return this.http.post<PickupAvailabilityRuleResponse>(ApiPaths.pickupAvailability.rules, request);
  }

  updateRule(id: string, request: PickupAvailabilityRuleRequest): Observable<PickupAvailabilityRuleResponse> {
    return this.http.put<PickupAvailabilityRuleResponse>(ApiPaths.pickupAvailability.ruleItem(id), request);
  }

  deleteRule(id: string): Observable<void> {
    return this.http.delete<void>(ApiPaths.pickupAvailability.ruleItem(id));
  }
}
