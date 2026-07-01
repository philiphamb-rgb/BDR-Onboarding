// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, EmptyState, SkeletonCard, ConfirmDialog, toast } from '@/components/ui'
import { BackIcon, CheckIcon, HandshakeIcon, TrashIcon, ExternalLinkIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { PIPELINE_STAGES, CHECKLIST_TEMPLATE, mergeChecklist, completion, stageMeta, freshChecklist } from '@/lib/partnerChecklist'
import { systemLink } from '@/lib/links'
import { Tour } from '@/components/tour'
import { PARTNER_DETAIL_TOUR } from '@/lib/tours'

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const router = useRouter()
  const [partner, setPartner] = useState(null)
  const [checklist, setChecklist] = useState([]) // stored {key,done,note}
  const [stage, setStage] = useState('new_lead')
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [openNote, setOpenNote] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase.from('partner_onboarding').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setPartner(data)
          setChecklist((data.checklist ?? []).length ? data.checklist : freshChecklist())
          setStage(data.stage ?? 'new_lead')
        }
        setLoading(false)
      })
    })
  }, [id])

  const persist = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from('partner_onboarding').update(patch).eq('id', id)
    if (error) toast.error('Could not save that change — check your connection.')
  }

  // Rebuild the full checklist from a base array, applying changes to one key.
  const applyChange = (base, key: string, changes: Partial<{ done: boolean; note: string }>) =>
    CHECKLIST_TEMPLATE.map(t => {
      const cur = base.find(c => c.key === t.key) ?? { key: t.key, done: false, note: '' }
      return t.key === key ? { ...cur, ...changes } : cur
    })

  // Functional updater so concurrent edits (note blur + a different toggle)
  // build on the latest state and can't clobber each other.
  const setItem = (key: string, changes: Partial<{ done: boolean; note: string }>) => {
    setChecklist(prev => {
      const next = applyChange(prev, key, changes)
      persist({ checklist: next })
      return next
    })
  }

  const toggle = (key: string) => {
    setChecklist(prev => {
      const cur = prev.find(c => c.key === key)
      const next = applyChange(prev, key, { done: !cur?.done })
      persist({ checklist: next })
      if (completion(prev).pct !== 100 && completion(next).pct === 100) awardOnboardingXp()
      return next
    })
  }

  // Award XP the first time a partner's checklist hits 100% (deduped per partner
  // server-side, so re-checking never double-awards).
  const awardOnboardingXp = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'partner_onboarded', reference_id: id }),
      })
      if (res.ok) {
        const d = await res.json()
        // Only celebrate the first time it's actually awarded — re-checking a
        // completed checklist is deduped server-side and must stay silent.
        if (d.awarded) toast.xp(d.xp_earned ?? 0, 'Partner fully onboarded!')
      }
    } catch { /* non-fatal — XP is deduped server-side */ }
  }

  const changeStage = (s: string) => { setStage(s); persist({ stage: s }) }
  const changeTemp = (t: string) => { setPartner((p: any) => ({ ...p, temperature: t })); persist({ temperature: t }) }

  const remove = async () => {
    const { error } = await supabase.from('partner_onboarding').delete().eq('id', id)
    if (error) { toast.error('Could not remove this partner. Try again.'); return }
    toast.success('Partner removed')
    router.push('/partners')
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>
  if (!partner) return (
    <EmptyState icon={<HandshakeIcon size={28} />} title="Partner not found"
      description="This partner may have been removed."
      action={{ label: 'Back to partners', onClick: () => router.push('/partners') }} />
  )

  const merged = mergeChecklist(checklist)
  const c = completion(checklist)

  return (
    <div className="space-y-4 pb-4">
      <button onClick={() => router.push('/partners')} className="flex items-center gap-2 text-sm text-gray hover:text-dark-text">
        <BackIcon size={16} /> Partners
      </button>

      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-h2 text-dark-text truncate">{partner.partner_name}</h1>
            {partner.company && <p className="text-[13px] text-gray truncate">{partner.company}</p>}
            <div className="mt-1.5 flex gap-1.5">
              {['warm', 'cold'].map(t => (
                <button key={t} onClick={() => changeTemp(t)}
                  className={cn('rounded-full border px-2 py-0.5 text-[11px] font-[700] transition-all',
                    (partner.temperature ?? 'cold') === t
                      ? (t === 'warm' ? 'border-orange-300 bg-orange-50 text-orange-600' : 'border-blue-200 bg-blue-50 text-blue-600')
                      : 'border-border text-gray hover:border-navy/40')}>
                  {t === 'warm' ? '🔥 Warm' : '❄️ Cold'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setConfirmDelete(true)} aria-label="Remove partner" className="p-1.5 text-gray hover:text-error transition-colors">
            <TrashIcon size={16} />
          </button>
        </div>

        {/* Progress */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.pct}%`, backgroundColor: c.pct === 100 ? '#16A34A' : 'rgb(var(--teal))' }} />
          </div>
          <span className="text-[12px] font-[700] text-mid-text tabular-nums">{c.done}/{c.total} done</span>
        </div>
      </Card>

      {/* Pipeline stage selector */}
      <Card data-tour="pd-stage">
        <div className="label mb-2">Pipeline stage</div>
        <div className="flex flex-wrap gap-2">
          {PIPELINE_STAGES.map(s => {
            const activeStage = stage === s.key
            return (
              <button key={s.key} onClick={() => changeStage(s.key)}
                className={cn('rounded-full px-3 py-1.5 text-[12px] font-[700] transition-all border')}
                style={activeStage
                  ? { backgroundColor: s.color, color: '#fff', borderColor: s.color }
                  : { backgroundColor: `${s.color}10`, color: s.color, borderColor: 'transparent' }}>
                {s.label}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Checklist */}
      <div className="space-y-2" data-tour="pd-checklist">
        {merged.map((item, i) => {
          const s = stageMeta(item.stage)
          const stored = checklist.find(c2 => c2.key === item.key)
          return (
            <Card key={item.key} variant={item.done ? 'completed' : 'default'} className="!p-3">
              <div className="flex items-start gap-3">
                <button onClick={() => toggle(item.key)} aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}
                  className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    item.done ? 'border-success bg-success text-white' : 'border-border bg-card text-transparent hover:border-teal')}>
                  <CheckIcon size={14} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-[14px] font-[700]', item.done ? 'text-gray line-through' : 'text-dark-text')}>{item.label}</span>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[700]" style={{ backgroundColor: `${s.color}1A`, color: s.color }}>{s.label}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-gray">{item.desc}</p>
                  {(() => {
                    const sys = systemLink(item.link)
                    return sys ? (
                      <a href={sys.url} target="_blank" rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-navy/5 px-2.5 py-1 text-[11px] font-[700] text-navy hover:bg-navy/10 transition-colors">
                        Open {sys.label} <ExternalLinkIcon size={12} />
                      </a>
                    ) : null
                  })()}
                  {openNote === item.key ? (
                    <textarea
                      autoFocus defaultValue={item.note} rows={2}
                      placeholder="Add a note (what you confirmed, dates, blockers)…"
                      onBlur={e => { setItem(item.key, { note: e.target.value }); setOpenNote(null) }}
                      className="mt-2 w-full resize-none rounded-md border border-border px-3 py-2 text-[12px] text-dark-text focus:outline-none focus:ring-2 focus:ring-navy" />
                  ) : item.note ? (
                    <button onClick={() => setOpenNote(item.key)} className="mt-1.5 block w-full rounded-md bg-bdrbg px-3 py-1.5 text-left text-[12px] text-mid-text">{item.note}</button>
                  ) : (
                    <button onClick={() => setOpenNote(item.key)} className="mt-1 text-[11px] font-[700] text-teal hover:text-teal-dark">+ Add note</button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <ConfirmDialog
        open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={remove}
        title="Remove this partner?" description="This deletes the partner and their checklist. This cannot be undone."
        confirmLabel="Remove" variant="destructive" />

      <Tour tourKey="partner-detail" steps={PARTNER_DETAIL_TOUR} />
    </div>
  )
}
