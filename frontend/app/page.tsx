'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import ImageUpload from './components/ImageUpload'
import GenerationProgress from './components/GenerationProgress'
import {
  POST_PREVIEW_MATERIALS,
  SQFT_PER_SQM,
  SQIN_PER_SQM,
  type MeasurementUnit,
  type PostPreviewMaterialId,
} from './components/postPreviewMaterials'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LocalizationProvider } from './contexts/LocalizationContext'
import { getCollectionDisplayName } from './lib/catalogTaxonomy'
import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  convertUsdToCurrency,
  detectSupportedLocale,
  formatCurrencyValue,
  formatCurrencySelectorLabel,
  getDefaultCurrencyForLocale,
  getLocaleConfig,
  getMessages,
  interpolate,
  isSupportedCurrency,
  isSupportedLocale,
  type SupportedCurrencyCode,
  type SupportedLocaleCode,
} from './lib/localization'

interface WallpaperDesign {
  id: string
  name: string
  category: string
  thumbnail_url: string
  full_url: string
  description: string
}

const featureIcons = [
  '/feature-icons/ai-upload-preview.png',
  '/feature-icons/smart-material-selection.png',
  '/feature-icons/immersive-visualization.png',
  '/feature-icons/custom-design-request.png',
]

const processIcons = [
  '/process-icons/upload-your-space.png',
  '/process-icons/choose-style-material.png',
  '/process-icons/ai-generates-preview.png',
  '/process-icons/order-your-design.png',
]

const STORAGE_KEYS = {
  locale: 'wallfeel-locale',
  currency: 'wallfeel-currency',
  promptSeen: 'wallfeel-locale-prompt-seen',
} as const

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

const CategoryFilter = dynamic(() => import('./components/CategoryFilter'), {
  loading: DeferredSectionFallback,
})

const CreateCustomDesign = dynamic(() => import('./components/CreateCustomDesign'), {
  loading: DeferredSectionFallback,
})

interface HeroSelectorOption {
  value: string
  label: string
}

interface HeroSelectorProps {
  label: string
  value: string
  options: HeroSelectorOption[]
  onChange: (value: string) => void
}

