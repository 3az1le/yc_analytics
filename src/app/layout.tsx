import { Metadata } from 'next'
import { metadata as siteMetadata } from './metadata'
import '../styles/globals.css'
import Script from 'next/script';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

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
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: [
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
    apple: [
      { url: '/favicon.svg', sizes: '180x180', type: 'image/svg+xml' }
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/favicon.svg',
        color: '#FB651E',
      },
      {
        rel: 'icon',
        type: 'image/x-icon',
        url: '/favicon.ico',
      },
    ],
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
        <meta name="theme-color" content="#FB651E" />
        {/* Explicit favicon declarations for search engines */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="16x16 32x32" />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="mask-icon" href="/favicon.svg" color="#FB651E" />
        <link rel="canonical" href="https://yc-analytics.com" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <Script 
          src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="h-full">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
