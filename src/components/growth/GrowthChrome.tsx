// @ts-nocheck
'use client'

// GrowthChrome is the FULL header — title, a 3-item status row, and the
// Triage Strip ("Right Now / Next / After That") — and now renders on the
// Overview tab (/grow) ONLY. Every other Agentic CRM sub-page (Automations,
// Lead Gen, AI Team, Build) uses GrowthSlimHeader below instead: a one-line
// title + subtitle, no repeated KPI row, no repeated Triage Strip. Repeating
// the full chrome on every tab was pure scroll waste before reaching that
// tab's actual content. Everything here is computed from real data; the AI
// Coach only ever runs when the user taps an item.

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui'
import {
  RaceCarIcon, TargetIcon, LightningIcon, FlameIcon, IntegrationIcon, ChartRisingIcon, ChecklistIcon,
  StarIcon, EditIcon, CheckIcon, CloseIcon, InfoIcon, ArrowRightIcon,
} from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { PHASES } from '@/lib/modules/growth-os/phases'
import { computeTriage } from '@/lib/modules/growth-os/triage'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

const ICONS = { FlameIcon, LightningIcon, TargetIcon, ChartRisingIcon, ChecklistIcon, IntegrationIcon, StarIcon }
const TONE = {
  error: { text: 'text-error', bg: 'bg-error/10', chipText: 'text-error', dot: 'bg-error' },
  teal:  { text: 'text-teal',  bg: 'bg-teal/10',  chipText: 'text-teal',  dot: 'bg-teal' },
  gold:  { text: 'text-[#A06C00]', bg: 'bg-gold/12', chipText: 'text-[#A06C00]', dot: 'bg-gold' },
  navy:  { text: 'text-navy-ink',  bg: 'bg-navy/8',   chipText: 'text-navy-ink',  dot: 'bg-navy' },
}

