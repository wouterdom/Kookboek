# ⚠️ IMMEDIATE ACTION REQUIRED

**Date:** October 27, 2025
**Priority:** HIGH
**Action:** Update Coolify Environment Variable

---

## What Happened

We fixed the Tailscale/Supabase port conflict by moving the Tailscale proxy from port **8443** to port **9443**.

This allows:
- ✅ Kong to use port 8443 without conflicts
- ✅ Tailscale to provide trusted HTTPS on port 9443
- ✅ No more certificate errors in the browser

---

## What You Need To Do NOW

### Update the Kookboek App Environment Variable in Coolify

1. **Open Coolify in your browser:**
   ```
   http://192.168.1.63:7000
   ```

2. **Navigate to the Kookboek application**

3. **Go to Environment Variables section**

4. **Find and update this variable:**
   ```
   Variable: NEXT_PUBLIC_SUPABASE_URL

   OLD VALUE: https://wotis.tail878d82.ts.net:8443
   NEW VALUE: https://wotis.tail878d82.ts.net:9443
                                              ^^^^
                                        Change 8443 to 9443
   ```

5. **Save the changes**

6. **Redeploy the application** (there should be a "Redeploy" or "Restart" button)

---

## After Redeployment

Wait 1-2 minutes for the app to restart, then test:

1. **Open the app:**
   ```
   https://wotis.tail878d82.ts.net
   ```

2. **Verify recipes load correctly** - You should see all 29 recipes

3. **Check browser console** (F12) - Should see NO errors about failed fetches

---

## If You Can't Access Coolify

Alternative method via SSH:

```bash
# SSH to server
ssh wouter@192.168.1.63

# Navigate to the app directory in Coolify
# (You'll need to find where Coolify stores the app config)

# Or manually restart the container with new env
docker stop uskkk4kks8o04g8oo04ows4s-173052248178
docker rm uskkk4kks8o04g8oo04ows4s-173052248178

# Then redeploy through Coolify UI
```

---

## Verification Commands

After updating and redeploying:

```bash
# Verify the new environment variable took effect
ssh wouter@192.168.1.63 "docker exec \$(docker ps --filter 'name=uskkk4' -q) printenv NEXT_PUBLIC_SUPABASE_URL"
# Should output: https://wotis.tail878d82.ts.net:9443

# Test the API endpoint
curl -k https://wotis.tail878d82.ts.net:9443/rest/v1/
# Should return HTTP 401
```

---

## Current Server Configuration (Already Applied)

These are already configured correctly on the server:

✅ Tailscale proxy on port 9443: `https://wotis.tail878d82.ts.net:9443 → http://127.0.0.1:8000`
✅ Kong container running and healthy on port 8443
✅ Automated startup script created (but needs updating - see below)

---

## Next Steps (After App Works)

1. **Test the app works with recipes loading** ✅

2. **Update the automated startup script:**
   ```bash
   # The startup script file is in: docs/scripts/tailscale-startup.sh
   # It needs to be updated to use port 9443 instead of 8443
   # Then re-deploy it to the server
   ```

3. **Test server reboot:**
   ```bash
   ssh wouter@192.168.1.63 "sudo reboot"
   # Wait 3-4 minutes
   # Then verify everything still works
   ```

4. **Commit all documentation to git**

---

## Questions?

Check these docs:
- [Port Conflict Solution](PORT-CONFLICT-SOLUTION.md) - Full technical explanation
- [Tailscale Troubleshooting](TAILSCALE-SUPABASE-TROUBLESHOOTING.md) - Diagnostic steps
- [Automated Startup](AUTOMATED-STARTUP-SETUP.md) - Startup script details

---

**⏰ Estimated Time:** 5 minutes
**🔧 Difficulty:** Easy - Just change one number in Coolify UI

**Once you've updated the environment variable and redeployed, let me know and we'll test it together!**
