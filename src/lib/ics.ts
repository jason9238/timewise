import type { ClassSlot, Weekday, WeekLabel } from '../types'
import { parityLabel, weekIndex, weekLabelFor, weekParity } from './weeks'

export class IcsParseError extends Error {}

const BYDAY_TO_WEEKDAY: Record<string, Weekday> = {
  MO: 0,
  TU: 1,
  WE: 2,
  TH: 3,
  FR: 4,
  SA: 5,
  SU: 6,
}

interface RawEvent {
  [prop: string]: string
}

/**
 * Parse an iCalendar (.ics) export into weekly class slots.
 *
 * School/university timetable feeds are recurring-weekly, so events collapse
 * onto a Mon–Sun grid: weekly RRULEs expand their BYDAY list, anything else
 * maps to its DTSTART day of week. Duplicate (subject, day, time) instances
 * from feeds that emit one VEVENT per week are deduped.
 *
 * Week A / Week B classes come from three signals, strongest first:
 *  1. "Week A" / "Wk B" text in the event summary, description or categories —
 *     this also tells us which real calendar weeks are "Week A", returned as
 *     `weekAParity` so the app can work out the current week by itself;
 *  2. fortnightly rules (FREQ=WEEKLY;INTERVAL=2), labelled by DTSTART;
 *  3. per-occurrence feeds where a class only ever appears in one
 *     fortnight-half (see collapseOccurrences).
 */
export interface IcsImport {
  classes: ClassSlot[]
  /** Which fortnight-half is "Week A", when the file says so. */
  weekAParity?: 0 | 1
}

export function parseICS(text: string, fallbackWeekAParity: 0 | 1 = 0): IcsImport {
  const lines = unfoldLines(text)
  if (!lines.some((l) => l.toUpperCase().startsWith('BEGIN:VCALENDAR'))) {
    throw new IcsParseError('This file is not a valid iCalendar (.ics) file.')
  }

  const events: RawEvent[] = []
  let event: RawEvent | null = null

  for (const line of lines) {
    const upper = line.toUpperCase()
    if (upper === 'BEGIN:VEVENT') {
      event = {}
      continue
    }
    if (upper === 'END:VEVENT') {
      if (event) events.push(event)
      event = null
      continue
    }
    if (!event) continue

    const colon = line.indexOf(':')
    if (colon === -1) continue
    const nameWithParams = line.slice(0, colon)
    const value = line.slice(colon + 1)
    const name = nameWithParams.split(';')[0].toUpperCase()
    // First occurrence wins (e.g. ignore RECURRENCE-ID overrides)
    if (!(name in event)) event[name] = value
  }

  // Labels in the file beat whatever mapping the app currently has.
  const detectedParity = detectWeekAParity(events)
  const parity = detectedParity ?? fallbackWeekAParity
  const occurrences = events.flatMap((e) => eventToSlots(e, parity))

  return {
    classes: collapseOccurrences(occurrences, parity).sort(
      (a, b) => a.day - b.day || a.startMin - b.startMin,
    ),
    weekAParity: detectedParity,
  }
}

/** "Maths Week A", "Wk B" etc. — only a bare A or B counts, never "Week 4". */
const WEEK_LABEL_RE = /\b(?:week|wk)\s*[:\-–]?\s*([AB])\b/i

function extractWeekLabel(event: RawEvent): WeekLabel | undefined {
  for (const field of [event.SUMMARY, event.DESCRIPTION, event.CATEGORIES]) {
    const m = field?.match(WEEK_LABEL_RE)
    if (m) return m[1].toUpperCase() as WeekLabel
  }
  return undefined
}

/**
 * When any event carries a textual week label and a concrete start date, that
 * pins down which calendar fortnight-half is "Week A".
 */
function detectWeekAParity(events: RawEvent[]): (0 | 1) | undefined {
  for (const event of events) {
    const label = extractWeekLabel(event)
    if (!label) continue
    const start = parseIcsDateTime(event.DTSTART)
    if (!start) continue
    const parity = weekParity(start.date)
    return label === 'A' ? parity : ((1 - parity) as 0 | 1)
  }
  return undefined
}

