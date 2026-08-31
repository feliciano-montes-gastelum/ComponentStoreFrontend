import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiPaths } from '../api-paths';
import { PageQuery, PageResponse, UserComponentRequestCreateRequest, UserComponentRequestResponse } from '../models';
import { toHttpParams } from '../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class UserComponentRequestService {
  private readonly http = inject(HttpClient);

  create(request: UserComponentRequestCreateRequest): Observable<UserComponentRequestResponse> {
    return this.http.post<UserComponentRequestResponse>(ApiPaths.userComponentRequests.collection, request);
  }

  getById(id: string): Observable<UserComponentRequestResponse> {
    return this.http.get<UserComponentRequestResponse>(ApiPaths.userComponentRequests.item(id));
  }

  /** All requests, across all users — used by the admin requests screen. */
  list(query?: PageQuery): Observable<PageResponse<UserComponentRequestResponse>> {
    return this.http.get<PageResponse<UserComponentRequestResponse>>(ApiPaths.userComponentRequests.collection, {
      params: toHttpParams(query),
    });
  }

  /** A single user's own requests — used by "My Requests". */
  forUser(userAuthenticationId: string, query?: PageQuery): Observable<PageResponse<UserComponentRequestResponse>> {
    return this.http.get<PageResponse<UserComponentRequestResponse>>(
      ApiPaths.userComponentRequests.forUser(userAuthenticationId),
      { params: toHttpParams(query) }
    );
  }

  /**
   * The only status-transition endpoint the backend exposes. There is no admin endpoint to
   * approve/reject/mark-ready/complete a request — those ComponentRequestStatus values exist
   * but nothing in the API can ever set them. See README limitations.
   */
  cancel(id: string): Observable<void> {
    return this.http.put<void>(ApiPaths.userComponentRequests.cancel(id), {});
  }
}
