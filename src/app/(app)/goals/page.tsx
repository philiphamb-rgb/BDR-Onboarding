// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Coach Center — Goals. Multi-horizon goal design (annual → daily), each tied to
// a category (revenue/content/outreach/partner/habit), with progress, status,
// and a one-tap "design my goals with AI" that hands the coach the full picture.
// Backed by goal_items; the primary monthly deal goal stays in the GoalCockpit.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, Modal, Skeleton, toast, Button, ProgressBar } from '@/components/ui'
import { PlusIcon, TrashIcon, TargetIcon, CoachIcon, CheckIcon, ArrowRightIcon } from '@/components/icons'
import { useGoals, HORIZONS, CATEGORIES } from '@/lib/hooks/useGoals'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

const HORIZON_LABEL: Record<string, string> = { annual: 'This year', quarterly: 'This quarter', monthly: 'This month', weekly: 'This week', daily: 'Today' }
const CAT_TONE: Record<string, string> = {
  revenue: 'bg-success/10 text-success', content: 'bg-teal/10 text-teal', outreach: 'bg-navy/8 text-navy-ink',
  partner: 'bg-gold/12 text-[#A06C00]', habit: 'bg-bdrbg text-gray',
}
const STATUS_TONE: Record<string, string> = { active: 'text-gray', hit: 'text-success', missed: 'text-error', archived: 'text-gray' }

export default function GoalsPage() {
  const { loading, goals, create, update, remove } = useGoals()
  const [filter, setFilter] = useState<'all' | string>('all')
  const [editing, setEditing] = useState<any>(null)

  const shown = filter === 'all' ? goals : goals.filter(g => g.horizon === filter)
  const grouped = useMemo(() =>
    HORIZONS.map(h => ({ horizon: h, items: shown.filter(g => g.horizon === h) })).filter(g => g.items.length > 0),
    [shown])
  const active = goals.filter(g => g.status === 'active').length
  const hit = goals.filter(g => g.status === 'hit').length

  const designPrompt = goals.length
    ? `Here are my current goals: ${goals.map(g => `${g.horizon}: ${g.title}${g.target ? ` (target ${g.target}${g.metric ? ' ' + g.metric : ''}, at ${g.progress})` : ''}`).join('; ')}. Review them for balance across revenue, content, outreach, and partner growth, flag anything unrealistic or missing, and suggest what to adjust.`
    : 'Help me set a balanced set of goals across the year, quarter, month, week, and today — covering revenue, content, outreach, and partner growth. Ask me what I want to hit, then propose specific, measurable targets.'

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-dark-text">Goals</h1>
          <p className="mt-0.5 text-[13px] text-gray">Set goals across every horizon. Your coach plans around them.</p>
        </div>
        <Link href="/commissions" className="hidden shrink-0 items-center gap-1 rounded-pill border border-border bg-card px-3 py-2 text-[12px] font-[700] text-navy-ink shadow-card hover:border-navy/40 desktop:flex"><TargetIcon size={15} /> Income Planner</Link>
      </div>

      {/* Design-with-AI hero */}
      <Card className="!border-none bg-gradient-hero !p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><CoachIcon size={20} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-[800]">{goals.length ? 'Tune your goals with your coach' : 'Design your goals with your coach'}</div>
            <div className="text-[12px] text-white/75">{goals.length ? `${active} active · ${hit} hit` : 'It will propose specific, measurable targets across every horizon.'}</div>
          </div>
          <button onClick={() => askCoach(designPrompt)} className="shrink-0 rounded-lg bg-white px-3.5 py-2 text-[12.5px] font-[800] text-navy-ink">{goals.length ? 'Review →' : 'Start →'}</button>
        </div>
      </Card>

      {/* Horizon filter + new */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => setFilter('all')} className={cn('rounded-full border px-3 py-1 text-[11.5px] font-[700]', filter === 'all' ? 'border-navy bg-navy text-white' : 'border-border text-gray')}>All</button>
        {HORIZONS.map(h => (
          <button key={h} onClick={() => setFilter(h)} className={cn('rounded-full border px-3 py-1 text-[11.5px] font-[700] capitalize', filter === h ? 'border-navy bg-navy text-white' : 'border-border text-gray')}>{h}</button>
        ))}
        <button onClick={() => setEditing({ horizon: filter === 'all' ? 'monthly' : filter })} className="ml-auto flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-[12px] font-[800] text-white"><PlusIcon size={13} /> New goal</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <Card className="!py-10 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bdrbg text-gray"><TargetIcon size={22} /></span>
          <h2 className="text-[15px] font-[800] text-dark-text">No goals here yet</h2>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-gray">Set your first goal, or let your coach design a balanced set for you.</p>
          <button onClick={() => setEditing({ horizon: filter === 'all' ? 'monthly' : filter })} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-[13px] font-[800] text-white"><PlusIcon size={14} /> New goal</button>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(g => (
            <div key={g.horizon}>
              <div className="mb-1.5 px-0.5 text-[11px] font-[800] uppercase tracking-wide text-gray">{HORIZON_LABEL[g.horizon]}</div>
              <div className="space-y-2">
                {g.items.map(goal => {
                  const pct = goal.target ? Math.min(100, Math.round((goal.progress / goal.target) * 100)) : null
                  return (
                    <Card key={goal.id} hover className="!p-3.5 cursor-pointer" onClick={() => setEditing(goal)}>
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[13.5px] font-[800] text-dark-text">{goal.title}</span>
                            {goal.category && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-[800] capitalize', CAT_TONE[goal.category])}>{goal.category}</span>}
                            {goal.status !== 'active' && <span className={cn('text-[10px] font-[800] capitalize', STATUS_TONE[goal.status])}>{goal.status === 'hit' ? '✓ hit' : goal.status}</span>}
                          </div>
                          {goal.target != null && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <ProgressBar value={pct ?? 0} max={100} className="h-1.5 flex-1" color={goal.status === 'hit' ? '#16A34A' : 'rgb(var(--teal))'} />
                              <span className="shrink-0 text-[11px] font-[700] tabular-nums text-gray">{goal.progress}/{goal.target}{goal.metric ? ` ${goal.metric}` : ''}</span>
                            </div>
                          )}
                        </div>
                        <ArrowRightIcon size={15} className="shrink-0 text-gray" />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <GoalModal
          goal={editing.id ? editing : null}
          initialHorizon={editing.horizon}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            const res = editing.id ? await update(editing.id, values) : await create(values)
            if (res.error) { toast.error(`Couldn't save. ${res.error}`); return }
            toast.success(editing.id ? 'Saved' : 'Goal created'); setEditing(null)
          }}
          onDelete={editing.id ? async () => {
            const res = await remove(editing.id)
            if (res.error) { toast.error(`Couldn't delete. ${res.error}`); return }
            toast.success('Deleted'); setEditing(null)
          } : undefined}
        />
      )}
    </div>
  )
}

