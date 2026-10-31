// Maisonnée — commandes Shelly Cloud. La clé reste ici, jamais dans le navigateur.
// JWT vérifié dans la fonction (comme google-calendar) pour laisser passer le preflight CORS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sbUrl = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(sbUrl, service, { auth: { persistSession: false } });
const ALLOWED = new Set([
  "https://franckdavion.github.io",
  "http://127.0.0.1:8765",
  "http://localhost:8765"
]);

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "https://franckdavion.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin"
  };
}
const json = (req: Request, v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });

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

function hostOf(uri: string) {
  const t = String(uri || "").trim().replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]+\.shelly\.cloud$/i.test(t)) return "";
  return t;
}
function keyOf(k: string) {
  const t = String(k || "").trim();
  if (t.length < 20 || t.length > 400 || /\s/.test(t)) return "";
  return t;
}

type CloudDev = { id: string; name: string; type: string; online?: boolean };

function parseList(body: unknown): CloudDev[] {
  const root = body as Record<string, unknown>;
  const data = (root?.data as Record<string, unknown>) || root || {};
  const devices = data.devices ?? root?.devices;
  const out: CloudDev[] = [];
  if (Array.isArray(devices)) {
    for (const v of devices) {
      const d = v as Record<string, unknown>;
      const id = String(d.id || d.device_id || "").toLowerCase();
      if (!id) continue;
      out.push({ id, name: String(d.name || d.label || id), type: String(d.type || d.category || d.code || ""), online: !!(d.online ?? d.cloud_online) });
    }
    return out;
  }
  if (devices && typeof devices === "object") {
    for (const [k, v] of Object.entries(devices as Record<string, unknown>)) {
      const d = (v || {}) as Record<string, unknown>;
      const id = String(d.id || k).toLowerCase();
      out.push({ id, name: String(d.name || d.label || id), type: String(d.type || d.category || d.code || ""), online: !!(d.online ?? d.cloud_online) });
    }
  }
  return out;
}

function parseStatus(body: unknown): CloudDev[] {
  const root = body as Record<string, unknown>;
  const data = (root?.data as Record<string, unknown>) || {};
  const st = data.devices_status || data.devices || root;
  if (!st || typeof st !== "object" || Array.isArray(st)) return parseList(body);
  const out: CloudDev[] = [];
  for (const [k, v] of Object.entries(st as Record<string, unknown>)) {
    const d = (v || {}) as Record<string, unknown>;
    const info = (d._dev_info || {}) as Record<string, unknown>;
    const id = String(info.id || k).toLowerCase();
    out.push({
      id,
      name: String(info.name || id),
      type: String(info.type || info.code || d.type || ""),
      online: !!(info.online ?? d.online ?? d.cloud_online)
    });
  }
  return out;
}

async function shelly(host: string, path: string, auth: string, body?: unknown) {
  const url = `${host}${path}${path.includes("?") ? "&" : "?"}auth_key=${encodeURIComponent(auth)}`;
  const init: RequestInit = { method: "POST", headers: { Accept: "application/json" } };
  if (body !== undefined) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const r = await fetch(url, init);
  const text = await r.text();
  let parsed: unknown = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 400) }; }
  return { ok: r.ok, status: r.status, body: parsed };
}

async function cloudDevices(host: string, auth: string) {
  const listed = await shelly(host, "/interface/device/list", auth);
  if (listed.ok) {
    const rows = parseList(listed.body);
    if (rows.length) return rows;
  }
  const st = await shelly(host, "/device/all_status?show_info=true", auth);
  if (!st.ok) throw new Error(listed.ok ? "Aucun appareil trouvé sur ce compte Shelly." : "Clé ou serveur Shelly refusé.");
  return parseStatus(st.body);
}

