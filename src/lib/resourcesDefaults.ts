// Starter content + option maps for the editable Resource Center. The defaults
// render read-only until a manager clicks "Customize", which seeds them into
// team_resource_items; from then on everything is DB-backed and editable.

import {
  HubspotIcon, SlackIcon, PhoneIcon, HubIcon, DatabaseIcon, PipelineIcon,
  DocumentIcon, BookIcon, ShieldIcon, HandshakeIcon, ProductsIcon, LightningIcon,
  SearchIcon, LinkIcon, MailIcon, CoinIcon, TargetIcon, IntegrationIcon, UserIcon,
} from '@/components/icons'

// Icon registry — data stores an icon KEY (string); this maps it to a component.
export const RESOURCE_ICONS: Record<string, any> = {
  link: LinkIcon, hubspot: HubspotIcon, slack: SlackIcon, phone: PhoneIcon, hub: HubIcon,
  database: DatabaseIcon, pipeline: PipelineIcon, document: DocumentIcon, book: BookIcon,
  shield: ShieldIcon, handshake: HandshakeIcon, products: ProductsIcon, lightning: LightningIcon,
  search: SearchIcon, mail: MailIcon, coin: CoinIcon, target: TargetIcon, integration: IntegrationIcon,
}
export const ICON_KEYS = Object.keys(RESOURCE_ICONS)
export const resourceIcon = (key?: string) => RESOURCE_ICONS[key || 'link'] || LinkIcon

// Tint options for tool/library icon chips — themeable tokens where possible.
export const RESOURCE_TINTS: { key: string; label: string; cls: string }[] = [
  { key: 'navy',   label: 'Navy',   cls: 'bg-navy/10 text-navy-ink' },
  { key: 'teal',   label: 'Teal',   cls: 'bg-teal/10 text-teal' },
  { key: 'gold',   label: 'Gold',   cls: 'bg-gold/15 text-[#A06C00]' },
  { key: 'plum',   label: 'Plum',   cls: 'bg-plum/15 text-plum' },
  { key: 'error',  label: 'Red',    cls: 'bg-error/10 text-error' },
  { key: 'gray',   label: 'Gray',   cls: 'bg-bdrbg text-gray' },
]
export const tintClass = (key?: string) => (RESOURCE_TINTS.find(t => t.key === key) || RESOURCE_TINTS[0]).cls

export const LIBRARY_STATUS = [
  { key: 'ready', label: 'Ready (has a link/format)' },
  { key: 'soon',  label: 'Coming soon' },
]

