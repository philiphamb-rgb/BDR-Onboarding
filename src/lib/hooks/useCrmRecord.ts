// @ts-nocheck
'use client'

// The CRM record behind a partner/company: its deal properties (amount, close
// date, probability, stage), its associated Contacts (people), and its typed
// activity timeline (growth_notes with a `kind`). Additive over the existing
// partner_onboarding record — no rewrite. All writes are RLS-safe (owner edits;
// managers read their team). One hook powers the whole Lead detail drawer.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useCrmRecord(partnerId: string | null) {
  const supabase = createClient()
  const [deal, setDeal] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const uidRef = useRef<string | null>(null)
  const teamRef = useRef<string | null>(null)
  const saveTimer = useRef<any>(null)

  const load = useCallback(async () => {
    if (!partnerId) { setLoading(false); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    uidRef.current = user.id
    const [{ data: u }, { data: d }, { data: c }, { data: a }] = await Promise.all([
      supabase.from('users').select('team_id').eq('id', user.id).maybeSingle(),
      supabase.from('partner_onboarding').select('id, partner_name, stage, temperature, deal_amount, expected_close_date, deal_probability').eq('id', partnerId).maybeSingle(),
      supabase.from('crm_contacts').select('*').eq('partner_id', partnerId).order('is_primary', { ascending: false }).order('created_at'),
      supabase.from('growth_notes').select('id, body, kind, ai_suggested, created_at').eq('entity_type', 'lead').eq('entity_id', partnerId).order('created_at', { ascending: false }),
    ])
    teamRef.current = u?.team_id ?? null
    setDeal(d ?? null); setContacts(c ?? []); setActivities(a ?? [])
    setLoading(false)
  }, [partnerId, supabase])

  useEffect(() => { load() }, [load])

  // Deal properties — optimistic + debounced (RLS: owner update only).
  const updateDeal = useCallback((patch: any) => {
    setDeal(prev => {
      const next = { ...prev, ...patch }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        if (!partnerId) return
        supabase.from('partner_onboarding').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', partnerId).then(() => {})
      }, 500)
      return next
    })
  }, [partnerId, supabase])

  const addContact = useCallback(async (fields: any) => {
    if (!partnerId || !uidRef.current || !(fields.name || '').trim()) return
    const { data } = await supabase.from('crm_contacts')
      .insert({ user_id: uidRef.current, team_id: teamRef.current, partner_id: partnerId, name: fields.name.trim(), title: fields.title || null, email: fields.email || null, phone: fields.phone || null, is_primary: contacts.length === 0 })
      .select('*').single()
    if (data) setContacts(prev => [...prev, data])
  }, [partnerId, contacts.length, supabase])

  const removeContact = useCallback(async (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id))
    await supabase.from('crm_contacts').delete().eq('id', id)
  }, [supabase])

  const setPrimary = useCallback(async (id: string) => {
    setContacts(prev => prev.map(c => ({ ...c, is_primary: c.id === id })))
    await Promise.all([
      supabase.from('crm_contacts').update({ is_primary: false }).eq('partner_id', partnerId),
      supabase.from('crm_contacts').update({ is_primary: true }).eq('id', id),
    ])
  }, [partnerId, supabase])

  const addActivity = useCallback(async (kind: string, body: string, aiSuggested = false) => {
    const text = (body || '').trim()
    if (!text || !partnerId || !uidRef.current) return
    const optimistic = { id: `tmp-${Date.now()}`, body: text, kind, ai_suggested: aiSuggested, created_at: new Date().toISOString() }
    setActivities(prev => [optimistic, ...prev])
    const { data } = await supabase.from('growth_notes')
      .insert({ user_id: uidRef.current, team_id: teamRef.current, entity_type: 'lead', entity_id: partnerId, kind, body: text, ai_suggested: aiSuggested })
      .select('id, body, kind, ai_suggested, created_at').single()
    if (data) setActivities(prev => [data, ...prev.filter(n => n.id !== optimistic.id)])
  }, [partnerId, supabase])

  const removeActivity = useCallback(async (id: string) => {
    setActivities(prev => prev.filter(n => n.id !== id))
    await supabase.from('growth_notes').delete().eq('id', id)
  }, [supabase])

  return { loading, deal, contacts, activities, updateDeal, addContact, removeContact, setPrimary, addActivity, removeActivity }
}
