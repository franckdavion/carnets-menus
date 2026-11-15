// Helpers purs : nettoyage par pièces Dreame (testables sans appeler le robot).

export type DreameMapRoom = { id: number; name: string };

export function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = typeof n === "number" ? n : parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

export function encodeCleaningMode(mode: number, raw?: number | null) {
  const semantic = clampInt(mode, 0, 3, 2);
  const protocol = semantic === 0 ? 2 : semantic === 2 ? 0 : semantic;
  if (raw != null && Number.isFinite(raw) && raw > 3) return (raw & ~3) | protocol;
  return protocol;
}

export function decodeCleaningMode(value: unknown): { mode: number | null; raw: number | null } {
  if (typeof value !== "number" || !Number.isFinite(value)) return { mode: null, raw: null };
  const protocol = value & 3;
  const mode = protocol === 0 ? 2 : protocol === 2 ? 0 : protocol;
  return { mode, raw: value };
}

/** Ids de segments tels qu'envoyés par Maisonnée. Pas de coincement vers 99 : un id hors plage est ignoré. */
export function parseSegmentIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const ids: number[] = [];
  for (const n of raw) {
    const v = typeof n === "number" ? n : parseInt(String(n ?? "").trim(), 10);
    if (Number.isInteger(v) && v >= 1 && v <= 99) ids.push(v);
  }
  return [...new Set(ids)];
}

/** Segments que le foyer ne veut pas voir dans Maisonnée. La carte Dreame les garde. */
export function withoutHiddenRooms(rooms: DreameMapRoom[] | null | undefined, hidden: unknown): DreameMapRoom[] {
  const list = Array.isArray(rooms) ? rooms.filter(r => r && Number.isInteger(r.id) && r.id >= 1 && r.id <= 99) : [];
  const hide = new Set(parseSegmentIds(hidden));
  if (!hide.size) return list;
  return list.filter(r => !hide.has(r.id));
}

export function unknownSegmentIds(ids: number[], rooms: DreameMapRoom[] | null | undefined): number[] {
  const list = Array.isArray(rooms) ? rooms : [];
  if (!list.length) return [];
  const known = new Set(list.map(r => r.id));
  return ids.filter(id => !known.has(id));
}

export function namesForRoomIds(ids: number[], rooms: DreameMapRoom[]): string[] {
  const byId = new Map(rooms.map(r => [r.id, r.name]));
  return ids.map(id => byId.get(id) || `Pièce ${id}`);
}

export function unknownRoomsError(unknown: number[], rooms: DreameMapRoom[]): string {
  const known = rooms.map(r => `${r.name} (${r.id})`).join(", ");
  return `Pièce(s) absente(s) de la carte Dreame : ${unknown.join(", ")}. Cartes connues : ${known || "aucune"}. Relisez les pièces depuis la carte, sans changer les identifiants à la main.`;
}

export function isGenericRoomName(name: string, id: number) {
  const n = String(name || "").trim();
  if (!n) return true;
  return new RegExp(`^pi[eè]ce\\s*${id}$`, "i").test(n);
}

export function normRoomName(name: string) {
  return String(name || "").trim().toLocaleLowerCase("fr").normalize("NFD").replace(/\p{M}/gu, "");
}

export function decodeSegName(raw: string) {
  const s = String(raw || "").trim();
  if (!s) return s;
  const compact = s.replace(/\s/g, "");
  if (compact.length < 4 || compact.length % 4 !== 0 || !/^[A-Za-z0-9+/]+=*$/.test(compact)) return s;
  try {
    const bin = atob(compact);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\u0000/g, "").trim();
    if (text && /[\p{L}\p{N}]/u.test(text) && !/[\u0000-\u0008]/.test(text)) return text.slice(0, 80);
  } catch { /* nom brut */ }
  return s;
}

