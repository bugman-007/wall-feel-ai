import Image from 'next/image'

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
  return (
    <main className="luxury-page">
      <section className="hero-section">
        <div className="hero-image-layer" />
        <div className="hero-content">
          <p className="brand-mark">WALLFEEL</p>
          <h1>Transform Your Walls Into Luxury Experiences</h1>
          <p className="hero-subtitle">AI-powered wall design. Upload. Visualize. Experience.</p>
          <div className="hero-actions">
            <button className="gold-btn">Start Designing</button>
            <button className="ghost-btn">Explore Designs</button>
          </div>
        </div>
      </section>

      <section className="content-shell">
        <h2 className="section-title">About WallFeel</h2>
        <div className="about-grid">
          <div className="about-image">
            <Image
              src="https://images.unsplash.com/photo-1618220252344-8ec99ec624b1?auto=format&fit=crop&w=1200&q=80"
              alt="Luxury wallpaper interior"
              fill
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </div>
          <div>
            <p>
              WallFeel is a premium AI-powered platform that transforms ordinary spaces into
              immersive luxury environments.
            </p>
            <p className="italic">Design. Preview. Install with ease.</p>
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
          <button className="gold-btn">Start Your Design</button>
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
