'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string, uploadedUrl?: string) => void
}

export default function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const uploadToBackend = async (file: File, previewUrl: string) => {
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
  }

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
  }, [preview])

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

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!preview ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />

          <div className="space-y-4">
            <div className="flex justify-center">
              <svg
                className="w-16 h-16 text-gray-400"
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
              <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                Drop your image here
              </p>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Drag & drop your room photo here
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  or click to browse
                </p>
              </>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500">
              Supports: JPEG, PNG (max 10MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image
              src={preview}
              alt="Uploaded room"
              width={800}
              height={600}
              className="w-full h-auto"
              unoptimized
            />

            {/* Upload overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white font-medium">Uploading... {uploadProgress}%</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              {uploading ? (
                <svg
                  className="animate-spin h-5 w-5 text-blue-500"
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
              ) : (
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {fileName}
              </span>
            </div>

            <button
              onClick={clearImage}
              disabled={uploading}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                uploading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
              }`}
            >
              Remove
            </button>
          </div>

          {/* Progress bar */}
          {uploading && uploadProgress > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
