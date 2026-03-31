'use client'

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
    fetchLabels()
  }, [])

  const fetchLabels = async () => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/catalog/labels`)

      if (!response.ok) {
        throw new Error('Failed to fetch classification labels')
      }

      const data = await response.json()
      setLabels(data)
      setError(null)
    } catch (err) {
      setError('Failed to load filters')
      console.error('Labels fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="mb-8 space-y-6">
      {/* Style Filter */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Choose Your Style
        </h4>
        <div className="flex flex-wrap gap-2">
          {labels.styles.map((style) => {
            const isSelected = isStyleSelected(style)
            return (
              <button
                key={style}
                onClick={() => handleStyleClick(style)}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: isSelected ? 'var(--gold)' : 'var(--bg-secondary)',
                  border: '1px solid ' + (isSelected ? 'var(--gold)' : 'var(--border-light)'),
                  color: isSelected ? 'white' : 'var(--text-secondary)',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--panel)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-secondary)'
                  }
                }}
              >
                {style}
              </button>
            )
          })}
          {/* Surprise Me Button */}
          <button
            onClick={onSurpriseMe}
            className="px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--gold), #c9a959)',
              border: '1px solid var(--gold)',
              color: 'white',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(200, 170, 117, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(200, 170, 117, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(200, 170, 117, 0.3)'
            }}
          >
            ✨ Surprise me
          </button>
        </div>
      </div>

      {/* Feel Filter */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          How should it feel?
        </h4>
        <div className="flex flex-wrap gap-2">
          {labels.feels.map((feel) => {
            const isSelected = isFeelSelected(feel)
            return (
              <button
                key={feel}
                onClick={() => onFeelSelect(feel)}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: isSelected ? 'var(--gold)' : 'var(--bg-secondary)',
                  border: '1px solid ' + (isSelected ? 'var(--gold)' : 'var(--border-light)'),
                  color: isSelected ? 'white' : 'var(--text-secondary)',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--panel)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-secondary)'
                  }
                }}
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
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear all filters &mdash; Show all designs
          </button>
        </div>
      )}
    </div>
  )
}
