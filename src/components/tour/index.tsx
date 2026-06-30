// @ts-nocheck
'use client'

// Guided-tour (coachmark) engine — dependency-free, designed to feel premium.
// - Animated spotlight that glides between targets with a pulsing teal ring.
// - Caret-pointed tooltip with precise placement, progress bar, and smooth
//   step-to-step transitions.
// - Centered "welcome" steps (a step with no selector) for a strong opener/closer.
// - Keyboard: → / ← to move, Esc to skip.
// - Auto-runs once per user per tourKey (localStorage keyed by user id); replay
//   via window.dispatchEvent(new CustomEvent('bdr:start-tour',{detail:tourKey})).

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

export interface TourStep {
  selector?: string   // omit for a centered welcome/closing card
  title: string
  body: string
  emoji?: string      // small glyph in the badge
}

const LS = (uid) => `bdr:tours:${uid}`
function getSeen(uid) { try { return new Set(JSON.parse(localStorage.getItem(LS(uid)) || '[]')) } catch { return new Set() } }
function addSeen(uid, key) { const s = getSeen(uid); s.add(key); try { localStorage.setItem(LS(uid), JSON.stringify([...s])) } catch {} }
export function resetTours(uid) { try { localStorage.removeItem(LS(uid)) } catch {} }

const TIP_W = 320
const GAP = 12

