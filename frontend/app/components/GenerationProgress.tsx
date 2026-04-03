'use client'

import { useEffect, useState } from 'react'
import { useLocalization } from '../contexts/LocalizationContext'

type GenerationVariant = 'wallpaper' | 'preview' | 'mapping'
type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed' | null | undefined

interface GenerationProgressProps {
  variant: GenerationVariant
  status?: GenerationStatus
  className?: string
}

export default function GenerationProgress({
  variant,
  status,
  className = '',
}: GenerationProgressProps) {
  const { messages } = useLocalization()
  const story = messages.progress[variant].map((frame, index) => ({
    ...frame,
    tone: variant === 'wallpaper'
      ? ['champagne', 'sage', 'bronze'][index] || 'champagne'
      : variant === 'preview'
        ? ['champagne', 'teal', 'bronze'][index] || 'champagne'
        : ['champagne', 'sage', 'teal'][index] || 'champagne',
  }))
  const [frameIndex, setFrameIndex] = useState(0)
  const [progress, setProgress] = useState(status === 'queued' ? 8 : 14)

  useEffect(() => {
    setFrameIndex(0)
    setProgress(status === 'queued' ? 8 : 14)
  }, [variant, status])

  useEffect(() => {
    const frameTimer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % story.length)
    }, 1700)

    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        const ceiling = status === 'queued' ? 34 : 91
        const step = status === 'queued'
          ? Math.max(0.35, (ceiling - current) * 0.05)
          : Math.max(0.55, (ceiling - current) * 0.08)
        return Math.min(ceiling, current + step)
      })
    }, 120)

    return () => {
      window.clearInterval(frameTimer)
      window.clearInterval(progressTimer)
    }
  }, [status, story.length])

  const activeFrame = story[frameIndex]
  const title = status === 'queued' ? messages.progress.queuedTitle : activeFrame.title
  const detail = status === 'queued'
    ? messages.progress.queuedDetail
    : activeFrame.detail

  return (
    <div className={`generation-progress ${className}`.trim()} aria-live="polite">
      <div className="generation-progress-stage" data-tone={activeFrame.tone}>
        <div className="generation-progress-stack" aria-hidden="true">
          <span className="generation-progress-sheet sheet-back" />
          <span className="generation-progress-sheet sheet-mid" />
          <span className="generation-progress-sheet sheet-front" />
          <span className="generation-progress-orb">
            <span className="generation-progress-spark spark-one" />
            <span className="generation-progress-spark spark-two" />
            <span className="generation-progress-spark spark-three" />
          </span>
        </div>
      </div>

      <div className="generation-progress-copy">
        <p className="generation-progress-title">{title}</p>
        <p className="generation-progress-detail">{detail}</p>
      </div>

      <div className="generation-progress-footer">
        <div className="generation-progress-rail" aria-hidden="true">
          <span
            className="generation-progress-fill"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
        <span className="generation-progress-percent">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}
