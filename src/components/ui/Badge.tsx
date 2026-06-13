import type { ReactNode } from 'react'

type Tone = 'neutral' | 'red' | 'amber' | 'green'

const TONES: Record<Tone, string> = {
  neutral: 'bg-stone-100 text-stone-600 ring-1 ring-stone-200/60',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80',
  amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80',
}

export function Badge({ tone = 'neutral', className = '', children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