function GoalModal({ goal, initialHorizon, onClose, onSave, onDelete }: any) {
  const [v, setV] = useState({
    title: goal?.title ?? '', horizon: goal?.horizon ?? initialHorizon ?? 'monthly',
    category: goal?.category ?? 'revenue', target: goal?.target ?? '', metric: goal?.metric ?? '',
    progress: goal?.progress ?? 0, status: goal?.status ?? 'active', due_date: goal?.due_date ?? '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, val: any) => setV(prev => ({ ...prev, [k]: val }))
  const num = (x: any) => (x === '' || x == null ? null : (Number.isFinite(parseFloat(x)) ? parseFloat(x) : null))

  const submit = async () => {
    if (!String(v.title).trim()) { toast.error('Title is required'); return }
    setBusy(true)
    await onSave({ title: v.title.trim(), horizon: v.horizon, category: v.category, target: num(v.target), metric: v.metric || null, progress: num(v.progress) ?? 0, status: v.status, due_date: v.due_date || null })
    setBusy(false)
  }

  const field = (label: string, node: any) => <label className="block"><span className="mb-1 block text-[11px] font-[700] text-gray">{label}</span>{node}</label>
  const input = (k: string, type = 'text') => <input type={type} value={v[k] ?? ''} onChange={e => set(k, e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" />
  const select = (k: string, opts: string[]) => <select value={v[k]} onChange={e => set(k, e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] capitalize outline-none focus:border-navy/40">{opts.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}</select>

  return (
    <Modal isOpen title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <div className="space-y-3">
        {field('Goal', input('title'))}
        <div className="grid grid-cols-2 gap-3">
          {field('Horizon', select('horizon', HORIZONS))}
          {field('Category', select('category', CATEGORIES))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {field('Target', input('target', 'number'))}
          {field('Metric', input('metric'))}
          {field('Progress', input('progress', 'number'))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('Status', select('status', ['active', 'hit', 'missed', 'archived']))}
          {field('Due date', input('due_date', 'date'))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          {onDelete && <button onClick={onDelete} disabled={busy} className="flex items-center gap-1 rounded-lg border border-error/30 px-3 py-2 text-[12px] font-[700] text-error"><TrashIcon size={13} /> Delete</button>}
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-[12.5px] font-[700] text-gray">Cancel</button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : goal ? 'Save' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  )
}
