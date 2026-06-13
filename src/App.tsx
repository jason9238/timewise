import { useRef, useState } from 'react'
import { Backdrop, Hero } from './components/layout/Hero'
import { MobileTabBar } from './components/layout/HeaderBar'
import { SignInGate } from './components/auth/SignInGate'
import { DashboardView } from './views/DashboardView'
import { TimetableView } from './views/TimetableView'
import { SchedulerView } from './views/SchedulerView'
import { ProgressView } from './views/ProgressView'
import { useAuth } from './hooks/useAuth'
import { useReminders } from './hooks/useReminders'
import { useSync } from './lib/sync'
import { supabase } from './lib/supabase'

export type View = 'dashboard' | 'timetable' | 'scheduler' | 'progress'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const appRef = useRef<HTMLDivElement>(null)
  const { user, loading } = useAuth()
  useReminders()
  useSync()

  // Accounts are mandatory when the backend is configured. Without a backend
  // (no .env) the app still runs purely locally for development.
  if (supabase && loading) {
    return (
      <div className="h-dvh text-white">
        <Backdrop />
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <span className="h-8 w-8 animate-pulse rounded-full bg-white/10 ring-1 ring-white/20" aria-hidden="true" />
          <p className="text-sm font-medium tracking-wide text-white/50">Loading…</p>
        </div>
      </div>
    )
  }
  if (supabase && !user) {
    return (
      <div className="h-dvh">
        <Backdrop />
        <SignInGate />
      </div>
    )
  }

  return (
    <div className="h-dvh snap-y snap-mandatory overflow-y-auto">
      <Backdrop />
      <Hero onScrollDown={() => appRef.current?.scrollIntoView({ behavior: 'smooth' })} />

      <div ref={appRef} className="flex h-dvh snap-start flex-col">
        <div className="min-h-0 flex-1">
          {view === 'dashboard' ? (
            <DashboardView view={view} onChangeView={setView} />
          ) : view === 'timetable' ? (
            <TimetableView view={view} onChangeView={setView} />
          ) : view === 'scheduler' ? (
            <SchedulerView view={view} onChangeView={setView} />
          ) : (
            <ProgressView view={view} onChangeView={setView} />
          )}
        </div>
        <MobileTabBar view={view} onChangeView={setView} />
      </div>
    </div>
  )
}
