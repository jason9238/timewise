import { useEffect, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import {
  BookOpen,
  ChevronDown,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  NotebookPen,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useNow } from '../../hooks/useNow'
import { useBackdropPhoto } from '../../hooks/useBackdropPhoto'
import { weekLabelFor } from '../../lib/weeks'
import { nextClass, nextStudyBlock, untilLabel } from '../../lib/upNext'

function weatherInfo(code: number): { icon: LucideIcon; label: string } {
  if (code === 0) return { icon: Sun, label: 'Clear' }
  if (code <= 2) return { icon: CloudSun, label: 'Partly cloudy' }
  if (code === 3) return { icon: Cloud, label: 'Overcast' }
  if (code <= 48) return { icon: CloudFog, label: 'Foggy' }
  if (code <= 57) return { icon: CloudDrizzle, label: 'Drizzle' }
  if (code <= 67) return { icon: CloudRain, label: 'Rain' }
  if (code <= 77) return { icon: CloudSnow, label: 'Snow' }
  if (code <= 82) return { icon: CloudRain, label: 'Showers' }
  if (code <= 86) return { icon: CloudSnow, label: 'Snow showers' }
  return { icon: CloudLightning, label: 'Thunderstorm' }
}

type Weather =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ok'; tempC: number; code: number }

function useWeather(): Weather {
  const [weather, setWeather] = useState<Weather>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const fail = () => !cancelled && setWeather({ status: 'unavailable' })

    if (!navigator.geolocation) {
      fail()
      return
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code`,
          )
          const data = await res.json()
          const tempC = data?.current?.temperature_2m
          const code = data?.current?.weather_code
          if (!cancelled && typeof tempC === 'number' && typeof code === 'number') {
            setWeather({ status: 'ok', tempC, code })
          } else {
            fail()
          }
        } catch {
          fail()
        }
      },
      fail,
      { timeout: 10_000, maximumAge: 30 * 60_000 },
    )
    return () => {
      cancelled = true
    }
  }, [])

  return weather
}

function HeroPill({ children }: { children: ReactNode }) {
  return (
    <span className="pill-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/90 shadow-sm">
      {children}
    </span>
  )
}

export function Backdrop() {
  const photo = useBackdropPhoto()
  return (
    <div className="fixed inset-0 -z-10 bg-stone-950" aria-hidden="true">
      <img
        key={photo}
        src={photo}
        alt=""
        className="h-full w-full scale-[1.02] object-cover transition-opacity duration-1000"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/30 via-stone-950/40 to-stone-950/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(12,10,9,0.55)_100%)]" />
    </div>
  )
}

interface Props {
  onScrollDown: () => void
}

export function Hero({ onScrollDown }: Props) {
  const now = useNow()
  const weather = useWeather()
  const classes = useStore((s) => s.classes)
  const tasks = useStore((s) => s.tasks)
  const plan = useStore((s) => s.plan)
  const weekAParity = useStore((s) => s.weekAParity)
  const hasWeeks = classes.some((c) => c.week)

  const upcoming = nextClass(classes, now, weekAParity)
  const study = plan ? nextStudyBlock(plan.blocks, tasks, now) : null

  return (
    <section className="relative flex h-dvh snap-start flex-col items-center justify-center text-white">
      <div className="relative flex flex-col items-center px-6 text-center">
        <p className="font-display text-sm font-medium tracking-[0.35em] text-amber-200/80 uppercase">
          TimeWise
        </p>

        <p className="font-display mt-6 text-[5.5rem] leading-none font-light tracking-tight tabular-nums drop-shadow-lg sm:text-[7rem]">
          {format(now, 'h:mm')}
          <span className="ml-2 align-top text-[1.75rem] font-normal text-white/70 sm:text-[2.25rem]">
            {format(now, 'a')}
          </span>
        </p>

        <p className="mt-4 text-lg font-medium tracking-wide text-white/85 sm:text-xl">
          {format(now, 'EEEE, d MMMM yyyy')}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {weather.status === 'ok' &&
            (() => {
              const { icon: Icon, label } = weatherInfo(weather.code)
              return (
                <HeroPill>
                  <Icon size={16} className="text-amber-200/90" aria-hidden="true" />
                  {Math.round(weather.tempC)}°C · {label}
                </HeroPill>
              )
            })()}
          {weather.status === 'loading' && (
            <span className="pill-glass rounded-full px-4 py-2 text-sm text-white/50">
              Loading weather…
            </span>
          )}
          {hasWeeks && (
            <HeroPill>
              <span className="font-semibold text-amber-200/90">Week {weekLabelFor(now, weekAParity)}</span>
            </HeroPill>
          )}
        </div>

        {(upcoming || study) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
            {upcoming && (
              <HeroPill>
                <BookOpen size={15} className="text-amber-200/80" aria-hidden="true" />
                <span>
                  <span className="font-semibold">{upcoming.slot.subject}</span>{' '}
                  {upcoming.dayLabel || untilLabel(upcoming.minutesUntil)}
                </span>
                {upcoming.slot.room && (
                  <span className="flex items-center gap-1 text-white/60">
                    <MapPin size={12} aria-hidden="true" />
                    {upcoming.slot.room}
                  </span>
                )}
              </HeroPill>
            )}
            {study && (
              <HeroPill>
                <NotebookPen size={15} className="text-amber-200/80" aria-hidden="true" />
                <span>
                  Study: <span className="font-semibold">{study.task.title}</span>{' '}
                  {study.dayLabel || untilLabel(study.minutesUntil)}
                </span>
              </HeroPill>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onScrollDown}
        className="group absolute bottom-10 flex flex-col items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      >
        <span className="tracking-wide">Your dashboard</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 transition group-hover:border-white/40 group-hover:bg-white/10">
          <ChevronDown size={18} className="animate-bounce" aria-hidden="true" />
        </span>
      </button>
    </section>
  )
}
