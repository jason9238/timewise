import { useRef, useState, type DragEvent } from 'react'
import { FileUp, Upload } from 'lucide-react'
import { IcsParseError, parseICS } from '../../lib/ics'
import { useStore } from '../../store/useStore'

interface Props {
  /** Called after a successful import (e.g. to close the containing modal). */
  onImported?: (count: number) => void
}

export function IcsDropzone({ onImported }: Props) {
  const importClasses = useStore((s) => s.importClasses)
  const weekAParity = useStore((s) => s.weekAParity)
  const inputRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    try {
      const { classes, weekAParity: detected } = parseICS(await file.text(), weekAParity)
      if (classes.length === 0) {
        setError('No timed classes found in this file.')
        return
      }
      importClasses(classes, detected)
      onImported?.(classes.length)
    } catch (e) {
      setError(e instanceof IcsParseError ? e.message : 'Could not read this file.')
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setActive(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload .ics timetable file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setActive(true)
        }}
        onDragLeave={() => setActive(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 ${
          active ? 'border-stone-500 bg-stone-100' : 'border-stone-300 bg-stone-50 hover:border-stone-400'
        }`}
      >
        {active ? <FileUp size={22} className="text-stone-500" aria-hidden="true" /> : <Upload size={22} className="text-stone-400" aria-hidden="true" />}
        <p className="text-sm font-medium text-stone-700">Drop your school .ics file here</p>
        <p className="text-xs text-stone-400">or click to browse — exported from your school or university calendar</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
}
