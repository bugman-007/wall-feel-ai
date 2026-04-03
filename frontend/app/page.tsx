'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import ImageUpload from './components/ImageUpload'
import {
  POST_PREVIEW_MATERIALS,
  SQFT_PER_SQM,
  type MeasurementUnit,
  type PostPreviewMaterialId,
} from './components/postPreviewMaterials'
import { ErrorBoundary } from './components/ErrorBoundary'

interface WallpaperDesign {
  id: string
  name: string
  category: string
  thumbnail_url: string
  full_url: string
  description: string
}

const features = [
  {
    title: 'AI Upload & Preview',
    description: 'Upload room photos and instantly map premium wallpaper concepts.',
    icon: '/feature-icons/ai-upload-preview.png',
  },
  {
    title: 'Smart Material Selection',
    description: 'Compare peel-and-stick, classic, and premium finishes in real time.',
    icon: '/feature-icons/smart-material-selection.png',
  },
  {
    title: '3D Immersive Visualization',
    description: 'See perspective-aware previews before committing to installation.',
    icon: '/feature-icons/immersive-visualization.png',
  },
  {
    title: 'Custom Design Request',
    description: 'Work with our team to create tailored textures for unique spaces.',
    icon: '/feature-icons/custom-design-request.png',
  },
]

const steps = [
  {
    title: 'Upload Your Space',
    icon: '/process-icons/upload-your-space.png',
  },
  {
    title: 'Choose Style & Material',
    icon: '/process-icons/choose-style-material.png',
  },
  {
    title: 'AI Generates Preview',
    icon: '/process-icons/ai-generates-preview.png',
  },
  {
    title: 'Order Your Design',
    icon: '/process-icons/order-your-design.png',
  },
]

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

function DeferredSectionFallback() {
  return (
    <div className="flex justify-center items-center py-12">
      <div
        className="animate-spin rounded-full h-12 w-12"
        style={{ border: '3px solid var(--border-light)', borderTopColor: 'var(--text-primary)' }}
      />
    </div>
  )
}

const WallpaperGrid = dynamic(() => import('./components/WallpaperGrid'), {
  loading: DeferredSectionFallback,
})

const PreviewDisplay = dynamic(() => import('./components/PreviewDisplay'), {
  loading: DeferredSectionFallback,
})

const PostPreviewMaterialSelection = dynamic(() => import('./components/PostPreviewMaterialSelection'), {
  loading: DeferredSectionFallback,
})

const QualitySelector = dynamic(() => import('./components/QualitySelector'), {
  loading: DeferredSectionFallback,
})

const StyleFeelFilter = dynamic(() => import('./components/StyleFeelFilter'), {
  loading: DeferredSectionFallback,
})

