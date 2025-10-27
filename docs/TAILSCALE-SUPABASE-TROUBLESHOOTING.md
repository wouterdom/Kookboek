# Tailscale + Supabase Configuration Guide

**Last Updated:** October 27, 2025
**Status:** ✅ Resolved and Documented

---

## Overview

This document describes the correct Tailscale proxy configuration for accessing the Kookboek app's Supabase backend through Tailscale VPN. It also documents common issues and their fixes.

---

## Critical Configuration

### ✅ Correct Tailscale Proxy Setup

The Kookboek app requires Supabase API access through Tailscale. The **correct** configuration is:

```bash
# On the server (192.168.1.63)
sudo tailscale serve --https=8443 --bg http://127.0.0.1:8000
```

### Complete Tailscale Configuration

```bash
# View current configuration
tailscale serve status

# Expected output:
https://wotis.tail878d82.ts.net (tailnet only)
|-- / proxy http://127.0.0.1:3000           # Kookboek app

https://wotis.tail878d82.ts.net:8443 (tailnet only)
|-- / proxy http://127.0.0.1:8000           # Supabase API ✅

https://wotis.tail878d82.ts.net:8444 (tailnet only)
|-- / proxy http://127.0.0.1:8222           # Vaultwarden
```

---

## Why This Configuration?

### Traffic Flow

```
Browser/Client
    ↓ HTTPS
Tailscale Proxy (wotis.tail878d82.ts.net:8443)
    ↓ HTTP (encrypted by Tailscale tunnel)
Kong Gateway (127.0.0.1:8000)
    ↓
Supabase Services
```

### Key Points

1. **Tailscale provides HTTPS encryption** - External clients connect via HTTPS
2. **Backend uses HTTP** - Kong's HTTP port (8000) doesn't require certificates
3. **No SSL validation issues** - Avoids problems with self-signed certificates
4. **Secure tunnel** - Tailscale encrypts all traffic through the VPN tunnel

---

## Common Issues & Solutions

### Issue 1: 502 Bad Gateway Error

**Symptoms:**
- App loads but shows "Geen recepten gevonden" (No recipes found)
- Browser console errors: `Failed to fetch`
- Testing API: `curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/` returns **HTTP 502**

**Root Cause:**
Tailscale proxy is configured with **HTTPS backend** instead of HTTP:
```bash
# ❌ INCORRECT - Causes 502 Bad Gateway
https://wotis.tail878d82.ts.net:8443 → https://127.0.0.1:8443
```

This fails because Kong's self-signed SSL certificate cannot be validated by Tailscale.

**Fix:**
```bash
# Remove incorrect configuration
ssh wouter@192.168.1.63 "sudo tailscale serve --https=8443 off"

# Apply correct configuration (HTTP backend)
ssh wouter@192.168.1.63 "sudo tailscale serve --https=8443 --bg http://127.0.0.1:8000"

# Verify
ssh wouter@192.168.1.63 "tailscale serve status"
```

**Verification:**
```bash
# Should return HTTP 401 (correct - no API key provided)
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/

# App should now load recipes
```

---

### Issue 2: After Server Reboot

**Problem:**
After server reboot, Tailscale may auto-configure and potentially cause port conflicts or use wrong backend configuration.

**Solution:**
Always verify Tailscale configuration after reboot:

```bash
# 1. SSH to server
ssh wouter@192.168.1.63

# 2. Check Tailscale configuration
tailscale serve status

# 3. Verify Supabase API backend is HTTP (not HTTPS)
# Should show: https://wotis.tail878d82.ts.net:8443 → http://127.0.0.1:8000

# 4. If incorrect, fix it:
sudo tailscale serve --https=8443 off
sudo tailscale serve --https=8443 --bg http://127.0.0.1:8000

# 5. Test from your PC
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
# Should return HTTP 401 (not 502)
```

---

### Issue 3: Kong Container Not Running

**Symptoms:**
- Supabase API not responding
- Kong container shows as `Exited` or not running

