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
  plain: string          // plain-English translation shown under the title
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
  'daily-briefing':      { id: 'daily-briefing',      title: 'Chief of Staff',        plain: 'Sends your one most important move each morning', reportsTo: 'you', tier: 1, division: 'exec' },
  'compliance-guardian': { id: 'compliance-guardian', title: 'General Counsel',        plain: 'Checks every message before it reaches a partner', reportsTo: 'you', tier: 1, division: 'exec' },

  // ── Division leads: report to the Chief of Staff ─────────────────────────
  scoring:               { id: 'scoring',               title: 'VP, Lead Funnel',       plain: 'Owns scoring and routing for every new lead', reportsTo: 'daily-briefing', tier: 2, division: 'funnel' },
  'content-idea':        { id: 'content-idea',          title: 'VP, Content & Research', plain: 'Owns what you post and when', reportsTo: 'daily-briefing', tier: 2, division: 'content' },
  'customer-retention':  { id: 'customer-retention',    title: 'VP, Partner Success',   plain: 'Protects your recurring revenue after the signature', reportsTo: 'daily-briefing', tier: 2, division: 'retention' },
  qa:                    { id: 'qa',                    title: 'VP, Ops & Quality',     plain: 'Audits the whole system for silent failures', reportsTo: 'daily-briefing', tier: 2, division: 'ops' },

  // ── Specialists: report to their division lead ───────────────────────────
  alert:        { id: 'alert',        title: 'Speed-to-Lead Rep',   plain: 'Texts you the instant a lead goes hot', reportsTo: 'scoring', tier: 3, division: 'funnel' },
  'call-prep':  { id: 'call-prep',    title: 'Sales Enablement',    plain: 'Preps a one-page brief before every call', reportsTo: 'scoring', tier: 3, division: 'funnel' },
  noshow:       { id: 'noshow',       title: 'Reschedule Rep',      plain: 'Recovers missed calls with a reschedule text', reportsTo: 'scoring', tier: 3, division: 'funnel' },
  nurture:      { id: 'nurture',      title: 'Warm Nurture Lead',   plain: 'Runs the 5-email warm follow-up sequence', reportsTo: 'scoring', tier: 3, division: 'funnel' },
  'cold-nurture': { id: 'cold-nurture', title: 'Cold Nurture Lead', plain: 'Keeps cold leads warm with light education', reportsTo: 'scoring', tier: 3, division: 'funnel' },
  affiliate:    { id: 'affiliate',    title: 'Attribution Analyst', plain: 'Makes sure the right partner gets credit', reportsTo: 'scoring', tier: 3, division: 'funnel' },
  winback:      { id: 'winback',      title: 'Win-Back Rep',        plain: 'Re-engages leads who went quiet', reportsTo: 'scoring', tier: 3, division: 'funnel' },

  'hook-research': { id: 'hook-research', title: 'Research Analyst', plain: 'Keeps your content\'s opening lines fresh', reportsTo: 'content-idea', tier: 3, division: 'content' },

  referral:     { id: 'referral',     title: 'Referrals Lead',      plain: 'Welcomes new partners and asks for referrals', reportsTo: 'customer-retention', tier: 3, division: 'retention' },
  testimonial:  { id: 'testimonial',  title: 'Social Proof Lead',   plain: 'Turns happy partners into content', reportsTo: 'customer-retention', tier: 3, division: 'retention' },

  reconciliation: { id: 'reconciliation', title: 'Finance Analyst', plain: 'Checks commissions owed vs received', reportsTo: 'qa', tier: 3, division: 'ops' },
  teaching:     { id: 'teaching',     title: 'Onboarding Guide',    plain: 'Walks you through the app, step by step', reportsTo: 'qa', tier: 3, division: 'ops' },
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
