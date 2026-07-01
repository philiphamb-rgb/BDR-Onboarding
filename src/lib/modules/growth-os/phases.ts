// Apex — the 8-phase build roadmap for standing up the Co-Brand PLUS+
// partner-growth system. Each task carries an hour estimate and the tool it uses
// so the whole build is legible; per-phase "what you'll have" + deliverables make
// every phase a real milestone, not a vague step. Completion persists per-user
// in module_progress (key 'growth_build').

export interface PhaseTask { id: string; t: string; hrs: number; tool: string; done?: boolean }
export interface Phase {
  n: string; name: string; tone: string; estDays: number
  whatYouGet: string
  tasks: PhaseTask[]
  del: string[]
}

// tone = a tailwind text/gradient hint token used for the accent.
export const PHASES: Phase[] = [
  { n: '01', name: 'Vision Lock', tone: 'gold', estDays: 1,
    whatYouGet: 'A one-page brief that says exactly which agencies you\'re talking to, what you\'re promising them, and what you want them to do first.',
    tasks: [
      { id: '1a', t: 'Confirm ConsumerDirect + Co-Brand PLUS+ positioning', hrs: 1, tool: 'Manual / Decision' },
      { id: '1b', t: 'Define the core promise to a partner agency', hrs: 1, tool: 'AI Coach' },
      { id: '1c', t: 'Define the front-end call-to-action', hrs: 1, tool: 'AI Coach' },
      { id: '1d', t: 'Map your ideal partner profiles (ICP)', hrs: 2, tool: 'AI Coach' },
      { id: '1e', t: 'Choose demo-first or direct-booking front end', hrs: 1, tool: 'Manual / Decision' },
      { id: '1f', t: 'Set referral/affiliate as primary or secondary channel', hrs: 1, tool: 'Manual / Decision' },
    ], del: ['Positioning statement', 'Partner one-liner', 'Offer ladder', 'CTA map'] },

  { n: '02', name: 'Narrative Lock', tone: 'purple', estDays: 2,
    whatYouGet: 'Every word a partner will read or hear, written and approved before you design a single pixel.',
    tasks: [
      { id: '2a', t: 'Draft the partner pitch deck copy', hrs: 3, tool: 'AI Coach' },
      { id: '2b', t: 'Draft landing page headline and body', hrs: 2, tool: 'AI Coach' },
      { id: '2c', t: 'Write partner-interest form questions', hrs: 1, tool: 'AI Coach' },
      { id: '2d', t: 'Draft the 5-email nurture sequence', hrs: 2, tool: 'AI Coach' },
      { id: '2e', t: 'Draft booking confirmation + reminder SMS', hrs: 1, tool: 'AI Coach' },
      { id: '2f', t: 'Write objection-handling scripts (from Battle Cards)', hrs: 2, tool: 'Battle Cards' },
    ], del: ['Master copy doc', 'Deck copy doc', 'Messaging bank'] },

  { n: '03', name: 'Visual System', tone: 'teal', estDays: 1.5,
    whatYouGet: 'A locked-in look so every asset after this matches automatically — no more guessing what "on brand" means.',
    tasks: [
      { id: '3a', t: 'Create art direction + moodboard brief', hrs: 1, tool: 'AI Coach' },
      { id: '3b', t: 'Confirm palette + typography (navy/teal/gold, Inter)', hrs: 1, tool: 'Manual / Decision' },
      { id: '3c', t: 'Generate the asset image-prompt library', hrs: 2, tool: 'AI Coach' },
      { id: '3d', t: 'Define motion + background cues', hrs: 1, tool: 'AI Coach' },
      { id: '3e', t: 'Build the slide layout system', hrs: 2, tool: 'AI Coach' },
    ], del: ['Moodboard brief', 'Image prompt library', 'Visual style guide'] },

  { n: '04', name: 'Stack & ROI', tone: 'purple', estDays: 1,
    whatYouGet: 'A clear monthly budget and the exact math showing this system pays for itself.',
    tasks: [
      { id: '4a', t: 'Compare Claude-first vs multi-tool stack costs', hrs: 2, tool: 'AI Coach' },
      { id: '4b', t: 'List must-have tools with monthly costs', hrs: 1, tool: 'Manual / Decision' },
      { id: '4c', t: 'Mark each: Required / Optional / Replaceable', hrs: 1, tool: 'Manual / Decision' },
      { id: '4d', t: 'Estimate monthly spend across 3 scenarios', hrs: 1, tool: 'AI Coach' },
      { id: '4e', t: 'Build the ROI model (conservative / base / aggressive)', hrs: 2, tool: 'AI Coach' },
    ], del: ['Tech stack spec', 'Cost reference sheet', 'ROI model'] },

  { n: '05', name: 'Automation Build', tone: 'teal', estDays: 3.5,
    whatYouGet: 'Every agent on your AI Team actually wired up and running in your real tools — a working system, not just a plan.',
    tasks: [
      { id: '5a', t: 'Map all agent triggers and handoffs (LEO schema)', hrs: 3, tool: 'AI Coach' },
      { id: '5b', t: 'Build the CRM object model (Contacts/Agencies/Deals)', hrs: 3, tool: 'HubSpot / Airtable' },
      { id: '5c', t: 'Deploy Lead Scoring + Speed-to-Lead agents', hrs: 2, tool: 'Claude Managed Agents' },
      { id: '5d', t: 'Configure routing: Hot→Alert, Warm→Nurture, Cold→Educate', hrs: 2, tool: 'HubSpot' },
      { id: '5e', t: 'Stand up the Compliance Guardian gate (shadow mode)', hrs: 2, tool: 'Claude Managed Agents' },
      { id: '5f', t: 'Wire affiliate attribution + partner onboarding', hrs: 2, tool: 'HubSpot + Airtable' },
    ], del: ['System flow map', 'CRM schema', 'Agent recipe list', 'QA checklist'] },

  { n: '06', name: 'Asset Generation', tone: 'teal', estDays: 1,
    whatYouGet: 'Every image, diagram, and visual your deck and landing pages need, ready to drop in.',
    tasks: [
      { id: '6a', t: 'Create hero images + backgrounds', hrs: 2, tool: 'AI Coach' },
      { id: '6b', t: 'Build funnel architecture diagrams', hrs: 1, tool: 'AI Coach' },
      { id: '6c', t: 'Design the KPI dashboard mockups', hrs: 1, tool: 'AI Coach' },
      { id: '6d', t: 'Create co-brand landing mockups', hrs: 1, tool: 'AI Coach' },
      { id: '6e', t: 'Generate ConsumerDirect trust visuals', hrs: 1, tool: 'AI Coach' },
    ], del: ['Image library', 'Background library', 'Diagram assets'] },

  { n: '07', name: 'Deck Build', tone: 'gold', estDays: 1,
    whatYouGet: 'A finished, presentation-ready partner deck you could show a VP tomorrow.',
    tasks: [
      { id: '7a', t: 'Build slides from the approved copy doc', hrs: 3, tool: 'AI Coach' },
      { id: '7b', t: 'Add visuals from the approved image library', hrs: 1, tool: 'AI Coach' },
      { id: '7c', t: 'Add KPI charts + funnel visuals', hrs: 1, tool: 'AI Coach' },
      { id: '7d', t: 'Add speaker notes where needed', hrs: 1, tool: 'AI Coach' },
      { id: '7e', t: 'Export final + summary versions', hrs: 1, tool: 'AI Coach' },
    ], del: ['Final deck', 'Editable source deck', 'Summary version'] },

  { n: '08', name: 'Launch & Live', tone: 'navy', estDays: 2,
    whatYouGet: 'The system is live, taking real partner leads, and you\'re watching it work instead of building it.',
    tasks: [
      { id: '8a', t: 'Build and test all landing pages', hrs: 3, tool: 'HubSpot' },
      { id: '8b', t: 'Set up CRM tables + agent triggers', hrs: 2, tool: 'Airtable + HubSpot' },
      { id: '8c', t: 'Configure booking flow + reminders', hrs: 2, tool: 'HubSpot + Twilio' },
      { id: '8d', t: 'Connect tracking + analytics', hrs: 1, tool: 'HubSpot' },
      { id: '8e', t: 'QA every lead route end-to-end', hrs: 2, tool: 'Manual / Decision' },
      { id: '8f', t: 'Go live + monitor the first 48 hours', hrs: 2, tool: 'Manual / Decision' },
    ], del: ['Working system', 'QA results', 'Launch checklist'] },
]

