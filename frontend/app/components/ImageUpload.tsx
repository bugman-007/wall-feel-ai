'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useLocalization } from '../contexts/LocalizationContext'

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string, uploadedUrl?: string) => void
}

const CameraCapture = dynamic(() => import('./CameraCapture'), {
  ssr: false,
})

export default function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const { messages } = useLocalization()
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearProgressTimers = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    if (progressResetTimeoutRef.current) {
      clearTimeout(progressResetTimeoutRef.current)
      progressResetTimeoutRef.current = null
    }
  }, [])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      clearProgressTimers()
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [clearProgressTimers, preview])

  const uploadToBackend = useCallback(async (file: File, previewUrl: string) => {
    clearProgressTimers()
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      // Simulate progress (since fetch doesn't support upload progress easily)
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      clearProgressTimers()
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const data = await response.json()

      // Notify parent with uploaded URL
      onImageSelect(file, previewUrl, data.url)

    } catch (err: any) {
      setError(err.message || messages.upload.uploadFailed)
      console.error('Upload error:', err)
    } finally {
      clearProgressTimers()
      setUploading(false)
      progressResetTimeoutRef.current = setTimeout(() => {
        setUploadProgress(0)
        progressResetTimeoutRef.current = null
      }, 1000)
    }
  }, [clearProgressTimers, messages.upload.uploadFailed, onImageSelect])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(messages.upload.uploadTooLarge)
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError(messages.upload.uploadInvalidType)
      } else {
        setError(messages.upload.uploadFailed)
      }
      return
    }

    // Handle accepted file
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setFileName(file.name)

      // Revoke old preview URL to prevent memory leak
      if (preview) {
        URL.revokeObjectURL(preview)
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)

      // Upload to backend
      uploadToBackend(file, previewUrl)
    }
  }, [messages.upload.uploadFailed, messages.upload.uploadInvalidType, messages.upload.uploadTooLarge, preview, uploadToBackend])

  const handleCameraCapture = (file: File) => {
    setFileName(file.name)

    if (preview) {
      URL.revokeObjectURL(preview)
    }

    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    uploadToBackend(file, previewUrl)
    setShowCamera(false)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    disabled: uploading
  })

  const clearImage = () => {
    clearProgressTimers()
    if (preview) {
      URL.revokeObjectURL(preview)
    }
    setPreview(null)
    setFileName('')
    setError(null)
    setUploadProgress(0)
  }

  return (
    <div className="upload-stage w-full max-w-5xl mx-auto">
      {!preview ? (
        <div className="upload-stage-shell">
          <div className="upload-stage-header">
            <div className="upload-stage-brand brand-lockup">
              <span className="brand-logo" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
              <span className="brand-mark">WallFeel.</span>
            </div>
            <p className="upload-stage-kicker">{messages.upload.stagePrompt}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 upload-split">
            {/* Left Card: Upload from Gallery */}
            <div
              {...getRootProps()}
              className="card upload-panel upload-dropzone upload-gallery-panel"
              style={{
                borderStyle: isDragActive ? 'solid' : 'dashed',
                borderColor: isDragActive ? 'var(--gold-strong)' : 'var(--border-light)',
                opacity: uploading ? 0.5 : 1,
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              <input {...getInputProps()} />

              <div className="upload-panel-frame">
                <div className="upload-icon-row">
                  <div className="upload-icon-pill">
                    <Image
                      src="/ui-icons/gallery-upload.png"
                      alt=""
                      width={42}
                      height={42}
                      className="upload-icon-image"
                    />
                  </div>
                  <span className="upload-plus">+</span>
                  <div className="upload-icon-pill upload-icon-pill-accent">
                    <Image
                      src="/ui-icons/camera-capture.png"
                      alt=""
                      width={42}
                      height={42}
                      className="upload-icon-image"
                    />
                  </div>
                </div>

                {isDragActive ? (
                  <p className="upload-panel-title">{messages.upload.dropHere}</p>
                ) : (
                  <p className="upload-panel-title">{messages.upload.dragAndDrop}</p>
                )}

                <p className="upload-panel-copy">{messages.upload.filesHint}</p>
                <p className="upload-panel-footnote">{messages.upload.guidance}</p>

                <div className="flex justify-center">
                  <Image
                    src="/ui-icons/cloud-upload.png"
                    alt=""
                    width={84}
                    height={84}
                    className="upload-panel-cloud-image"
                  />
                </div>
              </div>
            </div>

            {/* Right Card: Take a Photo */}
            <div
              className="card upload-panel upload-camera-panel"
              style={{
                opacity: uploading ? 0.5 : 1,
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation()
                setShowCamera(true)
              }}
            >
              <div className="upload-camera-header">
                <p className="upload-side-title">{messages.upload.captureTitle}</p>
                <p className="upload-side-copy">{messages.upload.captureCopy}</p>
              </div>

              <div className="upload-best-list">
                <div className="upload-best-list-title">{messages.upload.bestResultsTitle}</div>
                <ul>
                  {messages.upload.bestResults.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="upload-camera-actions">
                <div className="flex justify-center">
                  <Image
                    src="/ui-icons/camera-capture.png"
                    alt=""
                    width={92}
                    height={92}
                    className="upload-camera-hero-image"
                  />
                </div>

                <button
                  type="button"
                  className="gold-btn upload-camera-btn"
                  disabled={uploading}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCamera(true)
                  }}
                >
                  {messages.upload.openCamera}
                </button>
              </div>
            </div>
          </div>

          {/* Camera Capture Modal */}
          {showCamera && (
            <CameraCapture
              onCapture={handleCameraCapture}
              onClose={() => setShowCamera(false)}
            />
          )}
        </div>
      ) : (
        <div className="upload-stage-shell upload-preview-shell">
          <div className="upload-stage-header">
            <div className="upload-stage-brand brand-lockup">
              <span className="brand-logo" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
              <span className="brand-mark">WallFeel.</span>
            </div>
            <p className="upload-stage-kicker">{messages.upload.stageReady}</p>
          </div>

          <div className="preview-stage-frame">
            <Image
              src={preview}
              alt="Uploaded room"
              width={1200}
              height={800}
              className="w-full h-auto"
              unoptimized
            />

            {/* Upload overlay */}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center upload-preview-overlay">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4 upload-spinner"></div>
                  <p className="text-white font-medium">{messages.upload.uploading} {uploadProgress}%</p>
                </div>
              </div>
            )}
          </div>

          <div className="preview-meta-bar">
            <div className="flex items-center space-x-3">
              {uploading ? (
                <svg className="animate-spin h-5 w-5" style={{ color: 'var(--text-primary)' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
                  <svg className="w-3 h-3" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <span className="text-sm font-medium preview-file-name">
                {fileName}
              </span>
            </div>

            <button
              onClick={clearImage}
              disabled={uploading}
              className={`preview-remove-btn ${uploading ? 'is-disabled' : ''}`}
            >
              {messages.common.remove}
            </button>
          </div>

          {/* Progress bar */}
          {uploading && uploadProgress > 0 && (
            <div className="luxury-progress-rail">
              <div
                className="luxury-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="status-card status-card-error mt-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {error}
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
