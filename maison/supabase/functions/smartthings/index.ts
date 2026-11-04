// Maisonnée — SmartThings (Samsung TV). Token PAT uniquement côté serveur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sbUrl = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(sbUrl, service, { auth: { persistSession: false } });
const ST_BASE = "https://api.smartthings.com/v1";
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

type StCred = {
  household_id: string;
  pat: string;
  device_id: string | null;
  device_name: string | null;
};

// ── SmartThings API helpers ─────────────────────────────────────────

async function stFetch(pat: string, path: string, init?: RequestInit) {
  const r = await fetch(`${ST_BASE}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/json",
      ...(init?.headers as Record<string, string> || {})
    }
  });
  const text = await r.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
  return { ok: r.ok, status: r.status, body };
}

interface StDevice { id: string; name: string; label: string; type: string }

async function stListDevices(pat: string): Promise<StDevice[]> {
  const r = await stFetch(pat, "devices");
  if (!r.ok) throw new Error("Impossible de lister les appareils SmartThings");
  const root = r.body as Record<string, unknown>;
  const items = Array.isArray(root?.items) ? root.items : [];
  return (items as Record<string, unknown>[])
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

async function stAllDevices(pat: string): Promise<StDevice[]> {
  const r = await stFetch(pat, "devices");
  if (!r.ok) throw new Error("Impossible de lister les appareils SmartThings");
  const root = r.body as Record<string, unknown>;
  const items = Array.isArray(root?.items) ? root.items : [];
  return (items as Record<string, unknown>[]).map(d => ({
    id: String(d.deviceId),
    name: String(d.name || ""),
    label: String(d.label || d.name || ""),
    type: String(d.type || "")
  }));
}

async function stDeviceStatus(pat: string, deviceId: string) {
  const r = await stFetch(pat, `devices/${deviceId}/status`);
  if (!r.ok) throw new Error("État SmartThings indisponible");
  return r.body as Record<string, unknown>;
}

function parseStatus(raw: Record<string, unknown>) {
  const components = raw.components as Record<string, unknown> | undefined;
  if (!components) return { power: null, volume: null, mute: null, channel: null, input: null, label: "Données indisponibles" };
  const main = components.main as Record<string, unknown> | undefined;
  if (!main) return { power: null, volume: null, mute: null, channel: null, input: null, label: "Données indisponibles" };

  // switch / power
  const sw = main.switch as Record<string, unknown> | undefined;
  const swVal = sw?.switch as Record<string, unknown> | undefined;
  const power = swVal?.value === "on" ? true : swVal?.value === "off" ? false : null;

  // volume
  const audioVol = main.audioVolume as Record<string, unknown> | undefined;
  const volVal = audioVol?.volume as Record<string, unknown> | undefined;
  const volume = typeof volVal?.value === "number" ? volVal.value as number : null;

  // mute
  const audioMute = main.audioMute as Record<string, unknown> | undefined;
  const muteVal = audioMute?.mute as Record<string, unknown> | undefined;
  const mute = muteVal?.value === "muted" ? true : muteVal?.value === "unmuted" ? false : null;

  // channel (tvChannel capability)
  const tvChan = main.tvChannel as Record<string, unknown> | undefined;
  const chanVal = tvChan?.tvChannel as Record<string, unknown> | undefined;
  const channel = chanVal?.value != null ? String(chanVal.value) : null;
  const chanName = tvChan?.tvChannelName as Record<string, unknown> | undefined;
  const channelName = chanName?.value != null ? String(chanName.value) : null;

  // input source (mediaInputSource)
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
  const label = parts.length ? parts.join(" · ") : "En ligne";

  return { power, volume, mute, channel, channelName, input, label };
}

async function stCommand(pat: string, deviceId: string, capability: string, command: string, args: unknown[] = []) {
  const r = await stFetch(pat, `devices/${deviceId}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [{ component: "main", capability, command, arguments: args }]
    })
  });
  if (!r.ok) {
    const body = r.body as Record<string, unknown>;
    throw new Error(String(body?.message || body?.error || "Commande SmartThings refusée"));
  }
  return r.body;
}

// ── State cache ─────────────────────────────────────────────────────
const stateCache = new Map();
const CACHE_TTL = 9000;

async function readState(cred: StCred) {
  const deviceId = cred.device_id;
  if (!deviceId) return { connected: true, device_id: null, device_name: null, label: "Choisissez un appareil SmartThings" };

  const now = Date.now();
  const cached = stateCache.get(deviceId);
  let raw: Record<string, unknown>;
  if (cached && now - cached.at < CACHE_TTL) {
    raw = cached.data;
  } else {
    raw = await stDeviceStatus(cred.pat, deviceId);
    stateCache.set(deviceId, { at: now, data: raw });
  }
  const parsed = parseStatus(raw);
  return {
    connected: true,
    device_id: deviceId,
    device_name: cred.device_name || "Samsung TV",
    ...parsed
  };
}

// ── DB helpers ──────────────────────────────────────────────────────

async function getCred(hid: string): Promise<StCred | null> {
  const { data, error } = await admin.from("household_smartthings").select("*").eq("household_id", hid).maybeSingle();
  if (error) throw error;
  return data as StCred | null;
}

