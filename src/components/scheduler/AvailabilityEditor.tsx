import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { WEEKDAYS, type Weekday } from '../../types'
import { fmtRange, parseHM } from '../../lib/time'

const TIME_FIELD =
  'rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500'

export function AvailabilityEditor() {
  const freeBlocks = useStore((s) => s.freeBlocks)
  const addFreeBlock = useStore((s) => s.addFreeBlock)
  const removeFreeBlock = useStore((s) => s.removeFreeBlock)

  const [editingDay, setEditingDay] = useState<Weekday | null>(null)
  const [start, setStart] = useState('17:00')
  const [end, setEnd] = useState('19:00')
  const [error, setError] = useState<string | null>(null)

  const confirm = () => {
    if (editingDay === null) return
    const startMin = parseHM(start)
    const endMin = parseHM(end)
    if (!(startMin < endMin)) {
      setError('End must be after start.')
      return
    }
    addFreeBlock({ day: editingDay, startMin, endMin })
    setEditingDay(null)
    setError(null)
  }

  return (
    <ul className="divide-y divide-stone-100">
      {WEEKDAYS.map((name, i) => {
        const day = i as Weekday
        const blocks = freeBlocks
          .filter((b) => b.day === day)
          .sort((a, b) => a.startMin - b.startMin)
        return (
          <li key={name} className="flex flex-wrap items-center gap-2 py-2">
            <span className="w-20 shrink-0 text-sm font-medium text-stone-600">{name}</span>
            {blocks.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-2.5 pr-1 text-xs font-medium text-stone-700"
              >
                {fmtRange(b.startMin, b.endMin)}
                <button
                  type="button"
                  aria-label={`Remove ${name} ${fmtRange(b.startMin, b.endMin)}`}
                  onClick={() => removeFreeBlock(b.id)}
                  className="rounded-full p-0.5 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ))}
            {editingDay === day ? (
              <span className="inline-flex items-center gap-1.5">
                <label className="sr-only" htmlFor={`free-start-${day}`}>
                  Start time
                </label>
                <input id={`free-start-${day}`} type="time" className={TIME_FIELD} value={start} onChange={(e) => setStart(e.target.value)} />
                <span className="text-xs text-stone-400">to</span>
                <label className="sr-only" htmlFor={`free-end-${day}`}>
                  End time
                </label>
                <input id={`free-end-${day}`} type="time" className={TIME_FIELD} value={end} onChange={(e) => setEnd(e.target.value)} />
                <button
                  type="button"
                  aria-label="Confirm free time"
                  onClick={confirm}
                  className="rounded-md bg-stone-900 p-1.5 text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
                >
                  <Check size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => {
                    setEditingDay(null)
                    setError(null)
                  }}
                  className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingDay(day)
                  setError(null)
                }}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-400 transition-colors hover:border-stone-400 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                <Plus size={12} aria-hidden="true" />
                Add
              </button>
            )}
            {editingDay === day && error && (
              <span role="alert" className="text-xs text-rose-600">
                {error}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
