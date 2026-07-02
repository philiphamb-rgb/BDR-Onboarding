// @ts-nocheck
'use client'

// The AI company, rendered like a world-class org — a designed command
// structure, not a list. A C-suite command bar (CEO on a pedestal, the rest of
// the executive team connected beneath on a drawn rail), then a division card
// per department: an accent-gradient header with live status + modeled monthly
// value, the department lead(s) pinned, and the crew as a refined tile grid.
// Portraits blink and breathe; live teammates glow; everything rises in on mount
// and lifts on hover. Tap anyone to open their full profile.

import { AgentAvatar } from './AgentAvatar'
import { computeAgentRoi } from '@/lib/agents/types'
import { CoinIcon } from '@/components/icons'

const DEPT: Record<string, { label: string; accent: string; grad: [string, string] }> = {
  marketing: { label: 'Marketing & Content', accent: '#8B5CF6', grad: ['#8B5CF6', '#6D28D9'] },
  funnel: { label: 'Lead Funnel', accent: '#0EA5B7', grad: ['#0EA5B7', '#0E7490'] },
  partner: { label: 'Partner Success', accent: '#16A34A', grad: ['#16A34A', '#15803D'] },
  compliance: { label: 'Compliance & Legal', accent: '#E0682F', grad: ['#EA7A3C', '#C2410C'] },
  ops: { label: 'Ops & Quality', accent: '#64748B', grad: ['#64748B', '#475569'] },
  memory: { label: 'Memory & Learning', accent: '#5560C4', grad: ['#6366F1', '#4338CA'] },
}
const DEPT_ORDER = ['marketing', 'funnel', 'partner', 'compliance', 'ops', 'memory']
const RAIL = 'linear-gradient(90deg, transparent, rgba(148,163,184,0.55) 12%, rgba(148,163,184,0.55) 88%, transparent)'