**Check:**
```bash
ssh wouter@192.168.1.63 "docker ps --filter 'name=supabase-kong'"
```

**Fix:**
```bash
# Check what's using port 8443
ssh wouter@192.168.1.63 "sudo lsof -i :8443"

# If Tailscale is blocking it, reset and restore correctly
ssh wouter@192.168.1.63 "sudo tailscale serve reset"

# Start Kong
ssh wouter@192.168.1.63 "docker start supabase-kong"

# Restore Tailscale configurations
ssh wouter@192.168.1.63 "sudo tailscale serve --bg --https 443 http://127.0.0.1:3000"
ssh wouter@192.168.1.63 "sudo tailscale serve --bg --https 8443 http://127.0.0.1:8000"
ssh wouter@192.168.1.63 "sudo tailscale serve --bg --https 8444 http://127.0.0.1:8222"
```

---

## Quick Diagnostic Checklist

When the app isn't loading recipes:

1. **Check app loads:**
   ```bash
   curl -I https://wotis.tail878d82.ts.net
   # Should return HTTP 200
   ```

2. **Check Supabase API:**
   ```bash
   curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
   # Should return HTTP 401 (not 502!)
   ```

3. **Check Tailscale config:**
   ```bash
   ssh wouter@192.168.1.63 "tailscale serve status"
   # Port 8443 should proxy to http://127.0.0.1:8000
   ```

4. **Check Kong container:**
   ```bash
   ssh wouter@192.168.1.63 "docker ps | grep supabase-kong"
   # Should show "Up" and "healthy"
   ```

5. **Check from server itself:**
   ```bash
   ssh wouter@192.168.1.63 "curl -k -I https://127.0.0.1:8443/rest/v1/"
   # Should return HTTP 401
   ```

---

## Environment Variables

The app uses these Supabase connection details:

```env
# In .env.local (on Coolify)
NEXT_PUBLIC_SUPABASE_URL=https://wotis.tail878d82.ts.net:8443
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

**Important:** The URL must use **port 8443** through Tailscale, not port 8000 directly.

---

## Port Reference

| Port | Service | Access | Backend |
|------|---------|--------|---------|
| **443** | Kookboek App | https://wotis.tail878d82.ts.net | http://127.0.0.1:3000 |
| **8000** | Supabase Kong (HTTP) | Direct LAN only | - |
| **8443** | Supabase API (via Tailscale) | https://wotis.tail878d82.ts.net:8443 | http://127.0.0.1:8000 ✅ |
| **8444** | Vaultwarden | https://wotis.tail878d82.ts.net:8444 | http://127.0.0.1:8222 |

---

## Best Practices

### ✅ DO:
- Always use **HTTP backends** for Tailscale serve proxies
- Test after every server reboot
- Verify configuration with `tailscale serve status`
- Use `curl` to test API endpoints before checking the app

### ❌ DON'T:
- Don't use HTTPS backends: `https://127.0.0.1:8443` ❌
- Don't assume Tailscale config persists correctly after reboot
- Don't use `tailscale serve reset` without immediately restoring configs

---

## Related Documentation

- [Server Setup Documentation](../../Server%20setup/reboot-supabase-fix-oct27.md)
- [Port Management](../../Server%20setup/7-Port-Management/PORT-MANAGEMENT.md)
- [Tailscale Proxy Management](../../Server%20setup/7-Port-Management/TAILSCALE-PROXY-MANAGEMENT.md)

---

## Automation

To automatically ensure correct configuration after reboot, see the automated startup script in `/docs/scripts/tailscale-startup.sh` (if implemented).

---

**Questions or Issues?**
- Check server logs: `ssh wouter@192.168.1.63 "docker logs supabase-kong"`
- Verify Tailscale status: `ssh wouter@192.168.1.63 "tailscale status"`
- Test locally first: `ssh wouter@192.168.1.63 "curl -k https://127.0.0.1:8443/rest/v1/"`
