import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { ApiPaths } from '../api-paths';
import {
  AdminPickupUpdateRequest,
  PageQuery,
  PageResponse,
  PickupRequest,
  PurchaseBagItemRequest,
  PurchaseBagQuery,
  PurchaseBagResponse,
  PurchaseBagSaleRequest,
} from '../models';
import { toHttpParams } from '../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class PurchaseBagService {
  private readonly http = inject(HttpClient);

  private readonly itemCountSignal = signal(0);
  /** Total unit count across the current user's open bag — kept in sync by every call below, so the header badge always reflects the latest state without a separate cart-state service. */
  readonly itemCount = this.itemCountSignal.asReadonly();

  // -- Self-service (any authenticated user, scoped to the JWT subject server-side) ----------

  getMyOpenBag(): Observable<PurchaseBagResponse> {
    return this.http.get<PurchaseBagResponse>(ApiPaths.purchaseBags.mine).pipe(tap((bag) => this.syncCount(bag)));
  }

  getMyHistory(query?: PageQuery): Observable<PageResponse<PurchaseBagResponse>> {
    return this.http.get<PageResponse<PurchaseBagResponse>>(ApiPaths.purchaseBags.mineHistory, {
      params: toHttpParams(query),
    });
  }

  addItem(request: PurchaseBagItemRequest): Observable<PurchaseBagResponse> {
    return this.http
      .post<PurchaseBagResponse>(ApiPaths.purchaseBags.mineItems, request)
      .pipe(tap((bag) => this.syncCount(bag)));
  }

  updateItemQuantity(itemId: string, quantity: number): Observable<PurchaseBagResponse> {
    return this.http
      .put<PurchaseBagResponse>(ApiPaths.purchaseBags.mineItem(itemId), { quantity })
      .pipe(tap((bag) => this.syncCount(bag)));
  }

  removeItem(itemId: string): Observable<PurchaseBagResponse> {
    return this.http
      .delete<PurchaseBagResponse>(ApiPaths.purchaseBags.mineItem(itemId))
      .pipe(tap((bag) => this.syncCount(bag)));
  }

  /** Requests (or updates, since the backend always overwrites) a pickup date/time for the open bag. */
  requestPickup(request: PickupRequest): Observable<PurchaseBagResponse> {
    return this.http.put<PurchaseBagResponse>(ApiPaths.purchaseBags.minePickup, request);
  }

  /** Refreshes the header badge count, e.g. right after sign-in. Silently ignores failures. */
  refreshCount(): void {
    this.getMyOpenBag().subscribe({ error: () => undefined });
  }

  resetCount(): void {
    this.itemCountSignal.set(0);
  }

  // -- Administrator only (enforced server-side: everything under /api/purchase-bags/** other
  // than /me/** requires ROLE_ADMINISTRATOR) ---------------------------------------------------

  list(query?: PurchaseBagQuery): Observable<PageResponse<PurchaseBagResponse>> {
    return this.http.get<PageResponse<PurchaseBagResponse>>(ApiPaths.purchaseBags.collection, {
      params: toHttpParams(query),
    });
  }

  getById(bagId: string): Observable<PurchaseBagResponse> {
    return this.http.get<PurchaseBagResponse>(ApiPaths.purchaseBags.item(bagId));
  }

  /**
   * Closes the sale: decrements inventory and records sale history for every item, server-side.
   * All-or-nothing — kept for API coverage, but the admin bag-detail page uses sell() instead so
   * an out-of-stock item doesn't block selling the rest of the bag. See README.
   */
  close(bagId: string): Observable<PurchaseBagResponse> {
    return this.http.post<PurchaseBagResponse>(ApiPaths.purchaseBags.close(bagId), {});
  }

  /** Directly edits an item's quantity in any bag (does not affect inventory — just the bag). */
  adminUpdateItemQuantity(bagId: string, itemId: string, quantity: number): Observable<PurchaseBagResponse> {
    return this.http.put<PurchaseBagResponse>(ApiPaths.purchaseBags.itemForBag(bagId, itemId), { quantity });
  }

  /** Removes an item from any bag entirely (does not affect inventory — just the bag). */
  adminRemoveItem(bagId: string, itemId: string): Observable<PurchaseBagResponse> {
    return this.http.delete<PurchaseBagResponse>(ApiPaths.purchaseBags.itemForBag(bagId, itemId));
  }

  /**
   * Sells only the listed items/quantities from an open bag. Unlike close(), anything not listed
   * (or a smaller quantity than what's in the bag) is left behind, untouched, in the bag — the
   * bag only becomes CLOSED if this empties it.
   */
  sell(bagId: string, request: PurchaseBagSaleRequest): Observable<PurchaseBagResponse> {
    return this.http.post<PurchaseBagResponse>(ApiPaths.purchaseBags.sell(bagId), request);
  }

  /** Confirms/rejects/marks ready/cancels a pickup, optionally changing the confirmed time. Re-validated server-side against the same availability rules as the customer-facing request. */
  updatePickup(bagId: string, request: AdminPickupUpdateRequest): Observable<PurchaseBagResponse> {
    return this.http.put<PurchaseBagResponse>(ApiPaths.purchaseBags.pickup(bagId), request);
  }

  private syncCount(bag: PurchaseBagResponse): void {
    if (bag.status !== 'OPEN') {
      this.itemCountSignal.set(0);
      return;
    }
    this.itemCountSignal.set(bag.items.reduce((sum, item) => sum + item.quantity, 0));
  }
}