// A resource link must be a real http(s) URL — used to validate both a tool's
// url and a library item's link before save, so a bad string can never persist.
export function isValidResourceUrl(value: string): boolean {
  const v = (value || '').trim()
  if (!v) return false
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// ── Starter content (seeded on demand) ───────────────────────────────────────
export const DEFAULT_TOOLS = [
  { name: 'HubSpot', purpose: 'CRM & pipeline management', url: 'https://hubspot.com', contact: 'Anthony Medina', icon: 'hubspot', tint: 'gold' },
  { name: 'Seamless.AI', purpose: 'Prospecting & lead research (with LinkedIn)', url: 'https://seamless.ai', contact: 'Sales Operations', icon: 'search', tint: 'teal' },
  { name: 'Onit', purpose: 'Order forms & e-signature (opened from the HubSpot deal)', url: 'https://onit.com', contact: 'Sales Ops · orderform@consumerdirect.com', icon: 'document', tint: 'navy' },
  { name: 'Nextiva', purpose: 'Voice & communications', url: 'https://nextiva.com', contact: '#partner_support-and-sales_team', icon: 'phone', tint: 'teal' },
  { name: 'PartnerHub', purpose: 'Partner management dashboard', url: 'https://partnerhub.consumerdirect.com', contact: 'Chris Peery · #partnerhub-client-manager-issues', icon: 'hub', tint: 'navy' },
  { name: 'Developer Docs', purpose: 'Partner API reference & integration guides', url: 'https://developer.consumerdirect.io', contact: 'partnerintegration@consumerdirect.com', icon: 'lightning', tint: 'gold' },
  { name: 'Dropbox', purpose: 'File sharing & storage', url: 'https://dropbox.com', contact: 'Nikka Gerodias', icon: 'database', tint: 'teal' },
  { name: 'Slack', purpose: 'Team communication', url: 'https://consumerdirect.slack.com', contact: 'Nikka Gerodias', icon: 'slack', tint: 'plum' },
  { name: 'JIRA', purpose: 'Project tracking & requests', url: 'https://jira.com', contact: '#jira', icon: 'pipeline', tint: 'navy' },
]

export const DEFAULT_PEOPLE = [
  { name: 'Ryan Fleming', role: 'Your Manager', detail: 'Collaborative & supportive — regular check-ins and guidance', slack: '@Ryan Fleming' },
  { name: 'Allan Jabczynski', role: 'Onboarding Buddy', detail: 'Business Development Representative', slack: '@Allan Jabczynski' },
  { name: 'Nikka Gerodias', role: 'HR Contact', detail: 'Payroll, benefits & general HR — DM for sensitive topics', slack: '@Nikka Gerodias' },
  { name: 'Anthony Medina', role: 'Sales Operations', detail: 'HubSpot & process questions', slack: '@Anthony Medina' },
  { name: 'Chris Peery', role: 'Partner Support', detail: 'PartnerHub issues', slack: '@Chris Peery' },
  { name: 'John O’Neill', role: 'Integrations', detail: 'API & partner integration questions (mailbox preferred)', slack: 'partnerintegration@consumerdirect.com' },
  { name: 'Order Form Desk', role: 'Sales Ops', detail: 'Standard partnership order forms', slack: 'orderform@consumerdirect.com' },
  { name: 'IT Support', role: 'Technical Setup', detail: 'Setup & troubleshooting', slack: '#it-service-management' },
]

export const DEFAULT_LIBRARY = [
  { category: 'Company Foundations', title: 'Company Handbook', status: 'soon', meta: '' },
  { category: 'Company Foundations', title: 'Mission, Values & Culture', status: 'soon', meta: '' },
  { category: 'Company Foundations', title: 'Org Chart', status: 'soon', meta: '' },
  { category: 'Product & Service', title: 'SmartCredit Product Overview', status: 'ready', meta: 'Canvas' },
  { category: 'Product & Service', title: 'Sales Guide v3.2026', status: 'ready', meta: 'PDF' },
  { category: 'Product & Service', title: 'Partner Onboarding Process Overview', status: 'ready', meta: 'PDF' },
  { category: 'Processes & SOPs', title: 'HubSpot Associations & Labels Training', status: 'ready', meta: 'Guide' },
  { category: 'Processes & SOPs', title: 'Sales Communication Guidelines', status: 'ready', meta: '#sales-communication-alignment' },
  { category: 'Processes & SOPs', title: 'PartnerHub Troubleshooting', status: 'ready', meta: 'Guide' },
  { category: 'Processes & SOPs', title: 'Stripe Onboarding Process', status: 'ready', meta: 'Guide' },
  { category: 'HR & Benefits', title: 'Benefits Enrollment', status: 'soon', meta: '' },
  { category: 'HR & Benefits', title: 'PTO & Time-Off Policy', status: 'ready', meta: 'Policy' },
  { category: 'HR & Benefits', title: 'Payroll Setup (Rippling)', status: 'ready', meta: 'Guide' },
  { category: 'HR & Benefits', title: 'Holiday Calendar', status: 'soon', meta: '' },
  { category: 'Tech Stack', title: 'Developer Documentation', status: 'ready', meta: 'Docs' },
  { category: 'Tech Stack', title: 'API Integration Guide', status: 'ready', meta: 'PDF' },
  { category: 'Tech Stack', title: 'IT Setup Guide', status: 'soon', meta: '' },
  { category: 'Tech Stack', title: 'Security & Password Policy', status: 'soon', meta: '' },
]

export const DEFAULT_ROADMAP = [
  { phase: 'Foundation', time: 'Day 1', focus: 'Setup + Access' },
  { phase: 'Orientation', time: 'Days 2–3', focus: 'People + Tools' },
  { phase: 'Integration', time: 'Week 2', focus: 'QA + Knowledge' },
  { phase: 'Ownership', time: 'Weeks 3–4', focus: 'Independent Contribution' },
]

// Blank templates for the "add" action per kind. `link` on library items is
// the field that was previously missing entirely — see isValidResourceUrl.
export const BLANK: Record<string, any> = {
  tool: { name: '', purpose: '', url: '', contact: '', icon: 'link', tint: 'navy' },
  person: { name: '', role: '', detail: '', slack: '' },
  library: { title: '', status: 'ready', meta: '', link: '' },
  roadmap: { phase: '', time: '', focus: '' },
}

// The full seed payload (flattened rows) used by "Customize".
export function seedRows() {
  const rows: { kind: string; category: string | null; data: any; sort_order: number }[] = []
  DEFAULT_TOOLS.forEach((d, i) => rows.push({ kind: 'tool', category: null, data: d, sort_order: i }))
  DEFAULT_PEOPLE.forEach((d, i) => rows.push({ kind: 'person', category: null, data: d, sort_order: i }))
  DEFAULT_LIBRARY.forEach((d, i) => rows.push({ kind: 'library', category: d.category, data: { title: d.title, status: d.status, meta: d.meta, link: '' }, sort_order: i }))
  DEFAULT_ROADMAP.forEach((d, i) => rows.push({ kind: 'roadmap', category: null, data: d, sort_order: i }))
  return rows
}
