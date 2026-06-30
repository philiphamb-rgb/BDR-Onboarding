// Interactive product walkthroughs — each step navigates to the real screen and
// spotlights the actual UI it describes (driven by GuidedTour). Replayable any
// time from the notifications bell. Bump a walkthrough's `version` to re-surface
// it; the latest unseen one auto-runs once (tracked in localStorage).

export const APP_VERSION = '2.1.0'
export const WALKTHROUGH_SEEN_KEY = 'bdrhub:walkthroughSeen'

export interface GuidedStep {
  route?: string      // navigate here first (omit to stay on current screen)
  selector?: string   // element to spotlight (omit for a centered card)
  title: string
  body: string
  emoji?: string
}

export interface Walkthrough {
  id: string
  version: string
  title: string
  description: string
  steps: GuidedStep[]
}

const V21: Walkthrough = {
  id: 'v2_1',
  version: '2.1.0',
  title: "What's new in BDR Hub 2.1",
  description: 'A live, guided tour of every new feature — on the real screens.',
  steps: [
    { route: '/home', title: 'Welcome to BDR Hub 2.1', emoji: '✨',
      body: "A cleaner, smarter, AI-forward workspace. I'll walk you through each new feature right on the screen it lives — about 60 seconds. Let's go." },
    { route: '/home', selector: '[data-tour="home-goal"]', emoji: '🎯', title: 'Know exactly where you stand',
      body: 'Your goal cockpit shows live pace, projection, and how far ahead or behind you are this month — the same dashboard everywhere, always current.' },
    { route: '/home', selector: '[data-tour="home-focus"]', emoji: '⚡', title: 'Do this now',
      body: 'The single highest-impact next move, surfaced for you. No more guessing what to work on first — just open Home and go.' },
    { route: '/home', selector: '[data-tour="home-wins"]', emoji: '🧭', title: 'Your auto-triaged game plan',
      body: 'Below your top action is a ranked plan built from your goal, pipeline, and tasks — ordered by what drives the most revenue. Tap “Auto-plan my day” to schedule it.' },
    { route: '/today', selector: '[data-tour="today-plan-card"]', emoji: '✅', title: 'Run your day',
      body: 'Today is your execution view: a checklist of what’s time-blocked with a progress bar, your habits, and one-tap logging for calls, demos, and deals.' },
    { route: '/notes', selector: '[data-tour="plan-tabs"]', emoji: '🗂️', title: 'One Plan workspace',
      body: 'Notes, Tasks, and Time Blocks are now one place. These tabs follow the natural flow: Capture an idea → Organize it into tasks → Schedule it on your calendar.' },
    { route: '/notes', selector: '[data-tour="notes-new"]', emoji: '📝', title: 'Capture that becomes action',
      body: 'Brain-dump anything here. Hit Organize and AI tags it and pulls out every to-do with a time estimate — then turn any line into a task or drag it onto a time block.' },
    { route: '/schedule', selector: '[data-tour="autoplan-controls"]', emoji: '🪄', title: 'Auto-plan your day',
      body: 'One tap packs your open tasks into the right time blocks by priority — selling into power blocks, admin into the admin block. Or ask the Coach to triage your day.' },
    { route: '/analytics', selector: '[data-tour="an-goal"]', emoji: '🎯', title: 'Set your goal once',
      body: 'This is the one place to set your monthly deal goal — and it powers your pace, projection, and game plan across Home, Today, and the Coach.' },
    { route: '/analytics', selector: '[data-tour="an-calc"]', emoji: '💰', title: 'Income Calculator, built in',
      body: 'Your pipeline funnel, closing rate, and the Income Calculator now live together here. Set a commission goal and the Hub back-solves the daily calls and demos to hit it.' },
    { route: '/progress', selector: '[data-tour="progress-snapshot"]', emoji: '🏅', title: 'Track your progress',
      body: 'Your belt journey, XP, streak, and completion certificate all live in one Progress hub. Finish every module to unlock and print your certificate.' },
    { route: '/coach', selector: '[data-tour="coach-input"]', emoji: '🤖', title: 'Your AI Coach, everywhere',
      body: 'Ask the Coach to plan your day, handle an objection, or tell you who to call next — it knows your goal, pipeline, and tasks. Practice live objections any time in the Drill.' },
    { route: '/home', selector: '[data-tour="nav-bell"]', emoji: '🔔', title: 'Replay anytime, right here',
      body: 'Tap the bell to reopen these guided tours whenever you want. And when we ship an update, a Refresh banner appears at the top — one tap keeps you on the latest.' },
    { route: '/home', emoji: '🎉', title: "You're all set",
      body: 'That’s the tour. Everything you saw is live now — and you can replay this any time from the notifications bell.' },
  ],
}

export const WALKTHROUGHS: Walkthrough[] = [V21]
export const LATEST_WALKTHROUGH = WALKTHROUGHS[0]

// ── Start-a-walkthrough event bus ──
export const START_WALKTHROUGH_EVENT = 'bdrhub:start-walkthrough'
export function startWalkthrough(id: string = LATEST_WALKTHROUGH.id) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(START_WALKTHROUGH_EVENT, { detail: id }))
}
