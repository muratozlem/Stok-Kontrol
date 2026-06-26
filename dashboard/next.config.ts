import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: ['*.replit.dev', '*.pike.replit.dev'],
  turbopack: { root: path.resolve(__dirname, '..') },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ]
  },
}

export default nextConfig
