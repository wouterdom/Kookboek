import puppeteer, { Browser } from 'puppeteer'

const TIMEOUT = 30000

interface ScrapedRecipe {
  html: string
  finalUrl: string
  success: boolean
  error?: string
}

export function hasLibelleLekkerCredentials(): boolean {
  return !!(process.env.LIBELLE_LEKKER_EMAIL && process.env.LIBELLE_LEKKER_PASSWORD)
}

/**
 * Generic scraper for websites that require JavaScript rendering
 */
export async function scrapeWithBrowser(recipeUrl: string, siteName: string = 'Site'): Promise<ScrapedRecipe> {
  let browser: Browser | null = null

  try {
    console.log(`[${siteName} Scraper] Starting browser for ${recipeUrl}`)

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions'
      ]
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    console.log(`[${siteName} Scraper] Navigating to ${recipeUrl}`)
    await page.goto(recipeUrl, { waitUntil: 'networkidle2', timeout: TIMEOUT })

    const finalUrl = page.url()
    console.log(`[${siteName} Scraper] Final URL: ${finalUrl}`)

    if (finalUrl.includes('login') || finalUrl.includes('sso.roularta.be') || finalUrl.includes('token.roularta.be')) {
      return {
        html: '',
        finalUrl,
        success: false,
        error: 'Recipe requires login. This recipe may be premium content.'
      }
    }

    await page.waitForSelector('body', { timeout: TIMEOUT })
    const html = await page.content()

    console.log(`[${siteName} Scraper] Successfully scraped recipe (${html.length} chars)`)

    return {
      html,
      finalUrl,
      success: true
    }

  } catch (error) {
    console.error(`[${siteName} Scraper] Error:`, error)
    return {
      html: '',
      finalUrl: recipeUrl,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scraping error'
    }
  } finally {
    if (browser) {
      await browser.close()
      console.log(`[${siteName} Scraper] Browser closed`)
    }
  }
}

export async function scrapeLibelleLekkerPublic(recipeUrl: string): Promise<ScrapedRecipe> {
  return scrapeWithBrowser(recipeUrl, 'Libelle Public')
}

export async function scrapeLibelleLekker(recipeUrl: string): Promise<ScrapedRecipe> {
  let browser: Browser | null = null

  try {
    const email = process.env.LIBELLE_LEKKER_EMAIL
    const password = process.env.LIBELLE_LEKKER_PASSWORD

    if (!email || !password) {
      return {
        html: '',
        finalUrl: recipeUrl,
        success: false,
        error: 'Libelle Lekker credentials not configured. Set LIBELLE_LEKKER_EMAIL and LIBELLE_LEKKER_PASSWORD'
      }
    }

    console.log(`[Libelle Scraper] Starting browser for ${recipeUrl}`)

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions'
      ]
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    console.log(`[Libelle Scraper] Navigating to ${recipeUrl}`)
    await page.goto(recipeUrl, { waitUntil: 'networkidle2', timeout: TIMEOUT })

    const currentUrl = page.url()
    console.log(`[Libelle Scraper] Current URL: ${currentUrl}`)

    const isLoginPage = currentUrl.includes('login') || currentUrl.includes('sso.roularta.be') || currentUrl.includes('token.roularta.be')

    if (isLoginPage) {
      console.log(`[Libelle Scraper] Login required, attempting authentication...`)

      await page.waitForSelector('input[type="email"], input[name="email"], input[id="email"]', { timeout: TIMEOUT })
      await page.type('input[type="email"], input[name="email"], input[id="email"]', email)
      console.log(`[Libelle Scraper] Entered email`)

      await page.type('input[type="password"], input[name="password"], input[id="password"]', password)
      console.log(`[Libelle Scraper] Entered password`)

      await Promise.all([
        page.click('button[type="submit"], input[type="submit"], button:has-text("Inloggen")'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: TIMEOUT })
      ])

      console.log(`[Libelle Scraper] Submitted login form`)
      await new Promise(resolve => setTimeout(resolve, 2000))

      const afterLoginUrl = page.url()
      console.log(`[Libelle Scraper] After login URL: ${afterLoginUrl}`)

      if (afterLoginUrl.includes('login') || afterLoginUrl.includes('error')) {
        return {
          html: '',
          finalUrl: afterLoginUrl,
          success: false,
          error: 'Login failed - invalid credentials or login page changed'
        }
      }

      if (!afterLoginUrl.includes('/bekijk-recept/')) {
        console.log(`[Libelle Scraper] Navigating back to recipe page...`)
        await page.goto(recipeUrl, { waitUntil: 'networkidle2', timeout: TIMEOUT })
      }
    }

    console.log(`[Libelle Scraper] Extracting recipe content...`)
    await page.waitForSelector('body', { timeout: TIMEOUT })

    const html = await page.content()
    const finalUrl = page.url()

    console.log(`[Libelle Scraper] Successfully scraped recipe (${html.length} chars)`)

    return {
      html,
      finalUrl,
      success: true
    }

  } catch (error) {
    console.error('[Libelle Scraper] Error:', error)
    return {
      html: '',
      finalUrl: recipeUrl,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scraping error'
    }
  } finally {
    if (browser) {
      await browser.close()
      console.log(`[Libelle Scraper] Browser closed`)
    }
  }
}
