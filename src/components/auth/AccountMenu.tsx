import { useState } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useIsAdmin } from '../../lib/admin'
import { AdminPanel } from '../admin/AdminPanel'

export function AccountMenu() {
  const { user } = useAuth()
  const isAdmin = useIsAdmin(user)
  const [open, setOpen] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  if (!supabase || !user) return null

  const initial = (user.email ?? '?').charAt(0).toUpperCase()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-xs font-bold text-stone-800 shadow-sm ring-2 ring-white/20 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
      >
        {initial}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="frosted-surface absolute right-0 top-10 z-50 w-60 rounded-2xl p-2 text-left">
            <p className="truncate px-3 py-2 text-xs text-stone-500">{user.email}</p>
            <p className="px-3 pb-2 text-[11px] font-medium text-emerald-700">Syncing across devices</p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setShowAdmin(true)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
              >
                <ShieldCheck size={14} aria-hidden="true" />
                Admin panel
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void supabase?.auth.signOut()
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
            >
              <LogOut size={14} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </>
      )}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  )
}
