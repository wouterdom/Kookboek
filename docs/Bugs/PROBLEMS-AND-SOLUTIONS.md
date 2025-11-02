# Kookboek - Problems & Solutions

## Date: November 2, 2025

---

## Problem 1: CORS Errors on Production

### Symptom
- App worked fine locally (`localhost:3000`)
- On deployed version (`192.168.1.63:3000` or `https://kookboek.wotis-cloud.com`): CORS errors
- Browser console: "Access to fetch at 'https://api.wotis-cloud.com/rest/v1/...' has been blocked by CORS policy"

### Root Cause
Client-side code made **direct calls** to Supabase (`https://api.wotis-cloud.com`) from a different origin, triggering browser CORS restrictions.

**Affected files:**
- `app/recipes/[slug]/cooking/page.tsx` - Direct Supabase calls
- `app/recipes/[slug]/page.tsx` - Direct Supabase calls for recipe, ingredients, images
- `contexts/weekmenu-context.tsx` - Direct query to `weekly_menu_items`
- `lib/hooks/use-grocery-count.ts` - Direct query to `grocery_items`

### Solution
Changed all client-side Supabase calls to use **Next.js API routes** (server-to-server, no CORS):

**Before:**
```tsx
// Client-side (CORS error)
const { data } = await supabase.from('recipes').select('*')
```

**After:**
```tsx
// Via API route (no CORS)
const response = await fetch('/api/recipes/...')
```

**New API Routes Created:**
- `/api/recipes/[slug]/images` - Recipe images endpoint
- All existing routes updated to support `?includeIngredients=true` parameter

### Result
✅ No more CORS errors
✅ All data flows through Next.js API routes
✅ Browser only sees same-origin requests

---

## Problem 2: PWA Install Prompt Not Showing

### Symptom
- PWA install prompt never appeared
- `https://kookboek.wotis-cloud.com/manifest.json` returned 404
- Chrome didn't recognize the app as installable

### Root Cause
Cloudflare Access/Zero Trust (if enabled) intercepts `manifest.json` with 302 redirect to login page, breaking PWA recognition.

Next.js automatically generates `<link rel="manifest">` without `crossOrigin` attribute.

### Solution
Added manual manifest link with `crossOrigin="use-credentials"` in `app/layout.tsx`:

```tsx
<head>
  <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
</head>
```

Removed duplicate from Next.js metadata object.

### Result
✅ Manifest loads correctly
✅ PWA install prompt appears after 2 seconds
✅ Works with Cloudflare Access enabled

---

## Problem 3: Separate Tunnels for Organization

### Symptom
- All services (Jellyseer, Kookboek, API) ran through one tunnel
- Confusing to manage and troubleshoot
- Couldn't isolate services

### Solution
Created **separate Cloudflare Tunnels** for each service:

**Jellyseer Tunnel:**
- Tunnel ID: `012ca05b-b2a4-4a68-97c8-8a6cf8cb87f1`
- Service: `cloudflared.service`
- Hostname: `jellyseer.wotis-cloud.com`

**Kookboek Tunnel:**
- Tunnel ID: `8258f3bb-bab4-4bed-a290-0d7e2c2a3797`
- Service: `cloudflared-kookboek.service`
- Hostnames: `kookboek.wotis-cloud.com`, `api.wotis-cloud.com`
- Config: `/etc/cloudflared/kookboek-config.yml`

### Configuration Files

**`/etc/cloudflared/kookboek-config.yml`:**
```yaml
tunnel: 8258f3bb-bab4-4bed-a290-0d7e2c2a3797
credentials-file: /etc/cloudflared/kookboek-tunnel.json

ingress:
  - hostname: kookboek.wotis-cloud.com
    service: http://localhost:3000
  - hostname: api.wotis-cloud.com
    service: http://localhost:8000
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      httpHostHeader: api.wotis-cloud.com
  - service: http_status:404
```

**Systemd service created:**
```bash
sudo systemctl enable cloudflared-kookboek
sudo systemctl start cloudflared-kookboek
```

### Result
✅ Clear separation of services
✅ Easy to manage individually
✅ Can restart/update without affecting other services

---

## Problem 4: Docker Container DNS Resolution

### Symptom
- Container environment had `NEXT_PUBLIC_SUPABASE_URL=https://api.wotis-cloud.com`
- Server-side API routes failed: "TypeError: fetch failed"
- Container couldn't resolve `api.wotis-cloud.com` hostname

### Root Cause
Docker container DNS cache didn't have the newly created DNS record for `api.wotis-cloud.com`.

### Solution
Added `/etc/hosts` override on server:
```bash
echo '104.21.51.53 api.wotis-cloud.com' | sudo tee -a /etc/hosts
```

**Why this works:**
- Server-side Next.js can now resolve `api.wotis-cloud.com`
- Browser still uses public DNS (no issue)
- Container inherits host DNS resolution

**Alternative considered:**
Using `http://localhost:8000` would work server-side but breaks client-side WebSockets (browser can't connect to server's localhost).

### Result
✅ Container can resolve `api.wotis-cloud.com`
✅ Server-side API routes work
✅ Client-side WebSockets work
✅ PWA works on HTTPS

---

## Problem 5: TypeScript Build Errors

### Symptom
Build failed with TypeScript errors:
```
contexts/weekmenu-context.tsx(72,30): error TS2345:
Argument of type 'Set<unknown>' is not assignable to parameter of type 'SetStateAction<Set<string>>'
```

### Solution
Added explicit type to Set constructor:
```tsx
const recipeIds = new Set<string>(...)
```

### Result
✅ TypeScript compilation passes
✅ Build succeeds
✅ No type errors

---

## Summary: What Works Now

✅ **Public Access**: `https://kookboek.wotis-cloud.com` works worldwide
✅ **No CORS Errors**: All data via Next.js API routes
✅ **PWA Installable**: Manifest loads correctly with crossOrigin fix
✅ **Separate Tunnels**: Kookboek isolated from Jellyseer
✅ **Recipe Import**: Works (URL, photos, PDF)
✅ **Image Generation**: Works (need new Google AI key if old one is blocked)
✅ **WebSockets**: Supabase Realtime works
✅ **Worldwide Access**: Via Cloudflare Tunnel (no VPN, no port forwarding)

## Environment Variables (Production)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://api.wotis-cloud.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key]
NEXT_PUBLIC_APP_URL=https://kookboek.wotis-cloud.com
SUPABASE_SERVICE_ROLE_KEY=[key]
GOOGLE_AI_API_KEY=[new-key-needed]
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

## Testing Checklist

**From anywhere in the world:**
- [ ] Open `https://kookboek.wotis-cloud.com`
- [ ] Recipes load
- [ ] Click recipe → Kookmodus works
- [ ] Import recipe works
- [ ] PWA install prompt appears
- [ ] Can install to home screen
- [ ] No CORS errors in console

**Troubleshooting:**
- Hard refresh: `Ctrl + Shift + R`
- Clear cache: F12 → Application → Clear site data
- Check tunnel status: `sudo systemctl status cloudflared-kookboek`

## Known Issues

### Missing Images (5 recipes)
These recipes have broken image URLs (400 Bad Request from Supabase Storage):
- bananenbrood (Healthy Banana Bread)
- margarita
- long-island-iced-tea
- mojito
- caipirinha

**Fix**: Manually re-upload images via the UI.
