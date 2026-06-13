import { useCallback, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { KeyRound, RefreshCw, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import { adminCall, type AdminUser } from '../../lib/admin'
import { useAuth } from '../../hooks/useAuth'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const FIELD =
  'w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500'

interface Props {
  onClose: () => void
}

export function AdminPanel({ onClose }: Props) {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  /** User currently getting a new password typed for them. */
  const [pwFor, setPwFor] = useState<string | null>(null)
  const [pw, setPw] = useState('')

  const refresh = useCallback(async () => {
    try {
      const { users } = await adminCall<{ users: AdminUser[] }>('list_users')
      setUsers(users.sort((a, b) => a.email.localeCompare(b.email)))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load users.')
    }
  }, [])

  useEffect(() => {
    // False positive: refresh() only sets state after an await (promise
    // callbacks), never synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id)
    setError(null)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal title="Admin — accounts" onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-stone-500">
          {users ? `${users.length} account${users.length === 1 ? '' : 's'}` : 'Loading accounts…'}
        </p>
        <Button variant="ghost" onClick={() => void refresh()} aria-label="Refresh list">
          <RefreshCw size={14} aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {users?.map((u) => {
          const self = u.id === me?.id
          const busy = busyId === u.id
          return (
            <li key={u.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">
                    {u.email}
                    {self && <span className="ml-1.5 text-xs font-normal text-stone-400">(you)</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-400">
                    Joined {format(parseISO(u.createdAt), 'MMM d, yyyy')}
                    {u.lastSignInAt && ` · last seen ${format(parseISO(u.lastSignInAt), 'MMM d, HH:mm')}`}
                  </p>
                </div>
                {u.isAdmin && <Badge tone="amber">Admin</Badge>}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Button
                  disabled={busy}
                  onClick={() => {
                    setPwFor(pwFor === u.id ? null : u.id)
                    setPw('')
                  }}
                >
                  <KeyRound size={13} aria-hidden="true" />
                  Set password
                </Button>
                {!self && (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void run(u.id, () => adminCall('set_admin', { userId: u.id, makeAdmin: !u.isAdmin }))
                    }
                  >
                    {u.isAdmin ? <ShieldOff size={13} aria-hidden="true" /> : <ShieldCheck size={13} aria-hidden="true" />}
                    {u.isAdmin ? 'Remove admin' : 'Make admin'}
                  </Button>
                )}
                {!self && (
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Delete ${u.email} and all their synced data? This cannot be undone.`)) {
                        void run(u.id, () => adminCall('delete_user', { userId: u.id }))
                      }
                    }}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Delete
                  </Button>
                )}
              </div>

              {pwFor === u.id && (
                <form
                  className="mt-2 flex items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (pw.length < 6) return
                    setPwFor(null)
                    void run(u.id, () => adminCall('reset_password', { userId: u.id, password: pw }))
                  }}
                >
                  <input
                    type="text"
                    className={FIELD}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    aria-label={`New password for ${u.email}`}
                  />
                  <Button variant="primary" type="submit" disabled={pw.length < 6 || busy}>
                    Save
                  </Button>
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
