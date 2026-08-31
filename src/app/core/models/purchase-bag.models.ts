/**
 * The `CANCELLED` value exists on the backend enum, but no endpoint ever sets it — treat it as
 * unreachable today. `CLOSED` is set either by the all-or-nothing POST .../close, or by
 * POST .../sell once a partial sale happens to leave the bag empty.
 */
export type PurchaseBagStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

/**
 * `NOT_REQUESTED` (default) and `REQUESTED` are set by the customer via
 * PUT /api/purchase-bags/me/pickup. `CONFIRMED`, `REJECTED`, `READY`, `COMPLETED`, and `CANCELLED`
 * are set by an administrator via PUT /api/purchase-bags/{bagId}/pickup.
 */
export type PickupStatus = 'NOT_REQUESTED' | 'REQUESTED' | 'CONFIRMED' | 'REJECTED' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface PurchaseBagItemResponse {
  id: string;
  inventoryId: string;
  inventoryName: string;
  partNumber: string | null;
  /**
   * Live inventory quantity at response time. Only informational — the backend allows a bag
   * item's quantity to exceed this (1–99 per component regardless of current stock); the real
   * stock check only happens when an administrator closes the sale.
   */
  availableQuantity: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PurchaseBagResponse {
  id: string;
  userAuthenticationId: string;
  username: string;
  status: PurchaseBagStatus;
  totalPrice: number;
  createdAt: string;
  closedAt: string | null;
  closedBy: string | null;
  /** ISO-8601 offset date-time (Java OffsetDateTime), e.g. "2026-09-01T21:30:00Z". */
  requestedPickupAt: string | null;
  /** Set by an administrator via PUT /api/purchase-bags/{bagId}/pickup whenever they supply a pickupAt. */
  confirmedPickupAt: string | null;
  pickupStatus: PickupStatus;
  pickupNotes: string | null;
  items: PurchaseBagItemResponse[];
}

export interface PurchaseBagItemRequest {
  inventoryId: string;
  quantity: number;
}

export interface PurchaseBagQuantityRequest {
  quantity: number;
}

/** PUT /api/purchase-bags/me/pickup — requestedPickupAt must be an ISO-8601 offset date-time in the future. */
export interface PickupRequest {
  requestedPickupAt: string;
  pickupNotes?: string;
}

/** One line of a POST /api/purchase-bags/{bagId}/sell request — quantity must be positive and no more than that item's current bag quantity. */
export interface PurchaseBagSaleItemRequest {
  itemId: string;
  quantity: number;
}

/**
 * ROLE_ADMINISTRATOR only. Unlike POST .../close (all-or-nothing), this sells only the listed
 * items/quantities: inventory and sales history are only touched for what's listed, and anything
 * not listed (or a smaller quantity than what's in the bag) is left behind, untouched, in the
 * bag. The bag only becomes CLOSED if this empties it; otherwise it stays OPEN.
 */
export interface PurchaseBagSaleRequest {
  items: PurchaseBagSaleItemRequest[];
}

/**
 * PUT /api/purchase-bags/{bagId}/pickup — ROLE_ADMINISTRATOR only. `pickupAt` is required when
 * `status` is `CONFIRMED`; omit it (or pass null/undefined) to change status/notes without
 * touching the previously confirmed time. The backend re-validates `pickupAt` against the same
 * availability rules as the customer-facing request.
 */
export interface AdminPickupUpdateRequest {
  status: Exclude<PickupStatus, 'NOT_REQUESTED' | 'REQUESTED'>;
  pickupAt?: string | null;
  pickupNotes?: string | null;
}

/** Query params accepted by GET /api/purchase-bags (ROLE_ADMINISTRATOR only). */
export interface PurchaseBagQuery {
  userAuthenticationId?: string;
  status?: PurchaseBagStatus;
  page?: number;
  size?: number;
  sort?: string | string[];
}
