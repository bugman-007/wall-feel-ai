'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

interface StyleFeelFilterProps {
  selectedStyles: string[]
  selectedFeels: string[]
  onStyleSelect: (style: string) => void
  onFeelSelect: (feel: string) => void
  onSurpriseMe: () => void
}

interface ClassificationLabels {
  styles: string[]
  feels: string[]
}

let cachedLabels: ClassificationLabels | null = null
let labelsPromise: Promise<ClassificationLabels> | null = null

async function fetchLabelsOnce(): Promise<ClassificationLabels> {
  if (cachedLabels) {
    return cachedLabels
  }

  if (!labelsPromise) {
    labelsPromise = (async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/catalog/labels`)

      if (!response.ok) {
        throw new Error('Failed to fetch classification labels')
      }

      const data = await response.json()
      cachedLabels = data
      return data
    })()
      .finally(() => {
        labelsPromise = null
      })
  }

  return labelsPromise
}

export default function StyleFeelFilter({
  selectedStyles,
  selectedFeels,
  onStyleSelect,
  onFeelSelect,
  onSurpriseMe,
}: StyleFeelFilterProps) {
  const [labels, setLabels] = useState<ClassificationLabels | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    if (cachedLabels) {
      setLabels(cachedLabels)
      setLoading(false)
      return () => {
        isActive = false
      }
    }

    const loadLabels = async () => {
      try {
        setLoading(true)
        const data = await fetchLabelsOnce()
        if (!isActive) {
          return
        }

        setLabels(data)
        setError(null)
      } catch (err) {
        if (!isActive) {
          return
        }

        setError('Failed to load filters')
        console.error('Labels fetch error:', err)
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadLabels()

    return () => {
      isActive = false
    }
  }, [])

  const handleStyleClick = (style: string) => {
    if (style === 'Surprise me') {
      onSurpriseMe()
    } else {
      onStyleSelect(style)
    }
  }

  const isStyleSelected = (style: string) => selectedStyles.includes(style)
  const isFeelSelected = (feel: string) => selectedFeels.includes(feel)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8" style={{ border: '2px solid var(--border-light)', borderTopColor: 'var(--text-primary)' }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg text-center" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--text-secondary)' }}>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!labels) {
    return null
  }

  return (
    <div className="mb-8 space-y-6 filter-stack">
      {/* Style Filter */}
      <div>
        <h4 className="text-sm font-semibold mb-3 filter-heading">
          Choose Your Style
        </h4>
        <div className="flex flex-wrap gap-2 filter-chip-row">
          {labels.styles.map((style) => {
            const isSelected = isStyleSelected(style)
            return (
              <button
                key={style}
                onClick={() => handleStyleClick(style)}
                className={`filter-chip ${isSelected ? 'is-selected' : ''}`}
              >
                {style}
              </button>
            )
          })}
          {/* Surprise Me Button */}
          <button
            onClick={onSurpriseMe}
            className="filter-chip surprise-chip"
          >
            <Image
              src="/ui-icons/surprise-curation.png"
              alt=""
              width={18}
              height={18}
              className="surprise-chip-icon"
            />
            <span>Surprise me</span>
          </button>
        </div>
      </div>

      {/* Feel Filter */}
      <div>
        <h4 className="text-sm font-semibold mb-3 filter-heading">
          How should it feel?
        </h4>
        <div className="flex flex-wrap gap-2 filter-chip-row">
          {labels.feels.map((feel) => {
            const isSelected = isFeelSelected(feel)
            return (
              <button
                key={feel}
                onClick={() => onFeelSelect(feel)}
                className={`filter-chip ${isSelected ? 'is-selected' : ''}`}
              >
                {feel}
              </button>
            )
          })}
        </div>
      </div>

      {/* Clear Filters */}
      {(selectedStyles.length > 0 || selectedFeels.length > 0) && (
        <div className="text-center pt-2">
          <button
            onClick={() => {
              // Clear all filters by calling with currently selected items
              selectedStyles.forEach(s => onStyleSelect(s))
              selectedFeels.forEach(f => onFeelSelect(f))
            }}
            className="filter-clear"
          >
            Clear all filters &mdash; Show all designs
          </button>
        </div>
      )}
    </div>
  )
}
