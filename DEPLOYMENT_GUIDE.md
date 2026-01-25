# 🚀 PharmaTrack Automated Deployment Guide

## Your Setup

You've moved away from Lovable to have **full control** of your application! 🎉

- **Development**: Work directly with Antigravity (right here!)
- **Source Code**: https://github.com/Amphy2000/pharmatrackai.git
- **Hosting**: Vercel
- **Live Site**: https://www.pharmatrack.com.ng

## How It Works

```
You make changes with Antigravity
         ↓
    Commit & Push to GitHub
         ↓
GitHub Actions Auto-Deploys
         ↓
   Live Site Updates! ✨
```

---

## ✅ One-Time Setup

### Step 1: Get Your Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name it: `GitHub Actions Deploy`
4. Copy the token (you'll only see it once!)

### Step 2: Add Secrets to GitHub

1. Go to: https://github.com/Amphy2000/pharmatrackai/settings/secrets/actions
2. Click **"New repository secret"**

Add these **3 secrets**:

#### Secret 1: VERCEL_TOKEN
- **Name**: `VERCEL_TOKEN`
- **Value**: The token from Step 1

#### Secret 2: VERCEL_ORG_ID
- **Name**: `VERCEL_ORG_ID`
- **Value**: Run `vercel link` and check `.vercel/project.json` for `orgId`

#### Secret 3: VERCEL_PROJECT_ID
- **Name**: `VERCEL_PROJECT_ID`
- **Value**: From the same `.vercel/project.json` file, copy `projectId`

### Step 3: Link Vercel Project (Get the IDs)

Run this script to get your Vercel project IDs:

```powershell
.\setup-deployment.ps1
```

This will show you the exact values for `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.

### Step 4: Push Everything

```bash
git add .
git commit -m "Setup automated deployment from pharmatrackai repo"
git push origin main
```

---

## 🎯 Daily Workflow (After Setup)

Once setup is complete, your workflow is super simple:

### 1. Make Changes
- Work with Antigravity to add features, fix bugs, etc.
- Antigravity will edit your local files

### 2. Commit Changes
```bash
git add .
git commit -m "Description of what you changed"
```

### 3. Push to GitHub
```bash
git push origin main
```

### 4. Automatic Deployment! 🚀
- GitHub Actions automatically triggers
- Your code is built and deployed to Vercel
- Live site updates in 2-3 minutes!

**Watch deployment**: https://github.com/Amphy2000/pharmatrackai/actions

---

## 📱 Alternative: Manual Deployment

If you prefer manual control:

```bash
# Install Vercel CLI (one-time)
npm install -g vercel

# Login to Vercel (one-time)
vercel login

# Deploy to production
vercel --prod
```

---

## 🔧 Verifying Your Setup

### Check Git Remote
```bash
git remote -v
```
Should show:
```
origin  https://github.com/Amphy2000/pharmatrackai.git (fetch)
origin  https://github.com/Amphy2000/pharmatrackai.git (push)
```

### Check GitHub Secrets
Go to: https://github.com/Amphy2000/pharmatrackai/settings/secrets/actions

You should see:
- ✅ VERCEL_TOKEN
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID

### Check Workflow File
File: `.github/workflows/deploy.yml` should exist

---

## 🆘 Troubleshooting

### "My changes aren't showing on the live site"

1. **Check GitHub Actions**
   - Go to: https://github.com/Amphy2000/pharmatrackai/actions
   - Verify the latest workflow succeeded (green checkmark)

2. **Clear browser cache**
   - Press `Ctrl + Shift + R`
   - Or try incognito mode

3. **Check Vercel dashboard**
   - Go to: https://vercel.com/dashboard
   - Verify deployment completed

### "GitHub Actions failed"

1. **Check the error logs**
   - Click on the failed workflow in GitHub Actions
   - Review the error messages

2. **Common issues**:
   - Missing or incorrect secrets
   - Expired Vercel token
   - Build errors in your code

3. **Fix and retry**:
   ```bash
   # Fix the issue, then:
   git add .
   git commit -m "Fix deployment issue"
   git push origin main
   ```

### "Deployment is slow"

- First deployment can take 5-10 minutes
- Subsequent deployments are faster (2-3 minutes)
- Check Vercel dashboard for progress

---

## 📊 What Gets Deployed

Every time you push to the `main` branch:

- ✅ All your source code changes
- ✅ New features and bug fixes
- ✅ Updated dependencies
- ✅ Environment variables (from Vercel dashboard)
- ✅ API endpoints in `/api` folder
- ✅ Supabase edge functions

---

## 🎨 Working with Antigravity

You can now work entirely with Antigravity:

1. **Ask Antigravity to make changes**
   - "Add a new feature to..."
   - "Fix the bug in..."
   - "Update the styling of..."

2. **Antigravity edits your local files**
   - Changes are made directly to your codebase

3. **Review and test locally**
   ```bash
   npm run dev
   ```

4. **Commit and push when ready**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

5. **Automatic deployment!** ✨

---

## 🚫 No More Lovable!

You don't need Lovable anymore because:

- ✅ You have full control of your codebase
- ✅ You can work directly with Antigravity
- ✅ Changes deploy automatically to production
- ✅ No manual export/import needed
- ✅ Complete version control with Git

---

## 📝 Best Practices

1. **Test locally before pushing**
   ```bash
   npm run dev
   ```

2. **Use meaningful commit messages**
   - ✅ "Add AI invoice scanner feature"
   - ✅ "Fix checkout page payment bug"
   - ❌ "update" or "changes"

3. **Check deployment status**
   - Always verify deployment succeeded
   - Monitor GitHub Actions

4. **Keep dependencies updated**
   ```bash
   npm update
   ```

5. **Use environment variables**
   - Never commit API keys or secrets
   - Add them in Vercel dashboard

---

## 🎉 You're All Set!

Once you complete the one-time setup above, you'll have a fully automated deployment pipeline:

**Antigravity → Git → GitHub → Vercel → Live Site**

No manual steps, no Lovable, just pure automation! 🚀
