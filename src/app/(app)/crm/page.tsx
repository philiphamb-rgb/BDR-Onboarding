// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// CRM Workspace — the record layer of the Agentic CRM OS. One funnel across four
// entities: Accounts (businesses) → Leads (early interest) → Opportunities (the
// partnership deal) → Contacts (people). Pipeline (partner_onboarding) keeps its
// own board at /partners and is linked from here. Config-driven so every entity
// gets the same list + create + edit + delete + empty-state treatment.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, Modal, Skeleton, toast, Button } from '@/components/ui'
import { GrowthSlimHeader } from '@/components/growth/GrowthChrome'
import { useCrm } from '@/lib/hooks/useCrm'
import {
  PlusIcon, SearchIcon, TrashIcon, HandshakeIcon, TargetIcon,
  CoinIcon, UserIcon, ArrowRightIcon, HubIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils'

// ── Per-entity config: fields for the create/edit form + list rendering ──────
const SELECT = (label, key, options, opts = {}) => ({ label, key, type: 'select', options, ...opts })
const TEXT = (label, key, opts = {}) => ({ label, key, type: 'text', ...opts })
const NUM = (label, key, opts = {}) => ({ label, key, type: 'number', ...opts })

const LIFECYCLE = ['new', 'working', 'qualified', 'partner', 'inactive']
const LEAD_STATUS = ['new', 'working', 'qualified', 'routed', 'recycled']
const OPP_STAGE = ['new', 'qualifying', 'proposal', 'negotiation', 'won', 'lost']

const TONE: Record<string, string> = {
  new: 'bg-bdrbg text-gray', working: 'bg-navy/8 text-navy-ink', qualified: 'bg-teal/10 text-teal',
  routed: 'bg-teal/10 text-teal', partner: 'bg-success/10 text-success', won: 'bg-success/10 text-success',
  producing: 'bg-success/10 text-success', inactive: 'bg-bdrbg text-gray', recycled: 'bg-gold/12 text-[#A06C00]',
  qualifying: 'bg-navy/8 text-navy-ink', proposal: 'bg-gold/12 text-[#A06C00]', negotiation: 'bg-gold/12 text-[#A06C00]',
  lost: 'bg-error/10 text-error',
}
const stageChip = (s: string) => <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-[800] capitalize', TONE[s] || 'bg-bdrbg text-gray')}>{s}</span>

export default function CrmWorkspacePage() {
  const crm = useCrm()
  const [tab, setTab] = useState<'accounts' | 'leads' | 'opportunities' | 'contacts'>('accounts')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<any>(null)     // { entity, row } or { entity, row: null } for new
  const accountName = (id: string | null) => crm.accounts.find(a => a.id === id)?.name

  const TABS = [
    { k: 'accounts', label: 'Accounts', icon: HubIcon, count: crm.accounts.length },
    { k: 'leads', label: 'Leads', icon: TargetIcon, count: crm.leads.length },
    { k: 'opportunities', label: 'Opportunities', icon: CoinIcon, count: crm.opportunities.length },
    { k: 'contacts', label: 'Contacts', icon: UserIcon, count: crm.contacts.length },
  ] as const

  const accountOptions = crm.accounts.map(a => ({ value: a.id, label: a.name }))
  const FIELDS: Record<string, any[]> = {
    accounts: [TEXT('Business name', 'name', { required: true }), TEXT('Vertical', 'vertical'), TEXT('Segment', 'segment'), SELECT('Lifecycle', 'lifecycle_stage', LIFECYCLE.map(v => ({ value: v, label: v })), { default: 'new' }), NUM('Revenue potential /yr', 'revenue_potential'), NUM('Partner fit (0–100)', 'partner_fit_score'), NUM('SmartCredit fit (0–100)', 'smartcredit_fit_score')],
    leads: [TEXT('Source', 'source'), SELECT('Account', 'account_id', accountOptions, { allowEmpty: true }), SELECT('Status', 'status', LEAD_STATUS.map(v => ({ value: v, label: v })), { default: 'new' }), NUM('Qualification score', 'qualification_score'), TEXT('Next best action', 'next_best_action')],
    opportunities: [TEXT('Deal name', 'name', { required: true }), SELECT('Account', 'account_id', accountOptions, { allowEmpty: true }), SELECT('Stage', 'stage', OPP_STAGE.map(v => ({ value: v, label: v })), { default: 'new' }), NUM('Amount', 'amount'), NUM('Probability (%)', 'probability'), { label: 'Close date', key: 'close_date', type: 'date' }],
    contacts: [TEXT('Name', 'name', { required: true }), TEXT('Title', 'title'), TEXT('Email', 'email'), TEXT('Phone', 'phone'), SELECT('Account', 'account_id', accountOptions, { allowEmpty: true })],
  }

  const rows = useMemo(() => {
    const src = (crm as any)[tab] as any[]
    const term = q.trim().toLowerCase()
    if (!term) return src
    return src.filter(r => JSON.stringify(r).toLowerCase().includes(term))
  }, [crm, tab, q])

  const singular = { accounts: 'account', leads: 'lead', opportunities: 'opportunity', contacts: 'contact' }[tab]

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthSlimHeader title="CRM Workspace" subtitle="Every business, lead, deal, and contact in one place" />

      {/* Entity tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button key={t.k} onClick={() => { setTab(t.k); setQ('') }}
            className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-[700]', tab === t.k ? 'border-navy bg-navy text-white' : 'border-border text-gray hover:text-navy-ink')}>
            <t.icon size={13} /> {t.label} <span className={cn('tabular-nums', tab === t.k ? 'text-white/70' : 'text-gray/60')}>({t.count})</span>
          </button>
        ))}
        <Link href="/partners" className="ml-auto flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-[700] text-teal hover:border-teal/40"><HandshakeIcon size={13} /> Pipeline →</Link>
      </div>

      {/* Search + new */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${tab}…`} className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-[13px] outline-none focus:border-navy/40" />
        </div>
        <button onClick={() => setEditing({ entity: tab, row: null })} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-teal px-3.5 text-[12.5px] font-[800] text-white"><PlusIcon size={14} /> New {singular}</button>
      </div>

      {crm.loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <Card className="!py-10 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bdrbg text-gray">{(() => { const I = TABS.find(t => t.k === tab)!.icon; return <I size={22} /> })()}</span>
          <h2 className="text-[15px] font-[800] text-dark-text">{q ? `No ${tab} match "${q}"` : `No ${tab} yet`}</h2>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-gray">{q ? 'Try a different search.' : `Add your first ${singular} to start building your ${tab === 'opportunities' ? 'deal' : tab === 'accounts' ? 'book of business' : 'pipeline'}.`}</p>
          {!q && <button onClick={() => setEditing({ entity: tab, row: null })} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-[13px] font-[800] text-white"><PlusIcon size={14} /> New {singular}</button>}
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <Card key={r.id} hover className="!p-3.5 cursor-pointer" onClick={() => setEditing({ entity: tab, row: r })}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[14px] font-[800] text-dark-text">{r.name || r.source || 'Untitled'}</span>
                    {tab === 'accounts' && stageChip(r.lifecycle_stage)}
                    {tab === 'leads' && stageChip(r.status)}
                    {tab === 'opportunities' && stageChip(r.stage)}
                    {tab === 'contacts' && r.is_primary && <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-[800] text-teal">Primary</span>}
                  </div>
                  <div className="mt-0.5 truncate text-[11.5px] text-gray">
                    {tab === 'accounts' && [r.vertical, r.segment].filter(Boolean).join(' · ')}
                    {tab === 'leads' && [r.account_id && accountName(r.account_id), r.next_best_action].filter(Boolean).join(' · ')}
                    {tab === 'opportunities' && [r.account_id && accountName(r.account_id), r.close_date && `close ${r.close_date}`].filter(Boolean).join(' · ')}
                    {tab === 'contacts' && [r.title, r.email, r.account_id && accountName(r.account_id)].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {tab === 'opportunities' && r.amount != null && <div className="shrink-0 text-right"><div className="text-[14px] font-[900] text-dark-text">${Number(r.amount).toLocaleString()}</div>{r.probability != null && <div className="text-[10px] text-gray">{r.probability}% likely</div>}</div>}
                {tab === 'accounts' && r.smartcredit_fit_score != null && <div className="shrink-0 text-center"><div className="text-[14px] font-[900] text-teal">{r.smartcredit_fit_score}</div><div className="text-[9px] uppercase tracking-wide text-gray">SC fit</div></div>}
                {tab === 'leads' && r.qualification_score != null && <div className="shrink-0 text-center"><div className="text-[14px] font-[900] text-teal">{r.qualification_score}</div><div className="text-[9px] uppercase tracking-wide text-gray">score</div></div>}
                <ArrowRightIcon size={15} className="shrink-0 text-gray" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <RecordModal
          entity={editing.entity}
          row={editing.row}
          fields={FIELDS[editing.entity]}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            const res = editing.row
              ? await crm.update(editing.entity, editing.row.id, values)
              : await crm.create(editing.entity, values)
            if (res.error) { toast.error(`Couldn't save. ${res.error}`); return }
            toast.success(editing.row ? 'Saved' : `${singular[0].toUpperCase()}${singular.slice(1)} created`)
            setEditing(null)
          }}
          onDelete={editing.row ? async () => {
            const res = await crm.remove(editing.entity, editing.row.id)
            if (res.error) { toast.error(`Couldn't delete. ${res.error}`); return }
            toast.success('Deleted'); setEditing(null)
          } : undefined}
        />
      )}
    </div>
  )
}

