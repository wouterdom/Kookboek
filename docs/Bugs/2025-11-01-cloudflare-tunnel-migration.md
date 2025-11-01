# Cloudflare Tunnel Migration - 2025-11-01

## 🎯 Doel
Migratie van Tailscale naar Cloudflare Tunnel voor publieke toegang tot Kookboek app en Supabase API.

---

## 📋 Wat We Vandaag Gedaan Hebben

### 1. Cloudflare Tunnel Setup Geverifieerd

**Bestaande configuratie:**
- **Tunnel naam**: `jellyseerr-tunnel`
- **Tunnel ID**: `012ca05b-b2a4-4a68-97c8-8a6cf8cb87f1`
- **Config file**: `/etc/cloudflared/config.yml`

**Drie services aan tunnel toegevoegd:**
```yaml
ingress:
  - hostname: jellyseer.wotis-cloud.com
    service: http://localhost:5055        # Jellyseerr container

  - hostname: kookboek.wotis-cloud.com
    service: http://localhost:3000        # Kookboek container

  - hostname: api.wotis-cloud.com
    service: http://localhost:8000        # Supabase Kong gateway
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      httpHostHeader: api.wotis-cloud.com
      originServerName: api.wotis-cloud.com
```

**DNS Records:**
- ✅ `jellyseer.wotis-cloud.com` → CNAME naar tunnel
- ✅ `kookboek.wotis-cloud.com` → CNAME naar tunnel
- ✅ `api.wotis-cloud.com` → CNAME naar tunnel

### 2. Environment Variables Aangepast

**Bestand**: `.env.local`

**Van (Tailscale):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://wotis.tail878d82.ts.net:8443
```

**Naar (Cloudflare Tunnel):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://api.wotis-cloud.com
NEXT_PUBLIC_APP_URL=https://kookboek.wotis-cloud.com
```

**Alle environment variables:**
```bash
# Public (client-side)
NEXT_PUBLIC_SUPABASE_URL=https://api.wotis-cloud.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE3OTk1MzU2MDB9.HU78hXVnv91B_2r3HZx6ewwO3Q8VAryIZWkQuEA62aI
NEXT_PUBLIC_APP_URL=https://kookboek.wotis-cloud.com

# Private (server-side)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.WlwUOz5EkFPO893iYN3f_bJ4GBthoDt88iaqZHdZWQ8

# Google AI
GOOGLE_AI_API_KEY=AIzaSyAuqa_I8uWqL2WO1r7gUXFaJPy_RnwLtkQ

# Database (lokaal)
DATABASE_URL=postgresql://postgres:PASSWORD@192.168.1.63:5432/postgres
```

### 3. Code Aanpassingen

#### 3.1. SSL Certificate Bypass Verwijderd

**Bestand**: `lib/supabase-server.ts`

**Verwijderd:**
```typescript
// For Tailscale HTTPS with self-signed certificates
if (process.env.NODE_ENV === 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

global: {
  fetch: (url, options = {}) => {
    return fetch(url, {
      ...options,
      agent: process.env.NODE_ENV === 'production' ?
        new (require('https').Agent)({ rejectUnauthorized: false }) :
        undefined
    })
  }
}
```

**Reden**: Cloudflare Tunnel heeft geldige SSL certificaten (geen self-signed zoals Tailscale).

**Commit**: `6e36b95` - "Migrate from Tailscale to Cloudflare Tunnel for public access"

#### 3.2. SSR Supabase Client Fix

**Bestand**: `lib/supabase/server.ts`

**Verwijderd:**
```typescript
// Custom fetch for Tailscale HTTPS with self-signed certificates
const customFetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
  if (process.env.NODE_ENV === 'production' && typeof url === 'string' && url.startsWith('https://')) {
    const https = require('https')
    return fetch(url, {
      ...options,
      agent: new https.Agent({ rejectUnauthorized: false })
    })
  }
  return fetch(url, options)
}

global: {
  fetch: customFetch
}
```

