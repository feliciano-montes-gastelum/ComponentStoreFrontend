import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Every route is rendered per-request on the server rather than prerendered at build time.
 * Prerendering doesn't fit this app: content comes live from the backend, several routes take
 * a dynamic :id, and auth state lives in the browser's localStorage (a JWT bearer token, per
 * the backend's design) which the server can never see — so the server always renders the
 * signed-out view, and the client re-renders once AuthService reads the stored session on
 * hydration. This is a standard trade-off of pairing SSR with localStorage-based JWT auth.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
