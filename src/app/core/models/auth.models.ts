export const ROLE_GUEST = 'ROLE_GUEST';
export const ROLE_ADMINISTRATOR = 'ROLE_ADMINISTRATOR';

export type AppRole = typeof ROLE_GUEST | typeof ROLE_ADMINISTRATOR;

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface UserRegistrationRequest {
  username: string;
  email: string;
  password: string;
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

/** Response shape shared by POST /api/auth/login and POST /api/auth/register. */
export interface AuthenticationResponse {
  token: string;
  tokenType: string;
  /** ISO-8601 instant. */
  expiresAt: string;
  /** UserAuthentication.id — NOT UserInformation.id. */
  userId: string;
  username: string;
  roles: AppRole[];
}

/** GET/PUT /api/auth/me — the logged-in user's own account + personal information, in one call. */
export interface CurrentUserResponse {
  userId: string;
  userInformationId: string;
  username: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondLastName: string | null;
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
  twoFactorEnabled: boolean;
  /** ISO-8601 local date-time, or null if the account has never logged in before. */
  lastLoginAt: string | null;
  roles: AppRole[];
}
