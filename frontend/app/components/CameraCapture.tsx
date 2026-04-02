'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

type FacingMode = 'environment' | 'user'

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [torchOn, setTorcon] = useState(false)
  const [showShutter, setShowShutter] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const facingModeRef = useRef<FacingMode>('environment')
  const cameraRequestRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stopStream = useCallback((currentStream: MediaStream | null = streamRef.current) => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop())
    }

    if (videoRef.current && videoRef.current.srcObject === currentStream) {
      videoRef.current.srcObject = null
    }

    if (streamRef.current === currentStream) {
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async (mode: FacingMode = facingModeRef.current) => {
    const requestId = ++cameraRequestRef.current

    setIsLoading(true)
    setError(null)
    setTorcon(false)
    facingModeRef.current = mode

    try {
      // Stop existing stream
      stopStream()
      setStream(null)

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      if (cameraRequestRef.current !== requestId) {
        stopStream(mediaStream)
        return
      }

      streamRef.current = mediaStream
      setStream(mediaStream)
      setFacingMode(mode)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      setIsLoading(false)
    } catch (err: any) {
      if (cameraRequestRef.current !== requestId) {
        return
      }

      setIsLoading(false)
      setError(err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions in your browser settings.'
        : err.name === 'NotFoundError'
        ? 'No camera found. Please connect a camera and try again.'
        : err.name === 'NotReadableError'
        ? 'Camera is busy. Please close other apps using the camera.'
        : err.name === 'SecurityError'
        ? 'Camera access requires HTTPS. Please use a secure connection.'
        : 'Unable to access camera. Please make sure a camera is connected.')
      console.error('Camera error:', err)
    }
  }, [stopStream])

  // Auto-start camera on mount
  useEffect(() => {
    startCamera('environment')
    return () => {
      cameraRequestRef.current += 1
      stopStream()
    }
  }, [startCamera, stopStream])

  const toggleTorch = useCallback(() => {
    if (stream) {
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities() as any
      const settings = track.getSettings() as any

      // Check if torch/flash is supported
      if (capabilities.torch || settings.torch !== undefined) {
        try {
          track.applyConstraints({
            advanced: [{ torch: !torchOn }] as any,
          })
          setTorcon(!torchOn)
        } catch (err) {
          console.error('Torch toggle failed:', err)
        }
      }
    }
  }, [stream, torchOn])

  const flipCamera = useCallback(() => {
    const newMode: FacingMode = facingMode === 'environment' ? 'user' : 'environment'
    startCamera(newMode)
  }, [facingMode, startCamera])

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1
    stopStream()
    setStream(null)
    setTorcon(false)
    setIsLoading(false)
  }, [stopStream])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (context) {
        // Set canvas to match video resolution
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            // Haptic feedback
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(50)
            }

            // Shutter animation
            setShowShutter(true)
            setTimeout(() => setShowShutter(false), 150)

            const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
              type: 'image/jpeg',
            })
            setCapturedImage(canvas.toDataURL('image/jpeg'))
            onCapture(file)
            stopCamera()
          }
        }, 'image/jpeg', 0.9)
      }
    }
  }, [onCapture, stopCamera])

  const handleClose = useCallback(() => {
    stopCamera()
    onClose()
  }, [stopCamera, onClose])

  const handleRetake = useCallback(() => {
    setCapturedImage(null)
    startCamera(facingMode)
  }, [facingMode, startCamera])

  // Check if torch is available
  const hasTorch = stream ? (stream.getVideoTracks()[0]?.getCapabilities() as any)?.torch : false

  return (
    <div className="camera-capture-overlay" onClick={handleClose}>
      <div className="camera-capture-modal" onClick={(e) => e.stopPropagation()}>
        <div className="camera-header">
          <h3>Capture Room Photo</h3>
          <button onClick={handleClose} className="camera-close-btn">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="camera-content">
          {!capturedImage ? (
            <>
              <div className="camera-viewport">
                {/* Loading indicator */}
                {isLoading && (
                  <div className="camera-loading">
                    <div className="loading-spinner" />
                    <p>Starting camera...</p>
                  </div>
                )}

                {/* Camera prompt (shown if no stream and no error) */}
                {!stream && !error && !isLoading && (
                  <div className="camera-prompt" onClick={() => startCamera()}>
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p>Click to start camera</p>
                  </div>
                )}

                {/* Video element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={stream && !isLoading ? 'active' : ''}
                />

                {/* Shutter flash effect */}
                {showShutter && <div className="shutter-flash" />}

                {/* Error display */}
                {error && (
                  <div className="camera-error">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>{error}</p>
                    <button onClick={() => startCamera()} className="retry-btn">
                      Try Again
                    </button>
                  </div>
                )}
              </div>

              {/* Camera controls */}
              {stream && !isLoading && (
                <>
                  {/* Top controls: torch and flip */}
                  <div className="camera-top-controls">
                    {hasTorch && (
                      <button
                        onClick={toggleTorch}
                        className={`control-btn ${torchOn ? 'active' : ''}`}
                        title={torchOn ? 'Turn off flash' : 'Turn on flash'}
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={flipCamera}
                      className="control-btn"
                      title="Flip camera"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>

                  {/* Bottom controls: capture button */}
                  <div className="camera-controls">
                    <button onClick={capturePhoto} className="camera-capture-btn">
                      <span className="capture-circle" />
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="captured-preview">
              <img src={capturedImage} alt="Captured" />
              <div className="camera-controls">
                <button onClick={handleRetake} className="camera-retake-btn">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retake
                </button>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <style jsx>{`
        .camera-capture-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .camera-capture-modal {
          background: var(--panel, #1a1a1a);
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .camera-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--line, #333);
          flex-shrink: 0;
        }

        .camera-header h3 {
          color: var(--text, #fff);
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
        }

        .camera-close-btn {
          background: none;
          border: none;
          color: var(--text, #fff);
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .camera-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .camera-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
        }

        .camera-viewport {
          width: 100%;
          flex: 1;
          min-height: 300px;
          max-height: 60vh;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-viewport video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: none;
        }

        .camera-viewport video.active {
          display: block;
        }

        /* Loading indicator */
        .camera-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          color: #fff;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .camera-loading p {
          font-size: 0.9rem;
          margin: 0;
          color: rgba(255, 255, 255, 0.8);
        }

        .camera-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #888;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .camera-prompt:hover {
          opacity: 0.8;
        }

        .camera-prompt p {
          font-size: 0.9rem;
          margin: 0;
        }

        .camera-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #ef4444;
          text-align: center;
          padding: 20px;
        }

        .camera-error p {
          font-size: 0.9rem;
          margin: 0;
          max-width: 280px;
        }

        .retry-btn {
          margin-top: 12px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #fff;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }

        .retry-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Shutter flash effect */
        .shutter-flash {
          position: absolute;
          inset: 0;
          background: #fff;
          opacity: 0.8;
          animation: flashFade 0.15s ease-out forwards;
          pointer-events: none;
          z-index: 10;
        }

        @keyframes flashFade {
          from {
            opacity: 0.8;
          }
          to {
            opacity: 0;
          }
        }

        /* Top controls: torch and flip */
        .camera-top-controls {
          display: flex;
          justify-content: space-between;
          width: 100%;
          padding: 16px 20px;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 5;
          pointer-events: none;
        }

        .camera-top-controls .control-btn {
          pointer-events: auto;
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.5);
          color: #fff;
          padding: 12px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-top-controls .control-btn:hover {
          background: rgba(0, 0, 0, 0.7);
          border-color: #fff;
        }

        .camera-top-controls .control-btn.active {
          background: rgba(255, 255, 255, 0.3);
          border-color: #fff;
        }

        /* Bottom capture button */
        .camera-controls {
          margin-top: 24px;
          display: flex;
          justify-content: center;
          gap: 16px;
          padding-bottom: 8px;
        }

        .camera-capture-btn {
          background: rgba(255, 255, 255, 0.15);
          border: 4px solid #fff;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          backdrop-filter: blur(4px);
          flex-shrink: 0;
        }

        .camera-capture-btn:active {
          transform: scale(0.95);
          background: rgba(255, 255, 255, 0.25);
        }

        .capture-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .camera-retake-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fff;
          padding: 12px 24px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.95rem;
          transition: background 0.2s;
        }

        .camera-retake-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .captured-preview {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .captured-preview img {
          max-width: 100%;
          max-height: 60vh;
          border-radius: 12px;
          object-fit: contain;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .camera-capture-overlay {
            padding: 0;
          }

          .camera-capture-modal {
            max-height: 100vh;
            border-radius: 0;
            height: 100vh;
          }

          .camera-viewport {
            min-height: 40vh;
            max-height: 65vh;
          }

          .camera-content {
            padding: 12px;
          }

          /* Larger capture button on mobile for thumb reach */
          .camera-capture-btn {
            width: 88px;
            height: 88px;
          }

          .capture-circle {
            width: 68px;
            height: 68px;
          }

          .camera-top-controls {
            padding: 16px;
          }

          .camera-top-controls .control-btn {
            width: 52px;
            height: 52px;
          }
        }

        /* Landscape mode optimization */
        @media (max-height: 500px) and (orientation: landscape) {
          .camera-viewport {
            max-height: 100%;
            min-height: auto;
          }

          .camera-content {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  )
}
