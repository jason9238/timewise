import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-stone-900 text-white shadow-sm hover:bg-stone-800 hover:shadow-md focus-visible:ring-amber-400/50 disabled:bg-stone-300 disabled:shadow-none',
  secondary:
    'bg-white text-stone-700 border border-stone-200 shadow-sm hover:border-stone-300 hover:bg-stone-50 focus-visible:ring-stone-300 disabled:text-stone-400',
  ghost:
    'text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-300 disabled:text-stone-300',
  glass:
    'border border-white/15 bg-white/10 text-white/85 backdrop-blur-sm hover:border-white/25 hover:bg-white/15 hover:text-white focus-visible:ring-amber-300/50 disabled:text-white/30 disabled:border-white/5',
  danger:
    'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 focus-visible:ring-rose-400 disabled:text-rose-300',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'secondary', className = '', type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