**Reden**: Zelfde probleem - blokkeerde API calls in productie.

**Commit**: `216173d` - "Fix SSR Supabase client: remove Tailscale SSL bypass"

#### 3.3. Next.js Image Configuration

**Bestand**: `next.config.ts`

**Van:**
```typescript
{
  protocol: 'https',
  hostname: 'wotis.tail878d82.ts.net',
  port: '8443',
  pathname: '/storage/v1/object/public/**',
}
```

**Naar:**
```typescript
{
  protocol: 'https',
  hostname: 'api.wotis-cloud.com',
  pathname: '/storage/v1/object/public/**',
}
```

### 4. Database Image URLs Gemigreerd

**106 image URLs geüpdatet** van Tailscale naar Cloudflare Tunnel:

**SQL queries uitgevoerd:**
```sql
-- Recipes table (50 URLs)
UPDATE recipes
SET image_url = REPLACE(image_url, 'https://wotis.tail878d82.ts.net:8443', 'https://api.wotis-cloud.com')
WHERE image_url LIKE 'https://wotis.tail%';

-- Recipe_images table (56 URLs)
UPDATE recipe_images
SET image_url = REPLACE(image_url, 'https://wotis.tail878d82.ts.net:8443', 'https://api.wotis-cloud.com')
WHERE image_url LIKE 'https://wotis.tail%';

-- Fix double path issue (5+5 URLs)
UPDATE recipes
SET image_url = REPLACE(image_url, '/recipe-images/recipe-images/', '/recipe-images/')
WHERE image_url LIKE '%/recipe-images/recipe-images/%';

UPDATE recipe_images
SET image_url = REPLACE(image_url, '/recipe-images/recipe-images/', '/recipe-images/')
WHERE image_url LIKE '%/recipe-images/recipe-images/%';
```

### 5. Cloudflare Tunnel Configuratie Update

**Bestand**: `/etc/cloudflared/config.yml` op server

**Backup gemaakt**: `/etc/cloudflared/config.yml.backup`

**Oude config (niet werkend):**
```yaml
- hostname: api.wotis-cloud.com
  service: http://localhost:8000
  originRequest:
    noTLSVerify: true
    httpHostHeader: localhost
```

**Nieuwe config (werkend):**
```yaml
- hostname: api.wotis-cloud.com
  service: http://localhost:8000
  originRequest:
    noTLSVerify: false
    connectTimeout: 30s
    httpHostHeader: api.wotis-cloud.com
    originServerName: api.wotis-cloud.com
```

**Service herstart:**
```bash
sudo systemctl restart cloudflared
```

---

## ✅ Wat Werkt

### API Endpoints (Direct Supabase via Cloudflare Tunnel)

✅ **Supabase REST API**
```bash
curl https://api.wotis-cloud.com/rest/v1/recipes?select=id,title&limit=1 \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]"
# Response: 200 OK with JSON data (50 recipes)
```

✅ **Supabase Storage API**
```bash
curl -I https://api.wotis-cloud.com/storage/v1/object/public/recipe-images/[filename].jpg
# Response: 200 OK
```

✅ **Supabase Auth API**
```bash
curl https://api.wotis-cloud.com/auth/v1/health
# Response: 200 OK
```

### Lokale App

✅ **Lokaal op server (192.168.1.63:3000)**
- App laadt correct
- Recepten worden getoond
- Afbeeldingen laden
- Alle functionaliteit werkt

### Infrastructure

✅ **Cloudflare Tunnel**
- 4 verbindingen actief
- Geen errors in logs
- Status: `active (running)`

✅ **Supabase Stack**
- Alle containers draaien (healthy)
- Database bereikbaar
- Kong Gateway werkt

---

## ❌ Wat Niet Werkt

### Production App (https://kookboek.wotis-cloud.com)

❌ **Geen Recepten Geladen**
- App laadt (HTML & CSS)
- Skeleton loaders blijven staan
- JavaScript werkt niet goed
- API calls falen

