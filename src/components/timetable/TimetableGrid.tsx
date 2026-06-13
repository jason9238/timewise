import { Fragment, useMemo, useState } from 'react'
import { WEEKDAYS, WEEKDAYS_SHORT, type ClassSlot, type Weekday } from '../../types'
import { fmtTime } from '../../lib/time'
import { ClassCard, DayListCard } from './ClassCard'

interface Props {
  classes: ClassSlot[]
  onSelect: (id: string) => void
}

/**
 * Period-aligned timetable: every distinct start time is one row, so all
 * class boxes line up across days with no proportional dead space (free
 * periods and lunch gaps don't stretch the grid). Days are separate columns
 * with clear gutters between them.
 */
export function TimetableGrid({ classes, onSelect }: Props) {
  const todayIdx = ((new Date().getDay() + 6) % 7) as Weekday
  const [mobileDay, setMobileDay] = useState<Weekday>(todayIdx)

  const { rows, cells } = useMemo(() => {
    const rows = [...new Set(classes.map((c) => c.startMin))].sort((a, b) => a - b)
    // day → startMin → slots (clashing options stack inside one cell)
    const cells = new Map<Weekday, Map<number, ClassSlot[]>>()
    for (const c of classes) {
      let byStart = cells.get(c.day)
      if (!byStart) cells.set(c.day, (byStart = new Map()))
      const list = byStart.get(c.startMin)
      if (list) {
        list.push(c)
        list.sort((a, b) => a.endMin - b.endMin)
      } else {
        byStart.set(c.startMin, [c])
      }
    }
    return { rows, cells }
  }, [classes])

  // Saturday/Sunday columns only when something is scheduled there
  const showWeekend = classes.some((c) => c.day >= 5)
  const dayCount = showWeekend ? 7 : 5
  const days = Array.from({ length: dayCount }, (_, d) => d as Weekday)

  const mobileClasses = [...(cells.get(mobileDay)?.values() ?? [])]
    .flat()
    .sort((a, b) => a.startMin - b.startMin)

  return (
    <div className="h-full min-h-0">
      {/* Desktop: period-aligned week grid */}
      <div className="hidden h-full overflow-y-auto px-4 pb-4 md:block">
        <div
          className="grid gap-x-3 gap-y-2"
          style={{ gridTemplateColumns: `48px repeat(${dayCount}, minmax(0, 1fr))` }}
        >
          <div className="sticky top-0 z-10" />
          {days.map((d) => (
            <div
              key={d}
              className={`sticky top-0 z-10 rounded-b-lg pb-1 pt-3 text-center text-sm font-bold backdrop-blur-sm ${
                d === todayIdx ? 'text-white' : 'text-white/50'
              }`}
            >
              {WEEKDAYS_SHORT[d]}
              {d === todayIdx && (
                <span className="mx-auto mt-0.5 block h-0.5 w-8 rounded-full bg-white" aria-hidden="true" />
              )}
            </div>
          ))}

          {rows.map((startMin) => (
            <Fragment key={startMin}>
              <div className="pt-1.5 text-right text-[11px] font-medium tabular-nums text-white/60">
                {fmtTime(startMin)}
              </div>
              {days.map((d) => {
                const slots = cells.get(d)?.get(startMin)
                return (
                  <div key={d} className="flex min-h-12 flex-col gap-1.5">
                    {slots?.map((slot) => (
                      <ClassCard key={slot.id} slot={slot} onClick={() => onSelect(slot.id)} />
                    ))}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Mobile: one day at a time */}
      <div className="h-full overflow-y-auto p-3 md:hidden">
        <div role="tablist" aria-label="Day" className="glass-surface mb-3 flex gap-1 overflow-x-auto rounded-xl p-1">
          {Array.from({ length: 7 }, (_, d) => d as Weekday).map((d) => (
            <button
              key={d}
              role="tab"
              type="button"
              aria-selected={mobileDay === d}
              onClick={() => setMobileDay(d)}
              className={`min-w-11 flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 ${
                mobileDay === d ? 'bg-white text-stone-900 shadow-sm' : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {WEEKDAYS_SHORT[d]}
            </button>
          ))}
        </div>
        {mobileClasses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/25 bg-white/5 py-10 text-center text-sm text-white/60 backdrop-blur-sm">
            No classes on {WEEKDAYS[mobileDay]}
          </p>
        ) : (
          <ul className="space-y-2">
            {mobileClasses.map((slot) => (
              <li key={slot.id}>
                <DayListCard slot={slot} onClick={() => onSelect(slot.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
