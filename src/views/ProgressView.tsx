import { useMemo, useState } from 'react'
import { format, parseISO, startOfWeek, subDays, subWeeks } from 'date-fns'
import { Award, Flame, Hourglass, Plus, Target, Trash2, TrendingUp } from 'lucide-react'
import type { View } from '../App'
import { useStore } from '../store/useStore'
import type { Grade } from '../types'
import { durationLabel } from '../lib/time'
import { useSubjectPalette } from '../lib/colors'
import { gpaFromPct, neededOnRemaining, weightedAverage } from '../lib/grades'
import { HeaderBar } from '../components/layout/HeaderBar'
import { Widget } from '../components/dashboard/Widget'
import { GradeForm } from '../components/progress/GradeForm'
import { GoalForm } from '../components/progress/GoalForm'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

interface Props {
  view: View
  onChangeView: (view: View) => void
}

const dayKey = (d: Date | number) => format(d, 'yyyy-MM-dd')

export function ProgressView({ view, onChangeView }: Props) {
  const sessions = useStore((s) => s.studySessions)
  const grades = useStore((s) => s.grades)
  const goals = useStore((s) => s.gradeGoals)
  const removeGrade = useStore((s) => s.removeGrade)
  const paletteOf = useSubjectPalette()
  const [showAddGrade, setShowAddGrade] = useState(false)
  const [showGoals, setShowGoals] = useState(false)

  const goalFor = (subject: string) => goals.find((g) => g.subject === subject)?.targetPct

  const stats = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
    const lastWeekStart = subWeeks(weekStart, 1).getTime()

    let thisWeekMin = 0
    let lastWeekMin = 0
    const bySubject = new Map<string, number>()
    for (const s of sessions) {
      if (s.endedAt >= weekStart) {
        thisWeekMin += s.minutes
        const key = s.subject ?? 'General'
        bySubject.set(key, (bySubject.get(key) ?? 0) + s.minutes)
      } else if (s.endedAt >= lastWeekStart) {
        lastWeekMin += s.minutes
      }
    }
    const subjects = [...bySubject.entries()].sort((a, b) => b[1] - a[1])

    // Streak: consecutive days with at least one session, ending today or yesterday
    const studiedDays = new Set(sessions.map((s) => dayKey(s.endedAt)))
    let streak = 0
    let cursor = new Date()
    if (!studiedDays.has(dayKey(cursor))) cursor = subDays(cursor, 1)
    while (studiedDays.has(dayKey(cursor))) {
      streak++
      cursor = subDays(cursor, 1)
    }

    return { thisWeekMin, lastWeekMin, subjects, streak }
  }, [sessions])

  const gradesBySubject = useMemo(() => {
    const map = new Map<string, Grade[]>()
    for (const g of grades) {
      const list = map.get(g.subject) ?? []
      list.push(g)
      map.set(g.subject, list)
    }
    for (const list of map.values()) list.sort((a, b) => b.date.localeCompare(a.date))
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [grades])

  const maxSubjectMin = stats.subjects[0]?.[1] ?? 0
  const weekDelta = stats.thisWeekMin - stats.lastWeekMin

  // Overall average = mean of each subject's weighted average; GPA from that.
  const overall = useMemo(() => {
    if (gradesBySubject.length === 0) return null
    const avgs = gradesBySubject.map(([, list]) => weightedAverage(list))
    const mean = avgs.reduce((sum, a) => sum + a, 0) / avgs.length
    return { mean, gpa: gpaFromPct(mean) }
  }, [gradesBySubject])

  return (
    <div className="flex h-full flex-col">
      <HeaderBar title="Progress" view={view} onChangeView={onChangeView} />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:gap-5">
          <div className="grid gap-4 md:grid-cols-3 lg:gap-5">
            {/* This week */}
            <Widget title="This week" icon={Hourglass}>
              <p className="font-display text-5xl font-light tabular-nums tracking-tight">
                {stats.thisWeekMin >= 60
                  ? `${Math.floor(stats.thisWeekMin / 60)}h ${stats.thisWeekMin % 60}m`
                  : `${stats.thisWeekMin}m`}
              </p>
              <p className="mt-2 text-xs text-white/55">
                {stats.lastWeekMin === 0 && stats.thisWeekMin === 0
                  ? 'Finish a pomodoro to start logging study time.'
                  : weekDelta >= 0
                    ? `${durationLabel(Math.abs(weekDelta))} more than last week`
                    : `${durationLabel(Math.abs(weekDelta))} less than last week`}
              </p>
            </Widget>

            {/* Streak */}
            <Widget title="Streak" icon={Flame}>
              <div className="flex items-baseline gap-2">
                <p className="font-display text-5xl font-light tabular-nums tracking-tight">
                  {stats.streak}
                </p>
                <p className="text-sm text-white/70">{stats.streak === 1 ? 'day' : 'days'}</p>
              </div>
              <p className="mt-2 text-xs text-white/55">
                {stats.streak === 0
                  ? 'Study today to start a streak.'
                  : 'Consecutive days with at least one focus session.'}
              </p>
            </Widget>

            {/* By subject */}
            <Widget title="By subject" icon={TrendingUp}>
              {stats.subjects.length === 0 ? (
                <p className="py-4 text-center text-sm text-white/55">
                  No sessions this week yet.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {stats.subjects.slice(0, 5).map(([subject, minutes]) => (
                    <li key={subject}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                        <span className="truncate font-medium text-white/85">{subject}</span>
                        <span className="shrink-0 tabular-nums text-white/55">
                          {durationLabel(minutes)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${paletteOf(subject).dot}`}
                          style={{ width: `${Math.max(6, (minutes / maxSubjectMin) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Widget>
          </div>

          {/* Grade tracker */}
          <Widget
            title="Grades"
            icon={Award}
            variant="frosted"
            actions={
              <div className="flex gap-1.5">
                <Button variant="ghost" onClick={() => setShowGoals(true)}>
                  <Target size={14} aria-hidden="true" />
                  Goals
                </Button>
                <Button variant="ghost" onClick={() => setShowAddGrade(true)}>
                  <Plus size={14} aria-hidden="true" />
                  Add grade
                </Button>
              </div>
            }
          >
            {overall && (
              <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm ring-1 ring-stone-100">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
                    Overall average
                  </p>
                  <p className="font-display text-3xl font-light tabular-nums text-stone-900">
                    {overall.mean.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">GPA</p>
                  <p className="font-display text-3xl font-light tabular-nums text-stone-900">
                    {overall.gpa.toFixed(1)}
                    <span className="ml-1 text-sm text-stone-400">/ 4.0</span>
                  </p>
                </div>
              </div>
            )}
            {gradesBySubject.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-200 px-3 py-10 text-center text-sm text-stone-400">
                No grades yet — record results here or from a finished assessment on the dashboard.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {gradesBySubject.map(([subject, list]) => {
                  const avg = weightedAverage(list)
                  const target = goalFor(subject)
                  const need = target !== undefined ? neededOnRemaining(list, target) : null
                  return (
                    <div
                      key={subject}
                      className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm ring-1 ring-stone-100"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${paletteOf(subject).chip}`}>
                          {subject}
                        </span>
                        <span className="text-lg font-bold tabular-nums text-stone-900">
                          {avg.toFixed(1)}%
                          <span className="ml-1 text-[10px] font-medium text-stone-400">avg</span>
                        </span>
                      </div>
                      {target !== undefined && (
                        <div className="mb-3 rounded-lg bg-stone-50 px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-1 font-medium text-stone-600">
                              <Target size={12} aria-hidden="true" />
                              Goal {target}%
                            </span>
                            <span className={avg >= target ? 'font-semibold text-emerald-600' : 'text-stone-400'}>
                              {avg >= target ? 'On track' : `${(target - avg).toFixed(1)}% to go`}
                            </span>
                          </div>
                          {need && (
                            <p className={`mt-1 text-[11px] ${need.outOfReach ? 'text-rose-600' : 'text-stone-500'}`}>
                              {need.outOfReach
                                ? `Out of reach on the remaining ${need.remainingWeightPct}%`
                                : `Need ${need.neededPct}% on the remaining ${need.remainingWeightPct}%`}
                            </p>
                          )}
                        </div>
                      )}
                      <ul className="space-y-1.5">
                        {list.map((g) => (
                          <li key={g.id} className="group flex items-center gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate text-stone-700">{g.title}</span>
                            {g.weightPct !== undefined && <Badge>{g.weightPct}%</Badge>}
                            <span className="shrink-0 font-semibold tabular-nums text-stone-900">
                              {g.scorePct}%
                            </span>
                            <button
                              type="button"
                              aria-label={`Delete grade "${g.title}"`}
                              onClick={() => removeGrade(g.id)}
                              className="rounded-md p-0.5 text-stone-300 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                            >
                              <Trash2 size={13} aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] text-stone-400">
                        Last result {format(parseISO(list[0].date), 'MMM d')}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </Widget>
        </div>
      </div>

      {showAddGrade && (
        <Modal title="Add a grade" onClose={() => setShowAddGrade(false)}>
          <GradeForm onDone={() => setShowAddGrade(false)} />
        </Modal>
      )}

      {showGoals && (
        <Modal title="Grade goals" onClose={() => setShowGoals(false)}>
          <GoalForm onDone={() => setShowGoals(false)} />
        </Modal>
      )}
    </div>
  )
}

