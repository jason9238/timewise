import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, supabaseFunctionsUrl } from './supabase'

export interface AdminUser {
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  isAdmin: boolean
}

type AdminPayload = { userId?: string; password?: string; makeAdmin?: boolean }

/** Calls the `admin` edge function as the signed-in user. */
export async function adminCall<T = { ok: true }>(
  action: 'list_users' | 'delete_user' | 'reset_password' | 'set_admin',
  payload: AdminPayload = {},
): Promise<T> {
  if (!supabase || !supabaseFunctionsUrl) throw new Error('Supabase is not configured.')
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('Not signed in.')

  const res = await fetch(`${supabaseFunctionsUrl}/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  })
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok || !body) throw new Error(body?.error ?? `Admin call failed (${res.status}).`)
  return body
}

/** Whether the given user is an admin (own-row check under RLS). */
export function useIsAdmin(user: User | null): boolean {
  // Stores WHICH user was confirmed admin, so a user switch never leaks state.
  const [adminUserId, setAdminUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase || !user) return
    let cancelled = false
    void supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAdminUserId(data !== null ? user.id : null)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return user !== null && adminUserId === user.id
}
