# Port 8443 Conflict - Final Solution

**Date:** October 27, 2025
**Issue:** Tailscale and Kong both need port 8443, causing conflicts
**Status:** ✅ Resolved

---

## The Problem

Both services need port 8443:
- **Kong** (Supabase): Needs to bind to `0.0.0.0:8443` for HTTPS API access
- **Tailscale proxy**: Cannot proxy to Kong's self-signed HTTPS certificate without errors

When Tailscale tries to proxy `https://wotis.tail878d82.ts.net:8443 → http://127.0.0.1:8000`, and Kong also tries to bind to port 8443, they conflict and Kong fails to start.

---

## The Solution

**Use port 9443 for Tailscale proxy instead of 8443:**

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS (Tailscale encryption)
       ▼
┌────────────────────────────────────────┐
│ Tailscale Proxy (port 9443)           │
│ wotis.tail878d82.ts.net:9443          │
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

┌────────────────────────────────────────┐
│ Kong HTTPS (port 8443) - NOT USED      │
│ 0.0.0.0:8443 (available for future)    │
└────────────────────────────────────────┘
```

---

## Implementation Steps

### 1. Configure Tailscale Proxy on Port 9443

```bash
ssh wouter@192.168.1.63

# Remove old 8443 proxy if it exists
sudo tailscale serve --https=8443 off

# Create proxy on port 9443 instead
sudo tailscale serve --https=9443 --bg http://127.0.0.1:8000

# Verify configuration
tailscale serve status
```

Expected output:
```
https://wotis.tail878d82.ts.net (tailnet only)
|-- / proxy http://127.0.0.1:3000

https://wotis.tail878d82.ts.net:8444 (tailnet only)
|-- / proxy http://127.0.0.1:8222

https://wotis.tail878d82.ts.net:9443 (tailnet only)
|-- / proxy http://127.0.0.1:8000           ← Supabase on 9443!
```

### 2. Update Kookboek App Environment Variables

#### Via Coolify Web Interface:

1. Open Coolify: http://192.168.1.63:7000
2. Navigate to your Kookboek application
3. Go to **Environment Variables** section
4. Find `NEXT_PUBLIC_SUPABASE_URL`
5. Change from: `https://wotis.tail878d82.ts.net:8443`
6. Change to: `https://wotis.tail878d82.ts.net:9443`
7. Save and **redeploy** the application

#### Via Coolify CLI (if available):

```bash
# Update environment variable
coolify env:set NEXT_PUBLIC_SUPABASE_URL="https://wotis.tail878d82.ts.net:9443"

# Redeploy
coolify deploy
```

### 3. Verify Kong Container is Running

```bash
ssh wouter@192.168.1.63

# Check Kong status
docker ps --filter 'name=supabase-kong'

# Should show "Up" and "healthy"
# Ports should include: 0.0.0.0:8443->8443/tcp
```

### 4. Test the Configuration

```bash
# Test Tailscale proxy (should return HTTP 401)
curl -k https://wotis.tail878d82.ts.net:9443/rest/v1/

# Test app loads
curl -I https://wotis.tail878d82.ts.net

# Open in browser and verify recipes load
```

---

## Updated Automated Startup Script

The automated startup script needs to be updated to use port 9443:

```bash
# Edit the script on the server
ssh wouter@192.168.1.63
sudo nano /usr/local/bin/tailscale-startup.sh
```

Change the line:
```bash
# OLD
tailscale serve --bg --https=8443 http://127.0.0.1:8000

# NEW
tailscale serve --bg --https=9443 http://127.0.0.1:8000
```

Then restart the service:
```bash
sudo systemctl restart tailscale-startup.service
```

---

## Why This Works

1. **No Port Conflict**: Kong can bind to 8443, Tailscale uses 9443
2. **Trusted Certificates**: Tailscale provides trusted HTTPS certificates on 9443
3. **No SSL Errors**: Browser trusts Tailscale's certificates
4. **Secure Connection**: All traffic encrypted through Tailscale tunnel
5. **Kong Available**: Kong's HTTPS port 8443 remains available for direct LAN access if needed

---

## Environment Variables Summary

After this change, the Kookboek app should have:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wotis.tail878d82.ts.net:9443
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
| **8443** | Kong HTTPS | https://192.168.1.63:8443 | Direct LAN access (not used by app) |
| **8444** | Vaultwarden (Tailscale) | https://wotis.tail878d82.ts.net:8444 | Password manager |
| **9443** | Supabase API (Tailscale) | https://wotis.tail878d82.ts.net:9443 | **App uses this!** ✅ |

---

## Troubleshooting

### App still shows "Geen recepten gevonden"

1. Check Tailscale config:
   ```bash
   ssh wouter@192.168.1.63 "tailscale serve status"
   # Should show port 9443 proxying to http://127.0.0.1:8000
   ```

2. Check app environment:
   ```bash
   ssh wouter@192.168.1.63 "docker exec uskkk4kks8o04g8oo04ows4s-173052248178 printenv NEXT_PUBLIC_SUPABASE_URL"
   # Should show: https://wotis.tail878d82.ts.net:9443
   ```

3. Test API endpoint:
   ```bash
   curl -k https://wotis.tail878d82.ts.net:9443/rest/v1/
   # Should return HTTP 401
   ```

4. If environment is wrong, update in Coolify and redeploy

### Kong container won't start

```bash
# Check what's using port 8443
ssh wouter@192.168.1.63 "sudo lsof -i :8443"

# If Tailscale is using it, remove that proxy
ssh wouter@192.168.1.63 "sudo tailscale serve --https=8443 off"

# Start Kong
ssh wouter@192.168.1.63 "docker start supabase-kong"
```

---

## Related Documentation

- [Tailscale Supabase Troubleshooting](TAILSCALE-SUPABASE-TROUBLESHOOTING.md)
- [Automated Startup Setup](AUTOMATED-STARTUP-SETUP.md)

---

**This is the final, stable solution that should work after every server reboot.**
