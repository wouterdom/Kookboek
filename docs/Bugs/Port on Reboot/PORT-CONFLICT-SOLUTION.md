# Port 8443 Solution - Final Configuration

**Date:** October 27, 2025
**Issue:** Tailscale and Kong both need port 8443, causing conflicts
**Status:** ✅ Resolved

---

## The Problem

Both services need port 8443:
- **Kong** (Supabase): Needs to bind to `0.0.0.0:8443` for HTTPS API access
- **Tailscale proxy**: Wants to use port 8443 for external HTTPS access

Additionally, using HTTPS backends (like `https://127.0.0.1:8443`) in Tailscale serve causes 502 Bad Gateway errors.

---

## The Solution

**Use port 8443 for Tailscale proxy with HTTP backend:**

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS (Tailscale encryption)
       ▼
┌────────────────────────────────────────┐
│ Tailscale Proxy (port 8443)           │
│ wotis.tail878d82.ts.net:8443          │
└──────┬─────────────────────────────────┘
       │ HTTP (through Tailscale tunnel)
       ▼
┌────────────────────────────────────────┐
│ Kong HTTP Gateway (port 8000)          │
│ 127.0.0.1:8000                         │
└──────┬─────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ Supabase Services                      │
└────────────────────────────────────────┘
```

**Key Points:**
- Tailscale provides HTTPS encryption on port 8443
- Backend connection uses HTTP on port 8000 (NOT HTTPS!)
- Kong's HTTPS port (8443) is not used
- This avoids port conflicts and 502 errors

---

## Implementation Steps

### 1. Configure Tailscale Proxy on Port 8443

```bash
ssh wouter@192.168.1.63

# Configure Tailscale proxy with HTTP backend
sudo tailscale serve --https=8443 --bg http://127.0.0.1:8000

# Verify configuration
tailscale serve status
```

Expected output:
```
https://wotis.tail878d82.ts.net (tailnet only)
|-- / proxy http://127.0.0.1:3000

https://wotis.tail878d82.ts.net:8444 (tailnet only)
|-- / proxy http://127.0.0.1:8222

https://wotis.tail878d82.ts.net:8443 (tailnet only)
|-- / proxy http://127.0.0.1:8000           ← Supabase on 8443 with HTTP backend!
```

### 2. Update Kookboek App Environment Variables

#### Via Coolify Web Interface:

1. Open Coolify: http://192.168.1.63:7000
2. Navigate to your Kookboek application
3. Go to **Environment Variables** section
4. Find `NEXT_PUBLIC_SUPABASE_URL`
5. Set to: `https://wotis.tail878d82.ts.net:8443`
6. Save and **redeploy** the application

#### Via Coolify CLI (if available):

```bash
# Update environment variable
coolify env:set NEXT_PUBLIC_SUPABASE_URL="https://wotis.tail878d82.ts.net:8443"

# Redeploy
coolify deploy
```

### 3. Verify Kong Container is Running

```bash
ssh wouter@192.168.1.63

# Check Kong status
docker ps --filter 'name=supabase-kong'

# Should show "Up" and "healthy"
```

### 4. Test the Configuration

```bash
# Test Tailscale proxy (should return HTTP 401)
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/

# Test app loads
curl -I https://wotis.tail878d82.ts.net

# Open in browser and verify recipes load
```

---

## Updated Automated Startup Script

The automated startup script should use port 8443 with HTTP backend:

```bash
# Edit the script on the server
ssh wouter@192.168.1.63
sudo nano /usr/local/bin/tailscale-startup.sh
```

Ensure it has:
```bash
# CORRECT - Port 8443 with HTTP backend
tailscale serve --bg --https=8443 http://127.0.0.1:8000
```

Then restart the service:
```bash
sudo systemctl restart tailscale-startup.service
```

---

## Why This Works

1. **No Port Conflict**: Tailscale binds to 8443 externally, Kong uses port 8000 internally
2. **Trusted Certificates**: Tailscale provides trusted HTTPS certificates on 8443
3. **No SSL Errors**: Browser trusts Tailscale's certificates
4. **Secure Connection**: All traffic encrypted through Tailscale tunnel
5. **No 502 Errors**: HTTP backend avoids SSL/TLS issues with self-signed certificates
6. **Compatible with Node.js fetch()**: Port 8443 works with all HTTP clients

---

## Environment Variables Summary

After this change, the Kookboek app should have:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wotis.tail878d82.ts.net:8443
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

---

## Port Allocation Reference

| Port | Service | Access | Purpose |
|------|---------|--------|---------|
| **443** | Kookboek App (Tailscale) | https://wotis.tail878d82.ts.net | Main app |
| **3000** | Kookboek App (Direct) | http://127.0.0.1:3000 | Coolify backend |
| **8000** | Kong HTTP | http://127.0.0.1:8000 | Supabase gateway (internal) |
| **8443** | Supabase API (Tailscale) | https://wotis.tail878d82.ts.net:8443 | **App uses this!** ✅ |
| **8444** | Vaultwarden (Tailscale) | https://wotis.tail878d82.ts.net:8444 | Password manager |

---

## Critical Rules

1. **ALWAYS use HTTP backend** in Tailscale serve (never HTTPS)
2. **Port 8443 with HTTP backend** is the correct configuration
3. **NEVER use port 9443** - it doesn't work with Node.js fetch()
4. **Backend must be** `http://127.0.0.1:8000` (NOT https://127.0.0.1:8443)

---

## Troubleshooting

### App still shows "Geen recepten gevonden"

1. Check Tailscale config:
   ```bash
   ssh wouter@192.168.1.63 "tailscale serve status"
   # Should show port 8443 proxying to http://127.0.0.1:8000
   ```

2. Check app environment:
   ```bash
   ssh wouter@192.168.1.63 "docker exec uskkk4kks8o04g8oo04ows4s-173052248178 printenv NEXT_PUBLIC_SUPABASE_URL"
   # Should show: https://wotis.tail878d82.ts.net:8443
   ```

3. Test API endpoint:
   ```bash
   curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
   # Should return HTTP 401
   ```

4. If environment is wrong, update in Coolify and redeploy

### 502 Bad Gateway Error

This happens when using HTTPS backend. Fix:

```bash
# Remove incorrect HTTPS config
ssh wouter@192.168.1.63 "sudo tailscale serve --https=8443 off"

# Add correct HTTP config
ssh wouter@192.168.1.63 "sudo tailscale serve --https=8443 --bg http://127.0.0.1:8000"
```

### Kong container won't start

If Kong needs port 8443 for some reason:

```bash
# Check what's using port 8443
ssh wouter@192.168.1.63 "sudo lsof -i :8443"

# This configuration doesn't bind Kong to 8443, so this shouldn't be an issue
```

---

## Related Documentation

- See SUPABASE-TAILSCALE-COMPLETE-GUIDE.md for complete troubleshooting guide
- [Automated Startup Setup](AUTOMATED-STARTUP-SETUP.md)

---

**This is the final, stable solution that should work after every server reboot.**
