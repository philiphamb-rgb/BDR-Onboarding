import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastContainer } from '@/components/ui'
import { XpPopLayer } from '@/components/gamification'

export const metadata: Metadata = {
  title: 'BDR Hub',
  description: 'ConsumerDirect BDR Hub',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }, { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BDR Hub',
  },
  openGraph: {
    title: 'BDR Hub',
    description: 'ConsumerDirect BDR Hub',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0E15',
  viewportFit: 'cover',
}

// Applied before first paint so there's no theme flash. Dark is the default;
// `.light` on <html> flips to the light palette. 'system' follows the OS.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme')||'dark';var isLight=t==='light'||(t==='system'&&!matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('light',isLight);}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased bg-bdrbg text-dark-text min-h-screen">
        {children}
        <ToastContainer />
        <XpPopLayer />
      </body>
    </html>
  )
}
