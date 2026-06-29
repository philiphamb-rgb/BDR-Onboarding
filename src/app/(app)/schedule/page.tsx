// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, SkeletonCard, toast } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { ClockIcon, PhoneIcon, CheckIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import {
  SHIFT_OPTIONS, DEFAULT_SHIFT, OPTIMIZED_DAY, BLOCK_STYLE,
  parseHM, fmtClock, fmtShift, fmtDuration, SELLING_MINUTES,
} from '@/lib/schedule'

export default function SchedulePage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>()
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [shift, setShift] = useState(DEFAULT_SHIFT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      supabase.from('users').select('settings').eq('id', user.id).single().then(({ data }) => {
        const s = data?.settings ?? {}
        setSettings(s)
        if (s.shift && SHIFT_OPTIONS.some(o => o.start === s.shift)) setShift(s.shift)
        setLoading(false)
      })
    })
  }, [])

  const pickShift = async (start: string) => {
    setShift(start)
    if (!userId) return
    const next = { ...settings, shift: start }
    setSettings(next)
    const { error } = await supabase.from('users').update({ settings: next }).eq('id', userId)
    if (!error) toast.success('Shift saved')
  }

  const base = parseHM(shift)
  const chosen = SHIFT_OPTIONS.find(o => o.start === shift) ?? SHIFT_OPTIONS[0]

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Daily Rhythm" subtitle="Pick your shift, then run the optimized time-blocked day." />

      {/* Shift picker */}
      <Card>
        <div className="label mb-2">Choose your 8-hour shift</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SHIFT_OPTIONS.map(o => {
            const active = o.start === shift
            return (
              <button key={o.start} onClick={() => pickShift(o.start)}
                className={cn('flex items-center justify-center gap-1.5 rounded-md border px-3 py-2.5 text-[13px] font-[700] transition-all',
                  active ? 'border-navy bg-navy text-white' : 'border-border bg-bdrbg text-mid-text hover:border-navy/40')}>
                {active && <CheckIcon size={14} />}{fmtShift(o)}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Selling-time highlight */}
      <Card className="bg-gradient-hero text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shrink-0"><PhoneIcon size={20} className="text-white" /></div>
          <div>
            <div className="text-[22px] font-[800] leading-none">{fmtDuration(SELLING_MINUTES)}</div>
            <div className="text-[12px] text-white/75">of protected selling time — the point of the whole day</div>
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <ClockIcon size={16} className="text-navy" />
          <h2 className="text-h3 text-dark-text">Your day · {fmtShift(chosen)}</h2>
        </div>
        <div className="space-y-2">
          {OPTIMIZED_DAY.map((b, i) => {
            const st = BLOCK_STYLE[b.type]
            const start = base + b.off
            return (
              <div key={i} className="flex gap-3">
                <div className="w-[68px] shrink-0 pt-0.5 text-right">
                  <div className="text-[12px] font-[700] text-dark-text tabular-nums">{fmtClock(start)}</div>
                  <div className="text-[10px] text-gray">{fmtDuration(b.dur)}</div>
                </div>
                <div className="relative flex flex-col items-center">
                  <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: st.color }} />
                  {i < OPTIMIZED_DAY.length - 1 && <span className="w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-[700] text-dark-text">{b.label}</span>
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-[700]" style={{ backgroundColor: `${st.color}1A`, color: st.color }}>{st.label}</span>
                  </div>
                  {b.tip && <p className="mt-0.5 text-[12px] text-gray leading-relaxed">{b.tip}</p>}
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray">Optimized from a standard BDR day: peak hours go to live conversations, breaks are protected, and all admin is batched to the end.</p>
      </Card>
    </div>
  )
}
