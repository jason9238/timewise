import type { ReactNode } from 'react'
import { CalendarDays, Clock, LayoutDashboard, Sparkles, TrendingUp } from 'lucide-react'
import type { View } from '../../App'
import { AccountMenu } from '../auth/AccountMenu'

const NAV: Array<{ view: View; label: string; icon: typeof CalendarDays }> = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'timetable', label: 'Timetable', icon: CalendarDays },
  { view: 'scheduler', label: 'AI Scheduler', icon: Sparkles },
  { view: 'progress', label: 'Progress', icon: TrendingUp },
]

interface NavProps {
  view: View
  onChangeView: (view: View) => void
}

interface HeaderBarProps extends NavProps {
  title: string
  actions?: ReactNode
}

export function HeaderBar({ title, view, onChangeView, actions }: HeaderBarProps) {
  return (
    <header className="glass-surface relative z-40 flex h-14 shrink-0 items-center gap-3 border-b-0 px-3 pr-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/90 to-amber-600/90 text-stone-950 shadow-sm">
        <Clock size={15} strokeWidth={2.25} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h1 className="truncate font-display text-base font-medium tracking-tight text-white">{title}</h1>
      </div>
      <nav aria-label="Main" className="hidden items-center gap-0.5 rounded-xl bg-black/20 p-1 md:flex">
        {NAV.map(({ view: v, label, icon: Icon }) => (
          <button
            key={v}
            type="button"
            onClick={() => onChangeView(v)}
            aria-current={view === v ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 ${
              view === v
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={13} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1.5">
        {actions}
        <AccountMenu />
      </div>
    </header>
  )
}

export function MobileTabBar({ view, onChangeView }: NavProps) {
  return (
    <nav
      aria-label="Main"
      className="glass-surface flex shrink-0 border-t-0 md:hidden"
    >
      {NAV.map(({ view: v, label, icon: Icon }) => {
        const active = view === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChangeView(v)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/50 ${
              active ? 'text-amber-200' : 'text-white/40'
            }`}
          >
            {active && (
              <span
                className="absolute top-0 h-0.5 w-10 rounded-full bg-amber-400"
                aria-hidden="true"
              />
            )}
            <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
