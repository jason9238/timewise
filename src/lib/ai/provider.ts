import type { FreeBlock, ScheduleResult, Task } from '../../types'

export interface SchedulePlanInput {
  tasks: Task[]
  freeBlocks: FreeBlock[]
}

/**
 * Pluggable scheduling engine. The app only talks to this interface, so the
 * local algorithm (`mockProvider`) can be swapped for an LLM-backed one
 * (`claudeProvider`) without touching any UI code.
 */
export interface SchedulerProvider {
  readonly name: string
  plan(input: SchedulePlanInput): Promise<ScheduleResult>
}
