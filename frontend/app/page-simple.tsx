'use client'

import { useState } from 'react'
import ImageUpload from './components/ImageUpload'
import WallpaperGrid from './components/WallpaperGrid'
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

interface WallMask {
  id: string
  area: number
  bbox: number[]
  segmentation: number[][]
  description?: string
  confidence?: number
  provider?: string
}

export default function SimpleHome() {
  const [selectedImage, setSelectedImage] = useState<{
    file: File
    preview: string
    uploadedUrl?: string
  } | null>(null)
  const [selectedWallpaper, setSelectedWallpaper] = useState<WallpaperDesign | null>(null)
  const [wallMask, setWallMask] = useState<WallMask | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionError, setDetectionError] = useState<string | null>(null)

  const handleImageSelect = (file: File, preview: string, uploadedUrl?: string) => {
    setSelectedImage({ file, preview, uploadedUrl })
    setWallMask(null)
    setDetectionError(null)
  }

  const handleWallpaperSelect = (design: WallpaperDesign) => {
    setSelectedWallpaper(design)
  }

  // Simplified AI-powered wall detection
  const handleDetectWall = async () => {
    if (!selectedImage?.uploadedUrl) {
      setDetectionError('Please upload an image first')
      return
    }

    setIsDetecting(true)
    setDetectionError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/ai-detect-wall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: selectedImage.uploadedUrl,
          wallpaper_id: selectedWallpaper?.id || null
        })
      })

      if (!response.ok) {
        throw new Error('Wall detection failed')
      }

      const data = await response.json()

      if (data.success && data.wall) {
        setWallMask(data.wall)
      } else {
        throw new Error('No wall detected')
      }

    } catch (err: any) {
      setDetectionError(err.message || 'Failed to detect wall. Please try again.')
      console.error('Detection error:', err)
    } finally {
      setIsDetecting(false)
    }
  }

  const [previewData, setPreviewData] = useState<{
    originalUrl: string
    previewUrl: string
  } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [showPricing, setShowPricing] = useState(false)
  const [orderData, setOrderData] = useState<{
    width: number
    height: number
    material: MaterialType
    price: number
  } | null>(null)

  const handleGeneratePreview = async () => {
    if (!wallMask || !selectedWallpaper || !selectedImage?.uploadedUrl) return

    setIsGenerating(true)
    setGenerateError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/apply-wallpaper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: selectedImage.uploadedUrl,
          wall_mask_id: wallMask.id,
          wallpaper_id: selectedWallpaper.id
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
            Simplified Flow - Powered by OpenAI/Gemini
          </p>
        </div>

        {/* Step 1: Upload Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            1. Upload Your Room Photo
          </h2>
          <ImageUpload onImageSelect={handleImageSelect} />
        </div>

        {/* Step 2: Choose Wallpaper (before detection for better UX) */}
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

        {/* Detect Wall Button */}
        {selectedImage && !wallMask && (
          <div className="flex justify-center mb-12">
            <button
              onClick={handleDetectWall}
              disabled={isDetecting}
              className={`
                px-8 py-4 rounded-lg font-semibold text-white text-lg
                transition-all duration-200 transform
                ${isDetecting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 hover:scale-105 active:scale-95'
                }
              `}
            >
              {isDetecting ? (
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
                  <span>Detecting Wall with AI...</span>
                </span>
              ) : (
                'Detect Wall with AI'
              )}
            </button>
          </div>
        )}

        {/* Detection Error */}
        {detectionError && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {detectionError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wall Detected Display */}
        {wallMask && selectedImage && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
              3. Wall Detected
            </h2>
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4">
                <img
                  src={selectedImage.preview}
                  alt="Room with detected wall"
                  className="w-full h-auto"
                />
                {/* Overlay showing detected wall area */}
                <div
                  className="absolute inset-0 bg-blue-500 bg-opacity-30 pointer-events-none"
                  style={{
                    clipPath: `polygon(${wallMask.segmentation.map(([x, y]) => `${(x / 1000) * 100}%,${(y / 1000) * 100}%`).join(' ')})`
                  }}
                />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {wallMask.description || 'Main wall detected'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Confidence: {(wallMask.confidence || 0) * 100}% |
                  Area: {(wallMask.area * 100).toFixed(1)}% of image
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Detected by: {wallMask.id}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Generate Preview Button */}
        {wallMask && selectedWallpaper && !previewData && (
          <div className="flex justify-center mb-12">
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
              4. Your Preview
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
              5. Measurements & Pricing
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
              6. Checkout
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
        {(selectedImage || wallMask || selectedWallpaper) && (
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
                  {wallMask ? (
                    <>
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">
                        Wall detected ({wallMask.provider || 'AI'})
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-gray-400">Wall not detected yet</span>
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
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
