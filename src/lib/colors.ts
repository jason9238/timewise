import { useMemo } from 'react'
import { useStore } from '../store/useStore'

export interface SubjectPalette {
  bg: string
  border: string
  /** Stronger left-border accent for grid cards. */
  accent: string
  text: string
  /** Secondary text on the colored card. */
  subtext: string
  chip: string
  dot: string
}

// Muted, desaturated deep tones — distinct hues without neon pop, sitting
// calmly on the photo backdrop.
const PALETTES: SubjectPalette[] = [
  /*  0 gold    */ { bg: 'bg-yellow-700', border: 'border-yellow-800', accent: 'border-l-yellow-950', text: 'text-white', subtext: 'text-yellow-100/80', chip: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-700' },
  /*  1 green   */ { bg: 'bg-green-800', border: 'border-green-900', accent: 'border-l-green-950', text: 'text-white', subtext: 'text-green-100/80', chip: 'bg-green-100 text-green-800', dot: 'bg-green-700' },
  /*  2 blue    */ { bg: 'bg-blue-800', border: 'border-blue-900', accent: 'border-l-blue-950', text: 'text-white', subtext: 'text-blue-100/80', chip: 'bg-blue-100 text-blue-800', dot: 'bg-blue-700' },
  /*  3 rose    */ { bg: 'bg-rose-800', border: 'border-rose-900', accent: 'border-l-rose-950', text: 'text-white', subtext: 'text-rose-100/80', chip: 'bg-rose-100 text-rose-800', dot: 'bg-rose-700' },
  /*  4 violet  */ { bg: 'bg-violet-800', border: 'border-violet-900', accent: 'border-l-violet-950', text: 'text-white', subtext: 'text-violet-100/80', chip: 'bg-violet-100 text-violet-800', dot: 'bg-violet-700' },
  /*  5 sienna  */ { bg: 'bg-orange-800', border: 'border-orange-900', accent: 'border-l-orange-950', text: 'text-white', subtext: 'text-orange-100/80', chip: 'bg-orange-100 text-orange-800', dot: 'bg-orange-700' },
  /*  6 teal    */ { bg: 'bg-teal-800', border: 'border-teal-900', accent: 'border-l-teal-950', text: 'text-white', subtext: 'text-teal-100/80', chip: 'bg-teal-100 text-teal-800', dot: 'bg-teal-700' },
  /*  7 plum    */ { bg: 'bg-fuchsia-900', border: 'border-fuchsia-950', accent: 'border-l-fuchsia-950', text: 'text-white', subtext: 'text-fuchsia-100/80', chip: 'bg-fuchsia-100 text-fuchsia-800', dot: 'bg-fuchsia-800' },
  /*  8 olive   */ { bg: 'bg-lime-800', border: 'border-lime-900', accent: 'border-l-lime-950', text: 'text-white', subtext: 'text-lime-100/80', chip: 'bg-lime-100 text-lime-800', dot: 'bg-lime-700' },
  /*  9 maroon  */ { bg: 'bg-red-900', border: 'border-red-950', accent: 'border-l-red-950', text: 'text-white', subtext: 'text-red-100/80', chip: 'bg-red-100 text-red-800', dot: 'bg-red-800' },
  /* 10 cyan    */ { bg: 'bg-cyan-800', border: 'border-cyan-900', accent: 'border-l-cyan-950', text: 'text-white', subtext: 'text-cyan-100/80', chip: 'bg-cyan-100 text-cyan-800', dot: 'bg-cyan-700' },
  /* 11 indigo  */ { bg: 'bg-indigo-800', border: 'border-indigo-900', accent: 'border-l-indigo-950', text: 'text-white', subtext: 'text-indigo-100/80', chip: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-700' },
  /* 12 bronze  */ { bg: 'bg-amber-800', border: 'border-amber-900', accent: 'border-l-amber-950', text: 'text-white', subtext: 'text-amber-100/80', chip: 'bg-amber-100 text-amber-800', dot: 'bg-amber-700' },
  /* 13 pine    */ { bg: 'bg-emerald-900', border: 'border-emerald-950', accent: 'border-l-emerald-950', text: 'text-white', subtext: 'text-emerald-100/80', chip: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-800' },
]

/** Familiar subject → hue conventions (maths is yellow, technology is green, …). */
const PREFERRED: Array<{ re: RegExp; palette: number }> = [
  { re: /math|calculus|algebra|statistic/i, palette: 0 },
  { re: /tech|comput|program|software|ict|coding|engineer/i, palette: 1 },
  { re: /english|literature|writing/i, palette: 2 },
  { re: /science|biolog|chem|physic/i, palette: 6 },
  { re: /history|ancient|modern/i, palette: 5 },
  { re: /geo(graphy)?\b/i, palette: 8 },
  { re: /french|spanish|german|japanese|chinese|italian|language/i, palette: 3 },
  { re: /art|design|photo|drama|media/i, palette: 7 },
  { re: /music|band|choir/i, palette: 4 },
  { re: /\bpe\b|sport|gym|physical ed|health/i, palette: 9 },
  { re: /psych|sociolog|philosoph/i, palette: 11 },
  { re: /econ|business|commerce|account|legal/i, palette: 13 },
]

function hashOf(subject: string): number {
  let hash = 0
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Assigns every distinct subject its own palette: keyword conventions claim
 * their hue first, everyone else takes their hash-preferred slot or the next
 * free one. Colors only repeat once all 14 palettes are in use.
 */
export function buildPaletteMap(subjects: string[]): Map<string, SubjectPalette> {
  const unique = [...new Set(subjects)].sort()
  const map = new Map<string, SubjectPalette>()
  const taken = new Set<number>()

  const claim = (subject: string, wanted: number) => {
    let idx = wanted
    for (let step = 0; step < PALETTES.length && taken.has(idx); step++) {
      idx = (idx + 1) % PALETTES.length
    }
    taken.add(idx)
    map.set(subject, PALETTES[idx])
  }

  const rest: string[] = []
  for (const subject of unique) {
    const pref = PREFERRED.find((p) => p.re.test(subject))
    if (pref) claim(subject, pref.palette)
    else rest.push(subject)
  }
  for (const subject of rest) claim(subject, hashOf(subject) % PALETTES.length)

  return map
}

/** Hash-only fallback for subjects not on the timetable (e.g. deleted classes). */
export function subjectPalette(subject: string): SubjectPalette {
  return PALETTES[hashOf(subject) % PALETTES.length]
}

/** Subject → palette lookup that keeps every timetable subject visually distinct. */
export function useSubjectPalette(): (subject: string) => SubjectPalette {
  const classes = useStore((s) => s.classes)
  return useMemo(() => {
    const map = buildPaletteMap(classes.map((c) => c.subject))
    return (subject: string) => map.get(subject) ?? subjectPalette(subject)
  }, [classes])
}
