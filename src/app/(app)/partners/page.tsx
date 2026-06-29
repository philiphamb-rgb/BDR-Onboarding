// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Modal, EmptyState, SkeletonList, ProgressBar, Badge, toast } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { HandshakeIcon, PlusIcon, ArrowRightIcon, ChecklistIcon, CheckIcon } from '@/components/icons'
import { CHECKLIST_TEMPLATE, PIPELINE_STAGES, freshChecklist, completion, stageMeta } from '@/lib/partnerChecklist'
import { cn } from '@/lib/utils'
import { Tour } from '@/components/tour'
import { PARTNERS_TOUR } from '@/lib/tours'

export default function PartnersPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [teamId, setTeamId] = useState<string>()
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [form, setForm] = useState({ partner_name: '', company: '', temperature: 'cold' })
  const [saving, setSaving] = useState(false)

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
      .select('id, partner_name, company, stage, checklist, temperature, updated_at')
      .eq('user_id', uid).order('updated_at', { ascending: false })
    setPartners(data ?? [])
    setLoading(false)
  }

  const addPartner = async () => {
    if (!form.partner_name.trim() || !userId) return
    setSaving(true)
    const { data, error } = await supabase.from('partner_onboarding').insert({
      user_id: userId, team_id: teamId ?? null,
      partner_name: form.partner_name.trim(), company: form.company.trim() || null,
      stage: 'new_lead', checklist: freshChecklist(), temperature: form.temperature,
    }).select('id, partner_name, company, stage, checklist, temperature, updated_at').single()
    setSaving(false)
    if (!error && data) {
      setPartners(p => [data, ...p])
      setForm({ partner_name: '', company: '', temperature: 'cold' })
      setShowAdd(false)
      toast.success('Partner added — start the checklist')
    } else {
      toast.error('Could not add partner')
    }
  }

  const active = partners.length
  const fullyDone = partners.filter(p => completion(p.checklist).pct === 100).length

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Partner Onboarding"
        subtitle={loading ? undefined : active ? `${active} partner${active === 1 ? '' : 's'} · ${fullyDone} fully onboarded` : 'Track each partner from new lead to live'}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowTemplate(true)} icon={<ChecklistIcon size={16} />}>Template</Button>
            <span data-tour="partners-add"><Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={16} />}>Add</Button></span>
          </div>
        }
      />

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
      ) : (
        <div className="space-y-3" data-tour="partners-list">
          {partners.map(p => {
            const c = completion(p.checklist)
            const s = stageMeta(p.stage)
            return (
              <Link key={p.id} href={`/partners/${p.id}`} className="block">
                <Card hover>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-[700] text-dark-text">{p.partner_name}</div>
                      {p.company && <div className="truncate text-[12px] text-gray">{p.company}</div>}
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-[700]" style={{ backgroundColor: `${s.color}1A`, color: s.color }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={c.pct} max={100} color={c.pct === 100 ? '#16A34A' : '#00C2B2'} className="h-1.5 flex-1" />
                    <span className="flex items-center gap-1 text-[12px] font-[700] text-mid-text tabular-nums">
                      {c.pct === 100 ? <CheckIcon size={13} className="text-success" /> : null}{c.done}/{c.total}
                    </span>
                    <ArrowRightIcon size={15} className="text-gray shrink-0" />
                  </div>
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
              {[{ k: 'warm', l: '🔥 Warm', d: 'Referral / inbound / engaged' }, { k: 'cold', l: '❄️ Cold', d: 'Prospected / outbound' }].map(t => (
                <button key={t.k} type="button" onClick={() => setForm(f => ({ ...f, temperature: t.k }))}
                  className={cn('rounded-md border px-3 py-2 text-left transition-all',
                    form.temperature === t.k ? 'border-navy bg-navy/5' : 'border-border hover:border-navy/40')}>
                  <div className="text-[13px] font-[700] text-dark-text">{t.l}</div>
                  <div className="text-[11px] text-gray">{t.d}</div>
                </button>
              ))}
            </div>
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
