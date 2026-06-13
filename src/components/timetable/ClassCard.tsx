import { MapPin } from 'lucide-react'
import type { ClassSlot } from '../../types'
import { useSubjectPalette } from '../../lib/colors'
import { fmtRange } from '../../lib/time'

/** Solid-color class box used inside a period cell of the week grid. */
export function ClassCard({ slot, onClick }: { slot: ClassSlot; onClick: () => void }) {
  const palette = useSubjectPalette()(slot.subject)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${slot.subject}, ${fmtRange(slot.startMin, slot.endMin)}${slot.room ? `, ${slot.room}` : ''}${slot.week ? `, week ${slot.week} only` : ''}`}
      className={`w-full flex-1 rounded-lg px-2.5 py-1.5 text-left shadow-sm transition hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-600 ${palette.bg} ${palette.text}`}
    >
      <p className="truncate text-xs font-bold leading-snug">
        {slot.subject}
        {slot.week && <span className={`ml-1.5 rounded bg-white/20 px-1 text-[9px] font-semibold ${palette.text}`}>Wk {slot.week}</span>}
      </p>
      <p className={`truncate text-[10px] leading-snug ${palette.subtext}`}>
        {fmtRange(slot.startMin, slot.endMin)}
        {slot.room && ` · ${slot.room}`}
      </p>
    </button>
  )
}

/** Full-width row used by the mobile single-day view. */
export function DayListCard({ slot, onClick }: { slot: ClassSlot; onClick: () => void }) {
  const palette = useSubjectPalette()(slot.subject)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left shadow-sm transition hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-600 ${palette.bg} ${palette.border}`}
    >
      <span className="h-10 w-1 shrink-0 rounded-full bg-white/60" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${palette.text}`}>
          {slot.subject}
          {slot.subjectCode && <span className={`ml-1.5 text-xs font-normal ${palette.subtext}`}>{slot.subjectCode}</span>}
          {slot.week && <span className={`ml-1.5 rounded bg-white/20 px-1 text-[10px] font-semibold ${palette.text}`}>Wk {slot.week}</span>}
        </span>
        <span className={`mt-0.5 flex items-center gap-2 text-xs ${palette.subtext}`}>
          {fmtRange(slot.startMin, slot.endMin)}
          {slot.room && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin size={11} aria-hidden="true" />
              {slot.room}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
