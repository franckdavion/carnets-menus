// Maisonnée — Home Assistant (TV Samsung en local, sans API Samsung payante).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sbUrl = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(sbUrl, service, { auth: { persistSession: false } });
const ALLOWED = new Set([
  "https://franckdavion.github.io",
  "http://192.168.0.146:8765",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
  "http://127.0.0.1:8766",
  "http://localhost:8766"
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

type HaCred = {
  household_id: string;
  base_url: string;
  token: string;
  entity_id: string | null;
  entity_name: string | null;
};

function normalizeUrl(raw: string) {
  const u = String(raw || "").trim().replace(/\/+$/, "");
  let parsed: URL;
  try { parsed = new URL(u); } catch { throw new Error("Adresse Home Assistant invalide."); }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("L’adresse doit commencer par https://");
  const host = parsed.hostname.toLowerCase();
  const tailscaleName = host.endsWith(".ts.net");
  if (/^100\./.test(host)) {
    throw new Error("Les adresses Tailscale 100.x ne sont pas joignables depuis internet. Utilisez le nom MagicDNS (https://votre-machine.xxx.ts.net) avec Tailscale Funnel.");
  }
  if (host === "localhost" || host.endsWith(".local") || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
    throw new Error("Cette adresse est locale. Avec Tailscale : activez Funnel et utilisez https://votre-machine.xxx.ts.net (pas 192.168).");
  }
  if (!tailscaleName && parsed.protocol !== "https:") {
    throw new Error("L’adresse Home Assistant doit être en https://");
  }
  return parsed.origin + (parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/+$/, "") : "");
}

async function haFetch(cred: HaCred, path: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(cred.base_url + path, {
      ...init,
      headers: {
        Authorization: "Bearer " + cred.token,
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> || {})
      },
      signal: ctrl.signal
    });
    const text = await r.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 200) }; }
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("Home Assistant ne répond pas assez vite.");
    throw new Error("Impossible de joindre Home Assistant. Avec Tailscale, Funnel doit être activé (URL https://….ts.net visible hors du VPN).");
  } finally {
    clearTimeout(timer);
  }
}

function tvish(id: string, name: string) {
  const s = (id + " " + name).toLowerCase();
  return /tv|samsung|television|oled|qled/.test(s);
}

function parsePlayer(raw: Record<string, unknown>) {
  const entity_id = String(raw.entity_id || "");
  const attrs = (raw.attributes || {}) as Record<string, unknown>;
  const st = String(raw.state || "");
  const power = st === "on" || st === "playing" || st === "paused" ? true : st === "off" || st === "standby" ? false : null;
  const vol = typeof attrs.volume_level === "number" ? Math.round(attrs.volume_level * 100) : null;
  const mute = attrs.is_volume_muted === true ? true : attrs.is_volume_muted === false ? false : null;
  const input = attrs.source != null ? String(attrs.source) : null;
  const name = String(attrs.friendly_name || entity_id || "TV");
  const programTitle = attrs.media_title != null ? String(attrs.media_title) : null;
  const parts: string[] = [];
  if (power === false) parts.push("Éteinte");
  else if (power === true) {
    parts.push("Allumée");
    if (vol != null) parts.push("Vol. " + vol);
    if (input) parts.push(input);
  } else if (st === "unavailable") parts.push("Hors ligne");
  else parts.push("En ligne");
  return {
    power, volume: vol, mute, input, programTitle,
    device_id: entity_id, device_name: name,
    label: parts.join(" · "),
    source: "homeassistant"
  };
}

async function listPlayers(cred: HaCred) {
  const r = await haFetch(cred, "/api/states");
  if (!r.ok) throw new Error(r.status === 401 ? "Jeton Home Assistant refusé." : "Lecture Home Assistant impossible.");
  const items = Array.isArray(r.body) ? r.body as Record<string, unknown>[] : [];
  return items
    .filter(x => String(x.entity_id || "").startsWith("media_player."))
    .map(x => {
      const attrs = (x.attributes || {}) as Record<string, unknown>;
      return {
        id: String(x.entity_id),
        name: String(attrs.friendly_name || x.entity_id),
        state: String(x.state || ""),
        tv: tvish(String(x.entity_id), String(attrs.friendly_name || ""))
      };
    });
}

async function readState(cred: HaCred) {
  if (!cred.entity_id) return { connected: true, device_id: null, device_name: null, label: "Choisissez le téléviseur dans Home Assistant" };
  const r = await haFetch(cred, "/api/states/" + encodeURIComponent(cred.entity_id));
  if (!r.ok) throw new Error(r.status === 401 ? "Jeton Home Assistant refusé." : "État TV introuvable dans Home Assistant.");
  return { connected: true, ...parsePlayer(r.body as Record<string, unknown>) };
}

