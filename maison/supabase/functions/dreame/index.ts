// Maisonnée — Dreame Home (aspirateur). Identifiants et tokens côté serveur uniquement.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import aesjs from "https://esm.sh/aes-js@3.1.2";
import md5 from "https://esm.sh/md5@2.3.0";

const FN_REV = "20261031g";

const sbUrl = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(sbUrl, service, { auth: { persistSession: false } });

const ALLOWED = new Set([
  "https://franckdavion.github.io",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
  "http://127.0.0.1:8766",
  "http://localhost:8766"
]);

const REGION_HOSTS: Record<string, string> = {
  eu: "eu.iot.dreame.tech:13267",
  us: "us.iot.dreame.tech:13267",
  cn: "cn.iot.dreame.tech:13267",
  ru: "ru.iot.dreame.tech:13267",
  sg: "sg.iot.dreame.tech:13267",
  in: "in.iot.dreame.tech:13267",
  de: "eu.iot.dreame.tech:13267",
  tw: "cn.iot.dreame.tech:13267"
};

const REGION_DEFAULT_COUNTRY: Record<string, string> = {
  eu: "GB", us: "US", cn: "CN", ru: "RU", sg: "SG", in: "IN", de: "DE", tw: "TW"
};

const OAUTH_BASIC = "Basic ZHJlYW1lX2FwcHYxOkFQXmR2QHpAU1FZVnhOODg=";
const APP_META = "cv=i_829";
const APP_UA = "Dart/3.2 (dart:io)";
const TENANT = "000000";
const PASSWORD_SALT = "RAylYC%fmSKp7%Tq";
const RLC_AES_KEY = "EETjszu*XI5znHsI";
const IOT_PREFIX = 10000;
const FROM_FIELD = "XXXXXX";

const VACUUM_STATE = { siid: 2, piid: 1 };
const BATTERY_LEVEL = { siid: 3, piid: 1 };
const SUCTION_LEVEL = { siid: 4, piid: 4 };
const WATER_VOLUME = { siid: 4, piid: 5 };
const CLEANING_MODE = { siid: 4, piid: 23 };
const MAP_EXTEND_DATA = { siid: 6, piid: 4 };
const CLEANING_PROPERTIES = { siid: 4, piid: 10 };
const ACT_START = { siid: 2, aiid: 1 };
const ACT_STOP = { siid: 4, aiid: 2 };
const ACT_CHARGE = { siid: 3, aiid: 1 };
const ACT_START_CUSTOM = { siid: 4, aiid: 1 };
const ACT_REQUEST_MAP = { siid: 6, aiid: 1 };
const SEGMENT_CLEAN_MODE = 18;

const SUCTION_LABELS = ["Silencieux", "Standard", "Fort", "Turbo"];
const WATER_LABELS = ["", "Faible", "Moyen", "Fort"];
const CLEANING_MODE_LABELS = ["Aspiration", "Serpillière", "Aspiration + serpillière"];

const STATE_LABELS: Record<number, string> = {
  1: "Nettoyage",
  2: "Veille",
  3: "Pause",
  4: "Pause",
  5: "Retour base",
  6: "Charge",
  7: "Lavage sol",
  8: "Séchage serpillière",
  9: "Lavage serpillière",
  10: "Retour station",
  11: "Cartographie",
  12: "Nettoyage",
  13: "Charge terminée",
  14: "Mise à jour",
  17: "Retour (serpillière)",
  18: "Retour (serpillière)",
  20: "Remplissage eau",
  22: "Vidage auto",
  23: "Télécommande",
  28: "Retour vidage",
  30: "Entretien base"
};

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "https://franckdavion.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
const json = (req: Request, v: unknown, status = 200) =>
  new Response(JSON.stringify(typeof v === "object" && v !== null && !Array.isArray(v) ? { ...v as Record<string, unknown>, fn: FN_REV } : v), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store", "X-Maisonnee-Dreame": FN_REV }
  });

