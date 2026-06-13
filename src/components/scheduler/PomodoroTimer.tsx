import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Coffee, Pause, Play, RotateCcw, SkipForward, Timer } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Task } from '../../types'

const DURATIONS = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
} as const

type Phase = keyof typeof DURATIONS

const PHASE_LABEL: Record<Phase, string> = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
}

/** Every 4th completed focus block earns the long break. */
const CYCLES_PER_LONG_BREAK = 4

/** Two soft beeps when a phase ends; silently does nothing if audio is blocked. */
function chime() {
  try {
    const ctx = new AudioContext()
    for (const [offset, freq] of [
      [0, 880],
      [0.25, 660],
    ] as const) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.12, ctx.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.22)
      osc.start(ctx.currentTime + offset)
      osc.stop(ctx.currentTime + offset + 0.25)
    }
    setTimeout(() => void ctx.close(), 800)
  } catch {
    /* audio unavailable */
  }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

interface Props {
  /** Pending tasks in the order the AI plan schedules them. */
  taskQueue: Task[]
}

export function PomodoroTimer({ taskQueue }: Props) {
  const toggleTask = useStore((s) => s.toggleTask)
  const classes = useStore((s) => s.classes)
  const addStudySession = useStore((s) => s.addStudySession)

  const [phase, setPhase] = useState<Phase>('focus')
  const [secondsLeft, setSecondsLeft] = useState<number>(DURATIONS.focus)
  const [running, setRunning] = useState(true)
  const [focusCount, setFocusCount] = useState(0)
  const [taskIdx, setTaskIdx] = useState(0)

  const currentTask: Task | undefined = taskQueue[Math.min(taskIdx, taskQueue.length - 1)]
  const nextTask: Task | undefined = taskQueue[taskIdx + 1]

  const advancePhase = useCallback(
    (playChime: boolean) => {
      if (playChime) chime()
      if (phase === 'focus') {
        // Log the studied time (full block when it ran out naturally, the
        // elapsed part when skipped early) so the Progress view can track it.
        const minutes = Math.round((DURATIONS.focus - secondsLeft) / 60)
        if (minutes >= 1) {
          addStudySession({
            taskId: currentTask?.id,
            subject: currentTask?.classId
              ? classes.find((c) => c.id === currentTask.classId)?.subject
              : undefined,
            minutes,
            endedAt: Date.now(),
          })
        }
        const done = focusCount + 1
        setFocusCount(done)
        const next: Phase = done % CYCLES_PER_LONG_BREAK === 0 ? 'long' : 'short'
        setPhase(next)
        setSecondsLeft(DURATIONS[next])
      } else {
        setPhase('focus')
        setSecondsLeft(DURATIONS.focus)
      }
    },
    [phase, focusCount, secondsLeft, currentTask, classes, addStudySession],
  )

  // Tick once a second; when the countdown reaches zero, advance to the next
  // phase from the interval callback (not an effect body) via a fresh ref.
  const advanceRef = useRef(advancePhase)
  useEffect(() => {
    advanceRef.current = advancePhase
  }, [advancePhase])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      let finished = false
      setSecondsLeft((s) => {
        if (s === 1) finished = true
        return Math.max(0, s - 1)
      })
      if (finished) advanceRef.current(true)
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  // Countdown in the tab title while the timer is open
  const baseTitle = useRef(document.title)
  useEffect(() => {
    document.title = `${fmt(secondsLeft)} · ${PHASE_LABEL[phase]} — TimeWise`
    const original = baseTitle.current
    return () => {
      document.title = original
    }
  }, [secondsLeft, phase])

  const total = DURATIONS[phase]
  const progress = (total - secondsLeft) / total
  const R = 84
  const CIRC = 2 * Math.PI * R

  const ringColor = phase === 'focus' ? 'stroke-indigo-600' : 'stroke-emerald-600'

  const markDoneAndNext = () => {
    if (currentTask) toggleTask(currentTask.id)
    if (taskIdx < taskQueue.length - 1) setTaskIdx(taskIdx + 1)
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48">
        <svg viewBox="0 0 192 192" className="h-full w-full -rotate-90">
          <circle cx="96" cy="96" r={R} fill="none" strokeWidth="10" className="stroke-stone-100" />
          <circle
            cx="96"
            cy="96"
            r={R}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${ringColor}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
            {phase === 'focus' ? <Timer size={13} aria-hidden="true" /> : <Coffee size={13} aria-hidden="true" />}
            {PHASE_LABEL[phase]}
          </span>
          <span className="text-5xl font-bold tabular-nums tracking-tight text-stone-900" role="timer" aria-live="polite">
            {fmt(secondsLeft)}
          </span>
        </div>
      </div>

      {/* Cycle dots: filled = focus block completed */}
      <div className="mt-2 flex gap-1.5" aria-label={`${focusCount} pomodoros completed`}>
        {Array.from({ length: CYCLES_PER_LONG_BREAK }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              i < focusCount % CYCLES_PER_LONG_BREAK || (focusCount > 0 && focusCount % CYCLES_PER_LONG_BREAK === 0)
                ? 'bg-indigo-600'
                : 'bg-stone-200'
            }`}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRunning(!running)}
          aria-label={running ? 'Pause' : 'Start'}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
        >
          {running ? <Pause size={20} aria-hidden="true" /> : <Play size={20} className="ml-0.5" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => setSecondsLeft(DURATIONS[phase])}
          aria-label="Restart this phase"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => advancePhase(false)}
          aria-label={phase === 'focus' ? 'Skip to break' : 'Skip break'}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
        >
          <SkipForward size={16} aria-hidden="true" />
        </button>
      </div>

      {currentTask ? (
        <div className="mt-5 w-full rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Working on</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-medium text-stone-800">{currentTask.title}</p>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={markDoneAndNext}
                aria-label={`Mark "${currentTask.title}" done`}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Check size={14} aria-hidden="true" />
              </button>
              {nextTask && (
                <button
                  type="button"
                  onClick={() => setTaskIdx(taskIdx + 1)}
                  aria-label="Switch to next task"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-500 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  <SkipForward size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          {nextTask && <p className="mt-1.5 truncate text-xs text-stone-400">Next up: {nextTask.title}</p>}
        </div>
      ) : (
        <p className="mt-5 text-sm text-stone-400">No pending tasks — freestyle focus session.</p>
      )}

      <p className="mt-3 text-center text-[11px] text-stone-400">
        25 min focus · 5 min break · long 15 min break every {CYCLES_PER_LONG_BREAK} pomodoros
      </p>
    </div>
  )
}
