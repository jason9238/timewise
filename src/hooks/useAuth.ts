import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface AuthState {
  user: User | null
  /** True while the persisted session is still being restored. */
  loading: boolean
}

/** Current Supabase auth state; user stays null when Supabase is unconfigured. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: supabase !== null })

  useEffect(() => {
    if (!supabase) return
    void supabase.auth
      .getSession()
      .then(({ data }) => setState({ user: data.session?.user ?? null, loading: false }))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false })
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return state
}
