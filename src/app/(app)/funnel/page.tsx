// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Funnel Lab — the qualify-and-activate layer. Score any business for
// SmartCredit partnership fit across six dimensions (AI-assisted), and watch
// signed partners move through the activation lifecycle
// (onboarding → activated → producing → at-risk → re-engaging).

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createUntypedClient } from '@/lib/supabase/untyped'
import { Card, Skeleton, toast, Button } from '@/components/ui'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowthSlimHeader } from '@/components/growth/GrowthChrome'
import { TargetIcon, LightningIcon, HandshakeIcon, ArrowRightIcon, InfoIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const DIMS = [
  ['audience_fit', 'Audience fit'], ['trust_level', 'Trust'], ['customer_volume', 'Volume'],
  ['monetization_fit', 'Monetization'], ['regulatory_sensitivity', 'Reg. risk'], ['activation_potential', 'Activation'],
]
const ACTIVATION = ['onboarding', 'activated', 'producing', 'at_risk', 'reengaging']
const ACT_TONE: Record<string, string> = {
  onboarding: 'bg-navy/8 text-navy-ink', activated: 'bg-teal/10 text-teal', producing: 'bg-success/10 text-success',
  at_risk: 'bg-error/10 text-error', reengaging: 'bg-gold/12 text-[#A06C00]',
}
const fitTone = (n: number) => n >= 75 ? 'text-success' : n >= 50 ? 'text-teal' : n >= 25 ? 'text-[#A06C00]' : 'text-gray'

export default function FunnelLabPage() {
  const supabase = createUntypedClient()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<any[]>([])
  const [scores, setScores] = useState<Record<string, any>>({})
  const [partners, setPartners] = useState<any[]>([])
  const [scoring, setScoring] = useState<string | null>(null)
  const [view, setView] = useState<'fit' | 'activation'>('fit')

  const load = async () => {
    const [{ data: acc }, { data: qs }, { data: pt }] = await Promise.all([
      supabase.from('accounts').select('*').order('smartcredit_fit_score', { ascending: false, nullsFirst: false }),
      supabase.from('qualification_scores').select('*').order('created_at', { ascending: false }),
      supabase.from('partner_onboarding').select('id, partner_name, activation_state, stage, updated_at').order('updated_at', { ascending: false }),
    ])
    // latest score per account
    const byAcct: Record<string, any> = {}
    for (const s of qs ?? []) if (s.account_id && !byAcct[s.account_id]) byAcct[s.account_id] = s
    setAccounts(acc ?? []); setScores(byAcct); setPartners(pt ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const scoreFit = async (accountId: string) => {
    if (scoring) return
    setScoring(accountId)
    try {
      const res = await fetch('/api/partner/fit-score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      toast.success(`Scored ${data.score.composite}/100`)
      await load()
    } catch (e: any) {
      toast.error(`Couldn't score. ${e.message || ''}`)
    } finally { setScoring(null) }
  }

  const setActivation = async (partnerId: string, state: string) => {
    await supabase.from('partner_onboarding').update({ activation_state: state, updated_at: new Date().toISOString() }).eq('id', partnerId)
    setPartners(p => p.map(x => x.id === partnerId ? { ...x, activation_state: state } : x))
    toast.success(`Marked ${state.replace('_', ' ')}`)
  }

  const grouped = useMemo(() => ACTIVATION.map(s => ({ state: s, items: partners.filter(p => (p.activation_state || 'onboarding') === s) })), [partners])

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthSlimHeader title="Funnel Lab" subtitle="Qualify businesses for SmartCredit fit, then activate the partners you sign" />
      <GrowthTabs />

      <div className="flex items-start gap-2 rounded-xl bg-navy/[0.04] p-3">
        <InfoIcon size={14} className="mt-0.5 shrink-0 text-navy-ink" />
        <p className="text-[11.5px] leading-relaxed text-mid-text">Fit scoring rates a <span className="font-[700]">business</span> as a partnership — never a person's credit outcome. Higher regulatory risk lowers the score.</p>
      </div>

      <div className="flex w-fit gap-0.5 rounded-lg border border-border bg-bdrbg p-1">
        {[['fit', 'SmartCredit Fit'], ['activation', 'Activation']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={cn('rounded-md px-3.5 py-1.5 text-[12.5px] font-[700]', view === k ? 'bg-navy text-white' : 'text-gray hover:text-navy-ink')}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : view === 'fit' ? (
        accounts.length === 0 ? (
          <Card className="!py-10 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bdrbg text-gray"><TargetIcon size={22} /></span>
            <h2 className="text-[15px] font-[800] text-dark-text">No businesses to score yet</h2>
            <p className="mx-auto mt-1 max-w-xs text-[13px] text-gray">Add businesses in the CRM Workspace, then score their partnership fit here.</p>
            <Link href="/crm" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-[13px] font-[800] text-white">Go to CRM <ArrowRightIcon size={14} /></Link>
          </Card>
        ) : (
          <div className="space-y-2">
            {accounts.map(a => {
              const sc = scores[a.id]
              const fit = a.smartcredit_fit_score
              return (
                <Card key={a.id} className="!p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-[800] text-dark-text">{a.name}</div>
                      <div className="truncate text-[11.5px] text-gray">{[a.vertical, a.segment].filter(Boolean).join(' · ') || 'No detail yet'}</div>
                    </div>
                    {fit != null && <div className="shrink-0 text-center"><div className={cn('text-[20px] font-[900] tabular-nums', fitTone(fit))}>{fit}</div><div className="text-[9px] uppercase tracking-wide text-gray">fit</div></div>}
                    <button onClick={() => scoreFit(a.id)} disabled={scoring === a.id} className="shrink-0 rounded-lg bg-navy px-3 py-2 text-[11.5px] font-[800] text-white disabled:opacity-60">{scoring === a.id ? 'Scoring…' : fit != null ? 'Re-score' : 'Score fit'}</button>
                  </div>
                  {sc && (
                    <div className="mt-2.5 border-t border-border pt-2.5">
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {DIMS.map(([k, l]) => (
                          <div key={k} className="text-center"><div className={cn('text-[14px] font-[900] tabular-nums', k === 'regulatory_sensitivity' ? (sc[k] > 60 ? 'text-error' : 'text-mid-text') : fitTone(sc[k] ?? 0))}>{sc[k] ?? '—'}</div><div className="text-[9px] uppercase tracking-wide text-gray">{l}</div></div>
                        ))}
                      </div>
                      {sc.rationale && <p className="mt-2 text-[11.5px] leading-relaxed text-mid-text">{sc.rationale}</p>}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )
      ) : (
        partners.length === 0 ? (
          <Card className="!py-10 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bdrbg text-gray"><HandshakeIcon size={22} /></span>
            <h2 className="text-[15px] font-[800] text-dark-text">No partners yet</h2>
            <p className="mx-auto mt-1 max-w-xs text-[13px] text-gray">Signed partners appear here to track through activation.</p>
            <Link href="/partners" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-[13px] font-[800] text-white">Go to Pipeline <ArrowRightIcon size={14} /></Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map(g => g.items.length > 0 && (
              <div key={g.state}>
                <div className="mb-1.5 flex items-center gap-2 px-0.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-[800] uppercase capitalize', ACT_TONE[g.state])}>{g.state.replace('_', ' ')}</span>
                  <span className="text-[11px] text-gray">{g.items.length}</span>
                </div>
                <div className="space-y-2">
                  {g.items.map(p => (
                    <Card key={p.id} className="flex items-center gap-3 !p-3.5">
                      <Link href={`/partners/${p.id}`} className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-[800] text-dark-text">{p.partner_name}</div><div className="text-[11px] text-gray">{(p.stage || '').replace('_', ' ')}</div></Link>
                      <select value={p.activation_state || 'onboarding'} onChange={e => setActivation(p.id, e.target.value)} className="shrink-0 rounded-lg border border-border bg-card px-2 py-1.5 text-[11.5px] font-[700] capitalize outline-none focus:border-navy/40">
                        {ACTIVATION.map(s => <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>)}
                      </select>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
