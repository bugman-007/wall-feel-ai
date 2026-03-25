'use client'

import { useState } from 'react'

interface CheckoutButtonProps {
  orderData: {
    width: number
    height: number
    material: string
    price: number
  }
  previewImageUrl?: string
  originalImageUrl?: string
  wallpaperName?: string
  wallpaperId?: string
}

export default function CheckoutButton({
  orderData,
  previewImageUrl,
  originalImageUrl,
  wallpaperName,
  wallpaperId
}: CheckoutButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)

  const handleCheckout = async () => {
    if (!email) {
      setShowEmailInput(true)
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/shopify/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preview_image_url: previewImageUrl || '',
          original_image_url: originalImageUrl || '',
          wallpaper_id: wallpaperId || '',
          wallpaper_name: wallpaperName || 'Custom Wallpaper',
          width: orderData.width,
          height: orderData.height,
          material: orderData.material,
          price: orderData.price,
          customer_email: email
        })
      })

      if (!response.ok) {
        throw new Error('Order creation failed')
      }

      const data = await response.json()

      // Show success message
      alert(`Order created successfully!\n\nOrder ID: ${data.order_id}\n\nIn production, you would be redirected to Shopify checkout.`)

      // In production, redirect to Shopify checkout
      // window.location.href = data.checkout_url

    } catch (err: any) {
      setError(err.message || 'Failed to create order. Please try again.')
      console.error('Checkout error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {!showEmailInput ? (
        <button
          onClick={() => setShowEmailInput(true)}
          className="w-full btn-primary text-lg"
        >
          Complete Order via Shopify
        </button>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 rounded-lg focus:outline-none transition-all input"
              required
            />
          </div>

          <button
            onClick={handleCheckout}
            disabled={isProcessing || !email}
            className={`w-full px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 btn-primary ${isProcessing || !email ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" style={{ color: 'var(--text-primary)' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Creating Order...</span>
              </span>
            ) : (
              'Complete Order via Shopify'
            )}
          </button>
        </>
      )}

      {error && (
        <div className="p-3 rounded-xl border" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{error}</p>
        </div>
      )}
    </div>
  )
}
