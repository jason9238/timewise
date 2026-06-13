import { useState } from 'react'
import { ArrowLeft, CalendarPlus, Camera, Check, Clock, Upload } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { DEFAULT_PERIODS } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { PhotoImport, photoImportAvailable } from '../timetable/PhotoImport'
import { TimetableBuilder } from '../timetable/TimetableBuilder'
import { IcsDropzone } from '../timetable/IcsDropzone'

type CaptureTab = 'photo' | 'build' | 'ics' | null

/**
 * First-run gate. A brand-new account must explicitly choose to start blank or
 * import — nothing is seeded silently, and it cannot be dismissed by clicking
 * away (it is a full-screen step, not a closeable modal).
 */
export function OnboardingWizard() {
  const updateSchoolConfig = useStore((s) => s.updateSchoolConfig)
  const setOnboarded = useStore((s) => s.setOnboarded)
  const periods = useStore((s) => s.schoolConfig.periods)
  const classCount = useStore((s) => s.classes.length)

  const [mode, setMode] = useState<'choose' | 'import'>('choose')
  const [capture, setCapture] = useState<CaptureTab>(null)

  /** Guarantee the baseline records the rest of the app expects exist. */
  const ensureBaseline = () => {
    if (!periods || periods.length === 0) updateSchoolConfig({ periods: DEFAULT_PERIODS })
  }

  const startBlank = () => {
    ensureBaseline()
    setOnboarded(true)
  }

  const finishImport = () => {
    ensureBaseline()
    setOnboarded(true)
  }

  return (
    <div className="flex h-dvh items-center justify-center p-4 text-stone-900">
      <div className="frosted-surface w-full max-w-md rounded-2xl p-6 sm:p-8">
        {mode === 'choose' ? (
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950">
              <Clock size={24} aria-hidden="true" />
            </span>
            <h1 className="font-display text-2xl font-medium">Welcome to TimeWise</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
              How would you like to begin? You can change this anytime.
            </p>

            <div className="mt-6 space-y-3 text-left">
              <button
                type="button"
                onClick={() => setMode('import')}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-amber-300 hover:bg-amber-50/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Upload size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-stone-900">Import a timetable</span>
                  <span className="block text-xs text-stone-500">
                    Snap a photo, build it, or upload an .ics file
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={startBlank}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
                  <CalendarPlus size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-stone-900">Start without a timetable</span>
                  <span className="block text-xs text-stone-500">
                    Enter a blank app and add things as you go
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setMode('choose')}
              className="mb-3 flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              Back
            </button>
            <h2 className="font-display text-xl font-medium">Import your timetable</h2>
            <p className="mt-1 text-sm text-stone-500">Pick whichever is easiest.</p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {photoImportAvailable && (
                <button
                  type="button"
                  onClick={() => setCapture('photo')}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-4 transition-colors hover:border-stone-300 hover:bg-stone-50"
                >
                  <Camera size={20} className="text-amber-600" aria-hidden="true" />
                  <span className="text-sm font-semibold">Photo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setCapture('build')}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-4 transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                <CalendarPlus size={20} className="text-amber-600" aria-hidden="true" />
                <span className="text-sm font-semibold">Build it</span>
              </button>
              <button
                type="button"
                onClick={() => setCapture('ics')}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-4 transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                <Upload size={20} className="text-amber-600" aria-hidden="true" />
                <span className="text-sm font-semibold">Upload .ics</span>
              </button>
            </div>

            {classCount > 0 && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-sm text-emerald-800">
                  <Check size={15} aria-hidden="true" />
                  {classCount} {classCount === 1 ? 'class' : 'classes'} added
                </span>
                <Button variant="primary" onClick={finishImport}>
                  Continue
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {capture === 'photo' && (
        <Modal title="Import from a photo" onClose={() => setCapture(null)}>
          <PhotoImport onImported={() => setCapture(null)} />
        </Modal>
      )}
      {capture === 'build' && (
        <Modal title="Build your timetable" onClose={() => setCapture(null)}>
          <TimetableBuilder />
        </Modal>
      )}
      {capture === 'ics' && (
        <Modal title="Import timetable (.ics)" onClose={() => setCapture(null)}>
          <IcsDropzone onImported={() => setCapture(null)} />
        </Modal>
      )}
    </div>
  )
}
