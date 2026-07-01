// @ts-nocheck
'use client'

// Apex — the Leads board: a HubSpot-style list view over the real
// partner_onboarding pipeline. Search + filter (temperature, score) + sort,
// saveable named views, and multi-select bulk operations. Every bulk write is
// RLS-safe and PERMISSION-GATED: bulk stage/temperature edits require
// canEdit('growth'); the manager-only "Assign owner" op is gated on isManager and
// backed by the team-scoped manager update policy on partner_onboarding.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui'
import { NoteButton } from '@/components/growth/NoteButton'
import { usePermissions } from '@/components/usePermissions'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { GEN_PROMPTS, SCORE_ROUTING, fmtAgo, leadSuggestion } from '@/lib/modules/growth-os/leadgen'
import { askCoach } from '@/lib/coachBus'
import {
  TargetIcon, LightningIcon, IntegrationIcon, ArrowRightIcon, SearchIcon, CloseIcon,
  CheckIcon, FilterIcon, StarIcon, TrashIcon, UserIcon, LockIcon, ChevronDownIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils'

const scoreColor = (s: number) => s >= 90 ? '#16A34A' : s >= 75 ? '#00C2B2' : s >= 50 ? '#B45309' : '#DC2626'
const STAGE_META: any = { hot: { l: 'Hot', c: 'text-error bg-error/10' }, warm: { l: 'Warm', c: 'text-[#A06C00] bg-gold/12' }, cold: { l: 'Cold', c: 'text-gray bg-bdrbg' }, converted: { l: 'Converted', c: 'text-success bg-success/10' } }
const PIPELINE = [
  { k: 'new_lead', l: 'New' }, { k: 'interested', l: 'Interested' }, { k: 'proposal_sent', l: 'Proposal' },
  { k: 'contract_signed', l: 'Signed' }, { k: 'opportunity_won', l: 'Won' },
]
const TEMPS = [{ k: 'cold', l: 'Cold' }, { k: 'warm', l: 'Warm' }, { k: 'hot', l: 'Hot' }]
const SORTS = [{ k: 'score', l: 'Score' }, { k: 'recent', l: 'Recent' }, { k: 'name', l: 'Name' }]
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export function LeadsBoard({ leadList, onOpenLead, reload }: { leadList: any[]; onOpenLead: (l: any) => void; reload: () => void }) {
  const supabase = createClient()
  const { canEdit, isManager } = usePermissions()
  const editable = canEdit('growth')
  const { value: savedKV, save: saveViews } = useModuleKV('growth_leadviews', { views: [] })

  const [q, setQ] = useState('')
  const [temp, setTemp] = useState<string | null>(null)
  const [scoreMin, setScoreMin] = useState(0)
  const [sort, setSort] = useState('score')
  const [showFilters, setShowFilters] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [reps, setReps] = useState<any[]>([])
  const teamRef = useRef<string | null>(null)

  const rows = useMemo(() => {
    let r = (leadList || []).filter(l => l.id)
    if (q) r = r.filter(l => l.name.toLowerCase().includes(q.toLowerCase()))
    if (temp) r = r.filter(l => (temp === 'converted' ? l.stage === 'converted' : l.temperature === temp && l.stage !== 'converted'))
    if (scoreMin > 0) r = r.filter(l => l.score >= scoreMin)
    const by = { score: (a, b) => b.score - a.score, recent: (a, b) => a.agoMin - b.agoMin, name: (a, b) => a.name.localeCompare(b.name) }[sort]
    return [...r].sort(by)
  }, [leadList, q, temp, scoreMin, sort])

  const visibleIds = rows.map(l => l.id)
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => sel.has(id))
  const toggle = (id: string) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel(prev => allSelected ? new Set() : new Set(visibleIds))
  const clearSel = () => setSel(new Set())
  const activeFilters = (temp ? 1 : 0) + (scoreMin > 0 ? 1 : 0)

  // ── Bulk operations (permission-gated, RLS-safe) ──
  const bulk = async (patch: any) => {
    if (!editable || sel.size === 0 || busy) return
    setBusy(true)
    await supabase.from('partner_onboarding').update({ ...patch, updated_at: new Date().toISOString() }).in('id', [...sel])
    setBusy(false); clearSel(); reload()
  }
  const openAssign = async () => {
    if (!isManager) return
    if (!teamRef.current) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: u } = await supabase.from('users').select('team_id').eq('id', user?.id).maybeSingle()
      teamRef.current = u?.team_id ?? null
    }
    if (teamRef.current) {
      const { data } = await supabase.from('users').select('id, name, role').eq('team_id', teamRef.current).order('name')
      setReps(data ?? [])
    }
    setAssignOpen(true)
  }
  const assignTo = async (repId: string) => { await bulk({ user_id: repId }); setAssignOpen(false) }

  // ── Saved views ──
  const views = savedKV.views || []
  const saveCurrentView = () => {
    const name = (typeof window !== 'undefined' && window.prompt('Name this view')) || ''
    if (!name.trim()) return
    saveViews(p => ({ views: [...(p.views || []), { id: uid(), name: name.trim(), f: { q, temp, scoreMin, sort } }] }))
  }
  const applyView = (v: any) => { setQ(v.f.q || ''); setTemp(v.f.temp ?? null); setScoreMin(v.f.scoreMin || 0); setSort(v.f.sort || 'score') }
  const deleteView = (id: string) => saveViews(p => ({ views: (p.views || []).filter(v => v.id !== id) }))

  return (
    <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
      <div className="space-y-2">
        {/* Search + filter toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search leads by name…" className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-9 text-[13px] outline-none focus:border-navy/40" />
            {q && <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray"><CloseIcon size={14} /></button>}
          </div>
          <button onClick={() => setShowFilters(s => !s)} className={cn('flex shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-[700]', activeFilters || showFilters ? 'border-navy bg-navy/5 text-navy' : 'border-border text-gray')}>
            <FilterIcon size={13} /> Filter{activeFilters > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[9px] text-white">{activeFilters}</span>}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <Card className="!p-3">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-[800] uppercase tracking-wide text-gray">Temperature</span>
              {[{ k: null, l: 'All' }, ...TEMPS, { k: 'converted', l: 'Won' }].map(t => (
                <button key={t.l} onClick={() => setTemp(t.k)} className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-[700]', temp === t.k ? 'border-navy bg-navy text-white' : 'border-border text-gray')}>{t.l}</button>
              ))}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-[800] uppercase tracking-wide text-gray">Min score</span>
              {[0, 50, 75, 90].map(s => (
                <button key={s} onClick={() => setScoreMin(s)} className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-[700]', scoreMin === s ? 'border-navy bg-navy text-white' : 'border-border text-gray')}>{s === 0 ? 'Any' : `${s}+`}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-[800] uppercase tracking-wide text-gray">Sort</span>
              {SORTS.map(s => <button key={s.k} onClick={() => setSort(s.k)} className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-[700]', sort === s.k ? 'border-navy bg-navy text-white' : 'border-border text-gray')}>{s.l}</button>)}
              <div className="ml-auto"><button onClick={saveCurrentView} className="flex items-center gap-1 rounded-lg bg-teal/10 px-2.5 py-1 text-[11px] font-[700] text-teal"><StarIcon size={11} /> Save view</button></div>
            </div>
            {views.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
                <span className="text-[10px] font-[800] uppercase tracking-wide text-gray">Saved</span>
                {views.map(v => (
                  <span key={v.id} className="flex items-center gap-1 rounded-full border border-border bg-bdrbg py-0.5 pl-2.5 pr-1 text-[11px] font-[700] text-mid-text">
                    <button onClick={() => applyView(v)}>{v.name}</button>
                    <button onClick={() => deleteView(v.id)} aria-label="Delete view" className="text-gray hover:text-error"><CloseIcon size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Select-all + count */}
        {rows.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <button onClick={toggleAll} aria-label="Select all" style={{ minHeight: 18 }} className={cn('flex h-[18px] w-[18px] items-center justify-center rounded-md border-[1.5px]', allSelected ? 'border-navy bg-navy text-white' : 'border-gray/40 text-transparent hover:border-navy')}><CheckIcon size={11} /></button>
            <span className="text-[11.5px] text-gray">{sel.size > 0 ? `${sel.size} selected` : `${rows.length} lead${rows.length > 1 ? 's' : ''}`}</span>
          </div>
        )}

        {/* Rows */}
        {rows.length === 0 ? (
          <Card className="!py-8 text-center"><TargetIcon size={20} className="mx-auto mb-2 text-gray" /><p className="text-[13px] text-gray">{(leadList || []).length ? 'No leads match your filters.' : 'No partner leads yet — they appear here from Partners.'}</p></Card>
        ) : rows.slice(0, 60).map(lead => {
          const st = STAGE_META[lead.stage] || STAGE_META.cold
          const sug = leadSuggestion(lead)
          const checked = sel.has(lead.id)
          return (
            <Card key={lead.id} className={cn('!p-3.5', checked && 'ring-2 ring-navy/30')} style={{ borderLeft: `3px solid ${scoreColor(lead.score)}` }}>
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(lead.id)} aria-label={checked ? 'Deselect' : 'Select'} style={{ minHeight: 18 }} className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px]', checked ? 'border-navy bg-navy text-white' : 'border-gray/40 text-transparent hover:border-navy')}><CheckIcon size={11} /></button>
                <button onClick={() => onOpenLead(lead)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/8 text-[12px] font-[800] text-navy">{lead.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-[700] text-dark-text">{lead.name}</div>
                    <div className="text-[11px] text-gray">{fmtAgo(lead.agoMin)}{lead.weighted != null ? ` · $${Math.round(lead.weighted).toLocaleString()}/mo` : ''}</div>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full" style={{ width: `${lead.score}%`, background: scoreColor(lead.score) }} /></div>
                    <span className="w-6 text-[13px] font-[800] tabular-nums" style={{ color: scoreColor(lead.score) }}>{lead.score}</span>
                  </div>
                  <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[11px] font-[700]', st.c)}>{st.l}</span>
                </button>
                <NoteButton compact entityType="lead" entityId={lead.id} label={lead.name} context={`Partner lead · ${lead.stage} · score ${lead.score}`} />
                <button onClick={e => { e.stopPropagation(); askCoach(`Write a personalized follow-up strategy for this ConsumerDirect Co-Brand PLUS+ agency lead: ${lead.name}, score ${lead.score}, currently ${lead.stage}. Give the next 3 specific touchpoints with copy.`) }}
                  className="hidden shrink-0 items-center gap-1 rounded-lg bg-teal/10 px-2.5 py-1.5 text-[11px] font-[700] text-teal sm:flex"><IntegrationIcon size={11} /> Follow-up</button>
              </div>
              <div className="mt-2 flex items-center gap-1.5 pl-[30px]">
                <LightningIcon size={11} className={sug.urgent ? 'text-error' : 'text-gray'} />
                <span className={cn('text-[11px] italic', sug.urgent ? 'font-[600] text-error' : 'text-gray')}>AI suggests: {sug.text}</span>
              </div>
            </Card>
          )
        })}
        {rows.length > 60 && <p className="px-1 text-[11px] text-gray">Showing the top 60 — narrow with filters to see more.</p>}
      </div>

      {/* Right rail */}
      <div className="space-y-3">
        <Card className="!p-4">
          <div className="mb-2.5 text-[10px] font-[800] uppercase tracking-wide text-gray">Score routing</div>
          {SCORE_ROUTING.map(([r, a, c, stat]) => (
            <div key={r} className="border-b border-border py-2 last:border-0">
              <div className="flex items-center justify-between"><span className="text-[12px] tabular-nums text-mid-text">{r}</span><span className={cn('text-[11px] font-[700]', c)}>{a}</span></div>
              <div className="mt-0.5 text-[10px] text-gray">{stat}</div>
            </div>
          ))}
        </Card>
        <Card className="!p-4">
          <div className="mb-2.5 text-[10px] font-[800] uppercase tracking-wide text-gray">Quick generate</div>
          {GEN_PROMPTS.slice(0, 4).map(a => (
            <button key={a.l} onClick={() => askCoach(a.p)} className="mb-1.5 flex w-full items-center justify-between rounded-lg border border-border bg-bdrbg px-3 py-2 text-[12px] font-[600] text-mid-text hover:border-teal/40"><span>{a.l}</span><ArrowRightIcon size={12} className="text-gray" /></button>
          ))}
        </Card>
      </div>

      {/* Bulk action bar (sticky) */}
      {sel.size > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[380] mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-modal desktop:bottom-6 desktop:left-[240px] desktop:right-0 desktop:mx-8">
          <span className="ml-1 text-[12.5px] font-[800] text-dark-text">{sel.size} selected</span>
          {editable ? (
            <>
              <BulkMenu label="Set stage" items={PIPELINE} onPick={k => bulk({ stage: k })} disabled={busy} />
              <BulkMenu label="Set temp" items={TEMPS} onPick={k => bulk({ temperature: k })} disabled={busy} />
              {isManager && <button onClick={openAssign} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-[700] text-navy"><UserIcon size={13} /> Assign owner</button>}
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded-lg bg-bdrbg px-3 py-2 text-[12px] font-[700] text-gray"><LockIcon size={12} /> View only</span>
          )}
          <div className="flex-1" />
          <button onClick={clearSel} className="rounded-lg px-3 py-2 text-[12px] font-[700] text-gray hover:text-dark-text">Clear</button>
        </div>
      )}

      {/* Assign owner (manager only) */}
      {assignOpen && (
        <div className="fixed inset-0 z-[1055] flex items-center justify-center bg-dark-text/50 p-4" onClick={() => setAssignOpen(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-card p-4 shadow-modal" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-[800] text-dark-text">Assign {sel.size} lead{sel.size > 1 ? 's' : ''}</h3><button onClick={() => setAssignOpen(false)} aria-label="Close" className="text-gray"><CloseIcon size={16} /></button></div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {reps.length === 0 ? <p className="py-4 text-center text-[12px] text-gray">No team members found.</p> : reps.map(r => (
                <button key={r.id} onClick={() => assignTo(r.id)} className="flex w-full items-center gap-2 rounded-lg border border-border p-2.5 text-left hover:border-navy/40">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy/8 text-navy"><UserIcon size={14} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-[700] text-dark-text">{r.name}</span><span className="text-[11px] capitalize text-gray">{r.role}</span></span>
                  <ArrowRightIcon size={14} className="text-gray" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact bulk-action dropdown.
function BulkMenu({ label, items, onPick, disabled }: any) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} disabled={disabled} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-[700] text-navy disabled:opacity-50">{label} <ChevronDownIcon size={12} /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-[10]" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full z-[20] mb-1 min-w-[130px] rounded-xl border border-border bg-card p-1 shadow-modal">
            {items.map((it: any) => (
              <button key={it.k} onClick={() => { setOpen(false); onPick(it.k) }} className="flex w-full items-center rounded-lg px-3 py-1.5 text-left text-[12.5px] font-[600] text-dark-text hover:bg-bdrbg">{it.l}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
