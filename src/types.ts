/** Day of week, 0 = Monday … 6 = Sunday (timetables read Mon-first). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Fortnightly timetable cycle label. Classes without one run every week. */
export type WeekLabel = 'A' | 'B'

/** A recurring weekly class. Times are minutes from midnight. */
export interface ClassSlot {
  id: string
  subject: string
  subjectCode?: string
  teacher?: string
  room?: string
  day: Weekday
  startMin: number
  endMin: number
  /** Set only on fortnightly (Week A / Week B) timetables. */
  week?: WeekLabel
}

export interface Task {
  id: string
  title: string
  /** Links the task to a specific class on the timetable. */
  classId?: string
  /** ISO date, yyyy-MM-dd. */
  dueDate?: string
  /** User-provided estimate in minutes; estimated by the scheduler when absent. */
  estimatedMin?: number
  done: boolean
  createdAt: number
}

/** A weekly recurring block of free time available for studying. */
export interface FreeBlock {
  id: string
  day: Weekday
  startMin: number
  endMin: number
}

/** One scheduled chunk of work on a concrete date. */
export interface ScheduledBlock {
  id: string
  taskId: string
  /** ISO date, yyyy-MM-dd. */
  date: string
  day: Weekday
  startMin: number
  endMin: number
}

/** When a weekly class reminder should fire, relative to the class. */
export type ReminderTiming = 'night-before' | 'morning' | 'hour-before' | 'before-class'

export const REMINDER_TIMINGS: Array<{ value: ReminderTiming; label: string }> = [
  { value: 'night-before', label: 'Night before (8 pm)' },
  { value: 'morning', label: 'Morning of (from 7 am)' },
  { value: 'hour-before', label: '1 hour before class' },
  { value: 'before-class', label: 'Just before class' },
]

/** A recurring weekly reminder attached to a class, e.g. "Bring PE uniform". */
export interface WeeklyReminder {
  id: string
  classId: string
  message: string
  timing: ReminderTiming
  createdAt: number
}

/** A dashboard sticky note / announcement. */
export interface Note {
  id: string
  text: string
  pinned: boolean
  createdAt: number
}

/** An upcoming exam, test or assignment hand-in for a subject. */
export interface Assessment {
  id: string
  /** Subject name, matching ClassSlot.subject (subjects are the stable identity). */
  subject: string
  title: string
  /** ISO date, yyyy-MM-dd. */
  date: string
  /** Contribution to the final mark, 0–100. */
  weightPct?: number
  createdAt: number
}

/** One completed block of focused study, recorded from the pomodoro timer. */
export interface StudySession {
  id: string
  taskId?: string
  /** Subject the studied task belonged to, when known. */
  subject?: string
  minutes: number
  /** Epoch ms when the session finished. */
  endedAt: number
}

/** A received mark, optionally tied to an assessment. */
export interface Grade {
  id: string
  subject: string
  title: string
  /** Score as a percentage, 0–100. */
  scorePct: number
  /** Contribution to the final mark, 0–100. */
  weightPct?: number
  /** ISO date, yyyy-MM-dd. */
  date: string
  assessmentId?: string
}

/** A note or link attached to a subject, shown on every lesson of that subject. */
export interface SubjectNote {
  id: string
  subject: string
  text: string
  url?: string
  createdAt: number
}

export interface ScheduleResult {
  blocks: ScheduledBlock[]
  /** Tasks that could not be (fully) placed into the available free time. */
  unscheduledTaskIds: string[]
  generatedAt: number
}
