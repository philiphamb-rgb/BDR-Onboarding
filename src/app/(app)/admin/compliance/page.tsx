// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Approved-Language Vault — the compliance seat. Managers curate pre-cleared
// phrasings for regulated claims (credit outcomes, SmartCredit, TCPA/CAN-SPAM
// boilerplate, disclosures). Every partner-facing agent is handed this vault in
// its prompt and told to use these exact phrasings for any regulated claim, so
// copy is safe by construction — not fixed after the fact. Manager/owner only.

import { useEffect, useState } from 'react'
import { createUntypedClient } from '@/lib/supabase/untyped'
import { Card, Skeleton, toast, Button, Modal } from '@/components/ui'
import { usePermissions } from '@/components/usePermissions'
import { ShieldIcon, EditIcon, CloseIcon, PlusIcon, CheckIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const CATS = [
  { key: 'credit_claim', label: 'Credit claims' },
  { key: 'smartcredit', label: 'SmartCredit' },
  { key: 'sms', label: 'SMS / TCPA' },
  { key: 'email', label: 'Email / CAN-SPAM' },
  { key: 'disclosure', label: 'Disclosures' },
  { key: 'general', label: 'General' },
]
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATS.map(c => [c.key, c.label]))

export default function ComplianceVaultPage() {
  const supabase = createUntypedClient()
  const { isManager } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)   // row being edited, or {} for new

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    let tid: string | null = null
    if (user) {
      const { data: me } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()
      tid = me?.team_id ?? null
    }
    const { data } = tid
      ? await supabase.from('approved_language').select('*').eq('team_id', tid).order('category').order('created_at', { ascending: false })
      : { data: [] }
    setUserId(user?.id ?? null); setTeamId(tid); setRows(data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async (r: any) => {
    if (!teamId) { toast.error('No team found'); return }
    if (!r.label?.trim() || !r.snippet?.trim()) { toast.error('Label and snippet are required'); return }
    const payload = {
      team_id: teamId, category: r.category || 'general', label: r.label.trim(),
      snippet: r.snippet.trim(), note: r.note?.trim() || null, active: r.active !== false,
      updated_at: new Date().toISOString(),
    }
    const res = r.id
      ? await supabase.from('approved_language').update(payload).eq('id', r.id)
      : await supabase.from('approved_language').insert({ ...payload, created_by: userId })
    if (res.error) { toast.error(`Couldn't save. ${res.error.message}`); return }
    toast.success('Saved'); setEditing(null); load()
  }
  const toggleActive = async (r: any) => {
    const { error } = await supabase.from('approved_language').update({ active: !r.active, updated_at: new Date().toISOString() }).eq('id', r.id)
    if (error) { toast.error(error.message); return }
    load()
  }
  const remove = async (r: any) => {
    const { error } = await supabase.from('approved_language').delete().eq('id', r.id)
    if (error) { toast.error(error.message); return }
    toast.success('Removed'); load()
  }

  const grouped = CATS.map(c => ({ ...c, items: rows.filter(r => r.category === c.key) })).filter(g => g.items.length)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-h2 text-dark-text"><ShieldIcon size={20} className="text-teal" /> Approved-Language Vault</h1>
          <p className="mt-0.5 text-[12.5px] text-gray">Pre-cleared phrasings your AI team must use for any regulated claim. {rows.filter(r => r.active).length} active.</p>
        </div>
        {isManager && <Button onClick={() => setEditing({ category: 'credit_claim', active: true })}><PlusIcon size={14} /> Add</Button>}
      </div>

      <Card className="!p-3 bg-teal/[0.05] border-teal/20">
        <p className="text-[12px] leading-relaxed text-mid-text"><span className="font-[800] text-dark-text">How this is used: </span>Every partner-facing agent receives this vault in its instructions and is told to use these exact phrasings for regulated, credit, or SmartCredit claims — never to improvise a new one. Keep it current and your whole company stays compliant by default.</p>
      </Card>

      {!isManager && <Card className="!py-6 text-center"><p className="text-[13px] text-gray">Only managers can edit the vault. You can view the approved phrasings below.</p></Card>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <Card className="!py-10 text-center">
          <ShieldIcon size={28} className="mx-auto text-gray/40" />
          <p className="mt-2 text-[13px] font-[700] text-dark-text">No approved language yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12px] text-gray">Add your compliance-cleared phrasings for credit claims, SmartCredit, and SMS/email boilerplate so agents never improvise a regulated claim.</p>
          {isManager && <button onClick={() => setEditing({ category: 'credit_claim', active: true })} className="mt-3 text-[13px] font-[800] text-teal">+ Add the first one</button>}
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(g => (
            <div key={g.key}>
              <div className="mb-1.5 px-0.5 text-[11px] font-[900] uppercase tracking-wide text-navy-ink">{g.label} <span className="text-gray/60">· {g.items.length}</span></div>
              <div className="space-y-2">
                {g.items.map(r => (
                  <Card key={r.id} className={cn('!p-3', !r.active && 'opacity-60')}>
                    <div className="flex items-start gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-[800] text-dark-text">{r.label}</span>
                          {!r.active && <span className="rounded-full bg-bdrbg px-2 py-0.5 text-[9.5px] font-[800] uppercase text-gray">Off</span>}
                        </div>
                        <p className="mt-1 rounded-lg bg-bdrbg p-2 text-[12px] italic leading-relaxed text-mid-text">“{r.snippet}”</p>
                        {r.note && <p className="mt-1 text-[11px] text-gray">{r.note}</p>}
                      </div>
                      {isManager && (
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <button onClick={() => toggleActive(r)} className={cn('rounded-md px-2 py-1 text-[10.5px] font-[800]', r.active ? 'text-teal' : 'text-gray')}>{r.active ? 'On' : 'Off'}</button>
                          <button onClick={() => setEditing(r)} className="text-gray hover:text-navy-ink"><EditIcon size={14} /></button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? 'Edit approved language' : 'Add approved language'}>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-[700] text-gray">Category</span>
              <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none">
                {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-[700] text-gray">Label (what this is for)</span>
              <input value={editing.label ?? ''} onChange={e => setEditing({ ...editing, label: e.target.value })} placeholder="e.g. Credit-improvement claim" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-[700] text-gray">Approved snippet (the exact wording)</span>
              <textarea value={editing.snippet ?? ''} onChange={e => setEditing({ ...editing, snippet: e.target.value })} rows={3} placeholder="The exact, compliance-cleared phrasing agents must use." className="w-full rounded-lg border border-border bg-card p-2.5 text-[12.5px] leading-relaxed outline-none focus:border-navy/40" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-[700] text-gray">Note (optional — when to use it)</span>
              <input value={editing.note ?? ''} onChange={e => setEditing({ ...editing, note: e.target.value })} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" />
            </label>
            <div className="flex items-center justify-between pt-1">
              {editing.id ? (
                <button onClick={() => { remove(editing); setEditing(null) }} className="text-[12px] font-[700] text-error">Delete</button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="rounded-lg border border-border px-3 py-2 text-[12.5px] font-[700] text-gray">Cancel</button>
                <Button onClick={() => save(editing)}><CheckIcon size={14} /> Save</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
