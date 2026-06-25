'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserData {
  id: string
  email: string
  name: string
  role: 'rep' | 'manager' | 'owner'
  team_id: string | null
  avatar_url: string | null
  start_date: string
  accent_color: string
  theme: string
}

interface UseUserReturn {
  user: UserData | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  isManager: boolean
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchUser = useCallback(async () => {
    try {
      setError(null)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setUser(null); setLoading(false); return }

      const { data, error: dbErr } = await supabase.from('users').select('*').eq('id', authUser.id).single()
      if (dbErr) throw dbErr
      setUser(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') fetchUser()
      else if (event === 'SIGNED_OUT') { setUser(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [fetchUser, supabase.auth])

  const signOut = async () => { await supabase.auth.signOut(); setUser(null) }

  return { user, loading, error, refresh: fetchUser, signOut, isManager: user?.role === 'manager' || user?.role === 'owner' }
}
