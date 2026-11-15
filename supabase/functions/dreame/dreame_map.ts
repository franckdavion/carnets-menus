import pako from "https://esm.sh/pako@2.1.0";
import {
  parseMapRoomsFromJson,
  roomsFromSegInf,
  unionMapRooms,
  type DreameMapRoom
} from "./clean_payload.ts";

export { roomsFromSegInf };

export function b64ToUtf8(b64: string): string {
  try {
    const bin = atob(b64.replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return b64;
  }
}

export function tryParseJson(raw: unknown): Record<string, unknown> | null {
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

export function collectRoomIds(value: unknown, into: number[]) {
  if (typeof value === "number" && value > 0 && value < 100) into.push(value);
  else if (typeof value === "string" && /^\d+$/.test(value.trim())) into.push(Number(value));
  else if (typeof value === "string" && /^\d+(?:\s*,\s*\d+)+$/.test(value.trim())) {
    for (const p of value.split(",")) collectRoomIds(Number(p.trim()), into);
  } else if (Array.isArray(value)) {
    if (value.length && typeof value[0] === "number") collectRoomIds(value[0], into);
    else value.forEach(v => collectRoomIds(v, into));
  }
}

export function currentRoomIdsFromValue(value: unknown): number[] {
  const ids: number[] = [];
  const json = tryParseJson(value);
  if (!json) {
    collectRoomIds(value, ids);
    return [...new Set(ids)];
  }
  for (const key of ["cur_seg", "current_seg", "curr_seg", "cur_room", "current_room", "room_id", "seg_id", "curSeg", "curid"]) {
    collectRoomIds(json[key], ids);
  }
  for (const key of ["cur_segids", "segment_ids", "room_ids", "areas", "seg_ids", "sa"]) {
    collectRoomIds(json[key], ids);
  }
  for (const nest of ["map_extend", "data", "value", "result"]) {
    const nested = tryParseJson(json[nest]);
    if (nested) ids.push(...currentRoomIdsFromValue(nested));
  }
  return [...new Set(ids.filter(n => n > 0 && n < 100))];
}

export function decodeB64Bytes(s: string): Uint8Array | null {
  try {
    const part = (s.includes(",") ? s.split(",")[0] : s).trim();
    const b64 = part.replace(/_/g, "/").replace(/-/g, "+");
    const bin = atob(b64.replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.length ? bytes : null;
  } catch {
    return null;
  }
}

export function inflateMapBytes(bytes: Uint8Array): Uint8Array | null {
  try {
    return pako.inflate(bytes) as Uint8Array;
  } catch {
    return bytes.length > 27 ? bytes : null;
  }
}

export function readI16(dv: DataView, offset: number) {
  return dv.getInt16(offset, true);
}

export function segmentFromPixel(pixel: number): number {
  if (!pixel) return 0;
  let val = pixel & 0xff;
  if (val > 100 && val < 200) val -= 100;
  else if (val > 200 && val < 260) val -= 200;
  const five = pixel & 0x1f;
  if (five > 0 && five < 31) return five;
  if (val > 0 && val < 60) return val;
  const six = pixel & 0x3f;
  if (six > 0 && six < 60) return six;
  return 0;
}

export function jsonObjectFromBytes(bytes: Uint8Array, from: number): Record<string, unknown> | null {
  const brace = bytes.indexOf(0x7b, Math.max(0, from));
  if (brace < 0) return null;
  const text = new TextDecoder().decode(bytes.subarray(brace));
  const end = text.lastIndexOf("}");
  if (end < 0) return null;
  return tryParseJson(text.slice(0, end + 1));
}

export function segmentAtPixel(
  pixels: Uint8Array,
  width: number,
  height: number,
  left: number,
  top: number,
  grid: number,
  x: number,
  y: number
): number {
  if (grid <= 0 || width <= 0 || height <= 0) return 0;
  const px = Math.round((x - left) / grid);
  const py = Math.round((y - top) / grid);
  const at = (cx: number, cy: number) => {
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) return 0;
    return segmentFromPixel(pixels[cy * width + cx]);
  };
  const direct = at(px, py);
  if (direct) return direct;
  for (let d = 1; d <= 4; d++) {
    for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [d, -d], [-d, d], [-d, -d]]) {
      const found = at(px + dx, py + dy);
      if (found) return found;
    }
  }
  return 0;
}

