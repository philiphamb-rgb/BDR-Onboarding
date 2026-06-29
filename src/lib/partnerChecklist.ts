// New Partner Onboarding checklist — the canonical template + pipeline stages.
// Per-partner rows store only { key, done, note } in partner_onboarding.checklist;
// labels/descriptions/stages are resolved from this template at render time, so
// improving the template improves every partner's checklist.

export interface ChecklistTemplateItem {
  key: string
  label: string
  desc: string
  stage: string // pipeline stage this task belongs to
  link?: string // system key (see src/lib/links.ts) for a one-tap launch button
}

export interface ChecklistState {
  key: string
  done: boolean
  note?: string
}

export const PIPELINE_STAGES: { key: string; label: string; color: string }[] = [
  { key: 'new_lead', label: 'New Lead', color: '#64748B' },
  { key: 'interested', label: 'Interested', color: '#1D4ED8' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#6D28D9' },
  { key: 'contract_signed', label: 'Contract Signed', color: '#CA8A04' },
  { key: 'opportunity_won', label: 'Opportunity Won', color: '#16A34A' },
]

export function stageMeta(key: string) {
  return PIPELINE_STAGES.find(s => s.key === key) ?? PIPELINE_STAGES[0]
}
export function stageIndex(key: string) {
  const i = PIPELINE_STAGES.findIndex(s => s.key === key)
  return i < 0 ? 0 : i
}

// The [Template] New Partner Checklist, mapped to the pipeline stage each task
// supports. Ties directly to the training: Module 5 (order form), Module 6
// (PartnerHub), Module 3 (pipeline).
export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  { key: 'confirm_business', label: 'Confirm Business Details', desc: 'Legal name, DBA if any, EIN, signer, contact, and tool used.', stage: 'new_lead', link: 'hubspot' },
  { key: 'welcome_email', label: 'Send PartnerHub Welcome Email', desc: 'Make sure they receive the email and can log in.', stage: 'interested', link: 'partnerhub' },
  { key: 'stripe_setup', label: 'Complete Stripe Setup', desc: 'Verify business info, EIN, and bank account.', stage: 'interested', link: 'stripe' },
  { key: 'send_order_form', label: 'Send Order Form', desc: 'Use the correct entity, signer, terms, and email.', stage: 'proposal_sent', link: 'onit' },
  { key: 'send_partner_link', label: 'Send Partner Link', desc: 'Tell them where to place it and not to change it.', stage: 'contract_signed', link: 'partnerhub' },
  { key: 'confirm_first_use', label: 'Confirm First PartnerHub Use', desc: 'Follow up until the partner has used the PH link successfully.', stage: 'opportunity_won', link: 'partnerhub' },
]

// A fresh checklist (all tasks unchecked) for a new partner.
export function freshChecklist(): ChecklistState[] {
  return CHECKLIST_TEMPLATE.map(t => ({ key: t.key, done: false, note: '' }))
}

// Merge stored state with the template for rendering (template is the source of
// truth for labels; stored state holds done/note).
export function mergeChecklist(stored: ChecklistState[] | null | undefined) {
  const byKey = new Map((stored ?? []).map(s => [s.key, s]))
  return CHECKLIST_TEMPLATE.map(t => ({
    ...t,
    done: byKey.get(t.key)?.done ?? false,
    note: byKey.get(t.key)?.note ?? '',
  }))
}

export function completion(stored: ChecklistState[] | null | undefined) {
  const total = CHECKLIST_TEMPLATE.length
  const done = mergeChecklist(stored).filter(i => i.done).length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}
