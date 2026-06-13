import { useState } from 'react'
import { format, startOfWeek } from 'date-fns'
import { ArrowRight, CalendarPlus, Camera, Check, Clock, School, Sparkles, Upload } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { PhotoImport, photoImportAvailable } from '../timetable/PhotoImport'
import { TimetableBuilder } from '../timetable/TimetableBuilder'
import { IcsDropzone } from '../timetable/IcsDropzone'

const FIELD =
  'w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500'

type CaptureTab = 'photo' | 'build' | 'ics' | null

export function OnboardingWizard() {
  const updateSchoolConfig = useStore((s) => s.updateSchoolConfig)
  const setWeekAnchor = useStore((s) => s.setWeekAnchor)
  const setOnboarded = useStore((s) => s.setOnboarded)
  const loadSample = useStore((s) => s.loadSample)
  const classCount = useStore((s) => s.classes.length)

  const [step, setStep] = useState(0)
  const [schoolName, setSchoolName] = useState('')
  const [usesWeeks, setUsesWeeks] = useState(false)
  const [anchor, setAnchor] = useState('')
  const [capture, setCapture] = useState<CaptureTab>(null)

  const finish = () => setOnboarded(true)

  const saveSchool = () => {
    updateSchoolConfig({ schoolName: schoolName.trim() || undefined })
    if (usesWeeks && anchor) {
      const monday = format(startOfWeek(new Date(`${anchor}T00:00`), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      setWeekAnchor(monday)
    }
    setStep(2)
  }

  return (
    <div className="flex h-dvh items-center justify-center p-4 text-stone-900">
      <div className="frosted-surface w-full max-w-lg rounded-2xl p-6 sm:p-8">
        {/* progress dots */}
        <div className="mb-5 flex items-center justify-center gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-amber-500' : 'w-1.5 bg-stone-300'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950">
              <Clock size={24} aria-hidden="true" />
            </span>
            <h1 className="font-display text-2xl font-medium">Welcome to TimeWise</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
              Your timetable, homework, study planner and grades — in one dashboard that follows you
              across devices. Let's set it up in under a minute.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="ghost" onClick={finish}>
                Skip for now
              </Button>
              <Button variant="primary" onClick={() => setStep(1)}>
                Get started
                <ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-display flex items-center gap-2 text-xl font-medium">
              <School size={18} className="text-amber-600" aria-hidden="true" />
              About your school
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="ob-school" className="mb-1 block text-xs font-medium text-stone-600">
                  School name (optional)
                </label>
                <input
                  id="ob-school"
                  className={FIELD}
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Northbridge High"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={usesWeeks} onChange={(e) => setUsesWeeks(e.target.checked)} />
                My school runs a two-week (Week A / Week B) timetable
              </label>
              {usesWeeks && (
                <div>
                  <label htmlFor="ob-anchor" className="mb-1 block text-xs font-medium text-stone-600">
                    Pick any date in a <span className="font-semibold">Week A</span> week
                  </label>
                  <input
                    id="ob-anchor"
                    type="date"
                    className={FIELD}
                    value={anchor}
                    onChange={(e) => setAnchor(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button variant="primary" onClick={saveSchool} disabled={usesWeeks && !anchor}>
                Next
                <ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-display text-xl font-medium">Add your timetable</h2>
            <p className="mt-1 text-sm text-stone-500">Pick whichever is easiest — you can change it later.</p>
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
                <span className="text-sm font-semibold">Import .ics</span>
              </button>
            </div>
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => loadSample('highschool')}
                className="text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-900"
              >
                or load a sample to explore first
              </button>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)} disabled={classCount === 0}>
                {classCount > 0 ? `Next (${classCount} classes)` : 'Add some classes first'}
                <ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Check size={24} aria-hidden="true" />
            </span>
            <h2 className="font-display text-2xl font-medium">You're all set</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
              {classCount} classes added. Next, try adding homework to a class, set free time in the AI
              Scheduler, or just check your dashboard.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="primary" onClick={finish}>
                <Sparkles size={14} aria-hidden="true" />
                Go to my dashboard
              </Button>
            </div>
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
