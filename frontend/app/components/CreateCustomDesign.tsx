'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import Image from 'next/image'

interface GenerateWallpaperResult {
  success: boolean
  wallpaperUrls?: string[]
  error?: string
}

interface ApplyWallpaperResult {
  success: boolean
  previewUrl?: string
  error?: string
}

type ReviewOptionSource = 'generated' | 'uploaded' | 'edited'

interface ReviewDesignOption {
  id: string
  url: string
  source: ReviewOptionSource
  label: string
  helper: string
}

interface UploadedReferenceDesign {
  url: string
  fileName: string
}

interface CreateCustomDesignProps {
  onGenerateWallpaper: (prompt: string, styleInspirations: string[], referenceImageUrl?: string) => Promise<GenerateWallpaperResult>
  onApplyWallpaper: (wallpaperUrl: string) => Promise<ApplyWallpaperResult>
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
  const [reviewOptions, setReviewOptions] = useState<ReviewDesignOption[]>([])
  const [selectedDesignUrl, setSelectedDesignUrl] = useState<string | null>(null)
  const [uploadedReference, setUploadedReference] = useState<UploadedReferenceDesign | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [isUploadingDesign, setIsUploadingDesign] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  const isReviewStep = reviewOptions.length > 0
  const hasPromptDirection = prompt.trim().length > 0
  const canGenerateVariants = hasPromptDirection || selectedStyleInspirations.length > 0 || Boolean(uploadedReference)

  const resetReviewState = () => {
    setReviewOptions([])
    setSelectedDesignUrl(null)
    setApplyError(null)
    setUploadError(null)
    onClearGenerationError()
  }

  const handleStyleInspirationClick = (name: string) => {
    onClearGenerationError()
    setUploadError(null)
    setSelectedStyleInspirations(prev =>
      prev.includes(name)
        ? prev.filter(s => s !== name)
        : [...prev, name]
    )
  }

  const handleGenerateClick = async () => {
    if (!canGenerateVariants) {
      return
    }

    onClearGenerationError()
    setUploadError(null)
    setApplyError(null)

    const result = await onGenerateWallpaper(
      prompt.trim(),
      selectedStyleInspirations,
      uploadedReference?.url
    )
    const wallpaperUrls = result.wallpaperUrls || []

    if (result.success && wallpaperUrls.length > 0) {
      const options = wallpaperUrls.map((url, index) => {
        const source: ReviewOptionSource = uploadedReference ? 'edited' : 'generated'
        return {
          id: `${source}-${index + 1}`,
          url,
          source,
          label: uploadedReference ? `Edited Option ${index + 1}` : `Option ${index + 1}`,
          helper: uploadedReference
            ? index === 0
              ? 'Closest to your uploaded design'
              : index === 1
                ? 'Refined variation with softer edits'
                : 'More expressive reinterpretation'
            : index === 0
              ? 'Balanced luxury direction'
              : index === 1
                ? 'Calmer and softer variation'
                : 'Bolder statement variation',
        }
      })

      setReviewOptions(options)
      setSelectedDesignUrl(options[0].url)
      setApplyError(null)
    }
  }

  const handleUploadClick = () => {
    uploadInputRef.current?.click()
  }

  const handleRemoveUploadedDesign = () => {
    setUploadedReference(null)
    setUploadError(null)
    onClearGenerationError()
    if (uploadInputRef.current) {
      uploadInputRef.current.value = ''
    }
  }

  const moveUploadedReferenceToReview = () => {
    if (!uploadedReference) {
      return
    }

    const option: ReviewDesignOption = {
      id: `uploaded-${Date.now()}`,
      url: uploadedReference.url,
      source: 'uploaded',
      label: 'Uploaded Design',
      helper: uploadedReference.fileName,
    }

    setReviewOptions([option])
    setSelectedDesignUrl(uploadedReference.url)
    setApplyError(null)
    setUploadError(null)
    onClearGenerationError()
  }

