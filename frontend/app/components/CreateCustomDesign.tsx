'use client'

import { useState } from 'react'
import Image from 'next/image'

interface CreateCustomDesignProps {
  onGenerateWallpaper: (prompt: string, styleInspirations: string[]) => Promise<{ success: boolean; wallpaperUrl?: string; error?: string }>
  onApplyWallpaper: (wallpaperUrl: string) => Promise<{ success: boolean; previewUrl?: string; error?: string }>
  isGenerating: boolean
  jobStatus?: 'queued' | 'processing' | 'completed' | 'failed' | null
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
  jobStatus
}: CreateCustomDesignProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedStyleInspirations, setSelectedStyleInspirations] = useState<string[]>([])
  const [generatedWallpaper, setGeneratedWallpaper] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const handleStyleInspirationClick = (name: string) => {
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
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Generate Wallpaper Texture */}
      {!generatedWallpaper ? (
        <>
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Describe your dream wallpaper
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Luxurious warm and elegant wallpaper with subtle texture..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-all"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Style Inspiration */}
          <div>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Style inspiration (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_INSPIRATIONS.map((style) => {
                const isSelected = selectedStyleInspirations.includes(style.name)
                return (
                  <button
                    key={style.name}
                    onClick={() => handleStyleInspirationClick(style.name)}
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
                    {style.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Generate Button */}
          <div className="max-w-xs">
            <button
              onClick={handleGenerateClick}
              disabled={isGenerating || (!prompt && selectedStyleInspirations.length === 0)}
              className="w-full py-4 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isGenerating ? 'var(--border-light)' : 'linear-gradient(135deg, var(--gold), #c9a959)',
                color: 'white',
                boxShadow: !isGenerating ? '0 4px 12px rgba(200, 170, 117, 0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(200, 170, 117, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(200, 170, 117, 0.3)'
                }
              }}
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
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {jobStatus === 'queued' && 'AI service is busy right now. Retrying automatically...'}
                {jobStatus === 'processing' && 'Creating your custom wallpaper...'}
              </p>
            </div>
          )}
        </>
      ) : (
        /* Step 2: Review and Apply */
        <div className="space-y-6">
          <div className="text-center">
            <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Your Generated Wallpaper
            </h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Review the wallpaper texture. Apply it to your room if you&apos;re satisfied.
            </p>
          </div>

          {/* Wallpaper Preview - Centered with max width */}
          <div className="flex justify-center">
            <div className="relative rounded-lg overflow-hidden border-2 w-full max-w-xs" style={{ borderColor: 'var(--gold)' }}>
              <div className="aspect-square relative">
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
          <div className="space-y-3 max-w-xs mx-auto">
            <button
              onClick={handleApplyClick}
              disabled={isApplying}
              className="w-full py-4 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isApplying ? 'var(--border-light)' : 'linear-gradient(135deg, var(--gold), #c9a959)',
                color: 'white',
                boxShadow: !isApplying ? '0 4px 12px rgba(200, 170, 117, 0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isApplying) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(200, 170, 117, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isApplying) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(200, 170, 117, 0.3)'
                }
              }}
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
              className="w-full py-3 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!isApplying) {
                  e.currentTarget.style.background = 'var(--panel)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isApplying) {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                }
              }}
            >
              Generate New Design
            </button>
          </div>

          {/* Apply Error */}
          {applyError && (
            <div className="p-4 rounded-lg text-center max-w-xs mx-auto" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--text-secondary)' }}>
              <p className="text-sm">{applyError}</p>
              <button
                onClick={handleRegenerateClick}
                className="text-sm font-medium mt-2 hover:underline"
                style={{ color: 'var(--gold)' }}
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
