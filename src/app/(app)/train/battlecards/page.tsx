// @ts-nocheck
'use client'

// Battle Cards — competitive intelligence module. First visit shows training;
// once finished (checked from the DB, not memory) every later visit opens the
// reference tool, with Replay Training available inside it. Native to the
// Learning Center: same shell, UI kit, and module_progress persistence as Sandler.

import Link from 'next/link'
import { Skeleton } from '@/components/ui'
import { BackIcon, ShieldIcon } from '@/components/icons'
import { useBattleCards } from '@/lib/modules/battle-cards/useBattleCards'
import { BattleCardsTraining } from '@/components/battle-cards/BattleCardsTraining'
import { BattleCardsReference } from '@/components/battle-cards/BattleCardsReference'

export default function BattleCardsPage() {
  const { loading, progress, save, certify } = useBattleCards()

  return (
    <div className="space-y-4 stagger-rise">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy"><ShieldIcon size={18} /></span>
          <div>
            <h1 className="text-h2 text-dark-text leading-tight">Battle Cards</h1>
            <p className="text-[12px] text-gray">Competitive intelligence · 9 competitors</p>
          </div>
        </div>
        <Link href="/train" className="flex shrink-0 items-center gap-1 rounded-pill border border-border bg-card px-3 py-2 text-[12px] font-[700] text-navy shadow-card hover:border-navy/40"><BackIcon size={14} /> Learning Center</Link>
      </div>

      {loading ? (
        <div className="mx-auto max-w-2xl space-y-3"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div>
      ) : progress.done ? (
        <BattleCardsReference progress={progress} save={save} onReplay={() => save({ done: false, step: 0, quiz: {} })} />
      ) : (
        <BattleCardsTraining progress={progress} save={save} certify={certify} onEnter={() => {}} />
      )}
    </div>
  )
}
