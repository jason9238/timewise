import { useState } from 'react'
import { Bell, BellOff, CalendarPlus, Grid3x3, Trash2, Upload } from 'lucide-react'
import type { View } from '../App'
import { useStore } from '../store/useStore'
import { otherWeek, weekLabelFor } from '../lib/weeks'
import { HeaderBar } from '../components/layout/HeaderBar'
import { TimetableGrid } from '../components/timetable/TimetableGrid'
import { ClassDetailPanel } from '../components/timetable/ClassDetailPanel'
import { IcsDropzone } from '../components/timetable/IcsDropzone'
import { ManualClassForm } from '../components/timetable/ManualClassForm'
import { TimetableBuilder } from '../components/timetable/TimetableBuilder'
import { EmptyState } from '../components/timetable/EmptyState'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

interface Props {
  view: View
  onChangeView: (view: View) => void
}

export function TimetableView({ view, onChangeView }: Props) {
  const classes = useStore((s) => s.classes)
  const clearTimetable = useStore((s) => s.clearTimetable)
  const weekAParity = useStore((s) => s.weekAParity)
  const setThisWeekIs = useStore((s) => s.setThisWeekIs)
  const remindersEnabled = useStore((s) => s.remindersEnabled)
  const setRemindersEnabled = useStore((s) => s.setRemindersEnabled)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showBuild, setShowBuild] = useState(false)

  // Week A/B cycle only kicks in when the timetable actually uses it.
  const hasWeeks = classes.some((c) => c.week)
  const thisWeekLabel = weekLabelFor(new Date(), weekAParity)
  const [viewing, setViewing] = useState<'this' | 'next'>('this')
  const viewedLabel = viewing === 'this' ? thisWeekLabel : otherWeek(thisWeekLabel)
  const visibleClasses = hasWeeks
    ? classes.filter((c) => !c.week || c.week === viewedLabel)
    : classes

  const toggleReminders = async () => {
    if (remindersEnabled) {
      setRemindersEnabled(false)
      return
    }
    if (typeof Notification === 'undefined') {
      window.alert('This browser does not support notifications.')
      return
    }
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
    if (permission === 'granted') {
      setRemindersEnabled(true)
    } else {
      window.alert('Notifications are blocked for this site — allow them in your browser settings to get class reminders.')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <HeaderBar
        title="Weekly Timetable"
        view={view}
        onChangeView={onChangeView}
        actions={
          classes.length > 0 && (
            <>
              <Button
                variant="glass"
                aria-pressed={remindersEnabled}
                title={
                  remindersEnabled
                    ? 'Reminders on — notifies before classes and on due dates while the app is open'
                    : 'Turn on class & due-date reminders'
                }
                aria-label={remindersEnabled ? 'Turn off reminders' : 'Turn on reminders'}
                onClick={() => void toggleReminders()}
              >
                {remindersEnabled ? <Bell size={14} aria-hidden="true" /> : <BellOff size={14} aria-hidden="true" />}
              </Button>
              <Button onClick={() => setShowImport(true)}>
                <Upload size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Import .ics</span>
              </Button>
              <Button onClick={() => setShowBuild(true)}>
                <Grid3x3 size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Build</span>
              </Button>
              <Button onClick={() => setShowAdd(true)}>
                <CalendarPlus size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Add class</span>
              </Button>
              <Button
                variant="glass"
                aria-label="Clear timetable"
                onClick={() => {
                  if (window.confirm('Clear the whole timetable? Linked tasks become general to-dos.')) {
                    clearTimetable()
                  }
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </>
          )
        }
      />

      {hasWeeks && classes.length > 0 && (
        <div className="glass-surface flex shrink-0 items-center justify-between gap-3 px-3 py-2">
          <div role="tablist" aria-label="Timetable week" className="flex gap-0.5 rounded-xl bg-black/20 p-1">
            {(['this', 'next'] as const).map((which) => {
              const label = which === 'this' ? thisWeekLabel : otherWeek(thisWeekLabel)
              return (
                <button
                  key={which}
                  role="tab"
                  type="button"
                  aria-selected={viewing === which}
                  onClick={() => setViewing(which)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 ${
                    viewing === which ? 'bg-white text-stone-900 shadow-sm' : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {which === 'this' ? 'This week' : 'Next week'}
                  <span className={viewing === which ? 'ml-1.5 font-bold' : 'ml-1.5 opacity-60'}>
                    Wk {label}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-white/50">
            <span className="hidden sm:inline">This week is Week {thisWeekLabel}. </span>
            <button
              type="button"
              onClick={() => setThisWeekIs(otherWeek(thisWeekLabel))}
              className="font-medium text-white/80 underline decoration-white/40 underline-offset-2 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Wrong? Switch to Week {otherWeek(thisWeekLabel)}
            </button>
          </p>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
          <EmptyState onAddManually={() => setShowAdd(true)} />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <TimetableGrid classes={visibleClasses} onSelect={setSelectedId} />
        </div>
      )}

      {selectedId && <ClassDetailPanel classId={selectedId} onClose={() => setSelectedId(null)} />}

      {showImport && (
        <Modal title="Import timetable (.ics)" onClose={() => setShowImport(false)}>
          <p className="mb-3 text-sm text-stone-500">
            Importing replaces your current classes. Export the .ics file from your school or university calendar system.
          </p>
          <IcsDropzone onImported={() => setShowImport(false)} />
        </Modal>
      )}

      {showAdd && (
        <Modal title="Add a class" onClose={() => setShowAdd(false)}>
          <ManualClassForm onDone={() => setShowAdd(false)} />
        </Modal>
      )}

      {showBuild && (
        <Modal title="Build your timetable" onClose={() => setShowBuild(false)}>
          <TimetableBuilder />
        </Modal>
      )}
    </div>
  )
}