// ── Deno handler ────────────────────────────────────────────────────

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

    // ── status ──────────────────────────────────────────────────────
    if (action === "status") {
      const cred = await getCred(hid);
      const { data: hh } = await admin.from("households").select("smartthings_device_id").eq("id", hid).maybeSingle();
      return json(req, {
        connected: !!cred,
        device_id: hh?.smartthings_device_id ?? cred?.device_id ?? null,
        device_name: cred?.device_name || null
      });
    }

    // ── connect ─────────────────────────────────────────────────────
    if (action === "connect" && req.method === "POST") {
      const pat = String(payload.pat || "").trim();
      if (!pat || pat.length < 20) return json(req, { error: "Token SmartThings invalide" }, 400);

      // Verify token works
      const testR = await stFetch(pat, "devices?capability=switch");
      if (!testR.ok) return json(req, { error: "Token SmartThings refusé par Samsung. Vérifiez qu'il est actif." }, 400);

      // Find TV devices
      const tvs = await stListDevices(pat);
      const device = tvs.length ? tvs[0] : null;

      const { error } = await admin.from("household_smartthings").upsert({
        household_id: hid,
        pat,
        device_id: device?.id || null,
        device_name: device?.label || device?.name || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      });
      if (error) throw error;
      if (device) {
        await admin.from("households").update({ smartthings_device_id: device.id }).eq("id", hid);
      }
      return json(req, { connected: true, device_id: device?.id || null, device_name: device?.label || null, devices: tvs });
    }

    // ── disconnect ──────────────────────────────────────────────────
    if (action === "disconnect" && req.method === "POST") {
      await admin.from("household_smartthings").delete().eq("household_id", hid);
      await admin.from("households").update({ smartthings_device_id: null }).eq("id", hid);
      return json(req, { connected: false });
    }

    const cred = await getCred(hid);
    if (!cred) return json(req, { error: "SmartThings n'est pas relié" }, 400);

    // ── devices ─────────────────────────────────────────────────────
    if (action === "devices") {
      const tvs = await stListDevices(cred.pat);
      const all = await stAllDevices(cred.pat);
      return json(req, { devices: tvs.length ? tvs : all });
    }

    // ── state ───────────────────────────────────────────────────────
    if (action === "state") {
      const st = await readState(cred);
      return json(req, st);
    }

    // ── command ─────────────────────────────────────────────────────
    if (action === "command" && req.method === "POST") {
      const deviceId = cred.device_id;
      if (!deviceId) return json(req, { error: "Aucun appareil SmartThings sélectionné" }, 400);
      const act = String(payload.action || "");

      if (act === "power_on") {
        await stCommand(cred.pat, deviceId, "switch", "on");
      } else if (act === "power_off") {
        await stCommand(cred.pat, deviceId, "switch", "off");
      } else if (act === "power_toggle") {
        // Read current, then toggle
        const raw = await stDeviceStatus(cred.pat, deviceId);
        const cur = parseStatus(raw);
        await stCommand(cred.pat, deviceId, "switch", cur.power === true ? "off" : "on");
      } else if (act === "volume_up") {
        await stCommand(cred.pat, deviceId, "audioVolume", "volumeUp");
      } else if (act === "volume_down") {
        await stCommand(cred.pat, deviceId, "audioVolume", "volumeDown");
      } else if (act === "set_volume") {
        const v = Number(payload.value);
        if (!Number.isFinite(v) || v < 0 || v > 100) return json(req, { error: "Volume invalide (0–100)" }, 400);
        await stCommand(cred.pat, deviceId, "audioVolume", "setVolume", [v]);
      } else if (act === "mute") {
        await stCommand(cred.pat, deviceId, "audioMute", "mute");
      } else if (act === "unmute") {
        await stCommand(cred.pat, deviceId, "audioMute", "unmute");
      } else if (act === "mute_toggle") {
        const raw = await stDeviceStatus(cred.pat, deviceId);
        const cur = parseStatus(raw);
        await stCommand(cred.pat, deviceId, "audioMute", cur.mute ? "unmute" : "mute");
      } else if (act === "set_input") {
        const src = String(payload.value || "");
        if (!src) return json(req, { error: "Source requise" }, 400);
        await stCommand(cred.pat, deviceId, "mediaInputSource", "setInputSource", [src]);
      } else if (act === "set_channel") {
        const ch = String(payload.value || "");
        if (!ch) return json(req, { error: "Chaîne requise" }, 400);
        await stCommand(cred.pat, deviceId, "tvChannel", "setTvChannel", [ch]);
      } else if (act === "channel_up") {
        await stCommand(cred.pat, deviceId, "tvChannel", "channelUp");
      } else if (act === "channel_down") {
        await stCommand(cred.pat, deviceId, "tvChannel", "channelDown");
      } else {
        return json(req, { error: "Commande inconnue" }, 400);
      }

      // Invalidate cache & return fresh state
      stateCache.delete(deviceId);
      // Small delay for TV to process command
      await new Promise(r => setTimeout(r, 600));
      const st = await readState(cred);
      return json(req, { ok: true, ...st });
    }

    // ── pick_device ─────────────────────────────────────────────────
    if (action === "pick_device" && req.method === "POST") {
      const deviceId = String(payload.device_id || "");
      if (!deviceId) return json(req, { error: "ID appareil requis" }, 400);
      const all = await stAllDevices(cred.pat);
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
