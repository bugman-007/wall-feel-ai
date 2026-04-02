'use client'

import { useState } from 'react'
import Image from 'next/image'

interface CreateCustomDesignProps {
  onGenerateWallpaper: (prompt: string, styleInspirations: string[]) => Promise<{ success: boolean; wallpaperUrl?: string; error?: string }>
  onApplyWallpaper: (wallpaperUrl: string) => Promise<{ success: boolean; previewUrl?: string; error?: string }>
  isGenerating: boolean
  jobStatus?: 'queued' | 'processing' | 'completed' | 'failed' | null
  generationError?: string | null
  onClearGenerationError: () => void
}

const STYLE_INSPIRATIONS = [
  { name: 'Tropical Paradise' },
  { name: 'Warm Minimal Texture' },
  { name: 'Luxury Marble Pattern' },
  { name: 'Organic Botanical' },
]

export default function CreateCustomDesign({
  onGenerateWallpaper,
  onApplyWallpaper,
  isGenerating,
  jobStatus,
  generationError,
  onClearGenerationError
}: CreateCustomDesignProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedStyleInspirations, setSelectedStyleInspirations] = useState<string[]>([])
  const [generatedWallpaper, setGeneratedWallpaper] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const handleStyleInspirationClick = (name: string) => {
    onClearGenerationError()
    setSelectedStyleInspirations(prev =>
      prev.includes(name)
        ? prev.filter(s => s !== name)
        : [...prev, name]
    )
  }

  const handleGenerateClick = async () => {
    if (!prompt && selectedStyleInspirations.length === 0) {
      return
    }

    onClearGenerationError()
    const result = await onGenerateWallpaper(prompt, selectedStyleInspirations)
    if (result.success && result.wallpaperUrl) {
      setGeneratedWallpaper(result.wallpaperUrl)
      setApplyError(null)
    }
  }

  const handleApplyClick = async () => {
    if (!generatedWallpaper) return

    setIsApplying(true)
    setApplyError(null)

    const result = await onApplyWallpaper(generatedWallpaper)

    setIsApplying(false)

    if (!result.success) {
      setApplyError(result.error || 'Failed to apply wallpaper')
    }
    // On success, the parent component will handle showing the preview
  }

  const handleRegenerateClick = () => {
    setGeneratedWallpaper(null)
    setApplyError(null)
    onClearGenerationError()
  }

  return (
    <div className="space-y-6 custom-design-shell">
      {/* Step 1: Generate Wallpaper Texture */}
      {!generatedWallpaper ? (
        <>
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-semibold mb-2 luxury-label">
              Describe your dream wallpaper
            </label>
            <textarea
              value={prompt}
              onChange={(e) => {
                onClearGenerationError()
                setPrompt(e.target.value)
              }}
              placeholder="Luxurious warm and elegant wallpaper with subtle texture..."
              rows={3}
              className="w-full luxury-textarea"
            />
          </div>

          {/* Style Inspiration */}
          <div>
            <label className="block text-sm font-semibold mb-3 luxury-label">
              Style inspiration (optional)
            </label>
            <div className="flex flex-wrap gap-2 filter-chip-row">
              {STYLE_INSPIRATIONS.map((style) => {
                const isSelected = selectedStyleInspirations.includes(style.name)
                return (
                  <button
                    key={style.name}
                    onClick={() => handleStyleInspirationClick(style.name)}
                    className={`filter-chip ${isSelected ? 'is-selected' : ''}`}
                  >
                    {style.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Generate Button */}
          <div className="max-w-xs action-stack">
            <button
              onClick={handleGenerateClick}
              disabled={isGenerating || (!prompt && selectedStyleInspirations.length === 0)}
              className="luxury-submit-btn"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>
                    {jobStatus === 'queued' && 'Queued for generation...'}
                    {jobStatus === 'processing' && 'Generating wallpaper...'}
                    {!jobStatus && 'Generating Wallpaper...'}
                  </span>
                </span>
              ) : (
                'Generate Wallpaper'
              )}
            </button>
          </div>

          {/* Job Status Message */}
          {isGenerating && jobStatus && (
            <div className="text-center max-w-xs mx-auto">
              <p className="text-sm inline-status">
                {jobStatus === 'queued' && 'AI service is busy right now. Retrying automatically...'}
                {jobStatus === 'processing' && 'Creating your custom wallpaper...'}
              </p>
            </div>
          )}

          {generationError && (
            <div className="status-card status-card-error text-center max-w-md">
              <p className="text-sm">{generationError}</p>
            </div>
          )}
        </>
      ) : (
        /* Step 2: Review and Apply */
        <div className="space-y-6 generated-review-shell">
          <div className="text-center generated-review-header">
            <h4 className="text-lg font-semibold mb-2 generated-review-title">
              Your Generated Wallpaper
            </h4>
            <p className="text-sm generated-review-copy">
              Review the wallpaper texture. Apply it to your room if you&apos;re satisfied.
            </p>
          </div>

          {/* Wallpaper Preview - Centered with max width */}
          <div className="flex justify-center">
            <div className="generated-wallpaper-stage">
              <div className="aspect-square relative generated-wallpaper-media">
                <Image
                  src={generatedWallpaper}
                  alt="Generated wallpaper texture"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 20vw"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 max-w-xs mx-auto action-stack">
            <button
              onClick={handleApplyClick}
              disabled={isApplying}
              className="luxury-submit-btn"
            >
              {isApplying ? (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Applying to Room...</span>
                </span>
              ) : (
                'Apply to Room'
              )}
            </button>

            <button
              onClick={handleRegenerateClick}
              disabled={isApplying}
              className="luxury-secondary-btn"
            >
              Generate New Design
            </button>
          </div>

          {/* Apply Error */}
          {applyError && (
            <div className="status-card status-card-error text-center max-w-xs mx-auto">
              <p className="text-sm">{applyError}</p>
              <button
                onClick={handleRegenerateClick}
                className="text-sm font-medium mt-2 luxury-inline-link"
              >
                Try a different design
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
