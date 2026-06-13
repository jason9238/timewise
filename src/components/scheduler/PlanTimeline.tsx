import { format, parseISO } from 'date-fns'
import { AlertTriangle, CalendarCheck2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { ScheduleResult } from '../../types'
import { durationLabel, fmtRange } from '../../lib/time'
import { useSubjectPalette } from '../../lib/colors'

interface Props {
  plan: ScheduleResult
}

export function PlanTimeline({ plan }: Props) {
  const tasks = useStore((s) => s.tasks)
  const classes = useStore((s) => s.classes)
  const paletteOf = useSubjectPalette()

  const taskById = new Map(tasks.map((t) => [t.id, t]))
  const classById = new Map(classes.map((c) => [c.id, c]))

  const byDate = new Map<string, typeof plan.blocks>()
  for (const block of plan.blocks) {
    if (!taskById.has(block.taskId)) continue // task deleted since the plan was generated
    const list = byDate.get(block.date) ?? []
    list.push(block)
    byDate.set(block.date, list)
  }
  const dates = [...byDate.keys()].sort()
  const unscheduled = plan.unscheduledTaskIds
    .map((id) => taskById.get(id))
    .filter((t) => t !== undefined)

  if (dates.length === 0 && unscheduled.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
        Nothing to schedule — all caught up!
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {unscheduled.length > 0 && (
        <div role="alert" className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">
              Not enough free time for {unscheduled.length} task{unscheduled.length > 1 ? 's' : ''}
            </p>
            <p className="mt-0.5 text-xs">
              {unscheduled.map((t) => t.title).join(', ')} — add more availability and regenerate.
            </p>
          </div>
        </div>
      )}

      {dates.map((date) => {
        const blocks = [...(byDate.get(date) ?? [])].sort((a, b) => a.startMin - b.startMin)
        return (
          <section key={date}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-900">
              <CalendarCheck2 size={14} className="text-stone-400" aria-hidden="true" />
              {format(parseISO(date), 'EEEE')}
              <span className="font-normal text-stone-400">{format(parseISO(date), 'MMM d')}</span>
            </h3>
            <ol className="ml-1.5 space-y-0 border-l-2 border-stone-100">
              {blocks.map((block) => {
                const task = taskById.get(block.taskId)
                if (!task) return null
                const linkedClass = task.classId ? classById.get(task.classId) : undefined
                return (
                  <li key={block.id} className="relative py-1.5 pl-5">
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[5px] top-4 h-2 w-2 rounded-full ${
                        linkedClass ? paletteOf(linkedClass.subject).dot : 'bg-stone-300'
                      }`}
                    />
                    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium tabular-nums text-stone-500">
                          {fmtRange(block.startMin, block.endMin)}
                        </span>
                        <span className="text-[11px] text-stone-400">{durationLabel(block.endMin - block.startMin)}</span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-stone-800">{task.title}</p>
                      {linkedClass && (
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${paletteOf(linkedClass.subject).chip}`}
                        >
                          {linkedClass.subject}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
