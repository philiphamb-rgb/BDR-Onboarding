// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

// Apex — Lead Gen. Score, route, and convert every partner lead. The leads
// are the REAL partner_onboarding pipeline (with a derived, clearly-labelled
// score); proactive AI insights are computed live from that pipeline + the AI
// Team's state; campaigns are demo-badged until a campaign source connects.
// Every AI action summons the one existing coach via askCoach.

import { useState } from 'react'
import Link from 'next/link'
import { Card, Skeleton, Badge } from '@/components/ui'
import { CountUp } from '@/components/CountUp'
import { GrowthTabs } from '@/components/GrowthTabs'
import { GrowthSlimHeader } from '@/components/growth/GrowthChrome'
import { LeadDrawer } from '@/components/growth/LeadDrawer'
import { LeadsBoard } from '@/components/growth/LeadsBoard'
import { ReportsPanel } from '@/components/growth/ReportsPanel'
import { ContactsBoard } from '@/components/growth/ContactsBoard'
import { FlameIcon, LightningIcon, IntegrationIcon, ArrowRightIcon, PlusIcon, ChartRisingIcon, InfoIcon, CoinIcon, BrainIcon } from '@/components/icons'
import { useGrowthOS } from '@/lib/hooks/useGrowthOS'
import { GEN_PROMPTS, DEMO_CAMPAIGNS, SCORE_ROUTING, fmtAgo } from '@/lib/modules/growth-os/leadgen'
import { askCoach } from '@/lib/coachBus'
import { cn } from '@/lib/utils'

// Not a component — a plain helper that derives the insight cards from real
// state. Named lowercase so it never looks like it should hold hooks.
// Lead-specific insights only — the "funnel agents not live" nudge is
// systemic (about the CRM as a whole, not any one lead) and gets its own
// slim banner instead of competing for hero-card space with real leads.
function computeInsights({ leadList }: any) {
  const out: any[] = []
  const staleHot = leadList.filter(l => l.temperature === 'hot' && l.stage !== 'converted' && l.agoMin > 60)
  if (staleHot.length) out.push({ icon: FlameIcon, tone: 'error', title: `${staleHot.length} hot lead${staleHot.length > 1 ? 's have' : ' has'}n't been contacted in over an hour`, body: 'Leads contacted within 5 minutes are 21x more likely to qualify than after 30. Every extra hour compounds the loss.', cta: 'Draft outreach now', prompt: `Write urgent, ready-to-send outreach for these hot Co-Brand PLUS+ agency leads that have gone quiet: ${staleHot.slice(0, 5).map(l => `${l.name} (score ${l.score}, ${fmtAgo(l.agoMin)})`).join(', ')}. One SMS and one email each.` })
  const cold = leadList.filter(l => l.temperature === 'cold').length
  if (cold > leadList.length / 2 && leadList.length > 3) out.push({ icon: ChartRisingIcon, tone: 'gold', title: 'Your pipeline is running cold-heavy', body: `${cold} of ${leadList.length} leads are cold. You need more warm top-of-funnel to keep close rate up.`, cta: 'Get a plan', prompt: 'My partner pipeline is mostly cold leads. Give me 3 specific ways to warm it up and generate hotter agency prospects this week.' })
  return out.slice(0, 4)
}

