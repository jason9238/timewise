// Supabase Edge Function (Deno) — subscribable .ics calendar feed.
//   GET  /calendar?token=…   → text/calendar for that user (no auth; token is the secret)
//   POST /calendar           → (signed in) ensures a token, returns the feed URL
//
// Deploy:  supabase functions deploy calendar --no-verify-jwt
// (--no-verify-jwt so calendar apps can fetch the GET feed without an auth header.)
import { createClient } from "npm:@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface ClassSlot {
  id: string; subject: string; day: number; startMin: number; endMin: number
  room?: string; teacher?: string; week?: "A" | "B"
}
interface Assessment { id: string; subject: string; title: string; date: string }

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const EPOCH_MONDAY = Date.UTC(1970, 0, 5);
const weekParity = (d: Date) => {
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return (Math.round((monday.getTime() - EPOCH_MONDAY) / MS_WEEK) % 2 + 2) % 2;
};
const labelFor = (d: Date, weekAParity: number) => (weekParity(d) === weekAParity ? "A" : "B");

const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const pad = (n: number) => String(n).padStart(2, "0");
const dtLocal = (d: Date, min: number) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`;
const dateOnly = (iso: string) => iso.replace(/-/g, "");
const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function firstOccurrence(day: number, week: string | undefined, weekAParity: number, from: Date) {
  for (let i = 0; i < 21; i++) {
    const date = new Date(from);
    date.setDate(from.getDate() + i);
    if (((date.getDay() + 6) % 7) !== day) continue;
    if (!week || labelFor(date, weekAParity) === week) return date;
  }
  return from;
}

function buildICS(data: {
  classes?: ClassSlot[]; assessments?: Assessment[]; weekAParity?: number; schoolConfig?: { termEnd?: string }
}): string {
  const classes = data.classes ?? [];
  const assessments = data.assessments ?? [];
  const weekAParity = data.weekAParity === 1 ? 1 : 0;
  const now = new Date();
  const stamp = dtLocal(now, now.getHours() * 60 + now.getMinutes());
  const until = data.schoolConfig?.termEnd ? `;UNTIL=${dateOnly(data.schoolConfig.termEnd)}T235959` : "";
  const L: string[] = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TimeWise//Timetable//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:TimeWise",
  ];
  for (const c of classes) {
    const start = firstOccurrence(c.day, c.week, weekAParity, now);
    const interval = c.week ? 2 : 1;
    const summary = c.week ? `${c.subject} (Week ${c.week})` : c.subject;
    L.push(
      "BEGIN:VEVENT", `UID:class-${c.id}@timewise`, `DTSTAMP:${stamp}`,
      `DTSTART:${dtLocal(start, c.startMin)}`, `DTEND:${dtLocal(start, c.endMin)}`,
      `RRULE:FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${BYDAY[c.day]}${until}`,
      `SUMMARY:${esc(summary)}`,
      ...(c.room ? [`LOCATION:${esc(c.room)}`] : []),
      ...(c.teacher ? [`DESCRIPTION:${esc(c.teacher)}`] : []),
      "END:VEVENT",
    );
  }
  for (const a of assessments) {
    const next = new Date(`${a.date}T00:00`);
    next.setDate(next.getDate() + 1);
    L.push(
      "BEGIN:VEVENT", `UID:assess-${a.id}@timewise`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateOnly(a.date)}`,
      `DTEND;VALUE=DATE:${dateOnly(next.toISOString().slice(0, 10))}`,
      `SUMMARY:${esc(`${a.subject}: ${a.title}`)}`, "END:VEVENT",
    );
  }
  L.push("END:VCALENDAR");
  return L.join("\r\n");
}

const service = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return new Response("Missing token", { status: 400, headers: CORS });
    const svc = service();
    const { data: feed } = await svc.from("calendar_feeds").select("user_id").eq("token", token).maybeSingle();
    if (!feed) return new Response("Unknown feed", { status: 404, headers: CORS });
    const { data: row } = await svc.from("user_state").select("data").eq("user_id", feed.user_id).maybeSingle();
    const ics = buildICS(row?.data ?? {});
    return new Response(ics, {
      headers: { ...CORS, "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "max-age=3600" },
    });
  }

  // POST: ensure a feed token for the signed-in user, return the subscribe URL.
  try {
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Not signed in." }), { status: 401, headers: CORS });
    const svc = service();
    let { data: feed } = await svc.from("calendar_feeds").select("token").eq("user_id", user.id).maybeSingle();
    if (!feed) {
      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const { data: created, error } = await svc
        .from("calendar_feeds").insert({ user_id: user.id, token }).select("token").single();
      if (error) throw error;
      feed = created;
    }
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/calendar?token=${feed.token}`;
    return new Response(JSON.stringify({ url }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    const err = e as { message?: string } | null
    console.error("calendar error:", e)
    return new Response(JSON.stringify({ error: err?.message ?? "Failed." }), {
      status: 500, headers: CORS,
    });
  }
});
