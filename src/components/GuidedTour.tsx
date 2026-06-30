// @ts-nocheck
'use client'

// Live, cross-screen guided walkthrough. Unlike the per-page Tour, this driver
// lives in the app layout (so it survives route changes) and, for each step,
// NAVIGATES to the real screen, waits for the target element to mount, then
// spotlights it with a narrated tooltip. Replayable from the notifications bell.

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { WALKTHROUGHS, LATEST_WALKTHROUGH, START_WALKTHROUGH_EVENT, WALKTHROUGH_SEEN_KEY } from '@/lib/walkthroughs'

const TIP_W = 330
const GAP = 12
const FIND_TIMEOUT = 6000   // how long to wait for a target element after navigation
const FIND_INTERVAL = 140

export function GuidedTour() {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [wt, setWt] = useState<any>(null)     // active walkthrough
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [searching, setSearching] = useState(false)
  const [tipH, setTipH] = useState(200)
  const tipRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const start = useCallback((id?: string) => {
    const w = WALKTHROUGHS.find(x => x.id === id) ?? LATEST_WALKTHROUGH
    try { sessionStorage.setItem('bdr:guidedActive', '1') } catch {}
    setWt(w); setI(0); setRect(null)
  }, [])

  const finish = useCallback(() => {
    try { sessionStorage.removeItem('bdr:guidedActive') } catch {}
    try { localStorage.setItem(WALKTHROUGH_SEEN_KEY, LATEST_WALKTHROUGH.version) } catch {}
    setWt(null); setRect(null)
  }, [])

  // Auto-run the latest walkthrough once per version.
  useEffect(() => {
    if (!mounted) return
    let seen = null
    try { seen = localStorage.getItem(WALKTHROUGH_SEEN_KEY) } catch {}
    if (seen === LATEST_WALKTHROUGH.version) return
    try { sessionStorage.setItem('bdr:guidedActive', '1') } catch {} // suppress per-page tours
    const t = setTimeout(() => start(LATEST_WALKTHROUGH.id), 900)
    return () => clearTimeout(t)
  }, [mounted, start])

  // Manual start (e.g. from the notifications bell page).
  useEffect(() => {
    const h = (e: any) => start(e?.detail)
    window.addEventListener(START_WALKTHROUGH_EVENT, h)
    return () => window.removeEventListener(START_WALKTHROUGH_EVENT, h)
  }, [start])

  const steps = wt?.steps ?? []
  const step = steps[i]
  const centered = step && !step.selector

  const next = useCallback(() => setI(p => (p < steps.length - 1 ? p + 1 : (finish(), p))), [steps.length, finish])
  const back = useCallback(() => setI(p => Math.max(0, p - 1)), [])

  // Drive navigation + element location for the active step.
  useEffect(() => {
    if (!wt || !step) return
    // 1) Navigate to the step's screen if we're not there yet.
    if (step.route && pathname !== step.route) { setRect(null); setSearching(true); router.push(step.route); return }
    // 2) Centered card — no target to find.
    if (centered) { setRect(null); setSearching(false); return }
    // 3) Poll for the target element (it may mount after data loads).
    setSearching(true)
    let cancelled = false
    const started = Date.now()
    const tick = () => {
      if (cancelled) return
      const el = document.querySelector(step.selector)
      if (el) {
        setSearching(false)
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => { if (!cancelled) setRect(el.getBoundingClientRect()) }, 280)
        setRect(el.getBoundingClientRect())
        return
      }
      if (Date.now() - started > FIND_TIMEOUT) {  // give up → skip this step
        setSearching(false)
        if (i < steps.length - 1) setI(i + 1); else finish()
        return
      }
      timer = setTimeout(tick, FIND_INTERVAL)
    }
    let timer = setTimeout(tick, FIND_INTERVAL)
    tick()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [wt, i, step, centered, pathname, router, finish, steps.length])

  // Keep the spotlight glued to the target on scroll/resize.
  useEffect(() => {
    if (!wt || centered || !rect) return
    const el = document.querySelector(step.selector)
    if (!el) return
    const update = () => setRect(el.getBoundingClientRect())
    window.addEventListener('resize', update); window.addEventListener('scroll', update, true)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [wt, i, step, centered, rect])

  useLayoutEffect(() => { if (tipRef.current) setTipH(tipRef.current.offsetHeight) })

  // Keyboard nav.
  useEffect(() => {
    if (!wt) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wt, next, back, finish])

  if (!mounted || !wt || !step) return null

  const total = steps.length
  const last = i === total - 1
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0

  const header = (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-[800] text-teal">
        <span>{step.emoji ?? '👉'}</span> Step {i + 1} of {total}
      </span>
      <button onClick={finish} className="text-[11px] font-[700] text-gray hover:text-dark-text">Skip tour</button>
    </div>
  )
  const controls = (
    <div className="mt-3 flex items-center justify-end gap-2">
      {i > 0 && <button onClick={back} className="rounded-lg px-3 py-1.5 text-[12px] font-[700] text-gray hover:text-dark-text">Back</button>}
      <button onClick={next} className="rounded-lg bg-gradient-to-r from-teal to-navy px-4 py-1.5 text-[12px] font-[800] text-white shadow-button">
        {last ? 'Finish' : 'Next'}
      </button>
    </div>
  )

  // ── Centered card (welcome / closing / while navigating) ──
  if (centered || !rect) {
    return createPortal(
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-6" role="dialog" aria-modal="true">
        <style>{KEYFRAMES}</style>
        <div className="absolute inset-0 bg-dark-text/70 backdrop-blur-[2px]" />
        <div key={`c${i}`} className="relative w-full max-w-[360px] overflow-hidden rounded-2xl bg-card shadow-modal" style={{ animation: 'bdrIn .28s cubic-bezier(.2,.8,.2,1)' }}>
          <div className="bg-gradient-hero px-5 py-6 text-center text-white">
            <div className="mx-auto mb-2 text-[34px] leading-none">{step.emoji ?? '✨'}</div>
            <h3 className="text-[19px] font-[900]">{step.title}</h3>
          </div>
          <div className="px-5 py-4">
            {!centered && searching ? (
              <p className="flex items-center gap-2 text-[13px] text-gray"><Spinner /> Opening {step.route}…</p>
            ) : (
              <p className="text-[14px] leading-relaxed text-mid-text">{step.body}</p>
            )}
            <Progress i={i} n={total} />
            <div className="mt-3 flex items-center justify-between">
              <button onClick={finish} className="text-[12px] font-[700] text-gray hover:text-dark-text">Skip</button>
              <div className="flex gap-2">
                {i > 0 && <button onClick={back} className="rounded-lg px-3 py-1.5 text-[13px] font-[700] text-gray hover:text-dark-text">Back</button>}
                <button onClick={next} className="rounded-lg bg-gradient-to-r from-teal to-navy px-4 py-1.5 text-[13px] font-[800] text-white shadow-button">
                  {last ? 'Finish' : (i === 0 ? 'Start the tour' : 'Next')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // ── Spotlight + caret tooltip on the real element ──
  const below = rect.bottom + tipH + GAP + 14 < vh
  const top = below ? rect.bottom + GAP + 10 : Math.max(GAP, rect.top - GAP - 10 - tipH)
  let left = rect.left + rect.width / 2 - TIP_W / 2
  left = Math.min(Math.max(GAP, left), vw - TIP_W - GAP)
  const caretLeft = Math.min(Math.max(16, rect.left + rect.width / 2 - left - 6), TIP_W - 28)

  return createPortal(
    <div className="fixed inset-0 z-[600]" role="dialog" aria-modal="true">
      <style>{KEYFRAMES}</style>
      <div className="pointer-events-none absolute rounded-xl"
        style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, boxShadow: '0 0 0 9999px rgba(15,23,42,0.66)', transition: 'all .32s cubic-bezier(.2,.8,.2,1)' }} />
      <div className="pointer-events-none absolute rounded-xl ring-2 ring-teal"
        style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, transition: 'all .32s cubic-bezier(.2,.8,.2,1)', animation: 'bdrPulse 1.8s ease-out infinite' }} />
      {/* backdrop catches clicks but does NOT close (deliberate multi-step tour) */}
      <div className="absolute inset-0 cursor-default" />
      <div ref={tipRef} key={`t${i}`} className="absolute rounded-xl border border-border bg-card shadow-modal"
        style={{ top, left, width: TIP_W, animation: 'bdrIn .26s cubic-bezier(.2,.8,.2,1)' }}>
        <div className="absolute h-3 w-3 rotate-45 border border-border bg-card"
          style={below ? { top: -6.5, left: caretLeft, borderRight: 'none', borderBottom: 'none' } : { bottom: -6.5, left: caretLeft, borderLeft: 'none', borderTop: 'none' }} />
        <div className="p-4">
          {header}
          <h3 className="mt-1.5 text-[15px] font-[800] text-dark-text">{step.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-mid-text">{step.body}</p>
          <Progress i={i} n={total} />
          {controls}
        </div>
      </div>
    </div>,
    document.body
  )
}

function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal border-t-transparent" />
}
function Progress({ i, n }: { i: number; n: number }) {
  return (
    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border">
      <div className="h-full rounded-full bg-gradient-to-r from-teal to-navy transition-all duration-300" style={{ width: `${((i + 1) / n) * 100}%` }} />
    </div>
  )
}

const KEYFRAMES = `
@keyframes bdrIn { from { opacity:0; transform: translateY(8px) scale(.97) } to { opacity:1; transform:none } }
@keyframes bdrPulse { 0% { box-shadow:0 0 0 0 rgba(0,194,178,.45) } 70% { box-shadow:0 0 0 12px rgba(0,194,178,0) } 100% { box-shadow:0 0 0 0 rgba(0,194,178,0) } }
`
