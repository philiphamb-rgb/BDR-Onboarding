// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// AI Team — the agent WORKFORCE, drawn as an org chart. This is deliberately
// NOT the Automations tab: Automations shows the trigger->action workflows that
// run; this shows the *agents* — who they are, where they sit in the hierarchy
// (reporting lines), and who they hand work to (the communication map). Click
// any agent to open its full spec (role, what it looks for, system prompt, build
// steps). Managers can flip an agent live/setup/paused inline.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Skeleton, Badge } from '@/components/ui'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowthChrome } from '@/components/growth/GrowthChrome'
import { NoteButton } from '@/components/growth/NoteButton'
import { IntegrationIcon, InfoIcon, CopyIcon, CheckIcon, ChevronDownIcon, ArrowRightIcon, TargetIcon, LightningIcon, BookIcon, CoinIcon, UserIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { STATUS_META, MASTER_SETUP_PROMPT, monthlyCost, ROSTER_BY_ID } from '@/lib/modules/growth-os/roster'
import { ORG, PRINCIPAL, DIVISIONS, directReports } from '@/lib/modules/growth-os/orgChart'
import { cn } from '@/lib/utils'

const STATUSES = ['live', 'setup', 'paused'] as const
const shortName = (n: string) => (n || '').replace(/ Agent$/, '')

function useCopied() {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }
  return { copied, copy }
}

function StatusControl({ agent, isManager, onSet }: any) {
  if (!isManager) {
    const m = STATUS_META[agent.status]
    return (
      <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-[800]', m.tone)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', m.dot, agent.status === 'live' && 'animate-breathe')} />{m.label}
      </span>
    )
  }
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-border bg-bdrbg p-0.5" role="group" aria-label={`${agent.name} status`}>
      {STATUSES.map(s => {
        const active = agent.status === s
        const m = STATUS_META[s]
        return (
          <button key={s} onClick={(e) => { e.stopPropagation(); !active && onSet(agent, s) }} style={{ minHeight: 24 }}
            className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-[800] capitalize transition-colors', active ? cn('bg-card shadow-sm', m.tone.split(' ')[0]) : 'text-gray hover:text-dark-text')}>
            {s === 'setup' ? 'Setup' : s}
          </button>
        )
      })}
    </div>
  )
}

