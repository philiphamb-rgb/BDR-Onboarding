// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Memory Lab — the operator's governance seat. A PR-style review queue for
// what the AI company is allowed to "believe": approve / edit / reject / defer
// candidate learnings. Approving promotes to trusted semantic memory with a
// risk-weighted starting trust score (high-risk starts lower). Every action is
// audited. High-risk candidates (SmartCredit/compliance) are flagged to review
// closely, per decision B4.

import { useEffect, useMemo, useState } from 'react'
import { createUntypedClient } from '@/lib/supabase/untyped'
import { Card, Skeleton, toast, Button, Modal } from '@/components/ui'
import { BrainIcon, CheckIcon, CloseIcon, EditIcon, ClockIcon, ShieldIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const RISK_TONE: Record<string, string> = { low: 'bg-bdrbg text-gray', medium: 'bg-gold/12 text-[#A06C00]', high: 'bg-error/10 text-error' }
const TRUST_START: Record<string, number> = { low: 62, medium: 52, high: 42 }
const LIFE_TONE: Record<string, string> = { active: 'text-success', aging: 'text-[#A06C00]', stale: 'text-gray', deprecated: 'text-error', archived: 'text-gray' }

export default function MemoryLabPage() {
  const supabase = createUntypedClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [memories, setMemories] = useState<any[]>([])
  const [tab, setTab] = useState<'queue' | 'trusted'>('queue')
  const [distilling, setDistilling] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: cand }, { data: mem }] = await Promise.all([
      supabase.from('memory_candidates').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('semantic_memories').select('*').order('trust_score', { ascending: false }),
    ])
    setUserId(user?.id ?? null); setCandidates(cand ?? []); setMemories(mem ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const audit = async (entity_type: string, entity_id: string, action: string, detail: any = {}) => {
    if (!userId) return
    await supabase.from('memory_audit_log').insert({ user_id: userId, entity_type, entity_id, action, detail })
  }

  const review = async (cand: any, action: string, note = '', overrides: any = {}) => {
    if (!userId) return
    await supabase.from('memory_reviews').insert({ user_id: userId, candidate_id: cand.id, action, note })
    if (action === 'approve') {
      const memory = {
        user_id: userId, team_id: cand.team_id,
        title: overrides.title ?? cand.title, content: overrides.insight ?? cand.insight,
        category: cand.category, risk_tier: cand.risk_tier,
        trust_score: TRUST_START[cand.risk_tier] ?? 50, lifecycle_state: 'active',
        source_candidate_id: cand.id,
      }
      const { error } = await supabase.from('semantic_memories').insert(memory)
      if (error) { toast.error(`Couldn't promote. ${error.message}`); return }
    }
    await supabase.from('memory_candidates').update({ status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'deferred', reviewed_at: new Date().toISOString(), reviewed_by: userId }).eq('id', cand.id)
    await audit('candidate', cand.id, action, { title: cand.title })
    toast.success(action === 'approve' ? 'Promoted to trusted memory' : action === 'reject' ? 'Rejected' : 'Deferred')
    setEditing(null); load()
  }

  const distill = async () => {
    if (distilling) return
    setDistilling(true)
    try {
      const res = await fetch('/api/memory/distill', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      if ((data.candidates || []).length === 0) toast.info(data.note || 'No new learnings found yet')
      else toast.success(`${data.candidates.length} learnings proposed`)
      load()
    } catch (e: any) { toast.error(`Couldn't distill. ${e.message || ''}`) } finally { setDistilling(false) }
  }

  const setLifecycle = async (m: any, state: string) => {
    await supabase.from('semantic_memories').update({ lifecycle_state: state, updated_at: new Date().toISOString() }).eq('id', m.id)
    await audit('memory', m.id, `lifecycle:${state}`)
    setMemories(ms => ms.map(x => x.id === m.id ? { ...x, lifecycle_state: state } : x))
  }

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-dark-text">Memory Lab</h1>
          <p className="mt-0.5 text-[13px] text-gray">Decide what your AI company is allowed to believe.</p>
        </div>
        <button onClick={distill} disabled={distilling} className="shrink-0 rounded-lg bg-navy px-3.5 py-2 text-[12.5px] font-[800] text-white disabled:opacity-60">{distilling ? 'Finding…' : 'Find learnings'}</button>
      </div>

      <div className="flex w-fit gap-0.5 rounded-lg border border-border bg-bdrbg p-1">
        {[['queue', `Review queue (${candidates.length})`], ['trusted', `Trusted memory (${memories.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('rounded-md px-3.5 py-1.5 text-[12.5px] font-[700]', tab === k ? 'bg-navy text-white' : 'text-gray hover:text-navy-ink')}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : tab === 'queue' ? (
        candidates.length === 0 ? (
          <Card className="!py-10 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bdrbg text-gray"><BrainIcon size={22} /></span>
            <h2 className="text-[15px] font-[800] text-dark-text">Nothing to review</h2>
            <p className="mx-auto mt-1 max-w-xs text-[13px] text-gray">As your team works, learnings get proposed here. Tap "Find learnings" to distill recent activity now.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {candidates.map(c => (
              <Card key={c.id} className="!p-3.5">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-[800] text-dark-text">{c.title}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-[800] uppercase', RISK_TONE[c.risk_tier])}>{c.risk_tier === 'high' && <ShieldIcon size={9} className="mr-0.5 inline" />}{c.risk_tier} risk</span>
                  {c.category && <span className="rounded-full bg-navy/8 px-2 py-0.5 text-[10px] font-[700] capitalize text-navy-ink">{c.category}</span>}
                  {c.confidence != null && <span className="text-[10px] text-gray">conf {c.confidence}</span>}
                </div>
                <p className="text-[12.5px] leading-relaxed text-mid-text">{c.insight}</p>
                {c.reason && <p className="mt-1 text-[11px] italic text-gray">Why: {c.reason}</p>}
                {c.risk_tier === 'high' && <p className="mt-1.5 rounded-lg bg-error/[0.06] px-2.5 py-1.5 text-[11px] font-[600] text-error">High-risk — review the exact wording before approving.</p>}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button onClick={() => review(c, 'approve')} className="flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-[12px] font-[800] text-success"><CheckIcon size={13} /> Approve</button>
                  <button onClick={() => setEditing(c)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[12px] font-[700] text-navy-ink"><EditIcon size={13} /> Edit</button>
                  <button onClick={() => review(c, 'defer')} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[12px] font-[700] text-gray"><ClockIcon size={13} /> Later</button>
                  <button onClick={() => review(c, 'reject')} className="flex items-center gap-1 rounded-lg border border-error/30 px-3 py-1.5 text-[12px] font-[700] text-error"><CloseIcon size={13} /> Reject</button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        memories.length === 0 ? (
          <Card className="!py-10 text-center"><BrainIcon size={20} className="mx-auto mb-2 text-gray" /><p className="text-[13px] text-gray">No trusted memories yet — approve learnings from the review queue.</p></Card>
        ) : (
          <div className="space-y-2">
            {memories.map(m => (
              <Card key={m.id} className="!p-3.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-[800] text-dark-text">{m.title}</span>
                      {m.category && <span className="rounded-full bg-navy/8 px-2 py-0.5 text-[10px] font-[700] capitalize text-navy-ink">{m.category}</span>}
                      <span className={cn('text-[10px] font-[800] uppercase', LIFE_TONE[m.lifecycle_state])}>{m.lifecycle_state}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-mid-text">{m.content}</p>
                  </div>
                  <div className="shrink-0 text-center">
                    <div className={cn('text-[18px] font-[900] tabular-nums', m.trust_score >= 60 ? 'text-success' : m.trust_score >= 45 ? 'text-teal' : 'text-[#A06C00]')}>{m.trust_score}</div>
                    <div className="text-[9px] uppercase tracking-wide text-gray">trust</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['active', 'aging', 'stale', 'deprecated', 'archived'].map(s => (
                    <button key={s} onClick={() => setLifecycle(m, s)} className={cn('rounded-full border px-2 py-0.5 text-[10px] font-[700] capitalize', m.lifecycle_state === s ? 'border-navy bg-navy text-white' : 'border-border text-gray')}>{s}</button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {editing && <EditModal cand={editing} onClose={() => setEditing(null)} onApprove={(o) => review(editing, 'approve', 'edited', o)} />}
    </div>
  )
}

function EditModal({ cand, onClose, onApprove }: any) {
  const [title, setTitle] = useState(cand.title)
  const [insight, setInsight] = useState(cand.insight)
  return (
    <Modal isOpen title="Edit & approve" onClose={onClose}>
      <div className="space-y-3">
        <label className="block"><span className="mb-1 block text-[11px] font-[700] text-gray">Title</span><input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" /></label>
        <label className="block"><span className="mb-1 block text-[11px] font-[700] text-gray">Learning</span><textarea value={insight} onChange={e => setInsight(e.target.value)} rows={4} className="w-full rounded-lg border border-border bg-card p-3 text-[13px] leading-relaxed outline-none focus:border-navy/40" /></label>
        <div className="flex items-center justify-end gap-2"><button onClick={onClose} className="rounded-lg px-3 py-2 text-[12.5px] font-[700] text-gray">Cancel</button><Button onClick={() => onApprove({ title, insight })}>Approve edited</Button></div>
      </div>
    </Modal>
  )
}
