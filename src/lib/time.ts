/** 540 → "9 AM", 545 → "9:05 AM". */
export function fmtTime(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  const h12 = ((h + 11) % 12) + 1
  const suffix = h >= 12 ? 'PM' : 'AM'
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export function fmtRange(startMin: number, endMin: number): string {
  return `${fmtTime(startMin)} – ${fmtTime(endMin)}`
}

/** Minutes → "HH:MM" for <input type="time"> values. */
export function toHM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** "HH:MM" → minutes from midnight. Returns NaN for malformed input. */
export function parseHM(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

export function roundUpTo5(min: number): number {
  return Math.ceil(min / 5) * 5
}

/** 90 → "1h 30m", 60 → "1h", 45 → "45m". */
export function durationLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
