// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Growth OS — Automations. The operational lens on the AI Team: the same agents,
// shown as when→then workflows with a researched ROI, live tool-connection
// status, and the handful of settings a manager actually tunes. Status writes to
// the real team-scoped `automations` table (RLS-gated to managers); per-agent
// config persists per-user in module_progress. One roster, two lenses.

import { useState } from 'react'
import { Card, Skeleton, Toggle, Badge } from '@/components/ui'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowthChrome } from '@/components/growth/GrowthChrome'
import { LightningIcon, ClockIcon, ChartRisingIcon, ChevronDownIcon, PlusIcon, ArrowRightIcon, TargetIcon, IntegrationIcon, SettingsIcon, InfoIcon, LinkIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { AUTOMATION_META } from '@/lib/modules/growth-os/automationMeta'
import { STATUS_META } from '@/lib/modules/growth-os/roster'
import { cn } from '@/lib/utils'

function ConfigRow({ field, value, onChange }: any) {
  const v = value ?? field.value
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-[12.5px] text-mid-text">{field.label}</span>
      {field.type === 'toggle' ? (
        <Toggle size="sm" checked={!!v} onChange={n => onChange(field.key, n)} />
      ) : (
        <div className="flex items-center gap-1.5">
          <button onClick={() => onChange(field.key, Math.max(0, v - 1))} aria-label={`Decrease ${field.label}`} style={{ minHeight: 22 }} className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-border text-[13px] font-[800] leading-none text-gray">−</button>
          <span className="min-w-[30px] text-center text-[13px] font-[700] tabular-nums text-dark-text">{v}</span>
          <button onClick={() => onChange(field.key, v + 1)} aria-label={`Increase ${field.label}`} style={{ minHeight: 22 }} className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-border text-gray"><PlusIcon size={11} /></button>
          {field.suffix && <span className="ml-1 text-[11px] text-gray">{field.suffix}</span>}
        </div>
      )}
    </div>
  )
}

