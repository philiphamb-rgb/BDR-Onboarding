'use client'

// "What's new" wizard — a friendly, stepped walkthrough of every new feature.
// Auto-opens once per APP_VERSION (tracked in localStorage); reopenable any time
// via openReleaseNotes() (Settings → What's new, or the home footer version).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  HomeIcon, TodayIcon, ChecklistIcon, DocumentIcon, LightningIcon,
  CoinIcon, MedalIcon, CoachIcon, RefreshIcon, ArrowRightIcon, CloseIcon, CheckIcon,
} from '@/components/icons'
import {
  APP_VERSION, SEEN_KEY, RELEASE_STEPS, RELEASE_HEADLINE, RELEASE_SUBHEAD,
  RELEASE_NOTES_EVENT,
} from '@/lib/releaseNotes'

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  home: HomeIcon, today: TodayIcon, plan: ChecklistIcon, notes: DocumentIcon,
  lightning: LightningIcon, goals: CoinIcon, progress: MedalIcon, coach: CoachIcon, refresh: RefreshIcon,
}

export function ReleaseNotesWizard() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  // -1 = intro cover, 0..n-1 = steps
  const [phase, setPhase] = useState<'cover' | 'steps'>('cover')

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) !== APP_VERSION) {
        const t = setTimeout(() => openWizard(), 900) // let the page settle first
        return () => clearTimeout(t)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const onOpen = () => openWizard()
    window.addEventListener(RELEASE_NOTES_EVENT, onOpen)
    return () => window.removeEventListener(RELEASE_NOTES_EVENT, onOpen)
  }, [])

  const openWizard = () => { setPhase('cover'); setI(0); setOpen(true) }

  const finish = () => {
    try { localStorage.setItem(SEEN_KEY, APP_VERSION) } catch { /* ignore */ }
    setOpen(false)
  }

  const goTo = (href: string) => { finish(); router.push(href) }

  if (!open) return null

  const total = RELEASE_STEPS.length
  const step = RELEASE_STEPS[i]
  const Icon = step ? (ICONS[step.icon] ?? LightningIcon) : LightningIcon
  const isLast = i === total - 1

  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center bg-dark-text/50 p-0 backdrop-blur-sm desktop:items-center desktop:p-4" role="dialog" aria-modal="true" aria-label="What's new">
      <div className="relative flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-3xl bg-card shadow-modal animate-rise desktop:rounded-3xl">
        <button onClick={finish} aria-label="Close" className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-white/90 hover:bg-black/20">
          <CloseIcon size={16} />
        </button>

        {phase === 'cover' ? (
          // ── Intro cover ──
          <div className="flex flex-col">
            <div className="bg-gradient-hero px-6 pb-8 pt-10 text-center text-white">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 animate-bob"><LightningIcon size={28} /></div>
              <div className="text-[11px] font-[800] uppercase tracking-[0.14em] text-white/70">What&apos;s new · v{APP_VERSION}</div>
              <h2 className="mt-2 text-[22px] font-[900] leading-tight">{RELEASE_HEADLINE}</h2>
              <p className="mx-auto mt-2 max-w-[340px] text-[13px] leading-relaxed text-white/85">{RELEASE_SUBHEAD}</p>
            </div>
            <div className="flex flex-col gap-2 p-5">
              <button onClick={() => { setPhase('steps'); setI(0) }}
                className="flex items-center justify-center gap-2 rounded-xl bg-navy py-3 text-[14px] font-[800] text-white transition-transform active:scale-[0.99]">
                Take the 60-second tour <ArrowRightIcon size={16} />
              </button>
              <button onClick={finish} className="py-2 text-[13px] font-[700] text-gray hover:text-dark-text">Skip for now</button>
            </div>
          </div>
        ) : (
          // ── Step ──
          <div className="flex flex-col">
            <div className="bg-gradient-hero px-6 pb-7 pt-9 text-white">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Icon size={24} /></div>
              <div className="text-[11px] font-[800] uppercase tracking-[0.14em] text-white/70">{step.tag}</div>
              <h2 className="mt-1 text-[20px] font-[900] leading-tight">{step.title}</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-[14px] leading-relaxed text-mid-text">{step.body}</p>
              {step.href && (
                <button onClick={() => goTo(step.href!)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/5 px-3 py-2 text-[13px] font-[800] text-teal hover:bg-teal/10">
                  {step.cta ?? 'Show me'} <ArrowRightIcon size={14} />
                </button>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 px-6">
              {RELEASE_STEPS.map((_, idx) => (
                <span key={idx} className={cn('h-1.5 rounded-full transition-all', idx === i ? 'w-5 bg-teal' : 'w-1.5 bg-border')} />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 p-5">
              <button onClick={() => (i === 0 ? setPhase('cover') : setI(i - 1))}
                className="rounded-xl border border-border bg-card px-4 py-3 text-[13px] font-[700] text-mid-text hover:bg-bdrbg">
                Back
              </button>
              <span className="ml-1 text-[12px] font-[700] text-gray tabular-nums">{i + 1} / {total}</span>
              {isLast ? (
                <button onClick={finish}
                  className="ml-auto flex items-center gap-1.5 rounded-xl bg-navy px-5 py-3 text-[14px] font-[800] text-white transition-transform active:scale-[0.99]">
                  <CheckIcon size={15} /> Got it
                </button>
              ) : (
                <button onClick={() => setI(i + 1)}
                  className="ml-auto flex items-center gap-1.5 rounded-xl bg-navy px-5 py-3 text-[14px] font-[800] text-white transition-transform active:scale-[0.99]">
                  Next <ArrowRightIcon size={15} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
