// @ts-nocheck
'use client'

// "Meet your AI team." — the first-run orientation for Agentic CRM. A real,
// dedicated full-screen route (not a modal), shown once per user, and
// replayable any time from the info icon on the Agentic CRM header. Copy is
// kept short and plain — a 7th-grade reading level — so it lands fast.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { useModuleKV } from '@/lib/hooks/useModuleKV'
import { RaceCarIcon, TargetIcon, EditIcon, CoachIcon, ArrowRightIcon, ArrowLeftIcon, CheckIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    icon: RaceCarIcon,
    tone: 'navy',
    title: 'Meet your AI team.',
    body: "Agentic CRM gives you a team of AI helpers. They work for you around the clock. Think of them as three teammates who never sleep.",
  },
  {
    icon: TargetIcon,
    tone: 'teal',
    title: 'They find you new business.',
    body: 'One part of your team finds and scores leads for you. It tells you who to call first and why. Less guessing, more selling.',
  },
  {
    icon: EditIcon,
    tone: 'gold',
    title: 'They help you create.',
    body: "Stuck on what to post or write? Your team suggests ideas that work. Pick one, tweak it, and it's ready to share.",
  },
  {
    icon: CoachIcon,
    tone: 'plum',
    title: 'They coach you every day.',
    body: 'Your team watches your numbers and your pipeline. It tells you the one best thing to do right now — and cheers you on.',
  },
]

const TONE_CLS: Record<string, { bg: string; text: string }> = {
  navy: { bg: 'bg-navy/10', text: 'text-navy-ink' },
  teal: { bg: 'bg-teal/10', text: 'text-teal' },
  gold: { bg: 'bg-gold/15', text: 'text-[#A06C00]' },
  plum: { bg: 'bg-plum/15', text: 'text-plum' },
}

export default function GrowthWelcomePage() {
  const router = useRouter()
  const { save } = useModuleKV('growth_welcome', { seen: false })
  const [step, setStep] = useState(0)
  const last = step === STEPS.length - 1

  const finish = () => { save({ seen: true }); router.push('/grow') }
  const next = () => (last ? finish() : setStep(s => s + 1))
  const back = () => setStep(s => Math.max(0, s - 1))

  const s = STEPS[step]
  const Icon = s.icon
  const tone = TONE_CLS[s.tone]

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className={cn('h-2 rounded-full transition-all duration-300', i === step ? 'w-8 bg-teal' : i < step ? 'w-4 bg-teal/50' : 'w-4 bg-border')} />
          ))}
        </div>

        <div className="flex min-h-[380px] flex-col rounded-2xl border border-border bg-card p-7 shadow-modal">
          <div className="flex-1 text-center">
            <span className={cn('mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl', tone.bg, tone.text)}>
              <Icon size={30} />
            </span>
            <h1 className="text-h1 text-dark-text">{s.title}</h1>
            <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-mid-text">{s.body}</p>

            {last && (
              <div className="mx-auto mt-5 flex max-w-[280px] flex-col gap-2 text-left">
                {['Finds and scores your leads', 'Suggests content to post', 'Coaches your next best move'].map(item => (
                  <div key={item} className="flex items-center gap-2.5 rounded-xl border border-border bg-bdrbg px-3 py-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/15 text-teal"><CheckIcon size={12} /></span>
                    <span className="text-[12.5px] font-[700] text-dark-text">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-2">
            {step > 0 ? (
              <button onClick={back} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-[13px] font-[700] text-mid-text hover:border-navy/40">
                <ArrowLeftIcon size={14} /> Back
              </button>
            ) : (
              <button onClick={finish} className="rounded-lg px-3 py-2.5 text-[13px] font-[700] text-gray hover:text-dark-text">Skip</button>
            )}
            <Button onClick={next} className="flex-1" size="lg" icon={<ArrowRightIcon size={16} />} iconPosition="right">
              {last ? 'Take me to Agentic CRM' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
