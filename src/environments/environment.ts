// Production environment.
// The backend has no CORS configuration, so a cross-origin production deployment
// (frontend and backend on different origins) will be blocked by the browser unless
// the backend adds a CorsConfigurationSource, or this app is served from the same
// origin as the API (e.g. behind a reverse proxy that maps /api to the backend).
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  // Never on in production: see AuthService.setDevRole and DevRoleSwitcher.
  enableDevRoleSwitcher: false,
  // Left blank: the production host isn't known at build time. WhatsApp message links
  // (WhatsAppOutreachService / the pickup + component-request notifications) fall back to
  // `window.location.origin` in the browser whenever this is empty — see whatsapp-message.util.ts
  // callers. Set this explicitly only if the deployed frontend origin ever differs from the
  // origin administrators should actually land on (e.g. behind a CDN).
  frontendBaseUrl: '',
};
