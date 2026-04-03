'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import Image from 'next/image'
import GenerationProgress from './GenerationProgress'
import { interpolate } from '../lib/localization'
import { useLocalization } from '../contexts/LocalizationContext'

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

const STYLE_INSPIRATION_KEYS = [
  'Tropical Paradise',
  'Warm Minimal Texture',
  'Luxury Marble Pattern',
  'Organic Botanical',
]

export default function CreateCustomDesign({
  onGenerateWallpaper,
  onApplyWallpaper,
  isGenerating,
  jobStatus,
  generationError,
  onClearGenerationError
}: CreateCustomDesignProps) {
  const { messages } = useLocalization()
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
          label: uploadedReference
            ? interpolate(messages.create.editedOptionLabel, { index: index + 1 })
            : interpolate(messages.create.optionLabel, { index: index + 1 }),
          helper: uploadedReference
            ? messages.create.editedOptionHelpers[index] || messages.create.editedOptionHelpers[0]
            : messages.create.generatedOptionHelpers[index] || messages.create.generatedOptionHelpers[0],
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
      label: messages.create.referenceKicker,
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
      setUploadError(messages.create.uploadInvalidType)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(messages.create.uploadTooLarge)
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
        throw new Error(data?.detail || messages.create.uploadFailed)
      }

      const uploadedUrl = data?.url
      if (!uploadedUrl) {
        throw new Error(messages.create.uploadFailed)
      }

      setUploadedReference({
        url: uploadedUrl,
        fileName: file.name,
      })
      resetReviewState()
    } catch (error: any) {
      setUploadError(error?.message || messages.create.uploadFailed)
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
              {messages.create.describeLabel}
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
                  ? messages.create.promptPlaceholderWithReference
                  : messages.create.promptPlaceholder
              }
              rows={3}
              className="w-full luxury-textarea"
            />
            {uploadedReference && (
              <p className="custom-design-reference-hint">
                {messages.create.promptHint}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3 luxury-label">
              {messages.create.styleInspiration}
            </label>
            <div className="flex flex-wrap gap-2 filter-chip-row">
              {STYLE_INSPIRATION_KEYS.map((styleKey, index) => {
                const styleLabel = messages.create.styleOptions[index] || styleKey
                const isSelected = selectedStyleInspirations.includes(styleKey)
                return (
                  <button
                    key={styleKey}
                    onClick={() => handleStyleInspirationClick(styleKey)}
                    className={`filter-chip ${isSelected ? 'is-selected' : ''}`}
                  >
                    {styleLabel}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card custom-design-upload-card">
            <div className="custom-design-upload-copy">
              <h4>{messages.create.uploadTitle}</h4>
              <p>
                {messages.create.uploadCopy}
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
                    <span>{messages.create.uploadingButton}</span>
                  </span>
                ) : uploadedReference ? (
                  messages.create.replaceButton
                ) : (
                  messages.create.uploadButton
                )}
              </button>
              <p className="custom-design-upload-note">{messages.create.uploadNote}</p>
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
                <span className="custom-design-reference-kicker">{messages.create.referenceKicker}</span>
                <h4>{uploadedReference.fileName}</h4>
                <p>
                  {messages.create.referenceCopy}
                </p>
                <div className="custom-design-reference-actions">
                  <button
                    type="button"
                    onClick={moveUploadedReferenceToReview}
                    className="luxury-secondary-btn custom-design-inline-action"
                  >
                    {messages.create.useAsIs}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveUploadedDesign}
                    className="luxury-secondary-btn custom-design-inline-action is-muted"
                  >
                    {messages.create.removeDesign}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isGenerating ? (
            <GenerationProgress
              variant="wallpaper"
              status={jobStatus}
              className="custom-generation-progress"
            />
          ) : (
            <div className="max-w-sm action-stack">
              <button
                onClick={handleGenerateClick}
                disabled={!canGenerateVariants}
                className="luxury-submit-btn"
              >
                {uploadedReference ? messages.create.generateUploaded : messages.create.generateGeneric}
              </button>
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
              {reviewOptions.length > 1 ? messages.create.reviewTitleMultiple : messages.create.reviewTitleSingle}
            </h4>
            <p className="text-sm generated-review-copy">
              {reviewOptions.length > 1
                ? isEditedReview
                  ? messages.create.reviewCopyEdited
                  : messages.create.reviewCopyGenerated
                : messages.create.reviewCopySingle}
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
                    <p>{isSelected ? messages.create.selectedForPreview : messages.create.clickToChoose}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="space-y-3 max-w-sm mx-auto action-stack">
            {isApplying ? (
              <GenerationProgress
                variant="mapping"
                status={jobStatus}
                className="custom-generation-progress"
              />
            ) : (
              <button
                onClick={handleApplyClick}
                disabled={!selectedOption}
                className="luxury-submit-btn"
              >
                {messages.create.applySelected}
              </button>
            )}

            <button
              onClick={resetReviewState}
              disabled={isApplying}
              className="luxury-secondary-btn"
            >
              {messages.create.chooseAnother}
            </button>
          </div>

          {applyError && (
            <div className="status-card status-card-error text-center max-w-xs mx-auto">
              <p className="text-sm">{applyError}</p>
              <button
                onClick={resetReviewState}
                className="text-sm font-medium mt-2 luxury-inline-link"
              >
                {messages.create.tryDifferent}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