export function OrgChart({ reg, statusOf, hitlOf, hourlyRate, onOpen }: any) {
  const agents = reg.agents
  const isLive = (a: any) => statusOf(a) === 'live'
  const raises = (a: any) => isLive(a) && (hitlOf ? hitlOf(a) : a.hitlTier) === 'in-the-loop'
  const roiOf = (a: any) => computeAgentRoi(a, hourlyRate).dollarsPerMo

  const leaders = agents.filter((a: any) => a.role?.tier === 1)
  const ceo = leaders.find((a: any) => a.id === 'ceo') || leaders[0]
  const execs = leaders.filter((a: any) => a !== ceo)

  const pods = DEPT_ORDER.map(dept => {
    const members = agents.filter((a: any) => a.role?.department === dept && a.role?.tier > 1)
    return {
      dept,
      leads: members.filter((a: any) => a.role?.tier === 2),
      crew: members.filter((a: any) => a.role?.tier === 3),
      count: members.length,
      live: members.filter(isLive).length,
      value: members.reduce((s: number, a: any) => s + roiOf(a), 0),
    }
  }).filter(p => p.count > 0)

  return (
    <div className="space-y-5">
      {/* ── C-suite command bar ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-navy/15 bg-gradient-to-b from-[#101a30] to-[#0b1120] p-5 sm:p-7">
        {/* futuristic dotted grid + glow */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(199,154,58,0.22),transparent)]" />

        <div className="relative flex flex-col items-center">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/60" />
            <span className="text-[10px] font-[900] uppercase tracking-[0.28em] text-gold">The C-Suite</span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/60" />
          </div>

          {/* CEO pedestal */}
          {ceo && (
            <button onClick={() => onOpen(ceo.id)} className="org-rise group relative flex flex-col items-center">
              <span className="pointer-events-none absolute -inset-3 rounded-full bg-[radial-gradient(closest-side,rgba(199,154,58,0.25),transparent)]" />
              <span className="relative rounded-[30%] p-[3px] bg-gradient-to-b from-gold/70 to-gold/20 shadow-[0_10px_30px_-8px_rgba(199,154,58,0.5)] transition-transform duration-200 group-hover:-translate-y-1">
                <AgentAvatar agent={ceo} size={84} live={isLive(ceo)} float={isLive(ceo)} ring={false} raiseHand={raises(ceo)} />
              </span>
              <div className="mt-2 text-center">
                <div className="text-[15px] font-[900] text-white">{ceo.fullName}</div>
                <div className="text-[10px] font-[800] uppercase tracking-wide text-gold/90">{ceo.role?.title}</div>
              </div>
            </button>
          )}

          {/* rail down to the exec row */}
          {execs.length > 0 && (
            <>
              <span className="mt-3 h-5 w-px bg-white/25" />
              <div className="relative w-full">
                <div className="absolute left-[6%] right-[6%] top-0 h-px" style={{ background: RAIL }} />
                <div className="flex flex-nowrap justify-start gap-3 overflow-x-auto pt-5 sm:justify-center sm:flex-wrap">
                  {execs.map((a: any, i: number) => (
                    <div key={a.id} className="relative flex shrink-0 flex-col items-center">
                      <span className="absolute -top-5 h-5 w-px bg-white/20" />
                      <button onClick={() => onOpen(a.id)}
                        className="org-rise group w-[116px] rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 text-center backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.1]"
                        style={{ animationDelay: `${i * 45}ms` }}>
                        <AgentAvatar agent={a} size={52} live={isLive(a)} float={isLive(a)} raiseHand={raises(a)} className="mx-auto" />
                        <div className="mt-1.5 truncate text-[12px] font-[800] text-white">{a.fullName}</div>
                        <div className="truncate text-[9px] font-[700] uppercase tracking-wide text-white/55">{a.role?.title}</div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* connector into the divisions */}
      <div className="flex justify-center"><span className="h-4 w-px bg-gradient-to-b from-navy/25 to-transparent" /></div>

      {/* ── Divisions ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        {pods.map((p, pi) => {
          const d = DEPT[p.dept]
          return (
            <div key={p.dept} className="org-rise overflow-hidden rounded-2xl border border-border bg-card shadow-card" style={{ animationDelay: `${120 + pi * 70}ms` }}>
              {/* header */}
              <div className="relative px-4 py-3" style={{ background: `linear-gradient(100deg, ${d.grad[0]}, ${d.grad[1]})` }}>
                <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                <div className="relative flex items-center justify-between text-white">
                  <div className="text-[13.5px] font-[900] tracking-tight">{d.label}</div>
                  <div className="flex items-center gap-2 text-[10.5px] font-[800]">
                    <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${p.live ? 'bg-emerald-300 av-presence' : 'bg-white/60'}`} />{p.live} live
                    </span>
                    <span className="rounded-full bg-black/20 px-2 py-0.5">{p.count} agents</span>
                  </div>
                </div>
                <div className="relative mt-1 flex items-center gap-1 text-[11px] font-[800] text-white/90">
                  <CoinIcon size={11} /> ~${p.value.toLocaleString()}/mo modeled value
                </div>
              </div>

              {/* body */}
              <div className="p-3.5">
                {p.leads.length > 0 && (
                  <div className="mb-2.5 space-y-1.5">
                    {p.leads.map((a: any) => (
                      <button key={a.id} onClick={() => onOpen(a.id)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-border bg-bdrbg/40 p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/25 hover:bg-card hover:shadow-card">
                        <span className="relative rounded-[28%] p-[2px]" style={{ background: `linear-gradient(135deg, ${d.accent}, transparent)` }}>
                          <AgentAvatar agent={a} size={46} live={isLive(a)} float={isLive(a)} raiseHand={raises(a)} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-[900] text-dark-text">{a.fullName}</span>
                            <span className="rounded-full px-1.5 py-px text-[8.5px] font-[900] uppercase tracking-wide text-white" style={{ background: d.accent }}>Lead</span>
                          </div>
                          <div className="truncate text-[10.5px] font-[700] uppercase tracking-wide text-gray">{a.role?.title}</div>
                        </div>
                        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-[900]" style={{ color: d.accent }}><CoinIcon size={10} />${roiOf(a).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}

                {p.crew.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {p.crew.map((a: any) => (
                      <button key={a.id} onClick={() => onOpen(a.id)} title={`${a.fullName} · ${a.role?.title}`}
                        className="group flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/25 hover:shadow-card">
                        <AgentAvatar agent={a} size={34} live={isLive(a)} raiseHand={raises(a)} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11.5px] font-[800] text-dark-text">{a.firstName}</div>
                          <div className="truncate text-[9px] font-[600] uppercase tracking-wide text-gray">{a.role?.title}</div>
                        </div>
                      </button>
                    ))}
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