function HeroSelector({
  label,
  value,
  options,
  onChange,
}: HeroSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectorRef = useRef<HTMLDivElement | null>(null)
  const selectedOption = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div
      ref={selectorRef}
      className={`hero-selector ${isOpen ? 'is-open' : ''}`}
    >
      <span className="hero-selector-label">{label}</span>
      <button
        type="button"
        className="hero-selector-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="hero-selector-value">{selectedOption.label}</span>
        <svg
          className="hero-selector-chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="hero-selector-menu" role="listbox" aria-label={label}>
          {options.map((option) => {
            const isSelected = option.value === value

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`hero-selector-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <svg
                    className="hero-selector-check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [locale, setLocale] = useState<SupportedLocaleCode>(DEFAULT_LOCALE)
  const [currency, setCurrency] = useState<SupportedCurrencyCode>(DEFAULT_CURRENCY)
  const [showLocalePrompt, setShowLocalePrompt] = useState(false)
  const [suggestedLocale, setSuggestedLocale] = useState<SupportedLocaleCode | null>(null)
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{
    file: File
    preview: string
    uploadedUrl?: string
  } | null>(null)
  const [selectedWallpaper, setSelectedWallpaper] = useState<WallpaperDesign | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [selectedParentCollection, setSelectedParentCollection] = useState<string | null>(null)
  const [selectedChildCollection, setSelectedChildCollection] = useState<string | null>(null)
  const [activeCatalogLabel, setActiveCatalogLabel] = useState<string | null>(null)
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
  const previewQuality = '1k' as const
  const messages = getMessages(locale)
  const suggestedLocaleConfig = suggestedLocale ? getLocaleConfig(suggestedLocale) : null

  // Refs for cleanup
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const completionAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const catalogAbortRef = useRef<AbortController | null>(null)
  const lastCatalogRequestKeyRef = useRef<string | null>(null)
  const activeBrowsePreviewJobRef = useRef<string | null>(null)

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const persistLocaleSettings = (nextLocale: SupportedLocaleCode, nextCurrency: SupportedCurrencyCode) => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEYS.locale, nextLocale)
    window.localStorage.setItem(STORAGE_KEYS.currency, nextCurrency)
    window.localStorage.setItem(STORAGE_KEYS.promptSeen, 'true')
  }

  const applyLocaleSelection = (nextLocale: SupportedLocaleCode) => {
    const nextCurrency = getDefaultCurrencyForLocale(nextLocale)
    setLocale(nextLocale)
    setCurrency(nextCurrency)
    setShowLocalePrompt(false)
    persistLocaleSettings(nextLocale, nextCurrency)
  }

  const handleKeepEnglish = () => {
    setLocale(DEFAULT_LOCALE)
    setCurrency(DEFAULT_CURRENCY)
    setShowLocalePrompt(false)
    persistLocaleSettings(DEFAULT_LOCALE, DEFAULT_CURRENCY)
  }

  const handleManualLocaleChange = (value: string) => {
    if (!isSupportedLocale(value)) {
      return
    }

    applyLocaleSelection(value)
  }

  const handleManualCurrencyChange = (value: string) => {
    if (!isSupportedCurrency(value)) {
      return
    }

    setCurrency(value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.currency, value)
      window.localStorage.setItem(STORAGE_KEYS.promptSeen, 'true')
    }
  }

  const resetPostPreviewPurchase = () => {
    setSelectedMaterialId(null)
    setMeasurementUnit('metric')
    setWallWidth('')
    setWallHeight('')
    setCartNotice(null)
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
  const pollJobStatus = async (
    jobId: string,
    onComplete: (result: any) => void,
    onError: (error: string) => void,
    onCancelled?: (message: string) => void
  ) => {
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
        } else if (data.status === 'cancelled') {
          if (onCancelled) {
            onCancelled(data.error_message || 'Generation cancelled')
          } else {
            onError(data.error_message || 'Generation cancelled')
          }
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

  const cleanupCompletionAnimation = () => {
    if (completionAnimationTimeoutRef.current) {
      clearTimeout(completionAnimationTimeoutRef.current)
      completionAnimationTimeoutRef.current = null
    }
  }

  const runCompletedAnimation = (onComplete: () => void) => {
    cleanupCompletionAnimation()
    setJobStatus('completed')
    completionAnimationTimeoutRef.current = setTimeout(() => {
      completionAnimationTimeoutRef.current = null
      onComplete()
    }, 350)
  }

  const cancelActiveBrowsePreview = async () => {
    const jobId = activeBrowsePreviewJobRef.current
    if (!jobId) {
      return
    }

    activeBrowsePreviewJobRef.current = null
    cleanupPolling()
    cleanupCompletionAnimation()
    setIsGenerating(false)
    setGenerateError(null)
    setJobStatus(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      await fetch(`${apiUrl}/api/preview-jobs/${jobId}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.error('Preview cancel error:', err)
    }
  }

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      cleanupPolling()
      cleanupCompletionAnimation()
      void cancelActiveBrowsePreview()
      const activeCatalogRequest = catalogAbortRef.current
      catalogAbortRef.current = null
      activeCatalogRequest?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const storedLocale = window.localStorage.getItem(STORAGE_KEYS.locale)
    const storedCurrency = window.localStorage.getItem(STORAGE_KEYS.currency)
    const promptSeen = window.localStorage.getItem(STORAGE_KEYS.promptSeen) === 'true'

    if (storedLocale && isSupportedLocale(storedLocale)) {
      setLocale(storedLocale)
      setCurrency(
        storedCurrency && isSupportedCurrency(storedCurrency)
          ? storedCurrency
          : getDefaultCurrencyForLocale(storedLocale)
      )
      setHasLoadedPreferences(true)
      return
    }

    if (storedCurrency && isSupportedCurrency(storedCurrency)) {
      setCurrency(storedCurrency)
    }

    const detectedLocale = detectSupportedLocale(window.navigator.languages || [window.navigator.language])
    if (detectedLocale && getLocaleConfig(detectedLocale).languageCode !== 'en') {
      setSuggestedLocale(detectedLocale)
      if (!promptSeen) {
        setShowLocalePrompt(true)
      }
    }

    if (promptSeen) {
      window.localStorage.setItem(STORAGE_KEYS.promptSeen, 'true')
    }

    setHasLoadedPreferences(true)
  }, [])

  useEffect(() => {
    if (previewUrl) {
      resetPostPreviewPurchase()
    }
  }, [previewUrl])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
      document.documentElement.lang = locale
    }
  }, [isDarkMode, locale])

  // Refetch catalog when filters change (only after initial load)
  useEffect(() => {
    if (selectedImage?.uploadedUrl && (catalogData.length > 0 || catalogLoading)) {
      // Once the catalog is active, refresh it against the latest collection selection.
      const timeoutId = setTimeout(() => {
        fetchCatalog({
          collectionHandle: selectedChildCollection ?? selectedParentCollection,
          force: true,
        })
      }, 100) // Small debounce to prevent rapid refetches
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParentCollection, selectedChildCollection]) // Intentionally excluding catalogData, catalogLoading, fetchCatalog

  const handleGenerateWallpaper = async (
    prompt: string,
    styleInspirations: string[],
    referenceImageUrl?: string
  ): Promise<{ success: boolean; wallpaperUrls?: string[]; error?: string }> => {
    if (!selectedImage?.uploadedUrl) {
      const error = 'Please upload a room photo first'
      setCustomGenerateError(error)
      return { success: false, error }
    }

    setIsGeneratingCustom(true)
    cleanupCompletionAnimation()
    setGenerateError(null)
    setCustomGenerateError(null)
    setJobStatus('queued')

    const trimmedPrompt = prompt.trim()

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
          prompt: trimmedPrompt,
          style_inspirations: styleInspirations,
          reference_image_url: referenceImageUrl,
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.job_id) {
            // Poll for completion (cleanup handled by useEffect)
            pollJobStatus(
              data.job_id,
              (result) => {
                runCompletedAnimation(() => {
                  setIsGeneratingCustom(false)
                  const wallpaperUrls = result.result?.wallpaper_urls || (result.result?.wallpaper_url ? [result.result.wallpaper_url] : [])
                  if (wallpaperUrls.length > 0) {
                    setCustomGenerateError(null)
                    resolve({ success: true, wallpaperUrls })
                  } else {
                    const error = 'No wallpaper options were returned'
                    setCustomGenerateError(error)
                    resolve({ success: false, error })
                  }
                })
              },
              (error) => {
                cleanupCompletionAnimation()
                setIsGeneratingCustom(false)
                setJobStatus('failed')
                setCustomGenerateError(error)
                resolve({ success: false, error })
              }
            )
          } else {
            cleanupCompletionAnimation()
            setIsGeneratingCustom(false)
            setJobStatus('failed')
            const error = 'Failed to create job'
            setCustomGenerateError(error)
            resolve({ success: false, error })
          }
        })
        .catch(err => {
          console.error('Job creation error:', err)
          cleanupCompletionAnimation()
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
    cleanupCompletionAnimation()
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
          quality: previewQuality,
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.job_id) {
            // Poll for completion (cleanup handled by useEffect)
            pollJobStatus(
              data.job_id,
              (result) => {
                runCompletedAnimation(() => {
                  setIsGeneratingCustom(false)
                  if (result.result?.preview_url) {
                    setPreviewUrl(result.result.preview_url)
                    resolve({ success: true, previewUrl: result.result.preview_url })
                  } else {
                    resolve({ success: false, error: 'No preview URL in result' })
                  }
                })
              },
              (error) => {
                cleanupCompletionAnimation()
                setIsGeneratingCustom(false)
                setJobStatus('failed')
                resolve({ success: false, error })
              }
            )
          } else {
            cleanupCompletionAnimation()
            setIsGeneratingCustom(false)
            setJobStatus('failed')
            resolve({ success: false, error: 'Failed to create job' })
          }
        })
        .catch(err => {
          console.error('Job creation error:', err)
          cleanupCompletionAnimation()
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
  const areaDisplayUnit =
    measurementUnit === 'metric'
      ? 'sqm'
      : measurementUnit === 'imperial'
        ? 'sqft'
        : 'sqin'
  const areaSqm = areaDisplay === null
    ? null
    : measurementUnit === 'metric'
      ? areaDisplay
      : measurementUnit === 'imperial'
        ? areaDisplay / SQFT_PER_SQM
        : areaDisplay / SQIN_PER_SQM
  const totalPrice = selectedMaterial && areaSqm !== null
    ? areaSqm * selectedMaterial.ratePerSqmUsd
    : null
  const isAddToCartEnabled = Boolean(selectedMaterial && areaSqm !== null && areaSqm > 0)

  const handleAddToCart = () => {
    if (!isAddToCartEnabled || !selectedMaterial || totalPrice === null) {
      return
    }

    setCartNotice(
      interpolate(messages.materials.cartNotice, {
        material: messages.materials.materialMap[selectedMaterial.id]?.name || selectedMaterial.name,
        price: formatCurrencyValue(convertUsdToCurrency(totalPrice, currency), locale, currency),
      })
    )
  }

  const handleCatalogSelectionChange = ({
    parentHandle,
    childHandle,
    activeLabel,
  }: {
    parentHandle: string | null
    childHandle: string | null
    activeLabel: string | null
  }) => {
    void cancelActiveBrowsePreview()
    setSelectedParentCollection(parentHandle)
    setSelectedChildCollection(childHandle)
    setActiveCatalogLabel(activeLabel)
    setSelectedWallpaper(null)
    setPreviewUrl(null)
    setGenerateError(null)
    resetPostPreviewPurchase()
  }

  const handleTabChange = (nextTab: 'browse' | 'create') => {
    if (nextTab !== activeTab && activeTab === 'browse') {
      void cancelActiveBrowsePreview()
      setGenerateError(null)
      setPreviewUrl(null)
      resetPostPreviewPurchase()
    }

    setActiveTab(nextTab)
  }

  const handleImageSelect = (file: File, preview: string, uploadedUrl?: string) => {
    void cancelActiveBrowsePreview()
    setSelectedImage({ file, preview, uploadedUrl })
    setGenerateError(null)
    setCustomGenerateError(null)
    setSelectedWallpaper(null)
    resetPostPreviewPurchase()
    setPreviewUrl(null)
    // Pre-fetch catalog during upload for better UX
    fetchCatalog({ collectionHandle: selectedChildCollection ?? selectedParentCollection })
  }

  const fetchCatalog = async ({
    collectionHandle = selectedChildCollection ?? selectedParentCollection,
    force = false,
  }: {
    collectionHandle?: string | null
    force?: boolean
  } = {}) => {
    const requestKey = JSON.stringify({
      collection: collectionHandle,
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

      // Build query params based on current taxonomy selection
      const params = new URLSearchParams()
      if (collectionHandle) {
        params.set('collection', collectionHandle)
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
        category: activeCatalogLabel || getCollectionDisplayName(product.shopifyCollections?.[0]),
        appCategories: product.appCategories || [],
        thumbnail_url: product.image || '',
        image: product.image,
        full_url: product.image || '',
        description: product.description || '',
        materials: product.materials || [],
        shopifyCollections: product.shopifyCollections || [],
        tags: product.tags || [],
        available: product.available !== false,
      }))

      setCatalogData(normalizedDesigns)
      lastCatalogRequestKeyRef.current = requestKey
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setCatalogError(messages.wallpaperGrid.failedToLoad)
      console.error('Catalog fetch error:', err)
    } finally {
      if (catalogAbortRef.current === controller) {
        catalogAbortRef.current = null
        setCatalogLoading(false)
      }
    }
  }

  const handleWallpaperSelect = (design: WallpaperDesign) => {
    void cancelActiveBrowsePreview()
    setSelectedWallpaper(design)
    setPreviewUrl(null)
    setGenerateError(null)
    resetPostPreviewPurchase()
  }

  const handleGeneratePreview = async () => {
    if (!selectedWallpaper || !selectedImage?.uploadedUrl) {
      setGenerateError('Please upload an image and select a wallpaper')
      return
    }

    if (activeBrowsePreviewJobRef.current) {
      await cancelActiveBrowsePreview()
    }

    setIsGenerating(true)
    cleanupCompletionAnimation()
    setJobStatus('queued')
    setGenerateError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/preview-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'room_preview',
          image_url: selectedImage.uploadedUrl,
          wallpaper_id: selectedWallpaper.id,
          quality: previewQuality,
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMsg = data?.detail || data?.error || 'Preview generation failed'
        throw new Error(errorMsg)
      }

      if (!data?.job_id) {
        throw new Error('Failed to create preview job')
      }

      const currentJobId = data.job_id as string
      activeBrowsePreviewJobRef.current = currentJobId

      pollJobStatus(
        currentJobId,
        (result) => {
          if (activeBrowsePreviewJobRef.current !== currentJobId) {
            return
          }

          activeBrowsePreviewJobRef.current = null
          cleanupPolling()
          runCompletedAnimation(() => {
            setIsGenerating(false)

            if (result.result?.preview_url) {
              setPreviewUrl(result.result.preview_url)
            } else {
              setGenerateError('Preview generation failed. Please try again.')
            }
          })
        },
        (error) => {
          if (activeBrowsePreviewJobRef.current !== currentJobId) {
            return
          }

          activeBrowsePreviewJobRef.current = null
          cleanupPolling()
          cleanupCompletionAnimation()
          setIsGenerating(false)
          setJobStatus('failed')
          setGenerateError(error || 'Preview generation failed. Please try again.')
        },
        () => {
          if (activeBrowsePreviewJobRef.current !== currentJobId) {
            return
          }

          activeBrowsePreviewJobRef.current = null
          cleanupPolling()
          cleanupCompletionAnimation()
          setIsGenerating(false)
          setJobStatus(null)
        }
      )

    } catch (err: any) {
      // Provide user-friendly error messages
      let userMessage = err.message || 'Failed to generate preview. Please try again.'

      if (err.message?.includes('Failed to fetch')) {
        userMessage = 'Cannot connect to server. Please check your internet connection.'
      }

      cleanupCompletionAnimation()
      setIsGenerating(false)
      setJobStatus('failed')
      setGenerateError(userMessage)
      console.error('Generation error:', err)
    }
  }

  // handleReset is available for future use when adding "Try Another" functionality
  const localizedFeatures = messages.features.items.map((item, index) => ({
    ...item,
    icon: featureIcons[index],
  }))
  const localizedSteps = messages.process.items.map((item, index) => ({
    ...item,
    icon: processIcons[index],
  }))
  const localeOptions = SUPPORTED_LOCALES.map((option) => ({
    value: option.code,
    label: option.nativeLabel,
  }))
  const currencyOptions = SUPPORTED_CURRENCIES.map((option) => ({
    value: option.code,
    label: formatCurrencySelectorLabel(option.code),
  }))

  return (
    <LocalizationProvider locale={locale} currency={currency}>
    <main className="luxury-page">
      <section className="hero-section">
        <div className="hero-controls">
          <HeroSelector
            label={messages.selectors.language}
            value={locale}
            options={localeOptions}
            onChange={handleManualLocaleChange}
          />

          <HeroSelector
            label={messages.selectors.currency}
            value={currency}
            options={currencyOptions}
            onChange={handleManualCurrencyChange}
          />

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
        </div>

        <div className="hero-image-layer" />
        <div className="hero-video-layer" aria-hidden="true">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src="/videos/promo_video.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="hero-content">
          <div className="brand-lockup hero-brand-lockup">
            <span className="brand-logo" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="brand-mark">WallFeel.</span>
          </div>
          <h1>{messages.hero.title}</h1>
          <p className="hero-subtitle">{messages.hero.subtitle}</p>
          <div className="hero-actions">
            <button className="gold-btn" onClick={() => document.getElementById('visualizer')?.scrollIntoView({ behavior: 'smooth' })}>{messages.hero.startDesigning}</button>
          </div>
        </div>

        {hasLoadedPreferences && showLocalePrompt && suggestedLocaleConfig && (
          <div className="locale-prompt-backdrop">
            <div className="locale-prompt-card">
              <p className="locale-prompt-kicker">{messages.selectors.promptTitle}</p>
              <h2>{suggestedLocaleConfig.nativeLabel}</h2>
              <p>
                {interpolate(messages.selectors.promptBody, {
                  language: suggestedLocaleConfig.promptLabel,
                  currency: formatCurrencySelectorLabel(suggestedLocaleConfig.defaultCurrency),
                }).replace('USD', formatCurrencySelectorLabel(DEFAULT_CURRENCY))}
              </p>
              <div className="locale-prompt-actions">
                <button
                  type="button"
                  className="gold-btn"
                  onClick={() => applyLocaleSelection(suggestedLocaleConfig.code)}
                >
                  {interpolate(messages.selectors.useLocal, {
                    language: suggestedLocaleConfig.promptLabel,
                    currency: formatCurrencySelectorLabel(suggestedLocaleConfig.defaultCurrency),
                  })}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleKeepEnglish}
                >
                  {messages.selectors.keepEnglish.replace('USD', formatCurrencySelectorLabel(DEFAULT_CURRENCY))}
                </button>
              </div>
              <p className="locale-prompt-note">{messages.selectors.changeLater}</p>
            </div>
          </div>
        )}
      </section>

      <section className="content-shell features-shell">
        <h2 className="section-title">{messages.features.title}</h2>
        <div className="feature-grid">
          {localizedFeatures.map((item) => (
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
        <h2 className="section-title">{messages.process.title}</h2>
        <div className="steps-row">
          {localizedSteps.map((step, index) => (
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
        <h2 className="section-title">{messages.visualizer.title}</h2>
        <p className="section-subtitle">{messages.visualizer.subtitle}</p>

        {/* Step 1: Upload - Always shown first */}
        <ErrorBoundary>
          <div className="step-section">
            <h3 className="step-title">{messages.visualizer.uploadStep}</h3>
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
                  onClick={() => handleTabChange('browse')}
                  className={`luxury-tab ${activeTab === 'browse' ? 'is-active' : ''}`}
                >
                  {messages.visualizer.tabs.browse}
                </button>
                <button
                  onClick={() => handleTabChange('create')}
                  className={`luxury-tab ${activeTab === 'create' ? 'is-active' : ''}`}
                >
                  {messages.visualizer.tabs.create}
                </button>
              </div>
            </ErrorBoundary>

            {/* Tab Content */}
            <div className="mt-6">
              {/* Browse Catalog Tab */}
              {activeTab === 'browse' && (
                <ErrorBoundary>
                  <div className="space-y-6">
                    {/* Catalog Taxonomy Filter */}
                    <div className="step-section">
                      <h3 className="step-title">{messages.visualizer.chooseCatalog}</h3>
                      <CategoryFilter
                        selectedParentHandle={selectedParentCollection}
                        selectedChildHandle={selectedChildCollection}
                        onSelectionChange={handleCatalogSelectionChange}
                      />
                    </div>

                  {/* Wallpaper Grid */}
                  <div className="step-section" id="wallpaper-grid">
                    <h3 className="step-title">{messages.visualizer.chooseWallpaper}</h3>
                    {activeCatalogLabel && (
                      <p className="catalog-selection-note">{activeCatalogLabel}</p>
                    )}
                    <WallpaperGrid
                      onWallpaperSelect={handleWallpaperSelect}
                      selectedId={selectedWallpaper?.id}
                      selectedCollection={selectedChildCollection ?? selectedParentCollection}
                      activeCollectionLabel={activeCatalogLabel}
                      preFetchedData={catalogData}
                      isLoading={catalogLoading}
                      error={catalogError}
                      onRetry={fetchCatalog}
                    />
                  </div>

                  {/* Generate Preview Button */}
                  {selectedWallpaper && !previewUrl && (
                    <div className="step-section">
                      <h3 className="step-title">{messages.visualizer.generatePreview}</h3>
                      <div className="card review-action-card">
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                          {messages.visualizer.generatePreviewIntro}
                        </p>
                        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                          {messages.visualizer.generatePreviewResolution}
                        </p>
                        {isGenerating ? (
                          <GenerationProgress
                            variant="preview"
                            status={jobStatus}
                            className="review-generation-progress"
                          />
                        ) : (
                          <button
                            onClick={handleGeneratePreview}
                            className="gold-btn"
                            style={{ minWidth: '200px' }}
                          >
                            {messages.visualizer.generatePreviewButton}
                          </button>
                        )}
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
                    <h3 className="step-title">{messages.visualizer.createStep}</h3>
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
                  {messages.visualizer.generationFailed}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {generateError}
                </p>
                <button
                  onClick={() => activeTab === 'browse' ? handleGeneratePreview() : null}
                  className="text-sm font-medium"
                  style={{ color: 'var(--gold)', marginTop: '12px', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                >
                  {messages.common.tryAgain} →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Display */}
        {previewUrl && selectedImage?.preview && (
          <ErrorBoundary>
            <div className="step-section preview-stage">
              <h3 className="step-title" style={{ textAlign: 'center' }}>{messages.visualizer.previewTitle}</h3>
              <PreviewDisplay
                originalUrl={selectedImage.preview}
                previewUrl={previewUrl}
                onClose={() => {
                  setPreviewUrl(null)
                  resetPostPreviewPurchase()
                }}
                quality={previewQuality}
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
        <h2 className="section-title">{messages.cta.title}</h2>
        <div className="hero-actions">
          <button className="gold-btn" onClick={() => document.getElementById('visualizer')?.scrollIntoView({ behavior: 'smooth' })}>{messages.cta.start}</button>
          <button className="ghost-btn">{messages.cta.talk}</button>
        </div>
      </section>

      <footer className="luxury-footer">
        <nav>
          <span>{messages.footer.about}</span>
          <span>{messages.footer.services}</span>
          <span>{messages.footer.projects}</span>
          <span>{messages.footer.contact}</span>
        </nav>
        <p>© 2026 WallFeel</p>
      </footer>
    </main>
    </LocalizationProvider>
  )
}
