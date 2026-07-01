// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Cortex — AI Team. The 18-agent roster that runs the partner motion. Each
// card IS the implementation spec: the real, copyable system prompt, its
// trigger, tool stack, build steps and handoff contract. Live state comes from
// the team-scoped `automations` table (RLS: team reads; managers flip status).
// Claude is the reasoning layer for every agent; external tools appear only for
// the one thing Claude can't do (send an SMS, write a CRM field, hold a slot).

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Skeleton, Badge } from '@/components/ui'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowthChrome } from '@/components/growth/GrowthChrome'
import { NoteButton } from '@/components/growth/NoteButton'
import { GrowIcon, IntegrationIcon, LockIcon, InfoIcon, CopyIcon, CheckIcon, ChevronDownIcon, ArrowRightIcon, TargetIcon, LightningIcon, BookIcon, CoinIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { CATEGORIES, STATUS_META, MASTER_SETUP_PROMPT, monthlyCost } from '@/lib/modules/growth-os/roster'
import { cn } from '@/lib/utils'

const STATUSES = ['live', 'setup', 'paused'] as const

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
      <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[800]', m.tone)}>
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
          <button key={s} onClick={() => !active && onSet(agent, s)} style={{ minHeight: 26 }}
            className={cn('rounded-md px-2 py-1 text-[11px] font-[800] capitalize transition-colors', active ? cn('bg-card shadow-sm', m.tone.split(' ')[0]) : 'text-gray hover:text-dark-text')}>
            {s === 'setup' ? 'Setup' : s}
          </button>
        )
      })}
    </div>
  )
}

function AgentCard({ agent, isManager, onSet, isOpen, onToggle, overrides = [] }: any) {
  const { copied, copy } = useCopied()
  // Approved feedback tuning actually extends the prompt the team copies — this is
  // where the improvement loop closes, not a relabel.
  const tuning = [...overrides].sort((a, b) => a.version - b.version)
  const effPrompt = tuning.length
    ? `${agent.systemPrompt}\n\nTEAM TUNING (approved from rep feedback):\n${tuning.map(o => `- v${o.version}: ${o.addendum}`).join('\n')}`
    : agent.systemPrompt
  return (
    <Card className={cn('overflow-hidden !p-0 transition-opacity', agent.status === 'paused' && 'opacity-75')}>
      <div className="flex cursor-pointer items-start gap-3 p-3.5" onClick={onToggle}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[14px] font-[800] text-dark-text">{agent.name}</span>
            <StatusControl agent={agent} isManager={isManager} onSet={onSet} />
            {tuning.length > 0 && <span className="rounded bg-teal/10 px-1.5 py-0.5 text-[10px] font-[800] text-teal" title="Extended by approved team feedback">Tuned v{tuning[tuning.length - 1].version}</span>}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-mid-text">{agent.job}</p>
        </div>
        <div onClick={e => e.stopPropagation()}><NoteButton compact entityType="agent" entityId={agent.id} label={agent.name} context={agent.tagline} /></div>
        <ChevronDownIcon size={16} className={cn('mt-1 shrink-0 text-gray transition-transform', isOpen && 'rotate-180')} />
      </div>

      {isOpen && (
        <div className="border-t border-border px-3.5 pb-4 pt-3.5" onClick={e => e.stopPropagation()}>
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
          <div className={cn(agent.handoffTo.length > 0 && 'mb-3')}>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[800] uppercase tracking-wide text-gray"><BookIcon size={11} /> How to build this</div>
            <ol className="list-decimal space-y-1 pl-4">
              {agent.buildSteps.map((s: string, i: number) => <li key={i} className="text-[12px] leading-relaxed text-mid-text">{s}</li>)}
            </ol>
          </div>

          {/* Handoffs */}
          {agent.handoffTo.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <ArrowRightIcon size={12} className="text-gray" />
              <span className="text-[10.5px] text-gray">Hands off to:</span>
              {agent.handoffTo.map((id: string) => <Badge key={id} className="!bg-navy/8 !text-navy !text-[10.5px]">{id}</Badge>)}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function GrowthTeamPage() {
  const { loading, isManager, roster, liveCount, setStatus } = useGrowthOS()
  const [openId, setOpenId] = useState<string | null>(null)
  const { copied, copy } = useCopied()
  const cost = monthlyCost(roster)

  // Approved instruction overrides (from the feedback loop), grouped by agent —
  // read by every team member (RLS aio_team_read) and appended to prompts.
  const [ovByAgent, setOvByAgent] = useState<Record<string, any[]>>({})
  useEffect(() => {
    const supabase = createClient()
    supabase.from('agent_instruction_overrides').select('id, agent_id, addendum, version, created_at').then(({ data }) => {
      const g: Record<string, any[]> = {}
      for (const o of data ?? []) (g[o.agent_id] ??= []).push(o)
      setOvByAgent(g)
    })
  }, [])

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthChrome />
      <GrowthTabs />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* Master setup prompt — copy into a fresh Claude chat to build all 18 */}
          <Card className="!border-none bg-navy !p-5 text-white">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12"><IntegrationIcon size={20} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-[800]">Start here: your setup guide</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/75">Copy this prompt into a brand-new Claude conversation, and Claude will walk you through configuring all 18 agents in the right order — asking what you have access to, guiding each step, and testing before moving on.</p>
              </div>
              <button onClick={() => copy(MASTER_SETUP_PROMPT)} className={cn('flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-[700]', copied ? 'bg-success text-white' : 'bg-white text-navy')}>
                {copied ? <><CheckIcon size={14} /> Copied — paste into a new chat</> : <><CopyIcon size={14} /> Copy Setup Prompt</>}
              </button>
            </div>
          </Card>

          {/* Health + cost summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="!p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal/10 text-teal"><IntegrationIcon size={20} /></span>
                <div className="min-w-0">
                  <div className="text-[14px] font-[800] text-dark-text">{liveCount} of {roster.length} live</div>
                  <div className="text-[11.5px] text-gray">{isManager ? 'Tap a status to run the roster' : 'Managed by your team lead'}</div>
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

          <div className="flex items-start gap-2 rounded-xl bg-teal/[0.06] p-3">
            <InfoIcon size={14} className="mt-0.5 shrink-0 text-teal" />
            <p className="text-[11.5px] leading-relaxed text-mid-text"><span className="font-[700] text-dark-text">How to read this:</span> Claude is the brain behind every agent — it reads the situation and decides what to write or do. The other tools are only for the one thing Claude can't: sending a text, writing a CRM field, holding a calendar slot. Open any agent to see its exact system prompt and how to build it for real.</p>
          </div>

          {CATEGORIES.map(cat => {
            const agents = roster.filter(a => a.category === cat.key)
            const live = agents.filter(a => a.status === 'live').length
            return (
              <div key={cat.key}>
                <div className="mb-2 flex items-center justify-between px-0.5">
                  <div>
                    <h2 className="text-[13px] font-[800] uppercase tracking-wide text-navy">{cat.label} <span className="text-gray">({live}/{agents.length} live)</span></h2>
                    <p className="text-[11px] text-gray">{cat.blurb}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {agents.map(a => (
                    <AgentCard key={a.id} agent={a} isManager={isManager} onSet={setStatus} isOpen={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} overrides={ovByAgent[a.id] || []} />
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
