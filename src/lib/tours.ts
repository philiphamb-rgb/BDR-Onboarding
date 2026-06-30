// Guided-tour scripts, one per screen. Every tour opens with a centered welcome
// (no selector) for a strong hook, then spotlights each section. Copy is built to
// excite and orient in as few words as possible — momentum over manuals.
import type { TourStep } from '@/components/tour'

export const HOME_TOUR: TourStep[] = [
  { emoji: '🥋', title: 'Welcome to BDR Hub', body: 'Your command center — train, sell, and level up in one place. Take 30 seconds and you’ll own it.' },
  { selector: '[data-tour="home-belt"]', emoji: '🥋', title: 'Your rank climbs daily', body: 'Every active day advances your belt. XP and your streak live here — your momentum at a glance.' },
  { selector: '[data-tour="home-rhythm"]', emoji: '⏱️', title: 'Always know your next move', body: 'This card shows your live time block and the single best action. One tap and you’re there.' },
  { selector: '[data-tour="home-path"]', emoji: '🎯', title: 'Never wonder what’s next', body: 'Your next lesson or quiz is queued automatically. Just keep pressing forward.' },
  { selector: '[data-tour="home-today"]', emoji: '✅', title: 'Win the day in one tap', body: 'Knock out your daily habits right here — the streak that builds elite reps.' },
]

export const PARTNERS_TOUR: TourStep[] = [
  { emoji: '🤝', title: 'Your deal cockpit', body: 'Run every partner from first hello to signed — without ever leaving the Hub.' },
  { selector: '[data-tour="partners-add"]', emoji: '➕', title: 'Add a partner', body: 'Drop in any prospect. Each one gets a pipeline stage and a guided onboarding checklist.' },
  { selector: '[data-tour="partners-list"]', emoji: '📊', title: 'See your whole pipeline', body: 'Stage and onboarding progress for every partner at a glance. Tap one to work it.' },
]

export const PARTNER_DETAIL_TOUR: TourStep[] = [
  { selector: '[data-tour="pd-stage"]', emoji: '🚦', title: 'Move the deal forward', body: 'Set the stage as they progress — New Lead → Opportunity Won. Hit 100% and you earn XP.' },
  { selector: '[data-tour="pd-checklist"]', emoji: '✅', title: 'Launch, don’t leave', body: 'Each task has an “Open” button to the right tool, plus a notes field. Finish them all to onboard the partner.' },
]

export const RHYTHM_TOUR: TourStep[] = [
  { emoji: '⏱️', title: 'Engineer your perfect day', body: 'A pro-optimized, calendar-style day built around your selling hours.' },
  { selector: '[data-tour="rhythm-timeline"]', emoji: '🗓️', title: 'Drag, resize, tap', body: 'Drag a block to move it, drag its bottom edge to resize, and tap any block for notes, tasks, and a jump-to link.' },
]

export const TRAIN_TOUR: TourStep[] = [
  { emoji: '📚', title: 'Go from new to closer', body: 'Bite-size lessons and quizzes that earn XP and unlock your certificate.' },
  { selector: '[data-tour="train-list"]', emoji: '🎓', title: 'Work it top to bottom', body: 'Each module builds on the last. Short lessons, then a quiz to lock it in.' },
]

export const DRILL_TOUR: TourStep[] = [
  { emoji: '🎤', title: 'Practice makes closers', body: 'Rehearse real objections against an AI prospect — fail safely here, win for real.' },
  { selector: '[data-tour="drill-scenarios"]', emoji: '🥊', title: 'Pick your fight', body: 'Choose an objection, role-play it live, then get instant Sandler-based feedback.' },
]

export const WINS_TOUR: TourStep[] = [
  { emoji: '🏆', title: 'Log it. Earn it.', body: 'Every call, demo, and deal you log here fuels your XP and builds your record.' },
  { selector: '[data-tour="wins-log"]', emoji: '➕', title: 'Log a win', body: 'Tap to log calls, demos, and deals — instant XP, instant momentum.' },
  { selector: '[data-tour="wins-stats"]', emoji: '📈', title: 'Your track record', body: 'Your totals at a glance. Filter by type to see what’s driving your results.' },
]

export const COACH_TOUR: TourStep[] = [
  { emoji: '🧠', title: 'Your AI sales coach', body: 'It already knows your numbers, pipeline, and belt — so every answer is built for you.' },
  { selector: '[data-tour="coach-input"]', emoji: '💬', title: 'Ask anything', body: 'Stuck on an objection, or need a plan to hit your number? Ask — the advice is specific to you.' },
]

export const CALCULATOR_TOUR: TourStep[] = [
  { emoji: '💰', title: 'Plan your income', body: 'Set a commission or income goal and this back-solves the daily calls & demos to hit it — then tracks your pace. Your inputs save automatically.' },
]

export const RESOURCES_TOUR: TourStep[] = [
  { emoji: '🧭', title: 'Everything, one tap away', body: 'Tools, docs, and the right people to contact — no more hunting.' },
  { selector: '[data-tour="resources-tools"]', emoji: '🛠️', title: 'Jump straight in', body: 'Tap any tool to open it. Your whole stack lives right here.' },
]