export function Tour({ tourKey, steps, autoStart = true }: { tourKey: string; steps: TourStep[]; autoStart?: boolean }) {
  const supabase = createClient()
  const [uid, setUid] = useState(null)
  const [run, setRun] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [tipH, setTipH] = useState(190)
  const tipRef = useRef(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !active) return
      setUid(user.id)
      // Don't auto-fire a page tour while the global guided walkthrough is running.
      let guided = false
      try { guided = !!sessionStorage.getItem('bdr:guidedActive') } catch {}
      if (autoStart && !guided && !getSeen(user.id).has(tourKey)) {
        setTimeout(() => { if (active) { setI(0); setRun(true) } }, 700)
      }
    })
    return () => { active = false }
  }, [tourKey])

  useEffect(() => {
    const h = (e) => { if (e.detail === tourKey || e.detail === '*') { setI(0); setRun(true) } }
    window.addEventListener('bdr:start-tour', h)
    return () => window.removeEventListener('bdr:start-tour', h)
  }, [tourKey])

  const finish = useCallback(() => { setRun(false); setRect(null); if (uid) addSeen(uid, tourKey) }, [uid, tourKey])

  const step = steps[i]
  const centered = step && !step.selector
  const next = useCallback(() => { setI((p) => { if (p < steps.length - 1) return p + 1; finish(); return p }) }, [steps.length, finish])
  const back = useCallback(() => setI((p) => Math.max(0, p - 1)), [])

  // Position / measure the active target.
  useLayoutEffect(() => {
    if (!run || !step) return
    if (centered) { setRect(null); return }
    const el = document.querySelector(step.selector)
    if (!el) { if (i < steps.length - 1) setI(i + 1); else finish(); return }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const update = () => setRect(el.getBoundingClientRect())
    const t = setTimeout(update, 260)
    update()
    window.addEventListener('resize', update); window.addEventListener('scroll', update, true)
    return () => { clearTimeout(t); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [run, i, step, centered, finish])

  useLayoutEffect(() => { if (tipRef.current) setTipH(tipRef.current.offsetHeight) })

  // Keyboard nav.
  useEffect(() => {
    if (!run) return
    const onKey = (e) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run, next, back, finish])

  if (!mounted || !run || !step) return null
  if (!centered && !rect) return null

  const vw = window.innerWidth, vh = window.innerHeight
  const last = i === steps.length - 1

  // ---- Centered welcome/closing card ----
  if (centered) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" role="dialog" aria-modal="true">
        <style>{KEYFRAMES}</style>
        <button aria-label="Skip" onClick={finish} className="absolute inset-0 bg-dark-text/70 backdrop-blur-[2px]" />
        <div key={i} className="relative w-full max-w-[340px] overflow-hidden rounded-2xl bg-card shadow-modal" style={{ animation: 'bdrIn .28s cubic-bezier(.2,.8,.2,1)' }}>
          <div className="bg-gradient-hero px-5 py-6 text-center text-white">
            <div className="mx-auto mb-2 text-[34px] leading-none">{step.emoji ?? '✨'}</div>
            <h3 className="text-[19px] font-[900]">{step.title}</h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-[14px] leading-relaxed text-mid-text">{step.body}</p>
            <Progress i={i} n={steps.length} />
            <div className="mt-3 flex items-center justify-between">
              <button onClick={finish} className="text-[12px] font-[700] text-gray hover:text-dark-text">Skip</button>
              <div className="flex gap-2">
                {i > 0 && <button onClick={back} className="rounded-lg px-3 py-1.5 text-[13px] font-[700] text-gray hover:text-dark-text">Back</button>}
                <button onClick={next} className="rounded-lg bg-gradient-to-r from-teal to-navy px-4 py-1.5 text-[13px] font-[800] text-white shadow-button">
                  {last ? 'Let’s go' : 'Show me'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // ---- Spotlight + caret tooltip ----
  const below = rect.bottom + tipH + GAP + 14 < vh
  const top = below ? rect.bottom + GAP + 10 : rect.top - GAP - 10 - tipH
  let left = rect.left + rect.width / 2 - TIP_W / 2
  left = Math.min(Math.max(GAP, left), vw - TIP_W - GAP)
  const caretLeft = Math.min(Math.max(16, rect.left + rect.width / 2 - left - 6), TIP_W - 28)

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <style>{KEYFRAMES}</style>
      {/* Dim + spotlight cutout (glides between targets) */}
      <div className="pointer-events-none absolute rounded-xl"
        style={{
          top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12,
          boxShadow: '0 0 0 9999px rgba(15,23,42,0.66)',
          transition: 'all .32s cubic-bezier(.2,.8,.2,1)',
        }} />
      {/* Pulsing accent ring on the target */}
      <div className="pointer-events-none absolute rounded-xl ring-2 ring-teal"
        style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, transition: 'all .32s cubic-bezier(.2,.8,.2,1)', animation: 'bdrPulse 1.8s ease-out infinite' }} />
      {/* Tap-outside to skip */}
      <button aria-label="Skip tour" onClick={finish} className="absolute inset-0 cursor-default" />
      {/* Tooltip */}
      <div ref={tipRef} key={i} className="absolute rounded-xl border border-border bg-card shadow-modal"
        style={{ top, left, width: TIP_W, animation: 'bdrIn .26s cubic-bezier(.2,.8,.2,1)' }}>
        {/* caret */}
        <div className="absolute h-3 w-3 rotate-45 border border-border bg-card"
          style={ below
            ? { top: -6.5, left: caretLeft, borderRight: 'none', borderBottom: 'none' }
            : { bottom: -6.5, left: caretLeft, borderLeft: 'none', borderTop: 'none' } } />
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-[800] text-teal">
              <span>{step.emoji ?? '👉'}</span> Step {i + 1} of {steps.length}
            </span>
            <button onClick={finish} className="text-[11px] font-[700] text-gray hover:text-dark-text">Skip</button>
          </div>
          <h3 className="mt-1.5 text-[15px] font-[800] text-dark-text">{step.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-mid-text">{step.body}</p>
          <Progress i={i} n={steps.length} />
          <div className="mt-3 flex items-center justify-end gap-2">
            {i > 0 && <button onClick={back} className="rounded-lg px-3 py-1.5 text-[12px] font-[700] text-gray hover:text-dark-text">Back</button>}
            <button onClick={next} className="rounded-lg bg-gradient-to-r from-teal to-navy px-4 py-1.5 text-[12px] font-[800] text-white shadow-button">
              {last ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
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
