// @ts-nocheck
'use client'

// Historical reference logs for any Cortex entity. Loads/attaches notes keyed
// by (entity_type, entity_id) on the shared growth_notes table (RLS: you own
// your notes; managers can read the team's). Also exposes a per-entity unread-ish
// count so the UI can badge items that already have context attached.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useEntityNotes(entityType: string, entityId: string | null) {
  const supabase = createClient()
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const uidRef = useRef<string | null>(null)
  const teamRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    if (!entityId) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    uidRef.current = user.id
    if (!teamRef.current) {
      const { data: u } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()
      teamRef.current = u?.team_id ?? null
    }
    const { data } = await supabase.from('growth_notes').select('id, body, ai_suggested, created_at')
      .eq('user_id', user.id).eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }, [entityType, entityId, supabase])

  useEffect(() => { setLoading(true); load() }, [load])

  const add = useCallback(async (body: string, aiSuggested = false) => {
    const text = (body || '').trim()
    if (!text || !uidRef.current || !entityId) return
    const optimistic = { id: `tmp-${Date.now()}`, body: text, ai_suggested: aiSuggested, created_at: new Date().toISOString() }
    setNotes(prev => [optimistic, ...prev])
    const { data } = await supabase.from('growth_notes')
      .insert({ user_id: uidRef.current, team_id: teamRef.current, entity_type: entityType, entity_id: entityId, body: text, ai_suggested: aiSuggested })
      .select('id, body, ai_suggested, created_at').single()
    if (data) setNotes(prev => [data, ...prev.filter(n => n.id !== optimistic.id)])
  }, [entityType, entityId, supabase])

  const remove = useCallback(async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    await supabase.from('growth_notes').delete().eq('id', id)
  }, [supabase])

  return { notes, count: notes.length, loading, add, remove, reload: load }
}
