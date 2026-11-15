import {
  clampInt, decodeCleaningMode, isCleaningInProgress, mergeNamedRooms, namesForRoomIds, planSegmentClean,
  shouldSkipMapRequest, unionMapRooms, type DreameMapRoom
} from "./clean_payload.ts";
import {
  admin, AUTO_SWITCH_SETTINGS, BATTERY_LEVEL, CLEANING_MODE, CLEANING_MODE_LABELS,
  CLEANING_PROGRESS_INFO, CLEANING_PROPERTIES, DOCK_STATUSES, MAP_DATA, MAP_EXTEND_DATA,
  MOP_PADS_STATE, SEGMENT_CLEAN_MODE, SUCTION_LABELS, SUCTION_LEVEL,
  VACUUM_STATE, WATER_LABELS, WATER_VOLUME, ACT_REQUEST_MAP, ACT_START_CUSTOM, REGION_HOSTS,
  type DreameCred, type DreameProgram, logDreameDiag
} from "./dreame_config.ts";
import {
  dreameGetPropRows, dreameListDevices, dreameSendCommand, dreameWriteCleaningMode,
  isUnreachable, statusLabel
} from "./dreame_iot.ts";
import { b64ToUtf8, jobRoomIdsFromValue, locationFromPropValue, parseMapRoomsFromPropValue } from "./dreame_map.ts";

export { mergeNamedRooms };

export function parseAutoSwitchMap(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  let parsed: unknown = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch {
      try { parsed = JSON.parse(b64ToUtf8(value)); } catch { return out; }
    }
  }
  const items = Array.isArray(parsed)
    ? parsed
    : (parsed && typeof parsed === "object" && "k" in (parsed as object) ? [parsed] : []);
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const k = (item as { k?: unknown }).k;
    const v = (item as { v?: unknown }).v;
    if (typeof k === "string" && typeof v === "number") out[k] = v;
  }
  return out;
}

export function cleaningRouteFromAutoSwitch(value: unknown): number | null {
  const v = parseAutoSwitchMap(value).CleanRoute;
  if (v == null || v < 1 || v > 4) return null;
  return v;
}

export async function dreameReadSettings(cred: DreameCred, did: string, includeMaps = false, prefsOnly = false) {
  const props = prefsOnly
    ? [VACUUM_STATE, BATTERY_LEVEL, SUCTION_LEVEL, WATER_VOLUME, CLEANING_MODE, AUTO_SWITCH_SETTINGS]
    : [
      VACUUM_STATE,
      BATTERY_LEVEL,
      SUCTION_LEVEL,
      WATER_VOLUME,
      CLEANING_MODE,
      AUTO_SWITCH_SETTINGS,
      MOP_PADS_STATE,
      CLEANING_PROPERTIES
    ];
  if (includeMaps) props.push(MAP_EXTEND_DATA, MAP_DATA);
  const rows = await dreameGetPropRows(cred, did, props);
  let status: number | null = null;
  let battery: number | null = null;
  let suction: number | null = null;
  let water: number | null = null;
  let cleaning_mode: number | null = null;
  let cleaning_mode_raw: number | null = null;
  let cleaning_route: number | null = null;
  const current_room_ids: number[] = [];
  let charger_room_id: number | null = null;
  for (const row of rows) {
    if (row.siid === 2 && row.piid === 1 && typeof row.value === "number") status = row.value;
    if (row.siid === 3 && row.piid === 1 && typeof row.value === "number") battery = row.value;
    if (row.siid === 4 && row.piid === 4 && typeof row.value === "number") suction = row.value;
    if (row.siid === 4 && row.piid === 5 && typeof row.value === "number") water = row.value;
    if (row.siid === 4 && row.piid === 23) {
      const decoded = decodeCleaningMode(row.value);
      cleaning_mode = decoded.mode;
      cleaning_mode_raw = decoded.raw;
    }
    if (row.siid === 4 && row.piid === 50) cleaning_route = cleaningRouteFromAutoSwitch(row.value);
    if ((row.siid === 4 && row.piid === 10) || (row.siid === 6 && (row.piid === 4 || row.piid === 1))) {
      const loc = locationFromPropValue(row.value);
      current_room_ids.push(...loc.ids);
      if (loc.charger) charger_room_id = loc.charger;
    }
  }
  return {
    status, battery, suction, water, cleaning_mode, cleaning_mode_raw, cleaning_route,
    current_room_ids: [...new Set(current_room_ids)],
    charger_room_id
  };
}

