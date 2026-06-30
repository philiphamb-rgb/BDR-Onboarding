// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, SkeletonCard, ProgressBar } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { PhoneIcon, TargetIcon, HandshakeIcon, ArrowRightIcon } from '@/components/icons'
import { PIPELINE_STAGES, stageMeta } from '@/lib/partnerChecklist'

const WON = 'opportunity_won'
const rate = (arr) => arr.length ? Math.round(arr.filter(p => p.stage === WON).length / arr.length * 100) : 0

export default function AnalyticsPage() {
  const supabase = createClient()
  const [partners, setPartners] = useState([])
  const [prog, setProg] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      Promise.all([
        supabase.from('partner_onboarding').select('stage, temperature').eq('user_id', user.id),
        supabase.from('user_progress').select('calls_this_week, demos_this_week, deals_this_month, total_deals').eq('user_id', user.id).single(),
      ]).then(([{ data: p }, { data: pr }]) => { setPartners(p ?? []); setProg(pr ?? {}); setLoading(false) })
    })
  }, [])

  if (loading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>

  const warm = partners.filter(p => (p.temperature ?? 'cold') === 'warm')
  const cold = partners.filter(p => (p.temperature ?? 'cold') === 'cold')
  const won = partners.filter(p => p.stage === WON).length
  const funnel = PIPELINE_STAGES.map(s => ({ ...s, n: partners.filter(p => p.stage === s.key).length }))
  const maxN = Math.max(1, ...funnel.map(f => f.n))

  const tiles = [
    { label: 'Total leads', value: partners.length },
    { label: '🔥 Warm', value: warm.length },
    { label: '❄️ Cold', value: cold.length },
    { label: 'Won', value: won },
  ]

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Analytics" subtitle="Your pipeline, conversion, and activity at a glance." />

      {partners.length === 0 ? (
        <Card className="text-center !py-8">
          <p className="text-sm text-gray">Add partners and tag them warm or cold to unlock your conversion analytics.</p>
          <Link href="/partners" className="mt-3 inline-flex items-center gap-1 text-[13px] font-[700] text-teal">Go to Partners <ArrowRightIcon size={14} /></Link>
        </Card>
      ) : (
        <>
          {/* Headline tiles */}
          <div className="grid grid-cols-4 gap-2">
            {tiles.map(t => (
              <Card key={t.label} className="!p-3 text-center">
                <div className="text-h2 font-[800] text-dark-text tabular-nums">{t.value}</div>
                <div className="mt-0.5 text-[11px] text-gray">{t.label}</div>
              </Card>
            ))}
          </div>

          {/* Closing rate — warm vs cold */}
          <Card>
            <div className="label mb-3">Closing rate</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { l: 'Overall', v: rate(partners), c: '#003087' },
                { l: '🔥 Warm', v: rate(warm), c: '#EA580C' },
                { l: '❄️ Cold', v: rate(cold), c: '#2563EB' },
              ].map(x => (
                <div key={x.l}>
                  <div className="text-[26px] font-[900] tabular-nums" style={{ color: x.c }}>{x.v}%</div>
                  <div className="mt-1 text-[11px] text-gray">{x.l}</div>
                  <ProgressBar value={x.v} max={100} color={x.c} className="mt-1 h-1.5" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-gray">Closing rate = partners at “Opportunity Won” ÷ total leads in that segment.</p>
          </Card>

          {/* Pipeline funnel */}
          <Card>
            <div className="label mb-3">Pipeline funnel</div>
            <div className="space-y-2">
              {funnel.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="w-[110px] shrink-0 text-[12px] font-[700] text-mid-text">{f.label}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-md bg-bdrbg">
                    <div className="h-full rounded-md transition-all" style={{ width: `${(f.n / maxN) * 100}%`, backgroundColor: f.color, minWidth: f.n ? 6 : 0 }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[12px] font-[800] text-dark-text tabular-nums">{f.n}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity */}
          <Card>
            <div className="label mb-3">Activity</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { Icon: PhoneIcon, label: 'Calls / wk', value: prog?.calls_this_week ?? 0 },
                { Icon: TargetIcon, label: 'Demos / wk', value: prog?.demos_this_week ?? 0 },
                { Icon: HandshakeIcon, label: 'Deals / mo', value: prog?.deals_this_month ?? 0 },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border bg-bdrbg p-3 text-center">
                  <s.Icon size={20} className="mx-auto mb-1 text-navy" />
                  <div className="text-h3 font-bold text-dark-text tabular-nums">{s.value}</div>
                  <div className="text-[11px] text-gray">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Goal pacing — opens the income/commission calculator */}
          <Link href="/calculator">
            <Card hover className="bg-gradient-hero text-white">
              <div className="text-[11px] font-[800] uppercase tracking-[0.08em] text-white/70">Goal pacing</div>
              <p className="mt-1 text-sm leading-relaxed text-white/90">
                Set a commission goal and the Hub back-solves the daily calls and demos to hit it — and tracks your pace.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-[800] text-white">Open the Income Calculator <ArrowRightIcon size={14} /></span>
            </Card>
          </Link>
        </>
      )}
    </div>
  )
}
