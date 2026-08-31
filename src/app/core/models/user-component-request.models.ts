export type ComponentRequestType = 'NEW_COMPONENT' | 'HOLD_EXISTING';

export type ComponentRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface UserComponentRequestCreateRequest {
  userAuthenticationId: string;
  requestType: ComponentRequestType;
  /** Required (and must reference an existing component) only when requestType is HOLD_EXISTING. */
  inventoryId?: string;
  componentName: string;
  partNumber?: string;
  manufacturer?: string;
  quantity: number;
  notes?: string;
  /** Required, and must be in the future, only when requestType is HOLD_EXISTING. ISO-8601 local date-time. */
  pickupExpiresAt?: string;
}

export interface UserComponentRequestResponse {
  id: string;
  userAuthenticationId: string;
  username: string;
  requestType: ComponentRequestType;
  status: ComponentRequestStatus;
  inventoryId: string | null;
  componentName: string;
  partNumber: string | null;
  manufacturer: string | null;
  quantity: number;
  notes: string | null;
  pickupExpiresAt: string | null;
}
