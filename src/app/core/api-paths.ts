import { environment } from '../../environments/environment';

const base = environment.apiBaseUrl;

/** Single source of truth for every backend route this app calls. No endpoint string is duplicated elsewhere. */
export const ApiPaths = {
  auth: {
    login: `${base}/auth/login`,
    register: `${base}/auth/register`,
    me: `${base}/auth/me`,
  },
  componentTypes: {
    collection: `${base}/component-types`,
    item: (id: string) => `${base}/component-types/${id}`,
  },
  inventory: {
    collection: `${base}/inventory`,
    item: (id: string) => `${base}/inventory/${id}`,
    search: `${base}/inventory/search`,
  },
  inventoryHistory: {
    collection: `${base}/inventory-history`,
    item: (id: string) => `${base}/inventory-history/${id}`,
    forInventory: (inventoryId: string) => `${base}/inventory-history/inventory/${inventoryId}`,
  },
  inventoryImages: {
    collection: (inventoryId: string) => `${base}/inventory/${inventoryId}/images`,
    upload: (inventoryId: string) => `${base}/inventory/${inventoryId}/images/upload`,
    item: (inventoryId: string, imageId: string) => `${base}/inventory/${inventoryId}/images/${imageId}`,
  },
  userProfileImages: {
    collection: (userInformationId: string) => `${base}/users/information/${userInformationId}/images`,
    upload: (userInformationId: string) => `${base}/users/information/${userInformationId}/images/upload`,
    item: (userInformationId: string, imageId: string) =>
      `${base}/users/information/${userInformationId}/images/${imageId}`,
  },
  purchaseBags: {
    mine: `${base}/purchase-bags/me`,
    mineHistory: `${base}/purchase-bags/me/history`,
    mineItems: `${base}/purchase-bags/me/items`,
    mineItem: (itemId: string) => `${base}/purchase-bags/me/items/${itemId}`,
    minePickup: `${base}/purchase-bags/me/pickup`,
    collection: `${base}/purchase-bags`,
    item: (bagId: string) => `${base}/purchase-bags/${bagId}`,
    close: (bagId: string) => `${base}/purchase-bags/${bagId}/close`,
    itemForBag: (bagId: string, itemId: string) => `${base}/purchase-bags/${bagId}/items/${itemId}`,
    sell: (bagId: string) => `${base}/purchase-bags/${bagId}/sell`,
    pickup: (bagId: string) => `${base}/purchase-bags/${bagId}/pickup`,
  },
  pickupAvailability: {
    date: (date: string) => `${base}/pickup-availability/dates/${date}`,
    rules: `${base}/pickup-availability/rules`,
    ruleItem: (id: string) => `${base}/pickup-availability/rules/${id}`,
  },
  public: {
    principalContact: `${base}/public/principal-contact`,
  },
  userComponentRequests: {
    collection: `${base}/user-component-requests`,
    item: (id: string) => `${base}/user-component-requests/${id}`,
    forUser: (userAuthenticationId: string) => `${base}/user-component-requests/user/${userAuthenticationId}`,
    cancel: (id: string) => `${base}/user-component-requests/${id}/cancel`,
  },
  users: {
    information: `${base}/users/information`,
    informationItem: (id: string) => `${base}/users/information/${id}`,
    roles: `${base}/users/roles`,
    roleItem: (id: string) => `${base}/users/roles/${id}`,
    roleAssignments: `${base}/users/role-assignments`,
    roleAssignmentItem: (id: string) => `${base}/users/role-assignments/${id}`,
    authenticationItem: (userAuthenticationId: string) => `${base}/users/authentication/${userAuthenticationId}`,
    principalContact: (userAuthenticationId: string) =>
      `${base}/users/authentication/${userAuthenticationId}/principal-contact`,
  },
  userSales: {
    collection: `${base}/user-sales`,
    item: (id: string) => `${base}/user-sales/${id}`,
    forUser: (userAuthenticationId: string) => `${base}/user-sales/user/${userAuthenticationId}`,
  },
} as const;
