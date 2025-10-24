# Kookboek - Coolify Deployment Guide

## Overview
This guide walks you through deploying your Kookboek recipe app to Coolify on your self-hosted server.

**Server**: 192.168.1.63 (wouter)
**Time**: 15-30 minutes
**Difficulty**: Beginner-friendly

---

## Prerequisites

- ✅ Coolify running on your server
- ✅ Supabase running (192.168.1.63:8000)
- ✅ GitHub repository: https://github.com/wouterdom/Kookboek
- ✅ Nginx Proxy Manager configured (optional but recommended)

---

## Part 1: Initial Setup in Coolify (5 minutes)

### Step 1: Select Server Type

1. Open Coolify in your browser
2. You'll see: "Do you want to deploy to Localhost or Remote Server?"
3. **Click: "Localhost"**

**Why Localhost?** Coolify will deploy to the same server where it's running (192.168.1.63).

---

### Step 2: Create New Project

1. Click **"+ New Project"** or **"Create Project"**
2. **Project Name**: `kookboek` (or `Recipe Book`)
3. **Description** (optional): `Family recipe book application`
4. Click **"Create"**

---

### Step 3: Add New Resource

1. Inside your `kookboek` project, click **"+ New"** or **"Add Resource"**
2. Select **"Application"**
3. Choose source type:

**Option A: Public Repository (Easiest)**
- Select **"Public Repository"**
- **Git Repository URL**: `https://github.com/wouterdom/Kookboek`
- **Branch**: `main`
- Click **"Continue"**