export default function GrowthLeadGenPage() {
  const { loading, leadList, leads, roster, reload } = useGrowthOS()
  const [view, setView] = useState('leads')
  const [openLead, setOpenLead] = useState<any>(null)   // CRM record drawer
  const weightedPipeline = (leadList || []).reduce((s, l) => s + (l.weighted || 0), 0)
  const insights = loading ? [] : computeInsights({ leadList: leadList || [] })
  const offFunnel = loading ? [] : (roster || []).filter(a => a.status !== 'live' && a.category === 'funnel')
  const stages = [{ k: 'cold', l: 'Cold', c: 'text-navy-ink' }, { k: 'warm', l: 'Warm', c: 'text-[#A06C00]' }, { k: 'hot', l: 'Hot', c: 'text-error' }, { k: 'converted', l: 'Won', c: 'text-success' }]
  const counts = { cold: leads.cold, warm: leads.warm, hot: leads.hot, converted: leads.won }

  const subBtn = (id: string, l: string) => (
    <button key={id} onClick={() => setView(id)} className={cn('rounded-md px-3.5 py-1.5 text-[12.5px] font-[700] transition-colors', view === id ? 'bg-navy text-white' : 'text-gray hover:text-navy-ink')}>{l}</button>
  )

  return (
    <div className="space-y-4 stagger-rise">
      <GrowthSlimHeader title="Lead Gen" subtitle="Score, route, and convert every partner lead" />
      <GrowthTabs />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* Hero — one-line pipeline read + the one primary action on this page */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card">
            <div className="min-w-0 flex-1 text-[13px] font-[700] text-dark-text">
              {leadList?.length ?? 0} lead{(leadList?.length ?? 0) === 1 ? '' : 's'} tracked
              {leads.warm > 0 && <span className="font-[600] text-[#A06C00]"> · {leads.warm} warm ready to advance</span>}
              {leads.hot > 0 && <span className="font-[600] text-error"> · {leads.hot} hot right now</span>}
            </div>
            <Link href="/partners" className="flex shrink-0 items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-[12.5px] font-[800] text-white"><PlusIcon size={13} /> Add lead</Link>
          </div>

          {/* Off-funnel nudge — systemic, so it gets its own slim banner instead
              of crowding the lead-specific insight cards below. */}
          {offFunnel.length > 0 && (
            <Link href="/grow/automations" className="flex items-center gap-2.5 rounded-xl bg-gold/10 p-2.5">
              <InfoIcon size={13} className="shrink-0 text-[#A06C00]" />
              <span className="min-w-0 flex-1 text-[11.5px] font-[600] text-[#A06C00]">{offFunnel.length} funnel agent{offFunnel.length > 1 ? 's are' : ' is'} off — leads may sit longer than they should</span>
              <ArrowRightIcon size={12} className="shrink-0 text-[#A06C00]" />
            </Link>
          )}

          {/* AI insights */}
          {insights.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 px-0.5">
                <IntegrationIcon size={14} className="text-navy-ink" />
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
          <div className="flex w-fit gap-0.5 overflow-x-auto rounded-lg border border-border bg-bdrbg p-1">
            {[['leads', 'Leads'], ['contacts', 'Contacts'], ['reports', 'Reports'], ['campaigns', 'Campaigns'], ['generate', 'Generate']].map(([id, l]) => subBtn(id, l))}
          </div>

          {view === 'leads' && (
            <LeadsBoard leadList={leadList || []} onOpenLead={setOpenLead} reload={reload} />
          )}

          {view === 'contacts' && (
            <ContactsBoard companies={leadList || []} onOpenCompany={setOpenLead} />
          )}

          {view === 'reports' && (
            <ReportsPanel myLeads={leadList || []} onOpenLead={setOpenLead} />
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
              <p className="mb-3 text-[13px] leading-relaxed text-gray">Generate with AI — pick an asset and your Coach writes it instantly, pre-configured for ConsumerDirect Co-Brand PLUS+ and compliance-safe.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {GEN_PROMPTS.map(a => (
                  <Card key={a.l} className="!p-3.5">
                    <div className="flex gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal/8"><BrainIcon size={15} className="text-teal" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-[800] leading-tight text-dark-text">{a.l}</div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-gray">{a.d}</p>
                        <button onClick={() => askCoach(a.p)} className="mt-2 flex items-center gap-1.5 rounded-lg border border-teal/30 px-2.5 py-1.5 text-[11px] font-[800] text-teal">Generate <ArrowRightIcon size={11} /></button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {openLead && <LeadDrawer partnerId={openLead.id} name={openLead.name} score={openLead.score} onClose={() => setOpenLead(null)} onSaved={reload} />}
    </div>
  )
}