async function userFrom(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(sbUrl, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  return error ? null : data.user;
}

async function householdOf(uid: string) {
  const { data, error } = await admin.from("household_members").select("household_id, role").eq("user_id", uid).limit(1);
  if (error || !data?.[0]) return null;
  return data[0];
}

type DreameCred = {
  household_id: string;
  email: string;
  password: string;
  region: string;
  country: string;
  lang: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  uid: string | null;
  device_id: string | null;
  device_name: string | null;
  device_model: string | null;
  map_rooms?: { id: number; name: string }[] | null;
  clean_programs?: DreameProgram[] | null;
};

type DreameProgram = {
  id: string;
  name: string;
  cleaning_mode: number;
  suction: number;
  water: number;
  repeats: number;
  room_ids: number[];
};

type DreameDevice = { did: string; name: string; model: string; online: boolean; battery: number | null; status: number | null };

function hashPassword(plain: string) {
  return md5(plain + PASSWORD_SALT);
}

function buildRlc(region: string, lang: string, country: string) {
  const plain = `${region}|${lang}|${country}`;
  const key = aesjs.utils.utf8.toBytes(RLC_AES_KEY);
  const textBytes = aesjs.utils.utf8.toBytes(plain);
  const padded = aesjs.padding.pkcs7.pad(textBytes);
  const aesEcb = new aesjs.ModeOfOperation.ecb(key);
  return aesjs.utils.hex.fromBytes(aesEcb.encrypt(padded));
}

function dreameHeaders(cred: Pick<DreameCred, "region" | "country" | "lang">, accessToken?: string | null, jsonBody = false) {
  return {
    "user-agent": APP_UA,
    authorization: OAUTH_BASIC,
    "content-type": jsonBody ? "application/json" : "application/x-www-form-urlencoded",
    "dreame-auth": accessToken ? `bearer ${accessToken}` : "bearer",
    "dreame-meta": APP_META,
    "dreame-rlc": buildRlc(cred.region, cred.lang, cred.country),
    "tenant-id": TENANT
  };
}

function hostOf(region: string) {
  return REGION_HOSTS[region] || REGION_HOSTS.eu;
}

function dreameUrl(region: string, path: string) {
  return `https://${hostOf(region)}${path}`;
}

function randomReqId() {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}

class DreameUnreachableError extends Error {
  readonly dreameCode = 80001;
  constructor() {
    super("Le robot ne répond pas aux commandes. La charge affichée vient du cloud Dreame : ouvrez l'app Dreame Home ou réveillez l'aspirateur, puis réessayez.");
    this.name = "DreameUnreachableError";
  }
}
function isUnreachable(e: unknown) {
  return e instanceof DreameUnreachableError || (e instanceof Error && /80001|ne répond pas aux commandes|hors ligne ou injoignable/i.test(e.message));
}

async function dreamePost<T extends { code?: number; msg?: string; error?: string; error_description?: string }>(
  cred: DreameCred,
  url: string,
  headers: Record<string, string>,
  body: string | URLSearchParams,
  ctx: string,
  skipCode = false
): Promise<T> {
  const res = await fetch(url, { method: "POST", headers, body });
  const text = await res.text();
  let parsed: T | null = null;
  if (text) {
    try { parsed = JSON.parse(text) as T; } catch { /* ignore */ }
  }
  if (!res.ok) {
    throw new Error(`${ctx} : ${res.status} ${text.slice(0, 180)}`);
  }
  if (!parsed) throw new Error(`${ctx} : réponse invalide`);
  if (parsed.error || parsed.error_description) {
    throw new Error(`Dreame : ${parsed.error ?? "?"} — ${parsed.error_description ?? "échec connexion"}`);
  }
  if (!skipCode && parsed.code !== undefined && parsed.code !== 0) {
    if (parsed.code === 80001) throw new DreameUnreachableError();
    throw new Error(`${ctx} : ${parsed.msg ?? "code " + parsed.code}`);
  }
  return parsed;
}

async function dreameLogin(cred: Pick<DreameCred, "email" | "password" | "region" | "country" | "lang">) {
  const body = new URLSearchParams({
    grant_type: "password",
    scope: "all",
    platform: "IOS",
    type: "account",
    username: cred.email,
    password: hashPassword(cred.password),
    country: cred.country,
    lang: cred.lang
  });
  const data = await dreamePost<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    uid?: string | number;
    error?: string;
    error_description?: string;
  }>(
    cred as DreameCred,
    dreameUrl(cred.region, "/dreame-auth/oauth/token"),
    dreameHeaders(cred, null, false),
    body,
    "Connexion Dreame",
    true
  );
  if (!data.access_token) throw new Error("Dreame n'a pas renvoyé de jeton d'accès.");
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 7200;
  return {
    access_token: data.access_token,
    refresh_token: typeof data.refresh_token === "string" ? data.refresh_token : null,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    uid: data.uid != null ? String(data.uid) : null
  };
}

async function dreameRefresh(cred: DreameCred) {
  if (!cred.refresh_token) return dreameLogin(cred);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: cred.refresh_token
  });
  const data = await dreamePost<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    uid?: string | number;
    error?: string;
    error_description?: string;
  }>(
    cred,
    dreameUrl(cred.region, "/dreame-auth/oauth/token"),
    dreameHeaders(cred, null, false),
    body,
    "Renouvellement Dreame",
    true
  );
  if (!data.access_token) return dreameLogin(cred);
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 7200;
  return {
    access_token: data.access_token,
    refresh_token: typeof data.refresh_token === "string" ? data.refresh_token : cred.refresh_token,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    uid: data.uid != null ? String(data.uid) : cred.uid
  };
}

