'use client'

import { useState } from 'react'
import Image from 'next/image'

interface PreviewDisplayProps {
  originalUrl: string
  previewUrl: string
  onClose?: () => void
  quality?: '1k' | '2k' | '4k' | '8k'
}

export default function PreviewDisplay({
  originalUrl,
  previewUrl,
  onClose,
  quality = '1k'
}: PreviewDisplayProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)

      // Fetch the image as a blob via our backend proxy to avoid CORS issues
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/download-preview?url=${encodeURIComponent(previewUrl)}&quality=${quality}`)

      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `wallfeel-preview-${quality}.png`
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault() // Prevent text selection
    setIsDragging(true)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.preventDefault() // Prevent text selection during drag

    const rect = (e.target as HTMLElement).closest('.comparison-container')?.getBoundingClientRect()
    if (!rect) return

    // Handle both mouse and touch events
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const x = clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, percentage)))
  }

  
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)

  const handleOriginalLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    const containerWidth = e.currentTarget.parentElement?.offsetWidth || 0
    if (containerWidth > 0 && naturalWidth > 0) {
      const scale = containerWidth / naturalWidth
      setImageDimensions({
        width: naturalWidth * scale,
        height: naturalHeight * scale
      })
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Comparison Container */}
      <div
        className="comparison-container relative rounded-lg overflow-hidden cursor-col-resize select-none card"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleMouseMove}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        style={{ minHeight: '500px' }}
      >
        {/* Original Image (Background) */}
        <div className="relative w-full h-[650px] pointer-events-none flex items-center justify-center">
          <Image
            src={originalUrl}
            alt="Original room"
            fill
            className="object-contain"
            unoptimized
            draggable={false}
            sizes="100vw"
            onLoad={handleOriginalLoad}
          />
        </div>

        {/* Preview Image (Overlay with clip) */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
          }}
        >
          {imageDimensions && (
            <Image
              src={previewUrl}
              alt="Preview with wallpaper"
              width={imageDimensions.width}
              height={imageDimensions.height}
              className="object-contain"
              unoptimized
              draggable={false}
            />
          )}
        </div>

        {/* Slider Line */}
        <div
          className="absolute top-0 bottom-0 w-1.5 shadow-xl cursor-col-resize"
          style={{
            left: `${sliderPosition}%`,
            background: '#c8aa75',
            boxShadow: '0 0 10px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.3)'
          }}
        >
          {/* Slider Handle */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-xl flex items-center justify-center"
            style={{
              background: '#c8aa75',
              border: '3px solid rgba(255,255,255,0.8)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
            }}
          >
            <svg
              className="w-5 h-5"
              style={{ color: '#ffffff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 px-3 py-1 rounded text-sm font-medium" style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}>
          After
        </div>
        <div className="absolute top-4 right-4 px-3 py-1 rounded text-sm font-medium" style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}>
          Before
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 rounded-xl card">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Drag the slider to compare before and after
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Move the slider left and right to see how the wallpaper looks on your wall.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-center space-x-4">
        {onClose && (
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Try Different Wallpaper
          </button>
        )}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="btn-primary flex items-center space-x-2"
          title={`Download ${quality.toUpperCase()} quality image`}
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download {quality.toUpperCase()}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
