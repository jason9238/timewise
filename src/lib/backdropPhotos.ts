// Curated landscape photography that shifts with the time of day, so the app
// feels alive from dawn to night. Each 2-hour slot maps to a mood-matched
// image. Stable Unsplash CDN URLs, safe to cache offline.

const SLOT_HOURS = 2
const SLOTS_PER_DAY = 24 / SLOT_HOURS

/** 12 photos, one per 2-hour slot, roughly ordered dawn → day → dusk → night. */
const PHOTOS = [
  // 00:00 — deep night
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1920&q=70',
  // 02:00 — starlit
  'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1920&q=70',
  // 04:00 — pre-dawn blue
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1920&q=70',
  // 06:00 — sunrise
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=70',
  // 08:00 — morning light
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=70',
  // 10:00 — bright forest
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=70',
  // 12:00 — clear midday
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=70',
  // 14:00 — open meadow
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1920&q=70',
  // 16:00 — afternoon hills
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1920&q=70',
  // 18:00 — golden hour
  'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1920&q=70',
  // 20:00 — dusk
  'https://images.unsplash.com/photo-1490682143684-14369e18dce8?auto=format&fit=crop&w=1920&q=70',
  // 22:00 — twilight ridge
  'https://images.unsplash.com/photo-1507400492013-162706c8c05e?auto=format&fit=crop&w=1920&q=70',
]

const slotOf = (date = new Date()) => Math.floor(date.getHours() / SLOT_HOURS) % SLOTS_PER_DAY

/** The backdrop image URL for the current 2-hour slot. */
export function backdropPhotoUrl(date = new Date()): string {
  return PHOTOS[slotOf(date) % PHOTOS.length]
}

/** Milliseconds remaining until the next 2-hour slot begins. */
export function msUntilNextBackdropSlot(date = new Date()): number {
  const next = new Date(date)
  const nextSlotHour = (slotOf(date) + 1) * SLOT_HOURS
  next.setHours(nextSlotHour, 0, 0, 0)
  return next.getTime() - date.getTime()
}
