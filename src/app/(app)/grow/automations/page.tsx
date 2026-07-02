// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Automations — the operational layer, framed as workflows (NOT agents). Each
// row is a when→then automation: the trigger, the action it performs, a
// researched ROI, live tool-connection status, and the handful of settings a
// manager tunes. The agent WORKFORCE that runs these lives in the AI Team tab
// (the org chart); this tab is purely "what runs, and what it's wired to."
// Status writes to the team-scoped `automations` table (RLS-gated to managers);
// config persists per-user in module_progress.

import { useState } from 'react'
import { Card, Skeleton, Toggle, Badge, toast } from '@/components/ui'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowthSlimHeader } from '@/components/growth/GrowthChrome'
import { LightningIcon, ClockIcon, ChartRisingIcon, ChevronDownIcon, PlusIcon, ArrowRightIcon, TargetIcon, IntegrationIcon, SettingsIcon, InfoIcon, LinkIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { AUTOMATION_META } from '@/lib/modules/growth-os/automationMeta'
import { STATUS_META, STATUS_MEANING, STATUS_NEXT } from '@/lib/modules/growth-os/roster'
import { cn } from '@/lib/utils'

const CAT_LABEL: any = { funnel: 'Funnel', content: 'Content', retention: 'Retention', ops: 'Ops' }
const CAT_ORDER = ['funnel', 'content', 'retention', 'ops']

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
  const [pauseConfirmId, setPauseConfirmId] = useState<string | null>(null)
  const [statusInfoId, setStatusInfoId] = useState<string | null>(null)

  // Only agents with an operational meta appear as automations (the gate + tour
  // are shown on the AI Team tab, not here).
  const autos = (roster || []).filter(a => AUTOMATION_META[a.id])
  const cats = ['All', ...CAT_ORDER.filter(c => autos.some(a => a.category === c))]
  const catCount = (c: string) => autos.filter(a => a.category === c).length
  const filtered = autos.filter(a => (cat === 'All' || a.category === cat) && (!query || a.name.toLowerCase().includes(query.toLowerCase())))
  const grouped = cat === 'All'
    ? CAT_ORDER.filter(c => filtered.some(a => a.category === c)).map(c => ({ category: c, items: filtered.filter(a => a.category === c) }))
    : [{ category: cat, items: filtered }]
  const live = autos.filter(a => a.status === 'live')
  const moHoursSaved = live.reduce((s, a) => s + (AUTOMATION_META[a.id]?.moHoursSaved || 0), 0)
  const dollarValue = live.reduce((s, a) => s + (AUTOMATION_META[a.id]?.dollarValue || 0), 0)
  const setStatusFor = (agent, next) => setStatus(agent, next)
  const onConfig = (id, key, val) => saveCfg(p => ({ [id]: { ...(p[id] || {}), [key]: val } }))

  const requestPause = (agent) => setPauseConfirmId(agent.id)
  const confirmPause = (agent) => {
    setPauseConfirmId(null)
    setStatusFor(agent, 'paused')
    toast.show({ variant: 'info', title: `${AUTOMATION_META[agent.id].action} paused`, action: { label: 'Undo', onClick: () => setStatusFor(agent, 'live') } })
  }

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthSlimHeader title="Automations" subtitle={`${live.length}/${autos.length} running for you`} />
      <GrowthTabs />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* ROI summary — real totals from the automations actually live right now */}
          <Card className="bg-navy !p-4 text-white">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="flex items-center justify-center gap-1 text-[20px] font-[900]"><ClockIcon size={15} />{moHoursSaved.toFixed(1).replace('.0', '')}h/mo</div><div className="mt-0.5 text-[10.5px] text-white/70">manual work removed, live</div></div>
              <div><div className="flex items-center justify-center gap-1 text-[20px] font-[900]"><ChartRisingIcon size={15} />${dollarValue.toLocaleString()}</div><div className="mt-0.5 text-[10.5px] text-white/70">in time value/mo, at $50/hr</div></div>
              <div><div className="flex items-center justify-center gap-1 text-[20px] font-[900]"><LightningIcon size={15} />{live.length}/{autos.length}</div><div className="mt-0.5 text-[10.5px] text-white/70">automations working for you</div></div>
            </div>
            <div className="mt-2.5 border-t border-white/15 pt-2 text-center text-[10px] text-white/60">Based on {live.length} active automation{live.length === 1 ? '' : 's'} · updates live as you turn more on</div>
          </Card>

          {/* Filters — with real counts per category */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {cats.map(c => (
                <button key={c} onClick={() => setCat(c)} className={cn('rounded-full border px-3 py-1 text-[11.5px] font-[700]', cat === c ? 'border-navy bg-navy text-white' : 'border-border text-gray hover:text-navy-ink')}>{c === 'All' ? `All (${autos.length})` : `${CAT_LABEL[c]} (${catCount(c)})`}</button>
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
            <div className="space-y-4">
              {grouped.map(g => (
                <div key={g.category} className="space-y-2">
                  {cat === 'All' && <div className="sticky top-[52px] z-[5] -mx-0.5 bg-bdrbg/95 px-0.5 py-1 text-[10px] font-[800] uppercase tracking-wide text-gray backdrop-blur">{CAT_LABEL[g.category]} <span className="text-gray/60">({g.items.length})</span></div>}
                  {g.items.map(a => {
                    const m = AUTOMATION_META[a.id]
                    const isOpen = openId === a.id
                    const sm = STATUS_META[a.status]
                    const confirmingPause = pauseConfirmId === a.id
                    return (
                      <Card key={a.id} className={cn('overflow-hidden !p-0', a.status !== 'live' && 'opacity-95')}>
                        <div className="flex cursor-pointer items-start gap-3 p-3.5" onClick={() => setOpenId(isOpen ? null : a.id)}>
                          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.status === 'live' ? 'bg-teal/10 text-teal' : 'bg-bdrbg text-gray')}><LightningIcon size={18} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[13.5px] font-[800] text-dark-text">{m.action}</span>
                              <button onClick={e => { e.stopPropagation(); setStatusInfoId(statusInfoId === a.id ? null : a.id) }} className={cn('rounded-full px-2 py-0.5 text-[10px] font-[800]', sm.tone)}>{sm.label}</button>
                            </div>
                            <p className="mt-1 text-[12px] leading-relaxed text-mid-text">{m.cardDescription}</p>
                            <div className="mt-1.5 text-[11px] font-[600] text-teal">Saves ~{m.moHoursSaved}h/mo · ~${m.dollarValue}/mo in time value</div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
                            {isManager ? (
                              a.status === 'setup' ? (
                                <div className="text-right">
                                  <button onClick={() => setOpenId(a.id)} className="rounded-md bg-teal px-2.5 py-1.5 text-[11px] font-[800] text-white">Set up now →</button>
                                  <div className="mt-0.5 text-[9.5px] text-gray">2 steps · ~5 min</div>
                                </div>
                              ) : (
                                <Toggle size="sm" checked={a.status === 'live'} onChange={n => n ? setStatusFor(a, 'live') : requestPause(a)} />
                              )
                            ) : <span className={cn('h-2 w-2 rounded-full', sm.dot)} />}
                            <ChevronDownIcon size={14} className={cn('text-gray transition-transform', isOpen && 'rotate-180')} onClick={() => setOpenId(isOpen ? null : a.id)} />
                          </div>
                        </div>

                        {statusInfoId === a.id && (
                          <div className="flex items-start gap-2 border-t border-border bg-bdrbg px-3.5 py-2.5" onClick={e => e.stopPropagation()}>
                            <span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', sm.dot)} />
                            <div className="min-w-0 flex-1 text-[11.5px] leading-relaxed">
                              <span className="font-[800] text-dark-text">{sm.label}: </span>
                              <span className="text-mid-text">{STATUS_MEANING[a.status]} {STATUS_NEXT[a.status]}</span>
                            </div>
                            <button onClick={() => setStatusInfoId(null)} className="shrink-0 text-[11px] font-[700] text-gray">Close</button>
                          </div>
                        )}

                        {confirmingPause && (
                          <div className="flex items-center gap-2 border-t border-border bg-error/[0.06] px-3.5 py-2.5" onClick={e => e.stopPropagation()}>
                            <InfoIcon size={13} className="shrink-0 text-error" />
                            <span className="min-w-0 flex-1 text-[11.5px] font-[600] text-error">Pause {m.action}? Leads will stop being handled automatically.</span>
                            <button onClick={() => setPauseConfirmId(null)} className="shrink-0 rounded-md px-2 py-1 text-[11px] font-[700] text-gray">Cancel</button>
                            <button onClick={() => confirmPause(a)} className="shrink-0 rounded-md bg-error px-2.5 py-1 text-[11px] font-[800] text-white">Pause it</button>
                          </div>
                        )}

                        {isOpen && (
                          <div className="border-t border-border px-3.5 pb-4 pt-3.5" onClick={e => e.stopPropagation()}>
                            <div className="mb-3 flex gap-2"><InfoIcon size={14} className="mt-0.5 shrink-0 text-teal" /><p className="text-[12.5px] leading-relaxed text-mid-text"><span className="font-[700] text-dark-text">Why this matters: </span>{m.why}</p></div>

                            <div className="mb-3 rounded-xl bg-teal/[0.06] p-3">
                              <div className="flex flex-wrap gap-4">
                                <div><div className="text-[20px] font-[900] text-teal">{m.impactStat}</div><div className="text-[11px] text-mid-text">{m.impactLabel}</div></div>
                                <div className="w-px bg-teal/20" />
                                <div><div className="text-[20px] font-[900] text-teal">{m.moHoursSaved}h<span className="text-[12px] font-[600]">/mo</span></div><div className="text-[11px] text-mid-text">saved · ~${m.dollarValue}/mo in time value</div></div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 border-t border-teal/15 pt-2 text-[10.5px] text-mid-text">
                                <span>{m.minPerRun} min saved/run</span><span>·</span><span>~{m.runsPerMo} runs/mo</span>
                              </div>
                              <div className="mt-1.5 text-[10px] italic text-gray">Source: {m.source}</div>
                            </div>

                            <div className="mb-3">
                              <div className="mb-1.5 text-[10px] font-[800] uppercase tracking-wide text-gray">When → Then</div>
                              <div className="flex gap-1.5">
                                <div className="flex-1 rounded-md bg-bdrbg px-2 py-1"><div className="text-[9px] font-[800] uppercase tracking-wide text-gray">When</div><div className="text-[11px] text-mid-text">{a.trigger.split('—')[0].trim()}</div></div>
                                <div className="flex-1 rounded-md bg-success/8 px-2 py-1"><div className="text-[9px] font-[800] uppercase tracking-wide text-gray">Then</div><div className="text-[11px] text-success">{m.action}</div></div>
                              </div>
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

                            <button onClick={() => import('@/lib/coachBus').then(({ askCoach }) => askCoach(`Walk me through setting up the "${m.action}" automation for my ConsumerDirect Co-Brand PLUS+ partner motion using ${m.tools.map(t => t.name).join(' + ')}. Give exact setup steps for each tool and what to test first.`))}
                              className="flex w-full items-center justify-between rounded-lg bg-teal/[0.08] px-4 py-2.5 text-[12px] font-[700] text-teal">
                              <span>Walk me through setup with AI</span><ArrowRightIcon size={13} />
                            </button>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-border bg-bdrbg p-3">
            <LinkIcon size={13} className="mt-0.5 shrink-0 text-gray" />
            <p className="text-[11.5px] leading-relaxed text-gray">Some automations require tool connections. <button onClick={() => setOpenId(filtered.find(a => a.status !== 'live' && (AUTOMATION_META[a.id]?.tools || []).some(t => !t.connected))?.id ?? filtered[0]?.id ?? null)} className="font-[700] text-teal underline-offset-2 hover:underline">See what&rsquo;s needed →</button> Manager access is required to change an automation&rsquo;s status.</p>
          </div>
        </>
      )}
    </div>
  )
}
