import { useEffect } from 'react'
import { addDays, format } from 'date-fns'
import { useStore } from '../store/useStore'
import { weekLabelFor } from '../lib/weeks'
import { fmtTime } from '../lib/time'
import type { ClassSlot, Weekday } from '../types'

const CHECK_EVERY_MS = 30_000

function notify(dedupeKey: string, title: string, body: string) {
  // sessionStorage survives re-renders and reloads within the tab, so each
  // class/due date only notifies once per day per session.
  const sent = sessionStorage.getItem('timewise-notified') ?? ''
  if (sent.includes(dedupeKey)) return
  sessionStorage.setItem('timewise-notified', `${sent}|${dedupeKey}`)
  try {
    new Notification(title, { body, icon: '/favicon.svg' })
  } catch {
    /* notification construction can throw on some mobile browsers */
  }
}

const dayIdx = (d: Date) => ((d.getDay() + 6) % 7) as Weekday

/**
 * While the app is open, raises browser notifications for:
 *  - classes about to start and tasks due today (master bell toggle), and
 *  - custom weekly per-class reminders (always active once created).
 * True background push needs a server, so reminders only fire while a
 * TimeWise tab/app is running.
 */
export function useReminders() {
  const active = useStore((s) => s.remindersEnabled || s.reminders.length > 0)

  useEffect(() => {
    if (!active || typeof Notification === 'undefined') return

    const check = () => {
      if (Notification.permission !== 'granted') return
      const { classes, tasks, reminders, weekAParity, reminderLeadMin, remindersEnabled } =
        useStore.getState()
      const now = new Date()
      const today = dayIdx(now)
      const todayIso = format(now, 'yyyy-MM-dd')
      const nowMin = now.getHours() * 60 + now.getMinutes()
      const week = weekLabelFor(now, weekAParity)

      const occursToday = (c: ClassSlot) => c.day === today && (!c.week || c.week === week)

      // ── Automatic class-start + due-today notifications (master toggle) ──
      if (remindersEnabled) {
        for (const c of classes) {
          if (!occursToday(c)) continue
          const minutesUntil = c.startMin - nowMin
          if (minutesUntil > 0 && minutesUntil <= reminderLeadMin) {
            notify(
              `class:${c.id}:${todayIso}`,
              `${c.subject} ${minutesUntil <= 1 ? 'now' : `in ${minutesUntil} min`}`,
              [fmtTime(c.startMin), c.room, c.teacher].filter(Boolean).join(' · '),
            )
          }
        }

        const dueToday = tasks.filter((t) => !t.done && t.dueDate === todayIso)
        if (dueToday.length > 0) {
          notify(
            `due:${todayIso}`,
            dueToday.length === 1 ? 'Due today' : `${dueToday.length} tasks due today`,
            dueToday.map((t) => t.title).join(', '),
          )
        }
      }

      // ── Custom weekly per-class reminders ──
      const tomorrow = addDays(now, 1)
      const tomorrowWeek = weekLabelFor(tomorrow, weekAParity)
      const classById = new Map(classes.map((c) => [c.id, c]))

      for (const r of reminders) {
        const c = classById.get(r.classId)
        if (!c) continue

        if (r.timing === 'night-before') {
          const occursTomorrow =
            c.day === dayIdx(tomorrow) && (!c.week || c.week === tomorrowWeek)
          if (occursTomorrow && nowMin >= 20 * 60) {
            notify(
              `rem:${r.id}:${todayIso}`,
              r.message,
              `${c.subject} tomorrow · ${fmtTime(c.startMin)}${c.room ? ` · ${c.room}` : ''}`,
            )
          }
          continue
        }

        if (!occursToday(c)) continue
        const minutesUntil = c.startMin - nowMin
        const fire =
          (r.timing === 'morning' && nowMin >= 7 * 60 && minutesUntil > 0) ||
          (r.timing === 'hour-before' && minutesUntil > 0 && minutesUntil <= 60) ||
          (r.timing === 'before-class' && minutesUntil > 0 && minutesUntil <= reminderLeadMin)
        if (fire) {
          notify(
            `rem:${r.id}:${todayIso}`,
            r.message,
            `${c.subject} today · ${fmtTime(c.startMin)}${c.room ? ` · ${c.room}` : ''}`,
          )
        }
      }
    }

    check()
    const id = setInterval(check, CHECK_EVERY_MS)
    return () => clearInterval(id)
  }, [active])
}
