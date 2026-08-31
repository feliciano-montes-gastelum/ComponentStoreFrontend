import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiPaths } from '../api-paths';
import { ComponentTypeCreateRequest, ComponentTypeResponse, ComponentTypeUpdateRequest, PageQuery, PageResponse } from '../models';
import { toHttpParams } from '../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class ComponentTypeService {
  private readonly http = inject(HttpClient);

  list(query?: PageQuery): Observable<PageResponse<ComponentTypeResponse>> {
    return this.http.get<PageResponse<ComponentTypeResponse>>(ApiPaths.componentTypes.collection, {
      params: toHttpParams(query),
    });
  }

  getById(id: string): Observable<ComponentTypeResponse> {
    return this.http.get<ComponentTypeResponse>(ApiPaths.componentTypes.item(id));
  }

  create(request: ComponentTypeCreateRequest): Observable<ComponentTypeResponse> {
    return this.http.post<ComponentTypeResponse>(ApiPaths.componentTypes.collection, request);
  }

  update(id: string, request: ComponentTypeUpdateRequest): Observable<ComponentTypeResponse> {
    return this.http.put<ComponentTypeResponse>(ApiPaths.componentTypes.item(id), request);
  }

  /**
   * Backend soft-deletes (hides permanently, no restore endpoint exists) rather than truly
   * deleting. The UI prefers toggling `active` via update() instead; this is kept for API
   * coverage but intentionally not wired to a button — see README limitations.
   */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(ApiPaths.componentTypes.item(id));
  }
}
