'use client'

import { useEffect, useState } from 'react'
import { useLocalization } from '../contexts/LocalizationContext'

interface CatalogChildCategory {
  title: string
  handle: string
}

interface CatalogParentCategory {
  title: string
  handle: string
  children: CatalogChildCategory[]
}

interface CategoryFilterProps {
  selectedParentHandle: string | null
  selectedChildHandle: string | null
  onSelectionChange: (selection: {
    parentHandle: string | null
    childHandle: string | null
    activeLabel: string | null
  }) => void
}

let taxonomyPromise: Promise<CatalogParentCategory[]> | null = null

async function fetchCatalogTaxonomy(): Promise<CatalogParentCategory[]> {
  if (!taxonomyPromise) {
    taxonomyPromise = (async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/catalog/groups`)

      if (!response.ok) {
        throw new Error('Failed to fetch category groups')
      }

      const data = await response.json()
      return data.groups || []
    })().catch((error) => {
      taxonomyPromise = null
      throw error
    })
  }

  return taxonomyPromise
}

export default function CategoryFilter({
  selectedParentHandle,
  selectedChildHandle,
  onSelectionChange,
}: CategoryFilterProps) {
  const { messages } = useLocalization()
  const [groups, setGroups] = useState<CatalogParentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadGroups = async () => {
      try {
        setLoading(true)
        setError(null)
        const nextGroups = await fetchCatalogTaxonomy()
        if (!cancelled) {
          setGroups(nextGroups)
        }
      } catch (err) {
        console.error('Category fetch error:', err)
        if (!cancelled) {
          setError(messages.filter.failedToLoad)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadGroups()

    return () => {
      cancelled = true
    }
  }, [messages.filter.failedToLoad])

  const activeParent =
    groups.find((group) => group.handle === selectedParentHandle) || null

  const handleParentClick = (group: CatalogParentCategory) => {
    const isAlreadySelected = selectedParentHandle === group.handle && !selectedChildHandle

    onSelectionChange(
      isAlreadySelected
        ? { parentHandle: null, childHandle: null, activeLabel: null }
        : { parentHandle: group.handle, childHandle: null, activeLabel: group.title }
    )
  }

  const handleChildClick = (group: CatalogParentCategory, child: CatalogChildCategory) => {
    const isAlreadySelected =
      selectedParentHandle === group.handle && selectedChildHandle === child.handle

    onSelectionChange(
      isAlreadySelected
        ? { parentHandle: group.handle, childHandle: null, activeLabel: group.title }
        : { parentHandle: group.handle, childHandle: child.handle, activeLabel: child.title }
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div
          className="animate-spin rounded-full h-8 w-8"
          style={{ border: '2px solid var(--border-light)', borderTopColor: 'var(--text-primary)' }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg text-center"
        style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--text-secondary)' }}
      >
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (groups.length === 0) {
    return null
  }

  return (
    <div className="catalog-filter">
      <div className="catalog-filter-section">
        <p className="filter-heading">{messages.filter.parentLabel}</p>
        <div className="filter-chip-row catalog-filter-row flex flex-wrap">
          {groups.map((group) => {
            const isSelected = selectedParentHandle === group.handle

            return (
              <button
                key={group.handle}
                type="button"
                onClick={() => handleParentClick(group)}
                className={`filter-chip ${isSelected ? 'is-selected' : ''}`}
              >
                {group.title}
              </button>
            )
          })}
        </div>
      </div>

      {activeParent && (
        <div className="catalog-filter-section">
          <p className="filter-heading">{messages.filter.childLabel}</p>
          <div className="filter-chip-row catalog-filter-row flex flex-wrap">
            {activeParent.children.map((child) => {
              const isSelected = selectedChildHandle === child.handle

              return (
                <button
                  key={child.handle}
                  type="button"
                  onClick={() => handleChildClick(activeParent, child)}
                  className={`filter-chip ${isSelected ? 'is-selected' : ''}`}
                >
                  {child.title}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedParentHandle && (
        <div className="catalog-filter-clear">
          <button
            type="button"
            className="filter-clear"
            onClick={() => onSelectionChange({ parentHandle: null, childHandle: null, activeLabel: null })}
          >
            {messages.filter.clearSelection}
          </button>
        </div>
      )}
    </div>
  )
}
