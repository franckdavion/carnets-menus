// Maisonnée — MELCloud (Mitsubishi). Identifiants uniquement côté serveur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sbUrl = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(sbUrl, service, { auth: { persistSession: false } });
const BASE = "https://app.melcloud.com/Mitsubishi.Wifi.Client";
const APP_VERSION = "1.16.1.2";
const CONTEXT_TTL_MS = 25 * 60 * 1000;
const ALLOWED = new Set([
  "https://franckdavion.github.io",
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

type MelCred = {
  household_id: string;
  email: string;
  password: string;
  context_key: string | null;
  context_at: string | null;
  device_id: number | null;
  device_name: string | null;
  building_id: number | null;
};

type MelDevice = { id: number; name: string; building: string; buildingId: number | null };

function numTemp(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n) && n > -50 && n < 80) return Math.round(n * 10) / 10;
  }
  return null;
}

function pickRoomTemp(src: Record<string, unknown>): number | null {
  const deviceType = Number(src.DeviceType);
  if (deviceType === 1) {
    return numTemp(
      src.RoomTemperatureZone1,
      src.RoomTemperatureZone2,
      src.RoomTemperature,
      src.IndoorTemperature,
      src.InDoorTemperature
    );
  }
  return numTemp(
    src.RoomTemperature,
    src.RoomTemperatureZone1,
    src.IndoorTemperature,
    src.InDoorTemperature,
    src.Temperature
  );
}

function pickSetTemp(src: Record<string, unknown>): number | null {
  const deviceType = Number(src.DeviceType);
  if (deviceType === 1) {
    return numTemp(
      src.SetTemperatureZone1,
      src.SetTemperatureZone2,
      src.SetTemperature,
      src.TargetTemperature
    );
  }
  return numTemp(
    src.SetTemperature,
    src.SetTemperatureZone1,
    src.SetTemperatureZone2,
    src.TargetTemperature,
    src.HeatingSetTemperature,
    src.SetHeatSetpoint
  );
}

function readMelFields(src: Record<string, unknown>) {
  const room = pickRoomTemp(src);
  const set = pickSetTemp(src);
  let power: boolean | null = null;
  const p = src.Power;
  if (p === true || p === 1 || p === "true") power = true;
  if (p === false || p === 0 || p === "false") power = false;
  const deviceType = Number.isFinite(Number(src.DeviceType)) ? Number(src.DeviceType) : null;
  return { room, set, power, deviceType };
}

function deviceIdOf(wrap: Record<string, unknown>): number | null {
  const dev = asObj(wrap.Device);
  const id = Number(dev?.DeviceID ?? dev?.DeviceId ?? wrap.DeviceID ?? wrap.DeviceId);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function forEachMelDevice(body: unknown, fn: (wrap: Record<string, unknown>, buildingId: number | null, buildingName: string) => void) {
  const visitStructure = (structure: unknown, buildingId: number | null, buildingName: string) => {
    const s = asObj(structure);
    if (!s) return;
    if (Array.isArray(s.Devices)) {
      for (const x of s.Devices) {
        const w = asObj(x);
        if (w) fn(w, buildingId, buildingName);
      }
    }
    if (Array.isArray(s.Areas)) {
      for (const a of s.Areas) {
        const ao = asObj(a);
        if (ao && Array.isArray(ao.Devices)) {
          for (const x of ao.Devices) {
            const w = asObj(x);
            if (w) fn(w, buildingId, buildingName);
          }
        }
      }
    }
    if (Array.isArray(s.Floors)) {
      for (const f of s.Floors) {
        const fo = asObj(f);
        if (!fo) continue;
        visitStructure(fo, buildingId, buildingName);
        if (Array.isArray(fo.Areas)) {
          for (const a of fo.Areas) visitStructure(a, buildingId, buildingName);
        }
      }
    }
  };
  if (Array.isArray(body)) {
    for (const b of body) {
      const bo = asObj(b);
      if (!bo) continue;
      const buildingId = Number(bo.ID ?? bo.BuildingID ?? bo.BuildingId);
      const bid = Number.isFinite(buildingId) && buildingId > 0 ? buildingId : null;
      const bName = String(bo.Name || bo.BuildingName || "");
      visitStructure(bo.Structure ?? bo, bid, bName);
    }
  } else {
    visitStructure(body, null, "");
  }
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
}

function melErr(body: unknown, fallback: string) {
  const o = asObj(body);
  if (o?.ErrorId != null && o.ErrorId !== 0) return String(o.ErrorMessage || o.ErrorId || fallback);
  return fallback;
}

async function melFetch(path: string, init: RequestInit & { contextKey?: string }) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string> || {})
  };
  if (init.contextKey) headers["X-MitsContextKey"] = init.contextKey;
  const { contextKey: _c, ...rest } = init;
  const r = await fetch(`${BASE}/${path.replace(/^\//, "")}`, { ...rest, headers });
  const text = await r.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
  return { ok: r.ok, status: r.status, body };
}

