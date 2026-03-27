'use client'

import { useState, useRef, useCallback } from 'react'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setError(null)
    } catch (err: any) {
      setError(err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions.'
        : 'Unable to access camera. Please make sure a camera is connected.')
      console.error('Camera error:', err)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
              type: 'image/jpeg'
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
    startCamera()
  }, [startCamera])

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
                {!stream && !error && (
                  <div className="camera-prompt" onClick={startCamera}>
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p>Click to start camera</p>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={stream ? 'active' : ''}
                />
                {error && (
                  <div className="camera-error">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>{error}</p>
                  </div>
                )}
              </div>

              {stream && (
                <div className="camera-controls">
                  <button onClick={capturePhoto} className="camera-capture-btn">
                    <span className="capture-circle" />
                  </button>
                </div>
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
        }

        .camera-viewport {
          width: 100%;
          aspect-ratio: 4/3;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
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

        .camera-viewport video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: none;
        }

        .camera-viewport video.active {
          display: block;
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

        .camera-controls {
          margin-top: 24px;
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .camera-capture-btn {
          background: none;
          border: 4px solid #fff;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s;
        }

        .camera-capture-btn:active {
          transform: scale(0.95);
        }

        .capture-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #fff;
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

        @media (max-width: 640px) {
          .camera-capture-overlay {
            padding: 0;
          }

          .camera-capture-modal {
            max-height: 100vh;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  )
}
