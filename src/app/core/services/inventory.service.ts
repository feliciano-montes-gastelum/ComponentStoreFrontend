import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiPaths } from '../api-paths';
import { InventoryCreateRequest, InventoryResponse, InventorySearchQuery, InventoryUpdateRequest, PageQuery, PageResponse } from '../models';
import { toHttpParams } from '../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);

  list(query?: PageQuery): Observable<PageResponse<InventoryResponse>> {
    return this.http.get<PageResponse<InventoryResponse>>(ApiPaths.inventory.collection, {
      params: toHttpParams(query),
    });
  }

  /** GET /api/inventory/search — case-insensitive substring match on name/partNumber/manufacturer. */
  search(query: InventorySearchQuery): Observable<PageResponse<InventoryResponse>> {
    return this.http.get<PageResponse<InventoryResponse>>(ApiPaths.inventory.search, {
      params: toHttpParams(query),
    });
  }

  getById(id: string): Observable<InventoryResponse> {
    return this.http.get<InventoryResponse>(ApiPaths.inventory.item(id));
  }

  create(request: InventoryCreateRequest): Observable<InventoryResponse> {
    return this.http.post<InventoryResponse>(ApiPaths.inventory.collection, request);
  }

  /**
   * Full update — the backend has no separate "adjust quantity by delta" endpoint; every
   * quantity change (and its resulting inventory-history entry) goes through this same PUT.
   * The service derives the history action automatically from the quantity delta server-side.
   */
  update(id: string, request: InventoryUpdateRequest): Observable<InventoryResponse> {
    return this.http.put<InventoryResponse>(ApiPaths.inventory.item(id), request);
  }

  /**
   * Backend soft-deletes (hides permanently, no restore endpoint exists) rather than truly
   * deleting. The UI prefers toggling `active` via update() instead; this is kept for API
   * coverage but intentionally not wired to a button — see README limitations.
   */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(ApiPaths.inventory.item(id));
  }
}
