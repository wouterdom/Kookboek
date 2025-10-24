/**
 * Publisher/Uitgever Normalization
 *
 * Normalizes publisher names to maintain consistency across imports
 * Maps common variations to canonical names
 */

interface PublisherMapping {
  [key: string]: string
}

/**
 * Canonical publisher names with common variations
 * Key: lowercase variant (without special chars/spaces)
 * Value: Canonical name (properly formatted)
 */
const PUBLISHER_MAPPINGS: PublisherMapping = {
  // Chloé Kookt variations
  'chloekookt': 'Chloé Kookt',
  'chloe kookt': 'Chloé Kookt',
  'chloe': 'Chloé Kookt',
  'chloé': 'Chloé Kookt',

  // Laura's Bakery variations
  'laurasbakery': "Laura's Bakery",
  'laura bakery': "Laura's Bakery",
  'laura s bakery': "Laura's Bakery",
  'lauras bakery': "Laura's Bakery",
  'laura': "Laura's Bakery",

  // Dagelijkse Kost variations
  'dagelijksekost': 'Dagelijkse Kost',
  'dagelijkse kost': 'Dagelijkse Kost',
  'dako': 'Dagelijkse Kost',

  // Jeroen Meus variations
  'jeroenmeus': 'Jeroen Meus',
  'jeroen meus': 'Jeroen Meus',
  'jeroen': 'Jeroen Meus',

  // Karola's Kitchen variations
  'karolaskitchen': "Karola's Kitchen",
  'karolas kitchen': "Karola's Kitchen",
  'karola': "Karola's Kitchen",

  // Ons Kookboek variations
  'onskookboek': 'Ons Kookboek',
  'ons kookboek': 'Ons Kookboek',

  // Other known publishers
  'knorr': 'Knorr',
  'solo': 'Solo',
  'tartesyaya': 'TartesYaYa',
  'tartes yaya': 'TartesYaYa',
  'tartes ya ya': 'TartesYaYa',
  'leukerecepten': 'Leuke Recepten',
  'leuke recepten': 'Leuke Recepten',
  'leukereceptennl': 'Leuke Recepten',
  'leukerecepten.nl': 'Leuke Recepten',

  // Import sources
  'foto opgeladen': 'Foto Upload',
  'fotoupload': 'Foto Upload',
  'handmatig ingevoerd': 'Handmatig',
  'pdf opgeladen': 'PDF Import',
  'pdfimport': 'PDF Import',
}

/**
 * Normalize publisher name to canonical form
 *
 * @param rawPublisher - Raw publisher name from AI or user input
 * @returns Normalized canonical publisher name
 *
 * @example
 * normalizePublisher('chloekookt') // → 'Chloé Kookt'
 * normalizePublisher('Chloe Kookt') // → 'Chloé Kookt'
 * normalizePublisher('JEROEN MEUS') // → 'Jeroen Meus'
 * normalizePublisher('Unknown Publisher') // → 'Unknown Publisher' (unchanged)
 */
export function normalizePublisher(rawPublisher: string | null | undefined): string | null {
  if (!rawPublisher || rawPublisher.trim().length === 0) {
    return null
  }

  // Step 1: Clean input (lowercase, remove extra spaces/special chars)
  const cleaned = rawPublisher
    .toLowerCase()
    .trim()
    .replace(/['']/g, '') // Remove apostrophes for matching
    .replace(/\s+/g, ' ') // Normalize spaces

  // Step 2: Check direct mapping
  if (PUBLISHER_MAPPINGS[cleaned]) {
    return PUBLISHER_MAPPINGS[cleaned]
  }

  // Step 3: Try fuzzy matching (remove all spaces and special chars)
  const fuzzy = cleaned.replace(/[\s\-_]/g, '')
  for (const [key, value] of Object.entries(PUBLISHER_MAPPINGS)) {
    const fuzzyKey = key.replace(/[\s\-_]/g, '')
    if (fuzzy === fuzzyKey) {
      return value
    }
  }

  // Step 4: No match found, return title-cased version of input
  return toTitleCase(rawPublisher.trim())
}

/**
 * Convert string to Title Case with Dutch name handling
 *
 * @example
 * toTitleCase('hello world') // → 'Hello World'
 * toTitleCase('JEROEN MEUS') // → 'Jeroen Meus'
 * toTitleCase('jaimy van dijke') // → 'Jaimy van Dijke' (lowercase 'van')
 */
function toTitleCase(str: string): string {
  // Words that should remain lowercase in Dutch names
  const lowercaseWords = ['van', 'de', 'der', 'den', 'het', 'ter', 'te', 'ten']

  return str
    .split(' ')
    .map((word, index) => {
      if (word.length === 0) return word

      // Keep certain words lowercase (except at the start)
      if (index > 0 && lowercaseWords.includes(word.toLowerCase())) {
        return word.toLowerCase()
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Get all known canonical publisher names
 * Useful for suggesting to AI or providing autocomplete
 */
export function getKnownPublishers(): string[] {
  const publishers = new Set(Object.values(PUBLISHER_MAPPINGS))
  return Array.from(publishers).sort()
}

/**
 * Generate AI prompt hint with known publishers
 * Helps AI extract correct publisher names
 */
export function getPublisherHintForAI(): string {
  const known = getKnownPublishers()
  return `Common publishers to look for: ${known.slice(0, 10).join(', ')}, etc.`
}
