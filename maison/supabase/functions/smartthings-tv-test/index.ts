// Maisonnée TEST — lecture seule de l'état Samsung TV.
// Fonction isolée : ne modifie pas le serveur smartthings de production.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sbUrl = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(sbUrl, service, { auth: { persistSession: false } });
const ALLOWED = new Set([
  "https://franckdavion.github.io",
  "http://localhost:8765", "http://127.0.0.1:8765",
  "http://localhost:8766", "http://127.0.0.1:8766",
  "http://localhost:8000", "http://127.0.0.1:8000",
  "http://192.168.0.146:8765", "http://192.168.0.146:8000"
]);
function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "https://franckdavion.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}
function reply(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8" }
  });
}
type ProviderRead = { ok: boolean; status: number; body: Record<string, any> | null };
async function smartThingsRead(pat: string, path: string): Promise<ProviderRead> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch("https://api.smartthings.com/v1/" + path, {
      headers: { Authorization: "Bearer " + pat, Accept: "application/json" },
      signal: ctrl.signal
    });
    const raw = await res.text();
    let parsed: Record<string, any> | null = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (_) { /* no response body */ }
    return { ok: res.ok, status: res.status, body: parsed };
  } catch (_) {
    return { ok: false, status: 0, body: null };
  } finally { clearTimeout(timer); }
}
function cap(root: Record<string, any> | null, name: string, attribute: string): unknown {
  return root?.components?.main?.[name]?.[attribute]?.value ?? null;
}
function cleanString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "GET") return reply(req, { error: "Méthode non autorisée" }, 405);
  try {
    // Double contrôle : JWT valide ET membre du foyer avant toute lecture du PAT stocké.
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return reply(req, { error: "Authentification requise" }, 401);
    const scoped = createClient(sbUrl, anon, { auth: { persistSession: false } });
    const { data, error: authError } = await scoped.auth.getUser(jwt);
    if (authError || !data.user) return reply(req, { error: "Session invalide" }, 401);
    const { data: membership, error: membershipError } = await admin
      .from("household_members").select("household_id")
      .eq("user_id", data.user.id).limit(1);
    if (membershipError || !membership?.[0]) return reply(req, { error: "Accès au foyer refusé" }, 403);
    const { data: cred, error: credError } = await admin
      .from("household_smartthings").select("pat, access_token, refresh_token, token_expires_at, device_id, device_name")
      .eq("household_id", membership[0].household_id).maybeSingle();
    if (credError) return reply(req, { error: "Lecture SmartThings impossible" }, 500);
    if (!cred) return reply(req, { connected: false, label: "SmartThings non relié", power: null });
    const id = cred.device_id;
    if (!id) return reply(req, { connected: true, label: "Choisissez un téléviseur", power: null });
    const encoded = encodeURIComponent(String(id));
    let token = cred.access_token || cred.pat;
    const exp = cred.token_expires_at ? Date.parse(cred.token_expires_at) : 0;
    const stClientId = Deno.env.get("SMARTTHINGS_CLIENT_ID") || "";
    const stClientSecret = Deno.env.get("SMARTTHINGS_CLIENT_SECRET") || "";
    if (cred.refresh_token && stClientId && stClientSecret && (!cred.access_token || exp < Date.now() + 120000)) {
      const basic = btoa(stClientId + ":" + stClientSecret);
      const tokRes = await fetch("https://api.smartthings.com/v1/oauth/token", {
        method: "POST",
        headers: { Authorization: "Basic " + basic, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: cred.refresh_token, client_id: stClientId })
      });
      const tok = await tokRes.json().catch(() => ({}));
      if (tokRes.ok && tok.access_token) {
        token = tok.access_token;
        await admin.from("household_smartthings").update({
          access_token: tok.access_token,
          refresh_token: tok.refresh_token || cred.refresh_token,
          token_expires_at: new Date(Date.now() + (tok.expires_in || 86000) * 1000).toISOString()
        }).eq("household_id", membership[0].household_id);
      }
    }
    if (!token) return reply(req, { connected: true, label: "Compte SmartThings à reconnecter", power: null, access_issue: "token" });

    // Sources indépendantes : capteurs de la TV et état de connexion SmartThings.
    const [status, health] = await Promise.all([
      smartThingsRead(token, "devices/" + encoded + "/status"),
      smartThingsRead(token, "devices/" + encoded + "/health")
    ]);
    // L'état détaillé d'un téléviseur éteint peut échouer : essayer la fiche d'appareil.
    const detail = status.ok ? null : await smartThingsRead(token, "devices/" + encoded + "?includeStatus=true&includeHealth=true");
    const raw = status.ok ? status.body : detail?.body?.status || null;
    const healthValue = cleanString(health.ok ? health.body?.state : detail?.body?.healthState?.state)?.toUpperCase() || null;
    const sw = cap(raw, "switch", "switch");
    const reportedPower = sw === "on" ? true : sw === "off" ? false : null;

    // OFFLINE décrit la connexion, non la preuve que l'écran est éteint.
    // Un switch "on" mémorisé ne doit pas devenir un "allumé" courant si le périphérique est hors ligne.
    const power = healthValue === "OFFLINE" || healthValue === "UNHEALTHY" ? null : reportedPower;
    const volumeRaw = cap(raw, "audioVolume", "volume");
    const volume = typeof volumeRaw === "number" && Number.isFinite(volumeRaw) ? volumeRaw : null;
    const muteRaw = cap(raw, "audioMute", "mute");
    const mute = muteRaw === "muted" ? true : muteRaw === "unmuted" ? false : null;
    const input = cleanString(cap(raw, "mediaInputSource", "inputSource"));
    const channel = cleanString(cap(raw, "tvChannel", "tvChannel"));
    const channelName = cleanString(cap(raw, "tvChannel", "tvChannelName"));
    // Ne pas confondre un refus de /health avec un refus total d'accès au téléviseur.
    const readDenied = !status.ok && !detail?.ok &&
      [status.status, detail?.status].some(code => code === 401 || code === 403);
    const expired = readDenied && [status.status, detail?.status].some(code => code === 401);
    const healthDenied = !health.ok && (health.status === 401 || health.status === 403);
    const accessIssue = readDenied ? (expired ? "token" : "permissions") : healthDenied ? "health" : null;
    const label =
      accessIssue === "token" ? "Jeton SmartThings expiré ou invalide" :
      accessIssue === "permissions" ? "Autorisations SmartThings insuffisantes" :
      healthValue === "OFFLINE" ? "Hors ligne · TV probablement éteinte" :
      healthValue === "UNHEALTHY" ? "Connexion instable · état incertain" :
      power === false ? "Éteinte" :
      power === true ? "Allumée" :
      accessIssue === "health" ? "Lecture de disponibilité refusée" :
      healthValue === "ONLINE" ? "Connectée · état inconnu" :
      "État SmartThings indisponible";
    return reply(req, {
      connected: true, device_name: cred.device_name || "Samsung TV",
      power, volume, mute, input, channel, channelName, label,
      health: healthValue, access_issue: accessIssue, source: "smartthings-tv-test",
      // Codes HTTP uniquement, jamais de PAT ni de réponse brute du fournisseur.
      diagnostic: {
        status_http: status.status,
        health_http: health.status,
        detail_http: detail?.status ?? null,
        reported_power: reportedPower
      }
    });
  } catch (_) {
    return reply(req, { error: "Diagnostic de la TV impossible" }, 500);
  }
});
