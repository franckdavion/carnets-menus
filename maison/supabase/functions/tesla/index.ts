// Maisonnée — Tesla Fleet API. Tokens côté serveur uniquement.
// Déployer : supabase functions deploy tesla --no-verify-jwt
// Secrets : TESLA_CLIENT_ID, TESLA_CLIENT_SECRET (+ Supabase par défaut)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FN_REV = "20261031c";
const sbUrl = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clientId = Deno.env.get("TESLA_CLIENT_ID") || "";
const clientSecret = Deno.env.get("TESLA_CLIENT_SECRET") || "";
const admin = createClient(sbUrl, service, { auth: { persistSession: false } });

const APP_ORIGIN = "https://franckdavion.github.io";
const APP_HOME = `${APP_ORIGIN}/carnets-menus/maison/`;
const CALLBACK = `${sbUrl}/functions/v1/tesla/callback`;
const AUTH = "https://auth.tesla.com/oauth2/v3";
const TOKEN = "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token";
const SCOPES = "openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds vehicle_location";

const ALLOWED = new Set([
  "https://franckdavion.github.io",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
  "http://127.0.0.1:8766",
  "http://localhost:8766"
]);

const FLEET: Record<string, string> = {
  eu: "https://fleet-api.prd.eu.vn.cloud.tesla.com",
  na: "https://fleet-api.prd.na.vn.cloud.tesla.com"
};

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : APP_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin"
  };
}
const json = (req: Request, v: unknown, status = 200) =>
  new Response(JSON.stringify(typeof v === "object" && v !== null && !Array.isArray(v) ? { ...v as Record<string, unknown>, fn: FN_REV } : v), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store", "X-Maisonnee-Tesla": FN_REV }
  });

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const ub64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));

let hmacKey: CryptoKey | null = null;
async function hmacKeyGet() {
  if (!clientSecret) throw new Error("TESLA_CLIENT_SECRET manquant sur le serveur");
  if (!hmacKey) {
    hmacKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(clientSecret), { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
      "verify"
    ]);
  }
  return hmacKey;
}
async function signState(payload: string) {
  return b64(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKeyGet(), new TextEncoder().encode(payload))));
}
async function verifyState(state: string) {
  const [payload, mac] = state.split(".");
  if (!payload || !mac) return null;
  const ok = await crypto.subtle.verify("HMAC", await hmacKeyGet(), ub64(mac), new TextEncoder().encode(payload));
  if (!ok) return null;
  try {
    const s = JSON.parse(new TextDecoder().decode(ub64(payload))) as { hid?: string; uid?: string; region?: string; exp?: number };
    if (!s.hid || !s.uid || !s.exp || s.exp < Date.now() || s.exp > Date.now() + 15 * 60e3) return null;
    const region = s.region === "na" ? "na" : "eu";
    return { hid: s.hid, uid: s.uid, region };
  } catch {
    return null;
  }
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

type TeslaCred = {
  household_id: string;
  region: string;
  access_token: string | null;
  refresh_token: string;
  token_expires_at: string | null;
  vehicle_id: string | null;
  vehicle_name: string | null;
  vehicle_vin: string | null;
};

type TeslaVehicle = { id: string; vin: string; display_name: string; state: string };

function fleetBase(region: string) {
  return FLEET[region === "na" ? "na" : "eu"];
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function milesToKm(mi: number | null): number | null {
  if (mi == null) return null;
  return Math.round(mi * 1.609344);
}

function fmtTemp(c: number | null): number | null {
  if (c == null) return null;
  return Math.round(c * 10) / 10;
}

async function teslaTokenExchange(body: URLSearchParams) {
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data as { error_description?: string; error?: string }).error_description ||
      (data as { error?: string }).error || String(r.status);
    throw new Error("Authentification Tesla refusée : " + msg);
  }
  return data as { access_token?: string; refresh_token?: string; expires_in?: number };
}

async function getCred(hid: string): Promise<TeslaCred | null> {
  const { data, error } = await admin.from("household_tesla").select("*").eq("household_id", hid).maybeSingle();
  if (error) throw error;
  return data as TeslaCred | null;
}