interface Occurrence {
  slot: ClassSlot
  /** Calendar week the occurrence falls in (lib/weeks.ts indexing). */
  weekIdx: number
  /** True when the slot came from an RRULE, so its week label is already final. */
  recurring: boolean
}

/**
 * Dedupes occurrences into one slot per (subject, day, time, room, week).
 *
 * Feeds that emit one VEVENT per concrete date get fortnightly detection: if
 * the file as a whole covers both fortnight-halves but a class only ever
 * appears in one of them (across 2+ weeks), it is a Week A / Week B class.
 */
function collapseOccurrences(occurrences: Occurrence[], weekAParity: 0 | 1): ClassSlot[] {
  const slots: ClassSlot[] = []
  const seenRecurring = new Set<string>()
  const groups = new Map<string, { slot: ClassSlot; weekIdxs: Set<number> }>()
  const fileParities = new Set<number>()

  for (const { slot, weekIdx, recurring } of occurrences) {
    // Explicitly labelled weeks keep A and B variants of the same period apart
    const key = `${slot.subject}|${slot.day}|${slot.startMin}|${slot.endMin}|${slot.room ?? ''}|${slot.week ?? ''}`
    if (recurring) {
      if (!seenRecurring.has(key)) {
        seenRecurring.add(key)
        slots.push(slot)
      }
    } else {
      fileParities.add(((weekIdx % 2) + 2) % 2)
      const group = groups.get(key)
      if (group) {
        group.weekIdxs.add(weekIdx)
      } else {
        groups.set(key, { slot, weekIdxs: new Set([weekIdx]) })
      }
    }
  }

  for (const { slot, weekIdxs } of groups.values()) {
    if (slot.week) {
      slots.push(slot) // label came from the file itself; nothing to infer
      continue
    }
    const parities = new Set([...weekIdxs].map((w) => ((w % 2) + 2) % 2))
    const fortnightly = fileParities.size === 2 && weekIdxs.size >= 2 && parities.size === 1
    slots.push(
      fortnightly
        ? { ...slot, week: parityLabel([...parities][0] as 0 | 1, weekAParity) }
        : slot,
    )
  }

  return slots
}

/** RFC 5545 line unfolding: a CRLF followed by a space/tab continues the previous line. */
function unfoldLines(text: string): string[] {
  const raw = text.split(/\r?\n/)
  const out: string[] = []
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1)
    } else if (line.length > 0) {
      out.push(line)
    }
  }
  return out
}

function eventToSlots(event: RawEvent, weekAParity: 0 | 1): Occurrence[] {
  const start = parseIcsDateTime(event.DTSTART)
  if (!start) return [] // all-day or malformed events don't belong on a timetable grid

  let endMin: number
  const end = parseIcsDateTime(event.DTEND)
  if (end && end.minutes > start.minutes) {
    endMin = end.minutes
  } else {
    const duration = parseIcsDuration(event.DURATION)
    endMin = start.minutes + (duration ?? 60)
  }
  endMin = Math.min(endMin, 24 * 60)

  const textWeek = extractWeekLabel(event)
  const rawSummary = singleLine(unescapeIcsText(event.SUMMARY ?? 'Untitled class'))
  // "Maths (Week A)" → "Maths"; the label moves into the week field
  const summary =
    rawSummary.replace(WEEK_LABEL_RE, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim() ||
    rawSummary
  const description = unescapeIcsText(event.DESCRIPTION ?? '')
  const room = singleLine(unescapeIcsText(event.LOCATION ?? '')) || undefined
  const teacher = extractTeacher(description)
  const { subject, subjectCode } = splitSubjectCode(summary, description)

  const recurring = isWeeklyRrule(event.RRULE)
  // FREQ=WEEKLY;INTERVAL=2 → the class only runs in its DTSTART's fortnight-half
  const week =
    textWeek ??
    (recurring && rruleInterval(event.RRULE) === 2
      ? weekLabelFor(start.date, weekAParity)
      : undefined)

  const days = expandDays(event.RRULE, start.day)
  return days.map((day) => ({
    slot: {
      id: crypto.randomUUID(),
      subject,
      subjectCode,
      teacher,
      room,
      day,
      startMin: start.minutes,
      endMin,
      week,
    },
    weekIdx: weekIndex(start.date),
    recurring,
  }))
}

/** Handles 20240902T090000, 20240902T090000Z and bare dates (rejected — all-day). */
function parseIcsDateTime(
  value: string | undefined,
): { date: Date; day: Weekday; minutes: number } | null {
  if (!value) return null
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s, utc] = m
  const date = utc
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0)))
    : new Date(+y, +mo - 1, +d, +h, +mi, +(s ?? 0))
  if (Number.isNaN(date.getTime())) return null
  return {
    date,
    day: ((date.getDay() + 6) % 7) as Weekday,
    minutes: date.getHours() * 60 + date.getMinutes(),
  }
}

