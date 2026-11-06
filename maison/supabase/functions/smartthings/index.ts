// Maisonnée — SmartThings (Samsung TV). OAuth + PAT côté serveur.
// Déployer SANS vérification JWT : le callback Samsung arrive sans session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sbUrl = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const stClientId = Deno.env.get("SMARTTHINGS_CLIENT_ID") || "";
const stClientSecret = Deno.env.get("SMARTTHINGS_CLIENT_SECRET") || "";
const admin = createClient(sbUrl, service, { auth: { persistSession: false } });
const ST_BASE = "https://api.smartthings.com/v1";
const HOME = "https://franckdavion.github.io/carnets-menus/maison/";
const CALLBACK = `${sbUrl}/functions/v1/smartthings/callback`;
const ST_SCOPES = "r:devices:* x:devices:* r:locations:*";
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

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const ub64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const hmacKeyPromise = crypto.subtle.importKey("raw", new TextEncoder().encode(stClientSecret || service), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
async function signState(payload: string) {
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKeyPromise, new TextEncoder().encode(payload))));
}

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

type StCred = {
  household_id: string;
  pat: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  installed_app_id: string | null;
  device_id: string | null;
  device_name: string | null;
};

function oauthConfigured() {
  return !!(stClientId && stClientSecret);
}

async function stToken(body: URLSearchParams) {
  const basic = btoa(`${stClientId}:${stClientSecret}`);
  const r = await fetch(`${ST_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + basic,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(String(data.error_description || data.error || "Échange OAuth SmartThings refusé"));
  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    installed_app_id?: string;
  };
}

async function stFetch(token: string, path: string, init?: RequestInit) {
  const r = await fetch(`${ST_BASE}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.headers as Record<string, string> || {})
    }
  });
  const text = await r.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
  return { ok: r.ok, status: r.status, body };
}

function stError(status: number, fallback: string): Error {
  if (status === 401) return new Error("Compte SmartThings à reconnecter. Reliez à nouveau Samsung depuis les réglages.");
  if (status === 403) return new Error("Accès SmartThings refusé : autorisations insuffisantes.");
  return new Error(fallback);
}

interface StDevice { id: string; name: string; label: string; type: string }

function mapDevices(items: Record<string, unknown>[]): StDevice[] {
  return items.map(d => ({
    id: String(d.deviceId),
    name: String(d.name || ""),
    label: String(d.label || d.name || ""),
    type: String(d.type || "")
  }));
}

async function stListDevices(token: string): Promise<StDevice[]> {
  const r = await stFetch(token, "devices");
  if (!r.ok) throw stError(r.status, "Impossible de lister les appareils SmartThings");
  const root = r.body as Record<string, unknown>;
  const items = Array.isArray(root?.items) ? root.items as Record<string, unknown>[] : [];
  return items
    .filter(d => {
      const cats = d.components ? (d.components as Record<string, unknown>[]).flatMap(c => {
        const cats2 = (c as Record<string, unknown>).categories;
        return Array.isArray(cats2) ? cats2 : [];
      }) : [];
      const catNames = cats.map(c => String((c as Record<string, unknown>).name || "").toLowerCase());
      const label = String(d.label || d.name || "").toLowerCase();
      return catNames.some(n => n.includes("television") || n.includes("tv")) || label.includes("tv") || label.includes("samsung");
    })
    .map(d => ({
      id: String(d.deviceId),
      name: String(d.name || ""),
      label: String(d.label || d.name || ""),
      type: String(d.type || "")
    }));
}

async function stAllDevices(token: string): Promise<StDevice[]> {
  const r = await stFetch(token, "devices");
  if (!r.ok) throw stError(r.status, "Impossible de lister les appareils SmartThings");
  const root = r.body as Record<string, unknown>;
  const items = Array.isArray(root?.items) ? root.items as Record<string, unknown>[] : [];
  return mapDevices(items);
}

async function stDeviceStatus(token: string, deviceId: string) {
  const r = await stFetch(token, `devices/${deviceId}/status`);
  if (!r.ok) throw stError(r.status, "État SmartThings indisponible");
  return r.body as Record<string, unknown>;
}

