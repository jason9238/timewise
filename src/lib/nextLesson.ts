import { addDays, format } from 'date-fns'
import type { ClassSlot, Weekday } from '../types'
import { weekLabelFor } from './weeks'

export interface UpcomingLesson {
  /** ISO date, yyyy-MM-dd. */
  date: string
  /** Human label: "Tomorrow", "Friday", "Mon 22 Jun". */
  label: string
}

/**
 * The next `count` concrete dates this subject is taught, Week A/B aware.
 * Looks ahead up to four weeks; a lesson later today doesn't count — a task
 * "due next English lesson" means the next one you can still prepare for.
 */
export function upcomingLessons(
  subject: string,
  classes: ClassSlot[],
  weekAParity: 0 | 1,
  from: Date = new Date(),
  count = 2,
): UpcomingLesson[] {
  const slots = classes.filter((c) => c.subject === subject)
  if (slots.length === 0) return []

  const results: UpcomingLesson[] = []
  for (let ahead = 1; ahead <= 28 && results.length < count; ahead++) {
    const date = addDays(from, ahead)
    const day = ((date.getDay() + 6) % 7) as Weekday
    const week = weekLabelFor(date, weekAParity)
    const taught = slots.some((c) => c.day === day && (!c.week || c.week === week))
    if (!taught) continue
    results.push({
      date: format(date, 'yyyy-MM-dd'),
      label: ahead === 1 ? 'Tomorrow' : ahead < 7 ? format(date, 'EEEE') : format(date, 'EEE d MMM'),
    })
  }
  return results
}
