// @ts-nocheck
'use client'

// The CRM record drawer — a HubSpot-style detail view for a partner/company lead,
// slid in from the right. Deal properties (amount / close date / probability,
// editable inline), associated Contacts (people), and a typed activity timeline
// (note / call / email / meeting / task) with AI-suggested entries. Every write
// is RLS-safe; the AI suggestion streams from the ONE existing coach.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useCrmRecord } from '@/lib/hooks/useCrmRecord'
import {
  CloseIcon, CoinIcon, CalendarIcon, TargetIcon, UserIcon, PlusIcon, TrashIcon,
  StarIcon, StarFilledIcon, PhoneIcon, MailIcon, DocumentIcon, LightningIcon,
  ChecklistIcon, ArrowRightIcon, ExternalLinkIcon, SearchIcon,
} from '@/components/icons'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

const KINDS = [
  { k: 'note', label: 'Note', icon: DocumentIcon },
  { k: 'call', label: 'Call', icon: PhoneIcon },
  { k: 'email', label: 'Email', icon: MailIcon },
  { k: 'meeting', label: 'Meeting', icon: CalendarIcon },
  { k: 'task', label: 'Task', icon: ChecklistIcon },
]
const kindMeta = (k: string) => KINDS.find(x => x.k === k) || KINDS[0]
const fmtMoney = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

