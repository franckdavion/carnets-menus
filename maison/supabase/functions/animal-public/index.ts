// Fiche publique d'une médaille QR. JWT désactivé. Aucune table privée exposée à anon.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { originOk as sharedOriginOk } from "../_shared/cors.ts";

/** Dédup consultation / notifications même visiteur (ip_hash) — 2 min, sans bloquer d’autres visiteurs. */
const VIEW_DEDUP_MS = 2 * 60 * 1000;
const NOTIFY_CLAIM_BUCKET_MS = 2 * 60 * 1000;
const BOT = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slackbot|discord|embedly|linkedin|twitterbot|googlebot|bingbot|yandex|duckduck|applebot|semrush|ahrefs|headless|phantom|puppeteer/i;
const TOKEN_RE = /^[a-f0-9]{16,40}$/i;
const APP_HOME = "https://carnets-menus.vercel.app/maison/";

const env = (k: string) => Deno.env.get(k) || "";
const dryPush = () => env("ANIMAL_PUSH_DISABLED") === "1";

function originOk(origin: string) {
  if (!origin) return true;
  if (sharedOriginOk(origin)) return true;
  try {
    const h = new URL(origin).hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1";
  } catch { return false; }
}
function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": originOk(origin) ? (origin || "*") : "https://carnets-menus.vercel.app",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-animal-dry-run",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}
function isBot(ua: string, method: string) {
  if (method === "HEAD") return true;
  return !ua || BOT.test(ua);
}
function phones(pet: Record<string, unknown>) {
  const out: { label: string; n: string }[] = [];
  if (pet.publish_phone && pet.phone) out.push({ label: String(pet.contact_name || "Famille"), n: String(pet.phone) });
  if (pet.publish_phone2 && pet.phone2) out.push({ label: "Second contact", n: String(pet.phone2) });
  if (pet.publish_emergency && pet.phone_emergency) out.push({ label: "Secours", n: String(pet.phone_emergency) });
  return out;
}
function publicPayload(pet: Record<string, unknown>, photo_url: string) {
  return {
    name: pet.name || "",
    species: pet.species || "",
    breed: pet.breed || "",
    sex: pet.sex || "",
    color: pet.color || "",
    signs: pet.signs || "",
    description: pet.description || "",
    message: pet.message_public || "",
    approach: pet.approach_note || "",
    medical: pet.publish_medical ? (pet.medical_note || "") : "",
    vet: pet.publish_vet ? (pet.vet_name || "") : "",
    vet_phone: pet.publish_vet ? (pet.vet_phone || "") : "",
    reward: pet.publish_reward ? (pet.reward || "") : "",
    status: pet.status === "lost" || pet.status === "found" ? pet.status : "ok",
    phones: phones(pet),
    photo_url,
    lost: pet.status === "lost"
  };
}
function finderOf(extra: Record<string, unknown>) {
  const finder_name = String(extra.finder_name || "").trim().slice(0, 60);
  const finder_phone = String(extra.finder_phone || "").replace(/[^\d+().\s-]/g, "").trim().slice(0, 24);
  const out: Record<string, string> = {};
  if (finder_name) out.finder_name = finder_name;
  if (finder_phone) out.finder_phone = finder_phone;
  return out;
}
function pushCopy(kind: string, name: string) {
  const n = name || "l’animal";
  if (kind === "view") return { title: "🐾 Médaille consultée", body: "La médaille de " + n + " vient d’être consultée.", tag: "pet-view", url: "./?v=animaux" };
  if (kind === "found") return { title: "🐾 Signalement", body: n + " a été signalé retrouvé. Une personne a ouvert la fiche et l’a indiqué.", tag: "pet-found", url: "./?v=animaux" };
  if (kind === "location") return { title: "🐾 Position transmise", body: n + " : une position GPS volontaire est disponible.", tag: "pet-gps", url: "./?v=animaux" };
  if (kind === "message") return { title: "🐾 Message", body: "Un message a été laissé pour " + n + ".", tag: "pet-msg", url: "./?v=animaux" };
  return { title: "🐾 Mes animaux", body: "Nouvelle activité pour " + n + ".", tag: "pet", url: "./?v=animaux" };
}
async function sha(s: string) {
  const b = new TextEncoder().encode(s);
  const d = await crypto.subtle.digest("SHA-256", b);
  return Array.from(new Uint8Array(d), x => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const origin = req.headers.get("Origin") || "";
  if (origin && !originOk(origin)) return json(req, { error: "origine refusée" }, 403);

  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  let token = "";
  let action = "view";
  let extra: Record<string, unknown> = {};
  if (req.method === "GET") {
    token = new URL(req.url).searchParams.get("token") || "";
  } else if (req.method === "POST") {
    try { extra = await req.json(); } catch { return json(req, { error: "json" }, 400); }
    token = String(extra.token || "");
    action = String(extra.action || "view");
  } else return json(req, { error: "méthode" }, 405);

  if (!TOKEN_RE.test(token)) return json(req, { error: "médaille inconnue" }, 404);
  if (!["view", "found", "location", "message"].includes(action)) return json(req, { error: "action" }, 400);

  const { data: medal } = await supabase.from("pet_medals").select("id,pet_id,household_id,active,revoked_at").eq("public_token", token).maybeSingle();
  if (!medal || medal.active === false || medal.revoked_at) return json(req, { error: "médaille inactive" }, 404);
  const { data: pet } = await supabase.from("household_pets").select("*").eq("id", medal.pet_id).maybeSingle();
  if (!pet) return json(req, { error: "médaille inconnue" }, 404);

  let photo_url = "";
  if (pet.photo_path) {
    const signed = await supabase.storage.from("household-pets").createSignedUrl(pet.photo_path, 3600);
    photo_url = signed.data?.signedUrl || "";
  }
  const sheet = publicPayload(pet, photo_url);
  const ua = (req.headers.get("user-agent") || "").slice(0, 240);
  const bot = isBot(ua, req.method);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "";
  const ipHash = await sha(token + "|" + ip);
  const skipPushHeader = req.headers.get("x-animal-dry-run") === "1" || dryPush();

  if (action === "view") {
    if (bot) return json(req, { pet: sheet, noted: false, reason: "preview" });
    const since = new Date(Date.now() - VIEW_DEDUP_MS).toISOString();
    const { data: recent } = await supabase.from("pet_events").select("id,created_at").eq("medal_id", medal.id).eq("kind", "view").eq("ip_hash", ipHash).gte("created_at", since).limit(1);
    const first = !(recent && recent.length);
    if (first) {
      const { data: viewEv } = await supabase.from("pet_events").insert({
        household_id: medal.household_id, pet_id: pet.id, medal_id: medal.id,
        kind: "view", ip_hash: ipHash, user_agent: ua, payload: {}
      }).select("id").maybeSingle();
      if (pet.notify_on_view !== false) await notifyHousehold(supabase, medal.household_id, pet.name, "view", skipPushHeader, pet.id, viewEv?.id);
    }
    return json(req, { pet: sheet, noted: first });
  }

  if (bot) return json(req, { error: "requête ignorée" }, 400);
  if (action === "found") {
    const { data: ev } = await supabase.from("pet_events").insert({
      household_id: medal.household_id, pet_id: pet.id, medal_id: medal.id,
      kind: "found", ip_hash: ipHash, user_agent: ua, payload: { note: String(extra.note || "").slice(0, 400), ...finderOf(extra) }
    }).select("id").maybeSingle();
    const quiet = await recentlyNotified(supabase, medal.id, "found", ipHash);
    await notifyHousehold(supabase, medal.household_id, pet.name, "found", skipPushHeader || quiet, pet.id, ev?.id);
    return json(req, { pet: sheet, ok: true, event_id: ev?.id || null });
  }
  if (action === "location") {
    const lat = Number(extra.lat), lng = Number(extra.lng);
    const address = String(extra.address || "").slice(0, 200);
    const hasGps = Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasGps && !address) return json(req, { error: "indiquez une position ou une adresse" }, 400);
    const { data: ev } = await supabase.from("pet_events").insert({
      household_id: medal.household_id, pet_id: pet.id, medal_id: medal.id,
      kind: "location", ip_hash: ipHash, user_agent: ua, payload: { source: extra.source || (hasGps ? "gps" : "manual"), ...finderOf(extra) }
    }).select("id").maybeSingle();
    await supabase.from("pet_sightings").insert({
      household_id: medal.household_id, pet_id: pet.id, event_id: ev?.id || null,
      lat: hasGps ? lat : null, lng: hasGps ? lng : null,
      accuracy: Number.isFinite(Number(extra.accuracy)) ? Math.round(Number(extra.accuracy)) : null,
      address, source: hasGps && extra.source !== "manual" ? "gps" : "manual"
    });
    const quiet = await recentlyNotified(supabase, medal.id, "location", ipHash);
    await notifyHousehold(supabase, medal.household_id, pet.name, "location", skipPushHeader || quiet, pet.id, ev?.id);
    return json(req, { pet: sheet, ok: true });
  }
  if (action === "message") {
    const text = String(extra.message || "").trim().slice(0, 400);
    const finder = finderOf(extra);
    if (text.length < 2 && !finder.finder_name && !finder.finder_phone) return json(req, { error: "message trop court" }, 400);
    const { data: msgEv } = await supabase.from("pet_events").insert({
      household_id: medal.household_id, pet_id: pet.id, medal_id: medal.id,
      kind: "message", ip_hash: ipHash, user_agent: ua, payload: { message: text, ...finder }
    }).select("id").maybeSingle();
    const quiet = await recentlyNotified(supabase, medal.id, "message", ipHash);
    await notifyHousehold(supabase, medal.household_id, pet.name, "message", skipPushHeader || quiet, pet.id, msgEv?.id);
    return json(req, { pet: sheet, ok: true });
  }
  return json(req, { pet: sheet });
});