const lastCleanAt = new Map<string, number>();

export function markCleanCommand(did: string) {
  lastCleanAt.set(did, Date.now());
}

export function lastCleanCommandAt(did: string) {
  return lastCleanAt.get(did) ?? null;
}

function statusFromRows(rows: { siid: number; piid: number; value?: unknown }[]) {
  for (const row of rows) {
    if (row.siid === VACUUM_STATE.siid && row.piid === VACUUM_STATE.piid && typeof row.value === "number") {
      return row.value;
    }
  }
  return null;
}

export async function dreameReadVacuumStatus(cred: DreameCred, did: string): Promise<number | null> {
  const rows = await dreameGetPropRows(cred, did, [VACUUM_STATE]);
  return statusFromRows(rows);
}

export async function dreameReadRobotLocation(cred: DreameCred, did: string): Promise<{ robot: number | null; charger: number | null; job: number[] }> {
  // HA lit les propriétés, sans REQUEST_MAP : cette action interrompt START_CUSTOM.
  const rows = await dreameGetPropRows(cred, did, [MAP_EXTEND_DATA, CLEANING_PROPERTIES, CLEANING_PROGRESS_INFO, VACUUM_STATE]);
  let robot: number | null = null;
  let charger: number | null = null;
  const job: number[] = [];
  for (const row of rows) {
    const loc = locationFromPropValue(row.value);
    if (loc.ids[0]) robot = loc.ids[0];
    if (loc.charger) charger = loc.charger;
    job.push(...jobRoomIdsFromValue(row.value));
  }
  logDreameDiag("robot_where", { status: statusFromRows(rows), has_robot: robot != null, job_count: job.length, map_request: false });
  return { robot, charger, job: [...new Set(job)] };
}

