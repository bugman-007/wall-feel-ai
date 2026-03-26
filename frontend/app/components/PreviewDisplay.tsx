'use client'

import { useState } from 'react'
import Image from 'next/image'

interface PreviewDisplayProps {
  originalUrl: string
  previewUrl: string
  onClose?: () => void
}

export default function PreviewDisplay({
  originalUrl,
  previewUrl,
  onClose
}: PreviewDisplayProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault() // Prevent text selection
    setIsDragging(true)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.preventDefault() // Prevent text selection during drag

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, percentage)))
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Comparison Container */}
      <div
        className="relative rounded-lg overflow-hidden cursor-col-resize select-none card"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ minHeight: '400px' }}
      >
        {/* Original Image (Background) */}
        <div className="relative w-full h-[600px] pointer-events-none">
          <Image
            src={originalUrl}
            alt="Original room"
            fill
            className="object-contain"
            unoptimized
            draggable={false}
            sizes="100vw"
          />
        </div>

        {/* Preview Image (Overlay with clip) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
          }}
        >
          <Image
            src={previewUrl}
            alt="Preview with wallpaper"
            fill
            className="object-contain"
            unoptimized
            draggable={false}
            sizes="100vw"
          />
        </div>

        {/* Slider Line */}
        <div
          className="absolute top-0 bottom-0 w-1 shadow-lg cursor-col-resize"
          style={{ left: `${sliderPosition}%`, background: 'var(--text-primary)' }}
        >
          {/* Slider Handle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full shadow-lg flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
            <svg
              className="w-4 h-4"
              style={{ color: 'var(--bg-primary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 px-3 py-1 rounded text-sm font-medium" style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}>
          Before
        </div>
        <div className="absolute top-4 right-4 px-3 py-1 rounded text-sm font-medium" style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}>
          After
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
      {onClose && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Try Different Wallpaper
          </button>
        </div>
      )}
    </div>
  )
}
