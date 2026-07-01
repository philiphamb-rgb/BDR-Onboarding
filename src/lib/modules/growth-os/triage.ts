// Growth OS — the Triage engine. Turns the BDR's real goals (income, leads/week,
// close rate) + the live pipeline + the AI Team's state + build progress into an
// always-visible "Right Now / Next / After That" plan. Every item states which
// goal it serves and why it outranks the alternatives — never a black box.
// Deterministic; the AI Coach only ever acts on the item's prompt when tapped.

export interface TriageItem {
  tier: 'now' | 'next' | 'after'
  icon: string          // icon key resolved by the caller
  tone: string          // 'error' | 'teal' | 'gold' | 'navy'
  title: string
  reason: string
  prompt: string        // askCoach() payload
}

interface Ctx {
  goals: { monthly_income_goal?: number | null; leads_per_week_goal?: number | null; close_rate_goal?: number | null }
  leads: { hot: number; warm: number; cold: number; newThisWeek: number; closeRate: number; total: number }
  setupAgents: { name: string }[]     // agents needing setup
  hotStale: number                     // hot leads with no recent touch
  buildIncomplete?: { n: string; name: string } | null
}

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

export function computeTriage(c: Ctx): TriageItem[] {
  const { goals, leads, setupAgents, hotStale, buildIncomplete } = c
  const items: TriageItem[] = []
  const incomeGoal = goals.monthly_income_goal || 0
  const leadsGoal = goals.leads_per_week_goal || 0
  const closeGoal = goals.close_rate_goal != null ? Number(goals.close_rate_goal) : 0

  // ── RIGHT NOW ──
  if (hotStale > 0) {
    items.push({ tier: 'now', icon: 'FlameIcon', tone: 'error',
      title: `Work ${hotStale} hot partner lead${hotStale > 1 ? 's' : ''} now`,
      reason: closeGoal ? `Tied to your ${closeGoal}% close-rate goal — you're at ${leads.closeRate}% and every minute of delay cuts your odds of qualifying a hot lead.` : `Leads worked in the first 5 minutes are 21x more likely to qualify. These are cooling.`,
      prompt: 'I have hot partner leads that have gone quiet. Write me ready-to-send outreach to re-engage each and move them toward a signed Partnership Order Form.' })
  } else if (setupAgents.length > 0) {
    items.push({ tier: 'now', icon: 'LightningIcon', tone: 'teal',
      title: `Turn on "${setupAgents[0].name}"`,
      reason: incomeGoal ? `Tied to your ${money(incomeGoal)}/mo income goal — activating this agent gives you back selling time you're spending on manual work.` : `This agent is built and waiting — activating it does work for you automatically.`,
      prompt: `Walk me through activating the "${setupAgents[0].name}" in my Growth OS, step by step, and what to test before I trust it.` })
  } else {
    items.push({ tier: 'now', icon: 'TargetIcon', tone: 'gold',
      title: 'Publish today\'s highest-value content',
      reason: leadsGoal ? `Tied to your ${leadsGoal} leads/week goal — content is your top-of-funnel for attracting new agency partners.` : 'Content is your top-of-funnel for attracting new agency partners.',
      prompt: 'What\'s the single highest-value piece of content I should publish today to attract credit-repair agency partners, and why?' })
  }

  // ── NEXT ──
  if (leadsGoal && leads.newThisWeek < leadsGoal) {
    items.push({ tier: 'next', icon: 'ChartRisingIcon', tone: 'teal',
      title: 'Boost partner-lead volume this week',
      reason: `You've added ${leads.newThisWeek} new leads this week against a goal of ${leadsGoal}. Feed the top of funnel.`,
      prompt: 'Give me 3 specific, immediately actionable ways to increase my partner-lead volume this week.' })
  } else if (buildIncomplete) {
    items.push({ tier: 'next', icon: 'ChecklistIcon', tone: 'navy',
      title: `Continue Phase ${buildIncomplete.n}: ${buildIncomplete.name}`,
      reason: 'This unlocks the next layer of your growth system and compounds everything after it.',
      prompt: `Help me complete the next task in Phase ${buildIncomplete.n} (${buildIncomplete.name}) of my Growth OS build.` })
  } else {
    items.push({ tier: 'next', icon: 'IntegrationIcon', tone: 'teal',
      title: 'Review your AI Team\'s performance',
      reason: 'Keep what\'s working, tune what isn\'t — small adjustments compound over time.',
      prompt: 'Review my live Growth OS agents and suggest one specific improvement to each.' })
  }

  // ── AFTER THAT ──
  if (closeGoal && leads.closeRate < closeGoal) {
    items.push({ tier: 'after', icon: 'StarIcon', tone: 'gold',
      title: 'Sharpen your close-rate approach',
      reason: `You're at ${leads.closeRate}% against a ${closeGoal}% goal — small process fixes compound fast here.`,
      prompt: `My partner close rate is ${leads.closeRate}%, below my ${closeGoal}% goal. What specific process changes would move it fastest?` })
  } else if (buildIncomplete) {
    items.push({ tier: 'after', icon: 'ChecklistIcon', tone: 'navy',
      title: `Plan ahead: Phase ${buildIncomplete.n}`,
      reason: 'Stay one step ahead of your own build instead of reacting to it.',
      prompt: `Give me a clear overview of what's involved in Phase ${buildIncomplete.n} of my Growth OS build.` })
  } else {
    items.push({ tier: 'after', icon: 'LightningIcon', tone: 'navy',
      title: 'Test a new outreach angle',
      reason: 'Compounding growth means always testing the next thing, not just repeating what works.',
      prompt: 'Suggest one completely new partner-outreach angle I haven\'t tried yet, and why it could work.' })
  }

  return items
}
