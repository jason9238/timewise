import { addDays, format } from 'date-fns'
import type { ClassSlot, ScheduledBlock, Task, Weekday } from '../types'
import { weekLabelFor } from './weeks'

export interface UpNextClass {
  slot: ClassSlot
  /** Whole minutes from now until the class starts. */
  minutesUntil: number
  /** '' for today, 'tomorrow' or a weekday name otherwise. */
  dayLabel: string
}

export interface UpNextStudy {
  block: ScheduledBlock
  task: Task
  minutesUntil: number
  dayLabel: string
}

const dayIdx = (date: Date) => ((date.getDay() + 6) % 7) as Weekday
const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes()

function labelFor(daysAhead: number, date: Date): string {
  if (daysAhead === 0) return ''
  if (daysAhead === 1) return 'tomorrow'
  return format(date, 'EEEE')
}

/** The next class on the timetable, looking up to a week ahead (Week A/B aware). */
export function nextClass(classes: ClassSlot[], now: Date, weekAParity: 0 | 1): UpNextClass | null {
  for (let ahead = 0; ahead < 8; ahead++) {
    const date = addDays(now, ahead)
    const week = weekLabelFor(date, weekAParity)
    const candidates = classes
      .filter((c) => c.day === dayIdx(date) && (!c.week || c.week === week))
      .filter((c) => ahead > 0 || c.startMin > minutesOf(now))
      .sort((a, b) => a.startMin - b.startMin)
    if (candidates.length > 0) {
      const slot = candidates[0]
      const minutesUntil = ahead * 24 * 60 + slot.startMin - minutesOf(now)
      return { slot, minutesUntil, dayLabel: labelFor(ahead, date) }
    }
  }
  return null
}

/** The next not-yet-finished block of the generated study plan. */
export function nextStudyBlock(
  blocks: ScheduledBlock[],
  tasks: Task[],
  now: Date,
): UpNextStudy | null {
  const todayIso = format(now, 'yyyy-MM-dd')
  const taskById = new Map(tasks.map((t) => [t.id, t]))
  const upcoming = blocks
    .filter((b) => b.date > todayIso || (b.date === todayIso && b.endMin > minutesOf(now)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)

  for (const block of upcoming) {
    const task = taskById.get(block.taskId)
    if (!task || task.done) continue
    const daysAhead = Math.round(
      (new Date(`${block.date}T00:00`).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) /
        86_400_000,
    )
    return {
      block,
      task,
      minutesUntil: daysAhead * 24 * 60 + block.startMin - minutesOf(now),
      dayLabel: labelFor(daysAhead, new Date(`${block.date}T00:00`)),
    }
  }
  return null
}

/** "in 25 min", "in 3 h 10 min", or "now" while the event is imminent/started. */
export function untilLabel(minutes: number): string {
  if (minutes <= 0) return 'now'
  if (minutes < 60) return `in ${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (minutes < 12 * 60) return m > 0 ? `in ${h} h ${m} min` : `in ${h} h`
  return ''
}
