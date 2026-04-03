'use client'

const COLLECTION_DISPLAY_NAMES: Record<string, string> = {
  business: 'Business',
  homes: 'Homes',
  children: 'Children',
  'school-daycare': 'School/Daycare',
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  'abstract-design-copy': 'Beauty salon',
  healthcare: 'Healthcare',
  'fast-food': 'Fast Food',
  'barber-shop': 'Barber Shop',
  'wooden-slats': 'Wooden Slats',
  'artificial-flower': 'Artificial Flower',
  marble: 'Marble',
  modern: 'Modern',
  agate: 'Agate',
  geometric: 'Geometric',
  nature: 'Nature',
  animal: 'Animal',
  educational: 'Educational',
  dreamland: 'Dreamland',
  motivation: 'Motivation',
}

export function getCollectionDisplayName(handle?: string | null): string {
  if (!handle) {
    return 'Catalog'
  }

  const normalized = handle.trim().toLowerCase()
  if (!normalized) {
    return 'Catalog'
  }

  return (
    COLLECTION_DISPLAY_NAMES[normalized] ||
    normalized
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  )
}
