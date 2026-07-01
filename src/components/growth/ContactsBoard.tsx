// @ts-nocheck
'use client'

// Growth OS — Contacts as a first-class object. A standalone index of every
// person across the book (crm_contacts), each associated to a Company (a
// partner_onboarding record) and, through it, to a Deal. Search, add (with a
// company picker), set-primary, delete, and click any contact to open its
// company's CRM drawer — the contact ↔ company ↔ deal association made
// navigable. RLS: you see your own contacts; managers see the team's.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui'
import {
  UserIcon, SearchIcon, CloseIcon, PlusIcon, TrashIcon, StarIcon, StarFilledIcon,
  HandshakeIcon, MailIcon, PhoneIcon, ArrowRightIcon, CoinIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils'

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

export function ContactsBoard({ companies, onOpenCompany }: { companies: any[]; onOpenCompany: (c: { id: string; name: string }) => void }) {
  const supabase = createClient()
  const [contacts, setContacts] = useState<any[] | null>(null)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ partner_id: '', name: '', title: '', email: '', phone: '' })
  const uidRef = useRef<string | null>(null)
  const teamRef = useRef<string | null>(null)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setContacts([]); return }
    uidRef.current = user.id
    if (!teamRef.current) { const { data: u } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle(); teamRef.current = u?.team_id ?? null }
    // Embed the associated company (RLS on partner_onboarding still applies).
    const { data } = await supabase.from('crm_contacts')
      .select('id, name, title, email, phone, is_primary, partner_id, partner:partner_onboarding(partner_name, stage, deal_amount, deal_probability)')
      .order('created_at', { ascending: false })
    setContacts(data ?? [])
  }
  useEffect(() => { load() }, [])

  const rows = useMemo(() => {
    const list = contacts || []
    if (!q) return list
    const t = q.toLowerCase()
    return list.filter(c => c.name?.toLowerCase().includes(t) || c.partner?.partner_name?.toLowerCase().includes(t) || c.email?.toLowerCase().includes(t) || c.title?.toLowerCase().includes(t))
  }, [contacts, q])

  const companiesWith = new Set((contacts || []).map(c => c.partner_id)).size
  const primaries = (contacts || []).filter(c => c.is_primary).length

  const addContact = async () => {
    if (!form.name.trim() || !form.partner_id || !uidRef.current) return
    await supabase.from('crm_contacts').insert({ user_id: uidRef.current, team_id: teamRef.current, partner_id: form.partner_id, name: form.name.trim(), title: form.title || null, email: form.email || null, phone: form.phone || null })
    setForm({ partner_id: '', name: '', title: '', email: '', phone: '' }); setAdding(false); load()
  }
  const removeContact = async (id: string) => { setContacts(prev => prev.filter(c => c.id !== id)); await supabase.from('crm_contacts').delete().eq('id', id) }
  const setPrimary = async (c: any) => {
    setContacts(prev => prev.map(x => x.partner_id === c.partner_id ? { ...x, is_primary: x.id === c.id } : x))
    await Promise.all([
      supabase.from('crm_contacts').update({ is_primary: false }).eq('partner_id', c.partner_id),
      supabase.from('crm_contacts').update({ is_primary: true }).eq('id', c.id),
    ])
  }

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: UserIcon, label: 'Contacts', value: (contacts || []).length },
          { icon: HandshakeIcon, label: 'Companies', value: companiesWith },
          { icon: StarIcon, label: 'Primary', value: primaries },
        ].map((s, i) => { const Icon = s.icon; return (
          <Card key={i} className="!p-3"><Icon size={15} className="text-navy" /><div className="mt-1 text-[18px] font-[900] tabular-nums text-dark-text">{contacts === null ? '…' : s.value}</div><div className="text-[11px] text-gray">{s.label}</div></Card>
        ) })}
      </div>

      {/* Search + add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people, companies, emails…" className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-9 text-[13px] outline-none focus:border-navy/40" />
          {q && <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray"><CloseIcon size={14} /></button>}
        </div>
        <button onClick={() => setAdding(a => !a)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-3 text-[12.5px] font-[700] text-white"><PlusIcon size={13} /> Add</button>
      </div>

      {/* Add form */}
      {adding && (
        <Card className="!p-3">
          <div className="mb-2 text-[10px] font-[800] uppercase tracking-wide text-gray">New contact</div>
          <select value={form.partner_id} onChange={e => setForm({ ...form, partner_id: e.target.value })} className="mb-1.5 w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] outline-none focus:border-navy/40">
            <option value="">Associate to company…</option>
            {(companies || []).filter(c => c.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name *" className="mb-1.5 w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] outline-none focus:border-navy/40" />
          <div className="mb-1.5 grid grid-cols-2 gap-1.5">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] outline-none focus:border-navy/40" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] outline-none focus:border-navy/40" />
          </div>
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="mb-2 w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] outline-none focus:border-navy/40" />
          <button onClick={addContact} disabled={!form.name.trim() || !form.partner_id} className={cn('w-full rounded-lg py-2 text-[12.5px] font-[800] text-white', form.name.trim() && form.partner_id ? 'bg-navy' : 'bg-gray/40')}>Save contact</button>
        </Card>
      )}

      {/* List */}
      {contacts === null ? (
        <Card className="!py-8 text-center text-[13px] text-gray">Loading contacts…</Card>
      ) : rows.length === 0 ? (
        <Card className="!py-8 text-center"><UserIcon size={20} className="mx-auto mb-2 text-gray" /><p className="text-[13px] text-gray">{(contacts || []).length ? 'No contacts match your search.' : 'No contacts yet — add the people you work with at each agency.'}</p></Card>
      ) : (
        <div className="space-y-1.5">
          {rows.map(c => {
            const weighted = c.partner?.deal_amount != null && c.partner?.deal_probability != null ? (Number(c.partner.deal_amount) * Number(c.partner.deal_probability)) / 100 : null
            return (
              <Card key={c.id} className="!p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/8 text-[12px] font-[800] text-navy">{(c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5"><span className="truncate text-[13px] font-[700] text-dark-text">{c.name}</span>{c.is_primary && <span className="rounded bg-gold/12 px-1 text-[9px] font-[800] text-[#A06C00]">PRIMARY</span>}</div>
                    <div className="truncate text-[11px] text-gray">{[c.title, c.email, c.phone].filter(Boolean).join(' · ') || 'No details'}</div>
                  </div>
                  <button onClick={() => setPrimary(c)} aria-label="Set primary" className="shrink-0 text-gray hover:text-gold">{c.is_primary ? <StarFilledIcon size={14} className="text-gold" /> : <StarIcon size={14} />}</button>
                  <button onClick={() => removeContact(c.id)} aria-label="Delete contact" className="shrink-0 text-gray hover:text-error"><TrashIcon size={13} /></button>
                </div>
                {/* Association: company + deal → click to open the record */}
                <button onClick={() => onOpenCompany({ id: c.partner_id, name: c.partner?.partner_name || 'Company' })}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg bg-bdrbg px-2.5 py-1.5 text-left hover:bg-teal/[0.06]">
                  <HandshakeIcon size={12} className="shrink-0 text-navy" />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-[700] text-navy">{c.partner?.partner_name || 'Company'}</span>
                  {weighted != null && <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-[700] text-teal"><CoinIcon size={10} />{money(weighted)}/mo</span>}
                  <ArrowRightIcon size={12} className="shrink-0 text-gray" />
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
