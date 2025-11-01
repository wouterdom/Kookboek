# TODO voor Morgen - 2025-11-02

## 🎯 Prioriteit 1: Port Management Verificatie

### Probleem
Meerdere Supabase ports actief - moet verificeren dat we de juiste ports gebruiken in Cloudflare Tunnel en applicatie configuratie.

### Huidige Supabase Ports (gedetecteerd)
```
Port 8000  - Kong Gateway (publiek via 0.0.0.0)
Port 8001  - Kong Admin (intern, tcp only)
Port 8443  - Kong HTTPS (intern, niet exposed)
Port 8444  - Kong HTTPS Admin (intern, niet exposed)
Port 5432  - PostgreSQL (publiek via 0.0.0.0)
Port 4000  - Analytics (publiek via 0.0.0.0)
Port 3000  - Studio, REST, andere services (intern)
Port 5000  - Storage API (intern)
Port 8080  - Meta, Imgproxy (intern)
```

### Te Verifiëren
1. **Cloudflare Tunnel gebruikt port 8000** ✓ (correct)
   - Check: `/etc/cloudflared/config.yml` → `service: http://localhost:8000`

2. **NEXT_PUBLIC_SUPABASE_URL wijst naar juiste port**
   - Check: Gebruikt `https://api.wotis-cloud.com` (via tunnel naar 8000) ✓

3. **Geen hardcoded references naar andere ports** (8443, 8001, etc.)
   - Search codebase voor `:8443`, `:8001`, `:54322`
   - Verify alle Supabase calls via Kong (8000)

4. **Kong routes alle services correct**
   - REST API: `/rest/v1/` → postgrest (port 3000 intern)
   - Storage: `/storage/v1/` → storage-api (port 5000 intern)
   - Auth: `/auth/v1/` → gotrue (intern)
   - Studio: `/project/default` → studio (port 3000 intern)

### Actie Items

#### 1. Documenteer Huidige Port Setup
Update `7-Port-Management/PORT-MANAGEMENT.md`:

```markdown
## Supabase Production Stack

| Port | Service | Type | External URL | Container | Notes |
|------|---------|------|--------------|-----------|-------|
| 8000 | Kong Gateway | HTTP | https://api.wotis-cloud.com | supabase-kong | **Main entry point via Cloudflare Tunnel** |
| 8001 | Kong Admin | HTTP | - | supabase-kong | Internal only |
| 8443 | Kong HTTPS | HTTPS | - | supabase-kong | Internal only, not used |
| 8444 | Kong HTTPS Admin | HTTPS | - | supabase-kong | Internal only |
| 5432 | PostgreSQL | DB | - | supabase-db | Local network only (192.168.1.63:5432) |
| 4000 | Analytics | HTTP | - | supabase-analytics | Local network only |
| 3000 | REST/Studio/Realtime | HTTP | - | Multiple containers | Internal via Kong |
| 5000 | Storage API | HTTP | - | supabase-storage | Internal via Kong |
| 8080 | Meta/Imgproxy | HTTP | - | Multiple containers | Internal services |
```

#### 2. Verify Codebase - Geen Hardcoded Ports
```bash
# Search voor hardcoded ports
cd C:\Users\wdom\Kookboek
grep -r ":8443" --include="*.ts" --include="*.tsx" --include="*.js"
grep -r ":8001" --include="*.ts" --include="*.tsx" --include="*.js"
grep -r ":54322" --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "192.168.1.63:8" --include="*.ts" --include="*.tsx" --include="*.js"
```

**Expected result**: Geen matches (alles via environment variables)

#### 3. Verify Cloudflare Tunnel Routes Correct
```bash
ssh wouter@192.168.1.63 "cat /etc/cloudflared/config.yml"
```

**Verify**:
- `api.wotis-cloud.com` → `http://localhost:8000` ✓
- `httpHostHeader: api.wotis-cloud.com` ✓

#### 4. Test Alle Supabase Endpoints via Tunnel
```bash
# REST API
curl https://api.wotis-cloud.com/rest/v1/

# Storage
curl https://api.wotis-cloud.com/storage/v1/object/list/recipe-images

# Auth
curl https://api.wotis-cloud.com/auth/v1/health

# Studio (moet 401 geven, niet 404)
curl https://api.wotis-cloud.com/project/default
```

**Expected**: Alle 200 OK of 401 Unauthorized (NIET 404!)

---

## 🎯 Prioriteit 2: Deploy Nieuwe Code

### Actie
1. Open Coolify dashboard
2. Trigger **manual redeploy** voor Kookboek
3. Wacht 5-10 minuten
4. Verify nieuwe container draait (commit `4c84746` of nieuwer)

### Verification
```bash
docker ps | grep 3000
# Should show latest commit hash in image name
```

---

## 🎯 Prioriteit 3: Test Production App

### Na succesvolle deploy, test:
- [ ] `https://kookboek.wotis-cloud.com` laadt
- [ ] Recepten worden getoond
- [ ] Afbeeldingen laden
- [ ] Knoppen werken
- [ ] Geen JavaScript errors in console
- [ ] Geen CORS errors

---

## 📂 Referentie Documentatie

- **Main report**: `docs/Bugs/2025-11-01-cloudflare-tunnel-migration.md`
- **CORS issue**: `docs/Bugs/CORS-issue.md`
- **Port management**: `7-Port-Management/PORT-MANAGEMENT.md`

---

**Created**: 2025-11-01 20:00 UTC
**Status**: Ready voor morgen