async function saveTokens(hid: string, uid: string | null, patch: Partial<TeslaCred> & { refresh_token?: string }) {
  const row = {
    ...patch,
    updated_at: new Date().toISOString(),
    ...(uid ? { updated_by: uid } : {})
  };
  const { error } = await admin.from("household_tesla").upsert({ household_id: hid, ...row });
  if (error) throw error;
}

async function ensureAccess(cred: TeslaCred): Promise<{ access: string; cred: TeslaCred }> {
  const fresh = cred.access_token && cred.token_expires_at && Date.parse(cred.token_expires_at) > Date.now() + 120000;
  if (fresh && cred.access_token) return { access: cred.access_token, cred };
  const data = await teslaTokenExchange(new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: cred.refresh_token
  }));
  const access = data.access_token;
  if (!access) throw new Error("Jeton Tesla invalide — reliez le compte.");
  const refresh = data.refresh_token || cred.refresh_token;
  const expires_at = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await saveTokens(cred.household_id, null, {
    region: cred.region,
    access_token: access,
    refresh_token: refresh,
    token_expires_at: expires_at
  });
  return { access, cred: { ...cred, access_token: access, refresh_token: refresh, token_expires_at: expires_at } };
}

async function fleetFetch(cred: TeslaCred, path: string, init: RequestInit = {}) {
  const { access } = await ensureAccess(cred);
  const base = fleetBase(cred.region);
  const r = await fetch(base + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + access,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> || {})
    }
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

function fleetApiError(r: { status: number; body: unknown }, fallback: string): Error {
  const b = (r.body || {}) as Record<string, unknown>;
  const err = b.error ?? b.response ?? b.error_description;
  const reason = typeof err === "string" ? err : "";
  if (r.status === 412 || /unregistered/i.test(reason)) {
    return new Error(
      "Compte Fleet Tesla non enregistré (register + clé publique sur le domaine). Consultez developer.tesla.com › Fleet API."
    );
  }
  if (r.status === 402) return new Error("Fleet API Tesla : facturation requise ou limite atteinte (402). Vérifiez developer.tesla.com › Billing.");
  if (r.status === 421) return new Error("Région Tesla incorrecte. Déliez Tesla et reliez avec Europe ou Amérique du Nord selon votre compte.");
  if (r.status === 401 || /login_required/i.test(reason)) {
    return new Error("Session Tesla expirée. Déliez puis reliez le compte Tesla dans Domotique.");
  }
  if (r.status === 403) return new Error(reason ? "Accès Tesla refusé : " + reason : "Accès Tesla refusé (scopes ou clé virtuelle).");
  if (reason) return new Error(fallback + " — " + reason);
  return new Error(fallback + " (HTTP " + r.status + ").");
}

async function listVehicles(cred: TeslaCred): Promise<TeslaVehicle[]> {
  const r = await fleetFetch(cred, "/api/1/vehicles");
  if (!r.ok) throw fleetApiError(r, "Liste des véhicules inaccessible");
  const resp = r.body as { response?: unknown[] };
  const list = Array.isArray(resp.response) ? resp.response : [];
  return list.map(v => {
    const o = v as Record<string, unknown>;
    return {
      id: String(o.id ?? o.id_s ?? ""),
      vin: String(o.vin ?? ""),
      display_name: String(o.display_name || o.vehicle_name || "Tesla"),
      state: String(o.state ?? "unknown")
    };
  }).filter(v => v.id);
}

async function wakeIfNeeded(cred: TeslaCred, vehicleId: string) {
  const r = await fleetFetch(cred, `/api/1/vehicles/${vehicleId}/vehicle_data`);
  if (r.status === 408 || (r.body as { error?: string }).error === "vehicle unavailable: asleep") {
    await fleetFetch(cred, `/api/1/vehicles/${vehicleId}/wake_up`, { method: "POST", body: "{}" });
    await new Promise(res => setTimeout(res, 3500));
    return fleetFetch(cred, `/api/1/vehicles/${vehicleId}/vehicle_data`);
  }
  return r;
}

