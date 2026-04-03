'use client'

import { useState } from 'react'
import { interpolate } from '../lib/localization'
import { useLocalization } from '../contexts/LocalizationContext'

interface SharePreviewProps {
  previewUrl: string
  shareUrl?: string
}

export default function SharePreview({ previewUrl, shareUrl }: SharePreviewProps) {
  const [copySuccess, setCopySuccess] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const { messages } = useLocalization()

  // Use shareUrl if provided, otherwise fallback to previewUrl
  const urlToShare = shareUrl || previewUrl

  // Detect Web Share API support
  const isWebShareSupported = typeof navigator !== 'undefined' && 'share' in navigator

  const handleCopyLink = async () => {
    try {
      setIsSharing(true)
      await navigator.clipboard.writeText(urlToShare)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
      setCopySuccess(false)
    } finally {
      setIsSharing(false)
    }
  }

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(interpolate(messages.share.whatsappText, { url: urlToShare }))
    const whatsappUrl = `https://wa.me/?text=${message}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(messages.share.emailSubject)
    const body = encodeURIComponent(interpolate(messages.share.emailBody, { url: urlToShare }))
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`
    window.location.href = mailtoUrl
  }

  const handleNativeShare = async () => {
    if (!isWebShareSupported) return

    try {
      setIsSharing(true)
      await navigator.share({
        title: messages.share.nativeTitle,
        text: messages.share.nativeText,
        url: urlToShare,
      })
    } catch (error) {
      // User cancelled or share failed - fail silently
      console.error('Share failed:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const handleDownload = async () => {
    try {
      setIsSharing(true)

      // Fetch the image as a blob via our backend proxy to avoid CORS issues
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/download-preview?url=${encodeURIComponent(previewUrl)}`)

      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'wallfeel-preview.png'
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="card share-shell">
      <h3 className="text-lg font-semibold mb-4 share-heading">
        {messages.share.title}
      </h3>

      <div className="flex flex-wrap justify-center gap-3 share-actions">
        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          disabled={isSharing}
          className={`share-btn ${copySuccess ? 'is-success' : 'share-btn-neutral'} ${isSharing ? 'is-disabled' : ''}`}
        >
          {copySuccess ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{messages.share.copied}</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>{messages.share.copyLink}</span>
            </>
          )}
        </button>

        {/* WhatsApp Button */}
        <button
          onClick={handleWhatsAppShare}
          disabled={isSharing}
          className={`share-btn share-btn-whatsapp ${isSharing ? 'is-disabled' : ''}`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          <span>{messages.share.whatsapp}</span>
        </button>

        {/* Email Button */}
        <button
          onClick={handleEmailShare}
          disabled={isSharing}
          className={`share-btn share-btn-neutral ${isSharing ? 'is-disabled' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>{messages.share.email}</span>
        </button>

        {/* Native Share Button (only if supported) */}
        {isWebShareSupported && (
          <button
            onClick={handleNativeShare}
            disabled={isSharing}
            className={`share-btn share-btn-accent ${isSharing ? 'is-disabled' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>{messages.share.share}</span>
          </button>
        )}

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isSharing}
          className={`share-btn share-btn-neutral ${isSharing ? 'is-disabled' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>{messages.share.download}</span>
        </button>
      </div>
    </div>
  )
}
