'use client'

import { useState } from 'react'
import ImageUpload from './components/ImageUpload'
import WallpaperGrid from './components/WallpaperGrid'
import WallDetectionStep from './components/WallDetectionStep'
import PreviewDisplay from './components/PreviewDisplay'
import MeasurementsForm from './components/MeasurementsForm'
import CheckoutButton from './components/CheckoutButton'
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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Wallfeel AI Visualizer
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Visualize wallpaper designs on your walls with AI
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload → Choose → Preview (Powered by OpenAI/Gemini)
          </p>
        </div>

        {/* Step 1: Upload Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            1. Upload Your Room Photo
          </h2>
          <ImageUpload onImageSelect={handleImageSelect} />
        </div>

        {/* Step 2: Choose Wallpaper */}
        {selectedImage && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Choose Your Wallpaper Design
            </h2>
            <WallpaperGrid
              onWallpaperSelect={handleWallpaperSelect}
              selectedId={selectedWallpaper?.id}
            />
          </div>
        )}

        {/* Step 3: Wall Detection */}
        {selectedImage && selectedWallpaper && !wallSegmentation && !showWallDetection && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
              3. Detect Wall Area
            </h2>
            <div className="flex justify-center">
              <button
                onClick={handleStartWallDetection}
                className="px-8 py-4 rounded-lg font-semibold text-white text-lg bg-blue-600 hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
              >
                Detect Wall with AI
              </button>
            </div>
          </div>
        )}

        {/* Wall Detection Step */}
        {showWallDetection && (
          <div className="mb-12">
            <WallDetectionStep
              imageUrl={selectedImage!.uploadedUrl || selectedImage!.preview}
              onWallDetected={handleWallDetected}
              onSkip={handleSkipWallDetection}
            />
          </div>
        )}

        {/* Step 4: Generate Preview Button */}
        {selectedImage && selectedWallpaper && wallSegmentation && !previewData && (
          <div className="mb-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                4. Generate Preview
              </h2>

              {/* Wall selection summary */}
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Wall area selected ({wallSegmentation.source === 'auto' ? 'AI detected' : 'manually selected'})
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Dimensions: {wallSegmentation.boundingBox.width.toFixed(0)} x {wallSegmentation.boundingBox.height.toFixed(0)} pixels
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleStartWallDetection}
                  className="px-6 py-3 rounded-lg font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Re-select Wall
                </button>
                <button
                  onClick={handleGeneratePreview}
                  disabled={isGenerating}
                  className={`
                    px-8 py-4 rounded-lg font-semibold text-white text-lg
                    transition-all duration-200 transform
                    ${isGenerating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
                    }
                  `}
                >
                  {isGenerating ? (
                    <span className="flex items-center space-x-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Generating Preview...</span>
                </span>
              ) : (
                'Generate Preview with AI'
              )}
            </button>
          </div>
        </div>
      </div>
    )}

        {/* Generation Error */}
        {generateError && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {generateError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Preview Display */}
        {previewData && !showPricing && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
              3. Your Preview
            </h2>
            <PreviewDisplay
              originalUrl={previewData.originalUrl}
              previewUrl={previewData.previewUrl}
              onClose={() => setPreviewData(null)}
            />
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowPricing(true)}
                className="px-8 py-4 rounded-lg font-semibold text-white text-lg bg-green-600 hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
              >
                Continue to Pricing
              </button>
            </div>
          </div>
        )}

        {/* Measurements & Pricing */}
        {showPricing && !orderData && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
              4. Measurements & Pricing
            </h2>
            <MeasurementsForm
              onProceedToCheckout={(data) => {
                setOrderData(data)
              }}
            />
          </div>
        )}

        {/* Checkout */}
        {orderData && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
              5. Checkout
            </h2>
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Dimensions:</span>
                    <span className="font-medium">{orderData.width}m × {orderData.height}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Area:</span>
                    <span className="font-medium">{(orderData.width * orderData.height).toFixed(2)} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Material:</span>
                    <span className="font-medium capitalize">{orderData.material.replace('_', ' ')}</span>
                  </div>
                  {selectedWallpaper && (
                    <div className="flex justify-between">
                      <span>Wallpaper:</span>
                      <span className="font-medium">{selectedWallpaper.name}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                      <span>Total:</span>
                      <span>£{orderData.price.toFixed(2)}</span>
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

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> This is a mock checkout. In production, you&apos;ll be redirected to Shopify for secure payment processing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Summary */}
        {(selectedImage || selectedWallpaper || previewData) && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Progress
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  {selectedImage ? (
                    <>
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">Room photo uploaded</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-gray-400">No room photo selected</span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {selectedWallpaper ? (
                    <>
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">
                        Wallpaper: {selectedWallpaper.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-gray-400">No wallpaper selected</span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {previewData ? (
                    <>
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">Preview generated</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-gray-400">Preview not generated yet</span>
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