export function locationFromMapBlob(value: unknown): { ids: number[]; charger: number | null; robot: number | null } {
  const out = { ids: [] as number[], charger: null as number | null, robot: null as number | null };
  const raw = typeof value === "string" ? value : (value && typeof value === "object" && typeof (value as Record<string, unknown>).value === "string"
    ? String((value as Record<string, unknown>).value)
    : "");
  if (!raw || raw.length < 40) return out;
  const compressed = decodeB64Bytes(raw);
  if (!compressed) return out;
  const inflated = inflateMapBytes(compressed);
  if (!inflated || inflated.length < 27) return out;
  const dv = new DataView(inflated.buffer, inflated.byteOffset, inflated.byteLength);
  const robotX = readI16(dv, 5);
  const robotY = readI16(dv, 7);
  const robotA = readI16(dv, 9);
  const chargerX = readI16(dv, 11);
  const chargerY = readI16(dv, 13);
  const chargerA = readI16(dv, 15);
  const grid = readI16(dv, 17);
  const width = readI16(dv, 19);
  const height = readI16(dv, 21);
  const left = readI16(dv, 23);
  const top = readI16(dv, 25);
  const pixLen = width > 0 && height > 0 && width < 2000 && height < 2000 ? width * height : 0;
  const pixels = pixLen && 27 + pixLen <= inflated.length ? inflated.subarray(27, 27 + pixLen) : null;
  const json = jsonObjectFromBytes(inflated, 27 + pixLen);
  let originLeft = left;
  let originTop = top;
  const origin = json && Array.isArray(json.origin) ? json.origin : null;
  if (origin && origin.length > 1) {
    originLeft = Number(origin[0]) || left;
    originTop = Number(origin[1]) || top;
  }
  const pos = json && (json.pos || json.robot || json.robot_pos);
  let rx = robotX;
  let ry = robotY;
  if (Array.isArray(pos) && pos.length >= 2) {
    rx = Number(pos[0]);
    ry = Number(pos[1]);
  }
  const robotMissing = robotA === 32767 && robotX === 32767 && robotY === 32767;
  if (pixels && !robotMissing) {
    out.robot = segmentAtPixel(pixels, width, height, originLeft, originTop, grid, rx, ry) || null;
  }
  if (pixels && chargerA !== 32767) {
    out.charger = segmentAtPixel(pixels, width, height, originLeft, originTop, grid, chargerX, chargerY) || null;
  }
  if (out.robot) out.ids = [out.robot];
  return out;
}

export function locationFromPropValue(value: unknown): { ids: number[]; charger: number | null } {
  const blob = locationFromMapBlob(value);
  const ids: number[] = [];
  if (blob.robot && blob.robot !== blob.charger) ids.push(blob.robot);
  const json = tryParseJson(value);
  if (json) {
    for (const key of ["cur_seg", "current_seg", "curr_seg", "cur_room", "current_room", "curSeg", "curid"]) {
      collectRoomIds(json[key], ids);
    }
    for (const nest of ["rism", "map", "map_extend", "value"]) {
      const nested = json[nest];
      if (typeof nested === "string") {
        const inner = locationFromMapBlob(nested);
        if (inner.charger) blob.charger = inner.charger;
        if (inner.robot && inner.robot !== inner.charger) ids.push(inner.robot);
      }
    }
  }
  return { ids: [...new Set(ids.filter(n => n > 0 && n < 100))], charger: blob.charger };
}

export function jobRoomIdsFromValue(value: unknown): number[] {
  const ids: number[] = [];
  const json = tryParseJson(value);
  if (!json) return ids;
  const selects = json.selects;
  if (Array.isArray(selects)) {
    for (const row of selects) {
      if (Array.isArray(row) && typeof row[0] === "number") ids.push(row[0]);
    }
  }
  for (const key of ["sa", "segment_ids", "seg_ids", "room_ids", "areas"]) {
    collectRoomIds(json[key], ids);
  }
  return [...new Set(ids.filter(n => n > 0 && n < 100))];
}

export function roomsFromMapBlob(value: unknown): DreameMapRoom[] {
  const raw = typeof value === "string" ? value : (value && typeof value === "object" && typeof (value as Record<string, unknown>).value === "string"
    ? String((value as Record<string, unknown>).value)
    : "");
  if (!raw || raw.length < 40) return [];
  const compressed = decodeB64Bytes(raw);
  if (!compressed) return [];
  const inflated = inflateMapBytes(compressed);
  if (!inflated || inflated.length < 27) return [];
  const dv = new DataView(inflated.buffer, inflated.byteOffset, inflated.byteLength);
  const width = readI16(dv, 19);
  const height = readI16(dv, 21);
  const pixLen = width > 0 && height > 0 && width < 2000 && height < 2000 ? width * height : 0;
  const json = jsonObjectFromBytes(inflated, 27 + pixLen);
  return json ? parseMapRoomsFromJson(json) : [];
}

export function parseMapRoomsFromPropValue(value: unknown): DreameMapRoom[] {
  const json = tryParseJson(value);
  const fromJson = parseMapRoomsFromJson(json);
  const fromBlob = roomsFromMapBlob(value);
  const nestedBlobs: DreameMapRoom[][] = [];
  if (json) {
    for (const key of ["map_extend", "data", "value", "rism", "map", "mapstr"]) {
      const nested = (json as Record<string, unknown>)[key];
      if (typeof nested === "string") nestedBlobs.push(roomsFromMapBlob(nested));
    }
  }
  return unionMapRooms([fromJson, fromBlob, ...nestedBlobs]);
}
