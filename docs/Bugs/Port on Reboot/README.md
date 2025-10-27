# Kookboek Server Configuration Documentation

**Last Updated:** October 27, 2025
**Status:** ✅ All systems operational

---

## 📖 Single Source of Truth

For complete Tailscale + Supabase configuration, see:

### **[SUPABASE-TAILSCALE-COMPLETE-GUIDE.md](SUPABASE-TAILSCALE-COMPLETE-GUIDE.md)**

This is the **ONLY** authoritative documentation for server configuration.

---

## Quick Reference

### Current Working Configuration

**App URL (for users):**
```
https://wotis.tail878d82.ts.net
```

**Supabase API URL:**
```
https://wotis.tail878d82.ts.net:8443
```

**Tailscale Proxy Configuration:**
```bash
# Port 443: Kookboek app
https://wotis.tail878d82.ts.net → http://127.0.0.1:3000

# Port 8443: Supabase API ✅
https://wotis.tail878d82.ts.net:8443 → http://127.0.0.1:8000

# Port 8444: Vaultwarden
https://wotis.tail878d82.ts.net:8444 → http://127.0.0.1:8222
```

**Environment Variables (in Coolify):**

See `.env.local` for actual values. Required variables:
- `NEXT_PUBLIC_SUPABASE_URL=https://wotis.tail878d82.ts.net:8443`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see .env.local)
- `SUPABASE_SERVICE_ROLE_KEY` (see .env.local)
- `NODE_TLS_REJECT_UNAUTHORIZED=0`

---

## Port Allocation

| Port | Service | Backend | Status |
|------|---------|---------|--------|
| **443** | Kookboek App | http://127.0.0.1:3000 | ✅ Working |
| **8443** | Supabase API | http://127.0.0.1:8000 | ✅ **App uses this!** |
| **8444** | Vaultwarden | http://127.0.0.1:8222 | ✅ Working |

---

## Quick Health Check

```bash
# Check Tailscale configuration
ssh wouter@192.168.1.63 "tailscale serve status"
# Should show port 8443 → http://127.0.0.1:8000

# Test API endpoint
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
# Should return HTTP 401 (unauthorized)

# Check Kong container
ssh wouter@192.168.1.63 "docker ps | grep supabase-kong"
# Should show "Up" and "healthy"
```

---

## After Server Reboot

The automated startup service at `/usr/local/bin/tailscale-startup.sh` handles everything.

**Verify it worked:**
```bash
ssh wouter@192.168.1.63 "sudo systemctl status tailscale-startup.service"
ssh wouter@192.168.1.63 "sudo tail -50 /var/log/tailscale-startup.log"
```

---

## Manual Recovery (If Needed)

```bash
ssh wouter@192.168.1.63

# Configure Tailscale
sudo tailscale serve --bg --https 443 http://127.0.0.1:3000
sudo tailscale serve --bg --https 8443 http://127.0.0.1:8000
sudo tailscale serve --bg --https 8444 http://127.0.0.1:8222

# Start Kong if needed
docker start supabase-kong
```

---

## 📚 Documentation

**Main Guide:**
- **[SUPABASE-TAILSCALE-COMPLETE-GUIDE.md](SUPABASE-TAILSCALE-COMPLETE-GUIDE.md)** - Complete configuration guide

**Context:**
- **[CONTEXT-FOR-CLAUDE.md](CONTEXT-FOR-CLAUDE.md)** - Project context for AI assistance

---

## ⚠️ Important

- **Always use port 8443** (NOT 9443!)
- **Always use HTTP backends** for Tailscale (NOT HTTPS)
- **Kong and Tailscale CAN share port 8443** - no conflict exists

---

**For complete details, troubleshooting, and architecture information, see [SUPABASE-TAILSCALE-COMPLETE-GUIDE.md](SUPABASE-TAILSCALE-COMPLETE-GUIDE.md)**