// ── Config-driven create/edit modal ─────────────────────────────────────────
function RecordModal({ entity, row, fields, onClose, onSave, onDelete }: any) {
  const seed: any = {}
  for (const f of fields) seed[f.key] = row?.[f.key] ?? f.default ?? ''
  const [vals, setVals] = useState(seed)
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: any) => setVals(prev => ({ ...prev, [k]: v }))
  const label = { accounts: 'Account', leads: 'Lead', opportunities: 'Opportunity', contacts: 'Contact' }[entity]

  const submit = async () => {
    for (const f of fields) if (f.required && !String(vals[f.key] ?? '').trim()) { toast.error(`${f.label} is required`); return }
    setBusy(true)
    // Coerce numbers + empty strings → null so the DB gets clean values.
    const out: any = {}
    for (const f of fields) {
      let v = vals[f.key]
      if (v === '' || v == null) { if (f.key !== 'name') { out[f.key] = null; continue } }
      out[f.key] = f.type === 'number' ? (Number.isFinite(parseFloat(v)) ? parseFloat(v) : null) : v
    }
    await onSave(out)
    setBusy(false)
  }

  return (
    <Modal isOpen title={row ? `Edit ${label}` : `New ${label}`} onClose={onClose}>
      <div className="space-y-3">
        {fields.map((f: any) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-[11px] font-[700] text-gray">{f.label}{f.required && <span className="text-error"> *</span>}</span>
            {f.type === 'select' ? (
              <select value={vals[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40">
                {f.allowEmpty && <option value="">—</option>}
                {f.options.map((o: any) => <option key={o.value} value={o.value} className="capitalize">{o.label}</option>)}
              </select>
            ) : (
              <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} value={vals[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" />
            )}
          </label>
        ))}
        <div className="flex items-center gap-2 pt-1">
          {onDelete && <button onClick={onDelete} disabled={busy} className="flex items-center gap-1 rounded-lg border border-error/30 px-3 py-2 text-[12px] font-[700] text-error"><TrashIcon size={13} /> Delete</button>}
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-[12.5px] font-[700] text-gray">Cancel</button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : row ? 'Save' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  )
}
