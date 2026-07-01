// @ts-nocheck
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardTitle, Badge, Modal, Button } from '@/components/ui'
import {
  SearchIcon, ExternalLinkIcon, UserIcon, DocumentIcon, BookIcon, ShieldIcon,
  HandshakeIcon, ProductsIcon, LightningIcon, PlusIcon, EditIcon, TrashIcon, CloseIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils'
import { Tour } from '@/components/tour'
import { RESOURCES_TOUR } from '@/lib/tours'
import { usePermissions } from '@/components/usePermissions'
import { useTeamResources } from '@/lib/hooks/useTeamResources'
import {
  DEFAULT_TOOLS, DEFAULT_PEOPLE, DEFAULT_LIBRARY, DEFAULT_ROADMAP, BLANK,
  resourceIcon, tintClass, ICON_KEYS, RESOURCE_TINTS, LIBRARY_STATUS,
} from '@/lib/resourcesDefaults'

const CATEGORY_ICON: Record<string, any> = {
  'Company Foundations': BookIcon, 'Product & Service': ProductsIcon,
  'Processes & SOPs': HandshakeIcon, 'HR & Benefits': ShieldIcon, 'Tech Stack': LightningIcon,
}
const catIcon = (c: string) => CATEGORY_ICON[c] || BookIcon

export default function ResourcesPage() {
  const { isManager } = usePermissions()
  const { items, loading, seeded, byKind, seed, add, update, remove, busy } = useTeamResources()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(false)
  const [editor, setEditor] = useState<any>(null)   // { kind, id?, data, category? }
  const s = search.trim().toLowerCase()
  const canEdit = isManager && seeded && editing

  // Source: DB rows once seeded, else the read-only code defaults.
  const tools = useMemo(() => seeded ? byKind('tool').map(r => ({ id: r.id, ...r.data })) : DEFAULT_TOOLS, [items, seeded])
  const people = useMemo(() => seeded ? byKind('person').map(r => ({ id: r.id, ...r.data })) : DEFAULT_PEOPLE, [items, seeded])
  const roadmap = useMemo(() => seeded ? byKind('roadmap').map(r => ({ id: r.id, ...r.data })) : DEFAULT_ROADMAP, [items, seeded])
  const libraryRows = useMemo(() => seeded
    ? byKind('library').map(r => ({ id: r.id, category: r.category || 'General', ...r.data }))
    : DEFAULT_LIBRARY.map(d => ({ ...d })), [items, seeded])

  // Group library rows by category, preserving first-seen order.
  const libraryGroups = useMemo(() => {
    const order: string[] = []
    const map: Record<string, any[]> = {}
    for (const it of libraryRows) {
      if (!map[it.category]) { map[it.category] = []; order.push(it.category) }
      map[it.category].push(it)
    }
    return order.map(category => ({ category, items: map[category] }))
  }, [libraryRows])

  const matchTools = tools.filter(t => !s || t.name?.toLowerCase().includes(s) || t.purpose?.toLowerCase().includes(s))
  const matchPeople = people.filter(p => !s || p.name?.toLowerCase().includes(s) || p.role?.toLowerCase().includes(s) || p.detail?.toLowerCase().includes(s))
  const matchLibrary = libraryGroups
    .map(sec => ({ ...sec, items: sec.items.filter(it => !s || it.title?.toLowerCase().includes(s) || sec.category.toLowerCase().includes(s)) }))
    .filter(sec => sec.items.length > 0)
  const noResults = !!s && matchTools.length === 0 && matchPeople.length === 0 && matchLibrary.length === 0

  const saveEditor = async (data: any, category?: string | null) => {
    if (editor.id) await update(editor.id, category !== undefined ? { data, category } : { data })
    else await add(editor.kind, data, category ?? null)
    setEditor(null)
  }

  return (
    <div className="space-y-6 stagger-rise">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-dark-text">Resource Center</h1>
          <p className="text-sm text-gray mt-1">Everything you need to ramp at ConsumerDirect — tools, people, and knowledge in one place.</p>
        </div>
        {isManager && seeded && (
          <button onClick={() => setEditing(e => !e)}
            className={cn('shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-[700] transition-colors',
              editing ? 'border-navy bg-navy text-white' : 'border-border text-navy-ink hover:border-navy/40')}>
            <EditIcon size={13} /> {editing ? 'Done editing' : 'Edit content'}
          </button>
        )}
      </div>

      {/* Manager: enable editing (seed) */}
      {isManager && !seeded && !loading && (
        <Card className="flex flex-col gap-2 border-navy/30 bg-navy/[0.04] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <EditIcon size={16} className="mt-0.5 shrink-0 text-navy-ink" />
            <div>
              <div className="text-sm font-[800] text-dark-text">Make this page yours</div>
              <div className="text-[12px] text-gray">Load the starter content, then add, edit, or remove any tool, teammate, document, or roadmap phase — no code needed.</div>
            </div>
          </div>
          <Button size="sm" onClick={seed} loading={busy} className="shrink-0">Customize resources</Button>
        </Card>
      )}

      {/* First-day nudge */}
      <Card className="bg-gradient-hero text-white">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0"><LightningIcon size={20} className="text-white" /></div>
          <div>
            <div className="text-[11px] font-[800] uppercase tracking-[0.08em] text-white/70 mb-1">Start here</div>
            <p className="text-sm leading-relaxed">On your first day, Slack <span className="font-[800]">@Nikka Gerodias</span> to get set up and meet your onboarding buddy. Then work through the rest of this hub.</p>
          </div>
        </div>
      </Card>

      {/* Patent portfolio */}
      <Link href="/resources/patents">
        <Card hover className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy-ink"><ShieldIcon size={20} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-[800] text-dark-text">Patent Portfolio</div>
            <div className="text-[12px] text-gray">The patented technology that makes ConsumerDirect defensible — your “why us” moat.</div>
          </div>
          <span className="shrink-0 text-[12px] font-[700] text-teal">View →</span>
        </Card>
      </Link>

      {/* Onboarding roadmap */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Onboarding Roadmap</CardTitle>
          {canEdit && <AddBtn label="Add phase" onClick={() => setEditor({ kind: 'roadmap', data: { ...BLANK.roadmap } })} />}
        </div>
        <div className="mt-3 grid grid-cols-2 desktop:grid-cols-4 gap-3">
          {roadmap.map((r, i) => (
            <div key={r.id ?? r.phase} className="relative rounded-xl border border-border p-3">
              {canEdit && <RowTools onEdit={() => setEditor({ kind: 'roadmap', id: r.id, data: { phase: r.phase, time: r.time, focus: r.focus } })} onDelete={() => remove(r.id)} />}
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
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools, people, and resources…"
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy bg-card" />
      </div>

      {noResults && (
        <Card className="text-center py-10">
          <SearchIcon size={26} className="mx-auto mb-2 text-gray" />
          <p className="text-sm font-[700] text-dark-text">No matches for “{search.trim()}”</p>
          <p className="text-xs text-gray mt-1">Try a tool name, a teammate, or a document title.</p>
        </Card>
      )}

      {/* Tools & Access */}
      {(matchTools.length > 0 || canEdit) && (
        <section data-tour="resources-tools">
          <SectionHead title="Tools & Access" canEdit={canEdit} onAdd={() => setEditor({ kind: 'tool', data: { ...BLANK.tool } })} addLabel="Add tool" />
          <div className="grid grid-cols-1 desktop:grid-cols-2 gap-3">
            {matchTools.map(t => {
              const Icon = seeded ? resourceIcon(t.icon) : t.Icon
              const tint = seeded ? tintClass(t.tint) : t.tint
              const inner = (
                <Card className="hover:border-teal transition-colors h-full">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tint)}><Icon size={20} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-[800] text-dark-text">{t.name}</h3>
                        <ExternalLinkIcon size={13} className="text-gray" />
                      </div>
                      <p className="text-xs text-gray">{t.purpose}</p>
                      {t.contact && <p className="text-[11px] text-mid-text mt-1"><span className="text-gray">Help:</span> {t.contact}</p>}
                    </div>
                  </div>
                </Card>
              )
              return (
                <div key={t.id ?? t.name} className="relative">
                  {canEdit
                    ? <>{inner}<RowTools onEdit={() => setEditor({ kind: 'tool', id: t.id, data: { name: t.name, purpose: t.purpose, url: t.url, contact: t.contact, icon: t.icon, tint: t.tint } })} onDelete={() => remove(t.id)} /></>
                    : <a href={t.url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* People Map */}
      {(matchPeople.length > 0 || canEdit) && (
        <section>
          <SectionHead title="Your People Map" canEdit={canEdit} onAdd={() => setEditor({ kind: 'person', data: { ...BLANK.person } })} addLabel="Add person" />
          <div className="grid grid-cols-1 desktop:grid-cols-2 gap-3">
            {matchPeople.map(p => (
              <Card key={p.id ?? p.name} className="relative h-full">
                {canEdit && <RowTools onEdit={() => setEditor({ kind: 'person', id: p.id, data: { name: p.name, role: p.role, detail: p.detail, slack: p.slack } })} onDelete={() => remove(p.id)} />}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0"><UserIcon size={20} className="text-navy-ink" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 pr-12">
                      <h3 className="text-sm font-[800] text-dark-text truncate">{p.name}</h3>
                      {p.role && <Badge variant="gray">{p.role}</Badge>}
                    </div>
                    <p className="text-xs text-gray mt-0.5">{p.detail}</p>
                    {p.slack && <p className="text-[11px] text-teal font-[700] mt-1">{p.slack}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Resources Library */}
      {(matchLibrary.length > 0 || canEdit) && (
        <section>
          <SectionHead title="Resources Library" canEdit={canEdit} onAdd={() => setEditor({ kind: 'library', data: { ...BLANK.library }, category: '' })} addLabel="Add section" />
          <div className="space-y-4">
            {matchLibrary.map(sec => {
              const SecIcon = catIcon(sec.category)
              return (
                <Card key={sec.category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><SecIcon size={18} className="text-navy-ink" /><CardTitle>{sec.category}</CardTitle></div>
                    {canEdit && <AddBtn label="Add item" onClick={() => setEditor({ kind: 'library', data: { ...BLANK.library }, category: sec.category })} />}
                  </div>
                  <div className="divide-y divide-border">
                    {sec.items.map(it => (
                      <div key={it.id ?? it.title} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <DocumentIcon size={16} className="text-gray shrink-0" />
                          <span className="text-sm text-dark-text truncate">{it.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {it.status === 'soon' ? <Badge variant="gray">Coming soon</Badge> : (it.meta ? <span className="text-[11px] text-gray whitespace-nowrap">{it.meta}</span> : null)}
                          {canEdit && (
                            <span className="flex items-center gap-1">
                              <IconBtn label="Edit" onClick={() => setEditor({ kind: 'library', id: it.id, data: { title: it.title, status: it.status, meta: it.meta }, category: it.category })}><EditIcon size={13} /></IconBtn>
                              <IconBtn label="Delete" danger onClick={() => remove(it.id)}><TrashIcon size={13} /></IconBtn>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
          {!isManager && (
            <p className="text-[11px] text-gray mt-3">Items marked “Coming soon” are awaiting links from your team.</p>
          )}
        </section>
      )}

      {editor && (
        <ItemEditor editor={editor} onClose={() => setEditor(null)} onSave={saveEditor} />
      )}

      <Tour tourKey="resources" steps={RESOURCES_TOUR} />
    </div>
  )
}

// ── Small building blocks ─────────────────────────────────────────────────────
function SectionHead({ title, canEdit, onAdd, addLabel }: any) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-h3 text-dark-text">{title}</h2>
      {canEdit && <AddBtn label={addLabel} onClick={onAdd} />}
    </div>
  )
}
function AddBtn({ label, onClick }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 rounded-lg bg-navy/10 px-2.5 py-1.5 text-[11.5px] font-[800] text-navy-ink hover:bg-navy/15">
      <PlusIcon size={12} /> {label}
    </button>
  )
}
function IconBtn({ label, danger, onClick, children }: any) {
  return (
    <button aria-label={label} onClick={onClick} className={cn('flex h-7 w-7 items-center justify-center rounded-md text-gray hover:bg-bdrbg', danger ? 'hover:text-error' : 'hover:text-navy-ink')}>{children}</button>
  )
}
// Absolute edit/delete controls pinned to a card's top-right.
function RowTools({ onEdit, onDelete }: any) {
  return (
    <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
      <IconBtn label="Edit" onClick={onEdit}><EditIcon size={13} /></IconBtn>
      <IconBtn label="Delete" danger onClick={onDelete}><TrashIcon size={13} /></IconBtn>
    </div>
  )
}

const FIELD = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-navy/40'
const LBL = 'mb-1 block text-[11px] font-[800] uppercase tracking-wide text-gray'

// The per-item editor modal — fields depend on kind.
function ItemEditor({ editor, onClose, onSave }: any) {
  const { kind } = editor
  const [d, setD] = useState<any>(editor.data)
  const [category, setCategory] = useState<string>(editor.category ?? '')
  const set = (k: string, v: any) => setD((p: any) => ({ ...p, [k]: v }))
  const title = (editor.id ? 'Edit ' : 'Add ') + ({ tool: 'tool', person: 'person', library: 'document', roadmap: 'roadmap phase' }[kind])
  const valid = kind === 'tool' ? d.name?.trim() && d.url?.trim()
    : kind === 'person' ? d.name?.trim()
    : kind === 'library' ? d.title?.trim() && category.trim()
    : d.phase?.trim()

  return (
    <Modal open onClose={onClose} title={title} size="sm">
      <div className="space-y-3 p-6 pt-4">
        {kind === 'tool' && <>
          <Field label="Name" value={d.name} onChange={v => set('name', v)} />
          <Field label="What it's for" value={d.purpose} onChange={v => set('purpose', v)} />
          <Field label="URL" value={d.url} onChange={v => set('url', v)} placeholder="https://…" />
          <Field label="Help / contact" value={d.contact} onChange={v => set('contact', v)} />
          <div>
            <span className={LBL}>Icon</span>
            <div className="flex flex-wrap gap-1.5">
              {ICON_KEYS.map(k => { const I = resourceIcon(k); return (
                <button key={k} onClick={() => set('icon', k)} className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', d.icon === k ? 'border-navy bg-navy/10 text-navy-ink' : 'border-border text-gray hover:border-navy/40')}><I size={16} /></button>
              )})}
            </div>
          </div>
          <div>
            <span className={LBL}>Color</span>
            <div className="flex flex-wrap gap-1.5">
              {RESOURCE_TINTS.map(t => (
                <button key={t.key} onClick={() => set('tint', t.key)} className={cn('rounded-lg px-2.5 py-1 text-[11px] font-[700]', t.cls, d.tint === t.key && 'ring-2 ring-navy')}>{t.label}</button>
              ))}
            </div>
          </div>
        </>}

        {kind === 'person' && <>
          <Field label="Name" value={d.name} onChange={v => set('name', v)} />
          <Field label="Role" value={d.role} onChange={v => set('role', v)} />
          <Field label="Detail" value={d.detail} onChange={v => set('detail', v)} />
          <Field label="Slack / contact" value={d.slack} onChange={v => set('slack', v)} placeholder="@name or email" />
        </>}

        {kind === 'library' && <>
          <Field label="Section" value={category} onChange={setCategory} placeholder="e.g. Product & Service" />
          <Field label="Title" value={d.title} onChange={v => set('title', v)} />
          <div>
            <span className={LBL}>Status</span>
            <select value={d.status} onChange={e => set('status', e.target.value)} className={FIELD}>
              {LIBRARY_STATUS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          {d.status !== 'soon' && <Field label="Format / label" value={d.meta} onChange={v => set('meta', v)} placeholder="PDF, Guide, link…" />}
        </>}

        {kind === 'roadmap' && <>
          <Field label="Phase" value={d.phase} onChange={v => set('phase', v)} />
          <Field label="Timeframe" value={d.time} onChange={v => set('time', v)} placeholder="e.g. Week 2" />
          <Field label="Focus" value={d.focus} onChange={v => set('focus', v)} />
        </>}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" disabled={!valid} onClick={() => onSave(d, kind === 'library' ? category.trim() : undefined)} className="flex-1">Save</Button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <span className={LBL}>{label}</span>
      <input value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={FIELD} />
    </div>
  )
}
