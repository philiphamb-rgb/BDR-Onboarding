// The AI Team org structure — a leadership hierarchy laid over the 18 roster
// agents. This is the "who are the agents and how do they work together" model
// that powers the AI Team tab's org-chart visual. Two kinds of relationship:
//
//   • REPORTING (this file): a tree — every agent has one manager, the way a
//     CMO reports to a President reports to the CEO. Drawn as connector lines.
//   • HANDOFF (roster.handoffTo): a lateral graph — who passes work to whom.
//     Rendered as "hands to →" chips on each node.
//
// The human BDR is the principal (the CEO); the agents are the workforce under
// them. Titles frame each agent's ROLE in that org, not just its task.

export interface OrgRole {
  id: string            // roster agent id
  title: string         // org-role framing (CEO-style)
  reportsTo: string     // manager id, or 'you' for the principal's directs
  tier: 1 | 2 | 3       // 1 = C-suite (reports to you), 2 = division lead, 3 = specialist
  division: 'exec' | 'funnel' | 'content' | 'retention' | 'ops'
}

// The principal — the human. Everything rolls up here.
export const PRINCIPAL = {
  id: 'you',
  title: 'You — the operator',
  blurb: 'The whole AI team works for you. Agents report up, hand work sideways, and clear Compliance before anything reaches a partner.',
}

export const ORG: Record<string, OrgRole> = {
  // ── C-suite: report directly to you ──────────────────────────────────────
  'daily-briefing':      { id: 'daily-briefing',      title: 'Chief of Staff',        reportsTo: 'you', tier: 1, division: 'exec' },
  'compliance-guardian': { id: 'compliance-guardian', title: 'General Counsel',        reportsTo: 'you', tier: 1, division: 'exec' },

  // ── Division leads: report to the Chief of Staff ─────────────────────────
  scoring:               { id: 'scoring',               title: 'VP, Lead Funnel',       reportsTo: 'daily-briefing', tier: 2, division: 'funnel' },
  'content-idea':        { id: 'content-idea',          title: 'VP, Content & Research', reportsTo: 'daily-briefing', tier: 2, division: 'content' },
  'customer-retention':  { id: 'customer-retention',    title: 'VP, Partner Success',   reportsTo: 'daily-briefing', tier: 2, division: 'retention' },
  qa:                    { id: 'qa',                    title: 'VP, Ops & Quality',     reportsTo: 'daily-briefing', tier: 2, division: 'ops' },

  // ── Specialists: report to their division lead ───────────────────────────
  alert:        { id: 'alert',        title: 'Speed-to-Lead Rep',   reportsTo: 'scoring', tier: 3, division: 'funnel' },
  'call-prep':  { id: 'call-prep',    title: 'Sales Enablement',    reportsTo: 'scoring', tier: 3, division: 'funnel' },
  noshow:       { id: 'noshow',       title: 'Reschedule Rep',      reportsTo: 'scoring', tier: 3, division: 'funnel' },
  nurture:      { id: 'nurture',      title: 'Warm Nurture Lead',   reportsTo: 'scoring', tier: 3, division: 'funnel' },
  'cold-nurture': { id: 'cold-nurture', title: 'Cold Nurture Lead', reportsTo: 'scoring', tier: 3, division: 'funnel' },
  affiliate:    { id: 'affiliate',    title: 'Attribution Analyst', reportsTo: 'scoring', tier: 3, division: 'funnel' },
  winback:      { id: 'winback',      title: 'Win-Back Rep',        reportsTo: 'scoring', tier: 3, division: 'funnel' },

  'hook-research': { id: 'hook-research', title: 'Research Analyst', reportsTo: 'content-idea', tier: 3, division: 'content' },

  referral:     { id: 'referral',     title: 'Referrals Lead',      reportsTo: 'customer-retention', tier: 3, division: 'retention' },
  testimonial:  { id: 'testimonial',  title: 'Social Proof Lead',   reportsTo: 'customer-retention', tier: 3, division: 'retention' },

  reconciliation: { id: 'reconciliation', title: 'Finance Analyst', reportsTo: 'qa', tier: 3, division: 'ops' },
  teaching:     { id: 'teaching',     title: 'Onboarding Guide',    reportsTo: 'qa', tier: 3, division: 'ops' },
}

export const DIVISIONS: { key: OrgRole['division']; label: string; blurb: string }[] = [
  { key: 'funnel',    label: 'Lead Funnel',        blurb: 'Scores, routes, and follows up with every partner lead.' },
  { key: 'content',   label: 'Content & Research', blurb: 'Decides what to publish and keeps the hooks fresh.' },
  { key: 'retention', label: 'Partner Success',    blurb: 'Protects the recurring revenue after the signature.' },
  { key: 'ops',       label: 'Ops & Quality',      blurb: 'Audits the system, reconciles income, onboards you.' },
]

export const orgRole = (id: string): OrgRole | undefined => ORG[id]
export const directReports = (managerId: string): string[] =>
  Object.values(ORG).filter(r => r.reportsTo === managerId).map(r => r.id)
