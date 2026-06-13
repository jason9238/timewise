import { useState } from 'react'
import { ListTodo, Plus, Sparkles, Timer } from 'lucide-react'
import type { View } from '../App'
import { useStore } from '../store/useStore'
import { claudeAvailable, pickProvider } from '../lib/ai'
import { useAuth } from '../hooks/useAuth'
import type { Task } from '../types'
import { HeaderBar } from '../components/layout/HeaderBar'
import { Widget } from '../components/dashboard/Widget'
import { AvailabilityEditor } from '../components/scheduler/AvailabilityEditor'
import { PlanTimeline } from '../components/scheduler/PlanTimeline'
import { PomodoroTimer } from '../components/scheduler/PomodoroTimer'
import { TaskForm } from '../components/tasks/TaskForm'
import { TaskList } from '../components/tasks/TaskList'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

interface Props {
  view: View
  onChangeView: (view: View) => void
}

export function SchedulerView({ view, onChangeView }: Props) {
  const tasks = useStore((s) => s.tasks)
  const freeBlocks = useStore((s) => s.freeBlocks)
  const plan = useStore((s) => s.plan)
  const setPlan = useStore((s) => s.setPlan)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showPomodoroPrompt, setShowPomodoroPrompt] = useState(false)
  const [pomodoroQueue, setPomodoroQueue] = useState<Task[] | null>(null)

  const { user } = useAuth()
  const provider = pickProvider(user !== null)

  const pending = tasks.filter((t) => !t.done)
  const canGenerate = pending.length > 0 && freeBlocks.length > 0

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      setPlan(await provider.plan({ tasks, freeBlocks }))
      setShowPomodoroPrompt(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate a plan.')
    } finally {
      setLoading(false)
    }
  }

  const buildPomodoroQueue = (): Task[] => {
    const byDue = (a: Task, b: Task) =>
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.createdAt - b.createdAt
    if (!plan) return [...pending].sort(byDue)
    const pendingById = new Map(pending.map((t) => [t.id, t]))
    const ordered: Task[] = []
    const blocks = [...plan.blocks].sort(
      (a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin,
    )
    for (const block of blocks) {
      const task = pendingById.get(block.taskId)
      if (task && !ordered.includes(task)) ordered.push(task)
    }
    for (const task of [...pending].sort(byDue)) {
      if (!ordered.includes(task)) ordered.push(task)
    }
    return ordered
  }

  const startPomodoro = () => {
    setShowPomodoroPrompt(false)
    setPomodoroQueue(buildPomodoroQueue())
  }

  return (
    <div className="flex h-full flex-col">
      <HeaderBar title="AI Smart Scheduler" view={view} onChangeView={onChangeView} />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="space-y-4 lg:space-y-5">
            <Widget title="My free time" icon={Timer} variant="frosted">
              <p className="mb-3 text-xs leading-relaxed text-stone-500">
                Weekly blocks when you can study.
              </p>
              <AvailabilityEditor />
            </Widget>

            <Widget
              title="Pending tasks"
              icon={ListTodo}
              variant="frosted"
              actions={
                <Button variant="ghost" onClick={() => setShowAddTask(true)}>
                  <Plus size={14} aria-hidden="true" />
                  Add to-do
                </Button>
              }
            >
              <TaskList
                tasks={tasks}
                emptyMessage="No tasks yet — add one here or attach assignments to classes on the timetable."
              />
            </Widget>
          </div>

          <Widget
            title="Your study plan"
            icon={Sparkles}
            variant="frosted"
            actions={
              <div className="flex gap-1.5">
                {plan && (
                  <Button onClick={startPomodoro}>
                    <Timer size={14} aria-hidden="true" />
                    <span className="hidden sm:inline">Pomodoro</span>
                  </Button>
                )}
                <Button variant="primary" onClick={generate} disabled={!canGenerate || loading}>
                  <Sparkles size={14} aria-hidden="true" />
                  {loading ? 'Planning…' : plan ? 'Regenerate' : 'Generate'}
                </Button>
              </div>
            }
          >
            <p className="mb-4 text-[11px] font-medium tracking-wide text-stone-400 uppercase">
              {provider.name === 'Claude AI Scheduler'
                ? 'Planned by Claude AI'
                : claudeAvailable
                  ? 'On-device — sign in for Claude AI'
                  : 'Planned on-device'}
            </p>

            {showPomodoroPrompt && plan && !loading && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                <p className="text-sm text-amber-950">
                  <span className="font-semibold">Plan ready!</span> Start your first pomodoro now?
                </p>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="primary" onClick={startPomodoro}>
                    <Timer size={14} aria-hidden="true" />
                    Start pomodoros
                  </Button>
                  <Button variant="ghost" onClick={() => setShowPomodoroPrompt(false)}>
                    Later
                  </Button>
                </div>
              </div>
            )}

            {!canGenerate && (
              <p className="mb-4 rounded-xl bg-stone-50 px-4 py-2.5 text-xs text-stone-500 ring-1 ring-stone-200/60">
                {pending.length === 0
                  ? 'Add at least one pending task to generate a plan.'
                  : 'Add at least one free-time block to generate a plan.'}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-100"
              >
                {error}
              </p>
            )}

            {loading ? (
              <div className="space-y-3" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-100" />
                ))}
              </div>
            ) : plan ? (
              <PlanTimeline plan={plan} />
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-12 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                  <Sparkles size={18} aria-hidden="true" />
                </span>
                <p className="text-sm text-stone-500">
                  No plan yet. Set your free time, then hit{' '}
                  <span className="font-semibold text-stone-700">Generate</span>.
                </p>
              </div>
            )}
          </Widget>
        </div>
      </div>

      {showAddTask && (
        <Modal title="Add a general to-do" onClose={() => setShowAddTask(false)}>
          <TaskForm onAdded={() => setShowAddTask(false)} />
        </Modal>
      )}

      {pomodoroQueue && (
        <Modal title="Pomodoro session" onClose={() => setPomodoroQueue(null)}>
          <PomodoroTimer taskQueue={pomodoroQueue} />
        </Modal>
      )}
    </div>
  )
}
