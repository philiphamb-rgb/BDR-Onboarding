// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Badge, SkeletonCard } from '@/components/ui'
import { MedalIcon, LockIcon, BookIcon, DownloadIcon, ArrowRightIcon, BeltIcon } from '@/components/icons'
import { cn, formatXP } from '@/lib/utils'
import Link from 'next/link'

// Belt ladder (thresholds mirror the XP engine) — the "your journey" view,
// folded in from the retired Grow tab.
const BELTS = [
  { name: 'white', label: 'White', color: '#9CA3AF', day: 0 },
  { name: 'yellow', label: 'Yellow', color: '#FBBF24', day: 7 },
  { name: 'orange', label: 'Orange', color: '#F97316', day: 14 },
  { name: 'green', label: 'Green', color: '#22C55E', day: 30 },
  { name: 'blue', label: 'Blue', color: '#3B82F6', day: 50 },
  { name: 'purple', label: 'Purple', color: '#9333EA', day: 70 },
  { name: 'black', label: 'Black', color: '#111827', day: 90 },
]

export default function CertificatePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ name: string; completed: number; total: number; xp: number; belt: string; isManager: boolean } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      load(user.id)
    })
  }, [])

  const load = async (uid: string) => {
    const [{ data: u }, { data: mods }, { data: prog }, { data: attempts }, { data: me }] = await Promise.all([
      supabase.from('users').select('name').eq('id', uid).single(),
      supabase.from('modules').select('id, order_index, lessons(id)').eq('is_published', true),
      supabase.from('user_progress').select('completed_lessons, total_xp, belt_rank').eq('user_id', uid).single(),
      supabase.from('quiz_attempts').select('module_id, percentage').eq('user_id', uid),
      supabase.from('users').select('role').eq('id', uid).single(),
    ])
    const done = new Set<string>(prog?.completed_lessons ?? [])
    const passed = new Set<string>((attempts ?? []).filter(a => (a.percentage ?? 0) >= 70).map(a => a.module_id))
    const completed = (mods ?? []).filter(m => {
      const ls = (m.lessons ?? []).map(l => l.id)
      return ls.length > 0 && ls.every(id => done.has(id)) && passed.has(m.id)
    }).length
    setData({
      name: u?.name ?? 'BDR',
      completed, total: (mods ?? []).length,
      xp: prog?.total_xp ?? 0,
      belt: (prog?.belt_rank ?? 'White Belt'),
      isManager: ['manager', 'owner'].includes(me?.role ?? 'rep'),
    })
    setLoading(false)
  }

  if (loading) return <div className="space-y-4"><SkeletonCard /></div>
  const earned = data.completed >= data.total && data.total > 0
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const beltName = (data.belt || 'white').toLowerCase().replace(' belt', '')
  const currentIdx = Math.max(0, BELTS.findIndex(b => b.name === beltName))

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-start justify-between gap-3 no-print">
        <div>
          <h1 className="text-h1 text-dark-text">Certificate</h1>
          <p className="mt-0.5 text-[13px] text-gray">{earned ? 'You earned it. Print or save your certificate.' : 'Finish all modules to unlock your certificate.'}</p>
        </div>
        {earned && (
          <Button size="sm" onClick={() => window.print()} icon={<DownloadIcon size={16} />}>Print / Save</Button>
        )}
      </div>

      {!earned ? (
        <Card className="text-center !py-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bdrbg text-gray">
            <LockIcon size={28} />
          </div>
          <h2 className="text-h3 text-dark-text">{data.completed} of {data.total} modules complete</h2>
          <p className="mx-auto mt-1 max-w-[300px] text-[13px] text-gray">
            Complete every module and pass its quiz to unlock your ConsumerDirect BDR certificate.
          </p>
          <Link href="/train" className="mt-5 inline-block">
            <Button variant="conversion" icon={<BookIcon size={18} />} iconPosition="right">Keep training</Button>
          </Link>
        </Card>
      ) : (
        // ── The certificate ──────────────────────────────────────────────────
        <div className="certificate rounded-2xl bg-gradient-to-br from-navy via-navy to-navy-dark p-1.5 shadow-modal">
          <div className="rounded-xl bg-card px-6 py-10 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/consumerdirect-mark.svg" alt="ConsumerDirect" className="mx-auto mb-4 h-12 w-12" />
            <div className="label text-teal">ConsumerDirect</div>
            <div className="mt-1 text-[11px] font-[700] uppercase tracking-[0.2em] text-gray">Certificate of Completion</div>

            <div className="my-6">
              <p className="text-[13px] text-gray">This certifies that</p>
              <p className="mt-1 text-[28px] font-[900] text-dark-text">{data.name}</p>
              <p className="mx-auto mt-2 max-w-[360px] text-[13px] leading-relaxed text-mid-text">
                has successfully completed the <span className="font-[700] text-dark-text">BDR Hub Onboarding Program</span> —
                all {data.total} modules and qualifying assessments.
              </p>
            </div>

            <div className="mx-auto mb-6 flex max-w-[320px] items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-[20px] font-[800] text-dark-text">{data.total}</div>
                <div className="text-[11px] text-gray">Modules</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-[20px] font-[800] text-dark-text">{formatXP(data.xp).replace(' XP', '')}</div>
                <div className="text-[11px] text-gray">XP earned</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-[20px] font-[800] text-dark-text">{data.belt.replace(' Belt', '')}</div>
                <div className="text-[11px] text-gray">Belt</div>
              </div>
            </div>

            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold text-white shadow-button">
              <MedalIcon size={32} />
            </div>

            <div className="mx-auto flex max-w-[360px] items-end justify-between gap-6">
              <div className="flex-1 border-t border-border pt-1 text-left">
                <div className="text-[12px] font-[700] text-dark-text">Ryan Fleming</div>
                <div className="text-[10px] text-gray">Sales Manager</div>
              </div>
              <div className="flex-1 border-t border-border pt-1 text-right">
                <div className="text-[12px] font-[700] text-dark-text">{today}</div>
                <div className="text-[10px] text-gray">Date completed</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Belt journey — your development ladder (folded in from Grow) */}
      <Card className="no-print">
        <h2 className="text-h3 text-dark-text">Belt Journey</h2>
        <div className="mt-4 space-y-3">
          {BELTS.map((belt, i) => {
            const reached = i <= currentIdx
            const isCurrent = i === currentIdx
            return (
              <div key={belt.name} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: reached ? belt.color : '#E4ECF2' }}>
                  <BeltIcon size={16} className={reached ? 'text-white' : 'text-gray'} />
                </div>
                <div className="flex-1">
                  <span className={cn('text-sm font-[700]', reached ? 'text-dark-text' : 'text-gray')}>{belt.label} Belt</span>
                  <span className="ml-2 text-xs text-gray">day {belt.day}+</span>
                </div>
                {isCurrent && <Badge variant="teal">You are here</Badge>}
                {reached && !isCurrent && <Badge variant="gray">Earned</Badge>}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
