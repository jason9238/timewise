import { CalendarPlus, GraduationCap, School } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Button } from '../ui/Button'
import { IcsDropzone } from './IcsDropzone'

interface Props {
  onAddManually: () => void
}

export function EmptyState({ onAddManually }: Props) {
  const loadSample = useStore((s) => s.loadSample)
  return (
    <div className="frosted-surface mx-auto max-w-lg rounded-2xl p-8 sm:p-10">
      <div className="text-center">
        <p className="font-display text-xs font-medium tracking-[0.25em] text-amber-700/70 uppercase">
          Get started
        </p>
        <h2 className="font-display mt-2 text-2xl font-medium text-stone-900">Set up your timetable</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
          Import your school or university calendar, try a sample, or add classes by hand.
        </p>
      </div>
      <div className="mt-6">
        <IcsDropzone />
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
          <CalendarPlus size={14} aria-hidden="true" />
          Add a class manually
        </Button>
      </div>
      <p className="mt-5 text-center text-[11px] text-stone-400">
        Data stays in your browser — nothing is uploaded.
      </p>
    </div>
  )
}
