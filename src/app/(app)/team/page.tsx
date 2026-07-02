// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Agent Office — the living company, fully transparent and fully editable. Every
// detail an agent runs with is shown here and (for managers) editable in-app:
// job description, mission, KPI, calculated ROI, personality, brand voice,
// inter-departmental communication (reports-to / passes-to / reviewed-by + comms
// style), how it escalates, HITL setting, model tier, and its exact system
// prompt. Plus the shared Brand Voice every agent inherits, and a live company
// ROI roll-up. Backed by the DB registry (agent_roles + agents) + brand_settings.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createUntypedClient } from '@/lib/supabase/untyped'
import { Card, Skeleton, toast, Button } from '@/components/ui'
import { GrowthSlimHeader } from '@/components/growth/GrowthChrome'
import { usePermissions } from '@/components/usePermissions'
import { loadRegistry } from '@/lib/agents/registry'
import { MODEL_FOR_TIER, HITL_LABEL, TIER_LABEL, computeAgentRoi } from '@/lib/agents/types'
import { InfoIcon, IntegrationIcon, ChevronDownIcon, ArrowRightIcon, CoachIcon, EditIcon, CoinIcon, CopyIcon, CheckIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const DEPT_LABEL: Record<string, string> = {
  exec: 'Executive', marketing: 'Marketing', funnel: 'Lead Funnel',
  partner: 'Partner Success', ops: 'Ops & Quality', compliance: 'Compliance', memory: 'Memory',
}
const DEPT_ORDER = ['exec', 'marketing', 'funnel', 'partner', 'compliance', 'ops', 'memory']
const STATUS_TONE: Record<string, string> = { live: 'bg-success', setup: 'bg-gold', paused: 'bg-gray' }
const HITL_TONE: Record<string, string> = { 'in-the-loop': 'text-error bg-error/8', 'on-the-loop': 'text-teal bg-teal/8', autonomous: 'text-gray bg-bdrbg' }
const MODEL_LABEL: Record<string, string> = { worker: 'Fast (Haiku)', manager: 'Balanced (Sonnet)', exec: 'Deep (Opus)' }

export default function AgentOfficePage() {
  const supabase = createUntypedClient()
  const { isManager } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [reg, setReg] = useState<any>(null)
  const [statusById, setStatusById] = useState<Record<string, string>>({})
  const [brand, setBrand] = useState<any>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editBrand, setEditBrand] = useState(false)

  const load = async () => {
    const registry = await loadRegistry(supabase)
    const { data: { user } } = await supabase.auth.getUser()
    let statuses: Record<string, string> = {}, tid: string | null = null, br: any = null
    if (user) {
      const { data: me } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()
      tid = me?.team_id ?? null
      if (tid) {
        const [{ data: autos }, { data: b }] = await Promise.all([
          supabase.from('automations').select('id, status').eq('team_id', tid),
          supabase.from('brand_settings').select('*').eq('team_id', tid).maybeSingle(),
        ])
        statuses = Object.fromEntries((autos ?? []).map((a: any) => [a.id, a.status]))
        br = b
      }
    }
    setReg(registry); setStatusById(statuses); setBrand(br); setTeamId(tid); setUserId(user?.id ?? null); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const hourlyRate = brand?.hourly_rate ? Number(brand.hourly_rate) : 50
  const statusOf = (a: any) => statusById[a.id] ?? a.defaultStatus
  const liveAgents = reg ? reg.agents.filter((a: any) => statusOf(a) === 'live') : []
  const companyRoi = liveAgents.reduce((acc: any, a: any) => {
    const r = computeAgentRoi(a, hourlyRate); acc.hours += r.hoursPerMo; acc.dollars += r.dollarsPerMo; return acc
  }, { hours: 0, dollars: 0 })

  const byDept = useMemo(() => {
    if (!reg) return []
    return DEPT_ORDER
      .map(d => ({ dept: d, items: reg.agents.filter((a: any) => a.role?.department === d).sort((x: any, y: any) => (x.role?.tier ?? 3) - (y.role?.tier ?? 3)) }))
      .filter(g => g.items.length > 0)
  }, [reg])

  const open = reg && openId ? reg.byId[openId] : null

  const saveBrand = async (values: any) => {
    if (!teamId) { toast.error('No team found'); return }
    const row = { team_id: teamId, ...values, updated_by: userId, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('brand_settings').upsert(row, { onConflict: 'team_id' })
    if (error) { toast.error(`Couldn't save. ${error.message}`); return }
    toast.success('Brand voice saved'); setEditBrand(false); load()
  }

  const saveAgent = async (agentFields: any, roleFields: any) => {
    const jobs: Promise<any>[] = []
    if (Object.keys(agentFields).length) jobs.push(supabase.from('agents').update({ ...agentFields, updated_at: new Date().toISOString() }).eq('id', open.id))
    if (Object.keys(roleFields).length) jobs.push(supabase.from('agent_roles').update(roleFields).eq('id', open.roleId))
    const results = await Promise.all(jobs)
    const err = results.find((r: any) => r?.error)?.error
    if (err) { toast.error(`Couldn't save. ${err.message}`); return }
    toast.success('Agent updated'); await load()
  }

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthSlimHeader title="Agent Office" subtitle={loading ? undefined : `${liveAgents.length} of ${reg.agents.length} teammates live`} />

      {/* Company ROI roll-up */}
      {!loading && (
        <Card className="!border-none bg-navy !p-4 text-white">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-[20px] font-[900]">{liveAgents.length}/{reg.agents.length}</div><div className="mt-0.5 text-[10.5px] text-white/70">teammates live</div></div>
            <div><div className="text-[20px] font-[900]">{Math.round(companyRoi.hours)}h</div><div className="mt-0.5 text-[10.5px] text-white/70">work handled/mo</div></div>
            <div><div className="text-[20px] font-[900]">${companyRoi.dollars.toLocaleString()}</div><div className="mt-0.5 text-[10.5px] text-white/70">value/mo at ${hourlyRate}/hr</div></div>
          </div>
          <div className="mt-2.5 border-t border-white/15 pt-2 text-center text-[10px] text-white/60">Live agents only · each teammate's ROI shows its exact math when you open it</div>
        </Card>
      )}

      {/* Brand voice — the one source of truth every agent inherits */}
      {!loading && (
        <Card className="!p-4">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[13px] font-[800] text-dark-text"><CoachIcon size={15} className="text-teal" /> Brand voice</div>
            {isManager && <button onClick={() => setEditBrand(true)} className="flex items-center gap-1 text-[12px] font-[700] text-teal"><EditIcon size={13} /> Edit</button>}
          </div>
          {brand?.voice || brand?.promise ? (
            <div className="space-y-1 text-[12px] leading-relaxed text-mid-text">
              {brand.voice && <p><span className="font-[700] text-dark-text">Voice: </span>{brand.voice}</p>}
              {brand.audience && <p><span className="font-[700] text-dark-text">Audience: </span>{brand.audience}</p>}
              {brand.promise && <p><span className="font-[700] text-dark-text">Promise: </span>{brand.promise}</p>}
            </div>
          ) : (
            <p className="text-[12px] text-gray">{isManager ? 'Set your brand voice once — every agent writes in it. Tap Edit.' : 'Your brand voice hasn’t been set yet.'}</p>
          )}
        </Card>
      )}

      <div className="flex items-start gap-2 rounded-xl bg-navy/[0.04] p-3">
        <InfoIcon size={14} className="mt-0.5 shrink-0 text-navy-ink" />
        <p className="text-[11.5px] leading-relaxed text-mid-text"><span className="font-[700] text-dark-text">This is your company.</span> Tap anyone to see every detail they run with{isManager ? ' — and edit it' : ''}, or <Link href="/team/rooms" className="font-[700] text-teal">meet with your team</Link>.</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-5">
          {byDept.map(g => (
            <div key={g.dept}>
              <div className="mb-2 px-0.5 text-[11px] font-[900] uppercase tracking-wide text-navy-ink">{DEPT_LABEL[g.dept]} <span className="text-gray/60">· {g.items.length}</span></div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map((a: any) => {
                  const st = statusOf(a); const roi = computeAgentRoi(a, hourlyRate)
                  return (
                    <Card key={a.id} hover className="!p-3 cursor-pointer" onClick={() => setOpenId(a.id)}>
                      <div className="flex items-start gap-2.5">
                        <div className="relative shrink-0">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy/8 text-[12px] font-[800] text-navy-ink">{a.firstName[0]}{a.lastName[0]}</span>
                          <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card', STATUS_TONE[st], st === 'live' && 'animate-breathe')} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-[800] text-dark-text">{a.fullName}</div>
                          <div className="truncate text-[10.5px] font-[700] uppercase tracking-wide text-gray">{a.role?.title}</div>
                          <div className="mt-1 flex items-center gap-1 text-[10.5px] font-[700] text-teal"><CoinIcon size={10} /> ~${roi.dollarsPerMo.toLocaleString()}/mo</div>
                        </div>
                        <ChevronDownIcon size={14} className="mt-0.5 shrink-0 text-gray" />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <AgentDrawer agent={open} reg={reg} status={statusOf(open)} brand={brand} hourlyRate={hourlyRate} isManager={isManager} onClose={() => setOpenId(null)} onOpen={setOpenId} onSave={saveAgent} />}
      {editBrand && <BrandModal brand={brand} onClose={() => setEditBrand(false)} onSave={saveBrand} />}
    </div>
  )
}

// ── Full agent detail + inline edit ─────────────────────────────────────────
function AgentDrawer({ agent, reg, status, brand, hourlyRate, isManager, onClose, onOpen, onSave }: any) {
  const role = agent.role || {}
  const [editing, setEditing] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [copied, setCopied] = useState(false)
  const roi = computeAgentRoi(agent, hourlyRate)
  const chip = (id: string) => reg.byId[id]
  const effectiveVoice = agent.brandVoiceOverride || brand?.voice
  const relRow = (label: string, ids: string[]) => ids?.length ? (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-[800] uppercase tracking-wide text-gray">{label}</span>
      {ids.map((id: string) => { const a = chip(id); return a ? <button key={id} onClick={() => onOpen(id)} className="rounded-md bg-bdrbg px-2 py-0.5 text-[11px] font-[700] text-navy-ink hover:bg-navy/10">{a.fullName}</button> : <span key={id} className="rounded-md bg-bdrbg px-2 py-0.5 text-[11px] text-gray">{id}</span> })}
    </div>
  ) : null
  const copy = async () => { try { await navigator.clipboard.writeText(agent.systemPrompt || ''); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {} }

  return (
    <div className="fixed inset-0 z-[1055] flex items-end justify-center bg-dark-text/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-4 shadow-modal sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy/8 text-[15px] font-[900] text-navy-ink">{agent.firstName[0]}{agent.lastName[0]}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-[900] text-dark-text">{agent.fullName}</div>
            <div className="text-[11px] font-[700] uppercase tracking-wide text-gray">{role.title}</div>
          </div>
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[800] capitalize', status === 'live' ? 'bg-success/10 text-success' : status === 'paused' ? 'bg-bdrbg text-gray' : 'bg-gold/12 text-[#A06C00]')}>{status}</span>
        </div>

        {editing ? (
          <AgentEditForm agent={agent} role={role} reg={reg} onCancel={() => setEditing(false)} onSave={async (af, rf) => { await onSave(af, rf); setEditing(false) }} />
        ) : (
          <>
            {isManager && <button onClick={() => setEditing(true)} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal/40 py-2 text-[12.5px] font-[800] text-teal"><EditIcon size={14} /> Edit this teammate</button>}

            {/* ROI with the exact calculation */}
            <div className="mb-3 rounded-xl bg-teal/[0.06] p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/12 text-teal"><CoinIcon size={18} /></span>
                <div><div className="text-[16px] font-[900] text-dark-text">~${roi.dollarsPerMo.toLocaleString()}<span className="text-[12px] font-[600] text-gray">/mo</span></div><div className="text-[11px] text-gray">estimated value when live</div></div>
              </div>
              <div className="mt-2 border-t border-teal/15 pt-2 text-[11.5px] leading-relaxed text-mid-text">
                <span className="font-[700] text-dark-text">How it's calculated: </span>{roi.minPerRun} min saved/run × {roi.runsPerMo} runs/mo = {roi.hoursPerMo}h/mo × ${roi.hourlyRate}/hr = <span className="font-[800] text-teal">${roi.dollarsPerMo.toLocaleString()}/mo</span>.
              </div>
              {agent.roiNote && <div className="mt-1 text-[10.5px] italic text-gray">{agent.roiNote}</div>}
            </div>

            <div className="space-y-2.5 text-[12px] leading-relaxed text-mid-text">
              {role.jobDescription && <p><span className="font-[800] text-dark-text">Job: </span>{role.jobDescription}</p>}
              {role.kpi && <p><span className="font-[800] text-dark-text">Measured by: </span>{role.kpi}</p>}
              {agent.personality && <p><span className="font-[800] text-dark-text">Personality: </span>{agent.personality}</p>}
              {agent.morningGreeting && <p className="rounded-lg bg-bdrbg p-2.5 italic">“{agent.morningGreeting}”</p>}
            </div>

            {/* Communication */}
            <div className="my-3 space-y-2 rounded-xl border border-border p-3">
              <div className="text-[10px] font-[900] uppercase tracking-wide text-navy-ink">Communication</div>
              {relRow('Reports to', role.reportsTo)}
              {relRow('Passes work to', role.handoffTo)}
              {relRow('Reviewed by', role.reviewedBy)}
              {relRow('Escalates to', role.escalationPath)}
              {role.commsStyle && <p className="text-[11.5px] leading-relaxed text-mid-text">{role.commsStyle}</p>}
            </div>

            {/* Brand voice + controls */}
            <div className="mb-3 flex flex-wrap gap-2">
              <span className={cn('rounded-lg px-2.5 py-1 text-[11px] font-[700]', HITL_TONE[agent.hitlTier])}>{HITL_LABEL[agent.hitlTier]}</span>
              <span className="rounded-lg bg-navy/8 px-2.5 py-1 text-[11px] font-[700] text-navy-ink">{TIER_LABEL[role.tier] ?? 'Specialist'}</span>
              <span className="rounded-lg bg-bdrbg px-2.5 py-1 text-[11px] font-[700] text-gray" title={MODEL_FOR_TIER[agent.modelTier]}>{MODEL_LABEL[agent.modelTier]}</span>
            </div>
            {effectiveVoice && <p className="mb-3 text-[11.5px] leading-relaxed text-mid-text"><span className="font-[800] text-dark-text">Brand voice{agent.brandVoiceOverride ? ' (custom)' : ' (team)'}: </span>{effectiveVoice}</p>}

            {/* System prompt */}
            {agent.systemPrompt && (
              <div className="mb-3">
                <button onClick={() => setShowPrompt(s => !s)} className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-[12px] font-[700] text-navy-ink">See system prompt <ChevronDownIcon size={14} className={cn('transition-transform', showPrompt && 'rotate-180')} /></button>
                {showPrompt && (
                  <div className="mt-1.5">
                    <div className="mb-1 flex justify-end"><button onClick={copy} className={cn('flex items-center gap-1 text-[11px] font-[700]', copied ? 'text-success' : 'text-teal')}>{copied ? <><CheckIcon size={12} /> Copied</> : <><CopyIcon size={12} /> Copy</>}</button></div>
                    <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-[#0C1929] p-3 text-[11px] leading-relaxed text-[#DDE8F6] [font-family:ui-monospace,monospace]">{agent.systemPrompt}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Link href={`/team/rooms?agent=${agent.id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy py-2.5 text-[12.5px] font-[800] text-white"><IntegrationIcon size={14} /> Talk 1:1</Link>
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-[12.5px] font-[700] text-gray">Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AgentEditForm({ agent, role, reg, onCancel, onSave }: any) {
  const [v, setV] = useState({
    job_description: role.jobDescription ?? '', comms_style: role.commsStyle ?? '',
    personality: agent.personality ?? '', brand_voice_override: agent.brandVoiceOverride ?? '',
    morning_greeting: agent.morningGreeting ?? '', hitl_tier: agent.hitlTier, model_tier: agent.modelTier,
    roi_min_per_run: agent.roiMinPerRun ?? 0, roi_runs_per_mo: agent.roiRunsPerMo ?? 0, roi_note: agent.roiNote ?? '',
    system_prompt: agent.systemPrompt ?? '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, val: any) => setV(prev => ({ ...prev, [k]: val }))
  const num = (x: any) => { const n = parseInt(x, 10); return Number.isFinite(n) ? Math.max(0, n) : 0 }
  const field = (label: string, node: any, hint?: string) => <label className="block"><span className="mb-1 block text-[11px] font-[700] text-gray">{label}</span>{node}{hint && <span className="mt-0.5 block text-[10px] text-gray">{hint}</span>}</label>
  const input = (k: string) => <input value={v[k]} onChange={e => set(k, e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" />
  const area = (k: string, rows = 3) => <textarea value={v[k]} onChange={e => set(k, e.target.value)} rows={rows} className="w-full rounded-lg border border-border bg-card p-2.5 text-[12.5px] leading-relaxed outline-none focus:border-navy/40" />

  const submit = async () => {
    setBusy(true)
    await onSave(
      { personality: v.personality || null, brand_voice_override: v.brand_voice_override || null, morning_greeting: v.morning_greeting || null, hitl_tier: v.hitl_tier, model_tier: v.model_tier, roi_min_per_run: num(v.roi_min_per_run), roi_runs_per_mo: num(v.roi_runs_per_mo), roi_note: v.roi_note || null, system_prompt: v.system_prompt || null },
      { job_description: v.job_description || null, comms_style: v.comms_style || null },
    )
    setBusy(false)
  }

  return (
    <div className="space-y-3">
      {field('Job description', area('job_description'))}
      {field('Personality', input('personality'))}
      {field('Brand voice (leave blank to inherit the team voice)', area('brand_voice_override', 2))}
      {field('Morning greeting', input('morning_greeting'))}
      {field('How it communicates across teams', area('comms_style', 2))}
      <div className="grid grid-cols-2 gap-3">
        {field('Approval setting', <select value={v.hitl_tier} onChange={e => set('hitl_tier', e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none"><option value="in-the-loop">Ask me first</option><option value="on-the-loop">Act, I can override</option><option value="autonomous">Fully autonomous</option></select>)}
        {field('Brain power', <select value={v.model_tier} onChange={e => set('model_tier', e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none"><option value="worker">Fast (Haiku)</option><option value="manager">Balanced (Sonnet)</option><option value="exec">Deep (Opus)</option></select>)}
      </div>
      <div className="rounded-xl bg-bdrbg p-3">
        <div className="mb-1.5 text-[11px] font-[800] uppercase tracking-wide text-gray">ROI inputs</div>
        <div className="grid grid-cols-2 gap-3">
          {field('Minutes saved / run', input('roi_min_per_run'))}
          {field('Runs / month', input('roi_runs_per_mo'))}
        </div>
        <div className="mt-1.5 text-[11px] text-mid-text">= <span className="font-[800] text-teal">${Math.round((num(v.roi_min_per_run) * num(v.roi_runs_per_mo) / 60) * 50).toLocaleString()}/mo</span> at $50/hr</div>
        {field('ROI note (optional)', input('roi_note'))}
      </div>
      {field('System prompt (exactly how it thinks)', area('system_prompt', 6))}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onCancel} className="rounded-lg px-3 py-2 text-[12.5px] font-[700] text-gray">Cancel</button>
        <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save teammate'}</Button>
      </div>
    </div>
  )
}

function BrandModal({ brand, onClose, onSave }: any) {
  const [v, setV] = useState({
    voice: brand?.voice ?? '', audience: brand?.audience ?? '', promise: brand?.promise ?? '',
    dos: brand?.dos ?? '', donts: brand?.donts ?? '', hourly_rate: brand?.hourly_rate ?? 50,
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, val: any) => setV(prev => ({ ...prev, [k]: val }))
  const field = (label: string, node: any) => <label className="block"><span className="mb-1 block text-[11px] font-[700] text-gray">{label}</span>{node}</label>
  const input = (k: string) => <input value={v[k]} onChange={e => set(k, e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" />
  const area = (k: string) => <textarea value={v[k]} onChange={e => set(k, e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-card p-2.5 text-[12.5px] leading-relaxed outline-none focus:border-navy/40" />
  return (
    <div className="fixed inset-0 z-[1060] flex items-end justify-center bg-dark-text/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-4 shadow-modal sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="mb-1 text-[16px] font-[900] text-dark-text">Brand voice</h3>
        <p className="mb-3 text-[12px] text-gray">Set this once — every agent writes in it.</p>
        <div className="space-y-3">
          {field('Voice (how everything should sound)', area('voice'))}
          {field('Who you serve', input('audience'))}
          {field('Your promise', input('promise'))}
          {field('Always do', area('dos'))}
          {field('Never do', area('donts'))}
          {field('Your time is worth ($/hr) — used for ROI', <input type="number" value={v.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40" />)}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="rounded-lg px-3 py-2 text-[12.5px] font-[700] text-gray">Cancel</button>
            <Button onClick={async () => { setBusy(true); await onSave({ voice: v.voice || null, audience: v.audience || null, promise: v.promise || null, dos: v.dos || null, donts: v.donts || null, hourly_rate: Number(v.hourly_rate) || 50 }); setBusy(false) }} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
