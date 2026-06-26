// @ts-nocheck
'use client'

import { useState } from 'react'
import { Card, CardTitle, Badge } from '@/components/ui'
import {
  SearchIcon,
  ExternalLinkIcon,
  HubspotIcon,
  SlackIcon,
  PhoneIcon,
  HubIcon,
  DatabaseIcon,
  PipelineIcon,
  UserIcon,
  DocumentIcon,
  BookIcon,
  ShieldIcon,
  HandshakeIcon,
  ProductsIcon,
  LightningIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils'

// ─── Tools & Access ──────────────────────────────────────────────────────────
const TOOLS = [
  { name: 'HubSpot', purpose: 'CRM & pipeline management', url: 'https://hubspot.com', contact: 'Anthony Medina', Icon: HubspotIcon, tint: 'bg-orange-50 text-orange-600' },
  { name: 'Nextiva', purpose: 'Voice & communications', url: 'https://nextiva.com', contact: '#partner_support-and-sales_team', Icon: PhoneIcon, tint: 'bg-blue-50 text-blue-600' },
  { name: 'PartnerHub', purpose: 'Partner management dashboard', url: 'https://partnerhub.consumerdirect.com', contact: 'Chris Peery · #partnerhub-client-manager-issues', Icon: HubIcon, tint: 'bg-teal-50 text-teal' },
  { name: 'Dropbox', purpose: 'File sharing & storage', url: 'https://dropbox.com', contact: 'Nikka Gerodias', Icon: DatabaseIcon, tint: 'bg-sky-50 text-sky-600' },
  { name: 'Slack', purpose: 'Team communication', url: 'https://consumerdirect.slack.com', contact: 'Nikka Gerodias', Icon: SlackIcon, tint: 'bg-purple-50 text-purple-600' },
  { name: 'JIRA', purpose: 'Project tracking & requests', url: 'https://jira.com', contact: '#jira', Icon: PipelineIcon, tint: 'bg-indigo-50 text-indigo-600' },
]

// ─── People Map ──────────────────────────────────────────────────────────────
const PEOPLE = [
  { name: 'Ryan Fleming', role: 'Your Manager', detail: 'Collaborative & supportive — regular check-ins and guidance', slack: '@Ryan Fleming' },
  { name: 'Allan Jabczynski', role: 'Onboarding Buddy', detail: 'Business Development Representative', slack: '@Allan Jabczynski' },
  { name: 'Nikka Gerodias', role: 'HR Contact', detail: 'Payroll, benefits & general HR — DM for sensitive topics', slack: '@Nikka Gerodias' },
  { name: 'Anthony Medina', role: 'Sales Operations', detail: 'HubSpot & process questions', slack: '@Anthony Medina' },
  { name: 'Chris Peery', role: 'Partner Support', detail: 'PartnerHub issues', slack: '@Chris Peery' },
  { name: 'IT Support', role: 'Technical Setup', detail: 'Setup & troubleshooting', slack: '#it-service-management' },
]

// ─── Resources Library ───────────────────────────────────────────────────────
const LIBRARY = [
  {
    category: 'Company Foundations', Icon: BookIcon,
    items: [
      { title: 'Company Handbook', status: 'soon' },
      { title: 'Mission, Values & Culture', status: 'soon' },
      { title: 'Org Chart', status: 'soon' },
    ],
  },
  {
    category: 'Product & Service', Icon: ProductsIcon,
    items: [
      { title: 'SmartCredit Product Overview', meta: 'Canvas' },
      { title: 'Sales Guide v3.2026', meta: 'PDF' },
      { title: 'Partner Onboarding Process Overview', meta: 'PDF' },
    ],
  },
  {
    category: 'Processes & SOPs', Icon: HandshakeIcon,
    items: [
      { title: 'HubSpot Associations & Labels Training', meta: 'Guide' },
      { title: 'Sales Communication Guidelines', meta: '#sales-communication-alignment' },
      { title: 'PartnerHub Troubleshooting', meta: 'Guide' },
      { title: 'Stripe Onboarding Process', meta: 'Guide' },
    ],
  },
  {
    category: 'HR & Benefits', Icon: ShieldIcon,
    items: [
      { title: 'Benefits Enrollment', status: 'soon' },
      { title: 'PTO & Time-Off Policy', meta: 'Policy' },
      { title: 'Payroll Setup (Rippling)', meta: 'Guide' },
      { title: 'Holiday Calendar', status: 'soon' },
    ],
  },
  {
    category: 'Tech Stack', Icon: LightningIcon,
    items: [
      { title: 'Developer Documentation', meta: 'Docs' },
      { title: 'API Integration Guide', meta: 'PDF' },
      { title: 'IT Setup Guide', status: 'soon' },
      { title: 'Security & Password Policy', status: 'soon' },
    ],
  },
]

const ROADMAP = [
  { phase: 'Foundation', time: 'Day 1', focus: 'Setup + Access' },
  { phase: 'Orientation', time: 'Days 2–3', focus: 'People + Tools' },
  { phase: 'Integration', time: 'Week 2', focus: 'QA + Knowledge' },
  { phase: 'Ownership', time: 'Weeks 3–4', focus: 'Independent Contribution' },
]

export default function ResourcesPage() {
  const [search, setSearch] = useState('')
  const s = search.trim().toLowerCase()

  const matchTools = TOOLS.filter((t) => !s || t.name.toLowerCase().includes(s) || t.purpose.toLowerCase().includes(s))
  const matchLibrary = LIBRARY.map((sec) => ({
    ...sec,
    items: sec.items.filter((it) => !s || it.title.toLowerCase().includes(s) || sec.category.toLowerCase().includes(s)),
  })).filter((sec) => sec.items.length > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-dark-text">Resource Center</h1>
        <p className="text-sm text-gray mt-1">
          Everything you need to ramp at ConsumerDirect — tools, people, and knowledge in one place.
        </p>
      </div>

      {/* First-day nudge */}
      <Card className="bg-gradient-hero text-white">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <LightningIcon size={20} className="text-white" />
          </div>
          <div>
            <div className="text-[11px] font-[800] uppercase tracking-[0.08em] text-white/70 mb-1">Start here</div>
            <p className="text-sm leading-relaxed">
              On your first day, Slack <span className="font-[800]">@Nikka Gerodias</span> to get set up and meet your
              onboarding buddy. Then work through the rest of this hub.
            </p>
          </div>
        </div>
      </Card>

      {/* Onboarding roadmap */}
      <Card>
        <CardTitle>Onboarding Roadmap</CardTitle>
        <div className="mt-3 grid grid-cols-2 desktop:grid-cols-4 gap-3">
          {ROADMAP.map((r, i) => (
            <div key={r.phase} className="rounded-xl border border-border p-3">
              <div className="text-[11px] font-[800] text-teal uppercase tracking-wide">Phase {i + 1}</div>
              <div className="text-sm font-[800] text-dark-text mt-0.5">{r.phase}</div>
              <div className="text-[11px] text-gray">{r.time}</div>
              <div className="text-xs text-mid-text mt-1">{r.focus}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools and resources…"
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy bg-white"
        />
      </div>

      {/* Tools & Access Hub */}
      {matchTools.length > 0 && (
        <section>
          <h2 className="text-h3 text-dark-text mb-3">Tools &amp; Access</h2>
          <div className="grid grid-cols-1 desktop:grid-cols-2 gap-3">
            {matchTools.map((t) => (
              <a key={t.name} href={t.url} target="_blank" rel="noopener noreferrer" className="block">
                <Card className="hover:border-teal transition-colors h-full">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', t.tint)}>
                      <t.Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-[800] text-dark-text">{t.name}</h3>
                        <ExternalLinkIcon size={13} className="text-gray" />
                      </div>
                      <p className="text-xs text-gray">{t.purpose}</p>
                      <p className="text-[11px] text-mid-text mt-1">
                        <span className="text-gray">Help:</span> {t.contact}
                      </p>
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* People Map */}
      <section>
        <h2 className="text-h3 text-dark-text mb-3">Your People Map</h2>
        <div className="grid grid-cols-1 desktop:grid-cols-2 gap-3">
          {PEOPLE.map((p) => (
            <Card key={p.name} className="h-full">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                  <UserIcon size={20} className="text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-[800] text-dark-text truncate">{p.name}</h3>
                    <Badge variant="muted">{p.role}</Badge>
                  </div>
                  <p className="text-xs text-gray mt-0.5">{p.detail}</p>
                  <p className="text-[11px] text-teal font-[700] mt-1">{p.slack}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Resources Library */}
      {matchLibrary.length > 0 && (
        <section>
          <h2 className="text-h3 text-dark-text mb-3">Resources Library</h2>
          <div className="space-y-4">
            {matchLibrary.map((sec) => (
              <Card key={sec.category}>
                <div className="flex items-center gap-2 mb-2">
                  <sec.Icon size={18} className="text-navy" />
                  <CardTitle>{sec.category}</CardTitle>
                </div>
                <div className="divide-y divide-border">
                  {sec.items.map((it) => (
                    <div key={it.title} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <DocumentIcon size={16} className="text-gray shrink-0" />
                        <span className="text-sm text-dark-text truncate">{it.title}</span>
                      </div>
                      {it.status === 'soon' ? (
                        <Badge variant="muted">Coming soon</Badge>
                      ) : (
                        <span className="text-[11px] text-gray whitespace-nowrap">{it.meta}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-gray mt-3">
            Managers can add live document links from <span className="font-[700]">Manager → Resources</span>.
            Items marked “Coming soon” are awaiting links from your team.
          </p>
        </section>
      )}
    </div>
  )
}
