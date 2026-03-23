// Pricing configuration
export const MATERIALS = {
  peel_stick: {
    name: 'Peel & Stick',
    price: 95, // £ per m²
    description: 'Easy to apply and remove, perfect for renters'
  },
  traditional: {
    name: 'Traditional Paste',
    price: 75, // £ per m²
    description: 'Classic wallpaper with paste application'
  },
  premium: {
    name: 'Premium Fabric',
    price: 120, // £ per m²
    description: 'Luxury fabric wallpaper for high-end finish'
  }
} as const

export type MaterialType = keyof typeof MATERIALS

export interface PricingCalculation {
  width: number
  height: number
  area: number
  wasteArea: number
  materialPrice: number
  subtotal: number
  total: number
}

/**
 * Calculate wallpaper pricing
 * @param width Wall width in meters
 * @param height Wall height in meters
 * @param material Material type
 * @returns Pricing breakdown
 */
export function calculatePrice(
  width: number,
  height: number,
  material: MaterialType
): PricingCalculation {
  // Calculate base area
  const area = width * height

  // Add 10% waste allowance
  const wasteArea = area * 1.1

  // Get material price
  const materialPrice = MATERIALS[material].price

  // Calculate costs
  const subtotal = area * materialPrice
  const total = wasteArea * materialPrice

  return {
    width,
    height,
    area,
    wasteArea,
    materialPrice,
    subtotal,
    total
  }
}

/**
 * Format price in GBP
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Validate dimensions
 */
export function validateDimensions(width: number, height: number): string | null {
  if (width < 0.5) return 'Width must be at least 0.5m'
  if (width > 10) return 'Width cannot exceed 10m'
  if (height < 0.5) return 'Height must be at least 0.5m'
  if (height > 10) return 'Height cannot exceed 10m'
  return null
}
