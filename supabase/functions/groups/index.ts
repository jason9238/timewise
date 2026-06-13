// Supabase Edge Function (Deno) — class groups: create/join/leave, shared
// assignments & notes, and a privacy-light "when are we all free" overlap.
// All membership checks run here with the service role.
//
// Deploy:  supabase functions deploy groups
import { createClient } from "npm:@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FreeBlock { day: number; startMin: number; endMin: number }

const service = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

function inviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Intersect free blocks across members, per weekday. */
function overlapFree(perMember: FreeBlock[][]): FreeBlock[] {
  if (perMember.length === 0) return [];
  let common: FreeBlock[] = perMember[0];
  for (let i = 1; i < perMember.length; i++) {
    const next: FreeBlock[] = [];
    for (const a of common) {
      for (const b of perMember[i]) {
        if (a.day !== b.day) continue;
        const start = Math.max(a.startMin, b.startMin);
        const end = Math.min(a.endMin, b.endMin);
        if (end - start >= 15) next.push({ day: a.day, startMin: start, endMin: end });
      }
    }
    common = next;
  }
  return common.sort((a, b) => a.day - b.day || a.startMin - b.startMin);
}

async function loadGroup(svc: ReturnType<typeof service>, groupId: string) {
  const { data: group } = await svc.from("class_groups").select("*").eq("id", groupId).maybeSingle();
  if (!group) return null;
  const { data: members } = await svc
    .from("class_group_members").select("user_id, display_name, role").eq("group_id", groupId);
  const { data: items } = await svc
    .from("shared_items").select("*").eq("group_id", groupId).order("created_at", { ascending: false });
  return { ...group, members: members ?? [], items: items ?? [] };
}

async function isMember(svc: ReturnType<typeof service>, groupId: string, userId: string) {
  const { data } = await svc
    .from("class_group_members").select("user_id").eq("group_id", groupId).eq("user_id", userId).maybeSingle();
  return data !== null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  try {
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: "Sign in to use groups." }, 401);

    const svc = service();
    const { action, groupId, inviteCode: code, displayName, type, payload, itemId } = await req.json();
    const name = (displayName as string | undefined)?.trim() || (user.email ?? "Member").split("@")[0];

    switch (action) {
      case "list": {
        const { data: mine } = await svc
          .from("class_group_members").select("group_id").eq("user_id", user.id);
        const ids = (mine ?? []).map((m) => m.group_id);
        const groups = [];
        for (const id of ids) {
          const g = await loadGroup(svc, id);
          if (g) groups.push(g);
        }
        return json({ groups });
      }

      case "create": {
        if (!name) return json({ error: "Name required." }, 400);
        let codeTry = inviteCode();
        for (let i = 0; i < 5; i++) {
          const { data: clash } = await svc
            .from("class_groups").select("id").eq("invite_code", codeTry).maybeSingle();
          if (!clash) break;
          codeTry = inviteCode();
        }
        const { data: group, error } = await svc
          .from("class_groups")
          .insert({ name: (payload?.name ?? "Group").trim(), subject: payload?.subject ?? null, owner: user.id, invite_code: codeTry })
          .select("id").single();
        if (error) throw error;
        await svc.from("class_group_members").insert({ group_id: group.id, user_id: user.id, display_name: name, role: "owner" });
        return json({ group: await loadGroup(svc, group.id) });
      }

      case "join": {
        const { data: group } = await svc
          .from("class_groups").select("id").eq("invite_code", (code ?? "").toUpperCase()).maybeSingle();
        if (!group) return json({ error: "No group with that code." }, 404);
        await svc.from("class_group_members")
          .upsert({ group_id: group.id, user_id: user.id, display_name: name });
        return json({ group: await loadGroup(svc, group.id) });
      }

      case "leave": {
        await svc.from("class_group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
        // If no members remain, remove the group entirely.
        const { count } = await svc
          .from("class_group_members").select("user_id", { count: "exact", head: true }).eq("group_id", groupId);
        if ((count ?? 0) === 0) await svc.from("class_groups").delete().eq("id", groupId);
        return json({ ok: true });
      }

      case "post": {
        if (!(await isMember(svc, groupId, user.id))) return json({ error: "Not a member." }, 403);
        if (type !== "assignment" && type !== "note") return json({ error: "Bad type." }, 400);
        await svc.from("shared_items")
          .insert({ group_id: groupId, type, payload, created_by: user.id, created_by_name: name });
        return json({ group: await loadGroup(svc, groupId) });
      }

      case "deleteItem": {
        const { data: item } = await svc.from("shared_items").select("group_id, created_by").eq("id", itemId).maybeSingle();
        if (!item) return json({ ok: true });
        const { data: g } = await svc.from("class_groups").select("owner").eq("id", item.group_id).maybeSingle();
        if (item.created_by !== user.id && g?.owner !== user.id) return json({ error: "Not allowed." }, 403);
        await svc.from("shared_items").delete().eq("id", itemId);
        return json({ group: await loadGroup(svc, item.group_id) });
      }

      case "freeCompare": {
        if (!(await isMember(svc, groupId, user.id))) return json({ error: "Not a member." }, 403);
        const { data: members } = await svc
          .from("class_group_members").select("user_id, display_name").eq("group_id", groupId);
        const perMember: FreeBlock[][] = [];
        const contributors: string[] = [];
        const missing: string[] = [];
        for (const m of members ?? []) {
          const { data: row } = await svc.from("user_state").select("data").eq("user_id", m.user_id).maybeSingle();
          const free = (row?.data?.freeBlocks ?? []) as FreeBlock[];
          if (free.length > 0) {
            perMember.push(free);
            contributors.push(m.display_name ?? "Member");
          } else {
            missing.push(m.display_name ?? "Member");
          }
        }
        return json({ overlap: overlapFree(perMember), contributors, missing });
      }

      default:
        return json({ error: `Unknown action: ${String(action)}` }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Group action failed." }, 500);
  }
});
