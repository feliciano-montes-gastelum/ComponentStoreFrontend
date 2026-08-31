// Local environment: a non-optimized dev build (same as "development"), but WITHOUT the DEV
// role switcher — use this to test different account views (guest vs. administrator) by really
// signing in as different accounts against a real local backend, instead of the fabricated
// sessions the role switcher produces. Run with `npm run start:local` (ng serve --configuration=local).
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  enableDevRoleSwitcher: false,
  frontendBaseUrl: 'http://localhost:4200',
};
