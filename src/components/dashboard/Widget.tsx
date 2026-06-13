import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  icon: LucideIcon
  variant?: 'glass' | 'frosted'
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function Widget({ title, icon: Icon, variant = 'glass', actions, className = '', children }: Props) {
  const glass = variant === 'glass'
  return (
    <section
      className={`grain relative flex flex-col overflow-hidden rounded-2xl p-5 ${
        glass ? 'glass-surface text-white' : 'frosted-surface text-stone-900'
      } ${className}`}
    >
      <header className="relative mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold tracking-wide">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              glass ? 'bg-white/10 text-amber-200/90' : 'bg-stone-100 text-stone-500'
            }`}
          >
            <Icon size={14} aria-hidden="true" />
          </span>
          {title}
        </h2>
        {actions}
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
    </section>
  )
}
