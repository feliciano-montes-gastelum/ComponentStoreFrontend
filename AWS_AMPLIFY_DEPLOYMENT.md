# AWS Amplify Deployment Guide for Component Store Frontend

This guide walks through deploying the Angular Component Store Frontend to AWS Amplify.

## Prerequisites

1. **AWS Account** - Create one at https://aws.amazon.com
2. **AWS CLI** - Install from https://aws.amazon.com/cli/
3. **AWS Amplify CLI** - Install via npm:
   ```bash
   npm install -g @aws-amplify/cli
   ```
4. **GitHub Connection** - Your repository is already on GitHub (feliciano-montes-gastelum/ComponentStoreFrontend)

## Deployment Options

### Option 1: Deploy via AWS Amplify Console (Recommended - Easiest)

1. **Connect GitHub Repository:**
   - Go to https://console.aws.amazon.com/amplify/apps/
   - Click "New app" > "Host web app"
   - Choose "GitHub" as the source
   - Authorize AWS to connect to your GitHub account
   - Select repository: `ComponentStoreFrontend`
   - Select branch: `main`

2. **Configure Build Settings:**
   - Amplify will auto-detect this is an Angular app
   - The `amplify.yml` file in your repo will be used for build configuration
   - Click "Next"

3. **Review and Deploy:**
   - Review the build settings
   - Click "Save and deploy"
   - Amplify will automatically:
     - Detect changes on `main` branch
     - Run `npm ci`
     - Run `npm run build`
     - Deploy to CloudFront
     - Provide a live URL

### Option 2: Deploy via AWS Amplify CLI

1. **Configure AWS Credentials:**
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Enter default region (e.g., us-east-1)
   # Enter default output format (json)
   ```

2. **Initialize Amplify Project:**
   ```bash
   amplify init
   ```
   Follow the prompts:
   - Project name: `ComponentStoreFrontend`
   - Environment: `dev`
   - Choose your editor
   - Choose JavaScript framework: Angular
   - Source directory: `src`
   - Distribution directory: `dist`
   - Build command: `npm run build`
   - Start command: `npm start`

3. **Add Hosting:**
   ```bash
   amplify add hosting
   ```
   Select: `Hosting with Amplify Console`

4. **Deploy:**
   ```bash
   amplify publish
   ```
   This will:
   - Build your Angular app
   - Create AWS resources
   - Deploy to Amplify Hosting
   - Provide a live URL

## Build Settings Explained (amplify.yml)

The `amplify.yml` file contains:

- **Node Environment:** Set to production
- **Pre-build phase:** `npm ci` installs exact dependencies from package-lock.json
- **Build phase:** Runs `npm run build` to create optimized production build
- **Artifacts:** Specifies `dist` folder contains build output
- **Cache:** Caches `node_modules` for faster builds
- **Files:** Specifies which file types are deployed

## Production Build Details

The `npm run build` command:
- Compiles TypeScript to JavaScript
- Bundles and minifies code
- Optimizes for production
- Creates output in `dist/ComponentStoreFrontend` directory

## Auto-Deployment

After initial setup:
- Every push to `main` branch triggers automatic build
- Amplify will run build commands from `amplify.yml`
- Updated site goes live automatically
- Previous versions can be rolled back from Amplify Console

## Environment Variables

To add environment variables:

1. **Via Console:**
   - Go to App Settings > Environment variables
   - Add variables like `API_URL`, `ENV`, etc.
   - Redeploy to apply changes

2. **Via CLI:**
   ```bash
   amplify env add production
   # Configure for production environment
   ```

## Custom Domain

1. Go to Amplify Console for your app
2. Domain management
3. Add custom domain
4. Follow DNS configuration steps for your domain registrar

## Troubleshooting

**Build Fails:**
- Check `amplify.yml` format
- Verify `npm run build` works locally: `npm run build`
- Check CloudWatch logs in Amplify Console

**Deployment is Slow:**
- Amplify caches dependencies automatically
- First build is slower than subsequent builds

**Environment Variables Not Loading:**
- Ensure variables are set in Amplify Console
- Rebuild the app for changes to take effect

## Next Steps

1. Create AWS account if you don't have one
2. Choose deployment method (Console or CLI)
3. Follow the appropriate steps above
4. Your app will be live at: `https://[branch-name].[deployment-id].amplifyapp.com`

## Resources

- [AWS Amplify Hosting Docs](https://docs.aws.amazon.com/amplify/latest/userguide/getting-started.html)
- [Amplify CLI Documentation](https://docs.amplify.aws/cli/)
- [Angular Deployment Guides](https://angular.io/guide/deployment)
- [AWS Console](https://console.aws.amazon.com/)
