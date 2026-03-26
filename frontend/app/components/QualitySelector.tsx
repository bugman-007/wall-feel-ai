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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {QUALITY_OPTIONS.map((option) => (
        <div
          key={option.id}
          onClick={() => onSelect(option.id)}
          className="card cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1"
          style={{
            border: selectedId === option.id ? '2px solid var(--text-primary)' : '1px solid var(--border-light)',
            boxShadow: selectedId === option.id ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            padding: '16px',
            textAlign: 'center'
          }}
        >
          {/* Selection Indicator */}
          {selectedId === option.id && (
            <div className="absolute top-2 right-2 rounded-full p-1" style={{ background: 'var(--text-primary)' }}>
              <svg className="w-3 h-3" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Quality Name */}
          <div className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {option.name}
          </div>

          {/* Resolution */}
          <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            {option.resolution}
          </div>

          {/* Estimated Time */}
          <div className="text-xs font-medium px-2 py-1 rounded-full inline-block" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            {option.estimatedTime}
          </div>
        </div>
      ))}
    </div>
  )
}