async function melLogin(email: string, password: string) {
  const r = await melFetch("Login/ClientLogin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Email: email,
      Password: password,
      Language: 0,
      AppVersion: APP_VERSION,
      Persist: false,
      CaptchaResponse: ""
    })
  });
  if (!r.ok) throw new Error(melErr(r.body, "Connexion MELCloud refusée"));
  const root = asObj(r.body);
  const login = asObj(root?.LoginData);
  const key = String(login?.ContextKey || "");
  if (!key) throw new Error("Réponse MELCloud incomplète (ContextKey manquant).");
  return key;
}

function parseDevices(body: unknown): MelDevice[] {
  const out: MelDevice[] = [];
  forEachMelDevice(body, (wrap, buildingId, buildingName) => {
    const id = deviceIdOf(wrap);
    if (!id) return;
    const dev = asObj(wrap.Device) || wrap;
    const name = String(dev.DeviceName || wrap.DeviceName || dev.Name || `Appareil ${id}`);
    out.push({ id, name, building: buildingName, buildingId });
  });
  const seen = new Set<number>();
  return out.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
}

function parseDeviceState(body: unknown, deviceId: number) {
  let room: number | null = null;
  let set: number | null = null;
  let power: boolean | null = null;
  let name = "";
  let buildingId: number | null = null;
  forEachMelDevice(body, (wrap, bid, _bName) => {
    if (deviceIdOf(wrap) !== deviceId) return;
    if (bid) buildingId = bid;
    const dev = asObj(wrap.Device) || wrap;
    name = String(dev.DeviceName || dev.Name || wrap.DeviceName || name);
    const f = readMelFields(dev);
    if (f.room != null) room = f.room;
    if (f.set != null) set = f.set;
    if (f.power != null) power = f.power;
  });
  return { room, set, power, name, buildingId };
}

async function melDeviceGet(contextKey: string, buildingId: number, deviceId: number) {
  const r = await melFetch(`Device/Get?id=${deviceId}&buildingID=${buildingId}`, { method: "GET", contextKey });
  if (!r.ok) return null;
  const root = asObj(r.body);
  const dev = asObj(root?.Device) || root;
  if (!dev) return null;
  const f = readMelFields(dev);
  const name = String(dev.DeviceName || dev.Name || "");
  return { ...f, name, dev };
}

async function melListDevices(contextKey: string) {
  const r = await melFetch("User/ListDevices", { method: "GET", contextKey });
  if (!r.ok) throw new Error(melErr(r.body, "Liste MELCloud inaccessible"));
  return parseDevices(r.body);
}

async function getCred(hid: string): Promise<MelCred | null> {
  const { data, error } = await admin.from("household_melcloud").select("*").eq("household_id", hid).maybeSingle();
  if (error) throw error;
  return data as MelCred | null;
}

