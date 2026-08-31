import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiPaths } from '../api-paths';
import {
  CurrentUserResponse,
  PageQuery,
  PageResponse,
  PrincipalContactResponse,
  RoleAssignmentRequest,
  RoleAssignmentResponse,
  RoleRequest,
  RoleResponse,
  UserInformationResponse,
  UserInformationUpdateRequest,
} from '../models';
import { toHttpParams } from '../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly http = inject(HttpClient);

  // -- User information ----------------------------------------------------
  // NOTE: UserInformationResponse has no username/userAuthenticationId field, and there is no
  // "get my own profile" endpoint — see README limitations for the impact on Profile/Admin Users.

  getInformation(userInformationId: string): Observable<UserInformationResponse> {
    return this.http.get<UserInformationResponse>(ApiPaths.users.informationItem(userInformationId));
  }

  listInformation(query?: PageQuery): Observable<PageResponse<UserInformationResponse>> {
    return this.http.get<PageResponse<UserInformationResponse>>(ApiPaths.users.information, {
      params: toHttpParams(query),
    });
  }

  updateInformation(userInformationId: string, request: UserInformationUpdateRequest): Observable<UserInformationResponse> {
    return this.http.put<UserInformationResponse>(ApiPaths.users.informationItem(userInformationId), request);
  }

  /**
   * The account + personal-info bridge that used to be missing: given a login account's
   * UserAuthentication id (the id every other admin screen already has — role assignments,
   * purchase bags, sales, requests), this returns their username, roles, and personal
   * information (name, email, contact, address) in one call, reusing the same backend logic as
   * the self-service GET /api/auth/me.
   */
  getAuthenticationDetail(userAuthenticationId: string): Observable<CurrentUserResponse> {
    return this.http.get<CurrentUserResponse>(ApiPaths.users.authenticationItem(userAuthenticationId));
  }

  /**
   * Makes this administrator the principal contact (the one whose WhatsApp number customer
   * pickup/component-request notifications go to), replacing whoever held it before. The backend
   * enforces both preconditions itself: the account must carry ROLE_ADMINISTRATOR and have a
   * contact number on file.
   */
  setPrincipalContact(userAuthenticationId: string): Observable<PrincipalContactResponse> {
    return this.http.put<PrincipalContactResponse>(ApiPaths.users.principalContact(userAuthenticationId), {});
  }

  // -- Roles (ROLE_ADMINISTRATOR only, enforced by the backend) -----------

  listRoles(query?: PageQuery): Observable<PageResponse<RoleResponse>> {
    return this.http.get<PageResponse<RoleResponse>>(ApiPaths.users.roles, { params: toHttpParams(query) });
  }

  createRole(request: RoleRequest): Observable<RoleResponse> {
    return this.http.post<RoleResponse>(ApiPaths.users.roles, request);
  }

  updateRole(id: string, request: RoleRequest): Observable<RoleResponse> {
    return this.http.put<RoleResponse>(ApiPaths.users.roleItem(id), request);
  }

  removeRole(id: string): Observable<void> {
    return this.http.delete<void>(ApiPaths.users.roleItem(id));
  }

  // -- Role assignments (ROLE_ADMINISTRATOR only) --------------------------
  // No "update" endpoint exists: changing a user's role is create-new + delete-old.

  listRoleAssignments(query?: PageQuery): Observable<PageResponse<RoleAssignmentResponse>> {
    return this.http.get<PageResponse<RoleAssignmentResponse>>(ApiPaths.users.roleAssignments, {
      params: toHttpParams(query),
    });
  }

  createRoleAssignment(request: RoleAssignmentRequest): Observable<RoleAssignmentResponse> {
    return this.http.post<RoleAssignmentResponse>(ApiPaths.users.roleAssignments, request);
  }

  removeRoleAssignment(id: string): Observable<void> {
    return this.http.delete<void>(ApiPaths.users.roleAssignmentItem(id));
  }
}