// Accent tone → tailwind classes (kept in the design system, no off-brand color).
export const PHASE_TONE: Record<string, { text: string; bg: string; ring: string }> = {
  gold:   { text: 'text-[#A06C00]', bg: 'bg-gold/12',  ring: 'border-gold/40' },
  purple: { text: 'text-navy',      bg: 'bg-navy/8',   ring: 'border-navy/30' },
  teal:   { text: 'text-teal',      bg: 'bg-teal/10',  ring: 'border-teal/40' },
  navy:   { text: 'text-navy',      bg: 'bg-navy/8',   ring: 'border-navy/40' },
}

export const ALL_TASK_IDS = PHASES.flatMap(p => p.tasks.map(t => t.id))
export const TOTAL_HOURS = PHASES.reduce((s, p) => s + p.tasks.reduce((s2, t) => s2 + t.hrs, 0), 0)

// Overall completion from the KV set of done task ids.
export function buildProgress(doneIds: string[] = []) {
  const done = new Set(doneIds)
  const total = ALL_TASK_IDS.length
  const complete = ALL_TASK_IDS.filter(id => done.has(id)).length
  const doneHrs = PHASES.reduce((s, p) => s + p.tasks.filter(t => done.has(t.id)).reduce((s2, t) => s2 + t.hrs, 0), 0)
  return { complete, total, pct: total ? Math.round((complete / total) * 100) : 0, doneHrs, remainDays: Math.ceil((TOTAL_HOURS - doneHrs) / 6) }
}
