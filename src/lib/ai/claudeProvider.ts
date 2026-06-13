import { format } from 'date-fns'
import type { ScheduleResult, ScheduledBlock } from '../../types'
import type { SchedulePlanInput, SchedulerProvider } from './provider'
import { supabase, supabaseFunctionsUrl } from '../supabase'

interface RemotePlan {
  blocks: Array<Omit<ScheduledBlock, 'id'>>
  unscheduledTaskIds: string[]
  error?: string
}

/**
 * Claude-backed scheduler. The browser never holds the Anthropic key — the
 * request goes to the `schedule` Supabase Edge Function
 * (supabase/functions/schedule/index.ts), which verifies the signed-in user
 * and calls the Claude API server-side with structured output.
 */
export const claudeProvider: SchedulerProvider = {
  name: 'Claude AI Scheduler',
  async plan(input: SchedulePlanInput): Promise<ScheduleResult> {
    if (!supabase || !supabaseFunctionsUrl) {
      throw new Error('Claude planning needs Supabase configured (see .env.example).')
    }
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session) {
      throw new Error('Sign in to use the Claude AI planner.')
    }

    const res = await fetch(`${supabaseFunctionsUrl}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        tasks: input.tasks.filter((t) => !t.done),
        freeBlocks: input.freeBlocks,
        today: format(new Date(), 'yyyy-MM-dd'),
      }),
    })

    const body = (await res.json().catch(() => null)) as RemotePlan | null
    if (!res.ok || !body || !Array.isArray(body.blocks)) {
      throw new Error(body?.error ?? `The AI planner returned ${res.status}.`)
    }

    return {
      blocks: body.blocks.map((b) => ({ ...b, id: crypto.randomUUID() })),
      unscheduledTaskIds: Array.isArray(body.unscheduledTaskIds) ? body.unscheduledTaskIds : [],
      generatedAt: Date.now(),
    }
  },
}
