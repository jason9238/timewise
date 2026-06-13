import { startOfWeek } from 'date-fns'
import type { WeekLabel } from '../types'

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
/** Monday 1970-01-05, the first Monday of the Unix epoch. */
const EPOCH_MONDAY_UTC = Date.UTC(1970, 0, 5)

/** Sequential index of the date's Mon-first week. Stable within a timezone. */
export function weekIndex(date: Date): number {
  const monday = startOfWeek(date, { weekStartsOn: 1 })
  return Math.round((monday.getTime() - EPOCH_MONDAY_UTC) / MS_PER_WEEK)
}

/** 0 or 1 depending on which fortnight-half the date's week falls in. */
export function weekParity(date: Date): 0 | 1 {
  return (weekIndex(date) % 2) as 0 | 1
}

/** Which label ('A' or 'B') a week of the given parity has, given the stored mapping. */
export function parityLabel(parity: 0 | 1, weekAParity: 0 | 1): WeekLabel {
  return parity === weekAParity ? 'A' : 'B'
}

/** Which label ('A' or 'B') the week containing `date` has, given the stored mapping. */
export function weekLabelFor(date: Date, weekAParity: 0 | 1): WeekLabel {
  return parityLabel(weekParity(date), weekAParity)
}

export function otherWeek(label: WeekLabel): WeekLabel {
  return label === 'A' ? 'B' : 'A'
}