export async function dreameFetchMapRooms(cred: DreameCred, did: string): Promise<{ rooms: DreameMapRoom[]; hint: string | null; live_ok: boolean }> {
  let status: number | null = null;
  try {
    status = await dreameReadVacuumStatus(cred, did);
  } catch { /* lecture d'état facultative */ }
  const skipMap = shouldSkipMapRequest(status, lastCleanCommandAt(did));
  if (skipMap) {
    logDreameDiag("request_map_skipped", { status, last_clean_ms: lastCleanCommandAt(did) });
  } else {
    try {
      await dreameSendCommand(cred, did, "action", {
        siid: ACT_REQUEST_MAP.siid,
        aiid: ACT_REQUEST_MAP.aiid,
        in: []
      });
      await new Promise(r => setTimeout(r, 1200));
    } catch { /* map may already be cached */ }
  }

  try {
    const rows = await dreameGetPropRows(cred, did, [MAP_DATA, MAP_EXTEND_DATA, CLEANING_PROPERTIES]);
    let rooms: DreameMapRoom[] = [];
    for (const row of rows) {
      rooms = unionMapRooms([rooms, parseMapRoomsFromPropValue(row.value)]);
    }
    logDreameDiag("map_rooms_parsed", { ids: rooms.map(r => r.id), count: rooms.length, skip_map: skipMap });
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

export async function dreameCleanSegments(
  cred: DreameCred,
  did: string,
  segmentIds: number[],
  settings: { cleaning_mode: number; suction: number; water: number; repeats: number; cleaning_mode_raw?: number | null }
) {
  const plan = planSegmentClean(
    segmentIds,
    settings.repeats,
    settings.cleaning_mode,
    settings.suction,
    settings.water
  );
  markCleanCommand(did);
  let mode_write_ok = false;
  try {
    logDreameDiag("set_cleaning_mode", {
      cleaning_mode: plan.cleaning_mode,
      encoded: plan.cleaning_mode_encoded,
      segments: segmentIds
    });
    await dreameWriteCleaningMode(cred, did, plan.cleaning_mode, settings.cleaning_mode_raw ?? null);
    mode_write_ok = true;
  } catch (e) {
    logDreameDiag("set_cleaning_mode_error", { message: e instanceof Error ? e.message : "erreur" });
  }
  logDreameDiag("start_custom", {
    siid: ACT_START_CUSTOM.siid,
    aiid: ACT_START_CUSTOM.aiid,
    piid_1: SEGMENT_CLEAN_MODE,
    selects: plan.selects,
    sequence: plan.sequence,
    mode_write_ok
  });
  const sent = await dreameSendCommand(cred, did, "action", {
    siid: ACT_START_CUSTOM.siid,
    aiid: ACT_START_CUSTOM.aiid,
    in: plan.action.in
  });
  let robot_status: number | null = null;
  let clean_confirmed = false;
  try {
    robot_status = await dreameReadVacuumStatus(cred, did);
    clean_confirmed = isCleaningInProgress(robot_status);
    logDreameDiag("start_custom_state", {
      robot_status,
      clean_confirmed,
      cloud_code: sent.code ?? null
    });
  } catch (e) {
    logDreameDiag("start_custom_state_error", { message: e instanceof Error ? e.message : "erreur" });
  }
  return {
    selects: plan.selects,
    cleaning_mode: plan.cleaning_mode,
    cleaning_mode_encoded: plan.cleaning_mode_encoded,
    mode_write_ok,
    robot_status,
    clean_confirmed,
    cloud_code: sent.code ?? null
  };
}

export function listPrograms(cred: DreameCred): DreameProgram[] {
  return Array.isArray(cred.clean_programs) ? cred.clean_programs.filter(p => p && p.id && p.name) : [];
}

export function normalizeProgram(raw: Record<string, unknown>, fallbackId?: string): DreameProgram | null {
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
    cleaning_mode: clampInt(raw.cleaning_mode, 0, 3, 2),
    suction: clampInt(raw.suction, 0, 3, 1),
    water: clampInt(raw.water, 1, 3, 2),
    repeats: clampInt(raw.repeats, 1, 3, 1),
    room_ids
  };
}

export function settingsLabels(settings: {
  suction: number | null;
  water: number | null;
  cleaning_mode: number | null;
}) {
  const s = settings.suction != null ? clampInt(settings.suction, 0, 3, 1) : null;
  const w = settings.water != null ? clampInt(settings.water, 1, 3, 2) : null;
  const m = settings.cleaning_mode != null ? clampInt(settings.cleaning_mode, 0, 3, 2) : null;
  return {
    suction: s,
    water: w,
    cleaning_mode: m,
    suction_label: s != null ? (SUCTION_LABELS[s] ?? String(s)) : null,
    water_label: w != null ? (WATER_LABELS[w] ?? String(w)) : null,
    cleaning_mode_label: m != null ? (CLEANING_MODE_LABELS[m] ?? String(m)) : null
  };
}

export async function getCred(hid: string): Promise<DreameCred | null> {
  const { data, error } = await admin.from("household_dreame").select("*").eq("household_id", hid).maybeSingle();
  if (error) throw error;
  return data as DreameCred | null;
}

export function packAutoWash(cred: DreameCred | null) {
  const row = cred as (DreameCred & Record<string, unknown>) | null;
  if (!row) {
    return { enabled: false, interval_minutes: 5, last_tick_at: null, last_sent_at: null, last_error: null, count: 0 };
  }
  return {
    enabled: row.auto_wash_enabled === true,
    interval_minutes: Number(row.auto_wash_interval_minutes) || 5,
    last_tick_at: row.auto_wash_last_tick_at || null,
    last_sent_at: row.auto_wash_last_sent_at || null,
    last_error: row.auto_wash_last_error || null,
    count: Number(row.auto_wash_count) || 0
  };
}

export async function readState(cred: DreameCred, quick = false) {
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
  let current_room_ids: number[] = [];
  let charger_room_id: number | null = cred.dock_room_id ?? null;
  try {
    if (!quick) {
      const live = await dreameReadSettings(cred, did, false);
      if (live.status != null) status = live.status;
      if (live.battery != null) battery = live.battery;
      suction = live.suction;
      water = live.water;
      cleaning_mode = live.cleaning_mode;
      current_room_ids = live.current_room_ids || [];
      if (live.charger_room_id) charger_room_id = live.charger_room_id;
      live_ok = live.status != null || live.battery != null || live.cleaning_mode != null || live.suction != null || live.water != null;
    }
  } catch (e) {
    live_ok = false;
    if (!isUnreachable(e)) {
      /* keep listV2 values */
    }
  }
  if (!quick && !DOCK_STATUSES.has(status ?? -1) && !shouldSkipMapRequest(status, lastCleanCommandAt(did))) {
    try {
      const loc = await dreameReadRobotLocation(cred, did);
      if (loc.robot) current_room_ids = [loc.robot];
      if (loc.charger) charger_room_id = loc.charger;
    } catch {
      /* garder les ids déjà lus */
    }
  }
  if (charger_room_id && charger_room_id !== cred.dock_room_id) {
    await admin.from("household_dreame").update({
      dock_room_id: charger_room_id,
      updated_at: new Date().toISOString()
    }).eq("household_id", cred.household_id);
  }
  // La pièce de la station (souvent Cuisine) ne s’affiche que si le robot y est vraiment.
  if (DOCK_STATUSES.has(status ?? -1) && charger_room_id) {
    current_room_ids = [charger_room_id];
  }
  const prefs = settingsLabels({ suction, water, cleaning_mode });
  const charge = battery != null ? `${battery} %` : null;
  const reachable = live_ok || dev.online;
  const stateBit = statusLabel(status, reachable);
  const mapRooms = Array.isArray(cred.map_rooms) ? cred.map_rooms as DreameMapRoom[] : [];
  const current_rooms = namesForRoomIds(current_room_ids, mapRooms);
  const dockedHere = DOCK_STATUSES.has(status ?? -1) && current_rooms.length;
  const where = current_rooms.length ? ` · ${current_rooms.join(", ")}${dockedHere ? " (station)" : ""}` : "";
  const label = (charge ? `${stateBit} · ${charge}` : stateBit) + where;
  return {
    connected: true,
    device_id: did,
    device_name: dev.name || cred.device_name || "Dreame",
    device_model: dev.model || cred.device_model,
    online: reachable,
    live_ok: live_ok || dev.online,
    commandable: true,
    battery,
    status,
    label,
    ...(quick && !current_room_ids.length ? {} : { current_room_ids, current_rooms }),
    settings_readable: !quick && live_ok,
    quick: !!quick,
    ...prefs
  };
}

export function normalizeRegion(r: unknown) {
  const t = String(r || "eu").toLowerCase();
  return REGION_HOSTS[t] ? t : "eu";
}

export function routeAction(url: URL, payload: Record<string, unknown>) {
  const parts = url.pathname.split("/").filter(Boolean);
  let action = parts[parts.length - 1] || "";
  if (action === "dreame" || action === "functions" || action === "v1") {
    action = String(url.searchParams.get("action") || payload.route || "");
  }
  return action;
}
