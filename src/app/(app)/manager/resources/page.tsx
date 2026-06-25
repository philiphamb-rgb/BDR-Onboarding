// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Button, Modal } from '@/components/ui'
import { PlusIcon, DocumentIcon, LinkIcon, VideoIcon, TrashIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <DocumentIcon className="text-blue-600" />,
  doc: <DocumentIcon className="text-blue-600" />,
  pdf: <DocumentIcon className="text-red-600" />,
  link: <LinkIcon className="text-green-600" />,
  video: <VideoIcon className="text-purple-600" />,
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
    }
  }

  const deleteResource = async (id: string) => {
    await supabase.from('resources').delete().eq('id', id)
    setResources(prev => prev.filter(r => r.id !== id))
    toast.success('Resource removed')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-gray-900">Resources</h1>
        <Button size="sm" onClick={() => setShowModal(true)}><PlusIcon className="mr-1.5 w-4 h-4" />Add</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No resources yet</div>
      ) : (
        <div className="space-y-2">
          {resources.map(r => (
            <Card key={r.id} className="!p-3">
              <div className="flex items-start gap-3">
                <div>{TYPE_ICONS[r.type] ?? <DocumentIcon />}</div>
                <div className="flex-1 min-w-0">
                  {r.url
                    ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-navy hover:underline block truncate">{r.title}</a>
                    : <span className="text-sm font-medium text-gray-900 block truncate">{r.title}</span>}
                  {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                </div>
                <button onClick={() => deleteResource(r.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <TrashIcon className="w-4 h-4" />
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
                className={cn('flex items-center gap-2 p-3 rounded-xl border text-sm transition-all',
                  form.type === t.value ? 'border-navy bg-navy/5 font-medium text-navy' : 'border-border text-gray-600 hover:bg-gray-50')}>
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