❌ **404 Errors op JavaScript Files**
```
_app-d238bab03b8b0824.js:1  Failed to load resource: 404
framework-9fbfeeabae6af834.js:1  Failed to load resource: 404
f92e1214-4e28990dd87cca4a.js:1  Failed to load resource: 404
```

❌ **Container Draait Oude Code**
```bash
docker ps | grep 3000
# Shows: uskkk4kks8o04g8oo04ows4s:6e36b95a7c93...
# Should be: uskkk4kks8o04g8oo04ows4s:216173d...
```

---

## 🔍 Diagnose

### Probleem 1: Oude Container Draait
- **Container**: Gebouwd met commit `6e36b95` (51 minuten geleden)
- **Laatste commit**: `216173d` (33 minuten geleden)
- **Conclusie**: Coolify heeft nieuwe code niet gedeployed

### Probleem 2: API Routes Geven Lege Data
**Test:**
```bash
curl https://kookboek.wotis-cloud.com/api/recipes?page=0&pageSize=24
# Response: {"recipes":[],"totalCount":0,"page":0,"pageSize":24,"hasMore":false}
```

**Maar Supabase API heeft wel data:**
```bash
curl https://api.wotis-cloud.com/rest/v1/recipes?select=count \
  -H "apikey: [KEY]" -H "Authorization: Bearer [KEY]" -H "Prefer: count=exact"
# Response: [{"count":50}]
```

**Conclusie**: De Next.js API route (`app/api/recipes/route.ts`) krijgt geen data van Supabase client omdat de oude code nog draait met SSL bypass problemen.

### Probleem 3: Coolify Environment Variables
**Status**: ✅ Correct ingesteld in Coolify
- Alle variabelen zijn aanwezig
- URLs zijn correct (Cloudflare Tunnel)

**Maar**: Container is niet opnieuw gebouwd met nieuwe code.

---

## 🛠️ Wat Morgen Moet Gebeuren

### Optie 1: Volledige Redeploy in Coolify (Aanbevolen)

1. **Trigger Manual Redeploy** in Coolify dashboard
2. Wacht tot nieuwe container gebouwd is met commit `216173d`
3. Verificatie:
   ```bash
   # Check container image tag
   docker ps | grep 3000
   # Should show: 216173d

   # Test API
   curl https://kookboek.wotis-cloud.com/api/recipes?page=0&pageSize=2
   # Should return actual recipes
   ```

### Optie 2: Docker Image Handmatig Rebuilden

```bash
ssh wouter@192.168.1.63

# Stop huidige container
docker stop uskkk4kks8o04g8oo04ows4s-174820064793

# Rebuild via Coolify of handmatig
cd /path/to/kookboek
git pull origin main
docker build -t kookboek:latest .
docker run -d -p 3000:3000 --env-file .env kookboek:latest
```

### Optie 3: Fresh Start met Clean Install

Als opties 1 & 2 niet werken:

1. **Backup essentials:**
   - Database (al extern op 192.168.1.63:5432)
   - Environment variables (al gedocumenteerd)
   - Cloudflare Tunnel config (backup gemaakt)

2. **Remove Coolify deployment**
3. **Deploy opnieuw:**
   - Via Coolify of Docker Compose
   - Met correcte environment variables
   - Zonder SSL bypass code

---

## 📊 Huidige Status Samenvatting

| Component | Status | Werkt Via |
|-----------|--------|-----------|
| Supabase API (REST) | ✅ Werkt | `https://api.wotis-cloud.com/rest/v1/` |
| Supabase Storage | ✅ Werkt | `https://api.wotis-cloud.com/storage/v1/` |
| Cloudflare Tunnel | ✅ Actief | 4 connecties |
| Database | ✅ Werkt | Direct access via 192.168.1.63:5432 |
| Kookboek App (lokaal) | ✅ Werkt | `http://192.168.1.63:3000` |
| Kookboek App (public) | ❌ Deels | `https://kookboek.wotis-cloud.com` (HTML laadt, JS faalt) |
| Image URLs in DB | ✅ Gemigreerd | Alle URLs naar Cloudflare Tunnel |

