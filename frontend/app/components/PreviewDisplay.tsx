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
        className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-col-resize select-none"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Original Image (Background) */}
        <div className="relative w-full aspect-[4/3] pointer-events-none">
          <Image
            src={originalUrl}
            alt="Original room"
            fill
            className="object-cover"
            unoptimized
            draggable={false}
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
            className="object-cover"
            unoptimized
            draggable={false}
          />
        </div>

        {/* Slider Line */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Slider Handle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-600"
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
        <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded text-sm font-medium">
          Before
        </div>
        <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded text-sm font-medium">
          After
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start space-x-3">
          <svg
            className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Drag the slider to compare before and after
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
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
            className="px-6 py-3 rounded-lg font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Try Different Wall
          </button>
        )}
        <button
          onClick={() => alert('Measurements & Pricing (Step 9) coming next!')}
          className="px-6 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
        >
          Continue to Pricing
        </button>
      </div>
    </div>
  )
}
