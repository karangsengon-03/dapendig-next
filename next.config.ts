import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Cache headers — JS/CSS chunks di-cache lama (immutable karena hash di filename)
  // HTML pages pakai stale-while-revalidate agar soft-refresh cukup
  async headers() {
    return [
      {
        // Static assets (JS/CSS/fonts) — immutable, cache 1 tahun
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
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
        // Ini yang bikin soft refresh (F5) cukup, tanpa hard refresh
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