function parseStatus(raw: Record<string, unknown>) {
  const components = raw.components as Record<string, unknown> | undefined;
  if (!components) return { power: null, volume: null, mute: null, channel: null, input: null, label: "Données indisponibles" };
  const main = components.main as Record<string, unknown> | undefined;
  if (!main) return { power: null, volume: null, mute: null, channel: null, input: null, label: "Données indisponibles" };
  const sw = main.switch as Record<string, unknown> | undefined;
  const swVal = sw?.switch as Record<string, unknown> | undefined;
  const power = swVal?.value === "on" ? true : swVal?.value === "off" ? false : null;
  const audioVol = main.audioVolume as Record<string, unknown> | undefined;
  const volVal = audioVol?.volume as Record<string, unknown> | undefined;
  const volume = typeof volVal?.value === "number" ? volVal.value as number : null;
  const audioMute = main.audioMute as Record<string, unknown> | undefined;
  const muteVal = audioMute?.mute as Record<string, unknown> | undefined;
  const mute = muteVal?.value === "muted" ? true : muteVal?.value === "unmuted" ? false : null;
  const tvChan = main.tvChannel as Record<string, unknown> | undefined;
  const chanVal = tvChan?.tvChannel as Record<string, unknown> | undefined;
  const channel = chanVal?.value != null ? String(chanVal.value) : null;
  const chanName = tvChan?.tvChannelName as Record<string, unknown> | undefined;
  const channelName = chanName?.value != null ? String(chanName.value) : null;
  const mediaSrc = main.mediaInputSource as Record<string, unknown> | undefined;
  const inputVal = mediaSrc?.inputSource as Record<string, unknown> | undefined;
  const input = inputVal?.value != null ? String(inputVal.value) : null;
  const parts: string[] = [];
  if (power === false) parts.push("Éteinte");
  else if (power === true) {
    parts.push("Allumée");
    if (volume != null) parts.push("Vol. " + volume);
    if (input) parts.push(input);
  }
  return { power, volume, mute, channel, channelName, input, label: parts.length ? parts.join(" · ") : "En ligne" };
}