function rruleParams(rrule: string | undefined): Map<string, string> {
  return new Map(
    (rrule ?? '').split(';').map((p) => {
      const [k, v] = p.split('=')
      return [k?.toUpperCase() ?? '', v?.toUpperCase() ?? ''] as const
    }),
  )
}

function isWeeklyRrule(rrule: string | undefined): boolean {
  return rruleParams(rrule).get('FREQ') === 'WEEKLY'
}

function rruleInterval(rrule: string | undefined): number {
  const raw = Number(rruleParams(rrule).get('INTERVAL') ?? '1')
  return Number.isFinite(raw) && raw >= 1 ? raw : 1
}

/** PT1H30M → 90. Only H/M components matter for class lengths. */
function parseIcsDuration(value: string | undefined): number | null {
  if (!value) return null
  const m = value.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i)
  if (!m || (!m[1] && !m[2])) return null
  return (+(m[1] ?? 0)) * 60 + +(m[2] ?? 0)
}

/** FREQ=WEEKLY;BYDAY=MO,WE,FR → all listed days; everything else collapses to the DTSTART day. */
function expandDays(rrule: string | undefined, fallback: Weekday): Weekday[] {
  if (!rrule) return [fallback]
  const params = rruleParams(rrule)
  if (params.get('FREQ') !== 'WEEKLY') return [fallback]
  const byday = params.get('BYDAY')
  if (!byday) return [fallback]
  const days = byday
    .split(',')
    .map((d) => BYDAY_TO_WEEKDAY[d.trim().slice(-2).toUpperCase()])
    .filter((d): d is Weekday => d !== undefined)
  return days.length > 0 ? [...new Set(days)] : [fallback]
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

function singleLine(value: string): string {
  return value.replace(/\s*\n\s*/g, ' ')
}

function extractTeacher(description: string): string | undefined {
  const m = description.match(/(?:teacher|lecturer|tutor|instructor|staff|prof(?:essor)?)\s*[:\-–]\s*([^;,\n]+)/i)
  return m ? m[1].trim() : undefined
}

const CODE_RE = /\b([A-Z]{2,5}\s?\d{3,4}[A-Z]?)\b/

function splitSubjectCode(summary: string, description: string): { subject: string; subjectCode?: string } {
  const inSummary = summary.match(CODE_RE)
  if (inSummary) {
    const code = inSummary[1].replace(/\s+/g, '')
    const rest = summary.replace(inSummary[0], '').replace(/^[\s\-–:]+|[\s\-–:]+$/g, '')
    return { subject: rest || code, subjectCode: code }
  }
  const inDescription = description.match(/(?:code|unit)\s*[:\-–]\s*([A-Z]{2,5}\s?\d{3,4}[A-Z]?)/i)
  return { subject: summary, subjectCode: inDescription?.[1].replace(/\s+/g, '') }
}
