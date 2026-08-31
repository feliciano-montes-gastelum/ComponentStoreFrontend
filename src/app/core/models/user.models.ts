/**
 * NOTE: this DTO has no username or UserAuthentication id field, so bulk listings
 * (GET /api/users/information) can't be cross-referenced with login accounts / roles directly —
 * see the admin Users list, which is built from role-assignments instead. Looking up ONE known
 * account's personal info by its login-account id, though, works via
 * GET /api/users/authentication/{id} (CurrentUserResponse) instead of this DTO.
 */
export interface UserInformationResponse {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondLastName: string | null;
  email: string;
  contactNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
  studingArea: string | null;
  schoolID: string | null;
  /** True for exactly one administrator at a time — set via PUT /api/users/authentication/{id}/principal-contact. */
  principalContact: boolean;
  active: boolean;
}

export interface UserInformationUpdateRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  contactNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
}

export interface RoleResponse {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface RoleRequest {
  /** Must match ^ROLE_[A-Z0-9_]+$ */
  name: string;
  description?: string;
  active: boolean;
}

export interface RoleAssignmentResponse {
  id: string;
  userAuthenticationId: string;
  username: string;
  roleId: string;
  roleName: string;
}

export interface RoleAssignmentRequest {
  userAuthenticationId: string;
  roleId: string;
}
