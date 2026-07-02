'use client'

// Content ideas + scripts (Phase 1.5 seed of the Content OS). Real persistence
// for the idea→script step: capture ideas, attach a script, track status. The
// full studio (posts, repurposing, proof, metrics) arrives in Phase 3.

import { useCallback, useEffect, useState } from 'react'
import { createUntypedClient } from '@/lib/supabase/untyped'

export interface ContentIdea {
  id: string; bucket: string | null; title: string; hook: string | null
  angle: string | null; format: string | null; channel: string | null
  ev_score: number | null; status: string; source: string | null; created_at: string
}
export interface Script {
  id: string; content_idea_id: string; body: string; cta: string | null
  format: string | null; version: number; updated_at: string
}

export function useContent() {
  const supabase = createUntypedClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [scripts, setScripts] = useState<Script[]>([])
  const [nonce, setNonce] = useState(0)
  const reload = useCallback(() => setNonce(n => n + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const { data: me } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()
      const [id, sc] = await Promise.all([
        supabase.from('content_ideas').select('*').order('created_at', { ascending: false }),
        supabase.from('scripts').select('*').order('updated_at', { ascending: false }),
      ])
      if (cancelled) return
      setUserId(user.id); setTeamId(me?.team_id ?? null)
      setIdeas(id.data ?? []); setScripts(sc.data ?? []); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [nonce, supabase])

  const createIdea = async (values: Partial<ContentIdea>) => {
    if (!userId) return { error: 'Not signed in' }
    const { data, error } = await supabase.from('content_ideas').insert({ ...values, user_id: userId, team_id: teamId }).select('id').maybeSingle()
    if (error) return { error: error.message }
    reload(); return { id: data?.id }
  }
  const updateIdea = async (id: string, values: Partial<ContentIdea>) => {
    const { error } = await supabase.from('content_ideas').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return { error: error.message }
    reload(); return {}
  }
  const removeIdea = async (id: string) => {
    const { error } = await supabase.from('content_ideas').delete().eq('id', id)
    if (error) return { error: error.message }
    reload(); return {}
  }
  const saveScript = async (ideaId: string, body: string, existing: Script | null) => {
    if (!userId) return { error: 'Not signed in' }
    if (existing) {
      const { error } = await supabase.from('scripts').update({ body, updated_at: new Date().toISOString() }).eq('id', existing.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('scripts').insert({ user_id: userId, team_id: teamId, content_idea_id: ideaId, body })
      if (error) return { error: error.message }
    }
    await supabase.from('content_ideas').update({ status: 'scripted', updated_at: new Date().toISOString() }).eq('id', ideaId)
    reload(); return {}
  }

  const scriptFor = (ideaId: string) => scripts.find(s => s.content_idea_id === ideaId) ?? null

  return { loading, ideas, scripts, reload, createIdea, updateIdea, removeIdea, saveScript, scriptFor }
}
