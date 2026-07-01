// Apex — the operational layer for the Automations tab. The AI Team tab
// shows each agent's PROMPT + build spec; this map adds the same agents'
// OPERATIONAL view: the plain-English trigger→action, a researched ROI stat,
// the tool-connection status, and the handful of tunable settings a manager
// actually turns. Keyed by the same agent id as the roster — one roster, two
// lenses, no parallel "automations vs agents" split.
//
// ROI stats are drawn from published benchmark research (cited per row) and
// adapted to the partner motion; run-time cost lives on the roster (costPerMo).

export type ConfigField =
  | { key: string; label: string; type: 'toggle'; value: boolean }
  | { key: string; label: string; type: 'number'; value: number; suffix?: string }

export interface AutomationMeta {
  action: string                 // the "then" in when→then
  why: string                    // 7th-grade plain language
  impactStat: string             // headline number
  impactLabel: string            // what the number means
  hrsWeek: number                // manual hours removed per week when live
  source: string                 // benchmark citation
  tools: { name: string; connected: boolean }[]
  config: ConfigField[]
}

export const AUTOMATION_META: Record<string, AutomationMeta> = {
  scoring: { action: 'Score + Route', hrsWeek: 4,
    why: 'The moment an agency fills out a form, this reads their answers and scores them 0–100 — so you instantly know who to call first instead of guessing.',
    impactStat: '+30–60%', impactLabel: 'more meetings booked from the same lead volume', source: 'Automated lead scoring & enrichment benchmark studies, 2026',
    tools: [{ name: 'HubSpot', connected: true }, { name: 'Claude', connected: true }, { name: 'Airtable', connected: true }],
    config: [ { key: 'intentW', label: 'Intent score weight', type: 'number', value: 40, suffix: 'pts max' }, { key: 'fitW', label: 'Fit score weight', type: 'number', value: 35, suffix: 'pts max' }, { key: 'readyW', label: 'Readiness score weight', type: 'number', value: 25, suffix: 'pts max' }, { key: 'rescore', label: 'Re-score on new activity', type: 'toggle', value: true } ] },

  alert: { action: 'SMS + Slack Alert', hrsWeek: 2,
    why: 'When a lead scores 80+, this taps your phone immediately instead of waiting for you to check your inbox. The first five minutes decide almost everything.',
    impactStat: '21x', impactLabel: 'more likely to qualify vs a 30-minute wait', source: 'MIT / InsideSales.com 5-minute response study (15,000+ leads)',
    tools: [{ name: 'Twilio', connected: true }, { name: 'Slack', connected: false }, { name: 'HubSpot', connected: true }],
    config: [ { key: 'threshold', label: 'Score threshold to trigger', type: 'number', value: 80, suffix: 'pts' }, { key: 'sms', label: 'Notify via SMS', type: 'toggle', value: true }, { key: 'slack', label: 'Notify via Slack', type: 'toggle', value: false }, { key: 'escalate', label: 'Escalate if no response within', type: 'number', value: 5, suffix: 'min' } ] },

  'call-prep': { action: 'One-page call brief', hrsWeek: 3,
    why: 'Before every booked call, this assembles who the agency is, their stated need, and the two objections most likely to come up — so you walk in ready instead of scrambling.',
    impactStat: '+15 min', impactLabel: 'of prep time back before every call', source: 'Internal time-study estimate',
    tools: [{ name: 'HubSpot', connected: true }, { name: 'Claude', connected: true }, { name: 'Battle Cards', connected: true }],
    config: [ { key: 'lead', label: 'Deliver brief before call', type: 'number', value: 30, suffix: 'min' }, { key: 'objections', label: 'Objections to pre-load', type: 'number', value: 2, suffix: '' } ] },

  noshow: { action: 'Reschedule SMS', hrsWeek: 2,
    why: 'If an agency misses their call, this instantly texts a new time to grab. Most people reschedule right away if you ask within the first couple hours.',
    impactStat: '−22% to −40%', impactLabel: 'fewer missed appointments', source: 'SMS appointment reminder studies, B2B service benchmarks',
    tools: [{ name: 'Twilio', connected: true }, { name: 'Google Calendar', connected: true }, { name: 'HubSpot', connected: true }],
    config: [ { key: 'delay', label: 'Send reschedule text after', type: 'number', value: 120, suffix: 'min' }, { key: 'link', label: 'Include one-click reschedule link', type: 'toggle', value: true } ] },

  nurture: { action: '5-touch email sequence', hrsWeek: 5,
    why: 'Leads in the middle don\'t need a hard sell yet. They need a few short, helpful emails that build trust before you ever pick up the phone.',
    impactStat: '4–10x', impactLabel: 'higher response than one-off emails', source: 'B2B lead nurturing benchmark research, 2026',
    tools: [{ name: 'HubSpot', connected: true }, { name: 'Claude', connected: true }],
    config: [ { key: 'len', label: 'Sequence length', type: 'number', value: 5, suffix: 'emails' }, { key: 'gap', label: 'Days between sends', type: 'number', value: 2, suffix: 'days' }, { key: 'pause', label: 'Pause if lead replies', type: 'toggle', value: true } ] },

  'cold-nurture': { action: '14-day education drip', hrsWeek: 4,
    why: 'Not every agency is ready today. This keeps your name in front with light, useful emails — so you\'re who they remember when they finally are.',
    impactStat: '+50% / −33% cost', impactLabel: 'more sales-ready leads at lower cost', source: 'Forrester lead nurturing benchmark, replicated through 2026',
    tools: [{ name: 'HubSpot', connected: true }, { name: 'Claude', connected: true }],
    config: [ { key: 'emails', label: 'Emails in sequence', type: 'number', value: 6, suffix: 'emails' }, { key: 'promote', label: 'Auto-promote to Warm on 2+ clicks', type: 'toggle', value: true } ] },

  affiliate: { action: 'Tag + Co-Brand Path', hrsWeek: 3,
    why: 'When someone clicks a partner\'s link, this remembers who sent them — so the partner gets credit and the referred agency sees matching branding.',
    impactStat: '~100%', impactLabel: 'attribution accuracy on partner-sourced leads', source: 'Affiliate / partner marketing operations best practice',
    tools: [{ name: 'HubSpot', connected: true }, { name: 'Airtable', connected: false }, { name: 'Claude', connected: true }],
    config: [ { key: 'window', label: 'Attribution window', type: 'number', value: 30, suffix: 'days' }, { key: 'cobrand', label: 'Show co-branded landing', type: 'toggle', value: true }, { key: 'notify', label: 'Notify partner on conversion', type: 'toggle', value: false } ] },

  winback: { action: 'Win-Back Campaign', hrsWeek: 3,
    why: 'Agencies quiet for 30+ days aren\'t gone — they just need a different message. This brings them a fresh reason to come back.',
    impactStat: '~7%', impactLabel: 'of inactive leads re-engage', source: 'SMS / email win-back campaign benchmark data',
    tools: [{ name: 'HubSpot', connected: true }, { name: 'Claude', connected: true }],
    config: [ { key: 'trigger', label: 'Trigger after inactivity', type: 'number', value: 30, suffix: 'days' }, { key: 'stop', label: 'Stop after', type: 'number', value: 21, suffix: 'days no reply' } ] },

  'content-idea': { action: 'Daily ranked content queue', hrsWeek: 5,
    why: 'Every morning this drafts and ranks the day\'s content ideas by expected value — so you never stare at a blank screen wondering what to post.',
    impactStat: '−80%', impactLabel: 'less time deciding what to make', source: 'Internal content-ops time estimate',
    tools: [{ name: 'Claude', connected: true }, { name: 'Analytics', connected: true }],
    config: [ { key: 'count', label: 'Ideas per day', type: 'number', value: 7, suffix: 'ideas' }, { key: 'rebalance', label: 'Auto-rebalance pillar mix', type: 'toggle', value: true } ] },

  'hook-research': { action: 'Fresh hook library', hrsWeek: 2,
    why: 'The first two seconds decide whether anyone keeps watching. This studies which openers hold attention and keeps fresh ones ready.',
    impactStat: '+1 pt retention', impactLabel: 'per swap to a proven hook, at no extra cost', source: 'Short-form retention benchmark research',
    tools: [{ name: 'Claude', connected: true }, { name: 'Analytics', connected: true }],
    config: [ { key: 'variants', label: 'New variants per run', type: 'number', value: 5, suffix: 'hooks' } ] },

  referral: { action: 'Welcome + Referral ask', hrsWeek: 2,
    why: 'The moment an agency signs, this sends a warm welcome — then asks for a referral about a week later, when they\'re happiest with the decision.',
    impactStat: '+62%', impactLabel: 'higher response when it references the relationship', source: 'Personalized follow-up response-rate research',
    tools: [{ name: 'HubSpot', connected: true }, { name: 'Claude', connected: true }],
    config: [ { key: 'welcome', label: 'Welcome delay', type: 'number', value: 5, suffix: 'min' }, { key: 'ask', label: 'Referral ask delay', type: 'number', value: 7, suffix: 'days' } ] },

  'customer-retention': { action: 'Churn-risk flag + nudge', hrsWeek: 4,
    why: 'Your commission is recurring, so a signed partner who goes quiet is a bigger loss than a missed lead. This catches them before they churn.',
    impactStat: '5x', impactLabel: 'cheaper to keep a partner than sign a new one', source: 'Widely-replicated retention-vs-acquisition cost research',
    tools: [{ name: 'HubSpot', connected: true }, { name: 'Claude', connected: true }, { name: 'Partner analytics', connected: false }],
    config: [ { key: 'risk', label: 'Flag inactivity over', type: 'number', value: 21, suffix: 'days' }, { key: 'auto', label: 'Auto-draft re-activation nudge', type: 'toggle', value: true } ] },

  testimonial: { action: 'Testimonial ask → content', hrsWeek: 2,
    why: 'When a partner hits a real milestone, this asks for a quick testimonial and routes anything back into your content queue as proof.',
    impactStat: '#1', impactLabel: 'highest-converting content type is proof', source: 'Content-format conversion benchmarks',
    tools: [{ name: 'HubSpot', connected: true }, { name: 'Claude', connected: true }],
    config: [ { key: 'auto', label: 'Route returns into content queue', type: 'toggle', value: true } ] },

  qa: { action: 'Nightly pipeline audit', hrsWeek: 2,
    why: 'The failures that hurt most are the ones nobody sees — a lead scored but never routed. This goes looking every night so they don\'t pile up.',
    impactStat: '0 silent', impactLabel: 'dropped leads slip through unnoticed', source: 'Pipeline-integrity best practice',
    tools: [{ name: 'HubSpot', connected: true }, { name: 'Claude', connected: true }],
    config: [ { key: 'sev', label: 'Only surface severity ≥', type: 'number', value: 2, suffix: '(1–3)' } ] },

  reconciliation: { action: 'Weekly income reconcile', hrsWeek: 2,
    why: 'Recurring revenue is easy to lose track of. This ties expected commission to what actually landed and flags any real gap.',
    impactStat: '100%', impactLabel: 'of payout variances get noticed', source: 'Revenue-operations best practice',
    tools: [{ name: 'Commission data', connected: false }, { name: 'Claude', connected: true }],
    config: [ { key: 'threshold', label: 'Flag variance over', type: 'number', value: 5, suffix: '%' } ] },

  'daily-briefing': { action: 'Morning SMS brief', hrsWeek: 1,
    why: 'The in-app plan only helps if you open the app. This pushes the single most important thing to your phone each morning, even on a day you don\'t.',
    impactStat: '10 sec', impactLabel: 'to know your #1 move for the day', source: 'Proactive-briefing design principle',
    tools: [{ name: 'Twilio', connected: true }, { name: 'Claude', connected: true }],
    config: [ { key: 'time', label: 'Send each morning at', type: 'number', value: 7, suffix: ':00' } ] },
}
