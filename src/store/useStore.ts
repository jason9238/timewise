import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { highSchoolSample, universitySample } from '../lib/sampleData'
import { weekParity } from '../lib/weeks'
import {
  DEFAULT_PERIODS,
  type Assessment,
  type ClassSlot,
  type FreeBlock,
  type Grade,
  type Note,
  type ReminderTiming,
  type ScheduleResult,
  type SchoolConfig,
  type StudySession,
  type SubjectNote,
  type Task,
  type WeekLabel,
  type WeeklyReminder,
} from '../types'

interface AppState {
  classes: ClassSlot[]
  tasks: Task[]
  freeBlocks: FreeBlock[]
  plan: ScheduleResult | null
  notes: Note[]
  reminders: WeeklyReminder[]
  assessments: Assessment[]
  studySessions: StudySession[]
  grades: Grade[]
  subjectNotes: SubjectNote[]
  schoolConfig: SchoolConfig
  /** Which fortnight parity is labelled "Week A" (see lib/weeks.ts). */
  weekAParity: 0 | 1
  /** Browser notifications before classes and on due dates. */
  remindersEnabled: boolean
  /** How many minutes before a class the reminder fires. */
  reminderLeadMin: number

  addClass: (c: Omit<ClassSlot, 'id'>) => void
  removeClass: (id: string) => void
  importClasses: (classes: ClassSlot[], detectedWeekAParity?: 0 | 1) => void
  loadSample: (kind: 'highschool' | 'university') => void
  clearTimetable: () => void

  addTask: (t: Omit<Task, 'id' | 'done' | 'createdAt'>) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void

  addFreeBlock: (b: Omit<FreeBlock, 'id'>) => void
  removeFreeBlock: (id: string) => void

  /** Corrects the A/B cycle, e.g. "the current week is actually Week B". */
  setThisWeekIs: (label: WeekLabel) => void

  updateSchoolConfig: (partial: Partial<SchoolConfig>) => void
  /** Mark a Monday as "Week A"; keeps weekAParity (used everywhere) in sync. */
  setWeekAnchor: (mondayIso: string) => void

  setRemindersEnabled: (on: boolean) => void

  addNote: (text: string) => void
  toggleNotePin: (id: string) => void
  removeNote: (id: string) => void

  addReminder: (classId: string, message: string, timing: ReminderTiming) => void
  removeReminder: (id: string) => void

  setPlan: (plan: ScheduleResult) => void

  addAssessment: (a: Omit<Assessment, 'id' | 'createdAt'>) => void
  removeAssessment: (id: string) => void

  addStudySession: (s: Omit<StudySession, 'id'>) => void

  addGrade: (g: Omit<Grade, 'id'>) => void
  removeGrade: (id: string) => void

  addSubjectNote: (n: Omit<SubjectNote, 'id' | 'createdAt'>) => void
  removeSubjectNote: (id: string) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      classes: [],
      tasks: [],
      freeBlocks: [],
      plan: null,
      notes: [],
      reminders: [],
      assessments: [],
      studySessions: [],
      grades: [],
      subjectNotes: [],
      schoolConfig: { periods: DEFAULT_PERIODS },
      weekAParity: 0,
      remindersEnabled: false,
      reminderLeadMin: 10,

      addClass: (c) =>
        set((s) => ({ classes: [...s.classes, { ...c, id: crypto.randomUUID() }] })),

      removeClass: (id) =>
        set((s) => ({
          classes: s.classes.filter((c) => c.id !== id),
          // keep the class's tasks, but as general to-dos
          tasks: s.tasks.map((t) => (t.classId === id ? { ...t, classId: undefined } : t)),
          reminders: s.reminders.filter((r) => r.classId !== id),
        })),

      importClasses: (classes, detectedWeekAParity) =>
        set((s) => ({
          classes,
          tasks: s.tasks.filter((t) => !t.classId),
          reminders: [],
          // the .ics file knows its own Week A/B cycle better than we do
          weekAParity: detectedWeekAParity ?? s.weekAParity,
        })),

      loadSample: (kind) =>
        set((s) => {
          const sample = kind === 'highschool' ? highSchoolSample() : universitySample()
          return {
            classes: sample.classes,
            tasks: [...s.tasks.filter((t) => !t.classId), ...sample.tasks],
            reminders: [],
          }
        }),

      clearTimetable: () =>
        set((s) => ({
          classes: [],
          tasks: s.tasks.map((t) => (t.classId ? { ...t, classId: undefined } : t)),
          reminders: [],
        })),

      addTask: (t) =>
        set((s) => ({
          tasks: [...s.tasks, { ...t, id: crypto.randomUUID(), done: false, createdAt: Date.now() }],
        })),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),

      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addFreeBlock: (b) =>
        set((s) => ({ freeBlocks: [...s.freeBlocks, { ...b, id: crypto.randomUUID() }] })),

      removeFreeBlock: (id) =>
        set((s) => ({ freeBlocks: s.freeBlocks.filter((b) => b.id !== id) })),

      setThisWeekIs: (label) => {
        const parity = weekParity(new Date())
        set({ weekAParity: label === 'A' ? parity : ((1 - parity) as 0 | 1) })
      },

      updateSchoolConfig: (partial) =>
        set((s) => ({ schoolConfig: { ...s.schoolConfig, ...partial } })),

      setWeekAnchor: (mondayIso) =>
        set((s) => ({
          schoolConfig: { ...s.schoolConfig, weekAnchorMonday: mondayIso },
          // The anchor Monday is, by definition, a Week A week.
          weekAParity: weekParity(new Date(`${mondayIso}T00:00`)),
        })),

      setRemindersEnabled: (on) => set({ remindersEnabled: on }),

      addNote: (text) =>
        set((s) => ({
          notes: [
            { id: crypto.randomUUID(), text: text.trim(), pinned: false, createdAt: Date.now() },
            ...s.notes,
          ],
        })),

      toggleNotePin: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
        })),

      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      addReminder: (classId, message, timing) =>
        set((s) => ({
          reminders: [
            ...s.reminders,
            { id: crypto.randomUUID(), classId, message: message.trim(), timing, createdAt: Date.now() },
          ],
        })),

      removeReminder: (id) =>
        set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),

      setPlan: (plan) => set({ plan }),

      addAssessment: (a) =>
        set((s) => ({
          assessments: [
            ...s.assessments,
            { ...a, title: a.title.trim(), id: crypto.randomUUID(), createdAt: Date.now() },
          ],
        })),

      removeAssessment: (id) =>
        set((s) => ({
          assessments: s.assessments.filter((a) => a.id !== id),
          // grades keep their data but lose the dangling link
          grades: s.grades.map((g) => (g.assessmentId === id ? { ...g, assessmentId: undefined } : g)),
        })),

      addStudySession: (session) =>
        set((s) => ({
          studySessions: [...s.studySessions, { ...session, id: crypto.randomUUID() }],
        })),

      addGrade: (g) =>
        set((s) => ({
          grades: [...s.grades, { ...g, title: g.title.trim(), id: crypto.randomUUID() }],
        })),

      removeGrade: (id) => set((s) => ({ grades: s.grades.filter((g) => g.id !== id) })),

      addSubjectNote: (n) =>
        set((s) => ({
          subjectNotes: [
            { ...n, text: n.text.trim(), id: crypto.randomUUID(), createdAt: Date.now() },
            ...s.subjectNotes,
          ],
        })),

      removeSubjectNote: (id) =>
        set((s) => ({ subjectNotes: s.subjectNotes.filter((n) => n.id !== id) })),
    }),
    { name: 'timewise-store' },
  ),
)
