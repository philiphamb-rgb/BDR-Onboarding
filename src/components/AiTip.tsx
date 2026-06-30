// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { LightningIcon, CloseIcon, ArrowRightIcon } from '@/components/icons'
import { askCoach } from '@/lib/coachBus'

// A friendly, dismissable "here's what AI can do here" coachmark. Teaches users
// — especially those new to AI — the concrete capabilities of each module, with
// an optional one-tap "Try it" that demonstrates by opening the AI Coach.
// Dismissal persists per id so it teaches once, then gets out of the way.
export function AiTip({ id, title, children, prompt, tryLabel = 'Try it' }: {
  id: string; title: string; children: React.ReactNode; prompt?: string; tryLabel?: string
}) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try { setShow(localStorage.getItem('aitip:' + id) !== '1') } catch { setShow(true) }
  }, [id])
  if (!show) return null
  const dismiss = () => { try { localStorage.setItem('aitip:' + id, '1') } catch { /* ignore */ } ; setShow(false) }
  return (
    <div className="relative overflow-hidden rounded-2xl border border-teal/30 bg-teal/[0.06] p-3 animate-rise">
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-shimmer bg-white/30 blur-md" aria-hidden="true" />
      <div className="relative flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-hero text-white"><LightningIcon size={15} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-[800] text-dark-text">{title}</div>
          <div className="mt-0.5 text-[12px] leading-relaxed text-mid-text">{children}</div>
          {prompt && (
            <button onClick={() => { askCoach(prompt); dismiss() }}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-gradient-hero px-2.5 py-1.5 text-[12px] font-[800] text-white transition-transform active:scale-95">
              {tryLabel} <ArrowRightIcon size={13} className="animate-nudge-x" />
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Dismiss tip" className="relative shrink-0 text-gray hover:text-dark-text"><CloseIcon size={15} /></button>
      </div>
    </div>
  )
}