async function saveContext(hid: string, contextKey: string) {
  await admin.from("household_melcloud").update({
    context_key: contextKey,
    context_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("household_id", hid);
}

async function ensureContextKey(cred: MelCred): Promise<string> {
  let key = cred.context_key || "";
  const fresh = cred.context_at && Date.now() - Date.parse(cred.context_at) < CONTEXT_TTL_MS;
  if (!key || !fresh) {
    key = await melLogin(cred.email, cred.password);
    await saveContext(cred.household_id, key);
  }
  return key;
}

async function readState(cred: MelCred) {
  const deviceId = cred.device_id;
  if (!deviceId) return { connected: true, device_id: null, label: "Choisissez un appareil MELCloud" };
  let key = await ensureContextKey(cred);
  let r = await melFetch("User/ListDevices", { method: "GET", contextKey: key });
  if (r.status === 401 || r.status === 403) {
    key = await melLogin(cred.email, cred.password);
    await saveContext(cred.household_id, key);
    r = await melFetch("User/ListDevices", { method: "GET", contextKey: key });
  }
  if (!r.ok) throw new Error(melErr(r.body, "État MELCloud indisponible"));
  let st = parseDeviceState(r.body, deviceId);
  const buildingId = st.buildingId ?? cred.building_id;
  if (buildingId) {
    const extra = await melDeviceGet(key, buildingId, deviceId);
    if (extra) {
      if (extra.room != null) st.room = extra.room;
      if (extra.set != null) st.set = extra.set;
      if (extra.power != null) st.power = extra.power;
      if (extra.name) st.name = extra.name;
    }
  }
  if (buildingId && buildingId !== cred.building_id) {
    await admin.from("household_melcloud").update({ building_id: buildingId, updated_at: new Date().toISOString() }).eq("household_id", cred.household_id);
  }
  return {
    connected: true,
    device_id: deviceId,
    device_name: st.name || cred.device_name || "Chauffage",
    room: st.room,
    set: st.set,
    power: st.power,
    label: st.power === false ? "Arrêt" : st.set != null ? `${String(st.set).replace(".", ",")} °C consigne` : st.room != null ? `${String(st.room).replace(".", ",")} °C pièce` : "En ligne"
  };
}

const FLAG_POWER = 1;
const FLAG_SET_TEMP = 4;
const FLAG_ATW_SET_TEMP_ZONE1 = 0x200000080;

async function setAta(contextKey: string, deviceId: number, patch: { power?: boolean; set?: number }) {
  const body: Record<string, unknown> = { DeviceID: deviceId, EffectiveFlags: 0 };
  if (patch.power != null) {
    body.Power = patch.power;
    body.EffectiveFlags = (body.EffectiveFlags as number) | FLAG_POWER;
  }
  if (patch.set != null) {
    body.SetTemperature = patch.set;
    body.EffectiveFlags = (body.EffectiveFlags as number) | FLAG_SET_TEMP;
  }
  if (!body.EffectiveFlags) throw new Error("Rien à modifier");
  const r = await melFetch("Device/SetAta", {
    method: "POST",
    contextKey,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(melErr(r.body, "Commande MELCloud refusée"));
}

async function setAtw(contextKey: string, deviceId: number, buildingId: number, dev: Record<string, unknown>, patch: { power?: boolean; set?: number }) {
  const body: Record<string, unknown> = { ...dev, DeviceID: deviceId };
  let flags = 0;
  if (patch.power != null) {
    body.Power = patch.power;
    flags |= FLAG_POWER;
  }
  if (patch.set != null) {
    body.SetTemperatureZone1 = patch.set;
    flags |= FLAG_ATW_SET_TEMP_ZONE1;
  }
  if (!flags) throw new Error("Rien à modifier");
  body.EffectiveFlags = flags;
  const r = await melFetch("Device/SetAtw", {
    method: "POST",
    contextKey,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(melErr(r.body, "Commande MELCloud refusée"));
}

async function melApplyPatch(
  contextKey: string,
  deviceId: number,
  buildingId: number | null,
  devFull: Record<string, unknown> | null,
  deviceType: number | null,
  patch: { power?: boolean; set?: number }
) {
  const isAtw = deviceType === 1 || Number(devFull?.DeviceType) === 1;
  if (isAtw && buildingId && devFull) {
    await setAtw(contextKey, deviceId, buildingId, devFull, patch);
    return;
  }
  await setAta(contextKey, deviceId, patch);
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
      const cred = await getCred(hid);
      const { data: hh } = await admin.from("households").select("melcloud_device_id").eq("id", hid).maybeSingle();
      return json(req, {
        connected: !!cred,
        device_id: hh?.melcloud_device_id ?? cred?.device_id ?? null,
        device_name: cred?.device_name || null
      });
    }

    if (action === "connect" && req.method === "POST") {
      const email = String(payload.email || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const pickId = payload.device_id != null ? Number(payload.device_id) : null;
      if (!email || !email.includes("@")) return json(req, { error: "Adresse MELCloud invalide" }, 400);
      if (password.length < 4) return json(req, { error: "Mot de passe MELCloud invalide" }, 400);
      const contextKey = await melLogin(email, password);
      const devices = await melListDevices(contextKey);
      if (!devices.length) return json(req, { error: "Aucun appareil sur ce compte MELCloud." }, 400);
      let device = pickId ? devices.find(d => d.id === pickId) : devices[0];
      if (pickId && !device) return json(req, { error: "Appareil MELCloud introuvable sur ce compte." }, 400);
      device = device || devices[0];
      const { error } = await admin.from("household_melcloud").upsert({
        household_id: hid,
        email,
        password,
        context_key: contextKey,
        context_at: new Date().toISOString(),
        device_id: device.id,
        device_name: device.name,
        building_id: device.buildingId,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      });
      if (error) throw error;
      await admin.from("households").update({ melcloud_device_id: device.id }).eq("id", hid);
      return json(req, { connected: true, device_id: device.id, device_name: device.name, devices });
    }

    if (action === "disconnect" && req.method === "POST") {
      await admin.from("household_melcloud").delete().eq("household_id", hid);
      await admin.from("households").update({ melcloud_device_id: null }).eq("id", hid);
      return json(req, { connected: false });
    }

    const cred = await getCred(hid);
    if (!cred) return json(req, { error: "MELCloud n'est pas relié" }, 400);

    if (action === "devices") {
      const key = await ensureContextKey(cred);
      const devices = await melListDevices(key);
      return json(req, { devices });
    }

    if (action === "state") {
      const st = await readState(cred);
      return json(req, st);
    }

    if (action === "command" && req.method === "POST") {
      const deviceId = cred.device_id;
      if (!deviceId) return json(req, { error: "Aucun appareil MELCloud sélectionné" }, 400);
      const act = String(payload.action || "");
      if (act === "set_temp") {
        const v = Number(payload.value);
        if (!Number.isFinite(v) || v < 10 || v > 30) return json(req, { error: "Température invalide (10–30 °C)" }, 400);
      }
      let key = await ensureContextKey(cred);
      let listR = await melFetch("User/ListDevices", { method: "GET", contextKey: key });
      if (listR.status === 401 || listR.status === 403) {
        key = await melLogin(cred.email, cred.password);
        await saveContext(cred.household_id, key);
        listR = await melFetch("User/ListDevices", { method: "GET", contextKey: key });
      }
      if (!listR.ok) throw new Error(melErr(listR.body, "État MELCloud indisponible"));
      const cur = parseDeviceState(listR.body, deviceId);
      const buildingId = cur.buildingId ?? cred.building_id;
      const got = buildingId ? await melDeviceGet(key, buildingId, deviceId) : null;
      const baseSet = got?.set ?? cur.set;
      const baseRoom = got?.room ?? cur.room;
      const basePower = got?.power ?? cur.power;
      if (act === "power_toggle") {
        await melApplyPatch(key, deviceId, buildingId, got?.dev ?? null, got?.deviceType ?? null, { power: basePower !== true });
      } else if (act === "temp_up" || act === "temp_down") {
        const base = baseSet ?? baseRoom ?? 20;
        const step = 0.5;
        const next = Math.max(10, Math.min(30, act === "temp_up" ? base + step : base - step));
        await melApplyPatch(key, deviceId, buildingId, got?.dev ?? null, got?.deviceType ?? null, {
          set: Math.round(next * 2) / 2,
          power: basePower !== false
        });
      } else if (act === "set_temp") {
        const v = Number(payload.value);
        await melApplyPatch(key, deviceId, buildingId, got?.dev ?? null, got?.deviceType ?? null, {
          set: Math.round(v * 2) / 2,
          power: basePower !== false
        });
      } else return json(req, { error: "Commande inconnue" }, 400);
      const st = await readState(cred);
      return json(req, { ok: true, ...st });
    }

    if (action === "pick_device" && req.method === "POST") {
      const deviceId = Number(payload.device_id);
      const key = await ensureContextKey(cred);
      const devices = await melListDevices(key);
      const device = devices.find(d => d.id === deviceId);
      if (!device) return json(req, { error: "Appareil introuvable" }, 404);
      await admin.from("household_melcloud").update({
        device_id: device.id,
        device_name: device.name,
        building_id: device.buildingId ?? null,
        updated_at: new Date().toISOString()
      }).eq("household_id", hid);
      await admin.from("households").update({ melcloud_device_id: device.id }).eq("id", hid);
      return json(req, { ok: true, device_id: device.id, device_name: device.name });
    }

    return json(req, { error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json(req, { error: e instanceof Error ? e.message : "Erreur serveur MELCloud" }, 500);
  }
});
