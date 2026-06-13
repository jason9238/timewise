import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { Check, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Task } from '../../types'
import { durationLabel } from '../../lib/time'
import { useSubjectPalette } from '../../lib/colors'
import { Badge } from '../ui/Badge'

function dueBadge(dueDate: string) {
  const days = differenceInCalendarDays(parseISO(dueDate), new Date())
  if (days < 0) return <Badge tone="red">Overdue · {format(parseISO(dueDate), 'MMM d')}</Badge>
  if (days === 0) return <Badge tone="red">Due today</Badge>
  if (days <= 2) return <Badge tone="amber">Due {format(parseISO(dueDate), 'EEE')}</Badge>
  return <Badge>Due {format(parseISO(dueDate), 'MMM d')}</Badge>
}

export function TaskItem({ task }: { task: Task }) {
  const toggleTask = useStore((s) => s.toggleTask)
  const removeTask = useStore((s) => s.removeTask)
  const classes = useStore((s) => s.classes)
  const paletteOf = useSubjectPalette()
  const linkedClass = task.classId ? classes.find((c) => c.id === task.classId) : undefined

  return (
    <div className="group flex items-start gap-2.5 rounded-xl border border-stone-200/80 bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-stone-100 transition hover:border-stone-300/80">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={`Mark "${task.title}" ${task.done ? 'not done' : 'done'}`}
        onClick={() => toggleTask(task.id)}
        className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 ${
          task.done
            ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
            : 'border-stone-300 bg-white hover:border-amber-400/60'
        }`}
      >
        {task.done && <Check size={12} aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${task.done ? 'text-stone-400 line-through' : 'text-stone-800'}`}>{task.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {task.dueDate && !task.done && dueBadge(task.dueDate)}
          {linkedClass && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${paletteOf(linkedClass.subject).chip}`}>
              {linkedClass.subject}
            </span>
          )}
          {task.estimatedMin && <Badge>{durationLabel(task.estimatedMin)}</Badge>}
        </div>
      </div>
      <button
        type="button"
        aria-label={`Delete "${task.title}"`}
        onClick={() => removeTask(task.id)}
        className="rounded-lg p-1 text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
