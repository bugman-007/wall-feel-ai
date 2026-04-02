'use client'

interface QualityOption {
  id: '1k' | '2k' | '4k' | '8k'
  name: string
  resolution: string
  estimatedTime: string
}

const QUALITY_OPTIONS: QualityOption[] = [
  { id: '1k', name: '1K', resolution: '1024 x 1024', estimatedTime: '30-40 seconds' },
  { id: '2k', name: '2K', resolution: '2048 x 2048', estimatedTime: '35-45 seconds' },
  { id: '4k', name: '4K', resolution: '4096 x 4096', estimatedTime: '~1 minute' },
  { id: '8k', name: '8K', resolution: '7680 x 7680', estimatedTime: '> 1 minute' },
]

interface QualitySelectorProps {
  selectedId: string
  onSelect: (quality: '1k' | '2k' | '4k' | '8k') => void
}

export default function QualitySelector({ selectedId, onSelect }: QualitySelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 quality-grid">
      {QUALITY_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          className={`card quality-card ${selectedId === option.id ? 'is-selected' : ''}`}
        >
          {/* Selection Indicator - black check in circle */}
          {selectedId === option.id && (
            <div className="quality-card-check">
              <svg className="w-3 h-3" style={{ color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Quality Name */}
          <div className="text-lg font-semibold mb-1 quality-card-title">
            {option.name}
          </div>

          {/* Resolution */}
          <div className="text-xs mb-2 quality-card-meta">
            {option.resolution}
          </div>

          {/* Estimated Time */}
          <div className="text-xs font-medium px-2 py-1 rounded-full inline-block quality-card-badge">
            {option.estimatedTime}
          </div>
        </button>
      ))}
    </div>
  )
}
