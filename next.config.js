/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: false,
    domains: ['yc-viz.vercel.app'],
  },
  // Enable static optimization
  experimental: {
    optimizeCss: true,
  },
  // Configure headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  // Configure webpack
  webpack: (config, { dev, isServer }) => {
    // Optimize CSS only in production
    if (!dev && !isServer) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: '.next/cache/webpack',
        name: isServer ? 'server' : 'client',
        version: '1.0.0'
      }
    }
    return config
  },
}

module.exports = nextConfig 