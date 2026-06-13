// Supabase Edge Function (Deno) — proxies TimeWise's scheduling request to the
// Claude API so the Anthropic key never reaches the browser.
//
// Deploy:  supabase functions deploy schedule
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// (Type-checked by Deno at deploy time, not by the app's tsc.)
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM =
  "You are a study planner for a student. Input JSON: pending tasks (with optional dueDate " +
  "yyyy-MM-dd and estimatedMin), weekly free-time blocks (day 0=Monday..6=Sunday, minutes from " +
  "midnight), and `today` (yyyy-MM-dd, the student's local date). Produce a concrete 7-day plan " +
  "starting today. Rules: schedule only inside the given free blocks, mapped to concrete dates in " +
  "the next 7 days; never overlap blocks; round every start/end to 5 minutes; prioritise earlier " +
  "due dates and schedule work before its due date; estimate a sensible duration (30-120 min) when " +
  "estimatedMin is missing; split long tasks into chunks of at most 90 minutes with variety across " +
  "days; skip tasks already done. List tasks that cannot fully fit in unscheduledTaskIds. For each " +
  "block, day must match the weekday of date (0=Monday).";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["blocks", "unscheduledTaskIds"],
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["taskId", "date", "day", "startMin", "endMin"],
        properties: {
          taskId: { type: "string" },
          date: { type: "string" },
          day: { type: "integer", enum: [0, 1, 2, 3, 4, 5, 6] },
          startMin: { type: "integer" },
          endMin: { type: "integer" },
        },
      },
    },
    unscheduledTaskIds: { type: "array", items: { type: "string" } },
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    // Only signed-in TimeWise users may spend API credit
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Sign in to use the AI planner." }, 401);

    const input = await req.json();
    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(input) }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "The AI declined this request." }, 502);
    }
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return json({ error: "The AI returned no plan." }, 502);
    }
    return new Response(text.text, {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    const err = e as { message?: string } | null
    console.error("schedule error:", e)
    return json({ error: err?.message ?? "Scheduling failed." }, 500);
  }
});
