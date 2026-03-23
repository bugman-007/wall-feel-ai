'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface WallMask {
  id: string
  area: number
  bbox: number[]
  segmentation: number[][]
}

interface WallSelectorProps {
  imageUrl: string
  masks: WallMask[]
  onWallSelect: (maskId: string) => void
  selectedMaskId?: string | null
}

export default function WallSelector({
  imageUrl,
  masks,
  onWallSelect,
  selectedMaskId
}: WallSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hoveredMaskId, setHoveredMaskId] = useState<string | null>(null)

  useEffect(() => {
    if (imageLoaded && canvasRef.current && imageRef.current) {
      // Use requestAnimationFrame for smoother rendering
      const frameId = requestAnimationFrame(() => {
        drawMasks()
      })
      return () => cancelAnimationFrame(frameId)
    }
  }, [imageLoaded, masks, selectedMaskId, hoveredMaskId])

  const drawMasks = () => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match image
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw each mask
    masks.forEach((mask) => {
      const isSelected = mask.id === selectedMaskId
      const isHovered = mask.id === hoveredMaskId

      // Draw mask polygon
      ctx.beginPath()
      mask.segmentation.forEach((point, index) => {
        const [x, y] = point
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.closePath()

      // Fill with semi-transparent color
      if (isSelected) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)' // Blue
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(139, 92, 246, 0.2)' // Purple
      } else {
        ctx.fillStyle = 'rgba(156, 163, 175, 0.15)' // Gray
      }
      ctx.fill()

      // Draw border
      ctx.strokeStyle = isSelected
        ? 'rgba(59, 130, 246, 0.8)'
        : isHovered
        ? 'rgba(139, 92, 246, 0.6)'
        : 'rgba(156, 163, 175, 0.4)'
      ctx.lineWidth = isSelected ? 4 : isHovered ? 3 : 2
      ctx.stroke()

      // Draw label
      const [x, y, width, height] = mask.bbox
      const centerX = x + width / 2
      const centerY = y + height / 2

      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Draw text background
      const text = `Wall ${masks.indexOf(mask) + 1}`
      const textMetrics = ctx.measureText(text)
      const padding = 10
      ctx.fillStyle = isSelected
        ? 'rgba(59, 130, 246, 0.9)'
        : isHovered
        ? 'rgba(139, 92, 246, 0.8)'
        : 'rgba(75, 85, 99, 0.8)'
      ctx.fillRect(
        centerX - textMetrics.width / 2 - padding,
        centerY - 12 - padding,
        textMetrics.width + padding * 2,
        24 + padding * 2
      )

      // Draw text
      ctx.fillStyle = 'white'
      ctx.fillText(text, centerX, centerY)
    })
  }

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    // Check which mask was clicked
    for (const mask of masks) {
      if (isPointInPolygon([x, y], mask.segmentation)) {
        onWallSelect(mask.id)
        return
      }
    }
  }, [masks, onWallSelect])

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    // Check which mask is being hovered
    let foundMask = false
    for (const mask of masks) {
      if (isPointInPolygon([x, y], mask.segmentation)) {
        setHoveredMaskId(prev => prev !== mask.id ? mask.id : prev)
        foundMask = true
        break
      }
    }

    if (!foundMask) {
      setHoveredMaskId(prev => prev !== null ? null : prev)
    }
  }, [masks])

  const isPointInPolygon = (point: number[], polygon: number[][]): boolean => {
    const [x, y] = point
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]
      const [xj, yj] = polygon[j]

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

      if (intersect) inside = !inside
    }

    return inside
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        {/* Base image */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Room"
          className="w-full h-auto"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Canvas overlay for masks */}
        {imageLoaded && (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredMaskId(null)}
            className="absolute inset-0 w-full h-full cursor-pointer"
            style={{ mixBlendMode: 'normal' }}
          />
        )}
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
              Click on a wall to select it
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              The selected wall will be highlighted in blue. You can change your selection at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
