# 🔄 Server Reboot Recovery Guide

**Quick Reference:** What to do if things break after server reboot

**Last Updated:** October 27, 2025

---

## ✅ What Makes It Reboot-Safe

1. **Automated Startup Script** at `/usr/local/bin/tailscale-startup.sh`
   - Configured to use port 8443 with HTTP backend
   - Systemd service enabled: `tailscale-startup.service`

2. **Verified Configuration:**
   - Script tested manually ✅
   - Service enabled for boot ✅
   - Logs to `/var/log/tailscale-startup.log`

---

## 🚨 After Reboot - Quick Check (2 minutes)

### Step 1: Wait
Wait **3-4 minutes** after reboot for all services to start

### Step 2: Check App Works
```bash
# From your PC/laptop
curl https://wotis.tail878d82.ts.net
```
**Expected:** HTTP 200 (app loads)

### Step 3: Check Supabase API
```bash
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
```
**Expected:** HTTP 401 with "No API key found"

### Step 4: Test Creating Recipe
Open app in browser and try to create a test recipe.

**If all 4 work** → Everything is fine! ✅

---

## 🔧 If Things Break After Reboot

### Problem: App won't load recipes

**Quick Fix (5 minutes):**

```bash
# 1. SSH to server
ssh wouter@192.168.1.63

# 2. Check what went wrong
sudo tail -50 /var/log/tailscale-startup.log

# 3. Check current Tailscale config
tailscale serve status

# 4. If port 8443 is missing or wrong, fix it manually:
sudo tailscale serve --https=8443 off
sudo tailscale serve --bg --https=8443 http://127.0.0.1:8000

# 5. Verify
tailscale serve status
# Should show: 8443 → http://127.0.0.1:8000

# 6. Test from your PC
curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/
# Should return HTTP 401
```

---

## 🔍 Diagnostic Commands

### Check if startup script ran:
```bash
ssh wouter@192.168.1.63 "sudo systemctl status tailscale-startup.service"
```
**Expected:** "active (exited)" or "loaded"

### Check startup logs:
```bash
ssh wouter@192.168.1.63 "sudo tail -100 /var/log/tailscale-startup.log"
```
**Look for:**
- ✅ "Supabase API proxy configured successfully on port 8443"
- ❌ Any errors or "FAILED"

### Check Kong container:
```bash
ssh wouter@192.168.1.63 "docker ps | grep supabase-kong"
```
**Expected:** "Up" and "healthy"

### Check Tailscale config:
```bash
ssh wouter@192.168.1.63 "tailscale serve status"
```
**Expected:**
```
https://wotis.tail878d82.ts.net:8443 (tailnet only)
|-- / proxy http://127.0.0.1:8000
```

---

## 🆘 Complete Recovery (If Everything Breaks)

**Run this one command to restore everything:**

```bash
ssh wouter@192.168.1.63 'docker start supabase-kong && sleep 5 && sudo tailscale serve reset && sudo tailscale serve --bg --https 443 http://127.0.0.1:3000 && sudo tailscale serve --bg --https 8443 http://127.0.0.1:8000 && sudo tailscale serve --bg --https 8444 http://127.0.0.1:8222 && echo "✅ Configuration restored" && tailscale serve status'
```

**This command:**
1. Starts Kong if needed
2. Resets Tailscale config
3. Configures all 3 services (app, Supabase, Vaultwarden)
4. Shows final configuration

---

## 📋 What Should Work After Reboot

✅ **Automatic (no manual steps):**
- Tailscale proxies configured on ports 443, 8443, 8444
- Kong container running
- App accessible at https://wotis.tail878d82.ts.net
- Recipes load in app
- Can create/edit/delete recipes

✅ **Startup takes:**
- ~60-90 seconds for all services to start
- ~3-4 minutes total to be fully ready

---

## 🔑 Critical Configuration

**MUST be:**
- Port **8443** (NOT 9443)
- Backend **http://127.0.0.1:8000** (HTTP, NOT HTTPS)

**Command:**
```bash
sudo tailscale serve --bg --https 8443 http://127.0.0.1:8000
```

**Environment (in Coolify):**
```
NEXT_PUBLIC_SUPABASE_URL=https://wotis.tail878d82.ts.net:8443
```

---

## 📱 Quick Test Checklist

After reboot, verify these 5 things:

- [ ] App loads: https://wotis.tail878d82.ts.net
- [ ] API responds: `curl -k https://wotis.tail878d82.ts.net:8443/rest/v1/`
- [ ] Kong running: `docker ps | grep kong`
- [ ] Can view recipes in app
- [ ] Can create a test recipe

**All 5 working?** → You're good! ✅

---

## 🔧 If Startup Script Doesn't Work

### Re-run startup script manually:
```bash
ssh wouter@192.168.1.63 "sudo /usr/local/bin/tailscale-startup.sh"
```

### Check if service is enabled:
```bash
ssh wouter@192.168.1.63 "sudo systemctl is-enabled tailscale-startup.service"
```
**Expected:** "enabled"

### If not enabled, enable it:
```bash
ssh wouter@192.168.1.63 "sudo systemctl enable tailscale-startup.service"
```

---

## 📞 Emergency Contact Info

**All documentation in one place:**
`C:\Users\wdom\Kookboek\docs\SUPABASE-TAILSCALE-COMPLETE-GUIDE.md`

**This file:**
`C:\Users\wdom\Kookboek\docs\REBOOT-RECOVERY.md`

---

## 💡 Pro Tips

1. **Don't panic** - The one-command fix works 99% of the time
2. **Check logs first** - `/var/log/tailscale-startup.log` tells you what went wrong
3. **Port 8443 with HTTP backend** - This is the magic combination that works
4. **Wait 3-4 minutes** - Services need time to start after reboot

---

**Recovery Time:** ~5 minutes maximum if manual fix needed

**Status:** All automation tested and working ✅
