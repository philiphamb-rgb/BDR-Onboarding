'use client'

// Shared manager-surface UI primitives. Built on the design-system tokens
// (dark-text / gray / border / bdrbg / teal / gold) so every /manager/* view
// reads as one product, not seven different pages.

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Insight, InsightTone } from '@/lib/insights'
import {
  TrophyIcon, FlameIcon, AlertIcon, PhoneIcon, BeltIcon,
  TargetIcon, ChartRisingIcon, BookIcon, LightningIcon,
} from '@/components/icons'

// ── Insight list ────────────────────────────────────────────────────────────

const INSIGHT_ICONS = {
  trophy: TrophyIcon, flame: FlameIcon, alert: AlertIcon, phone: PhoneIcon,
  belt: BeltIcon, target: TargetIcon, chart: ChartRisingIcon, book: BookIcon,
} as const

const TONE_STYLES: Record<InsightTone, { wrap: string; icon: string; dot: string }> = {
  positive: { wrap: 'bg-success/5 border-success/30', icon: 'text-success', dot: 'bg-success' },
  warning:  { wrap: 'bg-gold/[0.06] border-gold/40',   icon: 'text-[#A06C00]', dot: 'bg-gold' },
  info:     { wrap: 'bg-navy/[0.04] border-navy/20',    icon: 'text-navy-ink', dot: 'bg-navy' },
}

export function InsightRow({ insight }: { insight: Insight }) {
  const Icon = INSIGHT_ICONS[insight.icon] ?? LightningIcon
  const tone = TONE_STYLES[insight.tone]
  return (
    <div className={cn('flex items-start gap-3 rounded-md border p-3', tone.wrap)}>
      <div className={cn('mt-0.5 shrink-0', tone.icon, insight.tone === 'warning' && 'animate-attention')}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-[700] text-dark-text leading-snug">{insight.title}</p>
        <p className="mt-0.5 text-[12px] text-gray leading-relaxed">{insight.detail}</p>
      </div>
    </div>
  )
}

// ── Stat tile ───────────────────────────────────────────────────────────────

export function StatTile({
  label, value, sub, icon, accent = 'text-navy-ink',
}: {
  label: string
  value: React.ReactNode
  sub?: string
  icon?: React.ReactNode
  accent?: string
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-card">
      {icon && <div className={cn('mb-2', accent)}>{icon}</div>}
      <div className="text-[22px] font-[800] leading-none text-dark-text">{value}</div>
      <div className="mt-1 text-[12px] font-[600] text-mid-text">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-gray">{sub}</div>}
    </div>
  )
}

// ── Horizontal bar (per-rep comparisons) ────────────────────────────────────

export function MiniBar({
  label, value, max, display, color = 'bg-gradient-primary',
}: {
  label: string
  value: number
  max: number
  display?: string
  color?: string
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  // Fill from 0 on mount for a lively "drawing in" feel (reduced-motion users
  // simply see the final width since the transition is near-instant for them).
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(pct), 60); return () => clearTimeout(t) }, [pct])
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-[12px] font-[600] text-mid-text">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
        <div className={cn('h-full rounded-full transition-all duration-700 ease-out', color)} style={{ width: `${w}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right text-[12px] font-[700] text-dark-text tabular-nums">
        {display ?? value}
      </span>
    </div>
  )
}

// ── Section header (consistent page titles) ─────────────────────────────────

export function PageHeader({
  title, subtitle, action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-h1 text-dark-text">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-gray">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
