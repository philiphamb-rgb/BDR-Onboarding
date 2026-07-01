# Cortex — Cost Reference

_Governance figures for budgeting the agentic system. Blended estimates at
realistic single-BDR volume; adapt as real usage data lands. Mirrors the
reference playbook's cost-stack format._

## Per-agent run cost (blended, monthly)

These are the `costPerMo` values surfaced on the AI Team tab (est. Claude tokens +
tool share). Live agents only count toward the running total.

| Category | Agent | Est. $/mo |
|---|---|---|
| Funnel | Lead Scoring | 18 |
| Funnel | Speed-to-Lead Alert | 12 |
| Funnel | Call Prep | 9 |
| Funnel | No-Show Rescue | 7 |
| Funnel | Nurture Drip | 22 |
| Funnel | Cold Nurture | 14 |
| Funnel | Affiliate Attribution | 11 |
| Funnel | Win-Back | 8 |
| Content | Content Idea | 10 |
| Content | Hook Research | 8 |
| Retention | Referral Ask | 6 |
| Retention | Partner Retention & Activation | 15 |
| Retention | Testimonial / UGC | 7 |
| Ops | Compliance Guardian | 20 |
| Ops | Pipeline QA | 9 |
| Ops | Income Reconciliation | 8 |
| Ops | Daily Briefing | 6 |
| Ops | Teaching (in-app) | 0 |

**All 18 running:** ~$190/mo per BDR in reasoning cost.

## Tool stack (external, monthly — connect as needed)

| Tool | Purpose | Typical tier |
|---|---|---|
| Claude Managed Agents | Orchestration + reasoning | usage-metered (above) |
| HubSpot | CRM + email + workflows | existing seat / API scope |
| Twilio | SMS (alerts, reschedules, briefings) | ~$0.0079/SMS + number |
| AI voice setter (if adopted) | Outbound qualification calls | **$0.09–$0.25 / min all-in** |
| Airtable | Attribution ledger / schema | free–$20/seat |
| Google Calendar | Availability + booking | existing |
| Slack | Alert channel + audit | existing |

## Blended monthly estimate (one BDR, realistic launch)

| Scenario | Live agents | Reasoning | SMS/voice | Tools | ~Total/mo |
|---|---|---|---|---|---|
| Conservative | 6 (Claude-only) | ~$60 | ~$15 | existing seats | **~$75** |
| Base | 12 | ~$130 | ~$60 | +Twilio/Airtable | **~$220** |
| Aggressive | 18 + voice setter | ~$190 | ~$250 (voice) | full stack | **~$500** |

## Cost-per-outcome (the number that matters)

Track $ per booked partner call and $ per signed partner. At base scenario
(~$220/mo) a single additional signed agency — recurring at a blended
~$219/mo — pays for the entire system many times over in month one. Cost meters
per agent and a system-wide budget cap are surfaced on the AI Team tab
(`monthlyCost`); alert-before-cap is the one governance piece awaiting the live
usage feed.
