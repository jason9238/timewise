import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CalendarClock,
  Copy,
  LogOut,
  NotebookPen,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import type { View } from '../App'
import { groupsCall, type ClassGroup, type FreeCompare } from '../lib/groups'
import { fmtRange } from '../lib/time'
import { WEEKDAYS } from '../types'
import { HeaderBar } from '../components/layout/HeaderBar'
import { Widget } from '../components/dashboard/Widget'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

interface Props {
  view: View
  onChangeView: (view: View) => void
}

const FIELD =
  'w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500'

export function GroupsView({ view, onChangeView }: Props) {
  const [groups, setGroups] = useState<ClassGroup[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  const selected = useMemo(
    () => groups?.find((g) => g.id === selectedId) ?? groups?.[0] ?? null,
    [groups, selectedId],
  )

  const refresh = async () => {
    try {
      const { groups } = await groupsCall<{ groups: ClassGroup[] }>('list')
      setGroups(groups)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load groups.')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const afterMutation = (g?: ClassGroup) => {
    void refresh()
    if (g) setSelectedId(g.id)
  }

  return (
    <div className="flex h-full flex-col">
      <HeaderBar title="Groups" view={view} onChangeView={onChangeView} />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        <div className="mx-auto grid max-w-6xl items-start gap-4 lg:grid-cols-[18rem_1fr]">
          {/* Your groups */}
          <Widget
            title="Your groups"
            icon={Users}
            actions={
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => setShowJoin(true)}>
                  Join
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(true)}>
                  <Plus size={14} aria-hidden="true" />
                  New
                </Button>
              </div>
            }
          >
            {error && <p className="mb-2 text-sm text-rose-200">{error}</p>}
            {!groups ? (
              <p className="py-4 text-center text-sm text-white/55">Loading…</p>
            ) : groups.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/55">
                No groups yet. Create one for a class and share the code with friends.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {groups.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(g.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                        selected?.id === g.id ? 'bg-white text-stone-900' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <p className="truncate text-sm font-semibold">{g.name}</p>
                      <p className={`text-[11px] ${selected?.id === g.id ? 'text-stone-500' : 'text-white/55'}`}>
                        {g.members.length} member{g.members.length === 1 ? '' : 's'}
                        {g.subject ? ` · ${g.subject}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          {selected ? (
            <GroupDetail key={selected.id} group={selected} onChanged={afterMutation} />
          ) : (
            <div className="hidden lg:block" />
          )}
        </div>
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(g) => {
            setShowCreate(false)
            afterMutation(g)
          }}
        />
      )}
      {showJoin && (
        <JoinGroupModal
          onClose={() => setShowJoin(false)}
          onJoined={(g) => {
            setShowJoin(false)
            afterMutation(g)
          }}
        />
      )}
    </div>
  )
}

function GroupDetail({ group, onChanged }: { group: ClassGroup; onChanged: (g?: ClassGroup) => void }) {
  const [tab, setTab] = useState<'assignment' | 'note'>('assignment')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [text, setText] = useState('')
  const [free, setFree] = useState<FreeCompare | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const items = group.items.filter((i) => i.type === tab)

  const post = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const payload =
        tab === 'assignment'
          ? { title: title.trim(), dueDate: dueDate || undefined }
          : { text: text.trim() }
      if (tab === 'assignment' ? !title.trim() : !text.trim()) return
      const { group: g } = await groupsCall<{ group: ClassGroup }>('post', { groupId: group.id, type: tab, payload })
      setTitle('')
      setDueDate('')
      setText('')
      onChanged(g)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (itemId: string) => {
    const { group: g } = await groupsCall<{ group: ClassGroup }>('deleteItem', { itemId })
    onChanged(g)
  }

  const compareFree = async () => {
    setBusy(true)
    try {
      setFree(await groupsCall<FreeCompare>('freeCompare', { groupId: group.id }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Widget
        title={group.name}
        icon={Users}
        actions={
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Leave "${group.name}"?`)) void groupsCall('leave', { groupId: group.id }).then(() => onChanged())
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            <LogOut size={13} aria-hidden="true" />
            Leave
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/70">Invite code</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(group.invite_code)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 font-mono text-sm font-bold tracking-widest text-white"
          >
            {group.invite_code}
            <Copy size={12} aria-hidden="true" />
          </button>
          {copied && <span className="text-xs text-emerald-200">Copied</span>}
          <span className="ml-auto text-xs text-white/55">
            {group.members.map((m) => m.display_name ?? 'Member').join(', ')}
          </span>
        </div>
      </Widget>

      {/* When are we free */}
      <Widget
        title="When we're all free"
        icon={CalendarClock}
        actions={
          <Button variant="ghost" onClick={() => void compareFree()} disabled={busy}>
            Compare
          </Button>
        }
      >
        {!free ? (
          <p className="py-2 text-sm text-white/55">
            Compares everyone's free-time blocks (set yours in the AI Scheduler) to find common windows.
          </p>
        ) : free.overlap.length === 0 ? (
          <p className="py-2 text-sm text-white/55">
            No common free time yet
            {free.missing.length > 0 && ` — ${free.missing.join(', ')} haven't set free time`}.
          </p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {free.overlap.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/90">
                  <span className="w-24 shrink-0 font-medium">{WEEKDAYS[b.day]}</span>
                  <span className="tabular-nums">{fmtRange(b.startMin, b.endMin)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-white/45">
              From {free.contributors.join(', ')}
              {free.missing.length > 0 && ` · waiting on ${free.missing.join(', ')}`}
            </p>
          </>
        )}
      </Widget>

      {/* Shared assignments & notes */}
      <Widget title="Shared" icon={NotebookPen} variant="frosted">
        <div className="mb-3 flex gap-0.5 rounded-lg bg-stone-100 p-0.5">
          {(['assignment', 'note'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                tab === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {t}s
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="mb-3 rounded-lg border border-dashed border-stone-200 px-3 py-4 text-center text-sm text-stone-400">
            No shared {tab}s yet.
          </p>
        ) : (
          <ul className="mb-3 space-y-1.5">
            {items.map((it) => (
              <li key={it.id} className="group flex items-start gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
                <div className="min-w-0 flex-1">
                  {it.type === 'assignment' ? (
                    <>
                      <p className="text-sm font-medium text-stone-800">{it.payload.title}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-400">
                        {it.payload.dueDate && <Badge tone="amber">Due {format(parseISO(it.payload.dueDate), 'MMM d')}</Badge>}
                        <span>by {it.created_by_name ?? 'Member'}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm text-stone-800">{it.payload.text}</p>
                      <p className="mt-0.5 text-[11px] text-stone-400">by {it.created_by_name ?? 'Member'}</p>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Delete shared item"
                  onClick={() => void remove(it.id)}
                  className="rounded-md p-1 text-stone-300 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 focus-visible:opacity-100"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={post} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          {tab === 'assignment' ? (
            <div className="flex flex-wrap items-end gap-2">
              <input
                className={`${FIELD} flex-1`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Assignment everyone has…"
              />
              <input type="date" className={`${FIELD} w-40`} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <Button variant="primary" type="submit" disabled={busy || !title.trim()}>
                <Plus size={14} aria-hidden="true" />
                Share
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                className={`${FIELD} flex-1 resize-none`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Note for the group…"
              />
              <Button variant="primary" type="submit" disabled={busy || !text.trim()}>
                <Plus size={14} aria-hidden="true" />
              </Button>
            </div>
          )}
        </form>
      </Widget>
    </div>
  )
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (g: ClassGroup) => void }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { group } = await groupsCall<{ group: ClassGroup }>('create', {
        displayName: displayName.trim() || undefined,
        payload: { name: name.trim(), subject: subject.trim() || null },
      })
      onCreated(group)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create group.')
      setBusy(false)
    }
  }

  return (
    <Modal title="New group" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="g-name" className="mb-1 block text-xs font-medium text-stone-600">Group name</label>
          <input id="g-name" className={FIELD} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 11 Chemistry" />
        </div>
        <div>
          <label htmlFor="g-subject" className="mb-1 block text-xs font-medium text-stone-600">Subject (optional)</label>
          <input id="g-subject" className={FIELD} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Chemistry" />
        </div>
        <div>
          <label htmlFor="g-name2" className="mb-1 block text-xs font-medium text-stone-600">Your name in the group</label>
          <input id="g-name2" className={FIELD} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How classmates see you" />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy || !name.trim()}>Create</Button>
        </div>
      </form>
    </Modal>
  )
}

function JoinGroupModal({ onClose, onJoined }: { onClose: () => void; onJoined: (g: ClassGroup) => void }) {
  const [code, setCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { group } = await groupsCall<{ group: ClassGroup }>('join', {
        inviteCode: code.trim().toUpperCase(),
        displayName: displayName.trim() || undefined,
      })
      onJoined(group)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Join a group" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="j-code" className="mb-1 block text-xs font-medium text-stone-600">Invite code</label>
          <input
            id="j-code"
            className={`${FIELD} font-mono uppercase tracking-widest`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
          />
        </div>
        <div>
          <label htmlFor="j-name" className="mb-1 block text-xs font-medium text-stone-600">Your name in the group</label>
          <input id="j-name" className={FIELD} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How classmates see you" />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy || !code.trim()}>Join</Button>
        </div>
      </form>
    </Modal>
  )
}
