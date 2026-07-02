// @ts-nocheck
'use client'

// The living org chart — the AI company rendered like a real organization: a
// C-suite leadership band up top, then a department "pod" for every team, each a
// left-spine tree of its lead(s) and the people who report to them. Avatars
// blink and breathe; agents that are working right now glow with a live-presence
// ring; nodes rise in on mount and lift on hover. Tap anyone to open their full
// profile. Robust to any head-count (no fragile absolute-positioned lines).

import { AgentAvatar } from './AgentAvatar'
import { computeAgentRoi } from '@/lib/agents/types'
import { CoinIcon } from '@/components/icons'

const DEPT_LABEL: Record<string, string> = {
  exec: 'Executive', marketing: 'Marketing', funnel: 'Lead Funnel',
  partner: 'Partner Success', ops: 'Ops & Quality', compliance: 'Compliance', memory: 'Memory',
}
const DEPT_ORDER = ['marketing', 'funnel', 'partner', 'compliance', 'ops', 'memory']
const DEPT_ACCENT: Record<string, string> = {
  marketing: '#8B5CF6', funnel: '#0EA5B7', partner: '#16A34A',
  compliance: '#E0682F', ops: '#64748B', memory: '#4F56C9', exec: '#C79A3A',
}

export function OrgChart({ reg, statusOf, hourlyRate, onOpen }: any) {
  const agents = reg.agents
  const isLive = (a: any) => statusOf(a) === 'live'
  const leaders = agents.filter((a: any) => a.role?.tier === 1)
    .sort((a: any, b: any) => (a.id === 'ceo' ? -1 : b.id === 'ceo' ? 1 : 0))

  // One pod per department, from its non-exec members (tier 2 leads + tier 3 crew).
  const pods = DEPT_ORDER.map(dept => {
    const members = agents.filter((a: any) => a.role?.department === dept && a.role?.tier > 1)
    const leads = members.filter((a: any) => a.role?.tier === 2)
    const crew = members.filter((a: any) => a.role?.tier === 3)
    return { dept, leads, crew, count: members.length, liveCount: members.filter(isLive).length }
  }).filter(p => p.count > 0)

  return (
    <div className="space-y-5">
      {/* ── C-suite leadership band ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-navy/15 bg-gradient-to-b from-navy/[0.06] to-transparent p-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(199,154,58,0.12),transparent)]" />
        <div className="relative mb-3 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold/50" />
          <span className="text-[10px] font-[900] uppercase tracking-[0.2em] text-[#A6801F]">Leadership</span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold/50" />
        </div>
        <div className="relative flex flex-wrap items-start justify-center gap-2.5">
          {leaders.map((a: any, i: number) => {
            const emph = a.id === 'ceo'
            return (
              <button key={a.id} onClick={() => onOpen(a.id)}
                className="org-rise group flex w-[128px] flex-col items-center rounded-xl border border-border bg-card p-2.5 text-center shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-navy/30 hover:shadow-modal"
                style={{ animationDelay: `${i * 45}ms` }}>
                <AgentAvatar agent={a} size={emph ? 56 : 48} live={isLive(a)} float={isLive(a)} />
                <div className="mt-1.5 truncate w-full text-[12px] font-[900] text-dark-text">{a.fullName}</div>
                <div className="truncate w-full text-[9.5px] font-[700] uppercase tracking-wide text-gray">{a.role?.title}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* trunk from leadership down into the org */}
      <div className="flex justify-center"><span className="h-4 w-px bg-gradient-to-b from-navy/25 to-transparent" /></div>

      {/* ── Department pods ─────────────────────────────────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-2">
        {pods.map((p, pi) => {
          const accent = DEPT_ACCENT[p.dept]
          return (
            <div key={p.dept} className="org-rise rounded-2xl border border-border bg-card p-3.5 shadow-card" style={{ animationDelay: `${120 + pi * 60}ms` }}>
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                  <span className="text-[12px] font-[900] uppercase tracking-wide text-dark-text">{DEPT_LABEL[p.dept]}</span>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-[700] text-gray">
                  <span className={p.liveCount ? 'text-teal' : ''}>{p.liveCount} live</span> · {p.count}
                </span>
              </div>

              {/* left-spine tree */}
              <div className="relative pl-4">
                <span className="absolute left-1 top-1 bottom-1 w-px" style={{ background: `linear-gradient(${accent}66, ${accent}18)` }} />

                {p.leads.map((a: any) => (
                  <SpineNode key={a.id} agent={a} accent={accent} live={isLive(a)} lead
                    roi={computeAgentRoi(a, hourlyRate)} onOpen={onOpen} />
                ))}

                {p.crew.length > 0 && (
                  <div className="relative mt-1">
                    <span className="absolute -left-3 top-3 h-px w-3" style={{ background: accent, opacity: 0.5 }} />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.crew.map((a: any) => (
                        <button key={a.id} onClick={() => onOpen(a.id)} title={`${a.fullName} · ${a.role?.title}`}
                          className="group flex items-center gap-1.5 rounded-full border border-border bg-bdrbg/60 py-1 pl-1 pr-2.5 transition-all hover:-translate-y-0.5 hover:border-navy/30 hover:bg-card">
                          <AgentAvatar agent={a} size={26} live={isLive(a)} ring={false} />
                          <span className="text-[11px] font-[700] text-dark-text">{a.firstName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// A single node hanging off the department spine — the lead(s) of a pod.
function SpineNode({ agent, accent, live, roi, onOpen }: any) {
  return (
    <div className="relative mb-1.5">
      <span className="absolute -left-3 top-1/2 h-px w-3" style={{ background: accent, opacity: 0.55 }} />
      <button onClick={() => onOpen(agent.id)}
        className="group flex w-full items-center gap-2.5 rounded-xl border border-border bg-bdrbg/50 p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:bg-card hover:shadow-card">
        <AgentAvatar agent={agent} size={40} live={live} float={live} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-[800] text-dark-text">{agent.fullName}</div>
          <div className="truncate text-[10px] font-[700] uppercase tracking-wide text-gray">{agent.role?.title}</div>
        </div>
        <span className="flex shrink-0 items-center gap-0.5 text-[10.5px] font-[800] text-teal"><CoinIcon size={10} />${roi.dollarsPerMo.toLocaleString()}</span>
      </button>
    </div>
  )
}
