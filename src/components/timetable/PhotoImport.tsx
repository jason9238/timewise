import { useRef, useState } from 'react'
import { Camera, Check, Loader2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase, supabaseFunctionsUrl } from '../../lib/supabase'
import { fmtRange } from '../../lib/time'
import { WEEKDAYS_SHORT, type ClassSlot, type Weekday, type WeekLabel } from '../../types'
import { Button } from '../ui/Button'

interface ParsedClass {
  subject: string
  day: Weekday
  startMin: number
  endMin: number
  room?: string
  teacher?: string
  week?: WeekLabel
}

/** True when the photo-import backend is available. */
export const photoImportAvailable = supabase !== null && supabaseFunctionsUrl !== null

interface Props {
  onImported?: (count: number) => void
}

export function PhotoImport({ onImported }: Props) {
  const importClasses = useStore((s) => s.importClasses)
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedClass[] | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setBusy(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Could not read the image.'))
        reader.readAsDataURL(file)
      })
      const imageBase64 = dataUrl.split(',')[1]
      const { data } = await supabase!.auth.getSession()
      const res = await fetch(`${supabaseFunctionsUrl}/parse-timetable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ imageBase64, mediaType: file.type || 'image/jpeg' }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body || !Array.isArray(body.classes)) {
        throw new Error(body?.error ?? `Import failed (${res.status}).`)
      }
      if (body.classes.length === 0) {
        setError('Could not read any classes from that image — try a clearer, straight-on photo.')
        return
      }
      setParsed(body.classes as ParsedClass[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import this photo.')
    } finally {
      setBusy(false)
    }
  }

  const confirm = () => {
    if (!parsed) return
    const slots: ClassSlot[] = parsed.map((c) => ({ ...c, id: crypto.randomUUID() }))
    importClasses(slots)
    onImported?.(slots.length)
  }

  if (parsed) {
    return (
      <div>
        <p className="mb-2 text-sm text-stone-600">
          Found <span className="font-semibold">{parsed.length}</span> classes. Importing replaces your
          current timetable.
        </p>
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-2">
          {parsed
            .slice()
            .sort((a, b) => a.day - b.day || a.startMin - b.startMin)
            .map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-stone-700">
                <span className="w-9 shrink-0 font-medium text-stone-500">{WEEKDAYS_SHORT[c.day]}</span>
                <span className="flex-1 truncate">
                  {c.subject}
                  {c.week && <span className="ml-1 text-xs text-stone-400">(Wk {c.week})</span>}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-stone-400">
                  {fmtRange(c.startMin, c.endMin)}
                </span>
              </li>
            ))}
        </ul>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setParsed(null)}>
            Back
          </Button>
          <Button variant="primary" onClick={confirm}>
            <Check size={14} aria-hidden="true" />
            Use these classes
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center transition-colors hover:border-stone-400 disabled:cursor-wait"
      >
        {busy ? (
          <Loader2 size={22} className="animate-spin text-stone-500" aria-hidden="true" />
        ) : (
          <Camera size={22} className="text-stone-400" aria-hidden="true" />
        )}
        <p className="text-sm font-medium text-stone-700">
          {busy ? 'Reading your timetable…' : 'Take or upload a photo of your timetable'}
        </p>
        <p className="text-xs text-stone-400">Claude reads it and fills in your classes</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  )
}
