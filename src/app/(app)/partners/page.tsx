// @ts-nocheck
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Modal, EmptyState, SkeletonList, ProgressBar, Badge, toast } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { GrowthTabs } from '@/components/GrowthTabs'
import { HandshakeIcon, PlusIcon, ArrowRightIcon, ChecklistIcon, CheckIcon, SearchIcon, CloseIcon, CalendarIcon, ChevronDownIcon, MenuIcon, LightningIcon } from '@/components/icons'
import { CHECKLIST_TEMPLATE, PIPELINE_STAGES, freshChecklist, completion, stageMeta, stageIndex, nextTask } from '@/lib/partnerChecklist'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { fmtAgo } from '@/lib/modules/growth-os/leadgen'
import { cn } from '@/lib/utils'
import { Tour } from '@/components/tour'
import { PARTNERS_TOUR } from '@/lib/tours'

const SORTS = [
  { k: 'recent', l: 'Recent' }, { k: 'name', l: 'Name' }, { k: 'stage', l: 'Stage' },
  { k: 'progress', l: 'Progress' }, { k: 'followup', l: 'Follow-up due' },
]
const todayStr = () => new Date().toISOString().split('T')[0]
const fmtFollow = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
// Same score bands as Lead Gen's routing legend (SCORE_ROUTING), so a score
// means the same thing everywhere it appears.
const scoreTone = (v: number) => v >= 90 ? { text: 'text-success', bg: 'bg-success/10' }
  : v >= 75 ? { text: 'text-teal', bg: 'bg-teal/10' }
  : v >= 50 ? { text: 'text-[#A06C00]', bg: 'bg-gold/12' }
  : { text: 'text-gray', bg: 'bg-bdrbg' }

