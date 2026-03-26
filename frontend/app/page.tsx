'use client'

import { useState } from 'react'
import ImageUpload from './components/ImageUpload'
import WallpaperGrid from './components/WallpaperGrid'
import PreviewDisplay from './components/PreviewDisplay'
import ThemeToggle from './components/ThemeToggle'
import QualitySelector from './components/QualitySelector'

interface WallpaperDesign {
  id: string
  name: string
  category: string
  thumbnail_url: string
  full_url: string
  description: string
}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<{
    file: File
    preview: string
    uploadedUrl?: string
  } | null>(null)
  const [selectedWallpaper, setSelectedWallpaper] = useState<WallpaperDesign | null>(null)
  const [selectedQuality, setSelectedQuality] = useState<'1k' | '2k' | '4k' | '8k'>('1k')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleImageSelect = (file: File, preview: string, uploadedUrl?: string) => {
    setSelectedImage({ file, preview, uploadedUrl })
    setGenerateError(null)
    setPreviewUrl(null)
  }

  const handleWallpaperSelect = (design: WallpaperDesign) => {
    setSelectedWallpaper(design)
  }

  // Generate preview - single step, no manual wall selection
  const handleGeneratePreview = async () => {
    if (!selectedWallpaper || !selectedImage?.uploadedUrl) {
      setGenerateError('Please upload an image and select a wallpaper')
      return
    }

    setIsGenerating(true)
    setGenerateError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/ai-generate-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: selectedImage.uploadedUrl,
          wallpaper_id: selectedWallpaper.id,
          quality: selectedQuality,
        })
      })

      if (!response.ok) {
        throw new Error('Preview generation failed')
      }

      const data = await response.json()

      if (data.success && data.preview_url) {
        setPreviewUrl(data.preview_url)
      } else {
        throw new Error('No preview URL in response')
      }

    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate preview. Please try again.')
      console.error('Generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setPreviewUrl(null)
    setGenerateError(null)
    setSelectedWallpaper(null)
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <ThemeToggle />
      <div className="container-max">
        {/* Header */}
        <header className="text-center py-16">
          <h1 style={{ color: 'var(--text-primary)' }}>Wallfeel AI Visualizer</h1>
          <p className="text-xl mt-4" style={{ color: 'var(--text-secondary)' }}>
            Visualize wallpaper designs on your walls with AI
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Upload → Choose → Done
          </p>
        </header>

        {/* Step 1: Upload Section */}
        <section className="section">
          <h2 style={{ color: 'var(--text-primary)' }}>1. Upload Your Room Photo</h2>
          <div className="mt-6">
            <ImageUpload onImageSelect={handleImageSelect} />
          </div>
        </section>

        {/* Step 2: Choose Wallpaper */}
        {selectedImage && (
          <section className="section">
            <h2 style={{ color: 'var(--text-primary)' }}>2. Choose Your Wallpaper Design</h2>
            <div className="mt-6">
              <WallpaperGrid
                onWallpaperSelect={handleWallpaperSelect}
                selectedId={selectedWallpaper?.id}
              />
            </div>
          </section>
        )}

        {/* Step 3: Choose Quality */}
        {selectedImage && selectedWallpaper && !previewUrl && (
          <section className="section">
            <h2 style={{ color: 'var(--text-primary)' }}>3. Choose Output Quality</h2>
            <div className="mt-6">
              <QualitySelector
                selectedId={selectedQuality}
                onSelect={setSelectedQuality}
              />
            </div>
          </section>
        )}

        {/* Step 4: Generate Preview */}
        {selectedImage && selectedWallpaper && !previewUrl && (
          <section className="section">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-center" style={{ color: 'var(--text-primary)' }}>4. Generate Preview</h2>

              <div className="card mt-6 p-6">
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  AI will automatically detect walls and apply the wallpaper
                </p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Selected quality: <strong>{selectedQuality.toUpperCase()}</strong> (Estimated time: {selectedQuality === '1k' ? '30-40' : selectedQuality === '2k' ? '35-45' : selectedQuality === '4k' ? '~1 minute' : '> 1 minute'} seconds)
                </p>
                <button
                  onClick={handleGeneratePreview}
                  disabled={isGenerating}
                  className={`btn-primary text-lg ${isGenerating ? 'opacity-50' : ''}`}
                >
                  {isGenerating ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Generating Preview...</span>
                    </span>
                  ) : (
                    'Generate Preview with AI'
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Generation Error */}
        {generateError && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="card" style={{ borderColor: '#ef4444' }}>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {generateError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Preview Display */}
        {previewUrl && selectedImage?.preview && (
          <section className="section">
            <h2 className="text-center" style={{ color: 'var(--text-primary)' }}>Your Preview</h2>
            <PreviewDisplay
              originalUrl={selectedImage.preview}
              previewUrl={previewUrl}
              onClose={() => setPreviewUrl(null)}
              quality={selectedQuality}
            />
          </section>
        )}

        {/* Progress Summary */}
        {(selectedImage || selectedWallpaper || previewUrl) && (
          <div className="max-w-2xl mx-auto mb-16">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Your Progress
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  {selectedImage ? (
                    <>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
                        <svg className="w-3 h-3" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span style={{ color: 'var(--text-secondary)' }}>Room photo uploaded</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span style={{ color: 'var(--text-muted)' }}>No room photo selected</span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {selectedWallpaper ? (
                    <>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
                        <svg className="w-3 h-3" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span style={{ color: 'var(--text-secondary)' }}>Wallpaper: {selectedWallpaper.name}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span style={{ color: 'var(--text-muted)' }}>No wallpaper selected</span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {previewUrl ? (
                    <>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
                        <svg className="w-3 h-3" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span style={{ color: 'var(--text-secondary)' }}>Preview generated</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span style={{ color: 'var(--text-muted)' }}>Preview not generated yet</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
