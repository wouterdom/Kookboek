# Libelle Lekker Recipe Import

## Overview

Automatic recipe import from Libelle Lekker using headless browser automation. This solution bypasses the JavaScript-based access control that prevents server-side scraping.

## The Problem

Libelle Lekker serves recipe content only when:
- JavaScript is executed
- Browser context is established
- Cookies/session state is created

Standard server-side `fetch()` gets redirected to login page because it doesn't execute JavaScript.

## The Solution

Three-tier fallback system:

1. **Public Scraper** (default) - No credentials needed
   - Uses Puppeteer headless browser
   - Executes JavaScript to load content
   - Works for all public recipes

2. **Authenticated Scraper** (optional) - For premium content
   - Automated login with stored credentials
   - Accesses subscriber-only recipes
   - Requires environment variables

3. **Paste Method** (fallback) - Manual import
   - User copies content from browser
   - Always works as last resort

## How It Works

```
URL Detection → Launch Headless Browser → Execute JavaScript
→ Load Recipe Content → Extract HTML → Process with Gemini AI → Save
```

**Time**: ~10-15 seconds per import
**Memory**: ~500MB during import (browser closes after)

## Files

### Core Implementation
- `lib/libelle-lekker-scraper.ts` - Puppeteer scraper service
- `app/api/import/route.ts` - Import API integration

### Configuration
Environment variables (optional, for premium content):
```env
LIBELLE_LEKKER_EMAIL=your-email@example.com
LIBELLE_LEKKER_PASSWORD=your-password
```

## Usage

### Public Recipes (No Setup Required)

Just paste the URL:
```
https://www.libelle-lekker.be/bekijk-recept/11733/klassieke-quiche-lorraine-1
```

The system automatically:
1. Detects Libelle Lekker URL
2. Launches headless browser
3. Scrapes content
4. Processes with AI
5. Saves recipe

### Premium Recipes (Requires Credentials)

1. Add credentials to `.env.local`:
```env
LIBELLE_LEKKER_EMAIL=your-email@example.com
LIBELLE_LEKKER_PASSWORD=your-password
```

2. Restart server
3. Import works for both public and premium recipes

## Technical Details

### Public Scraper Flow

```typescript
scrapeLibelleLekkerPublic(url)
  ↓
Launch Puppeteer browser
  ↓
Navigate to URL with JavaScript enabled
  ↓
Wait for content to load
  ↓
Extract full HTML
  ↓
Close browser
  ↓
Return HTML to Gemini AI
```

### Browser Configuration

```javascript
{
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions'
  ]
}
```

### Timeout Settings

- Page navigation: 30 seconds
- Element waiting: 30 seconds
- Post-redirect delay: 2 seconds

## Error Handling

**Login redirect detected**:
```
Recipe requires login. This recipe may be premium content.
```

**Scraping timeout**:
```
Navigation timeout of 30000 ms exceeded
```

**Fallback to paste method**:
```
🔒 Kon recept niet ophalen van Libelle Lekker

✅ Alternatief:
1. Open de receptpagina in je browser
2. Log in indien nodig
3. Selecteer en kopieer de hele pagina (Ctrl+A, Ctrl+C)
4. Gebruik "Plak Receptinhoud" hieronder
```

## Performance

**First-time import**: ~10-15 seconds
- Browser launch: ~2-3s
- Page load: ~5-8s
- Content extraction: ~1-2s
- AI processing: ~2-3s

**Resource usage**:
- Memory: ~500MB during import
- CPU: Medium (browser rendering)
- Disk: ~170MB (Chromium binary)

**After import**:
- Browser closes immediately
- Memory returns to baseline
- No persistent resources

## Security Considerations

### Public Scraper
✅ No credentials needed
✅ No sensitive data stored
✅ Safe for public recipes

### Authenticated Scraper
⚠️ Credentials in environment variables
⚠️ May violate ToS if detected
⚠️ Account risk if automated access blocked
✅ Credentials never sent to client
✅ Server-side execution only

## Deployment

### Development
```bash
npm run dev
```

### Production (Coolify)

1. Add environment variables in Coolify:
   - `LIBELLE_LEKKER_EMAIL` (optional)
   - `LIBELLE_LEKKER_PASSWORD` (optional)

2. Deploy as normal
3. Chromium installs automatically with Puppeteer

### Docker Considerations

Ensure Puppeteer dependencies are installed:
```dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils
```

## Troubleshooting

### "Browser not found"
```bash
npm install puppeteer
# Chromium downloads automatically
```

### "Navigation timeout"
- Increase `TIMEOUT` constant in `libelle-lekker-scraper.ts`
- Check internet connection
- Verify Libelle Lekker site is accessible

### "Login required" for public recipes
- Recipe may have been moved to premium
- Try authenticated scraper
- Use paste method as fallback

### High memory usage
- Normal during import (~500MB)
- Browser closes automatically after
- Memory is released

## Future Improvements

- [ ] Browser instance pooling (reuse for multiple imports)
- [ ] Session cookie caching (avoid repeated logins)
- [ ] Screenshot capture on errors (debugging)
- [ ] Support for other Roularta sites (Dagelijkse Kost, njam!)
- [ ] Parallel import of multiple recipes
- [ ] Progress tracking for long-running imports

## Maintenance

### When Libelle Lekker Changes Login Form

Update selectors in `scrapeLibelleLekker()`:
```typescript
// Email field
'input[type="email"], input[name="email"], input[id="email"]'

// Password field
'input[type="password"], input[name="password"], input[id="password"]'

// Submit button
'button[type="submit"], input[type="submit"], button:has-text("Inloggen")'
```

### When Site Structure Changes

Check Playwright snapshot and update extraction logic if needed.

## Testing

### Manual Test
1. Open import dialog
2. Paste URL: `https://www.libelle-lekker.be/bekijk-recept/11733/klassieke-quiche-lorraine-1`
3. Click "Importeren"
4. Verify recipe imports successfully

### Verify Public Access
```bash
node -e "
const { scrapeLibelleLekkerPublic } = require('./lib/libelle-lekker-scraper');
scrapeLibelleLekkerPublic('https://www.libelle-lekker.be/bekijk-recept/11733/klassieke-quiche-lorraine-1')
  .then(r => console.log('Success:', r.success, 'HTML length:', r.html.length))
"
```

## Dependencies

- `puppeteer` - Headless browser automation
- `@google/generative-ai` - Recipe extraction
- Chromium binary (~170MB, auto-downloaded)

## Cost

**Free tier** (public scraper):
- No API costs
- Only server resources

**With authentication**:
- Gemini AI: ~€0.02 per recipe
- Image generation: ~€0.04 per recipe
- Total: ~€0.06 per recipe

## Support

For issues or questions:
1. Check server logs for scraper output
2. Verify Puppeteer installation
3. Test with paste method as fallback
4. Review Libelle Lekker site for changes
