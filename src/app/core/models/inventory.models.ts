export interface InventoryResponse {
  id: string;
  componentTypeId: string;
  componentTypeCode: string;
  componentTypeName: string;
  name: string;
  partNumber: string | null;
  serialNumber: string | null;
  description: string | null;
  manufacturer: string | null;
  quantity: number;
  unitPrice: number;
  location: string | null;
  imageUrl: string | null;
  active: boolean;
  createDate: string;
  updateDate: string;
  updateUser: string;
  version: number;
}

export interface InventoryCreateRequest {
  componentTypeId: string;
  name: string;
  partNumber?: string;
  serialNumber?: string;
  description?: string;
  manufacturer?: string;
  quantity: number;
  unitPrice: number;
  location?: string;
  imageUrl?: string;
  active: boolean;
}

export type InventoryUpdateRequest = InventoryCreateRequest;

/** Query params accepted by GET /api/inventory/search. */
export interface InventorySearchQuery {
  name?: string;
  partNumber?: string;
  manufacturer?: string;
  componentTypeId?: string;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string | string[];
}

export type StockLevel = 'in-stock' | 'low-stock' | 'out-of-stock';

/** Below this quantity (and above zero) a component is considered "low stock" in the UI. */
export const LOW_STOCK_THRESHOLD = 5;

export function stockLevelOf(quantity: number): StockLevel {
  if (quantity <= 0) {
    return 'out-of-stock';
  }
  if (quantity <= LOW_STOCK_THRESHOLD) {
    return 'low-stock';
  }
  return 'in-stock';
}
