'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useLocalization } from '../contexts/LocalizationContext'
import { getCollectionDisplayName } from '../lib/catalogTaxonomy'

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
  selectedCollection?: string | null
  activeCollectionLabel?: string | null
  // Pre-fetch props (optional - if provided, component uses pre-fetched data)
  preFetchedData?: WallpaperDesign[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function WallpaperGrid({
  onWallpaperSelect,
  selectedId,
  selectedCollection,
  activeCollectionLabel,
  preFetchedData,
  isLoading: parentLoading,
  error: parentError,
  onRetry
}: WallpaperGridProps) {
  const { messages } = useLocalization()
  const [fetchedDesigns, setFetchedDesigns] = useState<WallpaperDesign[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

  const ITEMS_PER_PAGE = 12
  const usePreFetch = preFetchedData !== undefined && parentLoading !== undefined
  const designs = usePreFetch ? (preFetchedData || []) : fetchedDesigns
  const loading = usePreFetch ? (parentLoading || false) : fetchLoading
  const error = usePreFetch ? (parentError || null) : fetchError
  const totalPages = Math.ceil(designs.length / ITEMS_PER_PAGE)
  const paginatedDesigns = designs.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(0)
  }, [selectedCollection, preFetchedData])

  useEffect(() => {
    if (!usePreFetch) {
      fetchCatalog()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollection, usePreFetch])

  const fetchCatalog = async () => {
    try {
      setFetchLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      // Build query params
      const params = new URLSearchParams()
      if (selectedCollection) {
        params.set('collection', selectedCollection)
      }

      const url = `${apiUrl}/api/catalog/products${params.toString() ? `?${params.toString()}` : ''}`

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
        category: activeCollectionLabel || getCollectionDisplayName(product.shopifyCollections?.[0]),
        appCategories: product.appCategories || [],
        thumbnail_url: product.image || '',
        image: product.image,
        full_url: product.image || '',
        description: product.description || '',
        materials: product.materials || [],
        shopifyCollections: product.shopifyCollections || [],
        tags: product.tags || [],
        available: product.available !== false,
      }))

      setFetchedDesigns(normalizedDesigns)
      setFetchError(null)
    } catch (err) {
      setFetchError(messages.wallpaperGrid.failedToLoad)
      console.error('Catalog fetch error:', err)
    } finally {
      setFetchLoading(false)
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
      <div className="status-card status-card-error">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {error}
          </p>
        </div>
        <button
          onClick={onRetry || fetchCatalog}
          className="mt-3 text-sm font-medium btn-secondary py-2 px-4"
        >
          {messages.wallpaperGrid.tryAgain}
        </button>
      </div>
    )
  }

  if (designs.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
        <p>{messages.wallpaperGrid.noDesigns}</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 wallpaper-gallery">
        {paginatedDesigns.map((design) => (
          <button
            key={design.id}
            onClick={() => onWallpaperSelect(design)}
            className={`group relative overflow-hidden transition-all duration-300 card wallpaper-card ${selectedId === design.id ? 'is-selected' : ''}`}
          >
            {/* Gold glow overlay for selected state */}
            {selectedId === design.id && (
              <div className="absolute inset-0 pointer-events-none wallpaper-card-glow" />
            )}

            <div className="aspect-square relative wallpaper-card-media">
              <Image
                src={design.thumbnail_url}
                alt={design.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 transition-opacity duration-200 flex items-end wallpaper-card-overlay">
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
                <div className="wallpaper-card-check">
                  <svg className="w-4 h-4" style={{ color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* Name below image */}
            <div className="mt-2 px-1 wallpaper-card-caption">
              <p className="text-sm font-medium transition-colors wallpaper-card-title">
                {design.name}
              </p>
              <p className="text-xs wallpaper-card-category">
                {activeCollectionLabel || design.category}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6 wallpaper-pagination">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className={`pagination-btn ${currentPage === 0 ? 'is-disabled' : ''}`}
          >
            {messages.wallpaperGrid.previous}
          </button>
          <span className="text-sm pagination-status">
            {messages.common.page} {currentPage + 1} {messages.common.of} {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className={`pagination-btn ${currentPage === totalPages - 1 ? 'is-disabled' : ''}`}
          >
            {messages.wallpaperGrid.next}
          </button>
        </div>
      )}
    </>
  )
}
