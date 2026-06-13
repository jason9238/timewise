import { mockProvider } from './mockProvider'
import { claudeProvider } from './claudeProvider'
import { supabase } from '../supabase'
import type { SchedulerProvider } from './provider'

/**
 * Claude plans when the backend is configured and the user is signed in;
 * otherwise the on-device algorithm keeps everything working offline.
 */
export function pickProvider(signedIn: boolean): SchedulerProvider {
  return supabase && signedIn ? claudeProvider : mockProvider
}

/** True when signing in would upgrade planning to Claude AI. */
export const claudeAvailable = supabase !== null