export default function PartnersPage() {
  const supabase = createClient()
  const router = useRouter()
  const { leadList } = useGrowthOS()   // same derived 0-100 score used on Lead Gen
  const [userId, setUserId] = useState<string>()
  const [teamId, setTeamId] = useState<string>()
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [form, setForm] = useState({ partner_name: '', company: '', temperature: 'cold', next_followup_date: '' })
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('recent')
  const [view, setView] = useState<'list' | 'board'>('list')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => setTeamId(data?.team_id))
      load(user.id)
    })
  }, [])

  const load = async (uid: string) => {
    const { data } = await supabase
      .from('partner_onboarding')
      .select('id, partner_name, company, stage, checklist, temperature, updated_at, next_followup_date')
      .eq('user_id', uid).order('updated_at', { ascending: false })
    setPartners(data ?? [])
    setLoading(false)
  }

  // Move a partner to a new stage from the board (optimistic + rollback).
  const setStage = async (p: any, stage: string) => {
    const prev = partners
    setPartners(list => list.map(x => x.id === p.id ? { ...x, stage } : x))
    const { error } = await supabase.from('partner_onboarding').update({ stage, updated_at: new Date().toISOString() }).eq('id', p.id)
    if (error) { setPartners(prev); toast.error('Could not move that partner.') }
  }

  const addPartner = async () => {
    if (!form.partner_name.trim() || !userId) return
    setSaving(true)
    const { data, error } = await supabase.from('partner_onboarding').insert({
      user_id: userId, team_id: teamId ?? null,
      partner_name: form.partner_name.trim(), company: form.company.trim() || null,
      stage: 'new_lead', checklist: freshChecklist(), temperature: form.temperature,
      next_followup_date: form.next_followup_date || null,
    }).select('id, partner_name, company, stage, checklist, temperature, updated_at, next_followup_date').single()
    setSaving(false)
    if (!error && data) {
      setPartners(p => [data, ...p])
      setForm({ partner_name: '', company: '', temperature: 'cold', next_followup_date: '' })
      setShowAdd(false)
      toast.success('Partner added — start the checklist')
    } else {
      toast.error('Could not add partner')
    }
  }

  const active = partners.length
  const scoreById = useMemo(() => new Map((leadList || []).map(l => [l.id, l.score])), [leadList])

  const stageRank = (k: string) => { const i = PIPELINE_STAGES.findIndex(s => s.key === k); return i < 0 ? 99 : i }
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    let r = partners.filter(p => !t || p.partner_name?.toLowerCase().includes(t) || p.company?.toLowerCase().includes(t))
    const by = {
      recent: (a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''),
      name: (a, b) => (a.partner_name || '').localeCompare(b.partner_name || ''),
      stage: (a, b) => stageRank(b.stage) - stageRank(a.stage),
      progress: (a, b) => completion(b.checklist).pct - completion(a.checklist).pct,
      followup: (a, b) => (a.next_followup_date || '9999').localeCompare(b.next_followup_date || '9999'),
    }[sort]
    return [...r].sort(by)
  }, [partners, q, sort])

  return (
    <div className="space-y-4 pb-4">
      <GrowthTabs />
      <PageHeader
        title="Partner Pipeline"
        subtitle={loading ? undefined : active ? `${active} partner${active === 1 ? '' : 's'} you're actively working` : "Partners you're actively working"}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowTemplate(true)} icon={<ChecklistIcon size={16} />}>Template</Button>
            <span data-tour="partners-add"><Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={16} />}>Add</Button></span>
          </div>
        }
      />

      {/* Controls */}
      {!loading && partners.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search partners…"
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-9 text-[13px] outline-none focus:border-navy/40" />
            {q && <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray"><CloseIcon size={14} /></button>}
          </div>
          <div className="relative">
            <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort partners"
              className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-[12.5px] font-[700] text-mid-text outline-none focus:border-navy/40">
              {SORTS.map(o => <option key={o.k} value={o.k}>Sort: {o.l}</option>)}
            </select>
            <ChevronDownIcon size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray" />
          </div>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(['list', 'board'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={cn('px-3 py-2 text-[12px] font-[800] capitalize', view === v ? 'bg-navy text-white' : 'bg-card text-gray hover:text-navy-ink')}>{v}</button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList count={3} />
      ) : partners.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<HandshakeIcon size={28} />}
            title="No partners yet"
            description="Add a partner and you'll get the full onboarding checklist to work them from new lead to a live PartnerHub link."
            action={{ label: 'Add your first partner', onClick: () => setShowAdd(true) }}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="!py-8 text-center"><SearchIcon size={20} className="mx-auto mb-2 text-gray" /><p className="text-[13px] text-gray">No partners match “{q}”.</p></Card>
      ) : view === 'board' ? (
        <PartnerBoard partners={filtered} onMove={setStage} onOpen={id => router.push(`/partners/${id}`)} />
      ) : (
        <div className="space-y-3" data-tour="partners-list">
          {filtered.map(p => {
            const c = completion(p.checklist)
            const s = stageMeta(p.stage)
            const needsAction = p.stage === 'proposal_sent' || p.stage === 'contract_signed'
            const overdue = p.next_followup_date && p.next_followup_date <= todayStr()
            const score = scoreById.get(p.id)
            const agoMin = Math.max(0, Math.round((Date.now() - new Date(p.updated_at).getTime()) / 60000))
            const idx = stageIndex(p.stage)
            const next = nextTask(p.checklist)
            return (
              <Link key={p.id} href={`/partners/${p.id}`} className="block">
                <Card hover className={cn(needsAction && 'border-gold/50')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {needsAction && <span className="h-2 w-2 shrink-0 animate-attention rounded-full bg-gold" title="Awaiting your next step" />}
                        <div className="truncate text-[15px] font-[700] text-dark-text">{p.partner_name}</div>
                      </div>
                      {p.company && <div className="truncate text-[12px] text-gray">{p.company}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {score != null && (
                        <span className={cn('rounded-full px-2 py-1 text-[11px] font-[800] tabular-nums', scoreTone(score).bg, scoreTone(score).text)} title={`Lead score ${score}/100`}>{score}</span>
                      )}
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-[700]" style={{ backgroundColor: `${s.color}1A`, color: s.color }}>
                        {s.label}
                      </span>
                    </div>
                  </div>

                  {/* Stage progress — where this partner sits in New Lead -> Interested -> Proposal Sent -> Contract Signed -> Won */}
                  <div className="mt-3 flex items-center gap-1">
                    {PIPELINE_STAGES.map((st, i) => (
                      <span key={st.key} title={st.label} className="h-1.5 flex-1 rounded-full bg-border"
                        style={i <= idx ? { backgroundColor: st.color } : undefined} />
                    ))}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray">
                    <span>{fmtAgo(agoMin)}</span>
                    {p.next_followup_date && (
                      <span className={cn('flex items-center gap-1 font-[700]', overdue ? 'text-error' : 'text-gray')}>
                        <CalendarIcon size={12} /> {fmtFollow(p.next_followup_date)}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-[700] text-mid-text tabular-nums">
                      {c.pct === 100 ? <CheckIcon size={13} className="text-success" /> : null}Onboarding: {c.done}/{c.total} steps done
                    </span>
                  </div>

                  {/* AI suggestion — always the real next incomplete checklist step, never a placeholder */}
                  {next && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-teal/[0.06] px-2.5 py-1.5 text-[11.5px] text-teal">
                      <LightningIcon size={11} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate"><span className="font-[700]">AI suggests:</span> {next.label} · ~{next.estMin ?? 10}m</span>
                    </div>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Add partner */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add a partner" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label mb-1 block">Partner / contact name</label>
            <input value={form.partner_name} onChange={e => setForm(f => ({ ...f, partner_name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addPartner()} autoFocus placeholder="e.g. Jordan at Apex Credit"
              className="w-full rounded-md border border-border px-4 py-3 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-navy" />
          </div>
          <div>
            <label className="label mb-1 block">Company (legal name) <span className="font-normal text-gray">optional</span></label>
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              placeholder="Apex Credit Solutions LLC"
              className="w-full rounded-md border border-border px-4 py-3 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-navy" />
          </div>
          <div>
            <label className="label mb-1 block">Lead temperature</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ k: 'warm', l: 'Warm', d: 'Referral / inbound / engaged' }, { k: 'cold', l: 'Cold', d: 'Prospected / outbound' }].map(t => (
                <button key={t.k} type="button" onClick={() => setForm(f => ({ ...f, temperature: t.k }))}
                  className={cn('rounded-md border px-3 py-2 text-left transition-all',
                    form.temperature === t.k ? 'border-navy bg-navy/5' : 'border-border hover:border-navy/40')}>
                  <div className="text-[13px] font-[700] text-dark-text">{t.l}</div>
                  <div className="text-[11px] text-gray">{t.d}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label mb-1 block">Next follow-up <span className="font-normal text-gray">optional</span></label>
            <input type="date" value={form.next_followup_date} onChange={e => setForm(f => ({ ...f, next_followup_date: e.target.value }))}
              className="w-full rounded-md border border-border px-4 py-3 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-navy" />
          </div>
          <Button onClick={addPartner} loading={saving} disabled={!form.partner_name.trim()} fullWidth>Add partner</Button>
        </div>
      </Modal>

      {/* Template reference */}
      <Modal isOpen={showTemplate} onClose={() => setShowTemplate(false)} title="[Template] New Partner Checklist" size="md">
        <p className="mb-4 text-[13px] text-gray">Every partner you add starts with this checklist. Each task maps to the pipeline stage where you'll usually complete it.</p>
        <div className="space-y-2">
          {CHECKLIST_TEMPLATE.map((t, i) => {
            const s = stageMeta(t.stage)
            return (
              <div key={t.key} className="flex items-start gap-3 rounded-md border border-border bg-bdrbg p-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-[800] text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-[700] text-dark-text">{t.label}</div>
                  <div className="text-[12px] text-gray">{t.desc}</div>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[700]" style={{ backgroundColor: `${s.color}1A`, color: s.color }}>{s.label}</span>
              </div>
            )
          })}
        </div>
      </Modal>

      <Tour tourKey="partners" steps={PARTNERS_TOUR} />
    </div>
  )
}

// Pipeline board — a column per stage. Click a card to open it; use its ▾ menu
// to move it to another stage (no drag lib needed, so nothing to misfire).
function PartnerBoard({ partners, onMove, onOpen }: any) {
  const [menu, setMenu] = useState<string | null>(null)
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {PIPELINE_STAGES.map(stage => {
        const cards = partners.filter((p: any) => p.stage === stage.key)
        return (
          <div key={stage.key} className="w-[240px] shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-[12px] font-[800] text-dark-text">
                <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />{stage.label}
              </span>
              <span className="text-[11px] font-[700] text-gray tabular-nums">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.length === 0 && <div className="rounded-xl border border-dashed border-border py-6 text-center text-[11px] text-gray">Empty</div>}
              {cards.map((p: any) => {
                const c = completion(p.checklist)
                const overdue = p.next_followup_date && p.next_followup_date <= todayStr()
                return (
                  <Card key={p.id} className="!p-3">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => onOpen(p.id)} className="min-w-0 flex-1 text-left">
                        <div className="truncate text-[13px] font-[700] text-dark-text">{p.partner_name}</div>
                        {p.company && <div className="truncate text-[11px] text-gray">{p.company}</div>}
                      </button>
                      <div className="relative shrink-0">
                        <button onClick={() => setMenu(menu === p.id ? null : p.id)} aria-label="Move stage" className="rounded-md p-1 text-gray hover:bg-bdrbg hover:text-navy-ink"><MenuIcon size={13} /></button>
                        {menu === p.id && (
                          <>
                            <div className="fixed inset-0 z-[10]" onClick={() => setMenu(null)} />
                            <div className="absolute right-0 z-[20] mt-1 w-40 rounded-xl border border-border bg-card p-1 shadow-modal">
                              <div className="px-2 py-1 text-[9px] font-[800] uppercase tracking-wide text-gray">Move to</div>
                              {PIPELINE_STAGES.filter(s => s.key !== p.stage).map(s => (
                                <button key={s.key} onClick={() => { setMenu(null); onMove(p, s.key) }} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] font-[600] text-dark-text hover:bg-bdrbg">
                                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={c.pct} max={100} color={c.pct === 100 ? '#16A34A' : 'rgb(var(--teal))'} className="h-1 flex-1" />
                      <span className="text-[10px] font-[700] text-mid-text tabular-nums">{c.done}/{c.total}</span>
                    </div>
                    {p.next_followup_date && (
                      <div className={cn('mt-1.5 flex items-center gap-1 text-[10.5px] font-[700]', overdue ? 'text-error' : 'text-gray')}>
                        <CalendarIcon size={11} /> {fmtFollow(p.next_followup_date)}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
