import { useMemo, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { CalendarCheck } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Button } from '../ui/Button'

const FIELD =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20'

const LABEL = 'mb-1 block text-xs font-medium text-stone-600'

interface Props {
  /** Pre-select a subject, e.g. when adding from a class panel. */
  subject?: string
  onDone?: () => void
}

export function AssessmentForm({ subject: fixedSubject, onDone }: Props) {
  const classes = useStore((s) => s.classes)
  const addAssessment = useStore((s) => s.addAssessment)

  const subjects = useMemo(
    () => [...new Set(classes.map((c) => c.subject))].sort(),
    [classes],
  )

  const [subject, setSubject] = useState(fixedSubject ?? subjects[0] ?? '')
  const [customSubject, setCustomSubject] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [weight, setWeight] = useState('')

  const finalSubject = subject === '__other__' ? customSubject.trim() : subject
  const valid = title.trim() !== '' && finalSubject !== '' && date !== ''

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    addAssessment({
      subject: finalSubject,
      title: title.trim(),
      date,
      weightPct: weight ? Math.min(100, Math.max(0, Number(weight))) : undefined,
    })
    onDone?.()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="assess-title" className={LABEL}>
          What is it?
        </label>
        <input
          id="assess-title"
          className={FIELD}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Half-yearly exam, Speech, Assignment due"
        />
      </div>

      {!fixedSubject && (
        <div>
          <label htmlFor="assess-subject" className={LABEL}>
            Subject
          </label>
          {subjects.length > 0 ? (
            <select
              id="assess-subject"
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
              id="assess-subject"
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
        <div className="flex-1">
          <label htmlFor="assess-date" className={LABEL}>
            Date
          </label>
          <input
            id="assess-date"
            type="date"
            className={FIELD}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="w-28">
          <label htmlFor="assess-weight" className={LABEL}>
            Weight (%)
          </label>
          <input
            id="assess-weight"
            type="number"
            min={0}
            max={100}
            className={FIELD}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="—"
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button variant="primary" type="submit" disabled={!valid}>
          <CalendarCheck size={14} aria-hidden="true" />
          Add assessment
        </Button>
      </div>
    </form>
  )
}
