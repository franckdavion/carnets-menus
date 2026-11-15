// Maisonnée — Supabase Edge Function google-calendar
// Déployer SANS vérification JWT (Google appelle /callback sans jeton) : supabase functions deploy google-calendar --no-verify-jwt
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET; Supabase defaults: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { originOk } from "../_shared/cors.ts";
import "../_shared/google-reminders.js";

const FALLBACK_HOME = "https://carnets-menus.vercel.app/maison/";
const sbUrl = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const callback = `${sbUrl}/functions/v1/google-calendar/callback`;
const admin = createClient(sbUrl, service, { auth: { persistSession: false } });

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": originOk(origin) ? origin : "https://carnets-menus.vercel.app",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin"
  };
}
function homeFromOrigin(origin: string) {
  if (!originOk(origin)) return FALLBACK_HOME;
  if (origin.includes("github.io")) return FALLBACK_HOME;
  return origin.replace(/\/$/, "") + "/maison/";
}
function safeHome(value: unknown) {
  const s = String(value || "");
  try {
    const u = new URL(s);
    if (!originOk(u.origin)) return FALLBACK_HOME;
    if (!u.pathname.endsWith("/maison/") && u.pathname !== "/maison") return homeFromOrigin(u.origin);
    return s.endsWith("/") ? s : s + "/";
  } catch {
    return FALLBACK_HOME;
  }
}
const json = (req: Request, v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const ub64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const keyPromise = crypto.subtle.importKey("raw", new TextEncoder().encode(clientSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
async function sign(payload: string) { return b64(new Uint8Array(await crypto.subtle.sign("HMAC", await keyPromise, new TextEncoder().encode(payload)))); }
async function userFrom(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(sbUrl, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  return error ? null : data.user;
}
async function exchange(params: URLSearchParams) {
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  const data = await r.json();
  if (!r.ok) throw new Error("Google token exchange failed: " + (data.error || r.status));
  return data;
}
const GR = (globalThis as { MaisonGoogleReminders: {
  normalizeRemindersBody: (body: unknown) => { useDefault: boolean; overrides?: { method: string; minutes: number }[] } | null;
  applyRemindersForAccounts: (opts: unknown) => Promise<{ results: unknown[] }>;
  summarizeReminderResults: (results: unknown[]) => string;
} }).MaisonGoogleReminders;

async function tokenRow(userId: string): Promise<{ refresh_token: string; access_token: string | null; expires_at: string | null; family_reminders: boolean; schemaReady: boolean } | null> {
  const full = await admin.from("google_calendar_tokens").select("refresh_token, access_token, expires_at, family_reminders").eq("user_id", userId).maybeSingle();
  if (!full.error) {
    if (!full.data) return null;
    return { ...full.data, family_reminders: !!full.data.family_reminders, schemaReady: true };
  }
  const basic = await admin.from("google_calendar_tokens").select("refresh_token, access_token, expires_at").eq("user_id", userId).maybeSingle();
  if (basic.error) throw basic.error;
  if (!basic.data) return null;
  return { ...basic.data, family_reminders: false, schemaReady: false };
}

async function googleAccess(userId: string) {
  const row = await tokenRow(userId);
  if (!row?.refresh_token) {
    const err = new Error("not_connected");
    (err as { code?: string; safeMessage?: string }).code = "not_connected";
    (err as { code?: string; safeMessage?: string }).safeMessage = "Google non connecté";
    throw err;
  }
  if (row.access_token && row.expires_at && Date.parse(row.expires_at) > Date.now() + 120000) return row.access_token;
  let t;
  try {
    t = await exchange(new URLSearchParams({ refresh_token: row.refresh_token, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" }));
  } catch {
    const err = new Error("reconnect");
    (err as { code?: string; safeMessage?: string }).code = "reconnect";
    (err as { code?: string; safeMessage?: string }).safeMessage = "à reconnecter";
    throw err;
  }
  const expires_at = new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString();
  await admin.from("google_calendar_tokens").update({ access_token: t.access_token, expires_at, updated_at: new Date().toISOString() }).eq("user_id", userId);
  return t.access_token as string;
}

async function patchEventReminders(userId: string, calendarId: string, eventId: string, reminders: unknown) {
  const token = await googleAccess(userId);
  const path = "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(calendarId) + "/events/" + encodeURIComponent(eventId);
  const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
  const patch = await fetch(path, { method: "PATCH", headers, body: JSON.stringify({ reminders }) });
  if (patch.status === 403) {
    const err = new Error("forbidden");
    (err as { code?: string; safeMessage?: string }).code = "forbidden";
    (err as { code?: string; safeMessage?: string }).safeMessage = "agenda en lecture seule";
    throw err;
  }
  if (!patch.ok) {
    const err = new Error("write_failed");
    (err as { code?: string; safeMessage?: string }).code = "write_failed";
    (err as { code?: string; safeMessage?: string }).safeMessage = "échec Google";
    throw err;
  }
  const read = await fetch(path, { headers: { Authorization: "Bearer " + token } });
  if (!read.ok) return { reminders };
  const event = await read.json();
  return { reminders: event.reminders || reminders };
}

async function householdMembers(userId: string) {
  const { data: me } = await admin.from("household_members").select("household_id").eq("user_id", userId).maybeSingle();
  if (!me) return [];
  const { data: members } = await admin.from("household_members").select("user_id, name").eq("household_id", me.household_id).not("user_id", "is", null);
  const out = [];
  for (const m of members || []) {
    const tok = await tokenRow(m.user_id);
    out.push({
      userId: m.user_id,
      name: m.name,
      hasToken: !!(tok && tok.refresh_token),
      familyReminders: !!(tok && tok.family_reminders),
      schemaReady: !!(tok && tok.schemaReady)
    });
  }
  return out;
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();
  try {
    if (action === "callback") {
      const state = url.searchParams.get("state") || "";
      const [payload, mac] = state.split(".");
      if (!payload || !mac || !(await crypto.subtle.verify("HMAC", await keyPromise, ub64(mac), new TextEncoder().encode(payload)))) return new Response("Invalid state", { status: 400 });
      const s = JSON.parse(new TextDecoder().decode(ub64(payload)));
      const home = safeHome(s.ret);
      if (!s.uid || !s.exp || s.exp < Date.now() || s.exp > Date.now() + 12 * 60e3) return new Response("Expired state", { status: 400 });
      if (url.searchParams.has("error")) return Response.redirect(home + "?google=cancelled", 302);
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });
      let t;
      try { t = await exchange(new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: callback, grant_type: "authorization_code" })); }
      catch (e) { console.error(e); return Response.redirect(home + "?google=error", 302); }
      const { data: old } = await admin.from("google_calendar_tokens").select("refresh_token").eq("user_id", s.uid).maybeSingle();
      const refresh = t.refresh_token || old?.refresh_token;
      if (!refresh) return Response.redirect(home + "?google=missing_refresh", 302);
      const { error } = await admin.from("google_calendar_tokens").upsert({ user_id: s.uid, refresh_token: refresh, access_token: t.access_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() });
      if (error) { console.error(error); return Response.redirect(home + "?google=error", 302); }
      return Response.redirect(home + "?google=connected", 302);
    }
    const user = await userFrom(req);
    if (!user) return json(req, { error: "Unauthorized" }, 401);
    if (action === "start" && req.method === "POST") {
      const ret = homeFromOrigin(req.headers.get("Origin") || "");
      const payload = b64(new TextEncoder().encode(JSON.stringify({ uid: user.id, exp: Date.now() + 10 * 60e3, nonce: crypto.randomUUID(), ret })));
      const state = payload + "." + await sign(payload);
      const params = new URLSearchParams({ client_id: clientId, redirect_uri: callback, response_type: "code", access_type: "offline", prompt: "consent", scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events", include_granted_scopes: "true", state });
      return json(req, { url: "https://accounts.google.com/o/oauth2/v2/auth?" + params });
    }
    if (action === "token" && req.method === "GET") {
      const { data, error } = await admin.from("google_calendar_tokens").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (!data) return json(req, { connected: false });
      if (data.access_token && new Date(data.expires_at).getTime() > Date.now() + 120000) return json(req, { connected: true, access_token: data.access_token, expires_at: data.expires_at });
      let t;
      try { t = await exchange(new URLSearchParams({ refresh_token: data.refresh_token, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" })); }
      catch { return json(req, { connected: false, error: "Reconnect Google required" }); }
      const expires_at = new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString();
      const { error: updateError } = await admin.from("google_calendar_tokens").update({ access_token: t.access_token, expires_at, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      if (updateError) throw updateError;
      return json(req, { connected: true, access_token: t.access_token, expires_at });
    }
    if (action === "disconnect" && req.method === "POST") {
      const { error } = await admin.from("google_calendar_tokens").delete().eq("user_id", user.id);
      if (error) throw error;
      return json(req, { ok: true });
    }
    if (action === "reminders-status" && req.method === "GET") {
      const members = await householdMembers(user.id);
      const me = members.find(m => m.userId === user.id);
      const schemaReady = members.some(m => m.schemaReady) || !!(await tokenRow(user.id))?.schemaReady;
      return json(req, {
        schemaReady,
        me: { familyReminders: !!me?.familyReminders, connected: !!me?.hasToken },
        others: members.filter(m => m.userId !== user.id).map(m => ({
          name: m.name,
          connected: m.hasToken,
          familyReminders: schemaReady && m.familyReminders
        }))
      });
    }
    if (action === "reminders-consent" && req.method === "POST") {
      const row = await tokenRow(user.id);
      if (!row?.schemaReady) return json(req, { error: "schema_pending", schemaReady: false }, 409);
      if (!row.refresh_token) return json(req, { error: "not_connected" }, 400);
      const asked = await req.json().catch(() => ({}));
      const enabled = !!asked.enabled;
      const { error } = await admin.from("google_calendar_tokens").update({ family_reminders: enabled, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      if (error) return json(req, { error: "schema_pending", schemaReady: false }, 409);
      return json(req, { ok: true, familyReminders: enabled });
    }
    if (action === "reminders" && req.method === "POST") {
      const asked = await req.json().catch(() => ({}));
      const calendarId = String(asked.calendarId || "");
      const eventId = String(asked.eventId || "");
      const reminders = GR.normalizeRemindersBody(asked.reminders);
      if (!calendarId || !eventId || !reminders) return json(req, { error: "invalid_request" }, 400);
      const members = await householdMembers(user.id);
      const applied = await GR.applyRemindersForAccounts({
        actorUserId: user.id,
        calendarId,
        eventId,
        reminders,
        members,
        patchAndGet: ({ userId, calendarId: cal, eventId: ev, reminders: body }: { userId: string; calendarId: string; eventId: string; reminders: unknown }) =>
          patchEventReminders(userId, cal, ev, body)
      });
      return json(req, { results: applied.results, summary: GR.summarizeReminderResults(applied.results as { ok: boolean; name: string; error?: string }[]) });
    }
    return json(req, { error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json(req, { error: "Internal error" }, 500);
  }
});
