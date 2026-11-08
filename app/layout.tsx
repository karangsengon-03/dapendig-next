import type { Metadata } from 'next'
import { Bricolage_Grotesque, Instrument_Sans } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import { QueryProvider } from '@/providers/QueryProvider'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/components/shared/AuthProvider'

// Font identitas baru: Bricolage Grotesque (judul, angka) dan Instrument Sans (isi).
// Diunduh saat build lewat next/font/google dan di-host sendiri; tanpa @import eksternal.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})
const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DaPenDig Next',
  description: 'Data Penduduk Digital — administrasi kependudukan desa',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'DaPenDig Next',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/icons/icon-152.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `a-root` dan `dk` (tema gelap) harus berada di elemen yang SAMA agar token CSS terbaca.
    // next-themes menambah/menghapus kelas tema di <html>, jadi suppressHydrationWarning wajib.
    <html
      lang="id"
      className={`a-root ${bricolage.variable} ${instrument.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#F4F6FA" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DaPenDig Next" />
        <link rel="apple-touch-icon" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased">
        {/* Terang = bawaan; gelap = pilihan pengguna, tersimpan di perangkat (kunci dpd_theme). */}
        <ThemeProvider
          attribute="class"
          value={{ light: 'lt', dark: 'dk' }}
          defaultTheme="light"
          enableSystem={false}
          storageKey="dpd_theme"
          disableTransitionOnChange
        >
          <QueryProvider>
            <ToastProvider>
              {/* AuthProvider harus paling luar agar listener onAuthStateChanged
                  aktif di semua halaman sejak pertama app dibuka */}
              <AuthProvider>
                {children}
              </AuthProvider>
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
