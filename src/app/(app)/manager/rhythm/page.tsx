// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Avatar, SkeletonList, ProgressBar } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { ClockIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { OPTIMIZED_DAY, currentBlock, fmtClock } from '@/lib/schedule'

export default function ManagerRhythmPage() {
  const supabase = createClient()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]
  const TOTAL = OPTIMIZED_DAY.length

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data: me }) => {
        if (!me?.team_id) { setLoading(false); return }
        Promise.all([
          supabase.from('users').select('id, name, avatar_url, settings').eq('team_id', me.team_id).eq('role', 'rep'),
          supabase.from('schedule_blocks').select('user_id, done').eq('day', today),
        ]).then(([{ data: reps }, { data: blocks }]) => {
          const doneByUser = {}
          for (const b of blocks ?? []) if (b.done) doneByUser[b.user_id] = (doneByUser[b.user_id] ?? 0) + 1
          const list = (reps ?? []).map(r => {
            const shift = r.settings?.shift
            const cur = shift ? currentBlock(shift) : null
            let status = 'No shift set', tone = 'gray', detail = ''
            if (cur?.status === 'active') { status = cur.block.label; tone = 'teal'; detail = `until ${fmtClock(cur.endsAt)}` }
            else if (cur?.status === 'before') { status = 'Starts soon'; tone = 'navy'; detail = `at ${fmtClock(cur.startsAt)}` }
            else if (cur?.status === 'after') { status = 'Shift complete'; tone = 'gray' }
            return { id: r.id, name: r.name, avatar_url: r.avatar_url, done: doneByUser[r.id] ?? 0, status, tone, detail }
          }).sort((a, b) => b.done - a.done)
          setRows(list)
          setLoading(false)
        })
      })
    })
  }, [])

  const toneCls = { teal: 'bg-teal/10 text-teal', navy: 'bg-navy/10 text-navy', gray: 'bg-bdrbg text-gray' }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Team Time Blocking" subtitle="Where every rep is in their day — live." />

      {loading ? (
        <SkeletonList count={4} />
      ) : rows.length === 0 ? (
        <Card className="text-center !py-8"><p className="text-sm text-gray">No reps on your team yet.</p></Card>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <Card key={r.id} className="!p-3">
              <div className="flex items-center gap-3">
                <Avatar src={r.avatar_url} name={r.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-[700] text-dark-text">{r.name}</span>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-[700]', toneCls[r.tone])}>
                      <ClockIcon size={11} /> {r.status}
                    </span>
                    {r.detail && <span className="text-[11px] text-gray">{r.detail}</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar value={r.done} max={TOTAL} color={r.done >= TOTAL ? '#16A34A' : '#00C2B2'} className="h-1.5 flex-1" />
                    <span className="text-[12px] font-[700] text-mid-text tabular-nums">{r.done}/{TOTAL}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="text-[11px] text-gray">Progress reflects blocks each rep has marked done today. “In progress” is their current time block.</p>
    </div>
  )
}
