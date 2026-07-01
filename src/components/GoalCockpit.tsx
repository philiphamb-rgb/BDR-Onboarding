// The shared goal cockpit — the live "where you stand" dashboard rendered
// identically on Home, Today, and Analytics. Pass the GoalStats from
// priorityEngine.goalStats(); wrap in <Card className="overflow-hidden !p-0">.
// Renders the gradient hero (ring, deals, pace status, projection, per-day) and
// the dynamic strategy line. One definition so the three surfaces never drift.
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { GoalRing } from './GoalRing'
import { CountUp } from './CountUp'
import { TargetIcon, LightningIcon, ArrowRightIcon } from './icons'
import { strategyLine, type GoalStats } from '@/lib/priorityEngine'

function statusLabel(g: GoalStats): string {
  switch (g.status) {
    case 'hit': return 'Goal hit '
    case 'ahead': return 'Ahead of pace'
    case 'on': return 'On track'
    case 'behind': return `${g.behind} behind pace`
    default: return ''
  }
}

export function GoalCockpit({
  g,
  title = "This month's goal",
  emptyHref = '/analytics',
}: {
  g: GoalStats
  title?: string
  emptyHref?: string
}) {
  return (
    <>
      <div className="bg-gradient-hero p-4 text-white">
        <div className="mb-3 flex items-center gap-2">
          <TargetIcon size={15} className="text-white" />
          <span className="text-[13px] font-[800]">{title}</span>
          {g.hasGoal && <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-[700] tabular-nums">{g.daysLeft}d left</span>}
        </div>
        {g.hasGoal ? (
          <div className="flex items-center gap-4">
            <GoalRing pct={g.pct} />
            <div className="min-w-0 flex-1">
              <div className="text-[20px] font-[800] leading-none"><CountUp value={g.done} />/{g.goal} <span className="text-[12px] font-[700] text-white/70">deals</span></div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/80">
                <span className={cn('rounded-full px-2 py-0.5 font-[800]', g.status === 'behind' ? 'bg-error/30' : (g.status === 'hit' || g.status === 'ahead') ? 'bg-success/30' : 'bg-white/15')}>{statusLabel(g)}</span>
                <span>Projected {g.projection}</span>
                {g.remaining > 0 && <span>· {g.perDayNeeded.toFixed(1)}/day to goal</span>}
              </div>
            </div>
          </div>
        ) : (
          <Link href={emptyHref} className="flex items-center gap-2 rounded-xl bg-white/10 p-3 text-[13px] font-[700] hover:bg-white/15">
            <TargetIcon size={16} className="shrink-0" /> Set your monthly deal goal to unlock your game plan <ArrowRightIcon size={14} className="ml-auto shrink-0" />
          </Link>
        )}
      </div>
      {g.hasGoal && (
        <div className="flex items-start gap-2 p-3">
          <LightningIcon size={14} className="mt-0.5 shrink-0 text-teal" />
          <p className="text-[12px] leading-relaxed text-mid-text">{strategyLine(g)}</p>
        </div>
      )}
    </>
  )
}
