// @ts-nocheck
'use client'

// A tasteful "Install BDR Hub" nudge. Uses the captured beforeinstallprompt on
// Chrome/Android/desktop; on iOS Safari (which never fires it) shows the
// Add-to-Home-Screen instructions instead. Dismissal persists so it never nags.

import { useEffect, useState } from 'react'
import { DownloadIcon, CloseIcon, ArrowRightIcon } from '@/components/icons'

const DISMISS_KEY = 'bdr:install-dismissed'

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    let dismissed = false
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1' } catch {}
    if (dismissed) return

    // Already installed / running standalone → nothing to do.
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (standalone) return

    const onPrompt = (e: any) => { e.preventDefault(); setDeferred(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS Safari: no beforeinstallprompt — offer manual instructions after a beat.
    const ua = window.navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isSafari = /safari/i.test(ua) && !/crios|fxios|chrome/i.test(ua)
    let t: any
    if (isIOS && isSafari) t = setTimeout(() => { setIosHint(true); setShow(true) }, 4000)

    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); if (t) clearTimeout(t) }
  }, [])

  const dismiss = () => { setShow(false); try { localStorage.setItem(DISMISS_KEY, '1') } catch {} }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch {}
    setDeferred(null)
    dismiss()
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[350] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-modal animate-fade-up desktop:bottom-6 desktop:left-[var(--sb-w)] desktop:right-auto desktop:ml-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-white"><DownloadIcon size={18} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-[800] text-dark-text">Install BDR Hub</div>
        {iosHint ? (
          <div className="text-[11.5px] leading-snug text-gray">Tap Share, then <span className="font-[700] text-dark-text">Add to Home Screen</span> for the full-screen app.</div>
        ) : (
          <div className="text-[11.5px] text-gray">Add it to your device for a faster, full-screen experience.</div>
        )}
      </div>
      {!iosHint && (
        <button onClick={install} className="flex shrink-0 items-center gap-1 rounded-lg bg-navy px-3 py-2 text-[12px] font-[800] text-white">
          Install <ArrowRightIcon size={12} />
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-gray hover:text-dark-text"><CloseIcon size={16} /></button>
    </div>
  )
}
