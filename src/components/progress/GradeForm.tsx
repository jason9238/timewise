import { useMemo, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Assessment } from '../../types'
import { Button } from '../ui/Button'

const FIELD =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20'

const LABEL = 'mb-1 block text-xs font-medium text-stone-600'

interface Props {
  /** Pre-fill from a finished assessment ("Add result" flow). */
  assessment?: Assessment
  onDone?: () => void
}

export function GradeForm({ assessment, onDone }: Props) {
  const classes = useStore((s) => s.classes)
  const grades = useStore((s) => s.grades)
  const addGrade = useStore((s) => s.addGrade)

  const subjects = useMemo(
    () =>
      [...new Set([...classes.map((c) => c.subject), ...grades.map((g) => g.subject)])].sort(),
    [classes, grades],
  )

  const [subject, setSubject] = useState(assessment?.subject ?? subjects[0] ?? '')
  const [customSubject, setCustomSubject] = useState('')
  const [title, setTitle] = useState(assessment?.title ?? '')
  const [score, setScore] = useState('')
  const [weight, setWeight] = useState(
    assessment?.weightPct !== undefined ? String(assessment.weightPct) : '',
  )
  const [date, setDate] = useState(assessment?.date ?? format(new Date(), 'yyyy-MM-dd'))

  const finalSubject = subject === '__other__' ? customSubject.trim() : subject
  const scoreNum = Number(score)
  const valid =
    title.trim() !== '' &&
    finalSubject !== '' &&
    score !== '' &&
    Number.isFinite(scoreNum) &&
    scoreNum >= 0 &&
    scoreNum <= 100

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    addGrade({
      subject: finalSubject,
      title: title.trim(),
      scorePct: scoreNum,
      weightPct: weight ? Math.min(100, Math.max(0, Number(weight))) : undefined,
      date,
      assessmentId: assessment?.id,
    })
    onDone?.()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="grade-title" className={LABEL}>
          Assessment
        </label>
        <input
          id="grade-title"
          className={FIELD}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Term 2 essay"
        />
      </div>

      {!assessment && (
        <div>
          <label htmlFor="grade-subject" className={LABEL}>
            Subject
          </label>
          {subjects.length > 0 ? (
            <select
              id="grade-subject"
              className={FIELD}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="__other__">Other…</option>
            </select>
          ) : (
            <input
              id="grade-subject"
              className={FIELD}
              value={customSubject}
              onChange={(e) => {
                setCustomSubject(e.target.value)
                setSubject('__other__')
              }}
              placeholder="e.g. Mathematics"
            />
          )}
          {subject === '__other__' && subjects.length > 0 && (
            <input
              aria-label="Custom subject"
              className={`${FIELD} mt-2`}
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Subject name"
            />
          )}
        </div>
      )}

      <div className="flex items-end gap-2.5">
        <div className="w-24">
          <label htmlFor="grade-score" className={LABEL}>
            Score (%)
          </label>
          <input
            id="grade-score"
            type="number"
            min={0}
            max={100}
            step="0.1"
            className={FIELD}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="85"
          />
        </div>
        <div className="w-24">
          <label htmlFor="grade-weight" className={LABEL}>
            Weight (%)
          </label>
          <input
            id="grade-weight"
            type="number"
            min={0}
            max={100}
            className={FIELD}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="—"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="grade-date" className={LABEL}>
            Date
          </label>
          <input
            id="grade-date"
            type="date"
            className={FIELD}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button variant="primary" type="submit" disabled={!valid}>
          <Plus size={14} aria-hidden="true" />
          Save grade
        </Button>
      </div>
    </form>
  )
}
