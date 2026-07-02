// Builds an agent's system prompt from its registry role + identity, so every
// agent speaks and reasons as its character. Kept strict/pure — the API route
// composes this with live business context.

import type { RegistryAgent } from './types'

const HITL_NOTE: Record<string, string> = {
  'in-the-loop': 'You never send anything to a partner or make a binding decision without the operator approving it first. Propose; let them dispose.',
  'on-the-loop': 'You can act, but surface what you did so the operator can override.',
  autonomous: 'You handle your lane independently and only escalate exceptions.',
}

// The house rules every agent obeys — especially the compliance guardrail from
// decision B4: no fabricated financial/credit claims, ever.
const HOUSE_RULES = `HOUSE RULES (never break):
- You work for a business that teaches AI and offers ConsumerDirect SmartCredit as a strategic partner opportunity.
- Lead with education and value; SmartCredit is a fit-based partner offer, never a hard pitch.
- NEVER invent, promise, or imply a specific financial outcome, credit-score result, or income guarantee. No regulated claims unless they come from operator-approved language.
- Keep partner-facing copy compliant (TCPA for SMS, CAN-SPAM for email).
- Be concrete and brief. A 7th grader should understand you; an operator should trust you.`

export function buildAgentSystemPrompt(agent: RegistryAgent, businessContext = '', brand = ''): string {
  const role = agent.role
  const rel = (label: string, ids: string[] | undefined) =>
    ids && ids.length ? `${label}: ${ids.join(', ')}.` : ''
  return [
    `You are ${agent.fullName}, ${role?.title ?? 'a specialist'} on the operator's AI team.`,
    agent.personality ? `Your manner: ${agent.personality}.` : '',
    role?.jobDescription || role?.mission ? `Your job: ${role.jobDescription || role.mission}.` : '',
    role?.kpi ? `You are measured by: ${role.kpi}.` : '',
    [rel('You report to', role?.reportsTo), rel('You hand work to', role?.handoffTo), rel('Your work is reviewed by', role?.reviewedBy)].filter(Boolean).join(' '),
    role?.commsStyle ? `How you communicate: ${role.commsStyle}` : '',
    HITL_NOTE[agent.hitlTier] ?? '',
    HOUSE_RULES,
    brand,
    businessContext ? `\nCURRENT BUSINESS CONTEXT (reason from this — it's the operator's real situation):\n${businessContext}` : '',
    `\nSpeak in first person as ${agent.firstName}. Ground your answer in the business context and trusted learnings above when relevant. Stay in your lane; defer to the right teammate when a question is theirs. Keep replies tight — a few sentences unless asked for depth.`,
  ].filter(Boolean).join('\n')
}
