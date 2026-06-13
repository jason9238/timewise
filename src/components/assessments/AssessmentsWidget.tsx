import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { CalendarCheck, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Assessment } from '../../types'
import { useSubjectPalette } from '../../lib/colors'
import { Widget } from '../dashboard/Widget'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { AssessmentForm } from './AssessmentForm'
import { GradeForm } from '../progress/GradeForm'

function countdownBadge(date: string) {
  const days = differenceInCalendarDays(parseISO(date), new Date())
  if (days < 0) return <Badge>Done · {format(parseISO(date), 'MMM d')}</Badge>
  if (days === 0) return <Badge tone="red">Today</Badge>
  if (days === 1) return <Badge tone="red">Tomorrow</Badge>
  if (days <= 7) return <Badge tone="amber">In {days} days</Badge>
  return <Badge>{format(parseISO(date), 'EEE, MMM d')}</Badge>
}

/** Dashboard card: upcoming assessments with countdowns; finished ones prompt for a result. */
export function AssessmentsWidget() {
  const assessments = useStore((s) => s.assessments)
  const grades = useStore((s) => s.grades)
  const removeAssessment = useStore((s) => s.removeAssessment)
  const paletteOf = useSubjectPalette()
  const [showAdd, setShowAdd] = useState(false)
  const [resultFor, setResultFor] = useState<Assessment | null>(null)

  const gradedIds = useMemo(
    () => new Set(grades.map((g) => g.assessmentId).filter(Boolean)),
    [grades],
  )

  const sorted = useMemo(() => {
    const todayIso = format(new Date(), 'yyyy-MM-dd')
    // Upcoming first (soonest on top), then recent past ones awaiting a result
    const upcoming = assessments
      .filter((a) => a.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date))
    const awaiting = assessments
      .filter((a) => a.date < todayIso && !gradedIds.has(a.id))
      .sort((a, b) => b.date.localeCompare(a.date))
    return { upcoming, awaiting }
  }, [assessments, gradedIds])

  return (
    <Widget
      title="Assessments"
      icon={CalendarCheck}
      variant="frosted"
      actions={
        <Button variant="ghost" onClick={() => setShowAdd(true)}>
          <Plus size={14} aria-hidden="true" />
          Add
        </Button>
      }
    >
      {sorted.upcoming.length === 0 && sorted.awaiting.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-3 py-6 text-center text-sm text-stone-400">
          No assessments tracked — add exams and due dates to see countdowns here.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.upcoming.map((a) => (
            <li
              key={a.id}
              className="group flex items-start gap-2.5 rounded-xl border border-stone-200/80 bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-stone-100"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800">{a.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {countdownBadge(a.date)}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${paletteOf(a.subject).chip}`}>
                    {a.subject}
                  </span>
                  {a.weightPct !== undefined && <Badge>{a.weightPct}%</Badge>}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Delete "${a.title}"`}
                onClick={() => removeAssessment(a.id)}
                className="rounded-lg p-1 text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}

          {sorted.awaiting.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 ring-1 ring-amber-100"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-amber-950">{a.title}</p>
                <p className="mt-0.5 text-[11px] text-amber-700/80">
                  {a.subject} · {format(parseISO(a.date), 'MMM d')} — how did it go?
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button onClick={() => setResultFor(a)}>Add result</Button>
                <button
                  type="button"
                  aria-label={`Dismiss "${a.title}"`}
                  onClick={() => removeAssessment(a.id)}
                  className="rounded-lg p-1 text-amber-400 transition-colors hover:bg-amber-100 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAdd && (
        <Modal title="Add an assessment" onClose={() => setShowAdd(false)}>
          <AssessmentForm onDone={() => setShowAdd(false)} />
        </Modal>
      )}
      {resultFor && (
        <Modal title={`Result — ${resultFor.title}`} onClose={() => setResultFor(null)}>
          <GradeForm assessment={resultFor} onDone={() => setResultFor(null)} />
        </Modal>
      )}
    </Widget>
  )
}