  const handleUploadDesign = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    event.target.value = ''
    onClearGenerationError()
    setApplyError(null)
    setUploadError(null)

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError('Please upload a JPG or PNG wallpaper design.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Your design is too large. Please keep it under 10MB.')
      return
    }

    try {
      setIsUploadingDesign(true)

      const formData = new FormData()
      formData.append('file', file)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to upload your wallpaper design.')
      }

      const uploadedUrl = data?.url
      if (!uploadedUrl) {
        throw new Error('Upload completed, but no design URL was returned.')
      }

      setUploadedReference({
        url: uploadedUrl,
        fileName: file.name,
      })
      resetReviewState()
    } catch (error: any) {
      setUploadError(error?.message || 'Failed to upload your wallpaper design.')
    } finally {
      setIsUploadingDesign(false)
    }
  }

  const handleApplyClick = async () => {
    if (!selectedDesignUrl) return

    setIsApplying(true)
    setApplyError(null)

    const result = await onApplyWallpaper(selectedDesignUrl)

    setIsApplying(false)

    if (!result.success) {
      setApplyError(result.error || 'Failed to apply wallpaper')
    }
  }

  const selectedOption = reviewOptions.find((option) => option.url === selectedDesignUrl) || null
  const isEditedReview = reviewOptions.some((option) => option.source === 'edited')

  return (
    <div className="space-y-6 custom-design-shell">
      {!isReviewStep ? (
        <>
          <div>
            <label className="block text-sm font-semibold mb-2 luxury-label">
              Describe your dream wallpaper
            </label>
            <textarea
              value={prompt}
              onChange={(e) => {
                onClearGenerationError()
                setUploadError(null)
                setPrompt(e.target.value)
              }}
              placeholder={
                uploadedReference
                  ? 'Example: keep the wedding elements, but change the background into a soft natural botanical scene...'
                  : 'Luxurious warm and elegant wallpaper with subtle texture...'
              }
              rows={3}
              className="w-full luxury-textarea"
            />
            {uploadedReference && (
              <p className="custom-design-reference-hint">
                Your prompt will transform the uploaded design below and create three edited wallpaper options.
              </p>
            )}
          </div>

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

          <div className="card custom-design-upload-card">
            <div className="custom-design-upload-copy">
              <h4>Upload Your Own Wallpaper Design</h4>
              <p>
                Upload your artwork as a base design, then use the prompt above to request edits and generate three refined wallpaper options.
              </p>
            </div>

            <div className="custom-design-upload-actions">
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleUploadDesign}
              />
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={isUploadingDesign}
                className="luxury-secondary-btn"
              >
                {isUploadingDesign ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Uploading Design...</span>
                  </span>
                ) : uploadedReference ? (
                  'Replace Uploaded Design'
                ) : (
                  'Upload Wallpaper Design'
                )}
              </button>
              <p className="custom-design-upload-note">JPG or PNG, up to 10MB</p>
            </div>
          </div>

          {uploadedReference && (
            <div className="card custom-design-reference-card">
              <div className="custom-design-reference-media">
                <div className="aspect-square relative">
                  <Image
                    src={uploadedReference.url}
                    alt={uploadedReference.fileName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 960px) 100vw, 220px"
                  />
                </div>
              </div>
              <div className="custom-design-reference-copy">
                <span className="custom-design-reference-kicker">Uploaded Design Reference</span>
                <h4>{uploadedReference.fileName}</h4>
                <p>
                  Keep this as your source artwork and use the prompt to request changes like background swaps, softer palettes, or more natural motifs.
                </p>
                <div className="custom-design-reference-actions">
                  <button
                    type="button"
                    onClick={moveUploadedReferenceToReview}
                    className="luxury-secondary-btn custom-design-inline-action"
                  >
                    Use Uploaded Design As-Is
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveUploadedDesign}
                    className="luxury-secondary-btn custom-design-inline-action is-muted"
                  >
                    Remove Design
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-sm action-stack">
            <button
              onClick={handleGenerateClick}
              disabled={isGenerating || !canGenerateVariants}
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
                    {jobStatus === 'processing' && (uploadedReference ? 'Editing uploaded design into 3 options...' : 'Generating 3 wallpaper options...')}
                    {!jobStatus && (uploadedReference ? 'Generating 3 Edited Variants...' : 'Generating Wallpaper Options...')}
                  </span>
                </span>
              ) : uploadedReference ? (
                'Generate 3 Variants From Uploaded Design'
              ) : (
                'Generate 3 Wallpaper Options'
              )}
            </button>
          </div>

          {isGenerating && jobStatus && (
            <div className="text-center max-w-sm mx-auto">
              <p className="text-sm inline-status">
                {jobStatus === 'queued' && 'AI service is busy right now. Retrying automatically...'}
                {jobStatus === 'processing' && (
                  uploadedReference
                    ? 'Reworking your uploaded design into three premium wallpaper directions...'
                    : 'Creating three custom wallpaper directions for you...'
                )}
              </p>
            </div>
          )}

          {generationError && (
            <div className="status-card status-card-error text-center max-w-md">
              <p className="text-sm">{generationError}</p>
            </div>
          )}

          {uploadError && (
            <div className="status-card status-card-error text-center max-w-md">
              <p className="text-sm">{uploadError}</p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6 generated-review-shell">
          <div className="text-center generated-review-header">
            <h4 className="text-lg font-semibold mb-2 generated-review-title">
              {reviewOptions.length > 1 ? 'Choose Your Wallpaper Option' : 'Review Your Wallpaper Design'}
            </h4>
            <p className="text-sm generated-review-copy">
              {reviewOptions.length > 1
                ? isEditedReview
                  ? 'We created three refined variations from your uploaded design. Pick the version that best fits your room before mapping it.'
                  : 'We created three wallpaper directions for you. Pick the one that best fits your room before mapping it.'
                : 'Your uploaded wallpaper is ready. Confirm it below, then map it onto your room.'}
            </p>
          </div>

          <div className={`generated-wallpaper-grid ${reviewOptions.length === 1 ? 'is-single' : ''}`}>
            {reviewOptions.map((option) => {
              const isSelected = option.url === selectedDesignUrl

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedDesignUrl(option.url)
                    setApplyError(null)
                  }}
                  className={`generated-wallpaper-option ${isSelected ? 'is-selected' : ''}`}
                >
                  <div className="generated-wallpaper-stage">
                    <div className="aspect-square relative generated-wallpaper-media">
                      <Image
                        src={option.url}
                        alt={option.label}
                        fill
                        className="object-cover"
                        sizes="(max-width: 980px) 100vw, 28vw"
                      />
                    </div>
                  </div>
                  <div className="generated-wallpaper-option-copy">
                    <span className="generated-wallpaper-option-label">{option.label}</span>
                    <strong>{option.helper}</strong>
                    <p>{isSelected ? 'Selected for room preview' : 'Click to choose this design'}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="space-y-3 max-w-sm mx-auto action-stack">
            <button
              onClick={handleApplyClick}
              disabled={isApplying || !selectedOption}
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
                'Apply Selected Design'
              )}
            </button>

            <button
              onClick={resetReviewState}
              disabled={isApplying}
              className="luxury-secondary-btn"
            >
              Choose Another Design
            </button>
          </div>

          {applyError && (
            <div className="status-card status-card-error text-center max-w-xs mx-auto">
              <p className="text-sm">{applyError}</p>
              <button
                onClick={resetReviewState}
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