export default function GrowthAutomationsPage() {
  const { loading, isManager, roster, setStatus } = useGrowthOS()
  const { value: cfg, save: saveCfg } = useModuleKV('growth_autoconfig', {})
  const [cat, setCat] = useState('All')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  // Only agents with an operational meta appear as automations (the gate + tour
  // are shown on the AI Team tab, not here).
  const autos = (roster || []).filter(a => AUTOMATION_META[a.id])
  const cats = ['All', ...Array.from(new Set(autos.map(a => a.category)))]
  const CAT_LABEL: any = { funnel: 'Funnel', content: 'Content', retention: 'Retention', ops: 'Ops' }
  const filtered = autos.filter(a => (cat === 'All' || a.category === cat) && (!query || a.name.toLowerCase().includes(query.toLowerCase())))
  const live = autos.filter(a => a.status === 'live')
  const hrsSaved = live.reduce((s, a) => s + (AUTOMATION_META[a.id]?.hrsWeek || 0), 0)
  const annual = hrsSaved * 52
  const setStatusFor = (agent, next) => setStatus(agent, next)
  const onConfig = (id, key, val) => saveCfg(p => ({ [id]: { ...(p[id] || {}), [key]: val } }))

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthChrome />
      <GrowthTabs />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* ROI summary */}
          <Card className="bg-navy !p-4 text-white">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="flex items-center justify-center gap-1 text-[20px] font-[900]"><ClockIcon size={15} />{hrsSaved}h/wk</div><div className="mt-0.5 text-[10.5px] text-white/70">manual work removed, live</div></div>
              <div><div className="flex items-center justify-center gap-1 text-[20px] font-[900]"><ChartRisingIcon size={15} />{annual}h/yr</div><div className="mt-0.5 text-[10.5px] text-white/70">~{Math.round(annual / 40)} work-weeks back</div></div>
              <div><div className="flex items-center justify-center gap-1 text-[20px] font-[900]"><LightningIcon size={15} />{live.length}/{autos.length}</div><div className="mt-0.5 text-[10.5px] text-white/70">automations working for you</div></div>
            </div>
          </Card>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {cats.map(c => (
                <button key={c} onClick={() => setCat(c)} className={cn('rounded-full border px-3 py-1 text-[11.5px] font-[700]', cat === c ? 'border-navy bg-navy text-white' : 'border-border text-gray hover:text-navy')}>{c === 'All' ? 'All' : CAT_LABEL[c]}</button>
              ))}
            </div>
            <div className="relative ml-auto min-w-[150px] flex-1 sm:max-w-[220px]">
              <TargetIcon size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search automations…" className="w-full rounded-full border border-border bg-card py-1.5 pl-7 pr-3 text-[12px] outline-none focus:border-navy/40" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card className="!py-8 text-center"><p className="text-[13px] text-gray">No automations match your filters.</p></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(a => {
                const m = AUTOMATION_META[a.id]
                const isOpen = openId === a.id
                const sm = STATUS_META[a.status]
                return (
                  <Card key={a.id} className={cn('overflow-hidden !p-0', a.status !== 'live' && 'opacity-95')}>
                    <div className="flex cursor-pointer items-start gap-3 p-3.5" onClick={() => setOpenId(isOpen ? null : a.id)}>
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.status === 'live' ? 'bg-teal/10 text-teal' : 'bg-bdrbg text-gray')}><LightningIcon size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13.5px] font-[800] text-dark-text">{a.name}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-[800]', sm.tone)}>{sm.label}</span>
                        </div>
                        <div className="mt-1.5 flex gap-1.5">
                          <div className="flex-1 rounded-md bg-bdrbg px-2 py-1"><div className="text-[9px] font-[800] uppercase tracking-wide text-gray">When</div><div className="text-[11px] text-mid-text">{a.trigger.split('—')[0].trim()}</div></div>
                          <div className="flex-1 rounded-md bg-success/8 px-2 py-1"><div className="text-[9px] font-[800] uppercase tracking-wide text-gray">Then</div><div className="text-[11px] text-success">{m.action}</div></div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
                        {isManager ? (
                          a.status === 'setup'
                            ? <button onClick={() => setStatusFor(a, 'live')} className="rounded-md bg-navy/8 px-2.5 py-1 text-[10.5px] font-[800] text-navy">Activate</button>
                            : <Toggle size="sm" checked={a.status === 'live'} onChange={n => setStatusFor(a, n ? 'live' : 'paused')} />
                        ) : <span className={cn('h-2 w-2 rounded-full', sm.dot)} />}
                        <ChevronDownIcon size={14} className={cn('text-gray transition-transform', isOpen && 'rotate-180')} onClick={() => setOpenId(isOpen ? null : a.id)} />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-border px-3.5 pb-4 pt-3.5" onClick={e => e.stopPropagation()}>
                        <div className="mb-3 flex gap-2"><InfoIcon size={14} className="mt-0.5 shrink-0 text-teal" /><p className="text-[12.5px] leading-relaxed text-mid-text"><span className="font-[700] text-dark-text">Why this matters: </span>{m.why}</p></div>

                        <div className="mb-3 rounded-xl bg-teal/[0.06] p-3">
                          <div className="flex flex-wrap gap-4">
                            <div><div className="text-[20px] font-[900] text-teal">{m.impactStat}</div><div className="text-[11px] text-mid-text">{m.impactLabel}</div></div>
                            <div className="w-px bg-teal/20" />
                            <div><div className="text-[20px] font-[900] text-teal">{m.hrsWeek}h<span className="text-[12px] font-[600]">/wk</span></div><div className="text-[11px] text-mid-text">saved · ~{m.hrsWeek * 52}h/yr back</div></div>
                          </div>
                          <div className="mt-1.5 text-[10px] italic text-gray">Source: {m.source}</div>
                        </div>

                        <div className="mb-3">
                          <div className="mb-1.5 text-[10px] font-[800] uppercase tracking-wide text-gray">Tool stack</div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.tools.map(t => (
                              <span key={t.name} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-mid-text">
                                <IntegrationIcon size={11} className={t.connected ? 'text-success' : 'text-gray'} />{t.name}
                                <span className={cn('h-1.5 w-1.5 rounded-full', t.connected ? 'bg-success' : 'bg-border')} />
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[800] uppercase tracking-wide text-gray"><SettingsIcon size={11} /> Configuration</div>
                          <div className="rounded-xl bg-bdrbg px-3">
                            {m.config.map(f => <ConfigRow key={f.key} field={f} value={cfg[a.id]?.[f.key]} onChange={onConfig} />)}
                          </div>
                        </div>

                        <button onClick={() => import('@/lib/coachBus').then(({ askCoach }) => askCoach(`Walk me through setting up the "${a.name}" automation for my ConsumerDirect Co-Brand PLUS+ Growth OS using ${m.tools.map(t => t.name).join(' + ')}. Give exact setup steps for each tool and what to test first.`))}
                          className="flex w-full items-center justify-between rounded-lg bg-teal/[0.08] px-4 py-2.5 text-[12px] font-[700] text-teal">
                          <span>Walk me through setup with AI</span><ArrowRightIcon size={13} />
                        </button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-border bg-bdrbg p-3">
            <LinkIcon size={13} className="mt-0.5 shrink-0 text-gray" />
            <p className="text-[11.5px] leading-relaxed text-gray">Tool connections shown here are the target integrations. Where a tool isn&rsquo;t connected yet, the automation is built and ready — it activates the moment that integration is live. Manager access is required to change an automation&rsquo;s status.</p>
          </div>
        </>
      )}
    </div>
  )
}
