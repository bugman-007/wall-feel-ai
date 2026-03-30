'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Material {
  variantId: string
  name: string
  price: number
  currency: string
  available: boolean
  compareAtPrice?: number | null
}

interface WallpaperDesign {
  id: string
  handle?: string
  name: string
  title?: string
  category: string
  appCategories?: string[]
  thumbnail_url: string
  image?: string
  full_url: string
  description: string
  materials?: Material[]
  shopifyCollections?: string[]
  tags?: string[]
  available?: boolean
}

interface WallpaperGridProps {
  onWallpaperSelect: (design: WallpaperDesign) => void
  selectedId?: string | null
  selectedCategory?: string | null
}

export default function WallpaperGrid({ onWallpaperSelect, selectedId, selectedCategory }: WallpaperGridProps) {
  const [designs, setDesigns] = useState<WallpaperDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCatalog()
  }, [selectedCategory])

  const fetchCatalog = async () => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      // Fetch from Shopify-backed endpoint with optional category filter
      const url = selectedCategory
        ? `${apiUrl}/api/catalog/products?category=${encodeURIComponent(selectedCategory)}`
        : `${apiUrl}/api/catalog/products`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch catalog')
      }

      const data = await response.json()

      // Normalize Shopify data to our interface
      const normalizedDesigns = (data.products || []).map((product: any) => ({
        id: product.handle || product.id,
        handle: product.handle,
        name: product.title || product.name,
        title: product.title,
        category: product.appCategories?.[0] || product.shopifyCollections?.[0] || 'default',
        appCategories: product.appCategories || [],
        thumbnail_url: product.image || '',
        image: product.image,
        full_url: product.image || '',
        description: product.description || '',
        materials: product.materials || [],
        shopifyCollections: product.shopifyCollections || [],
        tags: product.tags || [],
        available: product.available !== false
      }))

      setDesigns(normalizedDesigns)
      setError(null)
    } catch (err) {
      setError('Failed to load wallpaper designs. Please try again.')
      console.error('Catalog fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12" style={{ border: '3px solid var(--border-light)', borderTopColor: 'var(--text-primary)' }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}>
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {error}
          </p>
        </div>
        <button
          onClick={fetchCatalog}
          className="mt-3 text-sm font-medium btn-secondary py-2 px-4"
        >
          Try again
        </button>
      </div>
    )
  }

  if (designs.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
        <p>No wallpaper designs available.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {designs.map((design) => (
        <button
          key={design.id}
          onClick={() => onWallpaperSelect(design)}
          className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 card"
          style={{
            border: selectedId === design.id ? '2px solid var(--gold)' : '1px solid var(--border-light)',
            boxShadow: selectedId === design.id ? '0 4px 12px rgba(200, 170, 117, 0.4)' : 'none',
            transform: selectedId === design.id ? 'scale(1.02)' : 'none'
          }}
        >
          {/* Gold glow overlay for selected state */}
          {selectedId === design.id && (
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px var(--gold)', zIndex: 10 }} />
          )}

          <div className="aspect-square relative" style={{ background: 'var(--bg-secondary)' }}>
            <Image
              src={design.thumbnail_url}
              alt={design.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 transition-opacity duration-200 flex items-end" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', opacity: 0 }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
              <div className="w-full p-3">
                <p className="text-white text-sm font-medium truncate">
                  {design.name}
                </p>
                <p className="text-white/80 text-xs truncate">
                  {design.description}
                </p>
              </div>
            </div>

            {/* Selected indicator - black check in circle */}
            {selectedId === design.id && (
              <div className="absolute top-2 right-2 rounded-full p-1 shadow-lg" style={{ background: '#1a1a1a' }}>
                <svg className="w-4 h-4" style={{ color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          {/* Name below image */}
          <div className="mt-2 px-1">
            <p className={`text-sm font-medium transition-colors ${selectedId === design.id ? 'text-primary' : ''}`} style={{ color: selectedId === design.id ? 'var(--gold)' : 'var(--text-primary)' }}>
              {design.name}
            </p>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
              {design.category}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
