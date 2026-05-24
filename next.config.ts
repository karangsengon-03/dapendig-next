import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Cache headers untuk icon & manifest saja.
  // /_next/static sudah di-handle otomatis oleh Vercel/Next.js dengan immutable header,
  // jangan override karena akan trigger warning dan bisa break dev mode.
  async headers() {
    return [
      {
        // Icon & manifest — cache 7 hari, revalidate di background
        source: '/(icons|favicon|manifest)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Semua halaman HTML — no-cache di browser tapi revalidate cepat di CDN
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig
