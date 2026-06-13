import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from './supabase'
import { useAuth } from '../hooks/useAuth'
import { DEFAULT_PERIODS } from '../types'
import type {
  Assessment,
  ClassSlot,
  FreeBlock,
  Grade,
  Note,
  ScheduleResult,
  SchoolConfig,
  StudySession,
  SubjectNote,
  Task,
  WeeklyReminder,
} from '../types'

/** The slice of the store that follows the user across devices. */
interface SyncedState {
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
  onboarded: boolean
  weekAParity: 0 | 1
}

function pickSynced(): SyncedState {
  const s = useStore.getState()
  return {
    classes: s.classes,
    tasks: s.tasks,
    freeBlocks: s.freeBlocks,
    plan: s.plan,
    notes: s.notes,
    reminders: s.reminders,
    assessments: s.assessments,
    studySessions: s.studySessions,
    grades: s.grades,
    subjectNotes: s.subjectNotes,
    schoolConfig: s.schoolConfig,
    onboarded: s.onboarded,
    weekAParity: s.weekAParity,
  }
}

let applyingRemote = false

function applyRemote(data: Partial<SyncedState>) {
  applyingRemote = true
  useStore.setState({
    classes: Array.isArray(data.classes) ? data.classes : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    freeBlocks: Array.isArray(data.freeBlocks) ? data.freeBlocks : [],
    plan: data.plan ?? null,
    notes: Array.isArray(data.notes) ? data.notes : [],
    reminders: Array.isArray(data.reminders) ? data.reminders : [],
    assessments: Array.isArray(data.assessments) ? data.assessments : [],
    studySessions: Array.isArray(data.studySessions) ? data.studySessions : [],
    grades: Array.isArray(data.grades) ? data.grades : [],
    subjectNotes: Array.isArray(data.subjectNotes) ? data.subjectNotes : [],
    schoolConfig:
      data.schoolConfig && Array.isArray(data.schoolConfig.periods)
        ? data.schoolConfig
        : { periods: DEFAULT_PERIODS },
    onboarded: data.onboarded === true,
    weekAParity: data.weekAParity === 1 ? 1 : 0,
  })
  applyingRemote = false
}

async function push(userId: string) {
  if (!supabase) return
  const { error } = await supabase.from('user_state').upsert({
    user_id: userId,
    data: pickSynced(),
    updated_at: new Date().toISOString(),
  })
  if (error) console.warn('TimeWise sync failed:', error.message)
}

/**
 * Cross-device sync: on sign-in pull the account's state (remote wins; a brand
 * new account uploads the local state instead), then mirror every local change
 * up with a 2s debounce. Signed out, the app is purely local as before.
 */
export function useSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (!supabase || !user) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastPushed = JSON.stringify(pickSynced())

    const initial = async () => {
      const { data, error } = await supabase!
        .from('user_state')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        console.warn('TimeWise sync pull failed:', error.message)
        return
      }
      if (data?.data) {
        applyRemote(data.data as Partial<SyncedState>)
        lastPushed = JSON.stringify(pickSynced())
      } else {
        await push(user.id)
      }
    }
    void initial()

    const unsubscribe = useStore.subscribe(() => {
      if (applyingRemote || cancelled) return
      const snapshot = JSON.stringify(pickSynced())
      if (snapshot === lastPushed) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        lastPushed = snapshot
        void push(user.id)
      }, 2000)
    })

    return () => {
      cancelled = true
      clearTimeout(timer)
      unsubscribe()
    }
  }, [user])
}
