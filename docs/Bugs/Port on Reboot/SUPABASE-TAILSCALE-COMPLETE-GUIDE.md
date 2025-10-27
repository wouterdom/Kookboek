# Complete Supabase + Tailscale Configuration Guide

**Last Updated:** October 27, 2025 - **CRITICAL FIX APPLIED**
**Status:** ✅ VERIFIED, TESTED, AND FIXED

---

## 🚨 CRITICAL UPDATE (Oct 27, 2025)

**Root Cause Found and Fixed:**
- Kong's `docker-compose.yml` was binding to **both** ports 8000 AND 8443
- This caused Kong to fail on reboot when Tailscale claimed port 8443 first
- **Fix Applied:** Kong now only binds to port 8000 (HTTP)
- Tailscale exclusively uses port 8443 for HTTPS
- **Result:** Services start successfully after reboot, no more "empty database"

See [Kong Port Binding Issue](#️-critical-kong-port-binding-issue-updated-oct-27-2025) section for details.

---

## 🎯 Quick Summary

**THE CORRECT CONFIGURATION:**
- **Supabase URL**: `https://wotis.tail878d82.ts.net:8443`
- **Tailscale Proxy**: Port 8443 → HTTP backend `http://127.0.0.1:8000`
- **Kong Container**: Binds to port 8000 ONLY (NOT 8443!)

---

## 📋 Table of Contents

1. [Understanding the Architecture](#understanding-the-architecture)
2. [Why Port 8443 (Not 9443)](#why-port-8443-not-9443)
3. [Correct Configuration](#correct-configuration)
4. [After Server Reboot](#after-server-reboot)
5. [Troubleshooting](#troubleshooting)
6. [Complete Recovery Steps](#complete-recovery-steps)

---

## Understanding the Architecture

### Traffic Flow

```
User/Browser
    ↓ HTTPS
Tailscale VPN (wotis.tail878d82.ts.net:8443)
    ↓ HTTP (through Tailscale tunnel - encrypted)
Kong Gateway (127.0.0.1:8000 HTTP)
    ↓
Supabase Services (Database, Auth, Storage, etc.)
```

### Port Allocation

| Port | Service | Purpose | Access | Notes |
|------|---------|---------|--------|-------|
| **443** | Tailscale → Kookboek | Main app | Tailscale HTTPS | Proxies to :3000 |
| **3000** | Kookboek App | Docker internal | Local only | Coolify container |
| **8000** | Kong HTTP | API gateway | Local only | **Kong binds here** |
| **8443** | Tailscale → Kong | Supabase API | Tailscale HTTPS | Proxies to :8000 |
| **8444** | Tailscale → Vaultwarden | Password manager | Tailscale HTTPS | Proxies to :8222 |

**Critical Note:** Kong does NOT bind to port 8443 anymore. Only Tailscale uses port 8443.

---

## Why Port 8443 (Not 9443)

### The Investigation

On October 27, 2025, we discovered that **Node.js fetch() fails with port 9443 but works with port 8443**.

**Testing Results:**
```bash
# Port 9443 - FAILS
fetch("https://wotis.tail878d82.ts.net:9443/rest/v1/")
→ Status: 404 (never reaches Kong)

# Port 8443 - WORKS
fetch("https://wotis.tail878d82.ts.net:8443/rest/v1/")
→ Status: 200 (reaches Kong successfully)
```

### Why Port 9443 Was Attempted

Port 9443 was tried because of a **misunderstanding about port conflicts**:
- Kong container binds to `0.0.0.0:8443` for direct HTTPS access
- We thought Tailscale `serve` on port 8443 would conflict
- **This was incorrect!**

### ⚠️ CRITICAL: Kong Port Binding Issue (UPDATED Oct 27, 2025)

### The Real Problem

**IMPORTANT UPDATE:** The initial understanding was incorrect. Kong and Tailscale **CANNOT** both bind to port 8443 on the same network interface.

**Root Cause:**
- Kong's `docker-compose.yml` was configured to bind to **both** port 8000 AND port 8443
- When the server boots, Tailscale starts first and claims port 8443
- Kong tries to start and **FAILS** because port 8443 is already in use
- This causes the "empty database" issue because Kong (the API gateway) isn't running

### The Permanent Fix

Kong should **ONLY** bind to port 8000 (HTTP). Tailscale handles all HTTPS traffic on port 8443.

**Architecture:**
```
Browser → Tailscale (port 8443 HTTPS) → Kong (port 8000 HTTP) → Supabase
```

**Fixed docker-compose.yml:**
```yaml
kong:
  container_name: supabase-kong
  image: kong:2.8.1
  restart: unless-stopped
  ports:
    - ${KONG_HTTP_PORT}:8000/tcp
    # - ${KONG_HTTPS_PORT}:8443/tcp  # Disabled: Tailscale handles HTTPS on 8443
```

**Location:** `/home/wouter/supabase/docker/docker-compose.yml`

**Why This Works:**
1. Kong binds only to port 8000 (HTTP) - no conflict
2. Tailscale serves HTTPS on port 8443, proxying to Kong's HTTP port 8000
3. Tailscale provides trusted SSL certificates (no self-signed cert issues)
4. After reboot, both services start successfully

---

## Correct Configuration

### Environment Variables (in Coolify)

**Note:** See `.env.local` for actual API keys. Never commit credentials to git.

Required variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://wotis.tail878d82.ts.net:8443
NEXT_PUBLIC_SUPABASE_ANON_KEY=[see .env.local]
SUPABASE_SERVICE_ROLE_KEY=[see .env.local]
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Tailscale Configuration

```bash
# SSH to server
ssh wouter@192.168.1.63

# Configure Tailscale proxies
sudo tailscale serve --bg --https 443 http://127.0.0.1:3000
sudo tailscale serve --bg --https 8443 http://127.0.0.1:8000
sudo tailscale serve --bg --https 8444 http://127.0.0.1:8222

# Verify
tailscale serve status
```

**Expected Output:**
```
https://wotis.tail878d82.ts.net (tailnet only)
|-- / proxy http://127.0.0.1:3000

https://wotis.tail878d82.ts.net:8443 (tailnet only)
|-- / proxy http://127.0.0.1:8000

https://wotis.tail878d82.ts.net:8444 (tailnet only)
|-- / proxy http://127.0.0.1:8222
```

---

## After Server Reboot

### Automated Startup

The system has an automated startup script at `/usr/local/bin/tailscale-startup.sh` that runs on boot.

**Check if it ran successfully:**
```bash
ssh wouter@192.168.1.63 "sudo systemctl status tailscale-startup.service"
```

**Check logs:**
```bash
ssh wouter@192.168.1.63 "sudo tail -50 /var/log/tailscale-startup.log"
```

### Manual Recovery (If Needed)

If the automated script fails or uses wrong configuration:

```bash
# SSH to server
ssh wouter@192.168.1.63

# 1. Check current Tailscale configuration
tailscale serve status

# 2. Check Kong container
docker ps | grep supabase-kong
# Should show "Up" and "healthy"

# 3. If Kong isn't running, start it
docker start supabase-kong

# 4. Reset and reconfigure Tailscale
sudo tailscale serve reset
sudo tailscale serve --bg --https 443 http://127.0.0.1:3000
sudo tailscale serve --bg --https 8443 http://127.0.0.1:8000
sudo tailscale serve --bg --https 8444 http://127.0.0.1:8222

# 5. Verify
tailscale serve status

# 6. Test API endpoint
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
# Should return: {"message":"No API key found in request"}
```

### Update Startup Script (If Needed)

If the startup script is still using port 9443:

```bash
# Copy the fixed script to server
scp docs/scripts/tailscale-startup-FIXED.sh wouter@192.168.1.63:~/

# Install it
ssh wouter@192.168.1.63
sudo mv ~/tailscale-startup-FIXED.sh /usr/local/bin/tailscale-startup.sh
sudo chmod +x /usr/local/bin/tailscale-startup.sh

# Test it
sudo /usr/local/bin/tailscale-startup.sh

# Enable for next boot
sudo systemctl enable tailscale-startup.service
```

---

## Troubleshooting

### Problem: App shows "Geen recepten gevonden" (No recipes)

**Symptom:** App loads but no recipes appear

**Diagnosis:**
```bash
# Test API endpoint
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/

# Expected: HTTP 401 "No API key found"
# Problem: HTTP 502 Bad Gateway or connection refused
```

**Causes & Fixes:**

1. **Wrong Tailscale backend (HTTPS instead of HTTP)**
   ```bash
   # Check configuration
   ssh wouter@192.168.1.63 "tailscale serve status"

   # Should show: http://127.0.0.1:8000 (NOT https://127.0.0.1:8443)

   # Fix:
   ssh wouter@192.168.1.63 "sudo tailscale serve --https=8443 off"
   ssh wouter@192.168.1.63 "sudo tailscale serve --bg --https=8443 http://127.0.0.1:8000"
   ```

2. **Wrong port (9443 instead of 8443)**
   ```bash
   # Check Coolify env vars
   # Must be: NEXT_PUBLIC_SUPABASE_URL=https://wotis.tail878d82.ts.net:8443

   # If wrong, update in Coolify and redeploy
   ```

3. **Kong container not running**
   ```bash
   ssh wouter@192.168.1.63 "docker ps | grep supabase-kong"
   # If not running:
   ssh wouter@192.168.1.63 "docker start supabase-kong"

   # If start fails with "address already in use":
   # Kong is trying to bind to port 8443, which conflicts with Tailscale
   # See "Kong Port Binding Issue" section above for permanent fix
   ```

### Problem: Kong fails to start after reboot (address already in use)

**Symptom:**
```bash
Error: failed to start containers: supabase-kong
Error response from daemon: failed to set up container networking:
driver failed programming external connectivity on endpoint supabase-kong:
failed to bind host port for 0.0.0.0:8443:172.18.0.11:8443/tcp: address already in use
```

**Diagnosis:**
```bash
# Check what's using port 8443
ssh wouter@192.168.1.63 "sudo lsof -i :8443"

# Should show: tailscale is using port 8443
```

**Root Cause:** Kong's docker-compose.yml is configured to bind to port 8443, which conflicts with Tailscale.

**Permanent Fix:**
```bash
# 1. SSH to server
ssh wouter@192.168.1.63

# 2. Backup docker-compose.yml
cp /home/wouter/supabase/docker/docker-compose.yml /home/wouter/supabase/docker/docker-compose.yml.backup

# 3. Edit the file
sudo nano /home/wouter/supabase/docker/docker-compose.yml

# 4. Find the kong section and comment out the 8443 port:
#   ports:
#     - ${KONG_HTTP_PORT}:8000/tcp
#     # - ${KONG_HTTPS_PORT}:8443/tcp  # Disabled: Tailscale handles HTTPS on 8443

# 5. Save and exit (Ctrl+X, Y, Enter)

# 6. Recreate Kong container
cd /home/wouter/supabase/docker
docker-compose rm -f kong
docker-compose up -d kong

# 7. Verify Kong is running
docker ps | grep kong
# Should show "Up" and "healthy"

# 8. Test API
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
# Should return: {"message":"No API key found in request"}
```

**Why This Works:**
- Kong only needs port 8000 for HTTP (internal)
- Tailscale handles HTTPS on port 8443 (external)
- No port conflict = services start successfully after reboot

### Problem: POST requests fail (404 errors)

**Symptom:** Can view recipes but cannot create/update/delete

**Diagnosis:**
```bash
# Check app logs
ssh wouter@192.168.1.63 'docker logs --tail 50 $(docker ps -q --filter "name=uskkk4")'

# Look for: "Error inserting recipe: { message: '404 page not found\n' }"
```

**Cause:** Wrong port (9443) or Tailscale not accepting Node.js fetch() requests

**Fix:**
1. Verify Tailscale is on port **8443** (not 9443)
2. Update Coolify environment variable to port 8443
3. Redeploy app

### Problem: After reboot, different port configuration

**Symptom:** Startup script configures different port than expected

**Fix:**
1. Update `/usr/local/bin/tailscale-startup.sh` with corrected version
2. Test manually: `sudo /usr/local/bin/tailscale-startup.sh`
3. Verify configuration persists after reboot

---

## Complete Recovery Steps

If everything is broken after a reboot, follow these steps in order:

### Step 1: Check Services
```bash
ssh wouter@192.168.1.63

# Check Tailscale
tailscale status
tailscale serve status

# Check Docker
docker ps

# Check Kong specifically
docker ps | grep supabase-kong
```

### Step 2: Start Missing Services
```bash
# If Kong isn't running
docker start supabase-kong

# Wait for it to be healthy (check with 'docker ps')
```

### Step 3: Configure Tailscale
```bash
# Reset and reconfigure
sudo tailscale serve reset
sudo tailscale serve --bg --https 443 http://127.0.0.1:3000
sudo tailscale serve --bg --https 8443 http://127.0.0.1:8000
sudo tailscale serve --bg --https 8444 http://127.0.0.1:8222
```

### Step 4: Verify Configuration
```bash
# Check Tailscale
tailscale serve status

# Test API endpoint
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
# Should return HTTP 401

# Test Kong health
docker ps | grep kong
# Should show "healthy"
```

### Step 5: Test App
```bash
# From your PC/laptop
curl https://wotis.tail878d82.ts.net
# App should load

curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
# Should return HTTP 401
```

### Step 6: Check Coolify Environment
1. Open http://192.168.1.63:7000
2. Navigate to Kookboek app → Environment Variables
3. Verify: `NEXT_PUBLIC_SUPABASE_URL=https://wotis.tail878d82.ts.net:8443`
4. If wrong, fix and redeploy

---

## Testing Checklist

After configuration, test these scenarios:

### ✅ Basic Connectivity
```bash
- [ ] App loads: curl https://wotis.tail878d82.ts.net
- [ ] API responds: curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
- [ ] Kong is healthy: docker ps | grep kong
- [ ] Tailscale config correct: tailscale serve status
```

### ✅ Data Operations
```bash
- [ ] View recipes (GET requests work)
- [ ] Create new recipe (POST requests work)
- [ ] Update recipe (PATCH requests work)
- [ ] Delete recipe (DELETE requests work)
- [ ] Upload image (Storage POST works)
```

### ✅ After Reboot
```bash
- [ ] Startup script ran: systemctl status tailscale-startup.service
- [ ] Correct port configured: tailscale serve status shows port 8443
- [ ] Kong started automatically: docker ps | grep kong
- [ ] App works immediately without manual intervention
```

---

## Key Takeaways

### ✅ DO:
- **Always use port 8443** for Supabase API through Tailscale
- **Always use HTTP backend** (`http://127.0.0.1:8000`) for Tailscale proxies
- Test after every server reboot to verify automated startup
- Check Kong container health before testing app

### ❌ DON'T:
- Don't use port 9443 (incompatible with Node.js fetch())
- Don't use HTTPS backend for Tailscale (causes 502 errors)
- Don't assume Kong and Tailscale conflict on port 8443 (they don't!)
- Don't forget to update Coolify environment variables after changes

---

## Reference Commands

### Quick Diagnostics
```bash
# One-line health check
ssh wouter@192.168.1.63 'echo "Tailscale:" && tailscale serve status && echo -e "\nKong:" && docker ps | grep kong && echo -e "\nAPI Test:" && curl -k -I https://wotis.tail878d82.ts.net:8443/rest/v1/ 2>&1 | head -1'
```

### Quick Fix
```bash
# One-command fix (use if everything is broken)
ssh wouter@192.168.1.63 'docker start supabase-kong && sleep 5 && sudo tailscale serve reset && sudo tailscale serve --bg --https 443 http://127.0.0.1:3000 && sudo tailscale serve --bg --https 8443 http://127.0.0.1:8000 && sudo tailscale serve --bg --https 8444 http://127.0.0.1:8222 && tailscale serve status'
```

---

## Related Documentation

- [Coolify Deployment](../Server%20setup/4-Backend-Hosting/)
- [Supabase Setup](../Server%20setup/4-Backend-Hosting/)
- [Server Reboot Recovery](../Server%20setup/reboot-procedures.md)

---

**Last Verified:** October 27, 2025
**Verified By:** Complete system test + production bug fix
**Fix Applied:** Kong docker-compose.yml port binding corrected
**Status:** ✅ PRODUCTION READY - REBOOT SAFE

---

## Questions or Issues?

1. Check logs: `sudo tail -100 /var/log/tailscale-startup.log`
2. Check Kong: `docker logs --tail 50 supabase-kong`
3. Check app: `docker logs --tail 50 $(docker ps -q --filter "name=uskkk4")`
4. Verify Tailscale network: `tailscale status`
5. Test API manually: `curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/`