async function saveTokens(hid: string, tok: { access_token: string; refresh_token: string | null; expires_at: string; uid: string | null }) {
  await admin.from("household_dreame").update({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    token_expires_at: tok.expires_at,
    uid: tok.uid,
    updated_at: new Date().toISOString()
  }).eq("household_id", hid);
}

async function ensureSession(cred: DreameCred): Promise<DreameCred> {
  const exp = cred.token_expires_at ? Date.parse(cred.token_expires_at) : 0;
  if (cred.access_token && exp > Date.now() + 120_000) return cred;
  const tok = cred.refresh_token && exp > 0
    ? await dreameRefresh(cred).catch(() => dreameLogin(cred))
    : await dreameLogin(cred);
  await saveTokens(cred.household_id, tok);
  return { ...cred, access_token: tok.access_token, refresh_token: tok.refresh_token, token_expires_at: tok.expires_at, uid: tok.uid };
}

function parseDeviceRaw(raw: Record<string, unknown>): DreameDevice {
  const did = String(raw.did ?? "");
  const model = String(raw.model ?? "");
  const name = String(raw.customName || raw.deviceName || model || did);
  let lwtFlag = 0;
  if (typeof raw.property === "string") {
    try {
      const p = JSON.parse(raw.property) as { lwt?: number };
      if (p && typeof p.lwt === "number") lwtFlag = p.lwt;
    } catch { /* ignore */ }
  }
  const online = raw.online === true || raw.lwt === 1 || lwtFlag === 1;
  const battery = typeof raw.battery === "number" ? raw.battery : null;
  const status = typeof raw.latestStatus === "number" ? raw.latestStatus : null;
  return { did, name, model, online, battery, status };
}

async function dreameListDevices(cred: DreameCred): Promise<DreameDevice[]> {
  const session = await ensureSession(cred);
  const data = await dreamePost<{
    data?: { page?: { records?: Record<string, unknown>[] }; records?: Record<string, unknown>[] };
    records?: Record<string, unknown>[];
  }>(
    session,
    dreameUrl(session.region, "/dreame-user-iot/iotuserbind/device/listV2"),
    dreameHeaders(session, session.access_token, true),
    JSON.stringify({
      sharedStatus: 1,
      current: 1,
      size: 100,
      lang: session.lang,
      timestamp: Date.now()
    }),
    "Liste Dreame"
  );
  const records = data.data?.page?.records ?? data.data?.records ?? data.records ?? [];
  return records.map(r => parseDeviceRaw(r));
}

function pickDefaultDevice(devices: DreameDevice[], pickDid?: string | null) {
  const vacuums = devices.filter(d => /vacuum|dreame/i.test(d.model) || d.model.startsWith("dreame."));
  const pool = vacuums.length ? vacuums : devices;
  if (pickDid) {
    const found = pool.find(d => d.did === pickDid) || devices.find(d => d.did === pickDid);
    if (found) return found;
  }
  const d20 = pool.find(d => /d20/i.test(d.model + d.name));
  return d20 || pool[0] || null;
}

function statusLabel(status: number | null, online: boolean) {
  if (!online) return "Hors ligne";
  if (status == null) return "En ligne";
  return STATE_LABELS[status] ?? `État ${status}`;
}

async function dreameSendCommand(cred: DreameCred, did: string, method: string, params: unknown) {
  const session = await ensureSession(cred);
  const id = randomReqId();
  await dreamePost(
    session,
    dreameUrl(session.region, `/dreame-iot-com-${IOT_PREFIX}/device/sendCommand`),
    dreameHeaders(session, session.access_token, true),
    JSON.stringify({
      did,
      id,
      data: { did, id, method, params, from: FROM_FIELD }
    }),
    method
  );
}

type PropRow = { siid: number; piid: number; value?: unknown };

async function dreameGetPropRows(cred: DreameCred, did: string, props: { siid: number; piid: number }[]): Promise<PropRow[]> {
  const params = props.map(p => ({ did, siid: p.siid, piid: p.piid }));
  const session = await ensureSession(cred);
  const id = randomReqId();
  const data = await dreamePost<{
    data?: { result?: PropRow[] };
    result?: PropRow[];
  }>(
    session,
    dreameUrl(session.region, `/dreame-iot-com-${IOT_PREFIX}/device/sendCommand`),
    dreameHeaders(session, session.access_token, true),
    JSON.stringify({
      did,
      id,
      data: { did, id, method: "get_properties", params, from: FROM_FIELD }
    }),
    "Lecture propriétés"
  );
  return Array.isArray(data.data?.result) ? data.data!.result! : (Array.isArray(data.result) ? data.result : []);
}