---

## 🔐 Security Overwegingen

### ✅ Goed Geconfigureerd
- Supabase API keys correct ingesteld
- Service role key alleen server-side
- Cloudflare Tunnel met geldige SSL certificaten
- Database niet publiekelijk bereikbaar (alleen via lokaal netwerk)

### ⚠️ Let Op
- Supabase Studio niet publiekelijk toegankelijk (goed!)
- Basic auth vereist voor `/project/*` routes
- Aanbeveling: Houd Studio lokaal via Tailscale/SSH

---

## 📝 Belangrijke Files Gewijzigd

```
Gecommit & gepushed:
✅ lib/supabase-server.ts              (Commit: 6e36b95)
✅ lib/supabase/server.ts              (Commit: 216173d)
✅ next.config.ts                      (Commit: 6e36b95)
✅ .gitignore                          (Commit: 6e36b95)

Op server:
✅ /etc/cloudflared/config.yml         (Backup: config.yml.backup)
✅ Database (recipe tables)            (106 URLs gemigreerd)

Nog te deployen:
⏳ Docker container met nieuwe code    (Commit 216173d wacht op deploy)
```

---

## 🎯 Next Steps Morgen

1. ✅ **Verificatie Environment Variables** - Already done
2. 🔄 **Trigger Redeploy** in Coolify
3. ⏱️ **Wacht 5-10 minuten** voor build
4. 🧪 **Test checklist:**
   - [ ] `https://kookboek.wotis-cloud.com` laadt zonder errors
   - [ ] Recepten worden getoond
   - [ ] Afbeeldingen laden
   - [ ] Knoppen werken
   - [ ] API calls succesvol
   - [ ] Console zonder errors

5. 🐛 **Als het nog niet werkt:**
   - Check container logs: `docker logs [container]`
   - Verify build gebruikt nieuwe code
   - Consider fresh deployment

---

## 📞 Troubleshooting Commands

```bash
# Check Cloudflare Tunnel status
ssh wouter@192.168.1.63 "sudo systemctl status cloudflared"

# Check Cloudflare Tunnel logs
ssh wouter@192.168.1.63 "sudo journalctl -u cloudflared -n 50"

# Test Supabase API
curl https://api.wotis-cloud.com/rest/v1/recipes?select=count \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Prefer: count=exact"

# Test Kookboek API
curl https://kookboek.wotis-cloud.com/api/recipes?page=0&pageSize=2

# Check Docker container
ssh wouter@192.168.1.63 "docker ps | grep 3000"

# Check Docker logs
ssh wouter@192.168.1.63 "docker logs --tail 100 uskkk4kks8o04g8oo04ows4s-174820064793"

# Test lokaal
ssh wouter@192.168.1.63 "curl -s http://localhost:3000 | head -20"

# Restart container (if needed)
ssh wouter@192.168.1.63 "docker restart uskkk4kks8o04g8oo04ows4s-174820064793"
```

---

## ✨ Geleerde Lessen

1. **Twee Supabase Client Files**:
   - `lib/supabase-server.ts` (admin)
   - `lib/supabase/server.ts` (SSR)
   - Beide moeten aangepast worden!

2. **SSL Bypass is Gevaarlijk**:
   - `rejectUnauthorized: false` blokkeert met geldige certificates
   - Cloudflare Tunnel heeft geen bypass nodig

3. **Database URL Migratie**:
   - Check zowel `recipes` als `recipe_images` tabellen
   - Check voor dubbele paden (`/recipe-images/recipe-images/`)

4. **Coolify Deployment**:
   - Auto-deploy werkt niet altijd direct
   - Manual redeploy trigger soms nodig
   - Verify via docker image tag welke code draait

5. **Image Path Issues**:
   - Sommige uploads hadden dubbel pad
   - Fix met SQL REPLACE queries
   - Altijd beide tabellen checken

---

**Einde Rapport - 2025-11-01 19:30 UTC**
