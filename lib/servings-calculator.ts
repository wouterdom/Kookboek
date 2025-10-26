/**
 * Servings Calculator Utility
 *
 * Handles proportional scaling of ingredient amounts based on servings changes
 * Intelligently handles edge cases like "naar smaak", fractions, and unit conversions
 */

/**
 * Scale an ingredient amount based on servings ratio
 * @param originalAmount - Original amount string (e.g., "400g", "2 stuks", "1 teentje")
 * @param originalServings - Original number of servings
 * @param newServings - New number of servings
 * @returns Scaled amount string
 */
export function scaleIngredientAmount(
  originalAmount: string,
  originalServings: number,
  newServings: number
): string {
  // If servings are the same, return original
  if (originalServings === newServings) {
    return originalAmount;
  }

  // Calculate ratio
  const ratio = newServings / originalServings;

  // Handle special cases that shouldn't be scaled
  const lowerAmount = originalAmount.toLowerCase();
  const noScaleKeywords = [
    'naar smaak',
    'naar believen',
    'snufje',
    'mespunt',
    'vleugje',
    'beetje',
    'scheutje',
  ];

  if (noScaleKeywords.some(keyword => lowerAmount.includes(keyword))) {
    return originalAmount;
  }

  // Try to parse and scale the amount
  const scaledAmount = parseAndScaleAmount(originalAmount, ratio);

  // If parsing failed, return original
  if (scaledAmount === null) {
    return originalAmount;
  }

  return scaledAmount;
}

/**
 * Parse amount string and scale it
 * @param amountStr - Amount string to parse
 * @param ratio - Scaling ratio
 * @returns Scaled amount string or null if parsing failed
 */
