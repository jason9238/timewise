import { supabase, supabaseFunctionsUrl } from './supabase'

export interface GroupMember {
  user_id: string
  display_name: string | null
  role: string
}

export interface SharedItem {
  id: string
  group_id: string
  type: 'assignment' | 'note'
  payload: { title?: string; dueDate?: string; text?: string }
  created_by: string
  created_by_name: string | null
  created_at: string
}

export interface ClassGroup {
  id: string
  name: string
  subject: string | null
  owner: string
  invite_code: string
  members: GroupMember[]
  items: SharedItem[]
}

export interface FreeCompare {
  overlap: Array<{ day: number; startMin: number; endMin: number }>
  contributors: string[]
  missing: string[]
}

/** Whether the groups backend is available. */
export const groupsAvailable = supabase !== null && supabaseFunctionsUrl !== null

type Action = 'list' | 'create' | 'join' | 'leave' | 'post' | 'deleteItem' | 'freeCompare'

export async function groupsCall<T = unknown>(action: Action, payload: Record<string, unknown> = {}): Promise<T> {
  if (!supabase || !supabaseFunctionsUrl) throw new Error('Groups need an account.')
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('Sign in to use groups.')
  const res = await fetch(`${supabaseFunctionsUrl}/groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  })
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok || !body) throw new Error(body?.error ?? `Groups call failed (${res.status}).`)
  return body
}
