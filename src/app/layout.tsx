import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastContainer } from '@/components/ui'
import { XpPopLayer, ConfettiLayer } from '@/components/gamification'

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

// Applied before first paint so there's no theme flash. Base = dark by default
// (.light flips to light; 'system' follows OS). Accent = ConsumerDirect brand by
// default; a stored custom hex overrides the accent channels inline on <html>.
const THEME_INIT = `(function(){try{var b=localStorage.getItem('themeBase')||'dark';var a=localStorage.getItem('themeAccent')||'brand';var isLight=b==='light'||(b==='system'&&!matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('light',isLight);var m=/^#?([0-9a-f]{6})$/i.exec((a||'').trim());if(m){var n=parseInt(m[1],16),r=(n>>16)&255,g=(n>>8)&255,bl=n&255,s=document.documentElement.style;function ch(f){return Math.max(0,Math.min(255,Math.round(r*f)))+' '+Math.max(0,Math.min(255,Math.round(g*f)))+' '+Math.max(0,Math.min(255,Math.round(bl*f)));}s.setProperty('--navy',r+' '+g+' '+bl);s.setProperty('--navy-dark',ch(0.8));s.setProperty('--navy-mid',ch(1.18));s.setProperty('--teal',r+' '+g+' '+bl);s.setProperty('--teal-dark',ch(0.82));s.setProperty('--gold',r+' '+g+' '+bl);}document.documentElement.dataset.sidebar=localStorage.getItem('sidebarCollapsed')==='1'?'collapsed':'expanded';}catch(e){}})();`

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
        <ConfettiLayer />
      </body>
    </html>
  )
}
