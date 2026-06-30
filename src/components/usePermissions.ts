// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { effectiveRole, resolvePerms, canView as cv, canEdit as ce } from '@/lib/permissions'

// Loads the current user's resolved permission map (role defaults + team
// overrides). Fail-open: while loading or if a feature is absent, access is
// allowed — so nav/actions never disappear unexpectedly.
export function usePermissions() {
  const supabase = createClient()
  const [perms, setPerms] = useState<any>(null) // null = not loaded yet → allow

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) return
      const { data: u } = await supabase.from('users').select('role, team_id').eq('id', user.id).single()
      const role = effectiveRole(u?.role)
      let overrides: any[] = []
      if (u?.team_id) {
        const { data } = await supabase.from('role_permissions').select('role, feature_key, can_view, can_edit').eq('team_id', u.team_id)
        overrides = data ?? []
      }
      if (active) setPerms(resolvePerms(role, overrides))
    })
    return () => { active = false }
  }, [])

  return {
    perms,
    canView: (key: string) => cv(perms, key),
    canEdit: (key: string) => ce(perms, key),
  }
}
