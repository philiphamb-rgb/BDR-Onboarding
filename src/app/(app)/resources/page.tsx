// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui'
import { DocumentIcon, LinkIcon, VideoIcon, SearchIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <DocumentIcon className="text-red-600" />,
  doc: <DocumentIcon className="text-blue-600" />,
  document: <DocumentIcon className="text-blue-600" />,
  link: <LinkIcon className="text-green-600" />,
  video: <VideoIcon className="text-purple-600" />,
  course: <VideoIcon className="text-orange-600" />,
}
const TYPE_COLORS: Record<string, string> = {
  pdf: 'bg-red-50 text-red-700',
  doc: 'bg-blue-50 text-blue-700',
  document: 'bg-blue-50 text-blue-700',
  link: 'bg-green-50 text-green-700',
  video: 'bg-purple-50 text-purple-700',
  course: 'bg-orange-50 text-orange-700',
}

export default function ResourcesPage() {
  const supabase = createClient()
  const [resources, setResources] = useState<{ id: string; title: string; type: string; url: string | null; description: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('team_id').eq('id', user.id).single().then(({ data }) => {
        if (!data?.team_id) { setLoading(false); return }
        supabase.from('resources').select('id, title, type, url, description')
          .eq('team_id', data.team_id).eq('is_published', true).order('created_at', { ascending: false })
          .then(({ data: res }) => { setResources(res ?? []); setLoading(false) })
      })
    })
  }, [])

  const filtered = resources.filter(r => {
    const s = search.toLowerCase()
    return (!s || r.title.toLowerCase().includes(s) || (r.description?.toLowerCase() ?? '').includes(s))
      && (filter === 'all' || r.type === filter)
  })

  return (
    <div className="space-y-4">
      <h1 className="text-h1 text-gray-900">Resources</h1>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..."
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy bg-white" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {['all', 'pdf', 'video', 'link', 'doc', 'course'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize transition-colors',
              filter === f ? 'bg-navy text-white' : 'bg-white border border-border text-gray-600 hover:bg-gray-50')}>
            {f === 'all' ? 'All' : f.toUpperCase()}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12"><DocumentIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">{search ? 'No results' : 'No resources yet'}</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <a key={r.id} href={r.url ?? '#'} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="hover:border-navy/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', TYPE_COLORS[r.type] ?? 'bg-gray-100')}>
                    {TYPE_ICONS[r.type] ?? <DocumentIcon />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-gray-900">{r.title}</h3>
                      <Badge className={cn('text-xs flex-shrink-0 uppercase', TYPE_COLORS[r.type])}>{r.type}</Badge>
                    </div>
                    {r.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>}
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
