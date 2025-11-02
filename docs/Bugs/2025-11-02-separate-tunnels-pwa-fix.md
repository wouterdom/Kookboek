# Separate Tunnels + PWA Fix - 2025-11-02

## Wat Was Het Probleem?

1. **Cloudflare Tunnel Configuratie**: Kookboek en API gebruikten dezelfde tunnel als Jellyseer, wat verwarrend was
2. **PWA Install Prompt Werkte Niet**: Cloudflare Access/Zero Trust onderschepte manifest.json met 302 redirect
3. **DNS Resolution Issues**: Container kon `api.wotis-cloud.com` niet resolven door Docker DNS cache
4. **CORS Errors**: Nog meer client-side Supabase calls ontdekt (weekmenu, groceries, recipe detail)

## Wat Is Gefixed?

### Fix 1: Alle CORS Issues Opgelost
**Files:**
- `contexts/weekmenu-context.tsx` - Changed to use `/api/weekmenu?week=...`
- `lib/hooks/use-grocery-count.ts` - Changed to use `/api/groceries`
- `app/recipes/[slug]/page.tsx` - Changed to use `/api/recipes/[slug]?includeIngredients=true`
- `app/api/recipes/[slug]/images/route.ts` - **NEW** API route for recipe images

**Voor:**
```tsx
// Direct Supabase call (CORS error)
const { data } = await supabase.from('weekly_menu_items').select('*')
```

**Na:**
```tsx
// Via API route (no CORS)
const response = await fetch('/api/weekmenu?week=...')
```

### Fix 2: PWA Manifest Met Cloudflare Access
**File**: `app/layout.tsx`

**Probleem**: Cloudflare Access onderschepte manifest.json, gaf 302 redirect → PWA broken

**Oplossing**: Handmatige `<link>` tag met `crossOrigin="use-credentials"`

```tsx
<head>
  {/* Fix for PWA manifest with Cloudflare Access */}
  <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
</head>
```

Reference: https://community.cloudflare.com/t/pwa-manifest-and-cloudflare-access/213891

### Fix 3: Aparte Tunnels Voor Duidelijkheid

**Oude Setup (Verwarrend):**
- Alles via jellyseer-tunnel (ID: `012ca05b-b2a4-4a68-97c8-8a6cf8cb87f1`)

**Nieuwe Setup (Duidelijk):**
- **jellyseer-tunnel**: Alleen Jellyseer (`jellyseer.wotis-cloud.com`)
- **kookboek-tunnel**: Kookboek + API (`kookboek.wotis-cloud.com`, `api.wotis-cloud.com`)

**Kookboek Tunnel Details:**
- Tunnel ID: `8258f3bb-bab4-4bed-a290-0d7e2c2a3797`
- Config: `/etc/cloudflared/kookboek-config.yml`
- Credentials: `/etc/cloudflared/kookboek-tunnel.json`
- Service: `cloudflared-kookboek.service`

**Aangemaakt via:**
```bash
# Config file
/etc/cloudflared/kookboek-config.yml

# Credentials (from Cloudflare token)
/etc/cloudflared/kookboek-tunnel.json

# Systemd service
/etc/systemd/system/cloudflared-kookboek.service
```

**DNS Records via Cloudflare API:**
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone-id}/dns_records" \
  -H "Authorization: Bearer {api-token}" \
  -d '{
    "type": "CNAME",
    "name": "kookboek",
    "content": "8258f3bb-bab4-4bed-a290-0d7e2c2a3797.cfargotunnel.com",
    "proxied": true
  }'
```

### Fix 4: Environment Variable Voor DNS Issues

**Probleem**: Docker container kon `https://api.wotis-cloud.com` niet resolven (DNS cache in container)

**Tijdelijke Oplossing** (Coolify Environment Variables):
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
```

**Waarom dit werkt:**
- Next.js server en Supabase draaien op dezelfde machine
- `localhost:8000` werkt altijd (geen DNS lookup)
- Browser ziet alleen `https://kookboek.wotis-cloud.com` (PWA blijft werken!)
- Server-to-server call is intern

