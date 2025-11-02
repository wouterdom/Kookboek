# Cloudflare Tunnel Fix voor Supabase Kong

## 🔴 Het Probleem

Supabase Kong (port 8000) verwacht specifieke headers en moet correct geconfigureerd worden om via Cloudflare Tunnel te werken.

Momenteel:
- ✅ Lokaal werkt: `http://192.168.1.63:8000/rest/v1/`
- ❌ Via tunnel: `https://api.wotis-cloud.com/rest/v1/` → 404

**Reden**: Kong verwacht de `Host` header en moet weten dat requests via HTTPS/proxy komen.

## ✅ Oplossing: Update `/etc/cloudflared/config.yml`

```yaml
tunnel: 012ca05b-b2a4-4a68-97c8-8a6cf8cb87f1
credentials-file: /etc/cloudflared/012ca05b-b2a4-4a68-97c8-8a6cf8cb87f1.json

ingress:
  # Jellyseerr - blijft hetzelfde
  - hostname: jellyseer.wotis-cloud.com
    service: http://localhost:5055

  # Kookboek app - blijft hetzelfde
  - hostname: kookboek.wotis-cloud.com
    service: http://localhost:3000

  # Supabase API - AANGEPASTE CONFIG
  - hostname: api.wotis-cloud.com
    service: http://localhost:8000
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      httpHostHeader: api.wotis-cloud.com  # ← BELANGRIJK: Gebruik public hostname
      originServerName: api.wotis-cloud.com

  # Catch-all
  - service: http_status:404
```

## 🔧 Stappen om toe te passen:

### 1. SSH naar je server
```bash
ssh wouter@192.168.1.63
```

### 2. Backup huidige config
```bash
sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.backup
```

### 3. Edit de config
```bash
sudo nano /etc/cloudflared/config.yml
```

Vervang de `api.wotis-cloud.com` sectie met:
```yaml
  - hostname: api.wotis-cloud.com
    service: http://localhost:8000
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      httpHostHeader: api.wotis-cloud.com
      originServerName: api.wotis-cloud.com
```

Save met `Ctrl+O`, `Enter`, `Ctrl+X`

### 4. Herstart Cloudflare Tunnel
```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared
```

### 5. Test de API
```bash
# Test of de API bereikbaar is
curl -I https://api.wotis-cloud.com/rest/v1/
```

Dit zou een `200 OK` of `401 Unauthorized` moeten geven (NIET 404!)

## 🔍 Extra: Controleer Supabase Kong configuratie

Als bovenstaande niet werkt, moet je mogelijk ook je Supabase Kong config aanpassen.

### Check Kong environment variabelen

Je Supabase Kong moet weten dat het achter een proxy zit:

```bash
# In je Supabase docker-compose.yml of .env
KONG_PROXY_ACCESS_LOG=/dev/stdout
KONG_ADMIN_ACCESS_LOG=/dev/stdout
KONG_PROXY_ERROR_LOG=/dev/stderr
KONG_ADMIN_ERROR_LOG=/dev/stderr
KONG_TRUSTED_IPS=0.0.0.0/0,::/0  # Trust Cloudflare IPs
KONG_REAL_IP_HEADER=CF-Connecting-IP
KONG_REAL_IP_RECURSIVE=on
```

### Herstart Supabase containers
```bash
cd /path/to/supabase
docker-compose restart kong
```

## 🎯 Waarom dit werkt

1. **`httpHostHeader: api.wotis-cloud.com`**: Kong verwacht deze header om requests correct te routen
2. **`originServerName`**: Voor SSL/TLS verificatie
3. **`connectTimeout: 30s`**: Genoeg tijd voor API calls (vooral file uploads)
4. **Kong trusted IPs**: Kong vertrouwt Cloudflare's proxy IPs

## 📸 Foto's Fix

Voor de foto's moet je in `next.config.ts` zorgen dat Next.js images via de tunnel kunnen laden.
Dit staat al correct ingesteld op regel 39:
```typescript
hostname: 'api.wotis-cloud.com',
pathname: '/storage/v1/object/public/**',
```

Als foto's lokaal niet werken, check:
1. Zijn de foto's uploaded naar Supabase storage bucket `recipe-images`?
2. Is de bucket `public` ingesteld in Supabase?

```bash
# Test of storage werkt
curl -I https://api.wotis-cloud.com/storage/v1/object/public/recipe-images/test.jpg
```

## 🧪 Test Checklist

Na het toepassen van de fix:

- [ ] `https://api.wotis-cloud.com/rest/v1/` → Geen 404
- [ ] `https://kookboek.wotis-cloud.com` → Laadt recepten
- [ ] Recepten hebben foto's
- [ ] Je kunt nieuwe recepten toevoegen
- [ ] API calls in browser Network tab (F12) → 200 OK

## 💡 Als het nog steeds niet werkt

Check de Cloudflare Tunnel logs:
```bash
sudo journalctl -u cloudflared -f --no-pager
```

En test direct tegen Kong:
```bash
# Direct naar Kong (lokaal)
curl -H "Host: api.wotis-cloud.com" http://localhost:8000/rest/v1/

# Via tunnel
curl https://api.wotis-cloud.com/rest/v1/
```

Als de eerste werkt maar de tweede niet, dan is het een Cloudflare config probleem.
Als beide niet werken, dan is het een Kong probleem.
