# CORS Issue - 2025-11-01

## Probleem

Lokale app (`http://192.168.1.63:3000`) krijgt CORS errors bij direct fetchen naar Supabase API via Cloudflare Tunnel:

```
Access to fetch at 'https://api.wotis-cloud.com/rest/v1/weekly_menu_items?select=recipe_id&week_date=eq.2025-10-27'
from origin 'http://192.168.1.63:3000' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Oorzaak

- Frontend code probeert direct naar externe Supabase API te fetchen
- Browser blokkeert dit vanwege verschillende origins (CORS policy)
- Kong Gateway heeft geen CORS headers geconfigureerd voor externe origins

## Oplossing Morgen

1. **Next.js API Routes gebruiken** (aanbevolen)
   - Alle Supabase calls via `/api/*` routes
   - Server-side heeft geen CORS beperkingen
   - Client-side fetcht naar same-origin

2. **Kong CORS Configuratie**
   - Als optie: Kong configureren met CORS headers
   - Toevoegen van `Access-Control-Allow-Origin: *` (of specific origins)

3. **Verificatie na Redeploy**
   - Check of de nieuwe container de juiste NEXT_PUBLIC_SUPABASE_URL gebruikt
   - Test dat client-side code via API routes gaat, niet direct

## Status

⏸️ **On Hold** - Moet morgen opgelost worden na correcte deployment.
