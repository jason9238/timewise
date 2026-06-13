# ⏱ TimeWise — Student Timetable & AI Study Planner

A local-first web app for students: import your school or university timetable from an `.ics` file, attach assignments to classes, declare your free time, and let the smart scheduler turn your to-dos into a conflict-free study plan. Works for dense high-school schedules (8 back-to-back periods a day) and irregular university ones (evening lectures, clashing tutorial options) alike.

**Stack:** React 19 · Vite · TypeScript · Tailwind CSS v4 · Zustand (localStorage persistence) · date-fns · lucide-react

## Setup

Requires Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

All data lives in your browser's localStorage (`timewise-store` key) — no account, no server.

## Features

| View | Highlights |
| --- | --- |
| **Timetable** | Mon–Sun grid with a data-driven time axis, pastel per-subject colors, side-by-side rendering for overlapping classes, condensed cards for short periods, single-day view on mobile. Drag-and-drop `.ics` import (weekly `RRULE`/`BYDAY` aware, teacher & subject-code extraction), manual class entry, and high-school / university sample timetables. |
| **Class details** | Click any class for teacher, room, subject code and time — plus an inline form to attach to-dos/assignments with due dates to that class. |
| **AI Smart Scheduler** | Per-day free-time blocks, all pending tasks (class-linked + general), and a generated chronological study plan: due-date priority, automatic duration estimates, 5-minute rounding, 10-minute breaks, task splitting across windows, and a warning when free time runs out. |

## Plugging in the Claude API

The scheduler runs behind a provider interface (`src/lib/ai/provider.ts`). The default `mockProvider` runs the deterministic algorithm in `src/lib/scheduler.ts` client-side. To use a real LLM, follow the instructions in `src/lib/ai/claudeProvider.ts` (backend proxy + Anthropic SDK with structured outputs) and switch `activeProvider` in `src/lib/ai/index.ts`.

## Project layout

```
src/
├── types.ts            # ClassSlot, Task, FreeBlock, ScheduledBlock
├── store/useStore.ts   # Zustand store, persisted to localStorage
├── lib/
│   ├── ics.ts          # dependency-free .ics parser (pure function)
│   ├── scheduler.ts    # scheduling algorithm (pure function)
│   ├── ai/             # provider interface + mock & Claude providers
│   ├── sampleData.ts   # high-school + university sample timetables
│   └── colors.ts       # deterministic subject → pastel palette
├── components/
│   ├── layout/         # sidebar / bottom-tab navigation
│   ├── timetable/      # grid, cards, detail panel, dropzone, forms
│   ├── tasks/          # task form, list, item
│   ├── scheduler/      # availability editor, plan timeline
│   └── ui/             # button, modal, badge
└── views/              # TimetableView, SchedulerView
```