function parseState(data: Record<string, unknown>, cred: TeslaCred) {
  const cs = (data.charge_state || {}) as Record<string, unknown>;
  const vs = (data.vehicle_state || {}) as Record<string, unknown>;
  const cl = (data.climate_state || {}) as Record<string, unknown>;
  const ds = (data.drive_state || {}) as Record<string, unknown>;
  const vehicleId = String(data.id ?? cred.vehicle_id ?? "");
  const name = String(vs.vehicle_name || cred.vehicle_name || "Tesla");
  const battery = num(cs.battery_level);
  const rangeKm = milesToKm(num(cs.battery_range) ?? num(cs.est_battery_range));
  const charging = String(cs.charging_state || "Disconnected");
  const chargerPower = num(cs.charger_power);
  const chargeLimit = num(cs.charge_limit_soc);
  const timeFull = num(cs.time_to_full_charge);
  const inside = fmtTemp(num(cl.inside_temp));
  const outside = fmtTemp(num(cl.outside_temp));
  const climateOn = cl.is_climate_on === true;
  const locked = vs.locked === true;
  const sentry = vs.sentry_mode === true;
  const asleep = String(data.state || ds.state || "") === "asleep" || vs.car_version === "";

  let label = "Prêt";
  if (asleep) label = "En veille";
  else if (/charging/i.test(charging)) {
    label = chargerPower != null && chargerPower > 0 ? `En charge · ${chargerPower} kW` : "En charge";
  } else if (/complete/i.test(charging)) label = "Charge terminée";
  else if (battery != null) label = `${Math.round(battery)} %`;

  return {
    connected: true,
    device_id: vehicleId || cred.vehicle_id,
    device_name: name,
    battery_level: battery,
    battery_range_km: rangeKm,
    charging_state: charging,
    charger_power_kw: chargerPower,
    charge_limit: chargeLimit,
    time_to_full_h: timeFull,
    inside_temp: inside,
    outside_temp: outside,
    climate_on: climateOn,
    locked,
    sentry_mode: sentry,
    asleep,
    label
  };
}

async function readState(cred: TeslaCred) {
  const vehicleId = cred.vehicle_id;
  if (!vehicleId) return { connected: true, device_id: null, label: "Choisissez un véhicule Tesla" };
  const r = await wakeIfNeeded(cred, vehicleId);
  if (!r.ok) throw fleetApiError(r, "État Tesla indisponible");
  const resp = r.body as { response?: Record<string, unknown> };
  const data = resp.response || (r.body as Record<string, unknown>);
  return parseState(data as Record<string, unknown>, cred);
}

