// @ts-nocheck
'use client'

// The CRM record behind a partner/company: its deal properties (amount, close
// date, probability, stage), its associated Contacts (people), and its typed
// activity timeline (growth_notes with a `kind`). Additive over the existing
// partner_onboarding record — no rewrite. All writes are RLS-safe (owner edits;
// managers read their team). One hook powers the whole Lead detail drawer.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui'

export function useCrmRecord(partnerId: string | null, onSaved?: () => void) {
  const supabase = createClient()
  const [deal, setDeal] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const uidRef = useRef<string | null>(null)
  const teamRef = useRef<string | null>(null)
  const saveTimer = useRef<any>(null)
  const pendingDeal = useRef<any>({})   // accumulates edited deal fields between debounced writes
  // Kept in a ref so flushDeal (which persists across a partnerId change) always
  // calls the latest parent callback without re-subscribing the cleanup effect.
  const onSavedRef = useRef(onSaved)
  useEffect(() => { onSavedRef.current = onSaved }, [onSaved])

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

  // Deal properties — optimistic + debounced (RLS: owner or team-manager update).
  // Accumulate every edited field into pendingDeal so rapid edits to different
  // fields (amount then probability) all persist — not just the last one.
  // `flushDeal` writes the buffered fields immediately; it's called both by the
  // debounce timer AND on unmount / partnerId change so a fast close-or-switch
  // never silently drops the last edit.
  const flushDeal = useCallback(async (id: string | null) => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    if (!id || Object.keys(pendingDeal.current).length === 0) return
    const payload = { ...pendingDeal.current, updated_at: new Date().toISOString() }
    pendingDeal.current = {}
    const { error } = await supabase.from('partner_onboarding').update(payload).eq('id', id)
    if (error) toast.error('Deal changes could not be saved. Try again.')
    else onSavedRef.current?.()
  }, [supabase])

  const updateDeal = useCallback((patch: any) => {
    pendingDeal.current = { ...pendingDeal.current, ...patch }
    setDeal(prev => ({ ...prev, ...patch }))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const id = partnerId
    saveTimer.current = setTimeout(() => { flushDeal(id) }, 500)
  }, [partnerId, flushDeal])

  // Flush any pending deal edit when the record changes or the hook unmounts.
  useEffect(() => {
    const id = partnerId
    return () => { flushDeal(id) }
  }, [partnerId, flushDeal])

  const addContact = useCallback(async (fields: any) => {
    if (!partnerId || !uidRef.current || !(fields.name || '').trim()) return
    const { data, error } = await supabase.from('crm_contacts')
      .insert({ user_id: uidRef.current, team_id: teamRef.current, partner_id: partnerId, name: fields.name.trim(), title: fields.title || null, email: fields.email || null, phone: fields.phone || null, is_primary: contacts.length === 0 })
      .select('*').single()
    if (error || !data) { toast.error('Could not add contact. Try again.'); return }
    setContacts(prev => [...prev, data])
  }, [partnerId, contacts.length, supabase])

  const removeContact = useCallback(async (id: string) => {
    const prevContacts = contacts
    setContacts(prev => prev.filter(c => c.id !== id))
    const { error } = await supabase.from('crm_contacts').delete().eq('id', id)
    if (error) { setContacts(prevContacts); toast.error('Could not delete contact.') }
  }, [contacts, supabase])

  const setPrimary = useCallback(async (id: string) => {
    const prevContacts = contacts
    setContacts(prev => prev.map(c => ({ ...c, is_primary: c.id === id })))
    // Sequential, not Promise.all: clear all first, THEN set the one — otherwise
    // the writes can race and leave the record with zero primaries. If either
    // write fails, roll the optimistic state back so we never show a phantom
    // primary while the DB has a different (or zero) primary.
    const { error: e1 } = await supabase.from('crm_contacts').update({ is_primary: false }).eq('partner_id', partnerId)
    const { error: e2 } = e1 ? { error: e1 } : await supabase.from('crm_contacts').update({ is_primary: true }).eq('id', id)
    if (e1 || e2) { setContacts(prevContacts); toast.error('Could not set primary contact.') }
  }, [contacts, partnerId, supabase])

  const addActivity = useCallback(async (kind: string, body: string, aiSuggested = false) => {
    const text = (body || '').trim()
    if (!text || !partnerId || !uidRef.current) return
    const optimistic = { id: `tmp-${Date.now()}`, body: text, kind, ai_suggested: aiSuggested, created_at: new Date().toISOString() }
    setActivities(prev => [optimistic, ...prev])
    const { data, error } = await supabase.from('growth_notes')
      .insert({ user_id: uidRef.current, team_id: teamRef.current, entity_type: 'lead', entity_id: partnerId, kind, body: text, ai_suggested: aiSuggested })
      .select('id, body, kind, ai_suggested, created_at').single()
    if (error || !data) { setActivities(prev => prev.filter(n => n.id !== optimistic.id)); toast.error('Could not save activity.'); return }
    setActivities(prev => [data, ...prev.filter(n => n.id !== optimistic.id)])
  }, [partnerId, supabase])

  const removeActivity = useCallback(async (id: string) => {
    const prevActivities = activities
    setActivities(prev => prev.filter(n => n.id !== id))
    const { error } = await supabase.from('growth_notes').delete().eq('id', id)
    if (error) { setActivities(prevActivities); toast.error('Could not delete activity.') }
  }, [activities, supabase])

  return { loading, deal, contacts, activities, updateDeal, addContact, removeContact, setPrimary, addActivity, removeActivity }
}
