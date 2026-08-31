import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { ApiPaths } from '../api-paths';
import {
  AppRole,
  AuthenticationResponse,
  CurrentUserResponse,
  LoginRequest,
  ROLE_ADMINISTRATOR,
  ROLE_GUEST,
  UserInformationUpdateRequest,
  UserRegistrationRequest,
} from '../models';
import { isBrowserPlatform } from '../../shared/utils/platform.util';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'cs_auth_session';
const DEV_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

interface StoredSession {
  token: string;
  tokenType: string;
  expiresAt: string;
  userId: string;
  username: string;
  roles: AppRole[];
  /** True only for a session fabricated by the dev-only role switcher, never for a real login. */
  isDevSession?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isBrowserPlatform();

  private readonly sessionSignal = signal<StoredSession | null>(this.readInitialSession());
  private logoutTimer: ReturnType<typeof setTimeout> | undefined;

  readonly session = this.sessionSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly username = computed(() => this.sessionSignal()?.username ?? null);
  readonly userId = computed(() => this.sessionSignal()?.userId ?? null);
  readonly roles = computed<AppRole[]>(() => this.sessionSignal()?.roles ?? []);
  readonly isAdministrator = computed(() => this.roles().includes(ROLE_ADMINISTRATOR));
  readonly isGuest = computed(() => this.isAuthenticated() && !this.isAdministrator());
  /** True only while the dev-only role switcher's fabricated session is active. Always false in production builds. */
  readonly isDevSession = computed(() => this.sessionSignal()?.isDevSession === true);

  constructor() {
    this.scheduleAutoLogout();
  }

  login(request: LoginRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>(ApiPaths.auth.login, request)
      .pipe(tap((response) => this.startSession(response)));
  }

  register(request: UserRegistrationRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>(ApiPaths.auth.register, request)
      .pipe(tap((response) => this.startSession(response)));
  }

  logout(): void {
    this.clearLogoutTimer();
    this.sessionSignal.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  getToken(): string | null {
    return this.sessionSignal()?.token ?? null;
  }

  /** The logged-in user's own account + personal information (name, email, address, etc.). */
  getCurrentUser(): Observable<CurrentUserResponse> {
    return this.http.get<CurrentUserResponse>(ApiPaths.auth.me);
  }

  /** Updates the logged-in user's own personal information. Email and username aren't editable here. */
  updateCurrentUser(request: UserInformationUpdateRequest): Observable<CurrentUserResponse> {
    return this.http.put<CurrentUserResponse>(ApiPaths.auth.me, request);
  }

  /**
   * Development only: fabricates a local session so the UI's role switcher can preview the
   * anonymous/guest/administrator experience without a real backend login. Never calls the
   * backend and is a no-op unless `environment.enableDevRoleSwitcher` is true (only the
   * "development" environment sets this — not production, and not "local", which is meant for
   * testing real account views instead), as a defense-in-depth guard alongside the
   * DevRoleSwitcher component only rendering under that same flag. This only changes what the
   * frontend *believes* about the current user — it relies on the backend's "develop" Spring
   * profile (which disables authorization and JWT validation entirely) to actually let requests
   * through; against any other backend profile, API calls made under a fake dev role will be
   * rejected exactly as they would for any other unauthenticated/unauthorized request.
   */
  setDevRole(role: AppRole | null): void {
    if (!environment.enableDevRoleSwitcher) {
      return;
    }
    if (role === null) {
      this.logout();
      return;
    }

    const isAdmin = role === ROLE_ADMINISTRATOR;
    const session: StoredSession = {
      token: `dev-mode-${role}`,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + DEV_SESSION_DURATION_MS).toISOString(),
      userId: isAdmin ? 'dev-administrator' : 'dev-guest',
      username: isAdmin ? 'dev-administrator' : 'dev-guest',
      roles: [role],
      isDevSession: true,
    };
    this.sessionSignal.set(session);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    this.scheduleAutoLogout();
  }

  private startSession(response: AuthenticationResponse): void {
    const session: StoredSession = {
      token: response.token,
      tokenType: response.tokenType,
      expiresAt: response.expiresAt,
      userId: response.userId,
      username: response.username,
      roles: response.roles,
    };
    this.sessionSignal.set(session);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    this.scheduleAutoLogout();
  }

  private readInitialSession(): StoredSession | null {
    if (!this.isBrowser) {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as StoredSession;
      if (this.isExpired(parsed.expiresAt)) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private isExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() <= Date.now();
  }

  private scheduleAutoLogout(): void {
    this.clearLogoutTimer();
    if (!this.isBrowser) {
      return;
    }
    const session = this.sessionSignal();
    if (!session) {
      return;
    }
    const msUntilExpiry = new Date(session.expiresAt).getTime() - Date.now();
    if (msUntilExpiry <= 0) {
      this.logout();
      return;
    }
    this.logoutTimer = setTimeout(() => this.logout(), msUntilExpiry);
  }

  private clearLogoutTimer(): void {
    if (this.logoutTimer !== undefined) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = undefined;
    }
  }
}

export { ROLE_ADMINISTRATOR, ROLE_GUEST };
