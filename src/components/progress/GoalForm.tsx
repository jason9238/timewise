import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { Button } from '../ui/Button'

const FIELD =
  'w-24 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500'

interface Props {
  onDone: () => void
}

/** Set a target final mark per subject. */
export function GoalForm({ onDone }: Props) {
  const classes = useStore((s) => s.classes)
  const grades = useStore((s) => s.grades)
  const goals = useStore((s) => s.gradeGoals)
  const setGradeGoal = useStore((s) => s.setGradeGoal)

  const subjects = useMemo(() => {
    const set = new Set<string>([...classes.map((c) => c.subject), ...grades.map((g) => g.subject)])
    return [...set].sort()
  }, [classes, grades])

  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(goals.map((g) => [g.subject, String(g.targetPct)])),
  )

  const save = () => {
    for (const subject of subjects) {
      const raw = draft[subject]?.trim()
      if (raw === undefined || raw === '') {
        setGradeGoal(subject, null)
      } else {
        const n = Number(raw)
        if (Number.isFinite(n)) setGradeGoal(subject, Math.min(100, Math.max(0, n)))
      }
    }
    onDone()
  }

  if (subjects.length === 0) {
    return (
      <div>
        <p className="text-sm text-stone-500">Add some classes or grades first, then set targets here.</p>
        <div className="mt-3 flex justify-end">
          <Button variant="primary" onClick={onDone}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs text-stone-500">
        Set the final mark you're aiming for in each subject. Leave blank for no goal.
      </p>
      <ul className="max-h-72 space-y-2 overflow-y-auto">
        {subjects.map((subject) => (
          <li key={subject} className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{subject}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                className={FIELD}
                value={draft[subject] ?? ''}
                onChange={(e) => setDraft({ ...draft, [subject]: e.target.value })}
                placeholder="—"
                aria-label={`Target for ${subject}`}
              />
              <span className="text-sm text-stone-400">%</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save}>
          Save goals
        </Button>
      </div>
    </div>
  )
}