function GoalsEditor({ goals, onSave, onClose }: any) {
  const [income, setIncome] = useState(goals.monthly_income_goal || '')
  const [leads, setLeads] = useState(goals.leads_per_week_goal || '')
  const [close, setClose] = useState(goals.close_rate_goal != null ? Number(goals.close_rate_goal) : '')
  const field = (label: string, value: any, set: any, suffix: string, max?: number) => (
    <div className="mb-4">
      <div className="mb-1.5 text-[12px] font-[700] text-mid-text">{label}</div>
      <div className="flex items-center gap-2">
        <input type="number" min={0} max={max} value={value} onChange={e => set(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
          className="w-32 rounded-lg border border-border bg-card px-3 py-2 text-[14px] text-dark-text outline-none focus:border-navy/40" />
        <span className="text-[12px] text-gray">{suffix}</span>
      </div>
    </div>
  )
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-dark-text/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-modal" onClick={e => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[18px] font-[900] text-dark-text">Your goals</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray hover:text-dark-text"><CloseIcon size={18} /></button>
        </div>
        <p className="mb-5 text-[12.5px] leading-relaxed text-gray">These drive what your Agentic CRM tells you to do first, next, and after that — everywhere in the app.</p>
        {field('Monthly income goal', income, setIncome, 'USD / month')}
        {field('Lead generation goal', leads, setLeads, 'new partner leads / week')}
        {field('Close rate goal', close, setClose, '% of leads closed', 100)}
        <div className="mt-2 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-[13px] font-[700] text-mid-text">Cancel</button>
          <button onClick={() => { onSave({ monthly_income_goal: income === '' ? null : Number(income), leads_per_week_goal: leads === '' ? null : Number(leads), close_rate_goal: close === '' ? null : Number(close) }); onClose() }}
            className="rounded-lg bg-navy px-5 py-2 text-[13px] font-[700] text-white">Save goals</button>
        </div>
      </div>
    </div>
  )
}

export function GrowthChrome() {
  const { loading, roster, liveCount, leads, leadList, goals, saveGoals } = useGrowthOS()
  const { value: buildKV } = useModuleKV('growth_build', { done: [] })
  const [editing, setEditing] = useState(false)

  const hotStale = (leadList || []).filter(l => l.temperature === 'hot' && l.rawStage !== 'opportunity_won' && l.agoMin > 60).length
  const setupAgents = (roster || []).filter(a => a.status === 'setup')
  const buildIncomplete = PHASES.find(p => p.tasks.some(t => !(buildKV.done || []).includes(t.id))) || null

  const triage = computeTriage({ goals, leads, setupAgents, hotStale, buildIncomplete })

  const chip = (icon: any, label: string, tone: string) => {
    const Icon = icon
    const t = TONE[tone]
    return (
      <span className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[700]', t.bg, t.chipText)}>
        <Icon size={12} />{label}
      </span>
    )
  }

  return (
    <div className="space-y-3">
      {/* Title + setup status */}
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-white"><RaceCarIcon size={18} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="text-h2 leading-tight text-dark-text">Agentic CRM</h1>
          <p className="text-[12px] text-gray">AI team working for you 24/7</p>
        </div>
        <Link href="/grow/welcome" aria-label="Meet your AI team — replay the intro" title="Meet your AI team"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray hover:bg-bdrbg hover:text-navy-ink">
          <InfoIcon size={15} />
        </Link>
        {!loading && (setupAgents.length > 0 ? (
          <Link href="/grow/team" className="flex shrink-0 items-center gap-1 rounded-full bg-gold/12 px-2.5 py-1.5 text-[11px] font-[700] text-[#A06C00] hover:bg-gold/20">
            Finish setup ({setupAgents.length} left) <ArrowRightIcon size={11} />
          </Link>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1.5 text-[11px] font-[700] text-success">
            <CheckIcon size={11} /> All agents live
          </span>
        ))}
      </div>

      {/* Status row — 3 items max: agents live, hot leads (only if any), goals */}
      <div className="flex flex-wrap items-center gap-2">
        {chip(IntegrationIcon, `${liveCount} agent${liveCount === 1 ? '' : 's'} live`, 'teal')}
        {hotStale > 0 && chip(FlameIcon, `${hotStale} hot lead${hotStale > 1 ? 's' : ''}`, 'error')}
        <button onClick={() => setEditing(true)} className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-[700] text-gray hover:text-navy-ink">
          <TargetIcon size={12} />
          {goals.monthly_income_goal ? `$${Number(goals.monthly_income_goal).toLocaleString()}/mo` : 'Set goals'}
          {goals.leads_per_week_goal ? ` · ${goals.leads_per_week_goal}/wk` : ''}
          {goals.close_rate_goal ? ` · ${Number(goals.close_rate_goal)}% close` : ''}
          <EditIcon size={11} />
        </button>
      </div>

      {/* Triage strip — Overview only */}
      {!loading && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 px-0.5">
            <StarIcon size={13} className="text-navy-ink" />
            <span className="text-[12px] font-[800] text-dark-text">Your plan, prioritized against your goals</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {triage.map((item, i) => {
              const Icon = ICONS[item.icon] || StarIcon
              const t = TONE[item.tone]
              return (
                <Card key={i} className={cn('!p-3', t.bg.replace('bg-', 'border-').replace('/10', '/30').replace('/12', '/30').replace('/8', '/30'))}>
                  <span className={cn('inline-block rounded px-2 py-0.5 text-[9.5px] font-[800] uppercase tracking-wide', t.bg, t.chipText)}>{item.tier === 'now' ? 'Right now' : item.tier === 'next' ? 'Next' : 'After that'}</span>
                  <div className="mt-2 flex items-start gap-2">
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', t.bg)}><Icon size={14} className={t.text} /></span>
                    <div className="text-[12.5px] font-[800] leading-tight text-dark-text">{item.title}</div>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-gray">{item.reason}</p>
                  <button onClick={() => askCoach(item.prompt)} className={cn('mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-[800]', t.bg, t.chipText)}>
                    <IntegrationIcon size={11} /> Do this now
                  </button>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {editing && <GoalsEditor goals={goals} onSave={saveGoals} onClose={() => setEditing(false)} />}
    </div>
  )
}

// The header for every Agentic CRM sub-page that ISN'T Overview — one line,
// no repeated KPI row, no repeated Triage Strip. GrowthChrome above already
// owns "where do I stand"; a sub-page just needs to say what it is.
export function GrowthSlimHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-hero text-white"><RaceCarIcon size={15} /></span>
      <div className="min-w-0 flex-1">
        <h1 className="text-h2 leading-tight text-dark-text">{title}</h1>
        {subtitle && <p className="truncate text-[12px] text-gray">{subtitle}</p>}
      </div>
    </div>
  )
}
