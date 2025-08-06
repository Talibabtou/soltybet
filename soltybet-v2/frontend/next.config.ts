import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Suppress non-critical console logs in development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

export default nextConfig
