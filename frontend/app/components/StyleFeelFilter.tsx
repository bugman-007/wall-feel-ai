'use client'

import { useState, useEffect } from 'react'
import { useLocalization } from '../contexts/LocalizationContext'

interface StyleFeelFilterProps {
  selectedStyles: string[]
  selectedFeels: string[]
  onStyleSelect: (style: string) => void
  onFeelSelect: (feel: string) => void
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
}: StyleFeelFilterProps) {
  const { messages } = useLocalization()
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

        setError(messages.filter.failedToLoad)
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
  }, [messages.filter.failedToLoad])

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
          {messages.filter.chooseStyle}
        </h4>
        <div className="flex flex-wrap gap-2 filter-chip-row">
          {labels.styles.map((style) => {
            const isSelected = isStyleSelected(style)
            return (
              <button
                key={style}
                onClick={() => onStyleSelect(style)}
                className={`filter-chip ${isSelected ? 'is-selected' : ''}`}
              >
                {style}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feel Filter */}
      <div>
        <h4 className="text-sm font-semibold mb-3 filter-heading">
          {messages.filter.chooseFeel}
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
            {messages.filter.clearAll}
          </button>
        </div>
      )}
    </div>
  )
}
