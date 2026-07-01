// @ts-nocheck
'use client'

// A smooth, welcoming first-visit overlay. Shows once per user (persisted via
// module_progress), describes the workspace they're about to use, and launches
// them into their baseline setup with one high-visibility CTA. Reusable — the
// Today tab uses it to point new users at "Set Your Goals".

import Link from 'next/link'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { CloseIcon, ArrowRightIcon, CheckIcon } from '@/components/icons'

export function FirstRunOverlay({ kvKey, eyebrow, title, body, steps = [], ctaLabel, ctaHref }: {
  kvKey: string; eyebrow?: string; title: string; body: string; steps?: { icon: any; label: string }[]; ctaLabel: string; ctaHref: string
}) {
  const { loading, value, save } = useModuleKV(kvKey, { seen: false })
  if (loading || value.seen) return null
  const dismiss = () => save({ seen: true })

  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-dark-text/55 p-4 backdrop-blur-[2px] animate-fade-in">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-modal animate-pop">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-hero p-6 text-white">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shimmer bg-white/20 blur-md" />
          <button onClick={dismiss} aria-label="Skip" className="absolute right-3 top-3 text-white/70 hover:text-white"><CloseIcon size={18} /></button>
          {eyebrow && <div className="relative text-[11px] font-[800] uppercase tracking-[0.14em] text-white/75">{eyebrow}</div>}
          <h1 className="relative mt-1 text-[22px] font-[900] leading-tight">{title}</h1>
          <p className="relative mt-2 text-[13px] leading-relaxed text-white/85">{body}</p>
        </div>
        {/* Steps */}
        {steps.length > 0 && (
          <div className="space-y-2 p-5">
            {steps.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy/8 text-navy"><Icon size={16} /></span>
                  <span className="text-[13px] font-[600] text-mid-text">{s.label}</span>
                </div>
              )
            })}
          </div>
        )}
        {/* CTA */}
        <div className="flex items-center gap-2 border-t border-border p-4">
          <button onClick={dismiss} className="rounded-lg px-3 py-2.5 text-[12.5px] font-[700] text-gray hover:text-dark-text">Skip for now</button>
          <div className="flex-1" />
          <Link href={ctaHref} onClick={dismiss} className="relative flex items-center gap-2 overflow-hidden rounded-lg bg-navy px-5 py-2.5 text-[13.5px] font-[800] text-white shadow-card transition-transform active:scale-95">
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shimmer bg-white/25 blur-md" />
            <span className="relative">{ctaLabel}</span><ArrowRightIcon size={16} className="relative animate-nudge-x" />
          </Link>
        </div>
      </div>
    </div>
  )
}
