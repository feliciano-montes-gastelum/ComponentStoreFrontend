export type InventoryHistoryAction = 'CREATED' | 'UPDATED' | 'QUANTITY_ADDED' | 'SALE' | 'DELETED';

export interface InventoryHistoryResponse {
  id: string;
  inventoryId: string;
  action: InventoryHistoryAction;
  inventoryName: string;
  partNumber: string | null;
  serialNumber: string | null;
  previousQuantity: number;
  newQuantity: number;
  quantityChange: number;
  description: string | null;
  createDate: string;
  updateUser: string;
  version: number;
}
