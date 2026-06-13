import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Null when Supabase isn't configured — the whole accounts/sync/AI-backend
 * surface hides and TimeWise stays purely local-first.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const supabaseFunctionsUrl = url ? `${url}/functions/v1` : null