const CreateCustomDesign = dynamic(() => import('./components/CreateCustomDesign'), {
  loading: DeferredSectionFallback,
})

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
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [selectedFeels, setSelectedFeels] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse')
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false)
  const [jobStatus, setJobStatus] = useState<'queued' | 'processing' | 'completed' | 'failed' | null>(null)
  const [customGenerateError, setCustomGenerateError] = useState<string | null>(null)
  const [selectedMaterialId, setSelectedMaterialId] = useState<PostPreviewMaterialId | null>(null)
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>('metric')
  const [wallWidth, setWallWidth] = useState('')
  const [wallHeight, setWallHeight] = useState('')
  const [cartNotice, setCartNotice] = useState<string | null>(null)
  // Catalog pre-fetch state
  const [catalogData, setCatalogData] = useState<WallpaperDesign[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Refs for cleanup
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const catalogAbortRef = useRef<AbortController | null>(null)
  const lastCatalogRequestKeyRef = useRef<string | null>(null)

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const resetPostPreviewPurchase = () => {
    setSelectedMaterialId(null)
    setMeasurementUnit('metric')
    setWallWidth('')
    setWallHeight('')
    setCartNotice(null)
  }

  const handleStyleSelect = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style]
    )
  }

  const handleFeelSelect = (feel: string) => {
    setSelectedFeels(prev =>
      prev.includes(feel)
        ? prev.filter(f => f !== feel)
        : [...prev, feel]
    )
  }

  const handleSurpriseMe = () => {
    // Randomly select a style and feel to show variety
    const allStyles = ['Minimal', 'Modern', 'Luxury', 'Organic', 'Bold', 'Classic', 'Playful', 'Commercial']
    const allFeels = ['Calm', 'Warm', 'Statement', 'Elegant', 'Creative']

    // Pick 1-2 random styles
    const numStyles = Math.floor(Math.random() * 2) + 1
    const shuffledStyles = allStyles.sort(() => 0.5 - Math.random())
    const randomStyles = shuffledStyles.slice(0, numStyles)

    // Pick 1 random feel
    const randomFeel = allFeels[Math.floor(Math.random() * allFeels.length)]

    setSelectedStyles(randomStyles)
    setSelectedFeels([randomFeel])

    // Scroll to wallpaper grid
    document.getElementById('wallpaper-grid')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleMaterialSelect = (materialId: PostPreviewMaterialId) => {
    setSelectedMaterialId(materialId)
    setCartNotice(null)
  }

  const handleMeasurementUnitChange = (unit: MeasurementUnit) => {
    if (unit === measurementUnit) return
    setMeasurementUnit(unit)
    setWallWidth('')
    setWallHeight('')
    setCartNotice(null)
  }

  const handleWallWidthChange = (value: string) => {
    setWallWidth(value)
    setCartNotice(null)
  }

  const handleWallHeightChange = (value: string) => {
    setWallHeight(value)
    setCartNotice(null)
  }

  // Poll job status until completion or failure
  const pollJobStatus = async (jobId: string, onComplete: (result: any) => void, onError: (error: string) => void) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const pollInterval = 2000  // 2 seconds

    const poll = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/preview-jobs/${jobId}`)
        if (!response.ok) {
          throw new Error('Failed to poll job status')
        }

        const data = await response.json()
        setJobStatus(data.status)

        if (data.status === 'completed') {
          onComplete(data)
        } else if (data.status === 'failed') {
          onError(data.error_message || 'Job failed')
        } else {
          // Still processing or queued, continue polling
          pollTimeoutRef.current = setTimeout(poll, pollInterval)
        }
      } catch (err: any) {
        console.error('Polling error:', err)
        onError('Failed to check job status')
      }
    }

    poll()
  }

  // Cleanup function for polling
  const cleanupPolling = () => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
  }

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      cleanupPolling()
      const activeCatalogRequest = catalogAbortRef.current
      catalogAbortRef.current = null
      activeCatalogRequest?.abort()
    }
  }, [])

  useEffect(() => {
    if (previewUrl) {
      resetPostPreviewPurchase()
    }
  }, [previewUrl])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    }
  }, [isDarkMode])

  // Refetch catalog when filters change (only after initial load)
  useEffect(() => {
    if (selectedImage?.uploadedUrl && (catalogData.length > 0 || catalogLoading)) {
      // Once the catalog is active, refresh it against the latest filter set.
      const timeoutId = setTimeout(() => {
        fetchCatalog({ styles: selectedStyles, feels: selectedFeels, force: true })
      }, 100) // Small debounce to prevent rapid refetches
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStyles, selectedFeels]) // Intentionally excluding catalogData, catalogLoading, fetchCatalog

  const handleGenerateWallpaper = async (prompt: string, styleInspirations: string[]): Promise<{ success: boolean; wallpaperUrl?: string; error?: string }> => {
    if (!selectedImage?.uploadedUrl) {
      const error = 'Please upload a room photo first'
      setCustomGenerateError(error)
      return { success: false, error }
    }

    setIsGeneratingCustom(true)
    setGenerateError(null)
    setCustomGenerateError(null)
    setJobStatus('queued')

    return new Promise((resolve) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      // Create job
      fetch(`${apiUrl}/api/preview-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'wallpaper_texture',
          prompt: prompt,
          style_inspirations: styleInspirations,
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.job_id) {
            // Poll for completion (cleanup handled by useEffect)
            pollJobStatus(
              data.job_id,
              (result) => {
                setIsGeneratingCustom(false)
                setJobStatus('completed')
                if (result.result?.wallpaper_url) {
                  setCustomGenerateError(null)
                  resolve({ success: true, wallpaperUrl: result.result.wallpaper_url })
                } else {
                  const error = 'No wallpaper URL in result'
                  setCustomGenerateError(error)
                  resolve({ success: false, error })
                }
              },
              (error) => {
                setIsGeneratingCustom(false)
                setJobStatus('failed')
                setCustomGenerateError(error)
                resolve({ success: false, error })
              }
            )
          } else {
            setIsGeneratingCustom(false)
            setJobStatus('failed')
            const error = 'Failed to create job'
            setCustomGenerateError(error)
            resolve({ success: false, error })
          }
        })
        .catch(err => {
          console.error('Job creation error:', err)
          setIsGeneratingCustom(false)
          setJobStatus('failed')
          const error = 'Failed to create job'
          setCustomGenerateError(error)
          resolve({ success: false, error })
        })
    })
  }

  const handleApplyWallpaper = async (wallpaperUrl: string): Promise<{ success: boolean; previewUrl?: string; error?: string }> => {
    if (!selectedImage?.uploadedUrl) {
      return { success: false, error: 'Room photo not available' }
    }

    setIsGeneratingCustom(true)
    setGenerateError(null)
    setJobStatus('queued')

    return new Promise((resolve) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      // Create job
      fetch(`${apiUrl}/api/preview-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'room_preview',
          image_url: selectedImage.uploadedUrl,
          wallpaper_url: wallpaperUrl,
          quality: selectedQuality,
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.job_id) {
            // Poll for completion (cleanup handled by useEffect)
            pollJobStatus(
              data.job_id,
              (result) => {
                setIsGeneratingCustom(false)
                setJobStatus('completed')
                if (result.result?.preview_url) {
                  setPreviewUrl(result.result.preview_url)
                  resolve({ success: true, previewUrl: result.result.preview_url })
                } else {
                  resolve({ success: false, error: 'No preview URL in result' })
                }
              },
              (error) => {
                setIsGeneratingCustom(false)
                setJobStatus('failed')
                resolve({ success: false, error })
              }
            )
          } else {
            setIsGeneratingCustom(false)
            setJobStatus('failed')
            resolve({ success: false, error: 'Failed to create job' })
          }
        })
        .catch(err => {
          console.error('Job creation error:', err)
          setIsGeneratingCustom(false)
          setJobStatus('failed')
          resolve({ success: false, error: 'Failed to create job' })
        })
    })
  }

  const selectedMaterial = POST_PREVIEW_MATERIALS.find((material) => material.id === selectedMaterialId) || null
  const parsedWidth = Number(wallWidth)
  const parsedHeight = Number(wallHeight)
  const hasValidDimensions =
    Number.isFinite(parsedWidth) &&
    Number.isFinite(parsedHeight) &&
    parsedWidth > 0 &&
    parsedHeight > 0

  const areaDisplay = hasValidDimensions ? parsedWidth * parsedHeight : null
  const areaDisplayUnit = measurementUnit === 'metric' ? 'sqm' : 'sqft'
  const areaSqm = areaDisplay === null
    ? null
    : measurementUnit === 'metric'
      ? areaDisplay
      : areaDisplay / SQFT_PER_SQM
  const totalPrice = selectedMaterial && areaSqm !== null
    ? areaSqm * selectedMaterial.ratePerSqm
    : null
  const isAddToCartEnabled = Boolean(selectedMaterial && areaSqm !== null && areaSqm > 0)

  const handleAddToCart = () => {
    if (!isAddToCartEnabled || !selectedMaterial || totalPrice === null) {
      return
    }

    setCartNotice(
      `Cart integration coming soon. ${selectedMaterial.name} is estimated at ${formatPrice(totalPrice)} for this wall.`
    )
  }

  const handleImageSelect = (file: File, preview: string, uploadedUrl?: string) => {
    setSelectedImage({ file, preview, uploadedUrl })
    setGenerateError(null)
    setCustomGenerateError(null)
    resetPostPreviewPurchase()
    setPreviewUrl(null)
    // Pre-fetch catalog during upload for better UX
    fetchCatalog({ styles: selectedStyles, feels: selectedFeels })
  }

  const fetchCatalog = async ({
    styles = selectedStyles,
    feels = selectedFeels,
    force = false,
  }: {
    styles?: string[]
    feels?: string[]
    force?: boolean
  } = {}) => {
    const normalizedStyles = [...styles].sort()
    const normalizedFeels = [...feels].sort()
    const requestKey = JSON.stringify({
      styles: normalizedStyles,
      feels: normalizedFeels,
    })

    if (!force && lastCatalogRequestKeyRef.current === requestKey && catalogData.length > 0) {
      return
    }

    catalogAbortRef.current?.abort()
    const controller = new AbortController()
    catalogAbortRef.current = controller

    setCatalogLoading(true)
    setCatalogError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      // Build query params based on current filters
      const params = new URLSearchParams()
      if (normalizedStyles.length > 0) {
        normalizedStyles.forEach(style => params.append('style', style))
      }
      if (normalizedFeels.length > 0) {
        normalizedFeels.forEach(feel => params.append('feel', feel))
      }

      const url = `${apiUrl}/api/catalog/products${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url, { signal: controller.signal })

      if (!response.ok) {
        throw new Error('Failed to fetch catalog')
      }

      const data = await response.json()

      if (controller.signal.aborted) {
        return
      }

      // Normalize Shopify data to our interface
      const normalizedDesigns = (data.products || []).map((product: any) => ({
        id: product.handle || product.id,
        handle: product.handle,
        name: product.title || product.name,
        title: product.title,
        category: product.appCategories?.[0] || product.shopifyCollections?.[0] || 'default',
        appCategories: product.appCategories || [],
        thumbnail_url: product.image || '',
        image: product.image,
        full_url: product.image || '',
        description: product.description || '',
        materials: product.materials || [],
        shopifyCollections: product.shopifyCollections || [],
        tags: product.tags || [],
        available: product.available !== false,
        styleLabels: product.styleLabels || [],
        feelLabels: product.feelLabels || []
      }))

      setCatalogData(normalizedDesigns)
      lastCatalogRequestKeyRef.current = requestKey
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setCatalogError('Failed to load wallpaper designs')
      console.error('Catalog fetch error:', err)
    } finally {
      if (catalogAbortRef.current === controller) {
        catalogAbortRef.current = null
        setCatalogLoading(false)
      }
    }
  }

  const handleWallpaperSelect = (design: WallpaperDesign) => {
    setSelectedWallpaper(design)
  }

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

      // Parse response body first to get actual error details
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        // Use backend error detail if available
        const errorMsg = data?.detail || data?.error || 'Preview generation failed'
        throw new Error(errorMsg)
      }

      // Check if this is a fallback response (AI generation failed)
      if (data.fallback) {
        // Extract meaningful error from backend
        const errorDetails = data.error || 'AI service temporarily unavailable'
        setGenerateError(
          `AI service is currently busy. ${errorDetails.includes('503') ? 'The service is experiencing high demand - please try again in a few moments.' : errorDetails}`
        )
        return
      }

      if (data.success && data.preview_url) {
        setPreviewUrl(data.preview_url)
      } else {
        throw new Error(data.error || 'Preview generation failed. Please try again.')
      }

    } catch (err: any) {
      // Provide user-friendly error messages
      let userMessage = err.message || 'Failed to generate preview. Please try again.'

      if (err.message?.includes('Failed to fetch')) {
        userMessage = 'Cannot connect to server. Please check your internet connection.'
      }

      setGenerateError(userMessage)
      console.error('Generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // handleReset is available for future use when adding "Try Another" functionality

  return (
    <main className="luxury-page">
      <section className="hero-section">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className="hero-image-layer" />
        <div className="hero-content">
          <div className="brand-lockup hero-brand-lockup">
            <span className="brand-logo" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="brand-mark">WALLFEEL</span>
          </div>
          <h1>Transform Your Walls Into Luxury Experiences</h1>
          <p className="hero-subtitle">AI-powered wall design. Upload. Visualize. Experience.</p>
          <div className="hero-actions">
            <button className="gold-btn" onClick={() => document.getElementById('visualizer')?.scrollIntoView({ behavior: 'smooth' })}>Start Designing</button>
          </div>
        </div>
      </section>

      <section className="content-shell features-shell">
        <h2 className="section-title">Our Key Features</h2>
        <div className="feature-grid">
          {features.map((item) => (
            <article key={item.title} className="feature-card">
              <div className="feature-card-head">
                <div className="feature-card-icon" aria-hidden="true">
                  <Image
                    src={item.icon}
                    alt=""
                    width={56}
                    height={56}
                    className="feature-card-icon-image"
                  />
                </div>
                <h3>{item.title}</h3>
              </div>
              <p className="feature-card-description">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-shell process-shell">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-row">
          {steps.map((step, index) => (
            <div key={step.title} className="step-item">
              <div className="step-item-visual" aria-hidden="true">
                <Image
                  src={step.icon}
                  alt=""
                  width={72}
                  height={72}
                  className="step-item-image"
                />
                <span className="step-item-number">{index + 1}</span>
              </div>
              <p>{step.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Wallpaper Preview Generator - Integrated Section */}
      <section className="content-shell visualizer-shell" id="visualizer">
        <h2 className="section-title">Visualize Your Space</h2>
        <p className="section-subtitle">
          Upload your room photo and refine a premium wall concept with a calmer, more editorial design review flow.
        </p>

        {/* Step 1: Upload - Always shown first */}
        <ErrorBoundary>
          <div className="step-section">
            <h3 className="step-title">1. Upload Your Room Photo</h3>
            <ImageUpload onImageSelect={handleImageSelect} />
          </div>
        </ErrorBoundary>

        {/* Tabs - shown after image upload */}
        {selectedImage && (
          <>
            {/* Tab Navigation */}
            <ErrorBoundary>
              <div className="luxury-tabs">
                <button
                  onClick={() => setActiveTab('browse')}
                  className={`luxury-tab ${activeTab === 'browse' ? 'is-active' : ''}`}
                >
                  Browse Catalog
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`luxury-tab ${activeTab === 'create' ? 'is-active' : ''}`}
                >
                  Create Your Own
                </button>
              </div>
            </ErrorBoundary>

            {/* Tab Content */}
            <div className="mt-6">
              {/* Browse Catalog Tab */}
              {activeTab === 'browse' && (
                <ErrorBoundary>
                  <div className="space-y-6">
                    {/* Style & Feel Filter */}
                    <div className="step-section">
                      <h3 className="step-title">2. Choose Style & Feel</h3>
                      <StyleFeelFilter
                      selectedStyles={selectedStyles}
                      selectedFeels={selectedFeels}
                      onStyleSelect={handleStyleSelect}
                      onFeelSelect={handleFeelSelect}
                      onSurpriseMe={handleSurpriseMe}
                    />
                  </div>

                  {/* Wallpaper Grid */}
                  <div className="step-section" id="wallpaper-grid">
                    <h3 className="step-title">
                      {selectedStyles.length > 0 || selectedFeels.length > 0
                        ? `3. Choose from ${selectedStyles.length + selectedFeels.length} Filter${(selectedStyles.length + selectedFeels.length) > 1 ? 's' : ''}`
                        : '3. Choose Your Wallpaper Design'}
                    </h3>
                    <WallpaperGrid
                      onWallpaperSelect={handleWallpaperSelect}
                      selectedId={selectedWallpaper?.id}
                      selectedStyles={selectedStyles}
                      selectedFeels={selectedFeels}
                      preFetchedData={catalogData}
                      isLoading={catalogLoading}
                      error={catalogError}
                      onRetry={fetchCatalog}
                    />
                  </div>

                  {/* Quality Selector */}
                  {selectedWallpaper && !previewUrl && (
                    <div className="step-section">
                      <h3 className="step-title">4. Choose Output Quality</h3>
                      <QualitySelector
                        selectedId={selectedQuality}
                        onSelect={setSelectedQuality}
                      />
                    </div>
                  )}

                  {/* Generate Preview Button */}
                  {selectedWallpaper && !previewUrl && (
                    <div className="step-section">
                      <h3 className="step-title">5. Generate Preview</h3>
                      <div className="card review-action-card">
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                          AI will automatically detect walls and apply the wallpaper
                        </p>
                        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                          Selected quality: <strong style={{ color: 'var(--text-primary)' }}>{selectedQuality.toUpperCase()}</strong> (Estimated time: {selectedQuality === '1k' ? '30-40' : selectedQuality === '2k' ? '35-45' : selectedQuality === '4k' ? '~1 minute' : '> 1 minute'} seconds)
                        </p>
                        <button
                          onClick={handleGeneratePreview}
                          disabled={isGenerating}
                          className={`gold-btn ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{ minWidth: '200px' }}
                        >
                          {isGenerating ? (
                            <span className="flex items-center justify-center space-x-2">
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
                  )}
                </div>
                </ErrorBoundary>
              )}

              {/* Create Your Own Tab */}
              {activeTab === 'create' && (
                <ErrorBoundary>
                  <div className="step-section">
                    <h3 className="step-title">2. Create Your Custom Wallpaper</h3>
                    <CreateCustomDesign
                      onGenerateWallpaper={handleGenerateWallpaper}
                      onApplyWallpaper={handleApplyWallpaper}
                      isGenerating={isGeneratingCustom}
                      jobStatus={jobStatus}
                      generationError={customGenerateError}
                      onClearGenerationError={() => setCustomGenerateError(null)}
                    />
                  </div>
                </ErrorBoundary>
              )}
            </div>
          </>
        )}

        {/* Error Message */}
        {generateError && (
          <div className="card status-card status-card-error">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div style={{ flex: 1 }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Preview Generation Failed
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {generateError}
                </p>
                <button
                  onClick={() => activeTab === 'browse' ? handleGeneratePreview() : null}
                  className="text-sm font-medium"
                  style={{ color: 'var(--gold)', marginTop: '12px', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                >
                  Try Again →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Display */}
        {previewUrl && selectedImage?.preview && (
          <ErrorBoundary>
            <div className="step-section preview-stage">
              <h3 className="step-title" style={{ textAlign: 'center' }}>Your Preview</h3>
              <PreviewDisplay
                originalUrl={selectedImage.preview}
                previewUrl={previewUrl}
                onClose={() => {
                  setPreviewUrl(null)
                  resetPostPreviewPurchase()
                }}
                quality={selectedQuality}
              />
              <PostPreviewMaterialSelection
                previewImageUrl={previewUrl}
                selectedMaterialId={selectedMaterialId}
                onSelectMaterial={handleMaterialSelect}
                measurementUnit={measurementUnit}
                onMeasurementUnitChange={handleMeasurementUnitChange}
                wallWidth={wallWidth}
                wallHeight={wallHeight}
                onWallWidthChange={handleWallWidthChange}
                onWallHeightChange={handleWallHeightChange}
                areaDisplay={areaDisplay}
                areaDisplayUnit={areaDisplayUnit}
                areaSqm={areaSqm}
                totalPrice={totalPrice}
                cartNotice={cartNotice}
                onAddToCart={handleAddToCart}
              />
            </div>
          </ErrorBoundary>
        )}
      </section>

      {/* <section className="content-shell">
        <h2 className="section-title">Explore Our Design Library</h2>
        <div className="category-row">
          {categories.map((category) => (
            <button key={category} className="category-pill">
              {category}
            </button>
          ))}
        </div>
        <div className="gallery-grid">
          {galleryImages.map((src) => (
            <div key={src} className="gallery-image">
              <Image src={src} alt="Wallfeel design preview" fill sizes="(max-width: 900px) 50vw, 25vw" />
            </div>
          ))}
        </div>
      </section> */}

      {/* <section className="content-shell partner-shell">
        <h2 className="section-title">For Businesses & Partners</h2>
        <p className="partner-subtitle">Transform commercial spaces into memorable brand experiences.</p>
        <div className="partner-row">
          {partnerTypes.map((type) => (
            <span key={type}>{type}</span>
          ))}
        </div>
      </section> */}

      <section className="content-shell cta-shell luxury-cta-shell">
        <h2 className="section-title">Ready to Redefine Your Space?</h2>
        <div className="hero-actions">
          <button className="gold-btn" onClick={() => document.getElementById('visualizer')?.scrollIntoView({ behavior: 'smooth' })}>Start Your Design</button>
          <button className="ghost-btn">Talk to a Designer</button>
        </div>
      </section>

      <footer className="luxury-footer">
        <nav>
          <span>About</span>
          <span>Services</span>
          <span>Projects</span>
          <span>Contact</span>
        </nav>
        <p>© 2026 WallFeel</p>
      </footer>
    </main>
  )
}
