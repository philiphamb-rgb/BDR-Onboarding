// @ts-nocheck
'use client'

// The shared Growth OS chrome that sits atop every Growth surface: the section
// title, an at-a-glance system-health + KPI chip row, and the Triage Strip
// ("Right Now / Next / After That") prioritized against the BDR's real goals.
// One definition so all six tabs share the exact same header, like the app's
// other workspace shells. Everything is computed from real data; the AI Coach
// only ever runs when the user taps an item.

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui'
import {
  GrowIcon, TargetIcon, LightningIcon, FlameIcon, ChecklistIcon, IntegrationIcon,
  ChartRisingIcon, StarIcon, CoinIcon, EditIcon, CheckIcon, CloseIcon,
} from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { monthlyCost } from '@/lib/modules/growth-os/roster'
import { PHASES, buildProgress } from '@/lib/modules/growth-os/phases'
import { computeTriage } from '@/lib/modules/growth-os/triage'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

const ICONS = { FlameIcon, LightningIcon, TargetIcon, ChartRisingIcon, ChecklistIcon, IntegrationIcon, StarIcon }
const TONE = {
  error: { text: 'text-error', bg: 'bg-error/10', chipText: 'text-error', dot: 'bg-error' },
  teal:  { text: 'text-teal',  bg: 'bg-teal/10',  chipText: 'text-teal',  dot: 'bg-teal' },
  gold:  { text: 'text-[#A06C00]', bg: 'bg-gold/12', chipText: 'text-[#A06C00]', dot: 'bg-gold' },
  navy:  { text: 'text-navy',  bg: 'bg-navy/8',   chipText: 'text-navy',  dot: 'bg-navy' },
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
        <p className="mb-5 text-[12.5px] leading-relaxed text-gray">These drive what your Growth OS tells you to do first, next, and after that — everywhere in the app.</p>
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

export function GrowthChrome({ compact = false }: { compact?: boolean }) {
  const { loading, roster, liveCount, leads, leadList, goals, saveGoals } = useGrowthOS()
  const { value: buildKV } = useModuleKV('growth_build', { done: [] })
  const [editing, setEditing] = useState(false)

  const bp = buildProgress(buildKV.done || [])
  const cost = monthlyCost(roster || [])
  const hotStale = (leadList || []).filter(l => l.temperature === 'hot' && l.rawStage !== 'opportunity_won' && l.agoMin > 60).length
  const setupAgents = (roster || []).filter(a => a.status === 'setup')
  const buildIncomplete = PHASES.find(p => p.tasks.some(t => !(buildKV.done || []).includes(t.id))) || null
  const health = hotStale > 0 ? 'error' : setupAgents.length > 0 ? 'gold' : 'teal'
  const healthLabel = hotStale > 0 ? `${hotStale} hot lead${hotStale > 1 ? 's' : ''} need attention` : setupAgents.length > 0 ? `${setupAgents.length} agent${setupAgents.length > 1 ? 's' : ''} to set up` : 'Everything is covered'

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
      {/* Title + health */}
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-white"><GrowIcon size={18} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="text-h2 leading-tight text-dark-text">Growth OS</h1>
          <p className="text-[12px] text-gray">Your AI-powered growth engine</p>
        </div>
        <span className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-[700]', TONE[health].bg, TONE[health].chipText)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', TONE[health].dot)} />{healthLabel}
        </span>
      </div>

      {/* KPI chips */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          {chip(IntegrationIcon, `${liveCount}/${roster?.length || 18} agents live`, 'teal')}
          {chip(CoinIcon, `~$${cost}/mo`, 'gold')}
          {chip(FlameIcon, `${leads.hot} hot leads`, 'error')}
          {chip(ChecklistIcon, `${bp.pct}% built`, 'navy')}
          <button onClick={() => setEditing(true)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-[700] text-gray hover:text-navy">
            <TargetIcon size={12} />
            {goals.monthly_income_goal ? `$${Number(goals.monthly_income_goal).toLocaleString()}/mo` : 'Set goals'}
            {goals.leads_per_week_goal ? ` · ${goals.leads_per_week_goal}/wk` : ''}
            {goals.close_rate_goal ? ` · ${Number(goals.close_rate_goal)}% close` : ''}
            <EditIcon size={11} />
          </button>
        </div>
      )}

      {/* Triage strip */}
      {!compact && !loading && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 px-0.5">
            <StarIcon size={13} className="text-navy" />
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
