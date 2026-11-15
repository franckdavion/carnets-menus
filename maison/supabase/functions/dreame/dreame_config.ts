import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import aesjs from "https://esm.sh/aes-js@3.1.2";
import md5 from "https://esm.sh/md5@2.3.0";

export const FN_REV = "20261110d";

export function originOk(origin: string) {
  if (!origin) return false;
  try {
    const h = new URL(origin).hostname.toLowerCase();
    return h === "franckdavion.github.io"
      || h === "carnets-menus.vercel.app"
      || h === "carnets-menus-franckdavion.vercel.app"
      || /^carnets-menus-[a-z0-9]+-franckdavion\.vercel\.app$/.test(h)
      || h === "localhost" || h === "127.0.0.1" || h === "192.168.0.146";
  } catch {
    return false;
  }
}

export const sbUrl = Deno.env.get("SUPABASE_URL")!;
export const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
export const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const admin = createClient(sbUrl, service, { auth: { persistSession: false } });

export const ALLOWED = new Set([
  "https://franckdavion.github.io",
  "http://192.168.0.146:8765",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
  "http://127.0.0.1:8766",
  "http://localhost:8766"
]);

export const REGION_HOSTS: Record<string, string> = {
  eu: "eu.iot.dreame.tech:13267",
  us: "us.iot.dreame.tech:13267",
  cn: "cn.iot.dreame.tech:13267",
  ru: "ru.iot.dreame.tech:13267",
  sg: "sg.iot.dreame.tech:13267",
  in: "in.iot.dreame.tech:13267",
  de: "eu.iot.dreame.tech:13267",
  tw: "cn.iot.dreame.tech:13267"
};

export const REGION_DEFAULT_COUNTRY: Record<string, string> = {
  eu: "GB", us: "US", cn: "CN", ru: "RU", sg: "SG", in: "IN", de: "DE", tw: "TW"
};

export const OAUTH_BASIC = "Basic ZHJlYW1lX2FwcHYxOkFQXmR2QHpAU1FZVnhOODg=";
export const APP_META = "cv=i_829";
export const APP_UA = "Dart/3.2 (dart:io)";
export const TENANT = "000000";
export const PASSWORD_SALT = "RAylYC%fmSKp7%Tq";
export const RLC_AES_KEY = "EETjszu*XI5znHsI";
export const IOT_PREFIX = 10000;
export const FROM_FIELD = "XXXXXX";

export const VACUUM_STATE = { siid: 2, piid: 1 };
export const BATTERY_LEVEL = { siid: 3, piid: 1 };
export const SUCTION_LEVEL = { siid: 4, piid: 4 };
export const WATER_VOLUME = { siid: 4, piid: 5 };
export const CLEANING_MODE = { siid: 4, piid: 23 };
export const AUTO_SWITCH_SETTINGS = { siid: 4, piid: 50 };
export const MAP_EXTEND_DATA = { siid: 6, piid: 4 };
export const MAP_DATA = { siid: 6, piid: 1 };
export const CLEANING_PROPERTIES = { siid: 4, piid: 10 };
export const CLEANING_PROGRESS_INFO = { siid: 4, piid: 66 };
export const DOCK_STATUSES = new Set([
  5, 6, 8, 9, 10, 13, 16, 17, 18, 19, 20, 21, 22, 24, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  105, 106, 116, 117, 118, 121, 122
]);
export const ACT_START = { siid: 2, aiid: 1 };
export const ACT_PAUSE = { siid: 2, aiid: 2 };
export const ACT_STOP = { siid: 4, aiid: 2 };
export const ACT_CHARGE = { siid: 3, aiid: 1 };
export const ACT_START_CUSTOM = { siid: 4, aiid: 1 };
export const ACT_REQUEST_MAP = { siid: 6, aiid: 1 };
export const SEGMENT_CLEAN_MODE = 18;

export const SUCTION_LABELS = ["Silencieux", "Standard", "Fort", "Turbo"];
export const WATER_LABELS = ["", "Faible", "Moyen", "Fort"];
export const CLEANING_MODE_LABELS = ["Aspiration", "Serpillière", "Aspiration + serpillière", "Serpillière après aspiration"];
export const MOP_PADS_STATE = { siid: 2, piid: 6 };

