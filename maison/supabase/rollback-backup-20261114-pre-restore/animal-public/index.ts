// Fiche publique d'une médaille QR. JWT désactivé. Push regroupé 120 s (pet_consult_sessions).
import { createClient } from "npm:@supabase/supabase-js@2";
import { originOk as sharedOriginOk } from "../_shared/cors.ts";
import { flushDueBundles, flushOneSession, PN, pushToHousehold } from "../_shared/pet-push.ts";

const VIEW_GAP_MS = 15 * 60 * 1000;
const BOT = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slackbot|discord|embedly|linkedin|twitterbot|googlebot|bingbot|yandex|duckduck|applebot|semrush|ahrefs|headless|phantom|puppeteer/i;
const TOKEN_RE = /^[a-f0-9]{16,40}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
async function sha(s: string) {
  const b = new TextEncoder().encode(s);
  const d = await crypto.subtle.digest("SHA-256", b);
  return Array.from(new Uint8Array(d), x => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

type Supa = ReturnType<typeof createClient>;

async function resolveSession(
  supabase: Supa,
  medal: Record<string, unknown>,
  pet: Record<string, unknown>,
  ipHash: string,
  ua: string,
  clientSessionId: string
) {
  if (clientSessionId && UUID_RE.test(clientSessionId)) {
    const { data } = await supabase.from("pet_consult_sessions").select("*").eq("id", clientSessionId).eq("medal_id", medal.id).maybeSingle();
    if (data) return data;
  }

  const opened_at = new Date().toISOString();
  const { data: created, error } = await supabase.from("pet_consult_sessions").insert({
    household_id: medal.household_id,
    pet_id: pet.id,
    medal_id: medal.id,
    ip_hash: ipHash,
    user_agent: ua,
    opened_at,
    bundle_due_at: PN.bundleDueAt(opened_at),
    snapshot: PN.emptySnapshot()
  }).select("*").maybeSingle();
  if (error || !created) {
    const msg = error ? `${error.code || "?"}: ${error.message || "insert"}` : "no row returned";
    throw new Error(msg);
  }
  return created;
}

async function updateSessionSnapshot(supabase: Supa, sessionId: string, kind: string, mergeData: Record<string, unknown>) {
  const { data: row } = await supabase.from("pet_consult_sessions").select("snapshot").eq("id", sessionId).maybeSingle();
  const next = PN.mergeSnapshot(row?.snapshot || {}, kind, mergeData);
  await supabase.from("pet_consult_sessions").update({ snapshot: next }).eq("id", sessionId);
  return next;
}

async function afterSessionUpdate(
  supabase: Supa,
  session: Record<string, unknown>,
  pet: Record<string, unknown>,
  previousFp: string,
  newSnap: Record<string, unknown>,
  dry: boolean
) {
  const sessionId = String(session.id);
  if (!session.bundle_sent_at) {
    if (new Date(String(session.bundle_due_at)).getTime() <= Date.now()) {
      await flushOneSession(supabase, { ...session, snapshot: newSnap }, pet, dry);
    }
    return;
  }
  const late = PN.diffLateCopy(String(pet.name || ""), previousFp, newSnap);
  const newFp = PN.snapshotFingerprint(newSnap);
  if (!late || newFp === previousFp) return;
  const suf = "late-" + newFp.slice(0, 12);
  await pushToHousehold(
    supabase,
    String(session.household_id),
    String(session.pet_id),
    sessionId,
    late,
    suf,
    "pet-late:" + sessionId + ":" + newFp.slice(0, 16),
    dry
  );
  await supabase.from("pet_consult_sessions").update({
    snapshot: newSnap,
    last_push_fingerprint: newFp,
    last_push_at: new Date().toISOString()
  }).eq("id", sessionId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const origin = req.headers.get("Origin") || "";
  if (origin && !originOk(origin)) return json(req, { error: "origine refusée" }, 403);

  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const skipPushHeader = req.headers.get("x-animal-dry-run") === "1" || dryPush();

  await flushDueBundles(supabase, skipPushHeader, 25);

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
  const clientSessionId = String(extra.session_id || "");

  if (action === "view") {
    if (bot) return json(req, { pet: sheet, noted: false, reason: "preview" });
    const since = new Date(Date.now() - VIEW_GAP_MS).toISOString();
    const { data: recent } = await supabase.from("pet_events")
      .select("id,session_id")
      .eq("medal_id", medal.id)
      .eq("kind", "view")
      .eq("ip_hash", ipHash)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (recent?.session_id) {
      return json(req, { pet: sheet, noted: false, session_id: recent.session_id, reason: "dedup" });
    }
    let session;
    try {
      session = await resolveSession(supabase, medal, pet, ipHash, ua, clientSessionId);
    } catch (e) {
      if (skipPushHeader) return json(req, { error: "enregistrement échoué", detail: (e as Error).message }, 500);
      return json(req, { error: "enregistrement échoué" }, 500);
    }
    const prevFp = String(session.last_push_fingerprint || PN.snapshotFingerprint(session.snapshot));
    await supabase.from("pet_events").insert({
      household_id: medal.household_id, pet_id: pet.id, medal_id: medal.id,
      kind: "view", ip_hash: ipHash, user_agent: ua, payload: {}, session_id: session.id
    });
    const snap = await updateSessionSnapshot(supabase, String(session.id), "view", { at: session.opened_at || new Date().toISOString() });
    await afterSessionUpdate(supabase, { ...session, snapshot: snap }, pet, prevFp, snap, skipPushHeader);
    return json(req, { pet: sheet, noted: true, session_id: session.id });
  }

  if (bot) return json(req, { error: "requête ignorée" }, 400);

  let session;
  try {
    session = await resolveSession(supabase, medal, pet, ipHash, ua, clientSessionId);
  } catch {
    return json(req, { error: "enregistrement échoué" }, 500);
  }
  const prevFp = String(session.last_push_fingerprint || PN.snapshotFingerprint(session.snapshot));

  if (action === "found") {
    const { data: ev, error: evErr } = await supabase.from("pet_events").insert({
      household_id: medal.household_id, pet_id: pet.id, medal_id: medal.id,
      kind: "found", ip_hash: ipHash, user_agent: ua,
      payload: { note: String(extra.note || "").slice(0, 400), ...finderOf(extra) },
      session_id: session.id
    }).select("id").maybeSingle();
    if (evErr || !ev?.id) return json(req, { error: "enregistrement échoué" }, 500);
    const snap = await updateSessionSnapshot(supabase, String(session.id), "found", { at: new Date().toISOString(), ...finderOf(extra) });
    await afterSessionUpdate(supabase, { ...session, snapshot: snap }, pet, prevFp, snap, skipPushHeader);
    return json(req, { pet: sheet, ok: true, event_id: ev.id, session_id: session.id });
  }

  if (action === "location") {
    const lat = Number(extra.lat), lng = Number(extra.lng);
    const address = String(extra.address || "").slice(0, 200);
    const hasGps = Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasGps && !address) return json(req, { error: "indiquez une position ou une adresse" }, 400);
    const { data: ev, error: evErr } = await supabase.from("pet_events").insert({
      household_id: medal.household_id, pet_id: pet.id, medal_id: medal.id,
      kind: "location", ip_hash: ipHash, user_agent: ua,
      payload: { source: extra.source || (hasGps ? "gps" : "manual"), ...finderOf(extra) },
      session_id: session.id
    }).select("id").maybeSingle();
    if (evErr || !ev?.id) return json(req, { error: "enregistrement échoué" }, 500);
    const { error: siErr } = await supabase.from("pet_sightings").insert({
      household_id: medal.household_id, pet_id: pet.id, event_id: ev.id,
      lat: hasGps ? lat : null, lng: hasGps ? lng : null,
      accuracy: Number.isFinite(Number(extra.accuracy)) ? Math.round(Number(extra.accuracy)) : null,
      address, source: hasGps && extra.source !== "manual" ? "gps" : "manual"
    });
    if (siErr) return json(req, { error: "enregistrement échoué" }, 500);
    const snap = await updateSessionSnapshot(supabase, String(session.id), "location", {
      at: new Date().toISOString(),
      lat: hasGps ? lat : null,
      lng: hasGps ? lng : null,
      accuracy: Number.isFinite(Number(extra.accuracy)) ? Math.round(Number(extra.accuracy)) : null,
      address,
      source: hasGps && extra.source !== "manual" ? "gps" : "manual",
      ...finderOf(extra)
    });
    await afterSessionUpdate(supabase, { ...session, snapshot: snap }, pet, prevFp, snap, skipPushHeader);
    return json(req, { pet: sheet, ok: true, event_id: ev.id, session_id: session.id });
  }

  if (action === "message") {
    const text = String(extra.message || "").trim().slice(0, 400);
    const finder = finderOf(extra);
    if (text.length < 2 && !finder.finder_name && !finder.finder_phone) return json(req, { error: "message trop court" }, 400);
    const { data: ev, error: evErr } = await supabase.from("pet_events").insert({
      household_id: medal.household_id, pet_id: pet.id, medal_id: medal.id,
      kind: "message", ip_hash: ipHash, user_agent: ua,
      payload: { message: text, ...finder },
      session_id: session.id
    }).select("id").maybeSingle();
    if (evErr || !ev?.id) return json(req, { error: "enregistrement échoué" }, 500);
    const snap = await updateSessionSnapshot(supabase, String(session.id), "message", {
      at: new Date().toISOString(),
      message: text,
      ...finder
    });
    await afterSessionUpdate(supabase, { ...session, snapshot: snap }, pet, prevFp, snap, skipPushHeader);
    return json(req, { pet: sheet, ok: true, event_id: ev.id, session_id: session.id });
  }
  return json(req, { pet: sheet });
});