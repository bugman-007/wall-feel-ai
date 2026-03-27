'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import CameraCapture from './CameraCapture'

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string, uploadedUrl?: string) => void
}

export default function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showCamera, setShowCamera] = useState(false)

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const uploadToBackend = useCallback(async (file: File, previewUrl: string) => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      // Simulate progress (since fetch doesn't support upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const data = await response.json()

      // Notify parent with uploaded URL
      onImageSelect(file, previewUrl, data.url)

    } catch (err: any) {
      setError(err.message || 'Failed to upload image. Please try again.')
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }, [onImageSelect])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 10MB.')
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload a JPEG or PNG image.')
      } else {
        setError('Failed to upload file. Please try again.')
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
  }, [preview, uploadToBackend])

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
    if (preview) {
      URL.revokeObjectURL(preview)
    }
    setPreview(null)
    setFileName('')
    setError(null)
    setUploadProgress(0)
  }

  const handleCameraCapture = (file: File) => {
    setFileName(file.name)
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    uploadToBackend(file, previewUrl)
    setShowCamera(false)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {!preview ? (
        <div
          className="card p-12 text-center cursor-pointer transition-all duration-200 hover:scale-[1.02] upload-dropzone"
          style={{
            borderStyle: isDragActive ? 'solid' : 'dashed',
            borderColor: isDragActive ? 'var(--text-primary)' : 'var(--border-light)',
            background: isDragActive ? 'var(--bg-secondary)' : 'var(--bg-card)',
            opacity: uploading ? 0.5 : 1,
            cursor: uploading ? 'not-allowed' : 'pointer',
            position: 'relative'
          }}
          onClick={() => {}}
        >
          <input {...getInputProps()} />

          {/* Camera Capture Button - Always visible */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
            className="camera-btn"
            title="Take a photo with camera"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'var(--gold)',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(200, 170, 117, 0.3)',
              zIndex: 10
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg className="w-6 h-6" style={{ color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <div className="space-y-4">

            <div className="flex justify-center">
              <svg
                className="w-16 h-16"
                style={{ color: 'var(--text-muted)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            {isDragActive ? (
              <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                Drop your image here
              </p>
            ) : (
              <>
                <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Drag & drop your room photo here
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  or click to browse
                </p>
              </>
            )}

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Supports: JPEG, PNG (max 10MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden card" style={{ background: 'var(--bg-secondary)' }}>
            <Image
              src={preview}
              alt="Uploaded room"
              width={1200}
              height={800}
              className="w-full h-auto"
              unoptimized
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                const container = target.parentElement;
                if (container) {
                  container.style.minHeight = 'auto';
                  container.style.height = 'auto';
                }
              }}
            />

            {/* Upload overlay */}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4" style={{ border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--text-primary)' }}></div>
                  <p className="text-white font-medium">Uploading... {uploadProgress}%</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 card">
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
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {fileName}
              </span>
            </div>

            <button
              onClick={clearImage}
              disabled={uploading}
              className="text-sm font-medium transition-colors"
              style={{
                color: uploading ? 'var(--text-muted)' : '#ef4444',
                cursor: uploading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.opacity = '0.7' }}
              onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.opacity = '1' }}
            >
              Remove
            </button>
          </div>

          {/* Progress bar */}
          {uploading && uploadProgress > 0 && (
            <div className="w-full rounded-full h-2" style={{ background: 'var(--bg-tertiary)' }}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ background: 'var(--text-primary)', width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-xl border" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}>
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

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  )
}
