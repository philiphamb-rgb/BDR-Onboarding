// @ts-nocheck
'use client'

// Lightweight, dependency-free guided-tour (coachmark) engine.
// - Spotlights a target element (dims everything else) and shows a concise tip.
// - Auto-runs once per user per tourKey (persisted in localStorage, keyed by
//   user id), then never nags again — unless replayed.
// - Replay any tour by dispatching: window.dispatchEvent(new CustomEvent('bdr:start-tour',{detail:'home'}))
//   or detail:'*' to start whichever tour is mounted on the current screen.
// Targets are matched by a CSS selector, typically [data-tour="id"].

import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

export interface TourStep {
  selector: string
  title: string
  body: string
}

const LS = (uid: string) => `bdr:tours:${uid}`
function getSeen(uid: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS(uid)) || '[]')) } catch { return new Set() }
}
function addSeen(uid: string, key: string) {
  const s = getSeen(uid); s.add(key)
  try { localStorage.setItem(LS(uid), JSON.stringify([...s])) } catch { /* ignore */ }
}
// Clear all seen tours for a user so every tour replays. Used by Settings.
export function resetTours(uid: string) {
  try { localStorage.removeItem(LS(uid)) } catch { /* ignore */ }
}

const PAD = 8
const TIP_W = 300

export function Tour({ tourKey, steps, autoStart = true }: { tourKey: string; steps: TourStep[]; autoStart?: boolean }) {
  const supabase = createClient()
  const [uid, setUid] = useState<string | null>(null)
  const [run, setRun] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !active) return
      setUid(user.id)
      if (autoStart && !getSeen(user.id).has(tourKey)) {
        // Let the screen paint its targets first.
        setTimeout(() => { if (active) { setI(0); setRun(true) } }, 650)
      }
    })
    return () => { active = false }
  }, [tourKey])

  // Manual (replay) trigger.
  useEffect(() => {
    const h = (e: any) => { if (e.detail === tourKey || e.detail === '*') { setI(0); setRun(true) } }
    window.addEventListener('bdr:start-tour', h)
    return () => window.removeEventListener('bdr:start-tour', h)
  }, [tourKey])

  const finish = useCallback(() => {
    setRun(false); setRect(null)
    if (uid) addSeen(uid, tourKey)
  }, [uid, tourKey])

  const step = steps[i]

  useLayoutEffect(() => {
    if (!run || !step) return
    const el = document.querySelector(step.selector) as HTMLElement | null
    if (!el) {
      // Target not on this screen — skip ahead so the tour never dead-ends.
      if (i < steps.length - 1) setI(i + 1); else finish()
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const update = () => setRect(el.getBoundingClientRect())
    const t = setTimeout(update, 250) // after scroll settles
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { clearTimeout(t); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [run, i, step, finish])

  if (!mounted || !run || !step || !rect) return null

  const vw = window.innerWidth, vh = window.innerHeight
  const below = rect.bottom + 150 < vh
  const top = below ? rect.bottom + PAD + 6 : Math.max(PAD, rect.top - PAD - 6 - 150)
  let left = rect.left + rect.width / 2 - TIP_W / 2
  left = Math.min(Math.max(PAD, left), vw - TIP_W - PAD)

  const next = () => { if (i < steps.length - 1) setI(i + 1); else finish() }
  const back = () => setI(Math.max(0, i - 1))

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Spotlight cutout: dim everything except the target rect */}
      <div
        className="pointer-events-none absolute rounded-lg transition-all duration-200"
        style={{
          top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8,
          boxShadow: '0 0 0 9999px rgba(15,23,42,0.62)',
        }}
      />
      {/* Click-catcher to dismiss by tapping outside the tooltip */}
      <button aria-label="Skip tour" onClick={finish} className="absolute inset-0 cursor-default" />
      {/* Tooltip */}
      <div className="absolute rounded-xl border border-border bg-card p-4 shadow-modal"
        style={{ top, left, width: TIP_W }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-[800] uppercase tracking-[0.08em] text-teal">{i + 1} / {steps.length}</span>
          <button onClick={finish} className="text-[11px] font-[700] text-gray hover:text-dark-text">Skip</button>
        </div>
        <h3 className="mt-1 text-[15px] font-[800] text-dark-text">{step.title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-mid-text">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, j) => <span key={j} className={`h-1.5 w-1.5 rounded-full ${j === i ? 'bg-teal' : 'bg-border'}`} />)}
          </div>
          <div className="flex gap-2">
            {i > 0 && <button onClick={back} className="rounded-md px-2.5 py-1 text-[12px] font-[700] text-gray hover:text-dark-text">Back</button>}
            <button onClick={next} className="rounded-md bg-navy px-3 py-1 text-[12px] font-[700] text-white hover:bg-navy-dark">
              {i < steps.length - 1 ? 'Next' : 'Got it'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