// One agent, as an org-chart node. Collapsed: identity + status + one-liner +
// who it hands work to. Expanded: the full spec (role, what it looks for, ROI,
// trigger, system prompt, tools, build steps).
function AgentNode({ agent, orgTitle, isManager, onSet, isOpen, onToggle, overrides = [], accent = 'navy' }: any) {
  const { copied, copy } = useCopied()
  const tuning = [...overrides].sort((a, b) => a.version - b.version)
  const effPrompt = tuning.length
    ? `${agent.systemPrompt}\n\nTEAM TUNING (approved from rep feedback):\n${tuning.map(o => `- v${o.version}: ${o.addendum}`).join('\n')}`
    : agent.systemPrompt
  const handoffs = (agent.handoffTo || []).map((id: string) => shortName(ROSTER_BY_ID[id]?.name)).filter(Boolean)
  const dot = STATUS_META[agent.status].dot
  return (
    <Card className={cn('overflow-hidden !p-0 transition-all', agent.status === 'paused' && 'opacity-70')}>
      <div className="cursor-pointer p-3" onClick={onToggle}>
        <div className="flex items-start gap-2">
          <span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', dot, agent.status === 'live' && 'animate-breathe')} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[13px] font-[800] text-dark-text">{shortName(agent.name)}</span>
              {tuning.length > 0 && <span className="shrink-0 rounded bg-teal/10 px-1 text-[9px] font-[800] text-teal" title="Extended by approved team feedback">v{tuning[tuning.length - 1].version}</span>}
            </div>
            {orgTitle && <div className="text-[10.5px] font-[700] uppercase tracking-wide text-gray">{orgTitle}</div>}
          </div>
          <div onClick={e => e.stopPropagation()} className="shrink-0"><StatusControl agent={agent} isManager={isManager} onSet={onSet} /></div>
          <ChevronDownIcon size={14} className={cn('mt-0.5 shrink-0 text-gray transition-transform', isOpen && 'rotate-180')} />
        </div>
        <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-mid-text">{agent.tagline}</p>
        {handoffs.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <ArrowRightIcon size={10} className="text-teal" />
            <span className="text-[9.5px] font-[700] uppercase tracking-wide text-gray">Hands to</span>
            {handoffs.map((n: string) => <span key={n} className="rounded bg-teal/10 px-1.5 py-0.5 text-[10px] font-[700] text-teal">{n}</span>)}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="border-t border-border px-3 pb-4 pt-3" onClick={e => e.stopPropagation()}>
          <div className="mb-1.5 flex items-center gap-1.5"><NoteButton compact entityType="agent" entityId={agent.id} label={agent.name} context={agent.tagline} /></div>
          {/* What it does + what it looks for */}
          {agent.details?.length > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[800] uppercase tracking-wide text-gray"><LightningIcon size={11} /> What it does &amp; what it looks for</div>
              <ul className="space-y-1.5">
                {agent.details.map((d: string, i: number) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-mid-text"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-teal" /><span>{d}</span></li>
                ))}
              </ul>
            </div>
          )}
          {/* ROI */}
          <div className="mb-3 flex gap-2 rounded-xl bg-teal/[0.06] p-3">
            <TargetIcon size={14} className="mt-0.5 shrink-0 text-teal" />
            <p className="text-[12px] leading-relaxed text-mid-text">{agent.roi}</p>
          </div>
          {/* Trigger */}
          <div className="mb-3 rounded-xl bg-bdrbg p-3">
            <div className="text-[10px] font-[800] uppercase tracking-wide text-gray">Trigger</div>
            <div className="mt-0.5 text-[12px] text-dark-text">{agent.trigger}</div>
          </div>
          {/* System prompt */}
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-[800] uppercase tracking-wide text-gray">System prompt{tuning.length > 0 ? ' — incl. team tuning' : ' — ready to use as-is'}</span>
              <button onClick={() => copy(effPrompt)} className={cn('flex items-center gap-1 text-[11px] font-[700]', copied ? 'text-success' : 'text-teal')}>
                {copied ? <><CheckIcon size={12} /> Copied</> : <><CopyIcon size={12} /> Copy</>}
              </button>
            </div>
            <pre className="max-h-64 overflow-y-auto rounded-xl bg-[#0C1929] p-3 text-[11px] leading-relaxed text-[#DDE8F6] [font-family:ui-monospace,monospace] whitespace-pre-wrap">{effPrompt}</pre>
          </div>
          {/* Tools */}
          <div className="mb-3">
            <div className="mb-1.5 text-[10px] font-[800] uppercase tracking-wide text-gray">Tools needed</div>
            <div className="flex flex-wrap gap-1.5">
              {agent.tools.map((t: string) => <Badge key={t} className="!bg-bdrbg !text-mid-text !text-[10.5px]">{t}</Badge>)}
              <Badge className="!bg-gold/10 !text-[#A06C00] !text-[10.5px]"><CoinIcon size={10} className="mr-0.5 inline" />~${agent.costPerMo}/mo</Badge>
            </div>
          </div>
          {/* Build steps */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[800] uppercase tracking-wide text-gray"><BookIcon size={11} /> How to build this</div>
            <ol className="list-decimal space-y-1 pl-4">
              {agent.buildSteps.map((s: string, i: number) => <li key={i} className="text-[12px] leading-relaxed text-mid-text">{s}</li>)}
            </ol>
          </div>
        </div>
      )}
    </Card>
  )
}

// A short vertical reporting connector between org tiers.
const Connector = ({ h = 20 }: { h?: number }) => <div className="mx-auto w-px bg-border" style={{ height: h }} aria-hidden="true" />

