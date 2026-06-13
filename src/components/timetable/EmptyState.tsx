import { useState } from 'react'
import { CalendarPlus, Camera, GraduationCap, School, Upload } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { IcsDropzone } from './IcsDropzone'
import { PhotoImport, photoImportAvailable } from './PhotoImport'
import { TimetableBuilder } from './TimetableBuilder'

interface Props {
  onAddManually: () => void
}

type Tab = 'photo' | 'build' | 'ics'

export function EmptyState({ onAddManually }: Props) {
  const loadSample = useStore((s) => s.loadSample)
  const [tab, setTab] = useState<Tab | null>(null)

  return (
    <div className="frosted-surface mx-auto max-w-xl rounded-2xl p-8 sm:p-10">
      <div className="text-center">
        <p className="font-display text-xs font-medium tracking-[0.25em] text-amber-700/70 uppercase">
          Get started
        </p>
        <h2 className="font-display mt-2 text-2xl font-medium text-stone-900">Set up your timetable</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
          Snap a photo of it, build it by hand, or import a calendar file.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {photoImportAvailable && (
          <button
            type="button"
            onClick={() => setTab('photo')}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-4 text-center transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            <Camera size={20} className="text-amber-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-stone-800">Photo</span>
            <span className="text-[11px] text-stone-400">Snap your timetable</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setTab('build')}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-4 text-center transition-colors hover:border-stone-300 hover:bg-stone-50"
        >
          <CalendarPlus size={20} className="text-amber-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-stone-800">Build it</span>
          <span className="text-[11px] text-stone-400">Tap to add classes</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('ics')}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-4 text-center transition-colors hover:border-stone-300 hover:bg-stone-50"
        >
          <Upload size={20} className="text-amber-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-stone-800">Import .ics</span>
          <span className="text-[11px] text-stone-400">From your school calendar</span>
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => loadSample('highschool')}>
          <School size={14} aria-hidden="true" />
          High school sample
        </Button>
        <Button onClick={() => loadSample('university')}>
          <GraduationCap size={14} aria-hidden="true" />
          University sample
        </Button>
        <Button variant="ghost" onClick={onAddManually}>
          Add one class
        </Button>
      </div>

      <p className="mt-5 text-center text-[11px] text-stone-400">
        Your data syncs to your account and stays private to you.
      </p>

      {tab === 'photo' && (
        <Modal title="Import from a photo" onClose={() => setTab(null)}>
          <PhotoImport onImported={() => setTab(null)} />
        </Modal>
      )}
      {tab === 'build' && (
        <Modal title="Build your timetable" onClose={() => setTab(null)}>
          <TimetableBuilder />
        </Modal>
      )}
      {tab === 'ics' && (
        <Modal title="Import timetable (.ics)" onClose={() => setTab(null)}>
          <p className="mb-3 text-sm text-stone-500">
            Importing replaces your current classes. Export the .ics file from your school or
            university calendar system.
          </p>
          <IcsDropzone onImported={() => setTab(null)} />
        </Modal>
      )}
    </div>
  )
}
