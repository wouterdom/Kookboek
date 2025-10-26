/**
 * Ingredient Aggregator
 * Combines duplicate ingredients and their amounts
 */

export interface GroceryItem {
  id?: string
  name: string
  amount?: string
  original_amount?: string
  category_id?: string
  is_checked?: boolean
  from_recipe_id?: string
  sources?: string[] // Track which recipes contributed
}

interface ParsedAmount {
  value: number
  unit: string
  isRange: boolean
  rangeEnd?: number
}

// Unit conversion table (to base units)
const UNIT_CONVERSIONS: Record<string, { base: string; factor: number }> = {
  // Weight
  'kg': { base: 'g', factor: 1000 },
  'kilogram': { base: 'g', factor: 1000 },
  'g': { base: 'g', factor: 1 },
  'gram': { base: 'g', factor: 1 },
  'mg': { base: 'g', factor: 0.001 },
  'milligram': { base: 'g', factor: 0.001 },

  // Volume
  'l': { base: 'ml', factor: 1000 },
  'liter': { base: 'ml', factor: 1000 },
  'ml': { base: 'ml', factor: 1 },
  'milliliter': { base: 'ml', factor: 1 },
  'cl': { base: 'ml', factor: 10 },
  'centiliter': { base: 'ml', factor: 10 },
  'dl': { base: 'ml', factor: 100 },
  'deciliter': { base: 'ml', factor: 100 },

  // Cooking measures
  'el': { base: 'el', factor: 1 },
  'eetlepel': { base: 'el', factor: 1 },
  'eetlepels': { base: 'el', factor: 1 },
  'tl': { base: 'tl', factor: 1 },
  'theelepel': { base: 'tl', factor: 1 },
  'theelepels': { base: 'tl', factor: 1 },
  'kop': { base: 'kop', factor: 1 },
  'koppen': { base: 'kop', factor: 1 },

  // Pieces
  'stuk': { base: 'stuk', factor: 1 },
  'stuks': { base: 'stuk', factor: 1 },
  'st': { base: 'stuk', factor: 1 },
  'st.': { base: 'stuk', factor: 1 },
  'x': { base: 'stuk', factor: 1 }
}

/**
 * Parse amount string into structured data
 */
function parseAmount(amountStr?: string): ParsedAmount | null {
  if (!amountStr) return null

  const normalized = amountStr.toLowerCase().trim()

  // Handle ranges like "400-600g" or "2-3 stuks"
  const rangeMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*([a-zöüä]+)?/)
  if (rangeMatch) {
    const [, start, end, unit] = rangeMatch
    return {
      value: parseFloat(start.replace(',', '.')),
      rangeEnd: parseFloat(end.replace(',', '.')),
      unit: unit || 'stuk',
      isRange: true
    }
  }

  // Handle simple amounts like "400g" or "2 stuks" or "1 kop"
  const simpleMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*([a-zöüä]+)?/)
  if (simpleMatch) {
    const [, value, unit] = simpleMatch
    return {
      value: parseFloat(value.replace(',', '.')),
      unit: unit || 'stuk',
      isRange: false
    }
  }

  return null
}

/**
 * Convert amount to base unit
 */
function convertToBaseUnit(amount: ParsedAmount): ParsedAmount {
  const conversion = UNIT_CONVERSIONS[amount.unit]
  if (!conversion) return amount

  return {
    ...amount,
    value: amount.value * conversion.factor,
    rangeEnd: amount.rangeEnd ? amount.rangeEnd * conversion.factor : undefined,
    unit: conversion.base
  }
}

/**
 * Format amount with smart unit conversion
 */