async function runCommand(cred: TeslaCred, vehicleId: string, command: string) {
  const allowed = new Set(["door_lock", "door_unlock", "climate_on", "climate_off", "charge_start", "charge_stop"]);
  if (!allowed.has(command)) throw new Error("Commande Tesla inconnue");
  const r = await fleetFetch(cred, `/api/1/vehicles/${vehicleId}/command/${command}`, { method: "POST", body: "{}" });
  if (!r.ok) throw fleetApiError(r, "Commande Tesla refusée");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop() || "";

  try {
    if (action === "callback") {
      if (url.searchParams.has("error")) {
        return Response.redirect(APP_HOME + "?tesla=cancelled", 302);
      }
      const stateRaw = url.searchParams.get("state") || "";
      const parsed = await verifyState(stateRaw);
      if (!parsed) return Response.redirect(APP_HOME + "?tesla=error_state", 302);
      const code = url.searchParams.get("code");
      if (!code) return Response.redirect(APP_HOME + "?tesla=error", 302);
      if (!clientId || !clientSecret) return Response.redirect(APP_HOME + "?tesla=not_configured", 302);
      const audience = fleetBase(parsed.region);
      let tokens;
      try {
        tokens = await teslaTokenExchange(new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: CALLBACK,
          audience
        }));
      } catch (e) {
        console.error(e);
        return Response.redirect(APP_HOME + "?tesla=error", 302);
      }
      if (!tokens.refresh_token) return Response.redirect(APP_HOME + "?tesla=missing_refresh", 302);
      const credProbe: TeslaCred = {
        household_id: parsed.hid,
        region: parsed.region,
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        vehicle_id: null,
        vehicle_name: null,
        vehicle_vin: null
      };
      let vehicles: TeslaVehicle[] = [];
      try {
        vehicles = await listVehicles(credProbe);
      } catch (e) {
        console.error(e);
      }
      const pick = vehicles[0];
      await saveTokens(parsed.hid, parsed.uid, {
        region: parsed.region,
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token,
        token_expires_at: credProbe.token_expires_at,
        vehicle_id: pick?.id ?? null,
        vehicle_name: pick?.display_name ?? null,
        vehicle_vin: pick?.vin ?? null
      });
      if (pick?.id) {
        await admin.from("households").update({ tesla_vehicle_id: pick.id }).eq("id", parsed.hid);
      }
      return Response.redirect(APP_HOME + "?tesla=connected", 302);
    }

    const user = await userFrom(req);
    if (!user) return json(req, { error: "Connexion Maisonnée requise" }, 401);
    const member = await householdOf(user.id);
    if (!member) return json(req, { error: "Vous n'êtes dans aucun foyer" }, 403);
    const hid = member.household_id;
    const payload = req.method === "POST" ? await req.json().catch(() => ({})) as Record<string, unknown> : {};

    if (action === "status") {
      const cred = await getCred(hid);
      const { data: hh } = await admin.from("households").select("tesla_vehicle_id").eq("id", hid).maybeSingle();
      return json(req, {
        connected: !!cred,
        configured: !!(clientId && clientSecret),
        device_id: hh?.tesla_vehicle_id ?? cred?.vehicle_id ?? null,
        device_name: cred?.vehicle_name || null,
        region: cred?.region || "eu"
      });
    }

    if (action === "oauth_begin" && req.method === "POST") {
      if (!clientId || !clientSecret) {
        return json(req, { error: "Tesla n'est pas configuré sur le serveur (TESLA_CLIENT_ID / TESLA_CLIENT_SECRET)." }, 503);
      }
      const region = payload.region === "na" ? "na" : "eu";
      const pl = b64(new TextEncoder().encode(JSON.stringify({
        hid,
        uid: user.id,
        region,
        exp: Date.now() + 10 * 60e3,
        nonce: crypto.randomUUID()
      })));
      const state = pl + "." + await signState(pl);
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: CALLBACK,
        response_type: "code",
        scope: SCOPES,
        state,
        locale: "fr-FR",
        prompt: "login",
        prompt_missing_scopes: "true",
        show_keypair_step: "true"
      });
      return json(req, { url: `${AUTH}/authorize?${params}` });
    }

    if (action === "disconnect" && req.method === "POST") {
      await admin.from("household_tesla").delete().eq("household_id", hid);
      await admin.from("households").update({ tesla_vehicle_id: null }).eq("id", hid);
      return json(req, { connected: false });
    }

    const cred = await getCred(hid);
    if (!cred) return json(req, { error: "Tesla n'est pas relié" }, 400);

    if (action === "devices") {
      const devices = await listVehicles(cred);
      return json(req, { devices: devices.map(d => ({ id: d.id, name: d.display_name, vin: d.vin, state: d.state })) });
    }

    if (action === "state") {
      const st = await readState(cred);
      return json(req, st);
    }

    if (action === "command" && req.method === "POST") {
      const vehicleId = cred.vehicle_id;
      if (!vehicleId) return json(req, { error: "Aucun véhicule Tesla sélectionné" }, 400);
      const act = String(payload.action || "");
      await runCommand(cred, vehicleId, act);
      const st = await readState(cred);
      return json(req, { ok: true, ...st });
    }

    if (action === "pick_device" && req.method === "POST") {
      const deviceId = String(payload.device_id || "");
      const devices = await listVehicles(cred);
      const device = devices.find(d => d.id === deviceId);
      if (!device) return json(req, { error: "Véhicule introuvable" }, 404);
      await admin.from("household_tesla").update({
        vehicle_id: device.id,
        vehicle_name: device.display_name,
        vehicle_vin: device.vin || null,
        updated_at: new Date().toISOString()
      }).eq("household_id", hid);
      await admin.from("households").update({ tesla_vehicle_id: device.id }).eq("id", hid);
      return json(req, { ok: true, device_id: device.id, device_name: device.display_name });
    }

    return json(req, { error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json(req, { error: e instanceof Error ? e.message : "Erreur serveur Tesla" }, 500);
  }
});
