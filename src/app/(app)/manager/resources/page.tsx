// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Modal, EmptyState, SkeletonList } from '@/components/ui'
import { PageHeader } from '@/components/manager'
import { PlusIcon, DocumentIcon, LinkIcon, VideoIcon, TrashIcon, BookIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <DocumentIcon className="text-blue-400" />,
  doc: <DocumentIcon className="text-blue-400" />,
  pdf: <DocumentIcon className="text-red-400" />,
  link: <LinkIcon className="text-green-400" />,
  video: <VideoIcon className="text-purple-400" />,
}
const TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: 'Video' },
  { value: 'doc', label: 'Document' },
  { value: 'link', label: 'Link' },
]

interface ResourceRow { id: string; title: string; type: string; url: string | null; description: string | null }

export default function ManagerResourcesPage() {
  const supabase = createClient()
  const [resources, setResources] = useState<ResourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [teamId, setTeamId] = useState<string>()
  const [userId, setUserId] = useState<string>()
  const [form, setForm] = useState({ title: '', url: '', description: '', type: 'link' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (data?.team_id) { setTeamId(data.team_id); fetchResources(data.team_id) }
        else setLoading(false)
      })
    })
  }, [])

  const fetchResources = async (tid: string) => {
    const { data } = await supabase.from('resources').select('id, title, type, url, description').eq('team_id', tid).order('created_at', { ascending: false })
    setResources(data ?? [])
    setLoading(false)
  }

  const addResource = async () => {
    if (!teamId || !userId || !form.title || !form.url) return
    setSubmitting(true)
    const { error } = await supabase.from('resources').insert({ ...form, team_id: teamId, added_by: userId })
    setSubmitting(false)
    if (!error) {
      toast.success('Resource added')
      setShowModal(false)
      setForm({ title: '', url: '', description: '', type: 'link' })
      fetchResources(teamId)
    } else {
      toast.error('Couldn’t add that resource — try again.')
    }
  }

  const deleteResource = async (id: string) => {
    const prev = resources
    setResources(p => p.filter(r => r.id !== id))
    const { error } = await supabase.from('resources').delete().eq('id', id)
    if (error) { setResources(prev); toast.error('Couldn’t remove that resource.'); return }
    toast.success('Resource removed')
  }

  return (
    <div className="space-y-4 pb-4 stagger-rise">
      <PageHeader
        title="Team Resources"
        subtitle="Share docs, links, and videos that show up in your reps' Resource Center."
        action={<Button size="sm" onClick={() => setShowModal(true)} icon={<PlusIcon size={16} />}>Add</Button>}
      />

      {loading ? (
        <SkeletonList count={3} />
      ) : resources.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<BookIcon size={28} />}
            title="No resources shared yet"
            description="Add a battlecard, recording, or playbook link and it instantly appears for every rep on your team."
            action={{ label: 'Add a resource', onClick: () => setShowModal(true) }}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {resources.map(r => (
            <Card key={r.id} className="!p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{TYPE_ICONS[r.type] ?? <DocumentIcon />}</div>
                <div className="min-w-0 flex-1">
                  {r.url
                    ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[14px] font-[600] text-navy-ink hover:underline">{r.title}</a>
                    : <span className="block truncate text-[14px] font-[600] text-dark-text">{r.title}</span>}
                  {r.description && <p className="mt-0.5 text-[12px] text-gray">{r.description}</p>}
                </div>
                <button onClick={() => deleteResource(r.id)} className="p-1 text-gray transition-colors hover:text-error" aria-label="Remove">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Resource" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setForm(p => ({ ...p, type: t.value }))}
                className={cn('flex items-center gap-2 p-3 rounded-md border text-sm transition-all',
                  form.type === t.value ? 'border-navy bg-navy/5 font-[600] text-navy-ink' : 'border-border text-mid-text hover:bg-bdrbg')}>
                {TYPE_ICONS[t.value]}{t.label}
              </button>
            ))}
          </div>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Title"
            className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
          <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="URL" type="url"
            className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)" rows={2}
            className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none" />
          <Button onClick={addResource} loading={submitting} disabled={!form.title || !form.url} className="w-full">Add Resource</Button>
        </div>
      </Modal>
    </div>
  )
}
