import { generateSchedule } from '../scheduler'
import type { SchedulerProvider } from './provider'

/** Local deterministic engine with a short delay so the UI's loading state is visible. */
export const mockProvider: SchedulerProvider = {
  name: 'Smart Scheduler (local)',
  async plan(input) {
    await new Promise((resolve) => setTimeout(resolve, 700))
    return generateSchedule(input)
  },
}