async function stCommand(token: string, deviceId: string, capability: string, command: string, args: unknown[] = []) {
  const r = await stFetch(token, `devices/${deviceId}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [{ component: "main", capability, command, arguments: args }]
    })
  });
  if (!r.ok) {
    const body = r.body as Record<string, unknown>;
    throw stError(r.status, String(body?.message || body?.error || "Commande SmartThings refusée"));
  }
  return r.body;
}

const stateCache = new Map();
const CACHE_TTL = 9000;

async function getCred(hid: string): Promise<StCred | null> {
  const { data, error } = await admin.from("household_smartthings").select("*").eq("household_id", hid).maybeSingle();
  if (error) throw error;
  return data as StCred | null;
}

async function bearerOf(cred: StCred): Promise<string> {
  if (cred.refresh_token && oauthConfigured()) {
    const exp = cred.token_expires_at ? Date.parse(cred.token_expires_at) : 0;
    if (cred.access_token && exp > Date.now() + 120_000) return cred.access_token;
    const t = await stToken(new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: cred.refresh_token,
      client_id: stClientId
    }));
    const access = t.access_token;
    const refresh = t.refresh_token || cred.refresh_token;
    const expires_at = new Date(Date.now() + (t.expires_in || 86000) * 1000).toISOString();
    await admin.from("household_smartthings").update({
      access_token: access,
      refresh_token: refresh,
      token_expires_at: expires_at,
      updated_at: new Date().toISOString()
    }).eq("household_id", cred.household_id);
    cred.access_token = access;
    cred.refresh_token = refresh;
    cred.token_expires_at = expires_at;
    return access;
  }
  if (cred.pat) return cred.pat;
  throw new Error("Compte SmartThings à reconnecter.");
}

async function readState(cred: StCred) {
  const deviceId = cred.device_id;
  if (!deviceId) return { connected: true, device_id: null, device_name: null, label: "Choisissez un appareil SmartThings" };
  const token = await bearerOf(cred);
  const now = Date.now();
  const cached = stateCache.get(deviceId);
  let raw: Record<string, unknown>;
  if (cached && now - cached.at < CACHE_TTL) {
    raw = cached.data;
  } else {
    raw = await stDeviceStatus(token, deviceId);
    stateCache.set(deviceId, { at: now, data: raw });
  }
  const parsed = parseStatus(raw);
  return {
    connected: true,
    device_id: deviceId,
    device_name: cred.device_name || "Samsung TV",
    auth: cred.refresh_token ? "oauth" : "pat",
    ...parsed
  };
}

async function pickDefaultTv(token: string, previousId?: string | null) {
  const tvs = await stListDevices(token);
  const all = await stAllDevices(token);
  const device = (previousId ? all.find(d => d.id === previousId) : null) || tvs[0] || null;
  return { tvs, all, device };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const url = new URL(req.url);
  const action = url.pathname.split("/").filter(Boolean).pop() || "";
  try {
    if (req.method === "POST" && (action === "smartthings" || action === "webhook")) {
      const hook = await req.json().catch(() => ({})) as Record<string, unknown>;
      if (hook.messageType === "CONFIRMATION") {
        const data = hook.confirmationData as { confirmationUrl?: string } | undefined;
        const confirmUrl = String(data?.confirmationUrl || "");
        if (confirmUrl.startsWith("https://api.smartthings.com/")) await fetch(confirmUrl);
      }
      return json(req, { ok: true });
    }

    if (action === "callback") {
      const home = HOME;
      const state = url.searchParams.get("state") || "";
      const [payload, mac] = state.split(".");
      if (!payload || !mac || !(await crypto.subtle.verify("HMAC", await hmacKeyPromise, ub64url(mac), new TextEncoder().encode(payload)))) {
        return Response.redirect(home + "?smartthings=error", 302);
      }
      const s = JSON.parse(new TextDecoder().decode(ub64url(payload))) as { uid?: string; hid?: string; exp?: number };
      if (!s.uid || !s.hid || !s.exp || s.exp < Date.now() || s.exp > Date.now() + 12 * 60e3) {
        return Response.redirect(home + "?smartthings=error", 302);
      }
      if (url.searchParams.has("error")) return Response.redirect(home + "?smartthings=cancelled", 302);
      const code = url.searchParams.get("code");
      if (!code || !oauthConfigured()) return Response.redirect(home + "?smartthings=error", 302);
      let t;
      try {
        t = await stToken(new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: stClientId,
          redirect_uri: CALLBACK
        }));
      } catch (e) {
        console.error(e);
        return Response.redirect(home + "?smartthings=error", 302);
      }
      if (!t.refresh_token || !t.access_token) return Response.redirect(home + "?smartthings=missing_refresh", 302);
      const previous = await getCred(s.hid);
      const expires_at = new Date(Date.now() + (t.expires_in || 86000) * 1000).toISOString();
      let deviceId = previous?.device_id || null;
      let deviceName = previous?.device_name || null;
      try {
        const picked = await pickDefaultTv(t.access_token, deviceId);
        if (picked.device) {
          deviceId = picked.device.id;
          deviceName = picked.device.label || picked.device.name;
        }
      } catch (e) {
        console.warn(e);
      }
      const { error } = await admin.from("household_smartthings").upsert({
        household_id: s.hid,
        pat: null,
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        token_expires_at: expires_at,
        installed_app_id: t.installed_app_id || null,
        device_id: deviceId,
        device_name: deviceName,
        updated_at: new Date().toISOString(),
        updated_by: s.uid
      });
      if (error) {
        console.error(error);
        return Response.redirect(home + "?smartthings=error", 302);
      }
      if (deviceId) await admin.from("households").update({ smartthings_device_id: deviceId }).eq("id", s.hid);
      return Response.redirect(home + "?smartthings=connected", 302);
    }

    const user = await userFrom(req);
    if (!user) return json(req, { error: "Connexion Maisonnée requise" }, 401);
    const member = await householdOf(user.id);
    if (!member) return json(req, { error: "Vous n'êtes dans aucun foyer" }, 403);
    const hid = member.household_id;
    const payload = req.method === "POST" ? await req.json().catch(() => ({})) as Record<string, unknown> : {};

    if (action === "status") {
      const cred = await getCred(hid);
      const { data: hh } = await admin.from("households").select("smartthings_device_id").eq("id", hid).maybeSingle();
      return json(req, {
        connected: !!(cred && (cred.refresh_token || cred.pat)),
        auth: cred?.refresh_token ? "oauth" : cred?.pat ? "pat" : null,
        oauth_ready: oauthConfigured(),
        device_id: hh?.smartthings_device_id ?? cred?.device_id ?? null,
        device_name: cred?.device_name || null
      });
    }

    if (action === "oauth-start" && req.method === "POST") {
      if (!oauthConfigured()) {
        return json(req, {
          error: "OAuth SmartThings pas encore configuré : ajoutez SMARTTHINGS_CLIENT_ID et SMARTTHINGS_CLIENT_SECRET aux secrets de la fonction, et l’URL de retour " + CALLBACK
        }, 400);
      }
      const raw = b64url(new TextEncoder().encode(JSON.stringify({ uid: user.id, hid, exp: Date.now() + 10 * 60e3, nonce: crypto.randomUUID() })));
      const state = raw + "." + await signState(raw);
      const params = new URLSearchParams({
        client_id: stClientId,
        scope: ST_SCOPES,
        response_type: "code",
        redirect_uri: CALLBACK,
        state
      });
      return json(req, { url: `${ST_BASE}/oauth/authorize?` + params });
    }

    if (action === "connect" && req.method === "POST") {
      const pat = String(payload.pat || "").trim();
      if (!pat || pat.length < 20) return json(req, { error: "Token SmartThings invalide" }, 400);
      const testR = await stFetch(pat, "devices?capability=switch");
      if (!testR.ok) return json(req, { error: stError(testR.status, "Jeton SmartThings refusé par Samsung. Vérifiez qu'il est actif.").message }, 400);
      const previous = await getCred(hid);
      const picked = await pickDefaultTv(pat, previous?.device_id);
      const { error } = await admin.from("household_smartthings").upsert({
        household_id: hid,
        pat,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        installed_app_id: null,
        device_id: picked.device?.id || null,
        device_name: picked.device?.label || picked.device?.name || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      });
      if (error) throw error;
      if (picked.device) await admin.from("households").update({ smartthings_device_id: picked.device.id }).eq("id", hid);
      return json(req, { connected: true, device_id: picked.device?.id || null, device_name: picked.device?.label || null, devices: picked.tvs });
    }

    if (action === "disconnect" && req.method === "POST") {
      await admin.from("household_smartthings").delete().eq("household_id", hid);
      await admin.from("households").update({ smartthings_device_id: null }).eq("id", hid);
      return json(req, { connected: false });
    }

    const cred = await getCred(hid);
    if (!cred) return json(req, { error: "SmartThings n'est pas relié" }, 400);
    const token = await bearerOf(cred);

    if (action === "devices") {
      const tvs = await stListDevices(token);
      const all = await stAllDevices(token);
      return json(req, { devices: tvs.length ? tvs : all });
    }

    if (action === "state") {
      const st = await readState(cred);
      return json(req, st);
    }

    if (action === "command" && req.method === "POST") {
      const deviceId = cred.device_id;
      if (!deviceId) return json(req, { error: "Aucun appareil SmartThings sélectionné" }, 400);
      const act = String(payload.action || "");
      if (act === "power_on") {
        await stCommand(token, deviceId, "switch", "on");
      } else if (act === "power_off") {
        await stCommand(token, deviceId, "switch", "off");
      } else if (act === "power_toggle") {
        const raw = await stDeviceStatus(token, deviceId);
        const cur = parseStatus(raw);
        await stCommand(token, deviceId, "switch", cur.power === true ? "off" : "on");
      } else if (act === "volume_up") {
        await stCommand(token, deviceId, "audioVolume", "volumeUp");
      } else if (act === "volume_down") {
        await stCommand(token, deviceId, "audioVolume", "volumeDown");
      } else if (act === "set_volume") {
        const v = Number(payload.value);
        if (!Number.isFinite(v) || v < 0 || v > 100) return json(req, { error: "Volume invalide (0–100)" }, 400);
        await stCommand(token, deviceId, "audioVolume", "setVolume", [v]);
      } else if (act === "mute") {
        await stCommand(token, deviceId, "audioMute", "mute");
      } else if (act === "unmute") {
        await stCommand(token, deviceId, "audioMute", "unmute");
      } else if (act === "mute_toggle") {
        const raw = await stDeviceStatus(token, deviceId);
        const cur = parseStatus(raw);
        await stCommand(token, deviceId, "audioMute", cur.mute ? "unmute" : "mute");
      } else if (act === "set_input") {
        const src = String(payload.value || "");
        if (!src) return json(req, { error: "Source requise" }, 400);
        await stCommand(token, deviceId, "mediaInputSource", "setInputSource", [src]);
      } else if (act === "set_channel") {
        const ch = String(payload.value || "");
        if (!ch) return json(req, { error: "Chaîne requise" }, 400);
        await stCommand(token, deviceId, "tvChannel", "setTvChannel", [ch]);
      } else if (act === "channel_up") {
        await stCommand(token, deviceId, "tvChannel", "channelUp");
      } else if (act === "channel_down") {
        await stCommand(token, deviceId, "tvChannel", "channelDown");
      } else {
        return json(req, { error: "Commande inconnue" }, 400);
      }
      stateCache.delete(deviceId);
      await new Promise(r => setTimeout(r, 600));
      try {
        const st = await readState(cred);
        return json(req, { ok: true, ...st });
      } catch (e) {
        console.warn("Commande envoyée, relecture impossible :", e instanceof Error ? e.message : "erreur");
        return json(req, {
          ok: true, connected: true, device_id: deviceId,
          device_name: cred.device_name || "Samsung TV",
          power: null, label: "Commande transmise · état non confirmé",
          state_unavailable: true
        });
      }
    }

    if (action === "pick_device" && req.method === "POST") {
      const deviceId = String(payload.device_id || "");
      if (!deviceId) return json(req, { error: "ID appareil requis" }, 400);
      const all = await stAllDevices(token);
      const device = all.find(d => d.id === deviceId);
      if (!device) return json(req, { error: "Appareil introuvable" }, 404);
      await admin.from("household_smartthings").update({
        device_id: device.id,
        device_name: device.label || device.name,
        updated_at: new Date().toISOString()
      }).eq("household_id", hid);
      await admin.from("households").update({ smartthings_device_id: device.id }).eq("id", hid);
      return json(req, { ok: true, device_id: device.id, device_name: device.label || device.name });
    }

    return json(req, { error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json(req, { error: e instanceof Error ? e.message : "Erreur serveur SmartThings" }, 500);
  }
});