export function LeadDrawer({ partnerId, name, score, onClose }: { partnerId: string; name: string; score?: number; onClose: () => void }) {
  const { loading, deal, contacts, activities, updateDeal, addContact, removeContact, setPrimary, addActivity, removeActivity } = useCrmRecord(partnerId)
  const [kind, setKind] = useState('note')
  const [body, setBody] = useState('')
  const [aiDraft, setAiDraft] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [c, setC] = useState({ name: '', title: '', email: '', phone: '' })
  const [researching, setResearching] = useState(false)
  const [research, setResearch] = useState<{ text: string; model: string } | null>(null)
  const mounted = useRef(true)
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => { mounted.current = false; abortRef.current?.abort() }, [])

  const amount = deal?.deal_amount != null ? Number(deal.deal_amount) : ''
  const prob = deal?.deal_probability != null ? Number(deal.deal_probability) : ''
  const weighted = amount !== '' && prob !== '' ? (Number(amount) * Number(prob)) / 100 : null

  const suggest = async () => {
    if (suggesting) return
    setSuggesting(true); setBody(''); setAiDraft(true)
    const ctrl = new AbortController(); abortRef.current = ctrl
    try {
      const res = await fetch('/api/coach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ message: `Draft ONE short ${kind} log entry (1–2 sentences, first person, no preamble, no markdown) for this ConsumerDirect Co-Brand PLUS+ partner lead "${name}" (stage ${deal?.stage || 'unknown'}). Make it a concrete, useful record of a ${kind} I'd want to remember.`, pageContext: 'CRM activity' }),
      })
      if (res.ok && res.body) { const rd = res.body.getReader(); const dc = new TextDecoder(); let acc = ''; while (true) { const { done, value } = await rd.read(); if (done) break; acc += dc.decode(value, { stream: true }); if (mounted.current) setBody(acc.trim()) } }
    } catch {} finally { if (mounted.current) setSuggesting(false) }
  }

  const runResearch = async () => {
    if (researching) return
    setResearching(true)
    try {
      const res = await fetch('/api/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `Brief research on the credit-repair / financial-services agency "${name}": recent context, approximate size and market position, and one concrete partnership angle for a ConsumerDirect Co-Brand PLUS+ BDR.` }),
      })
      const j = await res.json().catch(() => ({}))
      if (mounted.current) setResearch(res.ok && j.text ? { text: j.text, model: j.model || 'AI' } : { text: 'Research is unavailable right now — try again shortly.', model: '' })
    } catch {
      if (mounted.current) setResearch({ text: 'Research is unavailable right now — try again shortly.', model: '' })
    } finally { if (mounted.current) setResearching(false) }
  }

  const logActivity = () => { const t = body.trim(); if (!t) return; addActivity(kind, t, aiDraft); setBody(''); setAiDraft(false) }
  const saveContact = () => { if (!c.name.trim()) return; addContact(c); setC({ name: '', title: '', email: '', phone: '' }); setShowContact(false) }

  return (
    <div className="fixed inset-0 z-[1055] flex justify-end" role="dialog" aria-modal="true" aria-label={`${name} record`}>
      <div className="absolute inset-0 bg-dark-text/40 backdrop-blur-[1px] animate-fade-in" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-card shadow-modal animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/8 text-[13px] font-[800] text-navy">{name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[16px] font-[900] text-dark-text">{name}</h2>
            <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-gray">
              <span className="capitalize">{(deal?.stage || 'lead').replace(/_/g, ' ')}</span>
              {score != null && <><span>·</span><span className="font-[700] text-teal">score {score}</span></>}
            </div>
          </div>
          <Link href={`/partners/${partnerId}`} className="shrink-0 rounded-lg border border-border p-2 text-gray hover:text-navy" title="Open in Partners"><ExternalLinkIcon size={15} /></Link>
          <button onClick={onClose} aria-label="Close" className="shrink-0 rounded-lg p-2 text-gray hover:text-dark-text"><CloseIcon size={18} /></button>
        </div>

        {loading ? (
          <div className="flex-1 p-4 text-center text-[13px] text-gray">Loading record…</div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {/* Deal properties */}
            <section>
              <div className="mb-2 text-[10px] font-[800] uppercase tracking-wide text-gray">Deal</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-xl border border-border bg-bdrbg p-2.5">
                  <span className="flex items-center gap-1 text-[10px] font-[700] text-gray"><CoinIcon size={11} /> Amount / mo</span>
                  <input type="number" min={0} value={amount} onChange={e => updateDeal({ deal_amount: e.target.value === '' ? null : Number(e.target.value) })} placeholder="—" className="mt-1 w-full bg-transparent text-[15px] font-[800] text-dark-text outline-none placeholder-gray" />
                </label>
                <label className="rounded-xl border border-border bg-bdrbg p-2.5">
                  <span className="flex items-center gap-1 text-[10px] font-[700] text-gray"><TargetIcon size={11} /> Probability</span>
                  <div className="mt-1 flex items-baseline"><input type="number" min={0} max={100} value={prob} onChange={e => updateDeal({ deal_probability: e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value))) })} placeholder="—" className="w-full bg-transparent text-[15px] font-[800] text-dark-text outline-none placeholder-gray" /><span className="text-[12px] text-gray">%</span></div>
                </label>
                <label className="col-span-2 rounded-xl border border-border bg-bdrbg p-2.5">
                  <span className="flex items-center gap-1 text-[10px] font-[700] text-gray"><CalendarIcon size={11} /> Expected close</span>
                  <input type="date" value={deal?.expected_close_date || ''} onChange={e => updateDeal({ expected_close_date: e.target.value || null })} className="mt-1 w-full bg-transparent text-[13px] font-[700] text-dark-text outline-none" />
                </label>
              </div>
              {weighted != null && (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-teal/[0.07] px-3 py-2 text-[12px]">
                  <span className="font-[700] text-mid-text">Weighted value</span>
                  <span className="font-[900] text-teal">{fmtMoney(weighted)}/mo</span>
                </div>
              )}
            </section>

            {/* Research */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-[800] uppercase tracking-wide text-gray">Research</div>
                {research?.model && <span className="rounded bg-navy/8 px-1.5 py-0.5 text-[9px] font-[800] uppercase tracking-wide text-navy">via {research.model}</span>}
              </div>
              {research ? (
                <div className="rounded-xl border border-border bg-bdrbg p-3">
                  <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-dark-text">{research.text}</p>
                  <button onClick={runResearch} disabled={researching} className="mt-2 flex items-center gap-1.5 text-[11px] font-[700] text-navy disabled:opacity-60"><SearchIcon size={11} />{researching ? 'Researching…' : 'Refresh'}</button>
                </div>
              ) : (
                <button onClick={runResearch} disabled={researching} className="flex w-full items-center gap-2 rounded-xl border border-border bg-bdrbg px-3 py-2.5 text-left text-[12.5px] font-[700] text-mid-text transition-colors hover:border-navy/40 disabled:opacity-60">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy/8 text-navy"><SearchIcon size={14} /></span>
                  <span className="flex-1">{researching ? 'Researching this partner…' : 'Research this partner'}</span>
                  {!researching && <ArrowRightIcon size={14} className="text-gray" />}
                </button>
              )}
            </section>

            {/* Contacts */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-[800] uppercase tracking-wide text-gray">Contacts ({contacts.length})</div>
                <button onClick={() => setShowContact(s => !s)} className="flex items-center gap-1 text-[11px] font-[700] text-navy"><PlusIcon size={12} /> Add</button>
              </div>
              {showContact && (
                <div className="mb-2 space-y-1.5 rounded-xl border border-border bg-bdrbg p-2.5">
                  <input value={c.name} onChange={e => setC({ ...c, name: e.target.value })} placeholder="Name *" className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] outline-none focus:border-navy/40" />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input value={c.title} onChange={e => setC({ ...c, title: e.target.value })} placeholder="Title" className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] outline-none focus:border-navy/40" />
                    <input value={c.phone} onChange={e => setC({ ...c, phone: e.target.value })} placeholder="Phone" className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] outline-none focus:border-navy/40" />
                  </div>
                  <input value={c.email} onChange={e => setC({ ...c, email: e.target.value })} placeholder="Email" className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] outline-none focus:border-navy/40" />
                  <button onClick={saveContact} disabled={!c.name.trim()} className={cn('w-full rounded-lg py-1.5 text-[12px] font-[800] text-white', c.name.trim() ? 'bg-navy' : 'bg-gray/40')}>Save contact</button>
                </div>
              )}
              {contacts.length === 0 && !showContact ? (
                <p className="text-[12px] text-gray">No contacts yet — add the person you deal with at this agency.</p>
              ) : (
                <div className="space-y-1.5">
                  {contacts.map(ct => (
                    <div key={ct.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/8 text-navy"><UserIcon size={14} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5"><span className="truncate text-[13px] font-[700] text-dark-text">{ct.name}</span>{ct.is_primary && <span className="rounded bg-gold/12 px-1 text-[9px] font-[800] text-[#A06C00]">PRIMARY</span>}</div>
                        <div className="truncate text-[11px] text-gray">{[ct.title, ct.email, ct.phone].filter(Boolean).join(' · ') || '—'}</div>
                      </div>
                      <button onClick={() => setPrimary(ct.id)} aria-label="Set primary" className="shrink-0 text-gray hover:text-gold">{ct.is_primary ? <StarFilledIcon size={14} className="text-gold" /> : <StarIcon size={14} />}</button>
                      <button onClick={() => removeContact(ct.id)} aria-label="Delete contact" className="shrink-0 text-gray hover:text-error"><TrashIcon size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Activity timeline */}
            <section>
              <div className="mb-2 text-[10px] font-[800] uppercase tracking-wide text-gray">Activity</div>
              <div className="rounded-xl border border-border bg-bdrbg p-2.5">
                <div className="mb-2 flex flex-wrap gap-1">
                  {KINDS.map(k => { const Icon = k.icon; return (
                    <button key={k.k} onClick={() => setKind(k.k)} className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-[700]', kind === k.k ? 'bg-navy text-white' : 'bg-card text-gray hover:text-navy')}><Icon size={11} />{k.label}</button>
                  ) })}
                </div>
                <textarea value={body} onChange={e => { setBody(e.target.value); if (aiDraft) setAiDraft(false) }} rows={2} placeholder={`Log a ${kind}…`} className="w-full resize-none rounded-lg border border-border bg-card px-2.5 py-2 text-[13px] outline-none placeholder-gray focus:border-navy/40" />
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={suggest} disabled={suggesting} className="flex items-center gap-1.5 rounded-lg bg-teal/10 px-2.5 py-1.5 text-[11px] font-[700] text-teal disabled:opacity-60"><LightningIcon size={11} />{suggesting ? 'Thinking…' : 'AI suggest'}</button>
                  <div className="flex-1" />
                  <button onClick={logActivity} disabled={!body.trim()} className={cn('flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-[800] text-white', body.trim() ? 'bg-navy' : 'bg-gray/40')}><PlusIcon size={12} /> Log</button>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                {activities.length === 0 ? (
                  <p className="text-[12px] text-gray">No activity logged yet.</p>
                ) : activities.map(n => { const km = kindMeta(n.kind); const Icon = km.icon; return (
                  <div key={n.id} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy/8 text-navy"><Icon size={13} /></span>
                      <span className="mt-1 w-px flex-1 bg-border" />
                    </div>
                    <div className="min-w-0 flex-1 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-[800] uppercase tracking-wide text-gray">{km.label}</span>
                        {n.ai_suggested && <span className="flex items-center gap-0.5 rounded bg-teal/10 px-1 text-[9px] font-[800] text-teal"><LightningIcon size={9} />AI</span>}
                        <span className="text-[10px] text-gray">{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <button onClick={() => removeActivity(n.id)} aria-label="Delete" className="ml-auto text-gray hover:text-error"><TrashIcon size={12} /></button>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-dark-text">{n.body}</p>
                    </div>
                  </div>
                ) })}
              </div>
            </section>

            <button onClick={() => askCoach(`Give me a next-step plan for this partner lead "${name}" (stage ${deal?.stage || 'unknown'}${weighted != null ? `, weighted value ${fmtMoney(weighted)}/mo` : ''}). What are the 3 specific moves to advance the deal?`)}
              className="flex w-full items-center justify-between rounded-xl bg-navy px-4 py-3 text-[13px] font-[800] text-white">
              <span>Ask coach for the next move</span><ArrowRightIcon size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
