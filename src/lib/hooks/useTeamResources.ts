// @ts-nocheck
'use client'

// Loads the team's editable Resource Center content (team_resource_items) and
// exposes manager CRUD. Reps get read-only rows (RLS blocks their writes; the
// UI hides the controls). Until a manager seeds, `seeded` is false and the page
// shows the code defaults read-only.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui'
import { seedRows } from '@/lib/resourcesDefaults'

export function useTeamResources() {
  const supabase = createClient()
  const [items, setItems] = useState<any[] | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const teamRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setItems([]); return }
    const { data: u } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()
    teamRef.current = u?.team_id ?? null
    setTeamId(u?.team_id ?? null)
    if (!u?.team_id) { setItems([]); return }
    const { data } = await supabase
      .from('team_resource_items')
      .select('id, kind, category, data, sort_order')
      .eq('team_id', u.team_id)
      .order('sort_order', { ascending: true })
    setItems(data ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const seeded = (items?.length ?? 0) > 0
  const byKind = (k: string) => (items ?? []).filter(i => i.kind === k)

  // Seed the defaults into the team's table (one-time "Customize").
  const seed = useCallback(async () => {
    if (!teamRef.current || busy) return
    setBusy(true)
    const rows = seedRows().map(r => ({ ...r, team_id: teamRef.current }))
    const { error } = await supabase.from('team_resource_items').insert(rows)
    setBusy(false)
    if (error) { toast.error('Could not enable editing. Try again.'); return }
    toast.success('Resource content is now editable')
    load()
  }, [busy, supabase, load])

  const add = useCallback(async (kind: string, data: any, category: string | null = null) => {
    if (!teamRef.current) return
    const maxOrder = Math.max(-1, ...(items ?? []).filter(i => i.kind === kind && i.category === category).map(i => i.sort_order))
    const { data: row, error } = await supabase
      .from('team_resource_items')
      .insert({ team_id: teamRef.current, kind, category, data, sort_order: maxOrder + 1 })
      .select('id, kind, category, data, sort_order').single()
    if (error || !row) { toast.error('Could not add that item.'); return }
    setItems(prev => [...(prev ?? []), row])
  }, [items, supabase])

  const update = useCallback(async (id: string, patch: { data?: any; category?: string | null }) => {
    const prev = items
    setItems(p => (p ?? []).map(i => i.id === id ? { ...i, ...patch } : i))
    const { error } = await supabase
      .from('team_resource_items')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { setItems(prev); toast.error('Could not save that change.') }
  }, [items, supabase])

  const remove = useCallback(async (id: string) => {
    const prev = items
    setItems(p => (p ?? []).filter(i => i.id !== id))
    const { error } = await supabase.from('team_resource_items').delete().eq('id', id)
    if (error) { setItems(prev); toast.error('Could not delete that item.') }
  }, [items, supabase])

  return { items, loading: items === null, seeded, teamId, busy, byKind, seed, add, update, remove, reload: load }
}
