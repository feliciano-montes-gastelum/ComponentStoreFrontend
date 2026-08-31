import { environment } from '../../../environments/environment';

/**
 * The origin WhatsApp deep links should point administrators back to. Uses
 * `environment.frontendBaseUrl` when the build configuration sets one (development/local point at
 * `http://localhost:4200`); production leaves it blank since the deployed origin isn't known at
 * build time, so this falls back to the browser's own origin instead.
 *
 * Deliberately checks `typeof window` directly rather than the usual `isBrowserPlatform()`
 * helper: that helper calls `inject()`, which requires an active Angular injection context, but
 * this function is always called from deep inside a click-handler's async continuation (after a
 * successful save), well outside any injection context — a plain global check is both correct
 * (this code path never runs during SSR, since it's only reached in response to a real user
 * gesture) and doesn't throw NG0203.
 */
export function resolveFrontendBaseUrl(): string {
  if (environment.frontendBaseUrl) {
    return environment.frontendBaseUrl;
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}
