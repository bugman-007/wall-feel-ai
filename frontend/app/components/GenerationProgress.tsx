'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocalization } from '../contexts/LocalizationContext'

type GenerationVariant = 'wallpaper' | 'preview' | 'mapping'
type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed' | null | undefined

interface GenerationProgressProps {
  variant: GenerationVariant
  status?: GenerationStatus
  className?: string
}

const PROCESSING_DURATION_MS: Record<GenerationVariant, number> = {
  preview: 45000,
  mapping: 45000,
  wallpaper: 35000,
}

const MESSAGE_ROTATION_MS = 4000
const PROGRESS_TICK_MS = 250
const QUEUED_START_PERCENT = 6
const QUEUED_END_PERCENT = 18
const PROCESSING_MID_PERCENT = 78
const PROCESSING_END_PERCENT = 92
const OVERTIME_END_PERCENT = 96
const QUEUED_DURATION_MS = 8000
const OVERTIME_DURATION_MS = 20000
const COMPLETION_DURATION_MS = 350

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function interpolate(start: number, end: number, ratio: number) {
  return start + (end - start) * ratio
}

function normalizeStatus(status: GenerationStatus): Exclude<GenerationStatus, null | undefined> {
  if (status === 'queued' || status === 'processing' || status === 'completed' || status === 'failed') {
    return status
  }

  return 'processing'
}

function getInitialProgress(status: Exclude<GenerationStatus, null | undefined>) {
  if (status === 'queued') {
    return QUEUED_START_PERCENT
  }

  if (status === 'completed') {
    return 100
  }

  return QUEUED_END_PERCENT
}

function calculateProgress(
  status: Exclude<GenerationStatus, null | undefined>,
  variant: GenerationVariant,
  stageStartTime: number,
  stageStartProgress: number,
  now: number
) {
  const elapsedMs = Math.max(0, now - stageStartTime)

  if (status === 'queued') {
    const queuedRatio = clamp(elapsedMs / QUEUED_DURATION_MS, 0, 1)
    return interpolate(stageStartProgress, QUEUED_END_PERCENT, queuedRatio)
  }

  if (status === 'processing') {
    const expectedDurationMs = PROCESSING_DURATION_MS[variant]
    const phaseOneDurationMs = expectedDurationMs * 0.7
    const phaseTwoDurationMs = expectedDurationMs - phaseOneDurationMs
    const processingStart = Math.max(stageStartProgress, QUEUED_END_PERCENT)

    if (elapsedMs <= phaseOneDurationMs) {
      const ratio = clamp(elapsedMs / phaseOneDurationMs, 0, 1)
      return interpolate(processingStart, PROCESSING_MID_PERCENT, ratio)
    }

    if (elapsedMs <= expectedDurationMs) {
      const ratio = clamp((elapsedMs - phaseOneDurationMs) / phaseTwoDurationMs, 0, 1)
      return interpolate(PROCESSING_MID_PERCENT, PROCESSING_END_PERCENT, ratio)
    }

    const overtimeRatio = clamp((elapsedMs - expectedDurationMs) / OVERTIME_DURATION_MS, 0, 1)
    return interpolate(PROCESSING_END_PERCENT, OVERTIME_END_PERCENT, overtimeRatio)
  }

  if (status === 'completed') {
    const completionRatio = clamp(elapsedMs / COMPLETION_DURATION_MS, 0, 1)
    return interpolate(stageStartProgress, 100, completionRatio)
  }

  return stageStartProgress
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
  const normalizedStatus = normalizeStatus(status)
  const initialProgress = getInitialProgress(normalizedStatus)
  const [frameIndex, setFrameIndex] = useState(0)
  const [progress, setProgress] = useState(initialProgress)
  const progressRef = useRef(initialProgress)
  const stageStartTimeRef = useRef(Date.now())
  const stageStartProgressRef = useRef(initialProgress)
  const currentStatusRef = useRef(normalizedStatus)

  useEffect(() => {
    setFrameIndex(0)
  }, [variant])

  useEffect(() => {
    const frameTimer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % story.length)
    }, MESSAGE_ROTATION_MS)

    return () => {
      window.clearInterval(frameTimer)
    }
  }, [story.length])

  useEffect(() => {
    const nextStatus = normalizeStatus(status)
    if (nextStatus === currentStatusRef.current) {
      return
    }

    const now = Date.now()
    const currentProgress = progressRef.current
    const nextProgress = nextStatus === 'queued'
      ? QUEUED_START_PERCENT
      : nextStatus === 'processing'
        ? Math.max(currentProgress, QUEUED_END_PERCENT)
        : currentProgress

    currentStatusRef.current = nextStatus
    stageStartTimeRef.current = now
    stageStartProgressRef.current = nextProgress
    progressRef.current = nextProgress
    setProgress(nextProgress)
  }, [status])

  useEffect(() => {
    if (normalizeStatus(status) === 'failed') {
      return
    }

    const tickProgress = () => {
      const nextProgress = calculateProgress(
        currentStatusRef.current,
        variant,
        stageStartTimeRef.current,
        stageStartProgressRef.current,
        Date.now()
      )

      progressRef.current = nextProgress
      setProgress(nextProgress)
    }

    tickProgress()
    const progressTimer = window.setInterval(tickProgress, PROGRESS_TICK_MS)

    return () => {
      window.clearInterval(progressTimer)
    }
  }, [status, variant])

  const activeFrame = story[frameIndex]
  const title = normalizedStatus === 'queued' ? messages.progress.queuedTitle : activeFrame.title
  const detail = normalizedStatus === 'queued'
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
