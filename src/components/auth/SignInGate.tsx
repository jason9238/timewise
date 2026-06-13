import { Clock } from 'lucide-react'
import { AuthForm } from './AuthForm'

export function SignInGate() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center p-4">
      <div className="frosted-surface w-full max-w-sm rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 shadow-md">
            <Clock size={22} strokeWidth={2.25} aria-hidden="true" />
          </span>
          <p className="font-display text-xs font-medium tracking-[0.3em] text-amber-700/80 uppercase">
            TimeWise
          </p>
          <h1 className="font-display mt-2 text-2xl font-medium text-stone-900">Welcome back</h1>
          <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-stone-500">
            Sign in to keep your timetable, tasks, and study plans in sync across every device.
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  )
}
