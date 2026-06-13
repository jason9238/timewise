import { addDays } from 'date-fns'
import type { Assessment, ClassSlot } from '../types'
import { weekLabelFor } from './weeks'

/** Escape a text value per RFC 5545. */
function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local floating timestamp YYYYMMDDTHHMMSS (no TZ → calendar uses local time). */
function dtLocal(date: Date, minutes: number): string {
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  return `${y}${m}${d}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`
}

function dateOnly(iso: string): string {
  return iso.replace(/-/g, '')
}

const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

/**
 * The next date (from `from`) whose weekday matches `day` and, for Week A/B
 * classes, falls in the matching week — so the fortnightly RRULE anchors right.
 */
function firstOccurrence(day: number, week: 'A' | 'B' | undefined, weekAParity: 0 | 1, from: Date): Date {
  for (let i = 0; i < 21; i++) {
    const date = addDays(from, i)
    if (((date.getDay() + 6) % 7) !== day) continue
    if (!week || weekLabelFor(date, weekAParity) === week) return date
  }
  return from
}

export interface IcsExportInput {
  classes: ClassSlot[]
  assessments?: Assessment[]
  weekAParity: 0 | 1
  /** Stop recurring classes here, if a term end is configured. */
  untilIso?: string
}

/** Build a subscribable VCALENDAR: recurring classes + assessment due dates. */
export function buildICS({ classes, assessments = [], weekAParity, untilIso }: IcsExportInput): string {
  const now = new Date()
  const stamp = dtLocal(now, now.getHours() * 60 + now.getMinutes())
  const until = untilIso ? `;UNTIL=${dateOnly(untilIso)}T235959` : ''

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimeWise//Timetable//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:TimeWise',
  ]

  for (const c of classes) {
    const start = firstOccurrence(c.day, c.week, weekAParity, now)
    const interval = c.week ? 2 : 1
    const summary = c.week ? `${c.subject} (Week ${c.week})` : c.subject
    lines.push(
      'BEGIN:VEVENT',
      `UID:class-${c.id}@timewise`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtLocal(start, c.startMin)}`,
      `DTEND:${dtLocal(start, c.endMin)}`,
      `RRULE:FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${BYDAY[c.day]}${until}`,
      `SUMMARY:${esc(summary)}`,
      ...(c.room ? [`LOCATION:${esc(c.room)}`] : []),
      ...(c.teacher ? [`DESCRIPTION:${esc(c.teacher)}`] : []),
      'END:VEVENT',
    )
  }

  for (const a of assessments) {
    const end = dateOnly(addDays(new Date(`${a.date}T00:00`), 1).toISOString().slice(0, 10))
    lines.push(
      'BEGIN:VEVENT',
      `UID:assess-${a.id}@timewise`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateOnly(a.date)}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${esc(`${a.subject}: ${a.title}`)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

/** Trigger a browser download of the current timetable as an .ics file. */
export function downloadICS(input: IcsExportInput): void {
  const blob = new Blob([buildICS(input)], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'timewise.ics'
  a.click()
  URL.revokeObjectURL(url)
}
