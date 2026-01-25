---
description: Deploy updates to production site
---

# Deploy to Production Workflow

This workflow explains how to deploy your latest changes to your live production site.

## Quick Deploy (After Initial Setup)

Once automated deployment is configured, deploying is simple:

// turbo-all
1. **Commit your changes**
```bash
git add .
git commit -m "Your commit message describing the changes"
```

2. **Push to GitHub**
```bash
git push origin main
```

3. **Wait for deployment** (2-3 minutes)
   - Watch progress: https://github.com/Amphy2000/pharmatrackai/actions
   - Your site will automatically update!

---

## Initial Setup (One-Time Only)

If you haven't set up automated deployment yet:

### Step 1: Run Setup Script

```bash
.\setup-deployment.ps1
```

This will:
- Install Vercel CLI if needed
- Link your project to Vercel
- Display the secrets you need to add to GitHub

### Step 2: Add GitHub Secrets

1. Go to: https://github.com/Amphy2000/pharmatrackai/settings/secrets/actions
2. Click "New repository secret"
3. Add these three secrets:

**VERCEL_TOKEN**
- Get from: https://vercel.com/account/tokens
- Create a new token named "GitHub Actions"

**VERCEL_ORG_ID**
- Shown in the setup script output
- Or find in `.vercel/project.json`

**VERCEL_PROJECT_ID**
- Shown in the setup script output
- Or find in `.vercel/project.json`

### Step 3: Push Setup Files

```bash
git add .
git commit -m "Setup automated deployment"
git push origin main
```

---

## Manual Deployment (Alternative)

If you prefer to deploy manually without automation:

```bash
# Install Vercel CLI (one-time)
npm install -g vercel

# Login to Vercel (one-time)
vercel login

# Deploy to production
vercel --prod
```

---

## Troubleshooting

### Changes not showing on live site?

1. **Check deployment status**
   - Go to: https://github.com/Amphy2000/pharmatrackai/actions
   - Ensure the latest workflow succeeded

2. **Clear browser cache**
   - Press Ctrl + Shift + R
   - Or try incognito mode

3. **Check Vercel dashboard**
   - Go to: https://vercel.com/dashboard
   - Verify the deployment completed

### Deployment failed?

1. **Check GitHub Actions logs**
   - Click on the failed workflow
   - Review error messages

2. **Verify secrets are correct**
   - Go to repository settings → Secrets
   - Ensure all three secrets are added

3. **Check Vercel token**
   - Token might have expired
   - Create a new one at: https://vercel.com/account/tokens

### Branch diverged error?

If you get "branches have diverged" when pushing:

```bash
# Option 1: Pull and merge (safer)
git pull origin main --no-rebase
git push origin main

# Option 2: Force push (overwrites remote)
git push origin main --force
```

⚠️ **Warning**: Force push will overwrite the remote branch. Only use if you're sure!

---

## Understanding the Workflow

### What happens when you push?

1. **GitHub detects push** to main branch
2. **GitHub Actions starts** the deployment workflow
3. **Code is checked out** from your repository
4. **Dependencies are installed** (npm install)
5. **Project is built** (npm run build)
6. **Built files are deployed** to Vercel
7. **Your live site updates** automatically!

### Where is everything?

- **Development**: Antigravity (right here!)
- **Source Code**: GitHub (https://github.com/Amphy2000/pharmatrackai)
- **Hosting**: Vercel (https://vercel.com)
- **Live Site**: https://www.pharmatrack.com.ng

### Workflow files

- `.github/workflows/deploy.yml` - GitHub Actions configuration
- `vercel.json` - Vercel deployment settings
- `.vercel/project.json` - Vercel project information (auto-generated)

---

## Best Practices

1. **Test locally first**
   ```bash
   npm run dev
   ```
   Verify changes work before pushing

2. **Use meaningful commit messages**
   - ✅ "Add AI Invoice Scanner feature"
   - ❌ "update"

3. **Check deployment status**
   - Always verify deployment succeeded
   - Check GitHub Actions after pushing

4. **Work with Antigravity**
   - Make changes by prompting Antigravity
   - Review changes locally
   - Commit and push when ready

5. **Monitor your live site**
   - After deployment, check the live site
   - Verify changes appear correctly
