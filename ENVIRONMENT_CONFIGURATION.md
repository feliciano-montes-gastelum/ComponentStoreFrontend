# Environment Configuration - AWS Deployment

## Production URLs

The application is configured to use the following URLs for AWS deployment:

### Frontend URL
```
https://component.store.oiesolutions.net
```

### Backend API URL
```
https://component.store.backend.oiesolutions.net/api
```

## Environment Files Overview

### 1. **environment.ts** (Production - AWS)
- **Purpose:** Used when deploying to AWS Amplify
- **apiBaseUrl:** `https://component.store.backend.oiesolutions.net/api`
- **frontendBaseUrl:** `https://component.store.oiesolutions.net`
- **enableDevRoleSwitcher:** `false` (disabled for security)

Build for production:
```bash
npm run build
```

### 2. **environment.development.ts** (Local Development)
- **Purpose:** Used during local development with `ng serve`
- **apiBaseUrl:** `/api` (proxied via proxy.conf.json)
- **frontendBaseUrl:** `http://localhost:4200`
- **enableDevRoleSwitcher:** `true` (enables DEV role switcher for testing)

Run development server:
```bash
npm start
```

### 3. **environment.local.ts** (Local Testing)
- **Purpose:** Testing against a real local backend without DEV role switcher
- **apiBaseUrl:** `/api` (proxied via proxy.conf.json)
- **frontendBaseUrl:** `http://localhost:4200`
- **enableDevRoleSwitcher:** `false` (disabled for real account testing)

Run with:
```bash
npm run start:local
```

## How Environment Variables Are Used

### API Base URL
- Used in HTTP interceptors and services for all API calls
- Example: `apiBaseUrl/components` → `https://component.store.backend.oiesolutions.net/api/components`

### Frontend Base URL
- Used for WhatsApp notifications and message links
- Used in redirects and social sharing
- Falls back to `window.location.origin` if empty

### Dev Role Switcher
- Development only feature
- Allows quick role switching without login
- Disabled in production for security

## CORS Configuration Note

The backend API at `component.store.backend.oiesolutions.net` must have CORS configured to accept requests from `component.store.oiesolutions.net`.

Backend CORS setup example:
```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("https://component.store.oiesolutions.net")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true);
            }
        };
    }
}
```

## DNS Configuration

Ensure your domain registrar has the following DNS records:

| Record Type | Name | Value |
|-------------|------|-------|
| CNAME | component.store | `[AWS-Amplify-Domain]` |
| CNAME | component.store.backend | `[AWS-Backend-Domain]` |

Or use Route 53 for easier management:
1. Create hosted zone for `oiesolutions.net`
2. Create CNAME records pointing to AWS resources
3. Update domain registrar nameservers

## Building for Production

```bash
# Build the production bundle
npm run build

# Output directory: dist/ComponentStoreFrontend
# This is what gets deployed to AWS Amplify
```

## Testing Environment Configuration Locally

To test the production configuration locally:

1. Build production bundle:
   ```bash
   npm run build
   ```

2. Serve the production build:
   ```bash
   npm install -g http-server
   cd dist/ComponentStoreFrontend
   http-server
   ```

3. Navigate to `http://localhost:8080` and verify:
   - API calls go to backend URL
   - Frontend URL is correctly set
   - No DEV role switcher is visible

## Troubleshooting

**Issue:** API calls to localhost instead of AWS backend
- **Solution:** Ensure you're using production build (`npm run build`), not development server

**Issue:** CORS errors when calling backend
- **Solution:** Check backend CORS configuration allows requests from frontend URL

**Issue:** WhatsApp links pointing to localhost
- **Solution:** Verify `frontendBaseUrl` is set correctly in environment.ts

**Issue:** Environment not updating after build
- **Solution:** Delete `dist` folder and rebuild: `rm -rf dist && npm run build`

## Deployment Checklist

- [ ] Frontend URL configured: `https://component.store.oiesolutions.net`
- [ ] Backend URL configured: `https://component.store.backend.oiesolutions.net/api`
- [ ] DNS records created in Route 53 or registrar
- [ ] Backend CORS configured for frontend URL
- [ ] SSL/TLS certificates configured
- [ ] Production build tested locally
- [ ] Deployed to AWS Amplify
- [ ] Manual testing in production environment
