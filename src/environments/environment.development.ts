// Development environment.
// Requests to /api are proxied to the Spring Boot backend by proxy.conf.json
// (see angular.json "serve" -> "development" -> "proxyConfig"), which avoids the
// backend's missing CORS configuration entirely during `ng serve`.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  // Shows the floating DEV role switcher (see DevRoleSwitcher) for fabricating a local
  // anonymous/guest/administrator session without a real login. Use the "local" environment
  // instead (ng serve --configuration=local) to test against real accounts without it.
  enableDevRoleSwitcher: true,
  frontendBaseUrl: 'http://localhost:4200',
};
