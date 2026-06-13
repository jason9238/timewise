import { useEffect, useState } from 'react'
import { backdropPhotoUrl, msUntilNextBackdropSlot } from '../lib/backdropPhotos'

/** Returns the backdrop URL for the current 2-hour slot; updates when the slot changes. */
export function useBackdropPhoto(): string {
  const [url, setUrl] = useState(() => backdropPhotoUrl())

  useEffect(() => {
    const refresh = () => setUrl(backdropPhotoUrl())
    const schedule = () => {
      refresh()
      return window.setTimeout(schedule, msUntilNextBackdropSlot() + 50)
    }
    const id = window.setTimeout(schedule, msUntilNextBackdropSlot() + 50)
    return () => clearTimeout(id)
  }, [])

  return url
}