function formatAmount(amount: ParsedAmount): string {
  const baseAmount = convertToBaseUnit(amount)

  // Convert back to user-friendly units if needed
  if (baseAmount.unit === 'g' && baseAmount.value >= 1000) {
    const kg = baseAmount.value / 1000
    const kgEnd = baseAmount.rangeEnd ? baseAmount.rangeEnd / 1000 : undefined
    if (baseAmount.isRange && kgEnd) {
      return `${kg}-${kgEnd} kg`
    }
    return `${kg} kg`
  }

  if (baseAmount.unit === 'ml' && baseAmount.value >= 1000) {
    const l = baseAmount.value / 1000
    const lEnd = baseAmount.rangeEnd ? baseAmount.rangeEnd / 1000 : undefined
    if (baseAmount.isRange && lEnd) {
      return `${l}-${lEnd} liter`
    }
    // Format to 1 decimal if needed
    return l === Math.floor(l) ? `${l} liter` : `${l.toFixed(1)} liter`
  }

  // Return original format for other units
  if (baseAmount.isRange && baseAmount.rangeEnd) {
    return `${baseAmount.value}-${baseAmount.rangeEnd} ${baseAmount.unit}`
  }

  // Handle whole numbers
  const displayValue = baseAmount.value === Math.floor(baseAmount.value)
    ? baseAmount.value.toString()
    : baseAmount.value.toFixed(1)

  return `${displayValue} ${baseAmount.unit}`
}

/**
 * Combine two amounts
 */
function combineAmounts(amount1?: string, amount2?: string): string {
  if (!amount1 && !amount2) return ''
  if (!amount1) return amount2 || ''
  if (!amount2) return amount1

  const parsed1 = parseAmount(amount1)
  const parsed2 = parseAmount(amount2)

  // If can't parse, just concatenate
  if (!parsed1 || !parsed2) {
    return `${amount1} + ${amount2}`
  }

  const base1 = convertToBaseUnit(parsed1)
  const base2 = convertToBaseUnit(parsed2)

  // If units don't match, concatenate
  if (base1.unit !== base2.unit) {
    return `${amount1} + ${amount2}`
  }

  // Combine values
  const combined: ParsedAmount = {
    value: base1.value + base2.value,
    unit: base1.unit,
    isRange: false
  }

  return formatAmount(combined)
}

/**
 * Normalize ingredient name for comparison
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')     // Normalize spaces
}

/**
 * Aggregate duplicate grocery items
 */
export function aggregateGroceryItems(items: GroceryItem[]): GroceryItem[] {
  const aggregated = new Map<string, GroceryItem>()

  for (const item of items) {
    const key = normalizeIngredientName(item.name)

    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!

      // Combine amounts
      existing.amount = combineAmounts(existing.amount, item.amount)

      // Track sources
      if (!existing.sources) existing.sources = []
      if (item.from_recipe_id && !existing.sources.includes(item.from_recipe_id)) {
        existing.sources.push(item.from_recipe_id)
      }

      // If from multiple sources, clear specific recipe reference
      if (existing.sources.length > 1) {
        existing.from_recipe_id = undefined
      }
    } else {
      // First occurrence
      const newItem = { ...item }
      if (item.from_recipe_id) {
        newItem.sources = [item.from_recipe_id]
      }
      aggregated.set(key, newItem)
    }
  }

  return Array.from(aggregated.values())
}

/**
 * Check if two ingredient names are similar
 */
export function areSimilarIngredients(name1: string, name2: string): boolean {
  const normalized1 = normalizeIngredientName(name1)
  const normalized2 = normalizeIngredientName(name2)

  return normalized1 === normalized2
}

/**
 * Parse and scale amount by serving ratio
 */
export function scaleAmount(amount: string | undefined, ratio: number): string {
  if (!amount) return ''

  const parsed = parseAmount(amount)
  if (!parsed) return amount

  const scaled: ParsedAmount = {
    ...parsed,
    value: parsed.value * ratio,
    rangeEnd: parsed.rangeEnd ? parsed.rangeEnd * ratio : undefined
  }

  return formatAmount(scaled)
}

/**
 * Get display text for multiple sources
 */
export function getSourcesLabel(sourceCount: number): string {
  if (sourceCount === 0) return ''
  if (sourceCount === 1) return '1 recept'
  return `${sourceCount} recepten`
}