export function roomsFromSegInf(segInf: unknown): DreameMapRoom[] {
  if (!segInf || typeof segInf !== "object") return [];
  const out: DreameMapRoom[] = [];
  const push = (id: number, rawName: string) => {
    if (!Number.isInteger(id) || id < 1 || id > 99) return;
    const name = decodeSegName(rawName).slice(0, 80) || `Pièce ${id}`;
    out.push({ id, name });
  };
  if (Array.isArray(segInf)) {
    for (const item of segInf) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const id = clampInt(entry.id ?? entry.sid ?? entry.seg_id, 1, 99, 0);
      const raw = typeof entry.name === "string" ? entry.name
        : typeof entry.roomName === "string" ? entry.roomName
        : `Pièce ${id}`;
      push(id, raw);
    }
    return unionMapRooms([out]);
  }
  for (const [k, v] of Object.entries(segInf as Record<string, unknown>)) {
    const id = parseInt(k, 10);
    if (!Number.isFinite(id)) continue;
    let raw = `Pièce ${id}`;
    if (v && typeof v === "object") {
      const entry = v as Record<string, unknown>;
      if (typeof entry.name === "string" && entry.name) raw = entry.name;
      else if (typeof entry.roomName === "string" && entry.roomName) raw = entry.roomName;
    } else if (typeof v === "string" && v) raw = v;
    push(id, raw);
  }
  return unionMapRooms([out]);
}

