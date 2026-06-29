// Guided-tour step definitions, one set per screen. Keep copy tight: every word
// should remove a question about how the screen works. Targets use [data-tour="…"].
import type { TourStep } from '@/components/tour'

export const HOME_TOUR: TourStep[] = [
  { selector: '[data-tour="home-belt"]', title: 'Your rank & momentum', body: 'Your belt advances with your days here. XP and your daily streak live right here too.' },
  { selector: '[data-tour="home-rhythm"]', title: 'What to do right now', body: 'This shows your current time block and the one next-best action — tap it to jump straight there.' },
  { selector: '[data-tour="home-path"]', title: 'Continue your path', body: 'Always points to your next lesson or quiz, so you never wonder what to learn next.' },
  { selector: '[data-tour="home-today"]', title: 'Knock out habits', body: 'Tap a habit to complete it right here — no extra screens. Your daily core loop.' },
]

export const PARTNERS_TOUR: TourStep[] = [
  { selector: '[data-tour="partners-add"]', title: 'Add a partner', body: 'Start tracking any prospect here. Each one gets a stage and an onboarding checklist.' },
  { selector: '[data-tour="partners-list"]', title: 'Your pipeline', body: 'See every partner with their stage and onboarding progress at a glance. Tap one to work it.' },
]

export const PARTNER_DETAIL_TOUR: TourStep[] = [
  { selector: '[data-tour="pd-stage"]', title: 'Move the deal', body: 'Set the pipeline stage as the partner progresses — New Lead through Opportunity Won.' },
  { selector: '[data-tour="pd-checklist"]', title: 'Onboarding checklist', body: 'Check off each step. Tap “Open …” to launch the right tool, and add notes per task. Finish all to earn XP.' },
]

export const RHYTHM_TOUR: TourStep[] = [
  { selector: '[data-tour="rhythm-shift"]', title: 'Pick your shift', body: 'Choose your hours once — the whole day re-times around it.' },
  { selector: '[data-tour="rhythm-selling"]', title: 'Protected selling time', body: 'The point of the day: hours reserved for live conversations, not admin.' },
  { selector: '[data-tour="rhythm-timeline"]', title: 'Make it yours', body: 'Edit any block’s time and add notes. Tap a block’s link to jump to where that work happens.' },
]

export const TRAIN_TOUR: TourStep[] = [
  { selector: '[data-tour="train-list"]', title: 'Your curriculum', body: 'Work modules top to bottom. Each has short lessons and a quiz that earns XP.' },
]

export const DRILL_TOUR: TourStep[] = [
  { selector: '[data-tour="drill-scenarios"]', title: 'Rehearse live', body: 'Pick a real objection and role-play against an AI prospect — then get instant Sandler feedback.' },
]
