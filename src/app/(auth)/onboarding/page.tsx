// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'
import { CheckIcon, ArrowRightIcon, ArrowLeftIcon, TrophyIcon, SuccessIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const STEPS = 5

const BELT_TIERS = [
  { rank: 'white',  label: 'White Belt',  days: 0,  desc: 'New Recruit. Focus on building your foundation.' },
  { rank: 'yellow', label: 'Yellow Belt', days: 7,  desc: '7 days in. You\'re establishing your rhythm.' },
  { rank: 'orange', label: 'Orange Belt', days: 14, desc: '2 weeks of consistency. You\'re finding your stride.' },
  { rank: 'green',  label: 'Green Belt',  days: 30, desc: '30 days. You\'ve built real momentum.' },
  { rank: 'blue',   label: 'Blue Belt',   days: 50, desc: '50 days. You\'re a proven performer.' },
  { rank: 'purple', label: 'Purple Belt', days: 70, desc: '70 days. Elite territory.' },
  { rank: 'black',  label: 'Black Belt',  days: 90, desc: '90 days. The pinnacle of BDR performance.' },
]
const BELT_BG: Record<string, string> = {
  white:'bg-bdrbg border border-border',yellow:'bg-yellow-400',orange:'bg-orange-500',
  green:'bg-green-500',blue:'bg-blue-600',purple:'bg-purple-600',black:'bg-gray-900',
}
const DEFAULT_HABITS = ['Reviewed my pipeline','Made 20+ calls','Followed up with 3+ leads','Completed training','Set tomorrow\'s top 3']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', startDate: new Date().toISOString().split('T')[0] })

  const u = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }))

  const daysSinceStart = Math.max(0, Math.floor((Date.now() - new Date(form.startDate).getTime()) / 86400000))
  const currentBelt = BELT_TIERS.reduce((acc, b) => daysSinceStart >= b.days ? b : acc, BELT_TIERS[0])

  const finish = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('users').update({
      name: form.name.trim(),
      phone: form.phone || null,
      start_date: form.startDate,
      onboarding_completed: true,
    }).eq('id', user.id)

    await supabase.from('user_progress').upsert({
      user_id: user.id,
      belt_day: daysSinceStart,
    }, { onConflict: 'user_id' })

    router.push('/home')
  }

  return (
    <div className="w-full max-w-sm">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {Array.from({ length: STEPS }).map((_, i) => (
          <div key={i} className={cn('h-2 rounded-full transition-all duration-300', i === step ? 'w-8 bg-teal' : i < step ? 'w-4 bg-teal/60' : 'w-4 bg-white/30')} />
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-modal p-6 min-h-[420px] flex flex-col">

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col flex-1">
            <div className="flex-1">
              <div className="mb-4 flex justify-center"><TrophyIcon size={48} className="text-gold" /></div>
              <h2 className="text-h2 text-dark-text mb-3 text-center">Welcome to the BDR Onboarding Tool</h2>
              <p className="text-sm text-gray mb-4 text-center">Your personal onboarding and performance hub for ConsumerDirect.</p>
              {['Daily habit tracking','XP & belt progression','Training & quizzes','Coach AI personalization'].map(item => (
                <div key={item} className="flex items-center gap-3 py-2">
                  <div className="w-5 h-5 bg-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-3 h-3 text-teal" />
                  </div>
                  <span className="text-sm text-mid-text">{item}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => setStep(1)} className="w-full mt-6" size="lg">Get Started<ArrowRightIcon className="ml-2" /></Button>
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="flex flex-col flex-1">
            <div className="flex-1">
              <h2 className="text-h2 text-dark-text mb-1">Your profile</h2>
              <p className="text-sm text-gray mb-5">Tell us who you are.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-label text-mid-text mb-1 block">Full Name</label>
                  <input type="text" value={form.name} onChange={u('name')} placeholder="Alex Johnson" autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
                </div>
                <div>
                  <label className="text-label text-mid-text mb-1 block">Phone <span className="text-gray font-normal">(optional)</span></label>
                  <input type="tel" value={form.phone} onChange={u('phone')} placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setStep(0)} className="flex-1"><ArrowLeftIcon className="mr-2" />Back</Button>
              <Button onClick={() => setStep(2)} className="flex-1" disabled={!form.name.trim()}>Next<ArrowRightIcon className="ml-2" /></Button>
            </div>
          </div>
        )}

        {/* Step 2: Start date / belt */}
        {step === 2 && (
          <div className="flex flex-col flex-1">
            <div className="flex-1">
              <h2 className="text-h2 text-dark-text mb-1">Your start date</h2>
              <p className="text-sm text-gray mb-5">When did you join ConsumerDirect?</p>
              <input type="date" value={form.startDate} onChange={u('startDate')} max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy mb-4" />
              <div className="bg-bdrbg rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn('w-8 h-8 rounded-full', BELT_BG[currentBelt.rank])} />
                  <div>
                    <div className="font-semibold text-dark-text">{currentBelt.label}</div>
                    <div className="text-xs text-gray">Day {daysSinceStart}</div>
                  </div>
                </div>
                <p className="text-sm text-gray">{currentBelt.desc}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setStep(1)} className="flex-1"><ArrowLeftIcon className="mr-2" />Back</Button>
              <Button onClick={() => setStep(3)} className="flex-1">Next<ArrowRightIcon className="ml-2" /></Button>
            </div>
          </div>
        )}

        {/* Step 3: Habits */}
        {step === 3 && (
          <div className="flex flex-col flex-1">
            <div className="flex-1">
              <h2 className="text-h2 text-dark-text mb-1">Daily habits</h2>
              <p className="text-sm text-gray mb-4">You start with 5 default habits. Customize them any time.</p>
              <div className="space-y-2">
                {DEFAULT_HABITS.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-bdrbg rounded-xl border border-border">
                    <div className="w-5 h-5 bg-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="w-3 h-3 text-teal" />
                    </div>
                    <span className="text-sm text-mid-text">{h}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setStep(2)} className="flex-1"><ArrowLeftIcon className="mr-2" />Back</Button>
              <Button onClick={() => setStep(4)} className="flex-1">Next<ArrowRightIcon className="ml-2" /></Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="flex flex-col flex-1">
            <div className="flex-1 text-center py-4">
              <div className="mb-4 flex justify-center"><SuccessIcon size={48} className="text-teal" /></div>
              <h2 className="text-h2 text-dark-text mb-3">You&apos;re ready, {form.name.split(' ')[0]}!</h2>
              <p className="text-sm text-gray mb-6">Log activity, complete habits, and climb the belt ranks.</p>
              <div className="bg-gradient-primary rounded-xl p-4 text-white text-left">
                <div className="text-xs font-medium opacity-80 mb-1">YOUR STARTING BELT</div>
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-full', BELT_BG[currentBelt.rank], 'border-2 border-white/20')} />
                  <div>
                    <div className="font-bold">{currentBelt.label}</div>
                    <div className="text-xs opacity-80">Day {daysSinceStart}</div>
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={finish} loading={loading} className="w-full mt-6" size="lg">
              Enter the BDR Onboarding Tool<ArrowRightIcon className="ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
