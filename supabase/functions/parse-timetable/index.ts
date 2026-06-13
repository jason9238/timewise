// Supabase Edge Function (Deno) — extracts classes from a photo of a timetable
// using Claude vision, so the Anthropic key never reaches the browser.
//
// Deploy:  supabase functions deploy parse-timetable
// Secret:  ANTHROPIC_API_KEY (already set for the schedule function)
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM =
  "You read a photo of a student's school timetable and extract the classes. " +
  "Return every distinct class. day is 0=Monday..6=Sunday. startMin/endMin are minutes from " +
  "midnight (e.g. 9:00am = 540, 3:30pm = 930). Use 24-hour reasoning even if the image shows " +
  "12-hour times. If the timetable is a two-week (Week A / Week B) timetable, set week to 'A' or " +
  "'B'; otherwise omit week. Include room and teacher when visible. Omit lunch/recess/breaks. If " +
  "you cannot read it confidently, return an empty array.";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["classes"],
  properties: {
    classes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["subject", "day", "startMin", "endMin"],
        properties: {
          subject: { type: "string" },
          day: { type: "integer", enum: [0, 1, 2, 3, 4, 5, 6] },
          startMin: { type: "integer" },
          endMin: { type: "integer" },
          room: { type: "string" },
          teacher: { type: "string" },
          week: { type: "string", enum: ["A", "B"] },
        },
      },
    },
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Sign in to use photo import." }, 401);

    const { imageBase64, mediaType } = await req.json();
    if (typeof imageBase64 !== "string" || typeof mediaType !== "string") {
      return json({ error: "imageBase64 and mediaType are required." }, 400);
    }

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: "Extract all classes from this timetable." },
          ],
        },
      ],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "The AI declined this image." }, 502);
    }
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "No classes found." }, 502);
    return new Response(text.text, {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Parsing failed." }, 500);
  }
});
