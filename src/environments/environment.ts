// Production environment - AWS Deployment
// Backend API URL for AWS: component.store.backend.oiesolutions.net
// Frontend URL for AWS: component.store.oiesolutions.net
export const environment = {
  production: true,
  apiBaseUrl: 'https://componentstoreapi.oiesolutions.net/api',
  // Never on in production: see AuthService.setDevRole and DevRoleSwitcher.
  enableDevRoleSwitcher: false,
  // AWS frontend URL for WhatsApp message links and notifications
  frontendBaseUrl: 'https://store.oiesolutions.net',
};
