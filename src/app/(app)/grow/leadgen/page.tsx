// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Growth OS — Lead Gen. Score, route, and convert every partner lead. The leads
// are the REAL partner_onboarding pipeline (with a derived, clearly-labelled
// score); proactive AI insights are computed live from that pipeline + the AI
// Team's state; campaigns are demo-badged until a campaign source connects.
// Every AI action summons the one existing coach via askCoach.

import { useState } from 'react'
import Link from 'next/link'
import { Card, Skeleton, Badge } from '@/components/ui'
import { CountUp } from '@/components/CountUp'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowthChrome } from '@/components/growth/GrowthChrome'
import { NoteButton } from '@/components/growth/NoteButton'
import { LeadDrawer } from '@/components/growth/LeadDrawer'
import { TargetIcon, FlameIcon, LightningIcon, IntegrationIcon, ArrowRightIcon, PlusIcon, SearchIcon, CloseIcon, ChartRisingIcon, InfoIcon, CoinIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { GEN_PROMPTS, SCORE_ROUTING, DEMO_CAMPAIGNS, fmtAgo, leadSuggestion } from '@/lib/modules/growth-os/leadgen'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

const scoreColor = (s: number) => s >= 90 ? '#16A34A' : s >= 75 ? '#00C2B2' : s >= 50 ? '#B45309' : '#DC2626'
const STAGE_META: any = { hot: { l: 'Hot', c: 'text-error bg-error/10' }, warm: { l: 'Warm', c: 'text-[#A06C00] bg-gold/12' }, cold: { l: 'Cold', c: 'text-gray bg-bdrbg' }, converted: { l: 'Converted', c: 'text-success bg-success/10' } }

// Not a component — a plain helper that derives the insight cards from real
// state. Named lowercase so it never looks like it should hold hooks.
function computeInsights({ leadList, roster }: any) {
  const out: any[] = []
  const staleHot = leadList.filter(l => l.temperature === 'hot' && l.stage !== 'converted' && l.agoMin > 60)
  if (staleHot.length) out.push({ icon: FlameIcon, tone: 'error', title: `${staleHot.length} hot lead${staleHot.length > 1 ? 's have' : ' has'}n't been contacted in over an hour`, body: 'Leads contacted within 5 minutes are 21x more likely to qualify than after 30. Every extra hour compounds the loss.', cta: 'Draft outreach now', prompt: `Write urgent, ready-to-send outreach for these hot Co-Brand PLUS+ agency leads that have gone quiet: ${staleHot.slice(0, 5).map(l => `${l.name} (score ${l.score}, ${fmtAgo(l.agoMin)})`).join(', ')}. One SMS and one email each.` })
  const off = roster.filter(a => a.status !== 'live' && a.category === 'funnel')
  if (off.length) out.push({ icon: LightningIcon, tone: 'teal', title: `${off.length} funnel agent${off.length > 1 ? 's are' : ' is'} not live`, body: 'Turning these on hands the day-to-day lead work to your AI Team instead of doing it by hand.', cta: 'Review automations', prompt: `I have these Growth OS funnel agents turned off: ${off.map(a => a.name).join(', ')}. Which should I activate first based on impact vs setup effort, and walk me through it.` })
  const cold = leadList.filter(l => l.temperature === 'cold').length
  if (cold > leadList.length / 2 && leadList.length > 3) out.push({ icon: ChartRisingIcon, tone: 'gold', title: 'Your pipeline is running cold-heavy', body: `${cold} of ${leadList.length} leads are cold. You need more warm top-of-funnel to keep close rate up.`, cta: 'Get a plan', prompt: 'My partner pipeline is mostly cold leads. Give me 3 specific ways to warm it up and generate hotter agency prospects this week.' })
  return out.slice(0, 4)
}

export default function GrowthLeadGenPage() {
  const { loading, leadList, leads, roster } = useGrowthOS()
  const [view, setView] = useState('leads')
  const [q, setQ] = useState('')
  const [openLead, setOpenLead] = useState<any>(null)   // CRM record drawer
  const weightedPipeline = (leadList || []).reduce((s, l) => s + (l.weighted || 0), 0)

  const filtered = (leadList || []).filter(l => !q || l.name.toLowerCase().includes(q.toLowerCase()))
  const insights = loading ? [] : computeInsights({ leadList: leadList || [], roster: roster || [] })
  const stages = [{ k: 'cold', l: 'Cold', c: 'text-navy' }, { k: 'warm', l: 'Warm', c: 'text-[#A06C00]' }, { k: 'hot', l: 'Hot', c: 'text-error' }, { k: 'converted', l: 'Won', c: 'text-success' }]
  const counts = { cold: leads.cold, warm: leads.warm, hot: leads.hot, converted: leads.won }

  const subBtn = (id: string, l: string) => (
    <button key={id} onClick={() => setView(id)} className={cn('rounded-md px-3.5 py-1.5 text-[12.5px] font-[700] transition-colors', view === id ? 'bg-navy text-white' : 'text-gray hover:text-navy')}>{l}</button>
  )

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthChrome />
      <GrowthTabs />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* AI insights */}
          {insights.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 px-0.5">
                <IntegrationIcon size={14} className="text-navy" />
                <span className="text-[12px] font-[800] text-dark-text">Your AI Coach already checked your pipeline</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {insights.map((ins, i) => {
                  const Icon = ins.icon
                  const tone = ins.tone === 'error' ? { t: 'text-error', b: 'bg-error/8' } : ins.tone === 'teal' ? { t: 'text-teal', b: 'bg-teal/8' } : { t: 'text-[#A06C00]', b: 'bg-gold/10' }
                  return (
                    <Card key={i} className="!p-3.5">
                      <div className="flex gap-2.5">
                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone.b)}><Icon size={15} className={tone.t} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-[800] leading-tight text-dark-text">{ins.title}</div>
                          <p className="mt-1 text-[11.5px] leading-relaxed text-gray">{ins.body}</p>
                          <button onClick={() => askCoach(ins.prompt)} className={cn('mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-[800]', tone.b, tone.t)}><IntegrationIcon size={11} /> {ins.cta}</button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Funnel strip */}
          <Card className="!p-4">
            <div className="flex">
              {stages.map((s, i) => (
                <div key={s.k} className="flex flex-1 items-center gap-2">
                  <div className="flex-1 text-center">
                    <div className={cn('text-[26px] font-[900] leading-none tabular-nums', s.c)}><CountUp value={counts[s.k]} /></div>
                    <div className="mt-1 text-[10px] font-[700] uppercase tracking-wide text-gray">{s.l}</div>
                  </div>
                  {i < stages.length - 1 && <ArrowRightIcon size={14} className="shrink-0 text-border" />}
                </div>
              ))}
            </div>
          </Card>

          {/* Weighted pipeline — sum of deal amount × probability across leads.
              Click a lead to set its deal properties; this is the HubSpot forecast. */}
          {weightedPipeline > 0 && (
            <Card className="flex items-center gap-3 !p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/12 text-[#A06C00]"><CoinIcon size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-[900] text-dark-text">${Math.round(weightedPipeline).toLocaleString()}<span className="text-[12px] font-[600] text-gray">/mo weighted</span></div>
                <div className="text-[11.5px] text-gray">Forecasted pipeline · amount × probability, across your open deals</div>
              </div>
            </Card>
          )}

          {/* sub-view switcher */}
          <div className="flex w-fit gap-0.5 rounded-lg border border-border bg-bdrbg p-1">
            {[['leads', 'Leads'], ['campaigns', 'Campaigns'], ['generate', 'Generate']].map(([id, l]) => subBtn(id, l))}
          </div>

          {view === 'leads' && (
            <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
              <div className="space-y-2">
                <div className="relative">
                  <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search leads by name…" className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-9 text-[13px] outline-none focus:border-navy/40" />
                  {q && <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray"><CloseIcon size={14} /></button>}
                </div>
                {filtered.length === 0 ? (
                  <Card className="!py-8 text-center"><TargetIcon size={20} className="mx-auto mb-2 text-gray" /><p className="text-[13px] text-gray">{leadList?.length ? `No leads match "${q}"` : 'No partner leads in your pipeline yet — they appear here from Partners.'}</p></Card>
                ) : filtered.slice(0, 40).map(lead => {
                  const st = STAGE_META[lead.stage] || STAGE_META.cold
                  const sug = leadSuggestion(lead)
                  const initials = lead.name.split(' ').map(w => w[0]).slice(0, 2).join('')
                  return (
                    <Card key={lead.id || lead.name + lead.agoMin} onClick={() => lead.id && setOpenLead(lead)} role={lead.id ? 'button' : undefined}
                      className={cn('!p-3.5', lead.id && 'cursor-pointer hover:border-teal/40')} style={{ borderLeft: `3px solid ${scoreColor(lead.score)}` }}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/8 text-[12px] font-[800] text-navy">{initials}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-[700] text-dark-text">{lead.name}</div>
                          <div className="text-[11px] text-gray">{fmtAgo(lead.agoMin)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-12 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full" style={{ width: `${lead.score}%`, background: scoreColor(lead.score) }} /></div>
                          <span className="w-6 text-[13px] font-[800] tabular-nums" style={{ color: scoreColor(lead.score) }}>{lead.score}</span>
                        </div>
                        <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[11px] font-[700]', st.c)}>{st.l}</span>
                        {lead.id && <NoteButton compact entityType="lead" entityId={lead.id} label={lead.name} context={`Partner lead · ${lead.stage} · score ${lead.score}`} />}
                        <button onClick={e => { e.stopPropagation(); askCoach(`Write a personalized follow-up strategy for this ConsumerDirect Co-Brand PLUS+ agency lead: ${lead.name}, score ${lead.score}, currently ${lead.stage}, last touched ${fmtAgo(lead.agoMin)}. Give the next 3 specific touchpoints with copy to move them toward a signed partnership.`) }}
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-teal/10 px-2.5 py-1.5 text-[11px] font-[700] text-teal"><IntegrationIcon size={11} /> Follow-up</button>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 pl-12">
                        <LightningIcon size={11} className={sug.urgent ? 'text-error' : 'text-gray'} />
                        <span className={cn('text-[11px] italic', sug.urgent ? 'font-[600] text-error' : 'text-gray')}>AI suggests: {sug.text}</span>
                      </div>
                    </Card>
                  )
                })}
              </div>
              <div className="space-y-3">
                <Card className="!p-4">
                  <div className="mb-2.5 text-[10px] font-[800] uppercase tracking-wide text-gray">Score routing</div>
                  {SCORE_ROUTING.map(([r, a, c, stat]) => (
                    <div key={r} className="border-b border-border py-2 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] tabular-nums text-mid-text">{r}</span>
                        <span className={cn('text-[11px] font-[700]', c)}>{a}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-gray">{stat}</div>
                    </div>
                  ))}
                </Card>
                <Card className="!p-4">
                  <div className="mb-2.5 text-[10px] font-[800] uppercase tracking-wide text-gray">Quick generate</div>
                  {GEN_PROMPTS.slice(0, 4).map(a => (
                    <button key={a.l} onClick={() => askCoach(a.p)} className="mb-1.5 flex w-full items-center justify-between rounded-lg border border-border bg-bdrbg px-3 py-2 text-[12px] font-[600] text-mid-text hover:border-teal/40"><span>{a.l}</span><ArrowRightIcon size={12} className="text-gray" /></button>
                  ))}
                </Card>
              </div>
            </div>
          )}

          {view === 'campaigns' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-gold/10 p-2.5"><InfoIcon size={13} className="text-[#A06C00]" /><span className="text-[11.5px] font-[600] text-[#A06C00]">Demo data — campaigns connect once your email/automation source is linked.</span></div>
              {DEMO_CAMPAIGNS.map(c => (
                <Card key={c.id} className="flex items-center gap-3 !p-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-[700] text-dark-text">{c.name}</div>
                    <div className="text-[11px] text-gray">{c.type}</div>
                  </div>
                  <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-[700] uppercase', c.status === 'active' ? 'bg-success/10 text-success' : 'bg-bdrbg text-gray')}>{c.status}</span>
                  <div className="w-12 text-center text-[13px] font-[700] tabular-nums text-dark-text">{c.leads || '—'}</div>
                  <div className="w-12 text-center text-[13px] font-[700] tabular-nums text-teal">{c.conv}</div>
                  <button onClick={() => askCoach(`Give 5 specific optimization ideas for my Co-Brand PLUS+ partner campaign "${c.name}" (${c.type}). Focus on open, click-through, and booked-call rate.`)} className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[11px] font-[600] text-mid-text hover:border-navy/40">Optimize</button>
                </Card>
              ))}
              <button onClick={() => askCoach('Generate a complete new partner-recruitment campaign for ConsumerDirect Co-Brand PLUS+. Include campaign name, target agency segment, offer hook, funnel path, a 5-email outline, and expected conversion metrics.')} className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-border py-3.5 text-[13px] font-[600] text-gray hover:border-teal/40"><PlusIcon size={14} /> Generate a new campaign with AI</button>
            </div>
          )}

          {view === 'generate' && (
            <div>
              <p className="mb-3 text-[13px] leading-relaxed text-gray">Select any asset to generate it instantly with your AI Coach. Each prompt is pre-configured for ConsumerDirect Co-Brand PLUS+ and stays compliant.</p>
              <div className="flex flex-wrap gap-2">
                {GEN_PROMPTS.map(a => (
                  <button key={a.l} onClick={() => askCoach(a.p)} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-[13px] font-[700] text-dark-text shadow-card hover:border-teal/40"><IntegrationIcon size={14} className="text-teal" />{a.l}<ArrowRightIcon size={12} className="text-gray" /></button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {openLead && <LeadDrawer partnerId={openLead.id} name={openLead.name} score={openLead.score} onClose={() => setOpenLead(null)} />}
    </div>
  )
}
