// Tiny event bus so any screen can summon the pocket Coach — optionally
// pre-loaded with a specific question ("coach me on this metric"). The global
// CoachDock (mounted in the app layout) listens for these events.

export const COACH_OPEN_EVENT = 'coach:open'

export interface CoachOpenDetail {
  prompt?: string   // if set, the dock opens AND sends this message
}

// Call from anywhere on the client to open the coach. Pass a prompt to have the
// coach immediately respond to a specific question.
export function askCoach(prompt?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<CoachOpenDetail>(COACH_OPEN_EVENT, { detail: { prompt } }))
}