export const STATE_LABELS: Record<number, string> = {
  1: "Nettoyage",
  2: "Veille",
  3: "Pause",
  4: "Erreur",
  5: "Retour base",
  6: "Charge",
  7: "Lavage du sol",
  8: "Séchage serpillière",
  9: "Lavage serpillière",
  10: "Retour lavage serpillière",
  11: "Cartographie",
  12: "Aspiration et lavage",
  13: "Charge terminée",
  14: "Mise à jour",
  15: "Appel nettoyage",
  16: "Réinitialisation station",
  17: "Retour (pose serpillière)",
  18: "Retour (retrait serpillière)",
  19: "Contrôle de l’eau",
  20: "Remplissage d’eau",
  21: "Lavage serpillière en pause",
  22: "Vidage auto",
  23: "Télécommande",
  24: "Charge intelligente",
  25: "Second passage",
  26: "Suivi d’une personne",
  27: "Nettoyage localisé",
  28: "Retour vidage",
  29: "En attente de tâche",
  30: "Entretien de la base",
  31: "Retour vidange",
  32: "Vidange",
  33: "Vidange auto",
  34: "Vidage",
  35: "Séchage du sac",
  36: "Séchage du sac en pause",
  37: "Vers un nettoyage extra",
  38: "Nettoyage extra",
  95: "Recherche animal en pause",
  96: "Recherche animal",
  97: "Raccourci",
  98: "Surveillance",
  99: "Surveillance en pause",
  101: "Nettoyage profond",
  102: "Nettoyage profond en pause",
  103: "Désinfection",
  104: "Désinfection et séchage",
  105: "Changement de serpillière",
  106: "Changement de serpillière en pause",
  107: "Entretien du sol",
  108: "Entretien du sol en pause",
  109: "Ramassage à distance",
  113: "Rangement d’objets",
  114: "Garde animal",
  115: "Garde animal en pause",
  116: "Pose de la serpillière",
  117: "Retrait de la serpillière",
  118: "Recharge intelligente",
  120: "Nettoyage assisté",
  121: "Entrée en station",
  122: "Sortie de station",
  140: "Vers l’élévateur",
  141: "Accostage élévateur",
  142: "Sur l’élévateur",
  143: "Déplacement élévateur",
  144: "Montée d’escalier",
  145: "Escalier terminé",
  146: "Élévateur à la base",
  147: "Sortie de l’élévateur"
};

export function logDreameDiag(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ dreame: event, ...payload, at: new Date().toISOString() }));
}

export function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": originOk(origin) ? origin : "https://franckdavion.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
export const json = (req: Request, v: unknown, status = 200) =>
  new Response(JSON.stringify(typeof v === "object" && v !== null && !Array.isArray(v) ? { ...v as Record<string, unknown>, fn: FN_REV } : v), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store", "X-Maisonnee-Dreame": FN_REV }
  });

export async function userFrom(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(sbUrl, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  return error ? null : data.user;
}

export async function householdOf(uid: string) {
  const { data, error } = await admin.from("household_members").select("household_id, role").eq("user_id", uid).limit(1);
  if (error || !data?.[0]) return null;
  return data[0];
}

export type DreameCred = {
  household_id: string;
  email: string;
  password: string;
  region: string;
  country: string;
  lang: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  uid: string | null;
  device_id: string | null;
  device_name: string | null;
  device_model: string | null;
  map_rooms?: { id: number; name: string }[] | null;
  hidden_map_room_ids?: number[] | null;
  clean_programs?: DreameProgram[] | null;
  dock_room_id?: number | null;
};

export type DreameProgram = {
  id: string;
  name: string;
  cleaning_mode: number;
  suction: number;
  water: number;
  repeats: number;
  room_ids: number[];
};

export type DreameDevice = { did: string; name: string; model: string; online: boolean; battery: number | null; status: number | null };

export function hashPassword(plain: string) {
  return md5(plain + PASSWORD_SALT);
}

export function buildRlc(region: string, lang: string, country: string) {
  const plain = `${region}|${lang}|${country}`;
  const key = aesjs.utils.utf8.toBytes(RLC_AES_KEY);
  const textBytes = aesjs.utils.utf8.toBytes(plain);
  const padded = aesjs.padding.pkcs7.pad(textBytes);
  const aesEcb = new aesjs.ModeOfOperation.ecb(key);
  return aesjs.utils.hex.fromBytes(aesEcb.encrypt(padded));
}

export function dreameHeaders(cred: Pick<DreameCred, "region" | "country" | "lang">, accessToken?: string | null, jsonBody = false) {
  return {
    "user-agent": APP_UA,
    authorization: OAUTH_BASIC,
    "content-type": jsonBody ? "application/json" : "application/x-www-form-urlencoded",
    "dreame-auth": accessToken ? `bearer ${accessToken}` : "bearer",
    "dreame-meta": APP_META,
    "dreame-rlc": buildRlc(cred.region, cred.lang, cred.country),
    "tenant-id": TENANT
  };
}

export function hostOf(region: string) {
  return REGION_HOSTS[region] || REGION_HOSTS.eu;
}

export function dreameUrl(region: string, path: string) {
  return `https://${hostOf(region)}${path}`;
}

export function randomReqId() {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}

