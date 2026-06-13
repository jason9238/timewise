import { useEffect, useState, type FormEvent } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import {
  BellPlus,
  BellRing,
  CalendarCheck,
  Clock,
  ExternalLink,
  Hash,
  MapPin,
  NotebookPen,
  Plus,
  Repeat,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { REMINDER_TIMINGS, WEEKDAYS, type ReminderTiming } from '../../types'
import { fmtRange } from '../../lib/time'
import { useSubjectPalette } from '../../lib/colors'
import { AssessmentForm } from '../assessments/AssessmentForm'
import { TaskForm } from '../tasks/TaskForm'
import { TaskList } from '../tasks/TaskList'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface Props {
  classId: string
  onClose: () => void
}

export function ClassDetailPanel({ classId, onClose }: Props) {
  const classes = useStore((s) => s.classes)
  const tasks = useStore((s) => s.tasks)
  const reminders = useStore((s) => s.reminders)
  const assessments = useStore((s) => s.assessments)
  const subjectNotes = useStore((s) => s.subjectNotes)
  const addReminder = useStore((s) => s.addReminder)
  const removeReminder = useStore((s) => s.removeReminder)
  const removeAssessment = useStore((s) => s.removeAssessment)
  const addSubjectNote = useStore((s) => s.addSubjectNote)
  const removeSubjectNote = useStore((s) => s.removeSubjectNote)
  const removeClass = useStore((s) => s.removeClass)
  const paletteOf = useSubjectPalette()
  const [reminderText, setReminderText] = useState('')
  const [reminderTiming, setReminderTiming] = useState<ReminderTiming>('morning')
  const [showAddAssessment, setShowAddAssessment] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteUrl, setNoteUrl] = useState('')

  const cls = classes.find((c) => c.id === classId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!cls) return null
  const palette = paletteOf(cls.subject)
  const linkedTasks = tasks.filter((t) => t.classId === classId)
  const classReminders = reminders.filter((r) => r.classId === classId)
  const todayIso = format(new Date(), 'yyyy-MM-dd')
  const subjectAssessments = assessments
    .filter((a) => a.subject === cls.subject && a.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
  const notesForSubject = subjectNotes.filter((n) => n.subject === cls.subject)

  const submitNote = (e: FormEvent) => {
    e.preventDefault()
    if (!noteText.trim() && !noteUrl.trim()) return
    const url = noteUrl.trim()
    addSubjectNote({
      subject: cls.subject,
      text: noteText.trim() || url,
      url: url ? (/^https?:\/\//i.test(url) ? url : `https://${url}`) : undefined,
    })
    setNoteText('')
    setNoteUrl('')
  }

  const submitReminder = async (e: FormEvent) => {
    e.preventDefault()
    if (!reminderText.trim()) return
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        window.alert('Notifications are blocked — allow them in your browser settings so reminders can fire.')
      }
    }
    addReminder(classId, reminderText, reminderTiming)
    setReminderText('')
  }

  const meta: Array<{ icon: typeof User; label: string; value: string | undefined }> = [
    { icon: User, label: 'Teacher', value: cls.teacher },
    { icon: MapPin, label: 'Room', value: cls.room },
    { icon: Hash, label: 'Subject code', value: cls.subjectCode },
    { icon: Clock, label: 'Time', value: `${WEEKDAYS[cls.day]}, ${fmtRange(cls.startMin, cls.endMin)}` },
    { icon: Repeat, label: 'Repeats', value: cls.week ? `Week ${cls.week} only` : undefined },
  ]

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={`${cls.subject} details`}>
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 cursor-default bg-stone-900/30"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <header className={`border-b px-5 py-4 ${palette.bg} ${palette.border}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={`text-lg font-semibold ${palette.text}`}>{cls.subject}</h2>
              {cls.subjectCode && <p className={`text-xs ${palette.subtext}`}>{cls.subjectCode}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`rounded-md p-1 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${palette.text}`}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl className="space-y-2.5">
            {meta
              .filter((m) => m.value)
              .map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2.5 text-sm">
                  <dt className="flex items-center gap-2 text-stone-400">
                    <Icon size={15} aria-hidden="true" />
                    <span className="sr-only">{label}</span>
                  </dt>
                  <dd className="text-stone-700">{value}</dd>
                </div>
              ))}
          </dl>

          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Upcoming assessments
              </h3>
              <Button variant="ghost" onClick={() => setShowAddAssessment(true)}>
                <Plus size={13} aria-hidden="true" />
                Add
              </Button>
            </div>
            {subjectAssessments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-200 px-3 py-3 text-center text-sm text-stone-400">
                Nothing coming up for {cls.subject}.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {subjectAssessments.map((a) => {
                  const days = differenceInCalendarDays(parseISO(a.date), new Date())
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-2.5 rounded-lg border border-stone-200 bg-white px-3 py-2"
                    >
                      <CalendarCheck size={14} className="shrink-0 text-stone-400" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-stone-800">{a.title}</p>
                        <p className="mt-0.5 text-[11px] text-stone-400">
                          {format(parseISO(a.date), 'EEE, MMM d')}
                          {a.weightPct !== undefined && ` · worth ${a.weightPct}%`}
                        </p>
                      </div>
                      {days <= 7 && (
                        <Badge tone={days <= 1 ? 'red' : 'amber'}>
                          {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                        </Badge>
                      )}
                      <button
                        type="button"
                        aria-label={`Delete "${a.title}"`}
                        onClick={() => removeAssessment(a.id)}
                        className="rounded-md p-1 text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Weekly reminders
            </h3>
            {classReminders.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {classReminders.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start gap-2.5 rounded-lg border border-stone-200 bg-white px-3 py-2"
                  >
                    <BellRing size={14} className="mt-0.5 shrink-0 text-stone-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-stone-800">{r.message}</p>
                      <p className="mt-0.5 text-[11px] text-stone-400">
                        Every {WEEKDAYS[cls.day]}
                        {cls.week ? ` (Week ${cls.week})` : ''} ·{' '}
                        {REMINDER_TIMINGS.find((t) => t.value === r.timing)?.label.toLowerCase()}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete reminder "${r.message}"`}
                      onClick={() => removeReminder(r.id)}
                      className="rounded-md p-1 text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={(e) => void submitReminder(e)}
              className="rounded-lg border border-stone-200 bg-stone-50 p-3"
            >
              <label htmlFor="rem-text" className="mb-1 block text-xs font-medium text-stone-600">
                Remind me every {WEEKDAYS[cls.day]}
                {cls.week ? ` (Week ${cls.week})` : ''}
              </label>
              <input
                id="rem-text"
                className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                placeholder="e.g. Bring sports uniform"
              />
              <div className="mt-2 flex items-center gap-2">
                <select
                  aria-label="When to remind"
                  className="flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  value={reminderTiming}
                  onChange={(e) => setReminderTiming(e.target.value as ReminderTiming)}
                >
                  {REMINDER_TIMINGS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Button variant="primary" type="submit" disabled={!reminderText.trim()}>
                  <BellPlus size={14} aria-hidden="true" />
                  Add
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-stone-400">
                Fires while TimeWise is open (tab or installed app).
              </p>
            </form>
          </section>

          <section className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              To-dos & assignments
            </h3>
            <TaskList tasks={linkedTasks} emptyMessage="Nothing due for this class yet." />
            <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
              <TaskForm classId={classId} />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Notes & links
            </h3>
            {notesForSubject.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {notesForSubject.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start gap-2.5 rounded-lg border border-stone-200 bg-white px-3 py-2"
                  >
                    <NotebookPen size={14} className="mt-0.5 shrink-0 text-stone-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-sm text-stone-800">{n.text}</p>
                      {n.url && (
                        <a
                          href={n.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
                        >
                          <ExternalLink size={11} aria-hidden="true" />
                          {n.url.replace(/^https?:\/\//i, '')}
                        </a>
                      )}
                      <p className="mt-0.5 text-[11px] text-stone-400">{format(n.createdAt, 'MMM d')}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete note "${n.text}"`}
                      onClick={() => removeSubjectNote(n.id)}
                      className="rounded-md p-1 text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={submitNote} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <label htmlFor="subj-note" className="mb-1 block text-xs font-medium text-stone-600">
                Note for every {cls.subject} lesson
              </label>
              <textarea
                id="subj-note"
                rows={2}
                className="w-full resize-none rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Textbook chapter 7, teacher's revision tips…"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  aria-label="Optional link"
                  type="text"
                  className="flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  value={noteUrl}
                  onChange={(e) => setNoteUrl(e.target.value)}
                  placeholder="Link (optional)"
                />
                <Button variant="primary" type="submit" disabled={!noteText.trim() && !noteUrl.trim()}>
                  <Plus size={14} aria-hidden="true" />
                  Add
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-stone-400">
                Shows on every {cls.subject} lesson, not just this one.
              </p>
            </form>
          </section>
        </div>

        <footer className="border-t border-stone-100 px-5 py-3">
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm(`Remove ${cls.subject} from your timetable? Its tasks become general to-dos.`)) {
                removeClass(classId)
                onClose()
              }
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Remove class
          </Button>
        </footer>
      </aside>

      {showAddAssessment && (
        <Modal title={`Add assessment — ${cls.subject}`} onClose={() => setShowAddAssessment(false)}>
          <AssessmentForm subject={cls.subject} onDone={() => setShowAddAssessment(false)} />
        </Modal>
      )}
    </div>
  )
}
