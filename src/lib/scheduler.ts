import { addDays, format, getDay, startOfDay } from 'date-fns'
import type { FreeBlock, ScheduleResult, ScheduledBlock, Task, Weekday } from '../types'
import { roundUpTo5 } from './time'

const BREAK_MIN = 10
const MIN_CHUNK_MIN = 25

export interface SchedulerInput {
  tasks: Task[]
  freeBlocks: FreeBlock[]
  now?: Date
}

/** Heuristic duration when the user didn't provide an estimate. */
export function estimateDuration(task: Task): number {
  if (task.estimatedMin && task.estimatedMin > 0) return roundUpTo5(task.estimatedMin)
  const t = task.title.toLowerCase()
  if (/essay|report|project|exam|test|assignment|presentation|research|revis|study/.test(t)) return 90
  if (/read|quiz|worksheet|flashcard|vocab|practice|review|homework/.test(t)) return 30
  return 45
}

interface Window {
  date: string
  day: Weekday
  cursor: number
  end: number
}

/**
 * Greedy due-date-first placement over the next 7 days of free time.
 *
 * - Tasks sorted by due date (no due date last), then creation order.
 * - Windows filled earliest-first with a 10-minute break between tasks.
 * - A task that doesn't fit in one window is split across windows,
 *   never into chunks smaller than 25 minutes.
 * - All boundaries land on 5-minute marks; blocks never overlap or
 *   spill outside a free-time window.
 */
export function generateSchedule({ tasks, freeBlocks, now = new Date() }: SchedulerInput): ScheduleResult {
  const pending = [...tasks.filter((t) => !t.done)].sort((a, b) => {
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    return a.createdAt - b.createdAt
  })

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const windows: Window[] = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(startOfDay(now), i)
    const day = ((getDay(date) + 6) % 7) as Weekday
    for (const fb of freeBlocks) {
      if (fb.day !== day) continue
      let start = roundUpTo5(fb.startMin)
      if (i === 0) start = Math.max(start, roundUpTo5(nowMin + 5))
      if (start + MIN_CHUNK_MIN <= fb.endMin) {
        windows.push({ date: format(date, 'yyyy-MM-dd'), day, cursor: start, end: fb.endMin })
      }
    }
  }
  windows.sort((a, b) => (a.date === b.date ? a.cursor - b.cursor : a.date < b.date ? -1 : 1))

  const blocks: ScheduledBlock[] = []
  const unscheduledTaskIds: string[] = []

  for (const task of pending) {
    let remaining = estimateDuration(task)
    for (const w of windows) {
      if (remaining <= 0) break
      // keep chunk ends on 5-minute marks even when the window end isn't one
      const available = Math.floor((w.end - w.cursor) / 5) * 5
      if (available < Math.min(MIN_CHUNK_MIN, remaining)) continue
      const chunk = Math.min(remaining, available)
      blocks.push({
        id: crypto.randomUUID(),
        taskId: task.id,
        date: w.date,
        day: w.day,
        startMin: w.cursor,
        endMin: w.cursor + chunk,
      })
      w.cursor += chunk + BREAK_MIN
      remaining -= chunk
    }
    if (remaining > 0) unscheduledTaskIds.push(task.id)
  }

  return { blocks, unscheduledTaskIds, generatedAt: Date.now() }
}
