export interface UserSaleCreateRequest {
  userAuthenticationId: string;
  inventoryId: string;
  quantity: number;
  unitPrice: number;
}

export interface UserSaleResponse {
  id: string;
  userAuthenticationId: string;
  username: string;
  inventoryId: string;
  inventoryName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  saleDate: string;
}