async function recentlyNotified(supabase: ReturnType<typeof createClient>, medalId: string, kind: string, ipHash: string) {
  const since = new Date(Date.now() - VIEW_DEDUP_MS).toISOString();
  const { data } = await supabase.from("pet_events").select("id").eq("medal_id", medalId).eq("kind", kind).eq("ip_hash", ipHash).gte("created_at", since).limit(2);
  return (data || []).length > 1;
}

const PUSH_OPTS = {
  TTL: 86400,
  urgency: "high" as const,
  contentEncoding: "aes128gcm" as const
};

function parsePushSubscription(raw: unknown): webpush.PushSubscription | null {
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!o || typeof o !== "object") return null;
    const endpoint = (o as { endpoint?: unknown }).endpoint;
    const keys = (o as { keys?: { p256dh?: unknown; auth?: unknown } }).keys;
    if (typeof endpoint !== "string" || !endpoint) return null;
    if (!keys || typeof keys.p256dh !== "string" || !keys.p256dh || typeof keys.auth !== "string" || !keys.auth) return null;
    return o as webpush.PushSubscription;
  } catch {
    return null;
  }
}

function logPetPush(level: "ok" | "err", fields: Record<string, string | number>) {
  const line = JSON.stringify({ pet_push: level, ...fields });
  if (level === "ok") console.log(line);
  else console.error(line);
}