function parseAndScaleAmount(amountStr: string, ratio: number): string | null {
  // Pattern to match number at the start (including decimals and fractions)
  const patterns = [
    // Decimal numbers: "400g", "1.5 liter", "2,5 kg"
    /^([\d]+[,.]?[\d]*)\s*(.+)$/,
    // Fractions: "1/2 kopje", "3/4 theelepel"
    /^([\d]+\/[\d]+)\s*(.+)$/,
    // Mixed fractions: "1 1/2 kopje"
    /^([\d]+)\s+([\d]+\/[\d]+)\s*(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = amountStr.match(pattern);

    if (match) {
      if (match.length === 3) {
        // Simple number or fraction
        const [, numberStr, unit] = match;
        const number = parseNumber(numberStr);

        if (number !== null) {
          const scaled = number * ratio;
          return formatScaledAmount(scaled, unit.trim());
        }
      } else if (match.length === 4) {
        // Mixed fraction
        const [, whole, fraction, unit] = match;
        const wholeNum = parseFloat(whole);
        const fractionNum = parseFraction(fraction);

        if (!isNaN(wholeNum) && fractionNum !== null) {
          const total = wholeNum + fractionNum;
          const scaled = total * ratio;
          return formatScaledAmount(scaled, unit.trim());
        }
      }
    }
  }

  return null;
}

/**
 * Parse a number string (handles comma and dot decimals)
 * @param str - Number string
 * @returns Parsed number or null
 */
function parseNumber(str: string): number | null {
  // Replace comma with dot for parsing
  const normalized = str.replace(',', '.');

  // Handle fractions
  if (normalized.includes('/')) {
    return parseFraction(normalized);
  }

  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

/**
 * Parse a fraction string
 * @param str - Fraction string (e.g., "1/2", "3/4")
 * @returns Decimal value or null
 */
function parseFraction(str: string): number | null {
  const parts = str.split('/');
  if (parts.length !== 2) return null;

  const numerator = parseFloat(parts[0]);
  const denominator = parseFloat(parts[1]);

  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

/**
 * Format a scaled amount with smart rounding and unit handling
 * @param amount - Scaled numeric amount
 * @param unit - Unit string
 * @returns Formatted amount string
 */
function formatScaledAmount(amount: number, unit: string): string {
  // Determine appropriate precision based on unit
  let formatted: string;

  // For very small amounts, use fractions
  if (amount < 1 && amount > 0) {
    const fraction = decimalToFraction(amount);
    if (fraction) {
      return `${fraction} ${unit}`;
    }
  }

  // For amounts less than 10, use 1 decimal place
  if (amount < 10) {
    formatted = amount.toFixed(1);
    // Remove trailing .0
    formatted = formatted.replace(/\.0$/, '');
  }
  // For larger amounts, round to nearest integer or 0.5
  else {
    // Round to nearest 0.5 for better readability
    const rounded = Math.round(amount * 2) / 2;
    formatted = rounded.toString();
  }

  return `${formatted} ${unit}`;
}

/**
 * Convert decimal to common fraction
 * @param decimal - Decimal number
 * @returns Fraction string or null
 */
function decimalToFraction(decimal: number): string | null {
  const commonFractions: { [key: number]: string } = {
    0.125: '1/8',
    0.25: '1/4',
    0.333: '1/3',
    0.5: '1/2',
    0.666: '2/3',
    0.75: '3/4',
  };

  // Check for common fractions (with tolerance)
  for (const [value, fraction] of Object.entries(commonFractions)) {
    if (Math.abs(decimal - Number(value)) < 0.05) {
      return fraction;
    }
  }

  return null;
}

/**
 * Calculate new amount for all ingredients based on servings change
 * @param ingredients - Array of ingredients with amounts
 * @param originalServings - Original servings
 * @param newServings - New servings
 * @returns Map of ingredient ID to new amount
 */
export function calculateNewAmounts(
  ingredients: Array<{ id: string; amount: string }>,
  originalServings: number,
  newServings: number
): Map<string, string> {
  const newAmounts = new Map<string, string>();

  for (const ingredient of ingredients) {
    const newAmount = scaleIngredientAmount(
      ingredient.amount,
      originalServings,
      newServings
    );
    newAmounts.set(ingredient.id, newAmount);
  }

  return newAmounts;
}

/**
 * Smart rounding for ingredient quantities
 * Rounds to sensible values based on magnitude
 *
 * @param amount - Numeric amount
 * @returns Rounded amount
 */
export function smartRound(amount: number): number {
  // For very small amounts (< 1), round to nearest 0.1
  if (amount < 1) {
    return Math.round(amount * 10) / 10;
  }

  // For small amounts (1-10), round to nearest 0.5
  if (amount < 10) {
    return Math.round(amount * 2) / 2;
  }

  // For medium amounts (10-100), round to nearest 5
  if (amount < 100) {
    return Math.round(amount / 5) * 5;
  }

  // For large amounts, round to nearest 10
  return Math.round(amount / 10) * 10;
}

/**
 * Combine multiple amounts of the same ingredient
 * Used for aggregating grocery items from multiple recipes
 *
 * @param amounts - Array of amount strings to combine
 * @returns Combined amount string or null if combination not possible
 */
export function combineAmounts(amounts: string[]): string | null {
  if (amounts.length === 0) return null;
  if (amounts.length === 1) return amounts[0];

  // Try to extract numbers and units
  const parsed = amounts.map(amount => {
    const match = amount.match(/^([\d,.-]+)\s*(.+)$/);
    if (!match) return null;

    const number = parseNumber(match[1]);
    const unit = match[2].trim().toLowerCase();

    return number !== null ? { number, unit } : null;
  });

  // Check if all amounts were parseable
  if (parsed.some(p => p === null)) {
    // If we can't parse all, return concatenated string
    return amounts.join(' + ');
  }

  // Check if all units are the same
  const firstUnit = parsed[0]!.unit;
  const sameUnit = parsed.every(p => p!.unit === firstUnit);

  if (sameUnit) {
    // Sum all amounts
    const total = parsed.reduce((sum, p) => sum + p!.number, 0);
    return formatScaledAmount(total, firstUnit);
  }

  // Different units - try to convert or concatenate
  return amounts.join(' + ');
}

/**
 * Normalize ingredient name for comparison
 * Removes articles, plurals, and common variations
 *
 * @param name - Ingredient name
 * @returns Normalized name for matching
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove common prefixes
  const prefixes = ['de ', 'het ', 'een '];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length);
    }
  }

  // Remove parenthetical notes
  normalized = normalized.replace(/\([^)]*\)/g, '').trim();

  // Remove commas and extra spaces
  normalized = normalized.replace(/,/g, '').replace(/\s+/g, ' ');

  return normalized;
}
