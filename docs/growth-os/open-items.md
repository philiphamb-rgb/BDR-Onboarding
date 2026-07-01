# Growth OS — Open Items / Integration Requests

_Exactly what's genuinely blocked on external access, so leadership knows what to
approve. Everything below is built as an interface/contract; each item flips
agents from "ready" to "running."_

## Needs a credential / API scope

| # | Ask | Unblocks | Notes |
|---|---|---|---|
| 1 | **HubSpot API scope** (two-way) | Lead Scoring writes, Nurture sends, all CRM reads/writes | Fallback paths exist: n8n webhook sync, and CSV import/export so the tool is never fully blocked. |
| 2 | **Twilio account + number** | Speed-to-Lead Alert, No-Show Rescue, Daily Briefing (all SMS) | ~$0.0079/SMS. |
| 3 | **Claude Managed Agents access** (Developer Platform) | Orchestration for all agents (webhook + cron) | Verify current config syntax at build time. |
| 4 | **Airtable base** | Affiliate attribution ledger, schema mirror | Free tier is fine to start. |
| 5 | **Slack incoming webhook** | Alert channel + permanent audit backup | Speed-to-Lead posts here regardless of SMS status. |
| 6 | **Commission/payout data feed** | Income Reconciliation Agent, live income forecast | Until connected, the forecast is demo-badged. |
| 7 | **Partner product-usage / activation data** | Partner Retention & Testimonial agents | Confirm the source exists before building those two. |

## Needs a backend job (no external credential, just scheduling)

| # | Item | Notes |
|---|---|---|
| 8 | **Feedback-loop nightly synthesis** | Capture + changelog are live (`growth_feedback` + Feedback control). The Manager Digest → approve/reject → versioned instruction-update → rollback pipeline needs a scheduled Claude Managed Agent with write access to agent-instruction storage. |
| 9 | **Cost meter live feed + budget-cap alerts** | Per-agent estimates + running total are shown; alert-before-cap needs the live usage feed. |

## Product decisions to confirm (business rules)

- Exact Co-Brand PLUS+ economics (setup waiver thresholds, rev-share %, bonus
  structure) to hardcode as the compliance source-of-truth — agents currently say
  "the BDR will confirm the exact figure" rather than invent one.
- Which lead source(s) are live vs stubbed for the Lead Builder motion.

## Deferred by design (documented, not blocking)

- Full 3-tier brand-voice template CMS (guardrail/voice layer already baked into
  every agent prompt).
- Full HubSpot-parity CRM dashboards (mapped onto existing Partners + Manager
  Analytics today).
- Dedicated ChatGPT-connector Strategizer space (served by the existing coach).
