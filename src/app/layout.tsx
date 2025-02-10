import { Metadata } from 'next'
import { metadata as siteMetadata } from './metadata'
import '../styles/globals.css'
import Script from 'next/script';

export const metadata: Metadata = {
  ...siteMetadata,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Add your Google verification code
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href="https://yc-viz.vercel.app" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <Script 
          src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="h-full">{children}</body>
    </html>
  )
}