**Later** (optioneel):
Als DNS overal stabiel is, kan je terugzetten naar:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://api.wotis-cloud.com
```

## TypeScript Fix

**File**: `contexts/weekmenu-context.tsx`

Toegevoegd explicit `Set<string>` type om TypeScript inference error te fixen:
```tsx
const recipeIds = new Set<string>(...)
```

## Deployment Checklist

### 1. Environment Variables in Coolify
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000  ✅ Tijdelijk voor DNS issues
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-key]
SUPABASE_SERVICE_ROLE_KEY=[your-key]
GOOGLE_AI_API_KEY=[your-key]
NEXT_PUBLIC_APP_URL=https://kookboek.wotis-cloud.com
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

### 2. Deploy Type
**Gebruik**: Normal **"Deploy"** (met cache is sneller)
- Force Deploy Without Cache = te traag, timeout issues

### 3. After Deploy
1. Hard refresh (`Ctrl + Shift + R`)
2. Of F12 → Application → Clear site data
3. PWA install prompt verschijnt na 2 seconden op `https://kookboek.wotis-cloud.com`

## Tunnels Overview

### Jellyseer Tunnel
- **Service**: `cloudflared.service`
- **Config**: `/etc/cloudflared/config.yml`
- **Tunnel ID**: `012ca05b-b2a4-4a68-97c8-8a6cf8cb87f1`
- **Hostnames**: `jellyseer.wotis-cloud.com`
- **Status**: ✅ Running

### Kookboek Tunnel
- **Service**: `cloudflared-kookboek.service`
- **Config**: `/etc/cloudflared/kookboek-config.yml`
- **Tunnel ID**: `8258f3bb-bab4-4bed-a290-0d7e2c2a3797`
- **Hostnames**: `kookboek.wotis-cloud.com`, `api.wotis-cloud.com`
- **Status**: ✅ Running (4 connections)

**Check Status:**
```bash
sudo systemctl status cloudflared-kookboek
sudo systemctl status cloudflared  # jellyseer
```

## Test Na Deployment

### Intern (Thuis):
```
http://192.168.1.63:3000  ✅ (clear cache first!)
```

### Extern (HTTPS):
```
https://kookboek.wotis-cloud.com  ✅ (werkt wereldwijd!)
```

### PWA Test:
1. Open `https://kookboek.wotis-cloud.com` (HTTPS, niet HTTP!)
2. Wacht 2 seconden
3. Install prompt verschijnt onderaan
4. Klik "Installeer"
5. App verschijnt op beginscherm/desktop

### Browser Console Check:
- ✅ Geen CORS errors
- ✅ Alle `/api/*` calls = 200 OK
- ✅ Manifest.json laadt correct
- ✅ WebSocket verbinding naar Supabase realtime

## Commits

- `3af4907` - CORS fixes recipe detail page
- `6fd5cb3` - CORS fixes weekmenu + grocery
- `e4d440a` - TypeScript linter fixes
- `dd7fe0f` - PWA manifest crossOrigin fix
- `41f0587` - TypeScript Set<string> fix

## Als Het Niet Werkt

### 1. Check Tunnel Status
```bash
ssh wouter@192.168.1.63 "sudo systemctl status cloudflared-kookboek"
```

Should show: `Active: active (running)` with 4 connections

### 2. Check Container Logs
```bash
ssh wouter@192.168.1.63 "docker ps --filter 'publish=3000' --format '{{.Names}}' | xargs docker logs --tail 50"
```

### 3. Verify Environment Variables
```bash
ssh wouter@192.168.1.63 "docker exec {container-name} env | grep SUPABASE"
```

Should be: `NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000`

### 4. Clear Browser Cache
- F12 → Application → Clear site data
- Or `Ctrl + Shift + R` (hard refresh)

## Notes

- Gebruik `localhost:8000` in plaats van `https://api.wotis-cloud.com` voor server-side Supabase calls (voorkomt DNS issues in container)
- PWA werkt alleen op HTTPS (`https://kookboek.wotis-cloud.com`), niet op HTTP IP (`http://192.168.1.63:3000`)
- Hard refresh is ALTIJD nodig na deployment (cached JavaScript!)
