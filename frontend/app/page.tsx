'use client'

import { useState } from 'react'
import ImageUpload from './components/ImageUpload'
import WallpaperGrid from './components/WallpaperGrid'
import WallDetectionStep from './components/WallDetectionStep'
import PreviewDisplay from './components/PreviewDisplay'
import MeasurementsForm from './components/MeasurementsForm'
import CheckoutButton from './components/CheckoutButton'
import ThemeToggle from './components/ThemeToggle'
import { MaterialType } from './utils/pricing'

interface WallpaperDesign {
  id: string
  name: string
  category: string
  thumbnail_url: string
  full_url: string
  description: string
}

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<{
    file: File
    preview: string
    uploadedUrl?: string
  } | null>(null)
  const [selectedWallpaper, setSelectedWallpaper] = useState<WallpaperDesign | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const handleImageSelect = (file: File, preview: string, uploadedUrl?: string) => {
    setSelectedImage({ file, preview, uploadedUrl })
    setGenerateError(null)
  }

  const handleWallpaperSelect = (design: WallpaperDesign) => {
    setSelectedWallpaper(design)
  }

  const [wallSegmentation, setWallSegmentation] = useState<{
    segmentation: number[][]
    boundingBox: BoundingBox
    source: 'auto' | 'manual'
  } | null>(null)
  const [showWallDetection, setShowWallDetection] = useState(false)

  const [previewData, setPreviewData] = useState<{
    originalUrl: string
    previewUrl: string
  } | null>(null)
  const [showPricing, setShowPricing] = useState(false)
  const [orderData, setOrderData] = useState<{
    width: number
    height: number
    material: MaterialType
    price: number
  } | null>(null)

  // Handle wall detection complete
  const handleWallDetected = (segmentation: number[][], boundingBox: BoundingBox, source: 'auto' | 'manual') => {
    setWallSegmentation({
      segmentation,
      boundingBox,
      source
    })
    setShowWallDetection(false)
  }

  // Handle skip wall detection
  const handleSkipWallDetection = () => {
    // Use full image as fallback
    setWallSegmentation({
      segmentation: [[0, 0], [800, 0], [800, 600], [0, 600]],
      boundingBox: { x: 0, y: 0, width: 800, height: 600 },
      source: 'manual'
    })
    setShowWallDetection(false)
  }

  // Start wall detection step
  const handleStartWallDetection = () => {
    setShowWallDetection(true)
  }

  // Generate preview with wall segmentation
  const handleGeneratePreview = async () => {
    if (!selectedWallpaper || !selectedImage?.uploadedUrl || !wallSegmentation) {
      setGenerateError('Please upload an image, select a wallpaper, and detect the wall first')
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
          segmentation: wallSegmentation.segmentation,
          source: wallSegmentation.source
        })
      })

      if (!response.ok) {
        throw new Error('Preview generation failed')
      }

      const data = await response.json()
      setPreviewData({
        originalUrl: selectedImage.preview,
        previewUrl: data.preview_url
      })

    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate preview. Please try again.')
      console.error('Generation error:', err)
    } finally {
      setIsGenerating(false)
    }
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
            Upload → Choose → Preview
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

        {/* Step 3: Wall Detection */}
        {selectedImage && selectedWallpaper && !wallSegmentation && !showWallDetection && (
          <section className="section">
            <h2 className="text-center" style={{ color: 'var(--text-primary)' }}>3. Detect Wall Area</h2>
            <div className="flex justify-center mt-8">
              <button
                onClick={handleStartWallDetection}
                className="btn-primary text-lg"
              >
                Detect Wall with AI
              </button>
            </div>
          </section>
        )}

        {/* Wall Detection Step */}
        {showWallDetection && (
          <section className="section">
            <WallDetectionStep
              imageUrl={selectedImage!.uploadedUrl || selectedImage!.preview}
              onWallDetected={handleWallDetected}
              onSkip={handleSkipWallDetection}
            />
          </section>
        )}

        {/* Step 4: Generate Preview */}
        {selectedImage && selectedWallpaper && wallSegmentation && !previewData && (
          <section className="section">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-center" style={{ color: 'var(--text-primary)' }}>4. Generate Preview</h2>

              {/* Wall selection summary */}
              <div className="card flex items-center space-x-4 mt-6">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Wall area {wallSegmentation.source === 'auto' ? 'AI detected' : 'manually selected'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {wallSegmentation.boundingBox.width.toFixed(0)} × {wallSegmentation.boundingBox.height.toFixed(0)} px
                  </p>
                </div>
              </div>

              <div className="flex justify-center space-x-4 mt-8">
                <button
                  onClick={handleStartWallDetection}
                  className="btn-secondary"
                >
                  Re-select Wall
                </button>
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
        {previewData && !showPricing && (
          <section className="section">
            <h2 className="text-center" style={{ color: 'var(--text-primary)' }}>3. Your Preview</h2>
            <PreviewDisplay
              originalUrl={previewData.originalUrl}
              previewUrl={previewData.previewUrl}
              onClose={() => setPreviewData(null)}
            />
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowPricing(true)}
                className="btn-primary text-lg"
              >
                Continue to Pricing
              </button>
            </div>
          </section>
        )}

        {/* Measurements & Pricing */}
        {showPricing && !orderData && (
          <section className="section">
            <h2 className="text-center" style={{ color: 'var(--text-primary)' }}>4. Measurements & Pricing</h2>
            <div className="mt-6">
              <MeasurementsForm
                onProceedToCheckout={(data) => {
                  setOrderData(data)
                }}
              />
            </div>
          </section>
        )}

        {/* Checkout */}
        {orderData && (
          <section className="section">
            <h2 className="text-center" style={{ color: 'var(--text-primary)' }}>5. Checkout</h2>
            <div className="max-w-2xl mx-auto card mt-8">
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>Order Summary</h3>
                <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex justify-between">
                    <span>Dimensions:</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{orderData.width}m × {orderData.height}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Area:</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{(orderData.width * orderData.height).toFixed(2)} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Material:</span>
                    <span className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{orderData.material.replace('_', ' ')}</span>
                  </div>
                  {selectedWallpaper && (
                    <div className="flex justify-between">
                      <span>Wallpaper:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedWallpaper.name}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 mt-4" style={{ borderColor: 'var(--border-light)' }}>
                    <div className="flex justify-between text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      <span>Total:</span>
                      <span style={{ color: 'var(--text-primary)' }}>£{orderData.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <CheckoutButton
                orderData={orderData}
                previewImageUrl={previewData?.previewUrl}
                originalImageUrl={previewData?.originalUrl}
                wallpaperName={selectedWallpaper?.name}
                wallpaperId={selectedWallpaper?.id}
              />

              <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  <strong>Note:</strong> Mock checkout. Production will redirect to Shopify.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Progress Summary */}
        {(selectedImage || selectedWallpaper || previewData) && (
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
                  {previewData ? (
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
