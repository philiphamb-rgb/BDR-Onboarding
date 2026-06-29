import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastContainer } from '@/components/ui'
import { XpPopLayer } from '@/components/gamification'

export const metadata: Metadata = {
  title: 'BDR Onboarding Tool',
  description: 'ConsumerDirect BDR Onboarding Tool',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }, { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BDR Onboarding Tool',
  },
  openGraph: {
    title: 'BDR Onboarding Tool',
    description: 'ConsumerDirect BDR Onboarding Tool',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#003087',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased bg-bdrbg text-gray-900 min-h-screen">
        {children}
        <ToastContainer />
        <XpPopLayer />
      </body>
    </html>
  )
}
