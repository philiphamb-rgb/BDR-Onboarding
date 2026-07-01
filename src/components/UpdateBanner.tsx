'use client'

// Shows a slim "new version available — refresh" bar whenever a newer build has
// shipped to production than the one this tab is running. It compares the build
// id baked into this bundle (NEXT_PUBLIC_BUILD_ID) against /version.json, which
// the latest deployment regenerates on every build (see next.config.js).
import { useEffect, useRef, useState } from 'react'
import { RefreshIcon, CloseIcon } from '@/components/icons'

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'

export function UpdateBanner() {
  const [stale, setStale] = useState(false)
  const dismissed = useRef(false)

  useEffect(() => {
    if (!CURRENT || CURRENT === 'dev') return // no real build id (local dev)
    let active = true

    const check = async () => {
      if (dismissed.current || !active) return
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (active && data?.id && data.id !== 'dev' && data.id !== CURRENT) setStale(true)
      } catch { /* offline / transient — try again next tick */ }
    }

    check()
    const iv = setInterval(check, 60_000)
    const onWake = () => { if (document.visibilityState === 'visible') check() }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      active = false
      clearInterval(iv)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [])

  if (!stale) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[560] flex items-center justify-center gap-3 bg-gradient-hero px-4 py-2 text-white shadow-md animate-rise">
      <span className="text-[13px] font-[700]">A new version of BDR Hub is ready.</span>
      <button onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-[12px] font-[800] text-navy transition-transform active:scale-95">
        <RefreshIcon size={13} /> Refresh
      </button>
      <button onClick={() => { dismissed.current = true; setStale(false) }} aria-label="Dismiss"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
        <CloseIcon size={15} />
      </button>
    </div>
  )
}
