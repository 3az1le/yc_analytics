export const metadata = {
  title: 'YC Analytics',
  description: 'Explore Y Combinator startups through interactive visualizations. Discover geographic distribution, industry trends, and partner networks from 2005 to present.',
  keywords: 'Y Combinator, startups, data visualization, YC companies, startup trends, startup analytics, tech industry, venture capital',
  metadataBase: new URL('https://www.yc-analytics.com'),
  openGraph: {
    title: 'YC Startup Visualization',
    description: 'Interactive visualization of Y Combinator startups, showing industry trends, geographic distribution, and partner networks.',
    type: 'website',
    url: 'https://yc-analytics.com',
    images: [
      {
        url: '/images/landing-image.png',
        width: 1200,
        height: 630,
        alt: 'YC Startup Visualization landing page',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YC Startup Visualization',
    description: 'Interactive visualization of Y Combinator startups and trends',
    images: ['/images/landing-image.png'],
  },
} 