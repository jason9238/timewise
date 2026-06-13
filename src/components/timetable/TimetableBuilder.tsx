import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useSubjectPalette } from '../../lib/colors'
import { toHM } from '../../lib/time'
import { DEFAULT_PERIODS, WEEKDAYS_SHORT, type Weekday, type WeekLabel } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ManualClassForm } from './ManualClassForm'

const DAYS: Weekday[] = [0, 1, 2, 3, 4]

/** Tap-a-cell timetable builder: pick a day × period to add a class. */
export function TimetableBuilder() {
  const classes = useStore((s) => s.classes)
  const periods = useStore((s) => s.schoolConfig.periods)
  const usesWeeks = useStore((s) => Boolean(s.schoolConfig.weekAnchorMonday))
  const removeClass = useStore((s) => s.removeClass)
  const paletteOf = useSubjectPalette()

  const grid = periods.length > 0 ? periods : DEFAULT_PERIODS
  const [editWeek, setEditWeek] = useState<WeekLabel>('A')
  const [adding, setAdding] = useState<{ day: Weekday; start: string; end: string } | null>(null)

  const classAt = (day: Weekday, pStart: number, pEnd: number) =>
    classes.find(
      (c) =>
        c.day === day &&
        c.startMin < pEnd &&
        c.endMin > pStart &&
        (!c.week || !usesWeeks || c.week === editWeek),
    )

  return (
    <div>
      {usesWeeks && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-medium text-stone-500">Editing</span>
          <div className="flex gap-0.5 rounded-lg bg-stone-100 p-0.5">
            {(['A', 'B'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setEditWeek(w)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  editWeek === w ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Week {w}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[28rem] gap-1"
          style={{ gridTemplateColumns: `64px repeat(${DAYS.length}, minmax(0, 1fr))` }}
        >
          <div />
          {DAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-xs font-bold text-stone-500">
              {WEEKDAYS_SHORT[d]}
            </div>
          ))}

          {grid.map((p, i) => (
            <div key={i} className="contents">
              <div className="flex flex-col justify-center pr-1 text-right text-[10px] leading-tight text-stone-400">
                <span className="font-medium text-stone-500">{p.name}</span>
                <span className="tabular-nums">{toHM(p.start)}</span>
              </div>
              {DAYS.map((d) => {
                const cls = classAt(d, p.start, p.end)
                if (cls) {
                  const palette = paletteOf(cls.subject)
                  return (
                    <div
                      key={d}
                      className={`group relative min-h-12 rounded-lg px-1.5 py-1 ${palette.bg} ${palette.text}`}
                    >
                      <p className="truncate text-[11px] font-bold leading-tight">{cls.subject}</p>
                      {cls.room && <p className={`truncate text-[9px] ${palette.subtext}`}>{cls.room}</p>}
                      <button
                        type="button"
                        aria-label={`Remove ${cls.subject}`}
                        onClick={() => removeClass(cls.id)}
                        className="absolute right-0.5 top-0.5 hidden rounded bg-black/20 p-0.5 text-white hover:bg-black/40 group-hover:block"
                      >
                        <X size={11} aria-hidden="true" />
                      </button>
                    </div>
                  )
                }
                return (
                  <button
                    key={d}
                    type="button"
                    aria-label={`Add class ${WEEKDAYS_SHORT[d]} ${p.name}`}
                    onClick={() => setAdding({ day: d, start: toHM(p.start), end: toHM(p.end) })}
                    className="flex min-h-12 items-center justify-center rounded-lg border border-dashed border-stone-300 text-stone-300 transition-colors hover:border-stone-400 hover:bg-stone-50 hover:text-stone-500"
                  >
                    <Plus size={14} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-stone-400">
        Tap any empty slot to add a class. Hover a class to remove it.
      </p>

      <div className="mt-2 flex justify-center">
        <Button onClick={() => setAdding({ day: 0, start: '09:00', end: '10:00' })}>
          <Plus size={14} aria-hidden="true" />
          Add class (custom time)
        </Button>
      </div>

      {adding && (
        <Modal title="Add a class" onClose={() => setAdding(null)}>
          <ManualClassForm
            initial={{ day: adding.day, start: adding.start, end: adding.end, week: usesWeeks ? editWeek : '' }}
            onDone={() => setAdding(null)}
          />
        </Modal>
      )}
    </div>
  )
}
