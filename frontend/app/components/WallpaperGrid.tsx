'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface WallpaperDesign {
  id: string
  name: string
  category: string
  thumbnail_url: string
  full_url: string
  description: string
}

interface WallpaperGridProps {
  onWallpaperSelect: (design: WallpaperDesign) => void
  selectedId?: string | null
}

export default function WallpaperGrid({ onWallpaperSelect, selectedId }: WallpaperGridProps) {
  const [designs, setDesigns] = useState<WallpaperDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCatalog()
  }, [])

  const fetchCatalog = async () => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/catalog`)

      if (!response.ok) {
        throw new Error('Failed to fetch catalog')
      }

      const data = await response.json()
      setDesigns(data.designs || [])
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {error}
          </p>
        </div>
        <button
          onClick={fetchCatalog}
          className="mt-3 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
        >
          Try again
        </button>
      </div>
    )
  }

  if (designs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
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
          className={`
            group relative rounded-lg overflow-hidden transition-all duration-200
            ${selectedId === design.id
              ? 'ring-4 ring-blue-500 scale-105'
              : 'hover:scale-105 hover:shadow-lg'
            }
          `}
        >
          <div className="aspect-square relative bg-gray-200 dark:bg-gray-700">
            <Image
              src={design.thumbnail_url}
              alt={design.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-200 flex items-end">
              <div className="w-full p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-white text-sm font-medium truncate">
                  {design.name}
                </p>
                <p className="text-white/80 text-xs truncate">
                  {design.description}
                </p>
              </div>
            </div>

            {/* Selected indicator */}
            {selectedId === design.id && (
              <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Name below image */}
          <div className="mt-2 px-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {design.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {design.category}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
