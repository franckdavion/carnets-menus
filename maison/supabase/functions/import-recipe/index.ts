// Import de recettes par lien (foyer cloud) — même logique que robot.mjs côté serveur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sbUrl = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const UA = "Mozilla/5.0 CarnetDeMenus/1.0";
const ALLOWED = new Set([
  "https://franckdavion.github.io",
  "https://carnets-menus.vercel.app",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
  "http://127.0.0.1:8766",
  "http://localhost:8766"
]);

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allow = ALLOWED.has(origin) ? origin : "https://carnets-menus.vercel.app";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const MEAT = /(bœuf|boeuf|veau|agneau|porc|poulet|saumon|thon|crevette|poisson)/i;

function decode(t: string) {
  return String(t || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
function findRecipe(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const x of node) { const r = findRecipe(x); if (r) return r; }
    return null;
  }
  const t = (node as Record<string, unknown>)["@type"];
  if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return node as Record<string, unknown>;
  for (const k of ["@graph", "mainEntity", "itemListElement"]) {
    const r = findRecipe((node as Record<string, unknown>)[k]);
    if (r) return r;
  }
  return null;
}
function isoMinutes(v: string) {
  const m = String(v || "").match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return 0;
  return (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0);
}
function yieldOf(y: unknown) {
  const s = Array.isArray(y) ? y.join(" ") : String(y || "");
  const m = s.match(/\d+/);
  return m ? +m[0] : 4;
}
function parseIng(line: string) {
  const l = line.replace(/^[\s•·\-–—*]+/, "").trim();
  const m = l.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l|c\. à s\.|c\. à c\.|pièce)?\s*(.+)$/i);
  if (m) return { q: +m[1].replace(",", "."), u: m[2] || "pièce", n: m[3].trim(), r: "Épicerie" };
  if (l.length > 2) return { q: 1, u: "pièce", n: l, r: "Épicerie" };
  return null;
}
function catOf(name: string, ings: string[], minutes: number) {
  if (/dessert|gâteau|tarte|mousse/i.test(name)) return "Dessert";
  if (/soupe|velouté|potage/i.test(name)) return "Soupe";
  if (!MEAT.test(ings.join(" ") + " " + name)) return "Végé";
  if (minutes && minutes <= 30) return "Rapide";
  return "Plat";
}
function fromSchema(r: Record<string, unknown>, url: string) {
  const name = decode(String(r.name || ""));
  const ingTexts = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : []).map(x => decode(String(x))).filter(Boolean);
  const minutes = isoMinutes(String(r.totalTime || "")) || isoMinutes(String(r.prepTime || "")) + isoMinutes(String(r.cookTime || ""));
  const img = Array.isArray(r.image) ? r.image[0] : r.image;
  const image = typeof img === "object" && img && (img as { url?: string }).url ? (img as { url: string }).url : typeof img === "string" ? img : "";
  if (!name || !ingTexts.length) return null;
  const ing = ingTexts.map(parseIng).filter(Boolean) as { q: number; u: string; n: string; r: string }[];
  return {
    name, cat: catOf(name, ingTexts, minutes), time: Math.round(minutes || 0), serves: yieldOf(r.recipeYield),
    ing, steps: String((Array.isArray(r.recipeInstructions) ? r.recipeInstructions.map(x => typeof x === "string" ? x : (x as { text?: string }).text || "").join("\n") : r.recipeInstructions) || ""),
    source: url, image
  };
}
async function importOne(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" }, redirect: "follow" });
  if (!r.ok) throw new Error("Page " + r.status);
  const html = await r.text();
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1].trim());
      const rec = findRecipe(j);
      if (rec) {
        const out = fromSchema(rec, url);
        if (out) return out;
      }
    } catch { /* next block */ }
  }
  throw new Error("Recette non reconnue sur cette page");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "POST only" }, 405);
  const user = await userFrom(req);
  if (!user) return json(req, { error: "Connexion requise" }, 401);
  let body: { urls?: string[] };
  try { body = await req.json(); } catch { return json(req, { error: "JSON invalide" }, 400); }
  const urls = (body.urls || []).filter(u => /^https?:\/\//i.test(u)).slice(0, 15);
  if (!urls.length) return json(req, { error: "Aucun lien" }, 400);
  const recipes: unknown[] = [], errors: { url: string; msg: string }[] = [];
  for (const url of urls) {
    try { recipes.push(await importOne(url)); }
    catch (e) { errors.push({ url, msg: e instanceof Error ? e.message : "Erreur" }); }
  }
  return json(req, { recipes, errors });
});