async function callService(cred: HaCred, domain: string, service: string, data: Record<string, unknown>) {
  const r = await haFetch(cred, `/api/services/${domain}/${service}`, { method: "POST", body: JSON.stringify(data) });
  if (!r.ok) throw new Error("Commande Home Assistant refusée.");
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
    const action = url.pathname.split("/").filter(Boolean).pop() || "";
    const payload = req.method === "POST" ? await req.json().catch(() => ({})) as Record<string, unknown> : {};

    if (action === "status") {
      const { data } = await admin.from("household_homeassistant").select("entity_id, entity_name").eq("household_id", hid).maybeSingle();
      return json(req, {
        connected: !!data,
        device_id: data?.entity_id || null,
        device_name: data?.entity_name || null
      });
    }

    if (action === "connect" && req.method === "POST") {
      const base_url = normalizeUrl(String(payload.url || payload.base_url || ""));
      const token = String(payload.token || "").trim();
      if (token.length < 20) return json(req, { error: "Jeton Home Assistant trop court. Profil → Jetons d’accès longue durée." }, 400);
      const cred: HaCred = { household_id: hid, base_url, token, entity_id: null, entity_name: null };
      const ping = await haFetch(cred, "/api/");
      if (!ping.ok) return json(req, { error: ping.status === 401 ? "Jeton Home Assistant refusé." : "Home Assistant injoignable depuis internet." }, 400);
      const players = await listPlayers(cred);
      const previous = (await admin.from("household_homeassistant").select("entity_id").eq("household_id", hid).maybeSingle()).data;
      const pick = (previous?.entity_id ? players.find(p => p.id === previous.entity_id) : null)
        || players.find(p => p.tv) || players[0] || null;
      const { error } = await admin.from("household_homeassistant").upsert({
        household_id: hid,
        base_url,
        token,
        entity_id: pick?.id || null,
        entity_name: pick?.name || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      });
      if (error) throw error;
      return json(req, { connected: true, device_id: pick?.id || null, device_name: pick?.name || null, devices: players });
    }

    if (action === "disconnect" && req.method === "POST") {
      await admin.from("household_homeassistant").delete().eq("household_id", hid);
      return json(req, { connected: false });
    }

    const { data: cred, error: credErr } = await admin.from("household_homeassistant").select("*").eq("household_id", hid).maybeSingle();
    if (credErr) throw credErr;
    if (!cred) return json(req, { error: "Home Assistant n'est pas relié" }, 400);
    const c = cred as HaCred;

    if (action === "devices") {
      return json(req, { devices: await listPlayers(c) });
    }
    if (action === "state") {
      return json(req, await readState(c));
    }
    if (action === "pick_device" && req.method === "POST") {
      const entity_id = String(payload.device_id || payload.entity_id || "");
      const players = await listPlayers(c);
      const device = players.find(p => p.id === entity_id);
      if (!device) return json(req, { error: "Téléviseur introuvable dans Home Assistant" }, 404);
      await admin.from("household_homeassistant").update({
        entity_id: device.id, entity_name: device.name, updated_at: new Date().toISOString()
      }).eq("household_id", hid);
      return json(req, { ok: true, device_id: device.id, device_name: device.name });
    }
    if (action === "command" && req.method === "POST") {
      const entity_id = c.entity_id;
      if (!entity_id) return json(req, { error: "Aucun téléviseur Home Assistant sélectionné" }, 400);
      const act = String(payload.action || "");
      const data = { entity_id };
      if (act === "power_on") await callService(c, "media_player", "turn_on", data);
      else if (act === "power_off") await callService(c, "media_player", "turn_off", data);
      else if (act === "power_toggle") await callService(c, "media_player", "toggle", data);
      else if (act === "volume_up") await callService(c, "media_player", "volume_up", data);
      else if (act === "volume_down") await callService(c, "media_player", "volume_down", data);
      else if (act === "set_volume") {
        const v = Number(payload.value);
        if (!Number.isFinite(v) || v < 0 || v > 100) return json(req, { error: "Volume invalide (0–100)" }, 400);
        await callService(c, "media_player", "volume_set", { entity_id, volume_level: v / 100 });
      } else if (act === "mute") await callService(c, "media_player", "volume_mute", { entity_id, is_volume_muted: true });
      else if (act === "unmute") await callService(c, "media_player", "volume_mute", { entity_id, is_volume_muted: false });
      else if (act === "mute_toggle") {
        const cur = await readState(c);
        await callService(c, "media_player", "volume_mute", { entity_id, is_volume_muted: !cur.mute });
      } else if (act === "set_input") {
        const source = String(payload.value || "");
        if (!source) return json(req, { error: "Source requise" }, 400);
        await callService(c, "media_player", "select_source", { entity_id, source });
      } else if (act === "channel_up") await callService(c, "media_player", "media_next_track", data);
      else if (act === "channel_down") await callService(c, "media_player", "media_previous_track", data);
      else return json(req, { error: "Commande inconnue" }, 400);
      await new Promise(r => setTimeout(r, 400));
      try {
        return json(req, { ok: true, ...await readState(c) });
      } catch {
        return json(req, { ok: true, connected: true, device_id: entity_id, device_name: c.entity_name, power: null, label: "Commande transmise · état non confirmé" });
      }
    }
    return json(req, { error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json(req, { error: e instanceof Error ? e.message : "Erreur Home Assistant" }, 500);
  }
});