/** Lien PWA Mes animaux → fiche → journal (params lus par app.js). */
function petNotifyDeepPath(petId: string, eventId: string | null | undefined, kind: string) {
  const q = new URLSearchParams({ v: "animaux", pet: petId, log: "1" });
  if (eventId) q.set("event", eventId);
  if (kind === "view") q.set("logviews", "1");
  return "./?" + q.toString();
}

/** Wire Web Push — consultation : url relative + tag distinct ; deep link journal inchangé côté chiffrement. */
function petPushPayload(kind: string, copy: ReturnType<typeof pushCopy>, petId: string, eventId: string | null | undefined) {
  const url = petNotifyDeepPath(petId, eventId, kind);
  if (kind === "view") {
    return JSON.stringify({
      title: copy.title,
      body: copy.body,
      tag: `pet-view-${Date.now()}`,
      url
    });
  }
  return JSON.stringify({ title: copy.title, body: copy.body, tag: copy.tag, url });
}

async function notifyHousehold(
  supabase: ReturnType<typeof createClient>, householdId: string, name: string, kind: string, dry: boolean,
  petId: string, eventId?: string | null
) {
  if (dry) return;
  if (![env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY")].every(Boolean)) return;
  webpush.setVapidDetails(env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
  const { data: members } = await supabase.from("household_members").select("user_id").eq("household_id", householdId).not("user_id", "is", null);
  const copy = pushCopy(kind, name);
  const payload = petPushPayload(kind, copy, petId, eventId);
  for (const m of members || []) {
    const uid = m.user_id as string;
    const { data: prefRow } = await supabase.from("maison_push_prefs").select("prefs").eq("user_id", uid).maybeSingle();
    const prefs = (prefRow && prefRow.prefs) || {};
    if (prefs.animaux === false) continue;
    const { data: subs } = await supabase.from("maison_push_subscriptions").select("id,subscription").eq("user_id", uid);
    if (!subs?.length) continue;
    const bucket = Math.floor(Date.now() / NOTIFY_CLAIM_BUCKET_MS);
    const claim = eventId
      ? `pet:${kind}:${householdId}:${uid}:${eventId}`
      : `pet:${kind}:${householdId}:${uid}:${bucket}`;
    const { error } = await supabase.from("maison_push_deliveries").insert({ id: claim });
    if (error) continue;
    let ok = 0;
    for (const sub of subs) {
      const subscription = parsePushSubscription(sub.subscription);
      if (!subscription) {
        logPetPush("err", { kind, uid, sub_id: sub.id, code: 0, msg: "invalid_subscription" });
        continue;
      }
      try {
        const response = await webpush.sendNotification(subscription, payload, PUSH_OPTS) as { statusCode?: number };
        ok++;
        logPetPush("ok", { kind, uid, sub_id: sub.id, http: Number(response?.statusCode) || 0 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode || 0;
        const msg = String((e as { message?: string }).message || e).slice(0, 160);
        logPetPush("err", { kind, uid, sub_id: sub.id, code, msg });
        if ([404, 410].includes(code)) await supabase.from("maison_push_subscriptions").delete().eq("id", sub.id);
      }
    }
    // Retire un claim « vide » (aucun push accepté par un relais).
    if (!ok) await supabase.from("maison_push_deliveries").delete().eq("id", claim);
  }
}