function errMsg(body: unknown, fallback: string) {
  const b = body as { error?: string; data?: { messages?: string[] } };
  if (b?.data?.messages?.length) return b.data.messages.join(" ");
  if (b?.error) return String(b.error);
  return fallback;
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function tempFromStatus(status: Record<string, unknown> | null) {
  if (!status) return null;
  const readC = (v: unknown) => {
    const r = asRecord(v);
    if (r && (r.is_valid === false || r.is_valid === 0)) return null;
    const n = num(r?.tC ?? r?.tc ?? r?.t_c);
    if (n == null || n <= -55 || n >= 125) return null;
    if (n === 0 && r?.is_valid !== true) return null;
    return Math.round(n * 10) / 10;
  };
  const ext = asRecord(status.ext_temperature);
  if (ext) {
    for (const v of Object.values(ext)) {
      const t = readC(v);
      if (t != null) return t;
    }
  }
  for (const [k, v] of Object.entries(status)) {
    const m = k.match(/^temperature:(\d+)$/i);
    if (!m) continue;
    const t = readC(v);
    if (t == null) continue;
    if (Number(m[1]) >= 100) return t;
  }
  for (const [k, v] of Object.entries(status)) {
    const m = k.match(/^temperature:(\d+)$/i);
    if (!m || Number(m[1]) >= 100) continue;
    const t = readC(v);
    if (t != null) return t;
  }
  return null;
}
function coverFromStatus(status: Record<string, unknown> | null, channel: number) {
  if (!status) return { online: false, pos: null, state: "", on: null };
  const key = `cover:${channel}`;
  const covers = status.covers as unknown[] | undefined;
  const rollers = status.rollers as unknown[] | undefined;
  const c = (status[key] || (Array.isArray(covers) ? covers[channel] : null) || (Array.isArray(rollers) ? rollers[channel] : null) || status[`roller:${channel}`]) as Record<string, unknown> | undefined;
  const sw = (status[`switch:${channel}`] || (Array.isArray(status.relays) ? (status.relays as Record<string, unknown>[])[channel] : null) || (Array.isArray(status.lights) ? (status.lights as Record<string, unknown>[])[channel] : null)) as Record<string, unknown> | undefined;
  const rawPos = c ? num(c.current_pos ?? c.current_position ?? c.position) : null;
  const pos = rawPos != null && rawPos >= 0 && rawPos <= 100 ? rawPos : null;
  const state = c ? String(c.state || "") : "";
  const on = sw ? (sw.output === true || sw.ison === true) : null;
  return { online: true, pos, state, on };
}
function labelCover(pos: number | null, state: string, online: boolean) {
  const moving = /opening|closing|calibrating|moving/i.test(state);
  if (pos == null) {
    if (!online) return "Hors ligne";
    return moving ? "En mouvement" : "Position inconnue";
  }
  const pct = Math.round(pos);
  const word = pct <= 2 ? "fermé" : "ouvert";
  const text = moving ? "En mouvement · " + pct + " %" : pct + " % · " + word;
  return online ? text : text + " · hors ligne";
}
function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
}
function asList(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v.filter(x => x && typeof x === "object") as Record<string, unknown>[];
  const o = asRecord(v);
  if (!o) return [];
  return Object.entries(o).map(([k, x]) => {
    const r = asRecord(x) || {};
    if (!r.id && !r.device_id) r.id = k;
    return r;
  });
}
function unwrapDevices(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return asList(body);
  const root = asRecord(body);
  if (!root) return [];
  if (Array.isArray(root.data)) return asList(root.data);
  const data = asRecord(root.data) || root;
  for (const key of ["devices", "device_status", "devices_status", "status"]) {
    const list = asList(data[key] ?? root[key]);
    if (list.length) return list;
  }
  if (asList(data).length && (data.id || data.devices)) return asList(data);
  return [];
}
function flagOnline(v: unknown) {
  if (v === true || v === 1 || v === "1" || v === "true" || v === "online") return true;
  if (v === false || v === 0 || v === "0" || v === "false" || v === "offline") return false;
  return null;
}
function deviceOnline(d: Record<string, unknown> | undefined) {
  if (!d) return false;
  const info = asRecord(d._dev_info);
  const flagged = flagOnline(d.online ?? d.cloud_online ?? info?.online ?? info?.cloud_online);
  if (flagged === false) return false;
  return true;
}
function deviceId(d: Record<string, unknown>) {
  const id = String(d.id || d.device_id || (asRecord(d._dev_info)?.id) || "").toLowerCase();
  return /^[a-f0-9]{6,16}$/.test(id) ? id : "";
}
function statusOf(d: Record<string, unknown> | undefined) {
  if (!d) return null;
  const nested = asRecord(d.status);
  const legacy = asRecord(d.device_status);
  if (typeof d.status === "string") {
    try {
      const parsed = asRecord(JSON.parse(d.status));
      if (parsed) return parsed;
    } catch { /* statut déjà objet ou illisible */ }
  }
  if (nested && legacy) return { ...legacy, ...nested };
  if (nested) return nested;
  if (legacy) return legacy;
  if (d["cover:0"] || d["switch:0"] || d.relays || d.covers || d.rollers || d["temperature:0"] || d["temperature:100"] || d.ext_temperature || d.tmp) return d;
  return null;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  try {
    const user = await userFrom(req);
    if (!user) return json(req, { error: "Connexion Maisonnée requise" }, 401);
    const member = await householdOf(user.id);
    if (!member) return json(req, { error: "Vous n'êtes dans aucun foyer" }, 403);
    const hid = member.household_id;
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const payload = req.method === "POST" ? await req.json().catch(() => ({})) as Record<string, unknown> : {};

    if (action === "status") {
      const { data } = await admin.from("household_shelly").select("server_uri, updated_at").eq("household_id", hid).maybeSingle();
      return json(req, { connected: !!data, host: data?.server_uri || null, updated_at: data?.updated_at || null });
    }

    if (action === "connect" && req.method === "POST") {
      const host = hostOf(String(payload.server_uri || ""));
      const auth = keyOf(String(payload.auth_key || ""));
      if (!host) return json(req, { error: "Adresse du serveur invalide (https://….shelly.cloud)" }, 400);
      if (!auth) return json(req, { error: "Clé d'autorisation invalide" }, 400);
      let devices: CloudDev[] = [];
      try { devices = await cloudDevices(host, auth); }
      catch (e) { return json(req, { error: e instanceof Error ? e.message : "Connexion Shelly impossible" }, 400); }
      const { error } = await admin.from("household_shelly").upsert({
        household_id: hid, auth_key: auth, server_uri: host, updated_at: new Date().toISOString(), updated_by: user.id
      });
      if (error) throw error;
      await admin.from("households").update({ shelly_host: host }).eq("id", hid);
      return json(req, { connected: true, host, devices: devices.map(d => ({ id: d.id, name: d.name, type: d.type, online: d.online })) });
    }

    if (action === "disconnect" && req.method === "POST") {
      await admin.from("household_shelly").delete().eq("household_id", hid);
      await admin.from("households").update({ shelly_host: null }).eq("id", hid);
      return json(req, { connected: false });
    }

    const { data: cred, error: credErr } = await admin.from("household_shelly").select("auth_key, server_uri").eq("household_id", hid).maybeSingle();
    if (credErr) throw credErr;
    if (!cred) return json(req, { error: "Shelly Cloud n'est pas encore relié" }, 400);

    if (action === "devices") {
      const devices = await cloudDevices(cred.server_uri, cred.auth_key);
      return json(req, { devices });
    }

    if (action === "state") {
      const { data: rows, error } = await admin.from("shelly_devices").select("id, type, shelly_id, channel").eq("household_id", hid);
      if (error) throw error;
      const linked = (rows || []).filter(x => String(x.shelly_id || "").trim());
      const ids = [...new Set(linked.map(x => String(x.shelly_id).trim().toLowerCase()))];
      const states: Record<string, { online: boolean; pos: number | null; state: string; on: boolean | null; temp: number | null; label: string }> = {};
      if (!ids.length) return json(req, { states });
      const list: Record<string, unknown>[] = [];
      for (let i = 0; i < ids.length; i += 10) {
        const chunk = ids.slice(i, i + 10);
        const got = await shelly(cred.server_uri, "/v2/devices/api/get", cred.auth_key, { ids: chunk, select: ["status"] });
        if (got.ok) list.push(...unwrapDevices(got.body));
      }
      const stAll = await shelly(cred.server_uri, "/device/all_status?show_info=true", cred.auth_key);
      if (stAll.ok) list.push(...unwrapDevices(stAll.body));
      const byId = new Map<string, Record<string, unknown>>();
      for (const d of list) {
        const id = deviceId(d);
        if (!id) continue;
        const prev = byId.get(id);
        if (!prev) { byId.set(id, d); continue; }
        const mergedStatus = { ...(statusOf(prev) || {}), ...(statusOf(d) || {}) };
        byId.set(id, { ...prev, ...d, status: mergedStatus });
      }
      for (const row of linked) {
        const sid = String(row.shelly_id).trim().toLowerCase();
        const d = byId.get(sid);
        const online = deviceOnline(d);
        const st = statusOf(d);
        const info = coverFromStatus(st, Number(row.channel) || 0);
        info.online = online;
        const temp = tempFromStatus(st) ?? tempFromStatus(d);
        const label = row.type === "volet" ? labelCover(info.pos, info.state, online) : (online ? (info.on === true ? "Allumé" : info.on === false ? "Éteint" : "En ligne") : "Hors ligne");
        states[row.id] = { ...info, temp, label };
      }
      return json(req, { states });
    }

    if (action === "command" && req.method === "POST") {
      const id = String(payload.id || "");
      const label = String(payload.action || "");
      const { data: row, error } = await admin.from("shelly_devices").select("*").eq("id", id).eq("household_id", hid).maybeSingle();
      if (error) throw error;
      if (!row) return json(req, { error: "Équipement introuvable" }, 404);
      const sid = String(row.shelly_id || "").trim().toLowerCase();
      if (!sid) return json(req, { error: "Associez un identifiant Shelly à cet équipement" }, 400);
      const pulse = Math.max(0.5, Math.min(30, Number(row.pulse_sec) || 1));
      let path = "";
      let body: Record<string, unknown> = { id: sid, channel: Number(row.channel) || 0 };
      if (row.type === "volet") {
        path = "/v2/devices/api/set/cover";
        const pos = label === "Monter" ? "open" : label === "Descendre" ? "close" : label === "Stop" ? "stop" : "";
        if (!pos) return json(req, { error: "Commande volet inconnue" }, 400);
        body.position = pos;
      } else {
        path = "/v2/devices/api/set/switch";
        if (label === "Allumer") body.on = true;
        else if (label === "Éteindre") body.on = false;
        else if (label === "Piéton" || label === "Voiture" || label === "Ouvrir" || label === "Ouvrir / Fermer") {
          body.on = true;
          body.toggle_after = pulse;
          if (label === "Voiture" && row.channel_b != null) body.channel = Number(row.channel_b);
        } else return json(req, { error: "Commande inconnue" }, 400);
      }
      const r = await shelly(cred.server_uri, path, cred.auth_key, body);
      if (!r.ok) return json(req, { error: errMsg(r.body, "Commande refusée par Shelly Cloud") }, r.status >= 500 ? 502 : 400);
      return json(req, { ok: true });
    }

    return json(req, { error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json(req, { error: "Erreur serveur Shelly" }, 500);
  }
});
