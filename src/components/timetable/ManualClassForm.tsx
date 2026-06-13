import { useState, type FormEvent } from 'react'
import { useStore } from '../../store/useStore'
import { WEEKDAYS, type Weekday, type WeekLabel } from '../../types'
import { parseHM } from '../../lib/time'
import { Button } from '../ui/Button'

const FIELD =
  'w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500'

interface Props {
  onDone: () => void
  /** Prefill day/time/week — used by the tap-to-build grid. */
  initial?: { day?: Weekday; start?: string; end?: string; week?: WeekLabel | '' }
}

export function ManualClassForm({ onDone, initial }: Props) {
  const addClass = useStore((s) => s.addClass)
  const [subject, setSubject] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [teacher, setTeacher] = useState('')
  const [room, setRoom] = useState('')
  const [day, setDay] = useState<Weekday>(initial?.day ?? 0)
  const [start, setStart] = useState(initial?.start ?? '09:00')
  const [end, setEnd] = useState(initial?.end ?? '10:00')
  const [week, setWeek] = useState<WeekLabel | ''>(initial?.week ?? '')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const startMin = parseHM(start)
    const endMin = parseHM(end)
    if (!subject.trim()) {
      setError('Subject is required.')
      return
    }
    if (!(startMin < endMin)) {
      setError('End time must be after start time.')
      return
    }
    addClass({
      subject: subject.trim(),
      subjectCode: subjectCode.trim() || undefined,
      teacher: teacher.trim() || undefined,
      room: room.trim() || undefined,
      day,
      startMin,
      endMin,
      week: week || undefined,
    })
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="cls-subject" className="mb-1 block text-xs font-medium text-stone-600">
          Subject *
        </label>
        <input id="cls-subject" className={FIELD} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mathematics" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="cls-code" className="mb-1 block text-xs font-medium text-stone-600">
            Subject code
          </label>
          <input id="cls-code" className={FIELD} value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="MATH1131" />
        </div>
        <div>
          <label htmlFor="cls-room" className="mb-1 block text-xs font-medium text-stone-600">
            Room
          </label>
          <input id="cls-room" className={FIELD} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="M12" />
        </div>
      </div>
      <div>
        <label htmlFor="cls-teacher" className="mb-1 block text-xs font-medium text-stone-600">
          Teacher
        </label>
        <input id="cls-teacher" className={FIELD} value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Mr Chen" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="cls-day" className="mb-1 block text-xs font-medium text-stone-600">
            Day
          </label>
          <select id="cls-day" className={FIELD} value={day} onChange={(e) => setDay(Number(e.target.value) as Weekday)}>
            {WEEKDAYS.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cls-start" className="mb-1 block text-xs font-medium text-stone-600">
            Starts
          </label>
          <input id="cls-start" type="time" className={FIELD} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cls-end" className="mb-1 block text-xs font-medium text-stone-600">
            Ends
          </label>
          <input id="cls-end" type="time" className={FIELD} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="cls-week" className="mb-1 block text-xs font-medium text-stone-600">
          Repeats
        </label>
        <select id="cls-week" className={FIELD} value={week} onChange={(e) => setWeek(e.target.value as WeekLabel | '')}>
          <option value="">Every week</option>
          <option value="A">Week A only</option>
          <option value="B">Week B only</option>
        </select>
        <p className="mt-1 text-[11px] text-stone-400">
          Only needed if your school runs a two-week (Week A / Week B) timetable.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Add class
        </Button>
      </div>
    </form>
  )
}