export default function GrowthTeamPage() {
  const { loading, isManager, roster, liveCount, setStatus } = useGrowthOS()
  const [openId, setOpenId] = useState<string | null>(null)
  const { copied, copy } = useCopied()
  const cost = monthlyCost(roster || [])

  const [ovByAgent, setOvByAgent] = useState<Record<string, any[]>>({})
  useEffect(() => {
    const supabase = createClient()
    supabase.from('agent_instruction_overrides').select('id, agent_id, addendum, version, created_at').then(({ data, error }) => {
      if (error) return
      const g: Record<string, any[]> = {}
      for (const o of data ?? []) (g[o.agent_id] ??= []).push(o)
      setOvByAgent(g)
    })
  }, [])

  const byId = Object.fromEntries((roster || []).map(a => [a.id, a]))
  const nodeProps = (id: string) => {
    const agent = byId[id]
    if (!agent) return null
    return { agent, orgTitle: ORG[id]?.title, isManager, onSet: setStatus, isOpen: openId === id, onToggle: () => setOpenId(openId === id ? null : id), overrides: ovByAgent[id] || [] }
  }
  const Node = ({ id }: { id: string }) => { const p = nodeProps(id); return p ? <AgentNode {...p} /> : null }

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthChrome />
      <GrowthTabs />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* Master setup prompt — build the whole team in the right order */}
          <Card className="!border-none bg-navy !p-5 text-white">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12"><IntegrationIcon size={20} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-[800]">Build the whole team</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/75">Copy this into a new Claude conversation and it will walk you through configuring all 18 agents in the right order — asking what you have access to, guiding each step, testing before moving on.</p>
              </div>
              <button onClick={() => copy(MASTER_SETUP_PROMPT)} className={cn('flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-[700]', copied ? 'bg-success text-white' : 'bg-card text-navy')}>
                {copied ? <><CheckIcon size={14} /> Copied</> : <><CopyIcon size={14} /> Copy Setup Prompt</>}
              </button>
            </div>
          </Card>

          {/* Health + cost + legend */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="!p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal/10 text-teal"><IntegrationIcon size={20} /></span>
                <div className="min-w-0">
                  <div className="text-[14px] font-[800] text-dark-text">{liveCount} of {roster?.length || 18} live</div>
                  <div className="text-[11.5px] text-gray">{isManager ? 'Tap a status to run the team' : 'Managed by your team lead'}</div>
                </div>
              </div>
            </Card>
            <Card className="!p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold/12 text-[#A06C00]"><CoinIcon size={20} /></span>
                <div className="min-w-0">
                  <div className="text-[14px] font-[800] text-dark-text">~${cost}<span className="text-[12px] font-[600] text-gray">/mo</span></div>
                  <div className="text-[11.5px] text-gray">Est. run cost, live agents</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-teal/[0.06] px-3 py-2.5 text-[11px] text-mid-text">
            <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-border" /> reporting line</span>
            <span className="flex items-center gap-1.5"><span className="rounded bg-teal/10 px-1.5 py-0.5 text-[10px] font-[700] text-teal">Hands to</span> passes work to</span>
            <span className="text-gray">Tap any agent to open its full spec + system prompt.</span>
          </div>

          {/* ── ORG CHART ────────────────────────────────────────────────── */}
          {/* Principal */}
          <div className="mx-auto max-w-sm">
            <Card className="!p-4 text-center">
              <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-hero text-white"><UserIcon size={20} /></span>
              <div className="text-[14px] font-[900] text-dark-text">{PRINCIPAL.title}</div>
              <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-gray">{PRINCIPAL.blurb}</p>
            </Card>
          </div>
          <Connector />

          {/* C-suite: report to you */}
          <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2">
            <Node id="daily-briefing" />
            <Node id="compliance-guardian" />
          </div>
          <Connector />

          {/* Divisions, each led by a VP with specialists reporting up */}
          <div className="space-y-5">
            {DIVISIONS.map(div => {
              const lead = Object.values(ORG).find(r => r.division === div.key && r.tier === 2)
              const specialists = directReports(lead?.id || '')
              return (
                <div key={div.key} className="rounded-2xl border border-border bg-bdrbg/40 p-3">
                  <div className="mb-2 flex items-center justify-between px-0.5">
                    <div>
                      <h2 className="text-[12px] font-[900] uppercase tracking-wide text-navy">{div.label}</h2>
                      <p className="text-[11px] text-gray">{div.blurb}</p>
                    </div>
                  </div>
                  {/* Division lead */}
                  {lead && <div className="mx-auto max-w-md"><Node id={lead.id} /></div>}
                  {specialists.length > 0 && (
                    <>
                      <Connector h={16} />
                      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        {specialists.map(id => <Node key={id} id={id} />)}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-navy/[0.04] p-3">
            <InfoIcon size={14} className="mt-0.5 shrink-0 text-navy" />
            <p className="text-[11.5px] leading-relaxed text-mid-text"><span className="font-[700] text-dark-text">Agents vs automations:</span> this tab is the team — who does the thinking and how they coordinate. The <span className="font-[700]">Automations</span> tab is the operational layer: the exact trigger-to-action workflows these agents run, with the tool connections and settings you switch on.</p>
          </div>
        </>
      )}
    </div>
  )
}
