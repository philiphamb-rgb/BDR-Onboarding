'use client'

// CRM Workspace data hook — loads the four new CRM entities (accounts, leads,
// opportunities, contacts) for the current user, with create/update/delete that
// are RLS-safe (owner writes). One funnel: lead → account → opportunity →
// partner. Uses the untyped client because these tables post-date the generated
// Database type; entity shapes are declared here so consumers stay typed.

import { useCallback, useEffect, useState } from 'react'
import { createUntypedClient } from '@/lib/supabase/untyped'

export interface Account {
  id: string; name: string; vertical: string | null; segment: string | null
  lifecycle_stage: string; partner_fit_score: number | null
  smartcredit_fit_score: number | null; health_score: number | null
  revenue_potential: number | null; tags: string[]; ai_summary: string | null
  created_at: string; updated_at: string
}
export interface Lead {
  id: string; account_id: string | null; contact_id: string | null
  source: string | null; qualification_score: number | null; status: string
  next_best_action: string | null; ai_summary: string | null; created_at: string
}
export interface Opportunity {
  id: string; account_id: string | null; name: string; kind: string; stage: string
  amount: number | null; probability: number | null; close_date: string | null
  ai_next_step: string | null; created_at: string
}
export interface Contact {
  id: string; account_id: string | null; name: string; title: string | null
  email: string | null; phone: string | null; is_primary: boolean
  lifecycle_stage: string; created_at: string
}

export type CrmEntity = 'accounts' | 'leads' | 'opportunities' | 'contacts'

export interface CrmData {
  loading: boolean
  userId: string | null
  teamId: string | null
  accounts: Account[]
  leads: Lead[]
  opportunities: Opportunity[]
  contacts: Contact[]
  reload: () => void
  create: (entity: CrmEntity, values: Record<string, unknown>) => Promise<{ error?: string; id?: string }>
  update: (entity: CrmEntity, id: string, values: Record<string, unknown>) => Promise<{ error?: string }>
  remove: (entity: CrmEntity, id: string) => Promise<{ error?: string }>
}

export function useCrm(): CrmData {
  const supabase = createUntypedClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce(n => n + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const { data: me } = await supabase.from('users').select('team_id').eq('id', user.id).maybeSingle()
      const [acc, ld, opp, ct] = await Promise.all([
        supabase.from('accounts').select('*').order('updated_at', { ascending: false }),
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('opportunities').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_contacts').select('id, account_id, name, title, email, phone, is_primary, lifecycle_stage, created_at').order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      setUserId(user.id)
      setTeamId(me?.team_id ?? null)
      setAccounts(acc.data ?? [])
      setLeads(ld.data ?? [])
      setOpportunities(opp.data ?? [])
      setContacts(ct.data ?? [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [nonce, supabase])

  const tableFor = (e: CrmEntity) => (e === 'contacts' ? 'crm_contacts' : e)

  const create: CrmData['create'] = async (entity, values) => {
    if (!userId) return { error: 'Not signed in' }
    const row = { ...values, user_id: userId, team_id: teamId }
    const { data, error } = await supabase.from(tableFor(entity)).insert(row).select('id').maybeSingle()
    if (error) return { error: error.message }
    reload()
    return { id: data?.id }
  }

  const update: CrmData['update'] = async (entity, id, values) => {
    const { error } = await supabase.from(tableFor(entity)).update({ ...values, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return { error: error.message }
    reload()
    return {}
  }

  const remove: CrmData['remove'] = async (entity, id) => {
    const { error } = await supabase.from(tableFor(entity)).delete().eq('id', id)
    if (error) return { error: error.message }
    reload()
    return {}
  }

  return { loading, userId, teamId, accounts, leads, opportunities, contacts, reload, create, update, remove }
}
