import { useState } from 'react'
import { format, startOfWeek } from 'date-fns'
import { CalendarDays, Check, Copy, Download, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { parseHM, toHM } from '../../lib/time'
import { weekLabelFor } from '../../lib/weeks'
import { downloadICS } from '../../lib/icsExport'
import { supabase, supabaseFunctionsUrl } from '../../lib/supabase'
import { DEFAULT_PERIODS, type Period } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const FIELD =
  'w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const config = useStore((s) => s.schoolConfig)
  const weekAParity = useStore((s) => s.weekAParity)
  const classes = useStore((s) => s.classes)
  const assessments = useStore((s) => s.assessments)
  const updateSchoolConfig = useStore((s) => s.updateSchoolConfig)
  const setWeekAnchor = useStore((s) => s.setWeekAnchor)

  const periods = config.periods.length > 0 ? config.periods : DEFAULT_PERIODS
  const [usesWeeks, setUsesWeeks] = useState(Boolean(config.weekAnchorMonday))
  const [feedUrl, setFeedUrl] = useState<string | null>(null)
  const [feedBusy, setFeedBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const getSubscribeLink = async () => {
    if (!supabase || !supabaseFunctionsUrl) return
    setFeedBusy(true)
    try {
      const { data } = await supabase.auth.getSession()
      const res = await fetch(`${supabaseFunctionsUrl}/calendar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
      })
      const body = await res.json().catch(() => null)
      if (body?.url) setFeedUrl(body.url as string)
    } finally {
      setFeedBusy(false)
    }
  }

  const setPeriod = (i: number, patch: Partial<Period>) => {
    const next = periods.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
    updateSchoolConfig({ periods: next })
  }
  const addPeriod = () => {
    const last = periods[periods.length - 1]
    const start = last ? last.end : 9 * 60
    updateSchoolConfig({
      periods: [...periods, { name: `Period ${periods.length + 1}`, start, end: start + 50 }],
    })
  }
  const removePeriod = (i: number) =>
    updateSchoolConfig({ periods: periods.filter((_, idx) => idx !== i) })

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">School</h3>
          <label htmlFor="set-name" className="mb-1 block text-xs font-medium text-stone-600">
            School name
          </label>
          <input
            id="set-name"
            className={FIELD}
            value={config.schoolName ?? ''}
            onChange={(e) => updateSchoolConfig({ schoolName: e.target.value || undefined })}
            placeholder="e.g. Northbridge High"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="set-tstart" className="mb-1 block text-xs font-medium text-stone-600">
                Term starts
              </label>
              <input
                id="set-tstart"
                type="date"
                className={FIELD}
                value={config.termStart ?? ''}
                onChange={(e) => updateSchoolConfig({ termStart: e.target.value || undefined })}
              />
            </div>
            <div>
              <label htmlFor="set-tend" className="mb-1 block text-xs font-medium text-stone-600">
                Term ends
              </label>
              <input
                id="set-tend"
                type="date"
                className={FIELD}
                value={config.termEnd ?? ''}
                onChange={(e) => updateSchoolConfig({ termEnd: e.target.value || undefined })}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Fortnightly timetable
          </h3>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={usesWeeks}
              onChange={(e) => {
                setUsesWeeks(e.target.checked)
                if (!e.target.checked) updateSchoolConfig({ weekAnchorMonday: undefined })
              }}
            />
            My school runs a two-week (Week A / Week B) timetable
          </label>
          {usesWeeks && (
            <div className="mt-2">
              <label htmlFor="set-anchor" className="mb-1 block text-xs font-medium text-stone-600">
                Pick any date in a <span className="font-semibold">Week A</span> week
              </label>
              <input
                id="set-anchor"
                type="date"
                className={FIELD}
                value={config.weekAnchorMonday ?? ''}
                onChange={(e) => {
                  if (!e.target.value) return
                  const monday = format(
                    startOfWeek(new Date(`${e.target.value}T00:00`), { weekStartsOn: 1 }),
                    'yyyy-MM-dd',
                  )
                  setWeekAnchor(monday)
                }}
              />
              {config.weekAnchorMonday && (
                <p className="mt-1 text-[11px] text-stone-400">
                  This week is currently <span className="font-semibold">Week {weekLabelFor(new Date(), weekAParity)}</span>.
                </p>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Bell times / periods
            </h3>
            <Button variant="ghost" onClick={addPeriod}>
              <Plus size={13} aria-hidden="true" />
              Add
            </Button>
          </div>
          <ul className="space-y-1.5">
            {periods.map((p, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <input
                  className={`${FIELD} flex-1`}
                  value={p.name}
                  onChange={(e) => setPeriod(i, { name: e.target.value })}
                  aria-label={`Period ${i + 1} name`}
                />
                <input
                  type="time"
                  className={`${FIELD} w-28`}
                  value={toHM(p.start)}
                  onChange={(e) => setPeriod(i, { start: parseHM(e.target.value) })}
                  aria-label={`Period ${i + 1} start`}
                />
                <input
                  type="time"
                  className={`${FIELD} w-28`}
                  value={toHM(p.end)}
                  onChange={(e) => setPeriod(i, { end: parseHM(e.target.value) })}
                  aria-label={`Period ${i + 1} end`}
                />
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => removePeriod(i)}
                  className="rounded-md p-1.5 text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-stone-400">
            Periods power the tap-to-build timetable and tidy time labels.
          </p>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
            <CalendarDays size={13} aria-hidden="true" />
            Calendar
          </h3>
          <p className="mb-2 text-xs text-stone-500">
            Add your timetable to Google or Apple Calendar — subscribing keeps it updated automatically.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                downloadICS({ classes, assessments, weekAParity, untilIso: config.termEnd })
              }
              disabled={classes.length === 0}
            >
              <Download size={14} aria-hidden="true" />
              Download .ics
            </Button>
            {supabase && supabaseFunctionsUrl && (
              <Button variant="primary" onClick={() => void getSubscribeLink()} disabled={feedBusy}>
                <CalendarDays size={14} aria-hidden="true" />
                {feedBusy ? 'Getting link…' : 'Get subscribe link'}
              </Button>
            )}
          </div>
          {feedUrl && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 p-2">
              <input
                readOnly
                value={feedUrl}
                className="min-w-0 flex-1 bg-transparent text-xs text-stone-600 focus:outline-none"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                aria-label="Copy feed URL"
                onClick={() => {
                  void navigator.clipboard.writeText(feedUrl)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
                className="shrink-0 rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                {copied ? <Check size={14} className="text-emerald-600" aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              </button>
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