export function unionMapRooms(lists: DreameMapRoom[][]) {
  const byId = new Map<number, DreameMapRoom>();
  for (const list of lists) {
    for (const r of list || []) {
      if (!r || !Number.isInteger(r.id) || r.id < 1 || r.id > 99) continue;
      const name = String(r.name || "").trim().slice(0, 80) || `Pièce ${r.id}`;
      const prev = byId.get(r.id);
      if (!prev || (isGenericRoomName(prev.name, r.id) && !isGenericRoomName(name, r.id))) {
        byId.set(r.id, { id: r.id, name });
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export function parseMapRoomsFromJson(json: Record<string, unknown> | null | undefined): DreameMapRoom[] {
  if (!json || typeof json !== "object") return [];
  const lists: DreameMapRoom[][] = [];
  const walk = (node: unknown, depth: number) => {
    if (!node || depth > 8) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (obj.seg_inf) lists.push(roomsFromSegInf(obj.seg_inf));
    if (obj.rooms && typeof obj.rooms === "object") lists.push(roomsFromSegInf(obj.rooms));
    for (const key of ["map_extend", "data", "value", "rism", "map", "result", "map_data", "mapstr"]) {
      const nested = obj[key];
      if (nested && typeof nested === "object") walk(nested, depth + 1);
    }
  };
  walk(json, 0);
  return unionMapRooms(lists);
}

/** Carte live = source. Le cache ne recolle un nom que sur le bon id, et jamais si un autre segment live porte déjà ce nom. */
export function mergeNamedRooms(
  live: DreameMapRoom[] | null | undefined,
  cached: DreameMapRoom[] | null | undefined
): DreameMapRoom[] {
  const liveList = Array.isArray(live) ? live.filter(r => r && Number.isInteger(r.id) && r.id >= 1 && r.id <= 99) : [];
  const cachedList = Array.isArray(cached) ? cached.filter(r => r && Number.isInteger(r.id) && r.id >= 1 && r.id <= 99) : [];
  if (!liveList.length) {
    return unionMapRooms([cachedList.map(r => ({ id: r.id, name: String(r.name || "").trim() || `Pièce ${r.id}` }))]);
  }
  const liveIds = new Set(liveList.map(r => r.id));
  const cacheIds = new Set(cachedList.map(r => r.id));
  const liveGrew = [...liveIds].some(id => !cacheIds.has(id));
  const liveNamed = new Map<string, number>();
  for (const r of liveList) {
    const name = String(r.name || "").trim();
    if (name && !isGenericRoomName(name, r.id)) liveNamed.set(normRoomName(name), r.id);
  }
  const mergedLive = liveList.map(r => {
    const liveName = String(r.name || "").trim() || `Pièce ${r.id}`;
    const custom = cachedList.find(c => c.id === r.id);
    const cn = custom ? String(custom.name || "").trim() : "";
    if (!cn) return { id: r.id, name: liveName };
    const claimed = liveNamed.get(normRoomName(cn));
    if (claimed != null && claimed !== r.id) return { id: r.id, name: liveName };
    if (!isGenericRoomName(liveName, r.id) && normRoomName(liveName) !== normRoomName(cn)) {
      return { id: r.id, name: liveName };
    }
    if (liveGrew && isGenericRoomName(liveName, r.id) && normRoomName(cn) !== normRoomName(liveName)) {
      return { id: r.id, name: liveName };
    }
    return { id: r.id, name: cn };
  });
  if (liveList.length >= cachedList.length) return unionMapRooms([mergedLive]);
  const extras = cachedList
    .filter(c => !liveIds.has(c.id))
    .map(c => ({ id: c.id, name: String(c.name || "").trim() || `Pièce ${c.id}` }));
  return unionMapRooms([mergedLive, extras]);
}

/** HA dreame_vacuum 2.0.3 : les selects portent les niveaux réels ; le mode va dans CLEANING_MODE (4.23). */
export function suctionWaterForClean(_cleaningMode: number, suction: number, water: number) {
  return { suction: clampInt(suction, 0, 3, 1), water: clampInt(water, 1, 3, 2) };
}

export function buildSegmentSelects(
  segmentIds: number[],
  repeats: number,
  cleaningMode: number,
  suction: number,
  water: number
) {
  const rep = clampInt(repeats, 1, 3, 1);
  const sw = suctionWaterForClean(cleaningMode, suction, water);
  // 5e valeur = 1 : les D20 / 5e gen cassent si on y met l'index de pièce (Tasshack / HA v2.0.3).
  return segmentIds.map(id => [id, rep, sw.suction, sw.water, 1]);
}

export function startCustomParams(selects: number[][]) {
  return {
    siid: 4,
    aiid: 1,
    in: [
      { piid: 1, value: 18 },
      { piid: 10, value: JSON.stringify({ selects }) }
    ]
  };
}

export const CLEAN_ROUTES = { standard: 1, intensive: 2, deep: 3, fast: 4 } as const;

export function routeAllowed(mode: number, route: keyof typeof CLEAN_ROUTES) {
  return Number(mode) === 1 || Number(mode) === 3 || route === "fast" || route === "standard";
}

/** Ordre HA : d’abord CLEANING_MODE (set_properties), ensuite START_CUSTOM. Jamais CleanRoute ni REQUEST_MAP entre les deux. */
export const START_SEQUENCE = ["set_cleaning_mode", "start_custom"] as const;

export const CLEANING_IN_PROGRESS = new Set([
  1, 5, 7, 10, 12, 15, 17, 18, 25, 27, 37, 38, 101, 116, 117, 120, 122
]);

export function isCleaningInProgress(status: number | null | undefined) {
  return typeof status === "number" && CLEANING_IN_PROGRESS.has(status);
}

/** Ne pas lancer REQUEST_MAP pendant un départ : l’état robot prime sur un simple délai. */
export function shouldSkipMapRequest(status: number | null | undefined, lastCommandAt: number | null | undefined, now = Date.now()) {
  if (lastCommandAt != null && now - lastCommandAt < 25_000) return true;
  return isCleaningInProgress(status ?? null);
}

export function planSegmentClean(
  segmentIds: number[],
  repeats: number,
  cleaningMode: number,
  suction: number,
  water: number
) {
  const mode = clampInt(cleaningMode, 0, 3, 2);
  const selects = buildSegmentSelects(segmentIds, repeats, mode, suction, water);
  return {
    cleaning_mode: mode,
    cleaning_mode_encoded: encodeCleaningMode(mode),
    selects,
    action: startCustomParams(selects),
    sequence: START_SEQUENCE
  };
}

export function summarizeMiotParams(params: unknown) {
  if (!params || typeof params !== "object") return { kind: typeof params };
  const p = params as Record<string, unknown>;
  const inArr = Array.isArray(p.in) ? p.in as { piid?: number; value?: unknown }[] : null;
  let selects: unknown = null;
  if (inArr) {
    const ten = inArr.find(x => x.piid === 10);
    if (ten && typeof ten.value === "string") {
      try { selects = JSON.parse(ten.value).selects; } catch { /* ignore */ }
    }
  }
  return {
    siid: typeof p.siid === "number" ? p.siid : null,
    aiid: typeof p.aiid === "number" ? p.aiid : null,
    piid: typeof p.piid === "number" ? p.piid : null,
    in_piids: inArr ? inArr.map(x => x.piid ?? null) : null,
    selects
  };
}
