import { addDays, format } from 'date-fns'
import type { ClassSlot, Task, Weekday } from '../types'
import { parseHM } from './time'

export interface SampleData {
  classes: ClassSlot[]
  tasks: Task[]
}

function slot(
  day: Weekday,
  start: string,
  end: string,
  subject: string,
  extra: Partial<Pick<ClassSlot, 'subjectCode' | 'teacher' | 'room'>> = {},
): ClassSlot {
  return {
    id: crypto.randomUUID(),
    subject,
    day,
    startMin: parseHM(start),
    endMin: parseHM(end),
    ...extra,
  }
}

function task(title: string, daysFromNow: number, classId?: string, estimatedMin?: number): Task {
  return {
    id: crypto.randomUUID(),
    title,
    classId,
    dueDate: format(addDays(new Date(), daysFromNow), 'yyyy-MM-dd'),
    estimatedMin,
    done: false,
    createdAt: Date.now(),
  }
}

const HS_SUBJECTS: Array<{ subject: string; teacher: string; room: string }> = [
  { subject: 'Mathematics', teacher: 'Mr Chen', room: 'M12' },
  { subject: 'English', teacher: 'Ms Patel', room: 'E4' },
  { subject: 'Science', teacher: 'Dr Brooks', room: 'LAB 2' },
  { subject: 'History', teacher: 'Mr Okafor', room: 'H7' },
  { subject: 'PE', teacher: 'Coach Reid', room: 'Gym' },
  { subject: 'Art', teacher: 'Ms Romano', room: 'A1' },
  { subject: 'Geography', teacher: 'Mrs Lindqvist', room: 'G3' },
  { subject: 'French', teacher: 'M. Dubois', room: 'L5' },
  { subject: 'Music', teacher: 'Mr Adeyemi', room: 'MU1' },
  { subject: 'Computing', teacher: 'Ms Tanaka', room: 'IT Lab' },
]

// 8 back-to-back periods per day with recess/lunch gaps — typical high-school density.
const HS_PERIODS: Array<[string, string]> = [
  ['08:30', '09:10'],
  ['09:10', '09:50'],
  ['09:55', '10:35'],
  ['10:55', '11:35'],
  ['11:35', '12:15'],
  ['13:00', '13:40'],
  ['13:40', '14:20'],
  ['14:25', '15:05'],
]

export function highSchoolSample(): SampleData {
  const classes: ClassSlot[] = []
  for (let day = 0; day < 5; day++) {
    HS_PERIODS.forEach(([start, end], period) => {
      const s = HS_SUBJECTS[(day * 3 + period) % HS_SUBJECTS.length]
      classes.push(slot(day as Weekday, start, end, s.subject, { teacher: s.teacher, room: s.room }))
    })
  }
  const math = classes.find((c) => c.subject === 'Mathematics')
  const english = classes.find((c) => c.subject === 'English')
  const science = classes.find((c) => c.subject === 'Science')
  return {
    classes,
    tasks: [
      task('Maths worksheet ch. 7', 2, math?.id),
      task('English essay draft', 5, english?.id, 90),
      task('Study for science quiz', 3, science?.id),
    ],
  }
}

export function universitySample(): SampleData {
  const comp = { subjectCode: 'COMP1511', teacher: 'Dr A. Finch' }
  const math = { subjectCode: 'MATH1131', teacher: 'Prof L. Varga' }
  const psyc = { subjectCode: 'PSYC1001', teacher: 'Dr S. Moreau' }

  const classes: ClassSlot[] = [
    slot(0, '09:00', '11:00', 'Programming Fundamentals', { ...comp, room: 'CLB 7' }),
    slot(0, '14:00', '15:00', 'Calculus Tutorial', { ...math, room: 'QUAD G040' }),
    slot(1, '11:00', '13:00', 'Programming Lab', { ...comp, room: 'K17 Lab 2' }),
    slot(1, '16:00', '18:00', 'Intro Psychology', { ...psyc, room: 'Ritchie Theatre' }),
    slot(2, '10:00', '12:00', 'Calculus Lecture', { ...math, room: 'Mathews A' }),
    // Thursday: two clashing tutorial options + an evening lecture
    slot(3, '13:00', '14:00', 'Programming Tutorial', { ...comp, room: 'Quad 1042' }),
    slot(3, '13:30', '14:30', 'Psychology Tutorial', { ...psyc, room: 'Morven Brown LG2' }),
    slot(3, '18:00', '20:00', 'Calculus Lecture', { ...math, room: 'Mathews A' }),
    slot(4, '09:00', '11:00', 'Psychology Lab', { ...psyc, room: 'Biolink 1' }),
  ]
  return {
    classes,
    tasks: [
      task('COMP1511 assignment 1', 6, classes[0].id, 180),
      task('Calculus problem set 3', 2, classes[4].id),
      task('Read PSYC1001 week 4 chapter', 4, classes[3].id, 40),
    ],
  }
}
