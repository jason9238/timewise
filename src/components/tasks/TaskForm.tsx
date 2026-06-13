import { useMemo, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { upcomingLessons } from '../../lib/nextLesson'
import { Button } from '../ui/Button'

const FIELD =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20'

interface Props {
  /** When set, the new task is linked to that class. Omit for general to-dos. */
  classId?: string
  onAdded?: () => void
}

export function TaskForm({ classId, onAdded }: Props) {
  const addTask = useStore((s) => s.addTask)
  const classes = useStore((s) => s.classes)
  const weekAParity = useStore((s) => s.weekAParity)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [estimate, setEstimate] = useState('')

  // Quick "due next lesson" options resolved from the timetable (Week A/B aware)
  const quickOptions = useMemo(() => {
    const subject = classId ? classes.find((c) => c.id === classId)?.subject : undefined
    if (subject) {
      const lessons = upcomingLessons(subject, classes, weekAParity)
      return lessons.map((l, i) => ({
        date: l.date,
        label: i === 0 ? `Next ${subject} lesson (${l.label})` : `${subject} lesson after that (${l.label})`,
      }))
    }
    // General to-do: offer the next lesson of every subject
    const subjects = [...new Set(classes.map((c) => c.subject))].sort()
    return subjects.flatMap((s) => {
      const [next] = upcomingLessons(s, classes, weekAParity, new Date(), 1)
      return next ? [{ date: next.date, label: `Next ${s} lesson (${next.label})` }] : []
    })
  }, [classId, classes, weekAParity])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    addTask({
      title: title.trim(),
      classId,
      dueDate: dueDate || undefined,
      estimatedMin: estimate ? Math.max(5, Number(estimate)) : undefined,
    })
    setTitle('')
    setDueDate('')
    setEstimate('')
    onAdded?.()
  }

  const idPrefix = classId ? `task-${classId.slice(0, 6)}` : 'task-general'

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div>
        <label htmlFor={`${idPrefix}-title`} className="mb-1 block text-xs font-medium text-stone-600">
          {classId ? 'Add to-do / assignment due' : 'What needs doing?'}
        </label>
        <input
          id={`${idPrefix}-title`}
          className={FIELD}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={classId ? 'e.g. Essay draft due' : 'e.g. Update resume'}
        />
      </div>
      {quickOptions.length > 0 && (
        <div>
          <label htmlFor={`${idPrefix}-quick`} className="mb-1 block text-xs font-medium text-stone-600">
            Due at a lesson
          </label>
          <select
            id={`${idPrefix}-quick`}
            className={FIELD}
            value={quickOptions.some((o) => o.date === dueDate) ? dueDate : ''}
            onChange={(e) => setDueDate(e.target.value)}
          >
            <option value="">Pick a date below instead…</option>
            {quickOptions.map((o) => (
              <option key={`${o.date}-${o.label}`} value={o.date}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-end gap-2.5">
        <div className="flex-1">
          <label htmlFor={`${idPrefix}-due`} className="mb-1 block text-xs font-medium text-stone-600">
            Due date
          </label>
          <input id={`${idPrefix}-due`} type="date" className={FIELD} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="w-24">
          <label htmlFor={`${idPrefix}-est`} className="mb-1 block text-xs font-medium text-stone-600">
            Est. (min)
          </label>
          <input
            id={`${idPrefix}-est`}
            type="number"
            min={5}
            step={5}
            className={FIELD}
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder="auto"
          />
        </div>
        <Button variant="primary" type="submit" disabled={!title.trim()} aria-label="Add task">
          <Plus size={14} aria-hidden="true" />
          Add
        </Button>
      </div>
    </form>
  )
}
