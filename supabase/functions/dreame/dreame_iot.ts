import { clampInt, encodeCleaningMode, summarizeMiotParams } from "./clean_payload.ts";
import {
  admin, APP_META, APP_UA, AUTO_SWITCH_SETTINGS, CLEANING_MODE, FROM_FIELD,
  IOT_PREFIX, OAUTH_BASIC, STATE_LABELS, TENANT,
  type DreameCred, type DreameDevice,
  dreameHeaders, dreameUrl, hashPassword, logDreameDiag, randomReqId
} from "./dreame_config.ts";

export class DreameUnreachableError extends Error {
  readonly dreameCode = 80001;
  constructor() {
    super("Le robot ne répond pas aux commandes. La charge affichée vient du cloud Dreame : ouvrez l'app Dreame Home ou réveillez l'aspirateur, puis réessayez.");
    this.name = "DreameUnreachableError";
  }
}
export function isUnreachable(e: unknown) {
  return e instanceof DreameUnreachableError || (e instanceof Error && /80001|ne répond pas aux commandes|hors ligne ou injoignable/i.test(e.message));
}

export async function dreamePost<T extends { code?: number; msg?: string; error?: string; error_description?: string }>(
  cred: DreameCred,
  url: string,
  headers: Record<string, string>,
  body: string | URLSearchParams,
  ctx: string,
  skipCode = false,
  allowOffline = false
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`${ctx} : le cloud Dreame ne répond pas assez vite. Réessayez.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
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
    logDreameDiag("iot_error", { ctx, http: res.status, code: parsed.code, msg: parsed.msg ?? null });
    if (parsed.code === 80001) {
      if (allowOffline) return parsed;
      throw new DreameUnreachableError();
    }
    throw new Error(`${ctx} : ${parsed.msg ?? "code " + parsed.code}`);
  }
  if (!/Connexion|Renouvellement/.test(ctx)) {
    logDreameDiag("iot", { ctx, http: res.status, code: parsed.code ?? 0 });
  }
  return parsed;
}

export async function dreameLogin(cred: Pick<DreameCred, "email" | "password" | "region" | "country" | "lang">) {
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

export async function dreameRefresh(cred: DreameCred) {
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

export async function saveTokens(hid: string, tok: { access_token: string; refresh_token: string | null; expires_at: string; uid: string | null }) {
  await admin.from("household_dreame").update({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    token_expires_at: tok.expires_at,
    uid: tok.uid,
    updated_at: new Date().toISOString()
  }).eq("household_id", hid);
}

export async function ensureSession(cred: DreameCred): Promise<DreameCred> {
  const exp = cred.token_expires_at ? Date.parse(cred.token_expires_at) : 0;
  if (cred.access_token && exp > Date.now() + 120_000) return cred;
  const tok = cred.refresh_token && exp > 0
    ? await dreameRefresh(cred).catch(() => dreameLogin(cred))
    : await dreameLogin(cred);
  await saveTokens(cred.household_id, tok);
  return { ...cred, access_token: tok.access_token, refresh_token: tok.refresh_token, token_expires_at: tok.expires_at, uid: tok.uid };
}

export function parseDeviceRaw(raw: Record<string, unknown>): DreameDevice {
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

export async function dreameListDevices(cred: DreameCred): Promise<DreameDevice[]> {
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

export function pickDefaultDevice(devices: DreameDevice[], pickDid?: string | null) {
  const vacuums = devices.filter(d => /vacuum|dreame/i.test(d.model) || d.model.startsWith("dreame."));
  const pool = vacuums.length ? vacuums : devices;
  if (pickDid) {
    const found = pool.find(d => d.did === pickDid) || devices.find(d => d.did === pickDid);
    if (found) return found;
  }
  const d20 = pool.find(d => /d20/i.test(d.model + d.name));
  return d20 || pool[0] || null;
}

export function statusLabel(status: number | null, online: boolean) {
  if (!online) return "Hors ligne";
  if (status == null) return "En ligne";
  return STATE_LABELS[status] ?? `État ${status}`;
}

export async function dreameSendCommand(cred: DreameCred, did: string, method: string, params: unknown) {
  const session = await ensureSession(cred);
  const id = randomReqId();
  const summary = summarizeMiotParams(params);
  logDreameDiag("send_command", { method, ...summary });
  const data = await dreamePost<{ code?: number; msg?: string }>(
    session,
    dreameUrl(session.region, `/dreame-iot-com-${IOT_PREFIX}/device/sendCommand`),
    dreameHeaders(session, session.access_token, true),
    JSON.stringify({
      did,
      id,
      data: { did, id, method, params, from: FROM_FIELD }
    }),
    method,
    false,
    true
  );
  logDreameDiag("send_command_result", { method, ...summary, code: data.code ?? null, msg: data.msg ?? null });
  return data;
}

export type PropRow = { siid: number; piid: number; value?: unknown };

export async function dreameGetPropRows(cred: DreameCred, did: string, props: { siid: number; piid: number }[]): Promise<PropRow[]> {
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
    "Lecture propriétés",
    false,
    true
  );
  if (data.code === 80001) return [];
  return Array.isArray(data.data?.result) ? data.data!.result! : (Array.isArray(data.result) ? data.result : []);
}

export async function dreameWriteCleaningMode(cred: DreameCred, did: string, mode: number, raw?: number | null) {
  await dreameSetPropRows(cred, did, [
    { siid: CLEANING_MODE.siid, piid: CLEANING_MODE.piid, value: encodeCleaningMode(mode, raw ?? null) }
  ]);
}

export async function dreameWriteCleaningRoute(cred: DreameCred, did: string, route: number) {
  await dreameSetPropRows(cred, did, [{
    siid: AUTO_SWITCH_SETTINGS.siid,
    piid: AUTO_SWITCH_SETTINGS.piid,
    value: JSON.stringify({ k: "CleanRoute", v: clampInt(route, 1, 4, 1) })
  }]);
}

export async function dreameSetPropRows(cred: DreameCred, did: string, props: { siid: number; piid: number; value: unknown }[]) {
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
    "Réglage aspirateur",
    false,
    true
  );
}
