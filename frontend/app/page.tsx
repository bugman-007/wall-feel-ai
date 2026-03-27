'use client'

import { useState } from 'react'
import Image from 'next/image'
import ImageUpload from './components/ImageUpload'
import WallpaperGrid from './components/WallpaperGrid'
import PreviewDisplay from './components/PreviewDisplay'
import QualitySelector from './components/QualitySelector'

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

const steps = ['Upload Your Space', 'Choose Style & Material', 'AI Generates Preview', 'Request Installation']
const categories = ['Modern', 'Afrocentric', 'Minimalist', 'Corporate', 'Hospitality']
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

      if (!response.ok) {
        throw new Error('Preview generation failed')
      }

      const data = await response.json()

      if (data.success && data.preview_url) {
        setPreviewUrl(data.preview_url)
      } else {
        throw new Error('No preview URL in response')
      }

    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate preview. Please try again.')
      console.error('Generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // handleReset is available for future use when adding "Try Another" functionality

  return (
    <main className="luxury-page">
      <section className="hero-section">
        <div className="hero-image-layer" />
        <div className="hero-content">
          <p className="brand-mark">WALLFEEL</p>
          <h1>Transform Your Walls Into Luxury Experiences</h1>
          <p className="hero-subtitle">AI-powered wall design. Upload. Visualize. Experience.</p>
          <div className="hero-actions">
            <button className="gold-btn" onClick={() => document.getElementById('visualizer')?.scrollIntoView({ behavior: 'smooth' })}>Start Designing</button>
            <button className="ghost-btn">Explore Designs</button>
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
        <p className="text-center" style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 48px' }}>
          Upload your room photo and explore how our premium wallpapers transform your space instantly.
        </p>

        {/* Progress Indicator */}
        {(selectedImage || selectedWallpaper || previewUrl) && (
          <div className="card" style={{ marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)', textAlign: 'center' }}>
              Your Progress
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                {selectedImage ? (
                  <>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
                      <svg className="w-3 h-3" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span style={{ color: 'var(--text-secondary)' }}>Room photo uploaded</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span style={{ color: 'var(--text-muted)' }}>No room photo selected</span>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {selectedWallpaper ? (
                  <>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
                      <svg className="w-3 h-3" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span style={{ color: 'var(--text-secondary)' }}>Wallpaper: {selectedWallpaper.name}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span style={{ color: 'var(--text-muted)' }}>No wallpaper selected</span>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {previewUrl ? (
                  <>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
                      <svg className="w-3 h-3" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span style={{ color: 'var(--text-secondary)' }}>Preview generated</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span style={{ color: 'var(--text-muted)' }}>Preview not generated yet</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Upload */}
        <div className="step-section">
          <h3 className="step-title">1. Upload Your Room Photo</h3>
          <ImageUpload onImageSelect={handleImageSelect} />
        </div>

        {/* Step 2: Choose Wallpaper */}
        {selectedImage && (
          <div className="step-section">
            <h3 className="step-title">2. Choose Your Wallpaper Design</h3>
            <WallpaperGrid
              onWallpaperSelect={handleWallpaperSelect}
              selectedId={selectedWallpaper?.id}
            />
          </div>
        )}

        {/* Step 3: Choose Quality */}
        {selectedImage && selectedWallpaper && !previewUrl && (
          <div className="step-section">
            <h3 className="step-title">3. Choose Output Quality</h3>
            <QualitySelector
              selectedId={selectedQuality}
              onSelect={setSelectedQuality}
            />
          </div>
        )}

        {/* Step 4: Generate Preview */}
        {selectedImage && selectedWallpaper && !previewUrl && (
          <div className="step-section">
            <h3 className="step-title">4. Generate Preview</h3>
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

        {/* Error Message */}
        {generateError && (
          <div className="card" style={{ maxWidth: '600px', margin: '24px auto', borderColor: '#ef4444', padding: '16px' }}>
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {generateError}
              </p>
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

      <section className="content-shell">
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
      </section>

      <section className="content-shell partner-shell">
        <h2 className="section-title">For Businesses & Partners</h2>
        <p className="partner-subtitle">Transform commercial spaces into memorable brand experiences.</p>
        <div className="partner-row">
          {partnerTypes.map((type) => (
            <span key={type}>{type}</span>
          ))}
        </div>
      </section>

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
