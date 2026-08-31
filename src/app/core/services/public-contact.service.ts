import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiPaths } from '../api-paths';
import { PrincipalContactResponse } from '../models';

/**
 * GET /api/public/principal-contact — public (no authentication required). 404s until an
 * administrator has been marked as the principal contact.
 */
@Injectable({ providedIn: 'root' })
export class PublicContactService {
  private readonly http = inject(HttpClient);

  getPrincipalContact(): Observable<PrincipalContactResponse> {
    return this.http.get<PrincipalContactResponse>(ApiPaths.public.principalContact);
  }
}
