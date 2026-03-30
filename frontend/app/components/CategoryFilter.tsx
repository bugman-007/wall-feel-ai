'use client'

import { useState, useEffect } from 'react'

interface CategoryGroup {
  name: string
  categories: string[]
}

interface CategoryFilterProps {
  selectedCategory: string | null
  onCategorySelect: (category: string | null) => void
}

export default function CategoryFilter({ selectedCategory, onCategorySelect }: CategoryFilterProps) {
  const [groups, setGroups] = useState<CategoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  useEffect(() => {
    fetchCategoryGroups()
  }, [])

  const fetchCategoryGroups = async () => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/catalog/groups`)

      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }

      const data = await response.json()
      setGroups(data.groups || [])

      // Auto-expand first group
      if (data.groups && data.groups.length > 0) {
        setExpandedGroup(data.groups[0].name)
      }
    } catch (err) {
      setError('Failed to load categories')
      console.error('Category fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryClick = (category: string) => {
    onCategorySelect(category === selectedCategory ? null : category)
  }

  const toggleGroup = (groupName: string) => {
    setExpandedGroup(expandedGroup === groupName ? null : groupName)
  }

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

  if (groups.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      {/* Category Groups */}
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.name} className="rounded-lg overflow-hidden" style={{ background: 'var(--panel)' }}>
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.name)}
              className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:bg-opacity-50"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {group.name}
              </span>
              <svg
                className={`w-5 h-5 transition-transform ${expandedGroup === group.name ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-muted)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Group Categories */}
            {expandedGroup === group.name && (
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {group.categories.map((category) => {
                  const isSelected = selectedCategory === category
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'text-white'
                          : 'hover:bg-opacity-50'
                      }`}
                      style={{
                        background: isSelected ? 'var(--gold)' : 'var(--bg-secondary)',
                        border: isSelected ? '1px solid var(--gold)' : '1px solid var(--border-light)',
                        color: isSelected ? 'white' : 'var(--text-secondary)'
                      }}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Clear Selection */}
      {selectedCategory && (
        <div className="mt-4 text-center">
          <button
            onClick={() => onCategorySelect(null)}
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear filter &mdash; Show all designs
          </button>
        </div>
      )}
    </div>
  )
}
