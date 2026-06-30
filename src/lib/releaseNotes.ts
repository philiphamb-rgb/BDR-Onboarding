// Release-notes content for the "What's new" wizard. Bump APP_VERSION whenever
// you publish a new set of notes — the wizard then auto-opens once per user for
// that version (tracked in localStorage). This is separate from the per-deploy
// build id that drives the refresh banner: APP_VERSION gates *content*, the
// build id gates *"please refresh"*.

export const APP_VERSION = '2.1.0'
export const SEEN_KEY = 'bdrhub:lastReleaseSeen'

export interface ReleaseStep {
  icon: string        // icon key resolved in the wizard
  tag: string         // short eyebrow label
  title: string
  body: string
  href?: string       // optional "take me there"
  cta?: string
}

export const RELEASE_HEADLINE = 'BDR Hub just got a major upgrade'
export const RELEASE_SUBHEAD = "A cleaner, smarter, AI-forward workspace. Here's a quick 60-second tour of everything new."

export const RELEASE_STEPS: ReleaseStep[] = [
  {
    icon: 'home',
    tag: 'Home',
    title: 'Your command center',
    body: 'Open Home and you instantly know where you stand: a live goal cockpit (how you’re pacing, your projection, how far ahead or behind), the single most important thing to do right now, and an auto-triaged game plan ranked by what drives the most revenue.',
    href: '/home',
    cta: 'Open Home',
  },
  {
    icon: 'today',
    tag: 'Today',
    title: 'Run your day',
    body: 'Today mirrors that same goal pace, then gives you a clean checklist of what’s time-blocked, your daily habits, and one-tap quick logging for calls, demos, and deals. Check items off and watch the day fill in.',
    href: '/today',
    cta: 'Open Today',
  },
  {
    icon: 'plan',
    tag: 'Plan',
    title: 'One Plan workspace',
    body: 'Notes, Tasks, and Time Blocks are now one place. Use the Capture → Organize → Schedule tabs at the top to move from a quick note, to a clean to-do list, to your time-blocked calendar — without ever leaving the workspace.',
    href: '/notes',
    cta: 'Open Plan',
  },
  {
    icon: 'notes',
    tag: 'Capture',
    title: 'Notes that become action',
    body: 'Brain-dump anything. Tap Organize and AI tags the note and pulls out every to-do with a time estimate. Turn any line into a task in one tap, or drag it straight onto a time block to schedule it.',
    href: '/notes',
    cta: 'Try Notes',
  },
  {
    icon: 'lightning',
    tag: 'Automation',
    title: 'Auto-plan your day',
    body: 'Tap “Auto-plan my day” on Home, Today, or Time Blocks and the Hub packs your open tasks into the right time blocks by priority — instantly. Or tap “Coach my day” to have the AI triage your top 3 and tell you why.',
    href: '/schedule',
    cta: 'See Time Blocks',
  },
  {
    icon: 'goals',
    tag: 'Goals & Analytics',
    title: 'One home for your numbers',
    body: 'Set your monthly deal goal once in Analytics — it powers your pace, projection, and game plan everywhere. Your pipeline funnel, closing rate, activity, and the Income Calculator now all live in this one place.',
    href: '/analytics',
    cta: 'Open Analytics',
  },
  {
    icon: 'progress',
    tag: 'Progress',
    title: 'Belts, certificate & stats',
    body: 'Your development hub: track your belt journey, see your XP and streak at a glance, and print your completion certificate once you finish every module — all in one Progress tab.',
    href: '/progress',
    cta: 'Open Progress',
  },
  {
    icon: 'coach',
    tag: 'AI Coach',
    title: 'A coach on every screen',
    body: 'The floating Coach knows what screen you’re on and tailors its help. Ask it to plan your day, handle an objection, or tell you who to call next — and practice live objections any time in the Drill.',
    href: '/coach',
    cta: 'Meet your Coach',
  },
  {
    icon: 'refresh',
    tag: 'Always current',
    title: 'You’ll never miss an update',
    body: 'Whenever we ship a new version, a banner appears at the top of the app. Just tap Refresh to get the latest — your work is always saved. You can reopen this tour any time from Settings → What’s new.',
  },
]

// ── Open-the-wizard event bus (so Settings / footer can trigger it) ──
export const RELEASE_NOTES_EVENT = 'bdrhub:open-release-notes'
export function openReleaseNotes() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(RELEASE_NOTES_EVENT))
}
