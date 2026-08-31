import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiPaths } from '../api-paths';
import { PageQuery, PageResponse, UserSaleCreateRequest, UserSaleResponse } from '../models';
import { toHttpParams } from '../../shared/utils/http-params.util';

/** "Purchase / inventory history" for a user, backed by USER_INVENTORY_HISTORY. */
@Injectable({ providedIn: 'root' })
export class UserSalesService {
  private readonly http = inject(HttpClient);

  create(request: UserSaleCreateRequest): Observable<UserSaleResponse> {
    return this.http.post<UserSaleResponse>(ApiPaths.userSales.collection, request);
  }

  getById(id: string): Observable<UserSaleResponse> {
    return this.http.get<UserSaleResponse>(ApiPaths.userSales.item(id));
  }

  list(query?: PageQuery): Observable<PageResponse<UserSaleResponse>> {
    return this.http.get<PageResponse<UserSaleResponse>>(ApiPaths.userSales.collection, { params: toHttpParams(query) });
  }

  forUser(userAuthenticationId: string, query?: PageQuery): Observable<PageResponse<UserSaleResponse>> {
    return this.http.get<PageResponse<UserSaleResponse>>(ApiPaths.userSales.forUser(userAuthenticationId), {
      params: toHttpParams(query),
    });
  }
}
