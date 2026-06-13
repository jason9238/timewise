import { useMemo, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import {
  BookOpen,
  CalendarPlus,
  ListTodo,
  MapPin,
  Pin,
  PinOff,
  Plus,
  StickyNote,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import type { View } from '../App'
import { useStore } from '../store/useStore'
import { useNow } from '../hooks/useNow'
import { weekLabelFor, otherWeek } from '../lib/weeks'
import { nextClass } from '../lib/upNext'
import { fmtRange } from '../lib/time'
import { useSubjectPalette } from '../lib/colors'
import { WEEKDAYS, WEEKDAYS_SHORT, type ClassSlot, type Weekday } from '../types'
import { HeaderBar } from '../components/layout/HeaderBar'
import { Widget } from '../components/dashboard/Widget'
import { AssessmentsWidget } from '../components/assessments/AssessmentsWidget'
import { ClassDetailPanel } from '../components/timetable/ClassDetailPanel'
import { DayListCard } from '../components/timetable/ClassCard'
import { IcsDropzone } from '../components/timetable/IcsDropzone'
import { ManualClassForm } from '../components/timetable/ManualClassForm'
import { TaskForm } from '../components/tasks/TaskForm'
import { TaskList } from '../components/tasks/TaskList'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

interface Props {
  view: View
  onChangeView: (view: View) => void
}

const todayIdx = () => ((new Date().getDay() + 6) % 7) as Weekday

function greetingFor(d: Date) {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardView({ view, onChangeView }: Props) {
  const classes = useStore((s) => s.classes)
  const weekAParity = useStore((s) => s.weekAParity)
  const setThisWeekIs = useStore((s) => s.setThisWeekIs)
  const [selectedDay, setSelectedDay] = useState<Weekday>(todayIdx())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const now = useNow(30_000)

  const weekLabel = weekLabelFor(new Date(), weekAParity)
  const hasWeeks = classes.some((c) => c.week)
  const visibleClasses = useMemo(
    () => classes.filter((c) => !c.week || c.week === weekLabel),
    [classes, weekLabel],
  )

  const showWeekend = visibleClasses.some((c) => c.day >= 5)
  const days = Array.from({ length: showWeekend ? 7 : 5 }, (_, d) => d as Weekday)

  return (
    <div className="flex h-full flex-col">
      <HeaderBar title="Dashboard" view={view} onChangeView={onChangeView} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          {/* Greeting + primary actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-3xl font-light tracking-tight text-white sm:text-4xl">
                {greetingFor(now)}
              </h2>
              <p className="mt-1 text-sm text-white/55">{format(now, 'EEEE, d MMMM')}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasWeeks && (
                <button
                  type="button"
                  onClick={() => setThisWeekIs(otherWeek(weekLabel))}
                  title={`This week is Week ${weekLabel} — tap to switch`}
                  className="pill-glass rounded-full px-3.5 py-2 text-sm font-semibold text-amber-200/90 transition hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
                >
                  Week {weekLabel}
                </button>
              )}
              <Button variant="glass" onClick={() => setShowImport(true)}>
                <Upload size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button variant="glass" onClick={() => setShowAdd(true)}>
                <CalendarPlus size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Add class</span>
              </Button>
            </div>
          </div>

          {/* Focus: the single most important thing right now */}
          <NextClassFocus
            classes={classes}
            weekAParity={weekAParity}
            onImport={() => setShowImport(true)}
          />

          {/* Slim week strip */}
          <WeekStrip
            days={days}
            classes={visibleClasses}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />

          {/* Content columns: schedule (primary) + tasks/notes (secondary) */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DayScheduleWidget
                day={selectedDay}
                classes={visibleClasses}
                onSelect={setSelectedId}
                onImport={() => setShowImport(true)}
              />
            </div>
            <div className="flex flex-col gap-5">
              <AssessmentsWidget />
              <HomeworkWidget />
              <NotesWidget />
            </div>
          </div>
        </div>
      </div>

      {selectedId && <ClassDetailPanel classId={selectedId} onClose={() => setSelectedId(null)} />}
      {showImport && (
        <Modal title="Import timetable (.ics)" onClose={() => setShowImport(false)}>
          <p className="mb-3 text-sm text-stone-500">
            Importing replaces your current classes. Export the .ics file from your school or university calendar system.
          </p>
          <IcsDropzone onImported={() => setShowImport(false)} />
        </Modal>
      )}
      {showAdd && (
        <Modal title="Add a class" onClose={() => setShowAdd(false)}>
          <ManualClassForm onDone={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}

/* ── Focus banner: next class ───────────────────────────────────────── */

function NextClassFocus({
  classes,
  weekAParity,
  onImport,
}: {
  classes: ClassSlot[]
  weekAParity: 0 | 1
  onImport: () => void
}) {
  const now = useNow(1000)
  const paletteOf = useSubjectPalette()
  const upcoming = nextClass(classes, now, weekAParity)

  if (!upcoming) {
    return (
      <section className="glass-surface grain relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl px-6 py-10 text-center text-white">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-amber-200/90">
          <BookOpen size={20} aria-hidden="true" />
        </span>
        <p className="text-sm text-white/60">No upcoming classes yet.</p>
        <Button variant="glass" onClick={onImport}>
          <Upload size={14} aria-hidden="true" />
          Import your timetable
        </Button>
      </section>
    )
  }

  const { slot, minutesUntil, dayLabel } = upcoming
  const palette = paletteOf(slot.subject)
  const secondsLeft = minutesUntil * 60 - now.getSeconds()
  const countdown =
    minutesUntil < 60
      ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
      : minutesUntil < 24 * 60
        ? `${Math.floor(minutesUntil / 60)} h ${minutesUntil % 60} min`
        : dayLabel
  const countdownLabel =
    minutesUntil < 60 ? 'until it starts' : minutesUntil < 24 * 60 ? 'to go' : 'next session'

  return (
    <section className="glass-surface grain relative overflow-hidden rounded-2xl p-6 text-white sm:p-7">
      <span
        className={`absolute inset-x-0 top-0 h-1 ${palette.bg}`}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-amber-200/80 uppercase">
            Up next
          </p>
          <h3 className="font-display mt-2 truncate text-2xl font-medium tracking-tight sm:text-3xl">
            {slot.subject}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/65">
            <span className="font-medium text-white/85">{fmtRange(slot.startMin, slot.endMin)}</span>
            {slot.room && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} aria-hidden="true" />
                {slot.room}
              </span>
            )}
            {slot.teacher && (
              <span className="inline-flex items-center gap-1.5">
                <UserRound size={13} aria-hidden="true" />
                {slot.teacher}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 border-white/10 sm:border-l sm:pl-7 sm:text-right">
          <p className="font-display text-5xl font-light tabular-nums tracking-tight sm:text-6xl">
            {countdown}
          </p>
          <p className="mt-1 text-xs tracking-wide text-white/45">{countdownLabel}</p>
        </div>
      </div>
    </section>
  )
}

/* ── Slim week strip ────────────────────────────────────────────────── */

function WeekStrip({
  days,
  classes,
  selectedDay,
  onSelectDay,
}: {
  days: Weekday[]
  classes: ClassSlot[]
  selectedDay: Weekday
  onSelectDay: (d: Weekday) => void
}) {
  const today = todayIdx()
  return (
    <div className="glass-surface grain relative overflow-hidden rounded-2xl p-2">
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((d) => {
          const count = classes.filter((c) => c.day === d).length
          const selected = selectedDay === d
          const isToday = d === today
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDay(d)}
              aria-pressed={selected}
              className={`group flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 ${
                selected ? 'bg-white text-stone-900 shadow-sm' : 'text-white hover:bg-white/10'
              }`}
            >
              <span
                className={`text-[11px] font-bold tracking-wide ${
                  isToday && !selected ? 'text-amber-200' : selected ? 'text-stone-500' : 'text-white/55'
                }`}
              >
                {WEEKDAYS_SHORT[d]}
              </span>
              <span className="text-lg font-bold tabular-nums leading-none">{count}</span>
              <span
                className={`text-[9px] tracking-wide ${
                  selected ? 'text-stone-400' : 'text-white/40'
                }`}
              >
                {count === 1 ? 'class' : 'classes'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Day schedule (primary content) ─────────────────────────────────── */

function DayScheduleWidget({
  day,
  classes,
  onSelect,
  onImport,
}: {
  day: Weekday
  classes: ClassSlot[]
  onSelect: (id: string) => void
  onImport: () => void
}) {
  const today = todayIdx()
  const list = classes.filter((c) => c.day === day).sort((a, b) => a.startMin - b.startMin)
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()

  return (
    <Widget title={day === today ? "Today's schedule" : `${WEEKDAYS[day]}'s schedule`} icon={BookOpen} variant="frosted">
      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-12 text-center">
          <p className="text-sm text-stone-500">No classes on {WEEKDAYS[day]}.</p>
          {classes.length === 0 && (
            <Button onClick={onImport}>
              <Upload size={14} aria-hidden="true" />
              Import timetable
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((slot) => {
            const isPast = day === today && slot.endMin <= nowMin
            return (
              <li key={slot.id} className={isPast ? 'opacity-45' : ''}>
                <DayListCard slot={slot} onClick={() => onSelect(slot.id)} />
              </li>
            )
          })}
        </ul>
      )}
    </Widget>
  )
}

/* ── Homework / tasks by subject ────────────────────────────────────── */

function HomeworkWidget() {
  const tasks = useStore((s) => s.tasks)
  const classes = useStore((s) => s.classes)
  const paletteOf = useSubjectPalette()
  const [showForm, setShowForm] = useState(false)

  const groups = useMemo(() => {
    const subjectOf = new Map(classes.map((c) => [c.id, c.subject]))
    const bySubject = new Map<string, typeof tasks>()
    for (const t of tasks) {
      const subject = (t.classId && subjectOf.get(t.classId)) || 'General'
      const list = bySubject.get(subject) ?? []
      list.push(t)
      bySubject.set(subject, list)
    }
    return [...bySubject.entries()].sort(([a], [b]) =>
      a === 'General' ? 1 : b === 'General' ? -1 : a.localeCompare(b),
    )
  }, [tasks, classes])

  return (
    <Widget
      title="Homework & tasks"
      icon={ListTodo}
      variant="frosted"
      actions={
        <Button variant="ghost" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} aria-hidden="true" />
          {showForm ? 'Close' : 'Add'}
        </Button>
      }
    >
      {showForm && (
        <div className="mb-3 rounded-xl border border-stone-200/80 bg-stone-50/80 p-3 ring-1 ring-stone-100">
          <TaskForm onAdded={() => setShowForm(false)} />
        </div>
      )}
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-3 py-6 text-center text-sm text-stone-400">
          Nothing yet — add homework or attach it to a class on the timetable.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([subject, list]) => (
            <div key={subject}>
              <span
                className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  subject === 'General' ? 'bg-stone-100 text-stone-600 ring-1 ring-stone-200/60' : paletteOf(subject).chip
                }`}
              >
                {subject}
              </span>
              <TaskList tasks={list} />
            </div>
          ))}
        </div>
      )}
    </Widget>
  )
}

/* ── Sticky notes ───────────────────────────────────────────────────── */

function NotesWidget() {
  const notes = useStore((s) => s.notes)
  const addNote = useStore((s) => s.addNote)
  const toggleNotePin = useStore((s) => s.toggleNotePin)
  const removeNote = useStore((s) => s.removeNote)
  const [draft, setDraft] = useState('')

  const sorted = [...notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt,
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    addNote(draft)
    setDraft('')
  }

  return (
    <Widget title="Notes & reminders" icon={StickyNote} variant="frosted">
      <form onSubmit={submit} className="mb-3 flex items-start gap-2">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Pin a reminder… e.g. Bring sports uniform Thursday"
          aria-label="New note"
          className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
        />
        <Button variant="primary" type="submit" disabled={!draft.trim()} aria-label="Add note">
          <Plus size={14} aria-hidden="true" />
        </Button>
      </form>
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-3 py-6 text-center text-sm text-stone-400">
          No notes yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((note) => (
            <li
              key={note.id}
              className="group relative rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-amber-100/80 px-3.5 py-2.5 shadow-sm ring-1 ring-amber-100"
            >
              <p className="whitespace-pre-wrap pr-12 text-sm text-amber-950">{note.text}</p>
              <p className="mt-1 text-[10px] text-amber-700/70">
                {note.pinned && 'Pinned · '}
                {format(note.createdAt, 'MMM d')}
              </p>
              <span className="absolute right-1.5 top-1.5 flex gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleNotePin(note.id)}
                  aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                  className={`rounded-md p-1 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    note.pinned ? 'text-amber-700' : 'text-amber-400'
                  }`}
                >
                  {note.pinned ? <Pin size={13} aria-hidden="true" /> : <PinOff size={13} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => removeNote(note.id)}
                  aria-label="Delete note"
                  className="rounded-md p-1 text-amber-400 transition-colors hover:bg-amber-200 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  )
}
