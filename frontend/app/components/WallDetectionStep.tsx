'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface Point {
  x: number
  y: number
}

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface WallDetectionStepProps {
  imageUrl: string
  onWallDetected: (segmentation: number[][], boundingBox: BoundingBox, source: 'auto' | 'manual') => void
  onSkip: () => void
}

export default function WallDetectionStep({
  imageUrl,
  onWallDetected,
  onSkip
}: WallDetectionStepProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)
  const [points, setPoints] = useState<Point[]>([])
  const [isDragging, setIsDragging] = useState<number | null>(null)
  const [hasUserModified, setHasUserModified] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle auto-detect
  const handleAutoDetect = async () => {
    setIsDetecting(true)
    setDetectError(null)
    setPoints([])
    setHasUserModified(false)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/ai-detect-wall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl
        })
      })

      if (!response.ok) {
        throw new Error('Wall detection failed')
      }

      const data = await response.json()

      if (data.success && data.wall && data.wall.segmentation) {
        // Convert backend segmentation to points
        setPoints(data.wall.segmentation.map((p: number[]) => ({ x: p[0], y: p[1] })))
      } else {
        setDetectError('AI could not detect a wall. Please try manual selection.')
      }
    } catch (err: any) {
      setDetectError(err.message || 'Failed to detect wall. Please adjust the corners manually.')
      console.error('Wall detection error:', err)
    } finally {
      setIsDetecting(false)
    }
  }

  // Handle point drag start
  const handlePointMouseDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    setIsDragging(index)
  }

  // Handle mouse move (dragging)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging === null || points.length === 0) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setPoints(prev => {
      const newPoints = [...prev]
      newPoints[isDragging] = { x, y }
      return newPoints
    })
    setHasUserModified(true)
  }

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(null)
  }

  // Calculate bounding box from points
  const getBoundingBox = (pts: Point[]): BoundingBox => {
    if (pts.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    const minX = Math.min(...pts.map(p => p.x))
    const minY = Math.min(...pts.map(p => p.y))
    const maxX = Math.max(...pts.map(p => p.x))
    const maxY = Math.max(...pts.map(p => p.y))
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  // Handle confirm
  const handleConfirm = () => {
    if (points.length !== 4) return
    const boundingBox = getBoundingBox(points)
    const segmentation: number[][] = points.map(p => [p.x, p.y])
    onWallDetected(segmentation, boundingBox, hasUserModified ? 'manual' : 'auto')
  }

  // Handle reset
  const handleReset = () => {
    setPoints([])
    setHasUserModified(false)
    handleAutoDetect()
  }

  // Auto-detect on mount
  useEffect(() => {
    handleAutoDetect()
  }, [])

  // Get polygon points string for SVG
  const polygonPoints = points.length > 0 ? points.map(p => `${p.x},${p.y}`).join(' ') : ''

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
        Select Wall Area
      </h2>

      {/* Detection Status */}
      {isDetecting && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 mb-4" style={{ border: '3px solid var(--border-light)', borderTopColor: 'var(--text-primary)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>AI is detecting the wall...</p>
        </div>
      )}

      {/* Error State */}
      {detectError && points.length === 0 && (
        <div className="mb-6 p-4 rounded-xl border" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{detectError}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Drag the corners to adjust the wall area, then click Confirm.
          </p>
        </div>
      )}

      {/* Wall Selection Area */}
      {points.length > 0 && (
        <div className="mb-6">
          <div
            ref={containerRef}
            className="relative rounded-lg overflow-hidden cursor-crosshair select-none card"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Background Image */}
            <Image
              src={imageUrl}
              alt="Select wall area"
              width={800}
              height={600}
              className="w-full h-auto"
              unoptimized
              draggable={false}
            />

            {/* Overlay and Selection SVG */}
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ zIndex: 1 }}
            >
              <defs>
                {/* Mask: white = visible, black = hidden */}
                <mask id="wallMask">
                  {/* White rectangle (visible) */}
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {/* Black polygon (hidden = wall area stays original brightness) */}
                  {points.length >= 3 && (
                    <polygon
                      points={polygonPoints}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>

              {/* Dark overlay with mask applied (wall area shows through) */}
              {points.length >= 3 && (
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="black"
                  fillOpacity={0.1}
                  mask="url(#wallMask)"
                />
              )}

              {/* Border lines around wall area */}
              {points.length >= 2 && (
                <>
                  {points.map((_, i) => {
                    const nextI = (i + 1) % points.length
                    return (
                      <line
                        key={`line-${i}`}
                        x1={points[i].x}
                        y1={points[i].y}
                        x2={points[nextI].x}
                        y2={points[nextI].y}
                        stroke="white"
                        strokeWidth={3}
                        strokeLinecap="round"
                      />
                    )
                  })}
                </>
              )}

              {/* Corner points (drag handles) - pointer events enabled */}
              {points.map((point, index) => (
                <circle
                  key={`point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={10}
                  fill="white"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  style={{ cursor: 'move' }}
                  onMouseDown={(e) => handlePointMouseDown(e, index)}
                />
              ))}
            </svg>
          </div>

          {/* Info message */}
          <div className="mt-4 p-4 rounded-xl card">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {hasUserModified
                    ? 'Wall area adjusted. Drag corners to fine-tune.'
                    : 'AI detected this wall area. Drag any corner to adjust.'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Dimensions: {getBoundingBox(points).width.toFixed(0)} × {getBoundingBox(points).height.toFixed(0)} px
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-4">
            <button
              onClick={handleReset}
              className="btn-secondary"
            >
              Re-detect
            </button>
            <button
              onClick={handleConfirm}
              className="btn-primary"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Initial State - No detection yet */}
      {!isDetecting && points.length === 0 && !detectError && (
        <div className="text-center py-12">
          <button
            onClick={handleAutoDetect}
            className="btn-primary text-lg"
          >
            Detect Wall with AI
          </button>
        </div>
      )}

      {/* Skip option */}
      <div className="text-center mt-6">
        <button
          onClick={onSkip}
          className="text-sm underline transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          Skip wall detection (use full image)
        </button>
      </div>
    </div>
  )
}
