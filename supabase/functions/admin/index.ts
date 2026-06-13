// Supabase Edge Function (Deno) — account administration for TimeWise.
// Only callers present in public.admins may use it.
//
// Deploy:  supabase functions deploy admin
// (Uses the auto-injected SUPABASE_SERVICE_ROLE_KEY; no extra secrets needed.)
import { createClient } from "npm:@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user: caller } } = await anon.auth.getUser();
    if (!caller) return json({ error: "Not signed in." }, 401);

    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: callerAdmin } = await service
      .from("admins")
      .select("user_id")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!callerAdmin) return json({ error: "Admins only." }, 403);

    const { action, userId, password, makeAdmin } = await req.json();

    switch (action) {
      case "list_users": {
        const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) throw error;
        const { data: admins } = await service.from("admins").select("user_id");
        const adminIds = new Set((admins ?? []).map((a: { user_id: string }) => a.user_id));
        return json({
          users: data.users.map((u) => ({
            id: u.id,
            email: u.email ?? "(no email)",
            createdAt: u.created_at,
            lastSignInAt: u.last_sign_in_at ?? null,
            isAdmin: adminIds.has(u.id),
          })),
        });
      }

      case "delete_user": {
        if (!userId) return json({ error: "userId required." }, 400);
        if (userId === caller.id) return json({ error: "You cannot delete your own account here." }, 400);
        const { error } = await service.auth.admin.deleteUser(userId);
        if (error) throw error;
        return json({ ok: true });
      }

      case "reset_password": {
        if (!userId || typeof password !== "string" || password.length < 6) {
          return json({ error: "userId and a password of at least 6 characters required." }, 400);
        }
        const { error } = await service.auth.admin.updateUserById(userId, { password });
        if (error) throw error;
        return json({ ok: true });
      }

      case "set_admin": {
        if (!userId) return json({ error: "userId required." }, 400);
        if (userId === caller.id && makeAdmin === false) {
          return json({ error: "You cannot remove your own admin access." }, 400);
        }
        if (makeAdmin) {
          const { error } = await service.from("admins").upsert({ user_id: userId });
          if (error) throw error;
        } else {
          const { error } = await service.from("admins").delete().eq("user_id", userId);
          if (error) throw error;
        }
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${String(action)}` }, 400);
    }
  } catch (e) {
    const err = e as { message?: string } | null
    console.error("admin function error:", e)
    return json({ error: err?.message ?? "Admin action failed." }, 500);
  }
});