**Option B: GitHub App (If you've connected GitHub)**
- Select **"GitHub"**
- Choose repository: `wouterdom/Kookboek`
- **Branch**: `main`
- Click **"Continue"**

---

## Part 2: Configure Build Settings (5 minutes)

### Step 4: Build Configuration

Coolify should auto-detect Next.js. Verify these settings:

**Build Pack**:
- Select **"Nixpacks"** (recommended) or **"Dockerfile"** if you have one

**Port Configuration**:
- **Port**: `3000` (Next.js default)

**Build Commands** (should be auto-detected):
- **Install Command**: `npm install`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

**If not auto-detected, add them manually in the "Build" section.**

---

## Part 3: Environment Variables (10 minutes)

### Step 5: Add Environment Variables

Click on **"Environment Variables"** or **"Secrets"** tab.

Add each variable one by one:

#### Supabase Configuration

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://YOUR_SERVER_IP:8000` (e.g., `http://192.168.1.63:8000`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Get from your Supabase instance (JWT with role "anon") |
| `SUPABASE_SERVICE_ROLE_KEY` | Get from your Supabase instance (JWT with role "service_role") |
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@YOUR_SERVER_IP:5432/postgres` |
| `JWT_SECRET` | Generate with: `openssl rand -base64 32` |

#### AI Configuration

| Variable Name | Value |
|---------------|-------|
| `GOOGLE_AI_API_KEY` | Get from Google AI Studio: https://aistudio.google.com/apikey |

#### App Configuration

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_APP_URL` | `http://192.168.1.63:3000` |

**Note**: You'll update `NEXT_PUBLIC_APP_URL` after deployment when you know the actual URL.

---

## Part 4: Network Configuration (5 minutes)

### Step 6: Configure Domain (Optional but Recommended)

**Option A: Use Assigned Port (Quick Test)**
- Coolify will assign a random port (e.g., `http://192.168.1.63:34567`)
- Good for testing
- Skip to Step 7

**Option B: Use Custom Domain (Recommended)**
1. In Coolify, find **"Domains"** section
2. Add domain: `kookboek.homelab.local`
3. Click **"Add"**

**Note**: We'll configure DNS and reverse proxy after deployment.

---

## Part 5: Deploy! (5-10 minutes)

### Step 7: Start Deployment

1. Review all settings
2. Click **"Deploy"** or **"Start Deployment"**
3. Watch the build logs appear in real-time

**Expected build time**: 3-7 minutes

**Build Process**:
```
→ Cloning repository...
→ Installing dependencies...
→ Building Next.js app...
→ Creating Docker container...
→ Starting application...
✓ Deployment successful!
```

### Step 8: Verify Deployment

Once complete, you should see:
- ✅ Status: **Running**
- ✅ Container: **Healthy**
- 🌐 URL: **http://192.168.1.63:[port]**

Click the URL to test your app!

---

## Part 6: Post-Deployment Setup (10 minutes)

### Step 9: Update App URL

1. Note the assigned port or domain from Coolify
2. Go back to **"Environment Variables"**
3. Update `NEXT_PUBLIC_APP_URL`:
   - If using port: `http://192.168.1.63:34567` (use your actual port)
   - If using domain: `http://kookboek.homelab.local`
4. Click **"Redeploy"** to apply changes

---

### Step 10: Set Up Custom Domain (Recommended)

#### A. Add to Windows Hosts File

1. **Open Notepad as Administrator**:
   - Press Windows key
   - Type: `notepad`
   - Right-click → "Run as administrator"

2. **Open hosts file**:
   - File → Open
   - Navigate: `C:\Windows\System32\drivers\etc`
   - Change filter to "All Files"
   - Open `hosts`

3. **Add this line at the bottom**:
   ```
   192.168.1.63    kookboek.homelab.local
   ```

4. **Save** (Ctrl+S)

5. **Flush DNS cache**:
   ```cmd
   ipconfig /flushdns
   ```

6. **Test**:
   ```cmd
   ping kookboek.homelab.local
   ```
   Should respond with `192.168.1.63`

#### B. Configure Nginx Proxy Manager

1. **Open NPM**: http://npm.homelab.local

2. **Add Proxy Host**:
   - Click **"Hosts"** → **"Proxy Hosts"** → **"Add Proxy Host"**

3. **Details Tab**:
   - **Domain Names**: `kookboek.homelab.local`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `192.168.1.63`
   - **Forward Port**: `[port from Coolify]` (e.g., `34567`)
   - ☑️ **Cache Assets**
   - ☑️ **Block Common Exploits**
   - ☑️ **Websockets Support**

4. **SSL Tab**:
   - **SSL Certificate**: "Request a new SSL Certificate"
   - Select **"Custom"**
   - ☑️ **Use a Self Signed Certificate**
   - ☑️ **Force SSL** (redirects HTTP → HTTPS)
   - ☑️ **HTTP/2 Support**

5. **Click "Save"**

6. **Test**: http://kookboek.homelab.local
   - Click "Advanced" → "Proceed" (SSL warning is normal)
   - Your app should load!

---

### Step 11: Add to Glance Dashboard (Optional)

SSH to your server:
```bash
ssh wouter@192.168.1.63
cd ~/glance
nano glance.yml
```

Add under Admin Panels or create new section:
```yaml
- title: Kookboek
  url: http://kookboek.homelab.local
  icon: si:foodpanda
```

Save and restart:
```bash
docker compose restart
```

---

## Part 7: Enable Auto-Deploy (5 minutes)

### Step 12: Configure GitHub Webhook

1. In Coolify, find **"Webhooks"** section
2. Copy the webhook URL (something like `http://192.168.1.63:8000/webhooks/xxx`)
3. Go to GitHub: https://github.com/wouterdom/Kookboek/settings/hooks
4. Click **"Add webhook"**
5. **Payload URL**: Paste Coolify webhook URL
6. **Content type**: `application/json`
7. **Events**: Select "Just the push event"
8. Click **"Add webhook"**

Now when you push to `main` branch, Coolify will automatically deploy!

---

## Part 8: Tailscale Access (Optional)

### Step 13: Access from Outside Network

If you want to access Kookboek from outside your home network:

**Option A: Via Tailscale IP**
1. Get your server's Tailscale IP: `tailscale ip -4`
2. Access via: `http://[tailscale-ip]:[port]`

**Option B: Via Tailscale Domain**
1. Configure Tailscale MagicDNS
2. Access via: `http://wotis.tailnet-xxx.ts.net:[port]`

---

## Troubleshooting

### Build Fails

**Check build logs**:
- In Coolify, click on your app → "Logs" → "Build Logs"
- Look for errors in red

**Common issues**:
- Missing environment variables → Add them in Step 5
- Node version mismatch → Coolify uses latest Node by default (should work)
- Out of disk space → Clean Docker: `docker system prune -a`

**Fix**:
```bash
ssh wouter@192.168.1.63
# Check disk space
df -h
# Clean Docker if needed
docker system prune -a
```

---

### App Won't Start

**Check runtime logs**:
- In Coolify, click on your app → "Logs" → "Runtime Logs"

**Common issues**:
- Port already in use → Coolify should handle this
- Database connection error → Verify `DATABASE_URL`
- Missing environment variable → Check Step 5

**Fix - Restart app**:
- In Coolify, click **"Restart"**

---

### Can't Access App

**Test 1: Direct IP access**:
```bash
curl http://192.168.1.63:[port]
```
- If this works, issue is with DNS or proxy
- If this fails, issue is with the app itself

**Test 2: Check container status**:
```bash
ssh wouter@192.168.1.63
docker ps | grep kookboek
```
Should show container running.

**Test 3: Check firewall**:
```bash
sudo ufw status
```
Ensure port is allowed.

**Fix - Allow port through firewall**:
```bash
sudo ufw allow [port]/tcp
```

---

### Database Connection Errors

**Verify Supabase is running**:
```bash
ssh wouter@192.168.1.63
docker ps | grep supabase-db
```

**Test database connection**:
```bash
docker exec -it supabase-db psql -U postgres -c "SELECT 1;"
```

**Check if port 5432 is accessible**:
```bash
telnet 192.168.1.63 5432
```

---

### SSL Certificate Warnings

**This is normal!** Self-signed certificates trigger warnings.

**To proceed**:
- **Chrome/Edge**: Click "Advanced" → "Proceed to kookboek.homelab.local (unsafe)"
- **Firefox**: Click "Advanced" → "Accept the Risk and Continue"

**Why it's safe**:
- You created the certificate
- Traffic is encrypted
- Only on your local network
- Not issued by trusted CA (because it's free and local!)

---

## Maintenance

### Update App

**Manual deploy**:
1. Push changes to GitHub
2. In Coolify, click **"Redeploy"**

**Auto-deploy** (if webhook configured):
- Just push to GitHub, Coolify deploys automatically!

### View Logs

**In Coolify**:
- Click your app → "Logs"
- **Build Logs**: See compilation output
- **Runtime Logs**: See application output

**Via SSH**:
```bash
ssh wouter@192.168.1.63
docker logs [container-name] -f
```

### Restart App

**In Coolify**:
- Click **"Restart"**

**Via SSH**:
```bash
docker restart [container-name]
```

### Update Environment Variables

1. In Coolify → "Environment Variables"
2. Edit or add variables
3. Click **"Redeploy"** to apply changes

---

## Success Checklist

After following this guide, verify:

- [ ] App deployed successfully in Coolify
- [ ] Can access via IP:port
- [ ] Environment variables configured
- [ ] Custom domain `kookboek.homelab.local` added to hosts file
- [ ] Nginx Proxy Manager configured with SSL
- [ ] Can access via http://kookboek.homelab.local
- [ ] App connects to Supabase successfully
- [ ] Can create and view recipes
- [ ] GitHub webhook configured (auto-deploy)
- [ ] Added to Glance dashboard (optional)

---

## Quick Reference

### Access URLs

- **App (Port)**: http://192.168.1.63:[coolify-port]
- **App (Domain)**: http://kookboek.homelab.local
- **Coolify Dashboard**: http://192.168.1.63:8000 (or your Coolify URL)
- **Supabase Studio**: http://supabase.homelab.local
- **Nginx Proxy Manager**: http://npm.homelab.local

### SSH Commands

```bash
# Connect to server
ssh wouter@192.168.1.63

# Check running containers
docker ps

# View app logs
docker logs [kookboek-container] -f

# Restart app
docker restart [kookboek-container]

# Check disk space
df -h

# Clean Docker
docker system prune -a
```

### Environment Variables Quick Copy

```bash
NEXT_PUBLIC_SUPABASE_URL=http://YOUR_SERVER_IP:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_SERVER_IP:5432/postgres
JWT_SECRET=your_generated_jwt_secret_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
NEXT_PUBLIC_APP_URL=http://kookboek.homelab.local
```

---

## Next Steps

After successful deployment:

1. **Test all features**:
   - Create a recipe manually
   - Import from URL
   - Upload photos
   - Test Gemini AI extraction

2. **Customize**:
   - Add your family recipes
   - Organize categories
   - Add notes to recipes

3. **Share with family**:
   - Give them the URL
   - They can access on same network
   - Via Tailscale for remote access

4. **Set up backups**:
   - Database already backed up with Supabase
   - Consider backing up uploaded images

---

## Resources

- **Your GitHub Repo**: https://github.com/wouterdom/Kookboek
- **Coolify Docs**: https://coolify.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Server Setup Docs**: `C:\Users\wdom\Downloads\Server setup`

---

## Congratulations! 🎉

You've successfully deployed your Kookboek app to your self-hosted server!

**Access your recipe book at**: http://kookboek.homelab.local

**Enjoy cooking!** 👨‍🍳📖

---

*Last Updated: October 2025*
*Server: 192.168.1.63 (wouter)*
*Guide Version: 1.0*
