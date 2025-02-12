import '@/styles/globals.css'
import Image from 'next/image'

export default function Hero() {
  return (
    <section className="hero-section">
      <div className="container-default">
        <h1 className="hero-title">
          Bringing YC's startup universe to life, one visual at a time!
        </h1>
        <h2 className="hero-subtitle">
          Explore the evolution of YC companies through interactive visualizations
        </h2>
      </div>
      <div className="hero-image-container">
          <Image 
            src="/svg/Map.svg" 
            alt="Hero Image" 
            className="hero-image"
            width={800}
            height={800}
            style={{ objectFit: 'contain', width: '80%' }}
            priority
          />
        </div>
    </section>
  )
} 