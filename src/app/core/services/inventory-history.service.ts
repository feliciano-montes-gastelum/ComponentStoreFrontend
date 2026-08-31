import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiPaths } from '../api-paths';
import { InventoryHistoryResponse, PageQuery, PageResponse } from '../models';
import { toHttpParams } from '../../shared/utils/http-params.util';

/** Read-only — history rows are only ever created as a side effect of inventory/sale operations. */
@Injectable({ providedIn: 'root' })
export class InventoryHistoryService {
  private readonly http = inject(HttpClient);

  list(query?: PageQuery): Observable<PageResponse<InventoryHistoryResponse>> {
    return this.http.get<PageResponse<InventoryHistoryResponse>>(ApiPaths.inventoryHistory.collection, {
      params: toHttpParams(query),
    });
  }

  getById(id: string): Observable<InventoryHistoryResponse> {
    return this.http.get<InventoryHistoryResponse>(ApiPaths.inventoryHistory.item(id));
  }

  forInventory(inventoryId: string, query?: PageQuery): Observable<PageResponse<InventoryHistoryResponse>> {
    return this.http.get<PageResponse<InventoryHistoryResponse>>(ApiPaths.inventoryHistory.forInventory(inventoryId), {
      params: toHttpParams(query),
    });
  }
}