async function dreameSetPropRows(cred: DreameCred, did: string, props: { siid: number; piid: number; value: unknown }[]) {
  const params = props.map(p => ({ did, siid: p.siid, piid: p.piid, value: p.value }));
  const session = await ensureSession(cred);
  const id = randomReqId();
  await dreamePost(
    session,
    dreameUrl(session.region, `/dreame-iot-com-${IOT_PREFIX}/device/sendCommand`),
    dreameHeaders(session, session.access_token, true),
    JSON.stringify({
      did,
      id,
      data: { did, id, method: "set_properties", params, from: FROM_FIELD }
    }),
    "Réglage aspirateur"
  );
}

function b64ToUtf8(b64: string): string {
  try {
    const bin = atob(b64.replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return b64;
  }
}

function tryParseJson(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  try {
    const j = JSON.parse(s);
    if (j && typeof j === "object" && !Array.isArray(j)) return j as Record<string, unknown>;
  } catch { /* ignore */ }
  try {
    const dec = b64ToUtf8(s);
    const j = JSON.parse(dec);
    if (j && typeof j === "object" && !Array.isArray(j)) return j as Record<string, unknown>;
  } catch { /* ignore */ }
  return null;
}

type DreameMapRoom = { id: number; name: string };

function roomsFromSegInf(segInf: unknown): DreameMapRoom[] {
  if (!segInf || typeof segInf !== "object") return [];
  const out: DreameMapRoom[] = [];
  for (const [k, v] of Object.entries(segInf as Record<string, unknown>)) {
    const id = parseInt(k, 10);
    if (!Number.isFinite(id)) continue;
    let name = `Pièce ${id}`;
    if (v && typeof v === "object") {
      const entry = v as Record<string, unknown>;
      if (typeof entry.name === "string" && entry.name) {
        name = b64ToUtf8(entry.name);
      } else if (typeof entry.roomName === "string" && entry.roomName) {
        name = entry.roomName;
      }
    }
    out.push({ id, name: name.slice(0, 80) || `Pièce ${id}` });
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

function parseMapRoomsFromPropValue(value: unknown): DreameMapRoom[] {
  const json = tryParseJson(value);
  if (json?.seg_inf) return roomsFromSegInf(json.seg_inf);
  if (json && typeof json === "object") {
    for (const key of ["map_extend", "data", "value"]) {
      const nested = tryParseJson((json as Record<string, unknown>)[key]);
      if (nested?.seg_inf) return roomsFromSegInf(nested.seg_inf);
    }
  }
  return [];
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = typeof n === "number" ? n : parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function suctionWaterForClean(cleaningMode: number, suction: number, water: number) {
  const mode = clampInt(cleaningMode, 0, 2, 2);
  const s = clampInt(suction, 0, 3, 1);
  const w = clampInt(water, 1, 3, 2);
  if (mode === 0) return { suction: s, water: 0 };
  if (mode === 1) return { suction: 0, water: w };
  return { suction: s, water: w };
}

function buildSegmentSelects(
  segmentIds: number[],
  repeats: number,
  cleaningMode: number,
  suction: number,
  water: number
) {
  const rep = clampInt(repeats, 1, 3, 1);
  const sw = suctionWaterForClean(cleaningMode, suction, water);
  return segmentIds.map(id => [id, rep, sw.suction, sw.water, 1]);
}

async function dreameReadSettings(cred: DreameCred, did: string) {
  const rows = await dreameGetPropRows(cred, did, [
    VACUUM_STATE,
    BATTERY_LEVEL,
    SUCTION_LEVEL,
    WATER_VOLUME,
    CLEANING_MODE
  ]);
  let status: number | null = null;
  let battery: number | null = null;
  let suction: number | null = null;
  let water: number | null = null;
  let cleaning_mode: number | null = null;
  for (const row of rows) {
    if (row.siid === 2 && row.piid === 1 && typeof row.value === "number") status = row.value;
    if (row.siid === 3 && row.piid === 1 && typeof row.value === "number") battery = row.value;
    if (row.siid === 4 && row.piid === 4 && typeof row.value === "number") suction = row.value;
    if (row.siid === 4 && row.piid === 5 && typeof row.value === "number") water = row.value;
    if (row.siid === 4 && row.piid === 23 && typeof row.value === "number") cleaning_mode = row.value;
  }
  return { status, battery, suction, water, cleaning_mode };
}

async function dreameFetchMapRooms(cred: DreameCred, did: string): Promise<{ rooms: DreameMapRoom[]; hint: string | null; live_ok: boolean }> {
  try {
    await dreameSendCommand(cred, did, "action", {
      did,
      siid: ACT_REQUEST_MAP.siid,
      aiid: ACT_REQUEST_MAP.aiid,
      in: []
    });
    await new Promise(r => setTimeout(r, 1200));
  } catch { /* map may already be cached */ }

  try {
    const rows = await dreameGetPropRows(cred, did, [MAP_EXTEND_DATA, CLEANING_PROPERTIES]);
    let rooms: DreameMapRoom[] = [];
    for (const row of rows) {
      const parsed = parseMapRoomsFromPropValue(row.value);
      if (parsed.length) rooms = parsed;
    }
    if (rooms.length) return { rooms, hint: null, live_ok: true };
    return {
      rooms: [],
      hint: "Carte Dreame introuvable. Lancez une cartographie dans l'app Dreame Home, puis réessayez.",
      live_ok: true
    };
  } catch (e) {
    if (isUnreachable(e)) {
      return {
        rooms: [],
        hint: "Commandes indisponibles : le robot ne répond pas. La charge affichée vient du cloud. Réveillez-le dans Dreame Home, puis rouvrez cette fiche.",
        live_ok: false
      };
    }
    throw e;
  }
}

async function dreameCleanSegments(
  cred: DreameCred,
  did: string,
  segmentIds: number[],
  settings: { cleaning_mode: number; suction: number; water: number; repeats: number }
) {
  const selects = buildSegmentSelects(
    segmentIds,
    settings.repeats,
    settings.cleaning_mode,
    settings.suction,
    settings.water
  );
  await dreameSendCommand(cred, did, "action", {
    did,
    siid: ACT_START_CUSTOM.siid,
    aiid: ACT_START_CUSTOM.aiid,
    in: [
      { piid: 1, value: SEGMENT_CLEAN_MODE },
      { piid: 10, value: JSON.stringify({ selects }) }
    ]
  });
}

function mergeNamedRooms(
  live: { id: number; name: string }[],
  cached: { id: number; name: string }[] | null | undefined
) {
  const names = new Map((cached || []).map(r => [r.id, r.name]));
  return live.map(r => {
    const custom = names.get(r.id);
    return { id: r.id, name: (custom && String(custom).trim()) || r.name };
  });
}

function listPrograms(cred: DreameCred): DreameProgram[] {
  return Array.isArray(cred.clean_programs) ? cred.clean_programs.filter(p => p && p.id && p.name) : [];
}

function normalizeProgram(raw: Record<string, unknown>, fallbackId?: string): DreameProgram | null {
  const name = String(raw.name || "").trim().slice(0, 40);
  if (!name) return null;
  const room_ids = Array.isArray(raw.room_ids)
    ? [...new Set(raw.room_ids.map(n => clampInt(n, 1, 99, 0)).filter(n => n > 0))]
    : [];
  if (!room_ids.length) return null;
  const id = String(raw.id || fallbackId || crypto.randomUUID()).slice(0, 80);
  return {
    id,
    name,
    cleaning_mode: clampInt(raw.cleaning_mode, 0, 2, 2),
    suction: clampInt(raw.suction, 0, 3, 1),
    water: clampInt(raw.water, 1, 3, 2),
    repeats: clampInt(raw.repeats, 1, 3, 1),
    room_ids
  };
}

function settingsLabels(settings: {
  suction: number | null;
  water: number | null;
  cleaning_mode: number | null;
}) {
  const s = settings.suction != null ? clampInt(settings.suction, 0, 3, 1) : null;
  const w = settings.water != null ? clampInt(settings.water, 1, 3, 2) : null;
  const m = settings.cleaning_mode != null ? clampInt(settings.cleaning_mode, 0, 2, 2) : null;
  return {
    suction: s,
    water: w,
    cleaning_mode: m,
    suction_label: s != null ? (SUCTION_LABELS[s] ?? String(s)) : null,
    water_label: w != null ? (WATER_LABELS[w] ?? String(w)) : null,
    cleaning_mode_label: m != null ? (CLEANING_MODE_LABELS[m] ?? String(m)) : null
  };
}

async function getCred(hid: string): Promise<DreameCred | null> {
  const { data, error } = await admin.from("household_dreame").select("*").eq("household_id", hid).maybeSingle();
  if (error) throw error;
  return data as DreameCred | null;
}

async function readState(cred: DreameCred) {
  const did = cred.device_id;
  if (!did) {
    return { connected: true, device_id: null, label: "Choisissez un aspirateur Dreame" };
  }
  const devices = await dreameListDevices(cred);
  const dev = devices.find(d => d.did === did);
  if (!dev) {
    return {
      connected: true,
      device_id: did,
      device_name: cred.device_name || "Dreame",
      online: false,
      battery: null,
      status: null,
      label: "Appareil introuvable sur le compte"
    };
  }
  let status = dev.status;
  let battery = dev.battery;
  let suction: number | null = null;
  let water: number | null = null;
  let cleaning_mode: number | null = null;
  let live_ok = false;
  try {
    const live = await dreameReadSettings(cred, did);
    live_ok = true;
    if (live.status != null) status = live.status;
    if (live.battery != null) battery = live.battery;
    suction = live.suction;
    water = live.water;
    cleaning_mode = live.cleaning_mode;
  } catch (e) {
    live_ok = false;
    if (!isUnreachable(e)) {
      /* keep listV2 values */
    }
  }
  const prefs = settingsLabels({ suction, water, cleaning_mode });
  const charge = battery != null ? `${battery} %` : null;
  const stateBit = statusLabel(status, live_ok || dev.online);
  let label: string;
  if (live_ok) {
    label = charge ? `${stateBit} · ${charge}` : stateBit;
  } else if (charge) {
    label = `Charge ${charge} · commandes indisponibles`;
  } else {
    label = "Commandes indisponibles · réveillez le robot";
  }
  return {
    connected: true,
    device_id: did,
    device_name: dev.name || cred.device_name || "Dreame",
    device_model: dev.model || cred.device_model,
    online: live_ok || dev.online,
    live_ok,
    commandable: live_ok,
    battery,
    status,
    label,
    ...prefs
  };
}

function normalizeRegion(r: unknown) {
  const t = String(r || "eu").toLowerCase();
  return REGION_HOSTS[t] ? t : "eu";
}

function routeAction(url: URL, payload: Record<string, unknown>) {
  const parts = url.pathname.split("/").filter(Boolean);
  let action = parts[parts.length - 1] || "";
  if (action === "dreame" || action === "functions" || action === "v1") {
    action = String(url.searchParams.get("action") || payload.route || "");
  }
  return action;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  try {
    const user = await userFrom(req);
    if (!user) return json(req, { error: "Connexion Maisonnée requise" }, 401);
    const member = await householdOf(user.id);
    if (!member) return json(req, { error: "Vous n'êtes dans aucun foyer" }, 403);
    const hid = member.household_id;
    const url = new URL(req.url);
    const payload = req.method === "POST" ? await req.json().catch(() => ({})) as Record<string, unknown> : {};
    const action = routeAction(url, payload);

    if (action === "status") {
      const cred = await getCred(hid);
      const { data: hh } = await admin.from("households").select("dreame_device_id").eq("id", hid).maybeSingle();
      const rooms = Array.isArray(cred?.map_rooms) ? cred.map_rooms : [];
      return json(req, {
        connected: !!cred,
        device_id: hh?.dreame_device_id ?? cred?.device_id ?? null,
        device_name: cred?.device_name || null,
        rooms,
        programs: cred ? listPrograms(cred) : []
      });
    }

    if (action === "connect" && req.method === "POST") {
      const email = String(payload.email || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const region = normalizeRegion(payload.region);
      const country = String(payload.country || "FR").trim().toUpperCase().slice(0, 2);
      const lang = String(payload.lang || "fr").trim().toLowerCase().slice(0, 5);
      const pickDid = payload.device_id != null ? String(payload.device_id) : null;
      if (!email || !email.includes("@")) return json(req, { error: "Adresse e-mail Dreame invalide" }, 400);
      if (password.length < 4) return json(req, { error: "Mot de passe Dreame invalide" }, 400);
      const probe: DreameCred = {
        household_id: hid,
        email,
        password,
        region,
        country,
        lang,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        uid: null,
        device_id: null,
        device_name: null,
        device_model: null
      };
      const tok = await dreameLogin(probe);
      const withTok = { ...probe, access_token: tok.access_token, refresh_token: tok.refresh_token, token_expires_at: tok.expires_at, uid: tok.uid };
      const devices = await dreameListDevices(withTok);
      if (!devices.length) return json(req, { error: "Aucun appareil sur ce compte Dreame Home." }, 400);
      const device = pickDefaultDevice(devices, pickDid);
      if (!device) return json(req, { error: "Aucun aspirateur sélectionnable." }, 400);
      const { error } = await admin.from("household_dreame").upsert({
        household_id: hid,
        email,
        password,
        region,
        country,
        lang,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        token_expires_at: tok.expires_at,
        uid: tok.uid,
        device_id: device.did,
        device_name: device.name,
        device_model: device.model,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      });
      if (error) throw error;
      await admin.from("households").update({ dreame_device_id: device.did }).eq("id", hid);
      return json(req, {
        connected: true,
        device_id: device.did,
        device_name: device.name,
        devices: devices.map(d => ({ id: d.did, name: d.name, model: d.model, online: d.online }))
      });
    }

    if (action === "disconnect" && req.method === "POST") {
      await admin.from("household_dreame").delete().eq("household_id", hid);
      await admin.from("households").update({ dreame_device_id: null }).eq("id", hid);
      return json(req, { connected: false });
    }

    const cred = await getCred(hid);
    if (!cred) return json(req, { error: "Dreame Home n'est pas relié" }, 400);

    if (action === "devices") {
      const devices = await dreameListDevices(cred);
      return json(req, {
        devices: devices.map(d => ({ id: d.did, name: d.name, model: d.model, online: d.online }))
      });
    }

    if (action === "state") {
      const st = await readState(cred);
      return json(req, st);
    }

    if (action === "rooms") {
      const cached = Array.isArray(cred.map_rooms) ? cred.map_rooms : [];
      const did = cred.device_id;
      if (!did) return json(req, { rooms: cached, hint: cached.length ? null : "Aucun aspirateur Dreame sélectionné", live_ok: false });
      try {
        const map = await dreameFetchMapRooms(cred, did);
        if (map.rooms?.length) {
          const rooms = mergeNamedRooms(map.rooms, cached);
          await admin.from("household_dreame").update({ map_rooms: rooms, updated_at: new Date().toISOString() }).eq("household_id", hid);
          return json(req, { ...map, rooms });
        }
        if (cached.length) return json(req, { rooms: cached, hint: map.hint, live_ok: map.live_ok });
        return json(req, map);
      } catch (e) {
        if (cached.length) return json(req, { rooms: cached, hint: e instanceof Error ? e.message : null, live_ok: false });
        throw e;
      }
    }

    if (action === "command" && req.method === "POST") {
      const did = cred.device_id;
      if (!did) return json(req, { error: "Aucun aspirateur Dreame sélectionné" }, 400);
      const act = String(payload.action || "");
      if (act === "start") {
        await dreameSendCommand(cred, did, "action", { did, siid: ACT_START.siid, aiid: ACT_START.aiid, in: [] });
      } else if (act === "stop") {
        await dreameSendCommand(cred, did, "action", { did, siid: ACT_STOP.siid, aiid: ACT_STOP.aiid, in: [] });
      } else if (act === "dock" || act === "charge") {
        await dreameSendCommand(cred, did, "action", { did, siid: ACT_CHARGE.siid, aiid: ACT_CHARGE.aiid, in: [] });
      } else if (act === "set_prefs") {
        const updates: { siid: number; piid: number; value: unknown }[] = [];
        if (payload.suction !== undefined) {
          updates.push({ siid: 4, piid: 4, value: clampInt(payload.suction, 0, 3, 1) });
        }
        if (payload.water !== undefined) {
          updates.push({ siid: 4, piid: 5, value: clampInt(payload.water, 1, 3, 2) });
        }
        if (payload.cleaning_mode !== undefined) {
          updates.push({ siid: 4, piid: 23, value: clampInt(payload.cleaning_mode, 0, 2, 2) });
        }
        if (!updates.length) return json(req, { error: "Aucun réglage à appliquer" }, 400);
        await dreameSetPropRows(cred, did, updates);
      } else if (act === "clean_room") {
        const segmentId = clampInt(payload.segment_id, 1, 99, 0);
        if (!segmentId) return json(req, { error: "Pièce Dreame invalide" }, 400);
        const cur = await dreameReadSettings(cred, did);
        const cleaning_mode = payload.cleaning_mode !== undefined
          ? clampInt(payload.cleaning_mode, 0, 2, 2)
          : clampInt(cur.cleaning_mode, 0, 2, 2);
        const suction = payload.suction !== undefined
          ? clampInt(payload.suction, 0, 3, 1)
          : clampInt(cur.suction, 0, 3, 1);
        const water = payload.water !== undefined
          ? clampInt(payload.water, 1, 3, 2)
          : clampInt(cur.water, 1, 3, 2);
        const repeats = clampInt(payload.repeats, 1, 3, 1);
        await dreameCleanSegments(cred, did, [segmentId], { cleaning_mode, suction, water, repeats });
      } else if (act === "clean_rooms" || act === "run_program") {
        let cleaning_mode: number;
        let suction: number;
        let water: number;
        let repeats: number;
        let ids: number[];
        if (act === "run_program") {
          const prog = listPrograms(cred).find(p => p.id === String(payload.program_id || ""));
          if (!prog) return json(req, { error: "Programme introuvable" }, 404);
          cleaning_mode = prog.cleaning_mode;
          suction = prog.suction;
          water = prog.water;
          repeats = prog.repeats;
          ids = prog.room_ids;
        } else {
          const cur = await dreameReadSettings(cred, did);
          cleaning_mode = payload.cleaning_mode !== undefined
            ? clampInt(payload.cleaning_mode, 0, 2, 2)
            : clampInt(cur.cleaning_mode, 0, 2, 2);
          suction = payload.suction !== undefined
            ? clampInt(payload.suction, 0, 3, 1)
            : clampInt(cur.suction, 0, 3, 1);
          water = payload.water !== undefined
            ? clampInt(payload.water, 1, 3, 2)
            : clampInt(cur.water, 1, 3, 2);
          repeats = clampInt(payload.repeats, 1, 3, 1);
          ids = Array.isArray(payload.segment_ids)
            ? [...new Set(payload.segment_ids.map(n => clampInt(n, 1, 99, 0)).filter(n => n > 0))]
            : [];
        }
        if (!ids.length) return json(req, { error: "Choisissez au moins une pièce" }, 400);
        await dreameCleanSegments(cred, did, ids, { cleaning_mode, suction, water, repeats });
      } else if (act === "rooms") {
        const map = await dreameFetchMapRooms(cred, did);
        return json(req, map);
      } else return json(req, { error: "Commande inconnue" }, 400);
      await new Promise(r => setTimeout(r, 800));
      const st = await readState(cred);
      return json(req, { ok: true, ...st });
    }

    if (action === "pick_device" && req.method === "POST") {
      const deviceId = String(payload.device_id || "");
      const devices = await dreameListDevices(cred);
      const device = devices.find(d => d.did === deviceId);
      if (!device) return json(req, { error: "Appareil introuvable" }, 404);
      await admin.from("household_dreame").update({
        device_id: device.did,
        device_name: device.name,
        device_model: device.model,
        updated_at: new Date().toISOString()
      }).eq("household_id", hid);
      await admin.from("households").update({ dreame_device_id: device.did }).eq("id", hid);
      return json(req, { ok: true, device_id: device.did, device_name: device.name });
    }

    if (action === "save_rooms" && req.method === "POST") {
      const current = Array.isArray(cred.map_rooms) ? cred.map_rooms : [];
      const incoming = Array.isArray(payload.rooms) ? payload.rooms as { id?: unknown; name?: unknown }[] : [];
      if (!incoming.length && !current.length) return json(req, { error: "Aucune pièce à enregistrer" }, 400);
      const byId = new Map(current.map(r => [r.id, r]));
      for (const row of incoming) {
        const id = clampInt(row.id, 1, 99, 0);
        const name = String(row.name || "").trim().slice(0, 40);
        if (!id || !name) continue;
        byId.set(id, { id, name });
      }
      const rooms = [...byId.values()].sort((a, b) => a.id - b.id);
      await admin.from("household_dreame").update({ map_rooms: rooms, updated_at: new Date().toISOString(), updated_by: user.id }).eq("household_id", hid);
      return json(req, { ok: true, rooms });
    }

    if (action === "save_program" && req.method === "POST") {
      const raw = (payload.program && typeof payload.program === "object" ? payload.program : payload) as Record<string, unknown>;
      const prog = normalizeProgram(raw);
      if (!prog) return json(req, { error: "Nommez le programme et choisissez au moins une pièce" }, 400);
      const list = listPrograms(cred);
      const idx = list.findIndex(p => p.id === prog.id);
      if (idx >= 0) list[idx] = prog;
      else {
        if (list.length >= 20) return json(req, { error: "Maximum 20 programmes" }, 400);
        list.push(prog);
      }
      await admin.from("household_dreame").update({ clean_programs: list, updated_at: new Date().toISOString(), updated_by: user.id }).eq("household_id", hid);
      return json(req, { ok: true, program: prog, programs: list });
    }

    if (action === "delete_program" && req.method === "POST") {
      const id = String(payload.id || "");
      const list = listPrograms(cred).filter(p => p.id !== id);
      await admin.from("household_dreame").update({ clean_programs: list, updated_at: new Date().toISOString(), updated_by: user.id }).eq("household_id", hid);
      return json(req, { ok: true, programs: list });
    }

    return json(req, { error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    if (isUnreachable(e)) {
      return json(req, { error: e instanceof Error ? e.message : "Commandes indisponibles", live_ok: false, commandable: false }, 409);
    }
    return json(req, { error: e instanceof Error ? e.message : "Erreur serveur Dreame" }, 500);
  }
});
