'use client'

import { useState } from 'react'
import Image from 'next/image'
import ImageUpload from './components/ImageUpload'
import WallpaperGrid from './components/WallpaperGrid'
import PreviewDisplay from './components/PreviewDisplay'
import QualitySelector from './components/QualitySelector'
import StyleFeelFilter from './components/StyleFeelFilter'
import CreateCustomDesign from './components/CreateCustomDesign'

interface WallpaperDesign {
  id: string
  name: string
  category: string
  thumbnail_url: string
  full_url: string
  description: string
}

const features = [
  { title: 'AI Upload & Preview', description: 'Upload room photos and instantly map premium wallpaper concepts.' },
  { title: 'Smart Material Selection', description: 'Compare peel-and-stick, classic, and premium finishes in real time.' },
  { title: '3D Immersive Visualization', description: 'See perspective-aware previews before committing to installation.' },
  { title: 'Custom Design Request', description: 'Work with our team to create tailored textures for unique spaces.' },
]

const steps = ['Upload Your Space', 'Choose Style & Material or Create Your Own', 'AI Generates Preview', 'Order Your Design']
const partnerTypes = ['Restaurants', 'Hotels', 'Offices', 'Real Estate', 'Staging']

const galleryImages = [
  'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1616594039964-3f5c3eec0b3b?auto=format&fit=crop&w=800&q=80',
]

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<{
    file: File
    preview: string
    uploadedUrl?: string
  } | null>(null)
  const [selectedWallpaper, setSelectedWallpaper] = useState<WallpaperDesign | null>(null)
  const [selectedQuality, setSelectedQuality] = useState<'1k' | '2k' | '4k' | '8k'>('1k')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [selectedFeels, setSelectedFeels] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse')
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false)
  const [generatedWallpaperUrl, setGeneratedWallpaperUrl] = useState<string | null>(null)

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleStyleSelect = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style]
    )
  }

  const handleFeelSelect = (feel: string) => {
    setSelectedFeels(prev =>
      prev.includes(feel)
        ? prev.filter(f => f !== feel)
        : [...prev, feel]
    )
  }

  const handleSurpriseMe = () => {
    // Randomly select a style and feel to show variety
    const allStyles = ['Minimal', 'Modern', 'Luxury', 'Organic', 'Bold', 'Classic', 'Playful', 'Commercial']
    const allFeels = ['Calm', 'Warm', 'Statement', 'Elegant', 'Creative']

    // Pick 1-2 random styles
    const numStyles = Math.floor(Math.random() * 2) + 1
    const shuffledStyles = allStyles.sort(() => 0.5 - Math.random())
    const randomStyles = shuffledStyles.slice(0, numStyles)

    // Pick 1 random feel
    const randomFeel = allFeels[Math.floor(Math.random() * allFeels.length)]

    setSelectedStyles(randomStyles)
    setSelectedFeels([randomFeel])

    // Scroll to wallpaper grid
    document.getElementById('wallpaper-grid')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleGenerateWallpaper = async (prompt: string, styleInspirations: string[]): Promise<{ success: boolean; wallpaperUrl?: string; error?: string }> => {
    if (!selectedImage?.uploadedUrl) {
      return { success: false, error: 'Please upload a room photo first' }
    }

    setIsGeneratingCustom(true)
    setGenerateError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/ai-generate-wallpaper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          style_inspirations: styleInspirations,
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMsg = data?.detail || data?.error || data?.user_message || 'Wallpaper generation failed'
        return { success: false, error: errorMsg }
      }

      if (data.success && (data.wallpaper_url || data.public_url)) {
        setGeneratedWallpaperUrl(data.wallpaper_url || data.public_url)
        return { success: true, wallpaperUrl: data.wallpaper_url || data.public_url }
      } else {
        return { success: false, error: data?.user_message || data?.error || 'Wallpaper generation failed' }
      }

    } catch (err: any) {
      let userMessage = err.message || 'Failed to generate wallpaper. Please try again.'

      if (err.message?.includes('Failed to fetch')) {
        userMessage = 'Cannot connect to server. Please check your internet connection.'
      }

      console.error('Wallpaper generation error:', err)
      return { success: false, error: userMessage }
    } finally {
      setIsGeneratingCustom(false)
    }
  }

  const handleApplyWallpaper = async (wallpaperUrl: string): Promise<{ success: boolean; previewUrl?: string; error?: string }> => {
    if (!selectedImage?.uploadedUrl) {
      return { success: false, error: 'Room photo not available' }
    }

    setIsGeneratingCustom(true)
    setGenerateError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/ai-apply-wallpaper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: selectedImage.uploadedUrl,
          wallpaper_url: wallpaperUrl,
          quality: selectedQuality,
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMsg = data?.detail || data?.error || data?.user_message || 'Failed to apply wallpaper'
        return { success: false, error: errorMsg }
      }

      if (data.success && data.preview_url) {
        setPreviewUrl(data.preview_url)
        // Clear generated wallpaper after successful application
        setGeneratedWallpaperUrl(null)
        return { success: true, previewUrl: data.preview_url }
      } else {
        return { success: false, error: data?.user_message || data?.error || 'Failed to apply wallpaper' }
      }

    } catch (err: any) {
      let userMessage = err.message || 'Failed to apply wallpaper. Please try again.'

      if (err.message?.includes('Failed to fetch')) {
        userMessage = 'Cannot connect to server. Please check your internet connection.'
      }

      console.error('Wallpaper application error:', err)
      return { success: false, error: userMessage }
    } finally {
      setIsGeneratingCustom(false)
    }
  }

  // Apply theme to document
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }

  const handleImageSelect = (file: File, preview: string, uploadedUrl?: string) => {
    setSelectedImage({ file, preview, uploadedUrl })
    setGenerateError(null)
    setPreviewUrl(null)
  }

  const handleWallpaperSelect = (design: WallpaperDesign) => {
    setSelectedWallpaper(design)
  }

  const handleGeneratePreview = async () => {
    if (!selectedWallpaper || !selectedImage?.uploadedUrl) {
      setGenerateError('Please upload an image and select a wallpaper')
      return
    }

    setIsGenerating(true)
    setGenerateError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/ai-generate-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: selectedImage.uploadedUrl,
          wallpaper_id: selectedWallpaper.id,
          quality: selectedQuality,
        })
      })

      // Parse response body first to get actual error details
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        // Use backend error detail if available
        const errorMsg = data?.detail || data?.error || 'Preview generation failed'
        throw new Error(errorMsg)
      }

      // Check if this is a fallback response (AI generation failed)
      if (data.fallback) {
        // Extract meaningful error from backend
        const errorDetails = data.error || 'AI service temporarily unavailable'
        setGenerateError(
          `AI service is currently busy. ${errorDetails.includes('503') ? 'The service is experiencing high demand - please try again in a few moments.' : errorDetails}`
        )
        return
      }

      if (data.success && data.preview_url) {
        setPreviewUrl(data.preview_url)
      } else {
        throw new Error(data.error || 'Preview generation failed. Please try again.')
      }

    } catch (err: any) {
      // Provide user-friendly error messages
      let userMessage = err.message || 'Failed to generate preview. Please try again.'

      if (err.message?.includes('Failed to fetch')) {
        userMessage = 'Cannot connect to server. Please check your internet connection.'
      }

      setGenerateError(userMessage)
      console.error('Generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // handleReset is available for future use when adding "Try Another" functionality

  return (
    <main className="luxury-page">
      <section className="hero-section">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label="Toggle dark mode"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 100,
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isDarkMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className="hero-image-layer" />
        <div className="hero-content">
          <p className="brand-mark">WALLFEEL</p>
          <h1>Transform Your Walls Into Luxury Experiences</h1>
          <p className="hero-subtitle">AI-powered wall design. Upload. Visualize. Experience.</p>
          <div className="hero-actions">
            <button className="gold-btn" onClick={() => document.getElementById('visualizer')?.scrollIntoView({ behavior: 'smooth' })}>Start Designing</button>
          </div>
        </div>
      </section>

      <section className="content-shell">
        <h2 className="section-title">Our Key Features</h2>
        <div className="feature-grid">
          {features.map((item) => (
            <article key={item.title} className="feature-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-shell">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-row">
          {steps.map((step, index) => (
            <div key={step} className="step-item">
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Wallpaper Preview Generator - Integrated Section */}
      <section className="content-shell" id="visualizer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '64px' }}>
        <h2 className="section-title">Visualize Your Space</h2>
        <p className="text-center" style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 32px' }}>
          Upload your room photo and explore how our premium wallpapers transform your space instantly.
        </p>

        {/* Step 1: Upload - Always shown first */}
        <div className="step-section">
          <h3 className="step-title">1. Upload Your Room Photo</h3>
          <ImageUpload onImageSelect={handleImageSelect} />
        </div>

        {/* Tabs - shown after image upload */}
        {selectedImage && (
          <>
            {/* Tab Navigation */}
            <div className="flex border-b mt-8" style={{ borderColor: 'var(--border-light)' }}>
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-px ${activeTab === 'browse' ? 'border-gold' : 'border-transparent'}`}
                style={{
                  background: activeTab === 'browse' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'browse' ? 'var(--gold)' : 'var(--text-secondary)',
                }}
              >
                Browse Catalog
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-px ${activeTab === 'create' ? 'border-gold' : 'border-transparent'}`}
                style={{
                  background: activeTab === 'create' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'create' ? 'var(--gold)' : 'var(--text-secondary)',
                }}
              >
                Create Your Own
              </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {/* Browse Catalog Tab */}
              {activeTab === 'browse' && (
                <div className="space-y-6">
                  {/* Style & Feel Filter */}
                  <div className="step-section">
                    <h3 className="step-title">2. Choose Style & Feel</h3>
                    <StyleFeelFilter
                      selectedStyles={selectedStyles}
                      selectedFeels={selectedFeels}
                      onStyleSelect={handleStyleSelect}
                      onFeelSelect={handleFeelSelect}
                      onSurpriseMe={handleSurpriseMe}
                    />
                  </div>

                  {/* Wallpaper Grid */}
                  <div className="step-section" id="wallpaper-grid">
                    <h3 className="step-title">
                      {selectedStyles.length > 0 || selectedFeels.length > 0
                        ? `3. Choose from ${selectedStyles.length + selectedFeels.length} Filter${(selectedStyles.length + selectedFeels.length) > 1 ? 's' : ''}`
                        : '3. Choose Your Wallpaper Design'}
                    </h3>
                    <WallpaperGrid
                      onWallpaperSelect={handleWallpaperSelect}
                      selectedId={selectedWallpaper?.id}
                      selectedStyles={selectedStyles}
                      selectedFeels={selectedFeels}
                    />
                  </div>

                  {/* Quality Selector */}
                  {selectedWallpaper && !previewUrl && (
                    <div className="step-section">
                      <h3 className="step-title">4. Choose Output Quality</h3>
                      <QualitySelector
                        selectedId={selectedQuality}
                        onSelect={setSelectedQuality}
                      />
                    </div>
                  )}

                  {/* Generate Preview Button */}
                  {selectedWallpaper && !previewUrl && (
                    <div className="step-section">
                      <h3 className="step-title">5. Generate Preview</h3>
                      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px', textAlign: 'center' }}>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                          AI will automatically detect walls and apply the wallpaper
                        </p>
                        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                          Selected quality: <strong style={{ color: 'var(--text-primary)' }}>{selectedQuality.toUpperCase()}</strong> (Estimated time: {selectedQuality === '1k' ? '30-40' : selectedQuality === '2k' ? '35-45' : selectedQuality === '4k' ? '~1 minute' : '> 1 minute'} seconds)
                        </p>
                        <button
                          onClick={handleGeneratePreview}
                          disabled={isGenerating}
                          className={`gold-btn ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{ minWidth: '200px' }}
                        >
                          {isGenerating ? (
                            <span className="flex items-center justify-center space-x-2">
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>Generating Preview...</span>
                            </span>
                          ) : (
                            'Generate Preview with AI'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Create Your Own Tab */}
              {activeTab === 'create' && (
                <div className="step-section">
                  <h3 className="step-title">2. Create Your Custom Wallpaper</h3>
                  <CreateCustomDesign
                    onGenerateWallpaper={handleGenerateWallpaper}
                    onApplyWallpaper={handleApplyWallpaper}
                    isGenerating={isGeneratingCustom}
                    roomImageUrl={selectedImage?.uploadedUrl}
                    quality={selectedQuality}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Error Message */}
        {generateError && (
          <div className="card" style={{ maxWidth: '600px', margin: '24px auto', borderColor: '#ef4444', padding: '20px', background: 'rgba(239, 68, 68, 0.05)' }}>
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div style={{ flex: 1 }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Preview Generation Failed
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {generateError}
                </p>
                <button
                  onClick={() => activeTab === 'browse' ? handleGeneratePreview() : null}
                  className="text-sm font-medium"
                  style={{ color: 'var(--gold)', marginTop: '12px', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                >
                  Try Again →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Display */}
        {previewUrl && selectedImage?.preview && (
          <div className="step-section">
            <h3 className="step-title" style={{ textAlign: 'center' }}>Your Preview</h3>
            <PreviewDisplay
              originalUrl={selectedImage.preview}
              previewUrl={previewUrl}
              onClose={() => setPreviewUrl(null)}
              quality={selectedQuality}
            />
          </div>
        )}
      </section>

      {/* <section className="content-shell">
        <h2 className="section-title">Explore Our Design Library</h2>
        <div className="category-row">
          {categories.map((category) => (
            <button key={category} className="category-pill">
              {category}
            </button>
          ))}
        </div>
        <div className="gallery-grid">
          {galleryImages.map((src) => (
            <div key={src} className="gallery-image">
              <Image src={src} alt="Wallfeel design preview" fill sizes="(max-width: 900px) 50vw, 25vw" />
            </div>
          ))}
        </div>
      </section> */}

      {/* <section className="content-shell partner-shell">
        <h2 className="section-title">For Businesses & Partners</h2>
        <p className="partner-subtitle">Transform commercial spaces into memorable brand experiences.</p>
        <div className="partner-row">
          {partnerTypes.map((type) => (
            <span key={type}>{type}</span>
          ))}
        </div>
      </section> */}

      <section className="content-shell cta-shell">
        <h2 className="section-title">Ready to Redefine Your Space?</h2>
        <div className="hero-actions">
          <button className="gold-btn" onClick={() => document.getElementById('visualizer')?.scrollIntoView({ behavior: 'smooth' })}>Start Your Design</button>
          <button className="ghost-btn">Talk to a Designer</button>
        </div>
      </section>

      <footer className="luxury-footer">
        <nav>
          <span>About</span>
          <span>Services</span>
          <span>Projects</span>
          <span>Contact</span>
        </nav>
        <p>© 2026 WallFeel</p>
      </footer>
    </main>
  )
}
