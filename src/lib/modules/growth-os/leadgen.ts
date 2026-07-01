// Apex — Lead Gen static catalog. The leads themselves come from the REAL
// partner_onboarding pipeline (via useGrowthOS.leadList); this file holds the
// asset-generation prompt library, the score→action routing map, and the demo
// campaign set (clearly badged Demo until a campaign source is connected). All
// re-themed to the ConsumerDirect Co-Brand PLUS+ partner motion.

// Pre-configured AI asset generators — each hands a complete brief to the coach.
export const GEN_PROMPTS: { l: string; p: string }[] = [
  { l: 'Email Sequence', p: 'Write a 5-email nurture sequence for ConsumerDirect Co-Brand PLUS+ aimed at warm credit-repair AGENCY prospects (score 50–79). Include subject lines and opening lines. Focus on the recurring rev-share, the co-branded client experience, and booking a partnership call. Compliance-safe: no guaranteed credit outcomes.' },
  { l: 'Landing Page Copy', p: 'Write a high-converting partner landing page for ConsumerDirect Co-Brand PLUS+. Include headline, subheadline, 3 benefit bullets for a credit-repair agency owner, social proof framing, and CTA button text. No guaranteed-outcome claims.' },
  { l: 'Partner VSL Script', p: 'Write a 5-minute VSL script pitching ConsumerDirect Co-Brand PLUS+ to credit-repair agencies. Structure: Problem-Agitate-Solution-Proof-CTA. Focus on adding a recurring revenue line and a better client credit experience. Conversational, compliant.' },
  { l: 'SMS Follow-Ups', p: 'Write 3 SMS follow-ups for hot Co-Brand PLUS+ agency prospects not yet booked. Each under 160 characters. Create urgency without hype. Include a [BOOKING_LINK] placeholder and TCPA opt-out on the first message.' },
  { l: 'Partner One-Pager', p: 'Create a one-pager concept for recruiting credit-repair agencies to ConsumerDirect Co-Brand PLUS+. Include title, subtitle, 5 key points (rev share, co-brand, onboarding support, compliance, client tools), and an application CTA.' },
  { l: 'Scoring Model', p: 'Design the full 3-part partner lead scoring model for Co-Brand PLUS+: Intent (0–40), Fit (0–35), Readiness (0–25). For each: 3 qualifying questions for an agency, scoring criteria, and the composite calculation.' },
  { l: 'Pitch Deck Copy', p: 'Write copy for an 11-slide Co-Brand PLUS+ partner pitch deck: Cover, Problem, Market, Product, Funnel, AI Routing, Offer, Partner Economics, Tech Stack, KPIs/ROI, CTA. Specific and compelling, compliant.' },
  { l: 'Affiliate Pitch', p: 'Write a high-converting recruitment pitch for the ConsumerDirect Co-Brand PLUS+ partner program. Include headline, earnings structure (recurring rev share), co-brand mechanics, requirements, and application CTA.' },
]

// Score → recommended action, with the benchmark that justifies it.
export const SCORE_ROUTING: [string, string, string, string][] = [
  ['90–100', 'Book immediately', 'text-success', '21x more likely to qualify'],
  ['75–89', 'Fast-track offer', 'text-teal', '4–10x email reply rate'],
  ['50–74', 'Nurture drip', 'text-[#A06C00]', '+50% sales-ready, −33% cost'],
  ['0–49', 'Education sequence', 'text-gray', 'stays warm for when they\'re ready'],
]

// Demo campaigns — badged Demo until a real campaign source is connected.
export const DEMO_CAMPAIGNS: { id: number; name: string; type: string; status: string; leads: number; conv: string }[] = [
  { id: 1, name: 'Agency Rev-Share Intro Drip', type: 'Email Drip', status: 'active', leads: 89, conv: '16%' },
  { id: 2, name: 'Co-Brand Demo VSL Funnel', type: 'VSL + Email', status: 'active', leads: 134, conv: '22%' },
  { id: 3, name: 'Partner Fit Assessment → Book', type: 'AI Quiz', status: 'active', leads: 47, conv: '31%' },
  { id: 4, name: 'Referral Partner Co-Brand', type: 'Co-Brand Path', status: 'draft', leads: 0, conv: '—' },
]

export const fmtAgo = (min: number) => min < 60 ? `${min}m ago` : min < 1440 ? `${Math.round(min / 60)}h ago` : `${Math.round(min / 1440)}d ago`

// AI-suggested next action per lead, grounded in speed-to-lead research.
export function leadSuggestion(lead: { stage: string; temperature: string; agoMin: number }) {
  if (lead.temperature === 'hot' && lead.stage !== 'converted' && lead.agoMin > 60) return { urgent: true, text: 'Call now — qualification odds drop fast after the first hour' }
  if (lead.temperature === 'hot' && lead.stage !== 'converted') return { urgent: false, text: 'Inside the high-conversion window — keep it that way' }
  if (lead.temperature === 'warm' && lead.agoMin > 720) return { urgent: true, text: 'Stalled 12h+ — nudge with a value-first message' }
  if (lead.temperature === 'warm') return { urgent: false, text: 'On track in the nurture drip — no action needed yet' }
  if (lead.stage === 'converted') return { urgent: false, text: 'Signed — eligible for a referral ask' }
  return { urgent: false, text: 'Low urgency — the education sequence is handling this' }
}
