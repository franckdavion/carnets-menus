import { cors, originOk } from "./cors.ts";
import { importOne } from "./parse.ts";

function json(req: Request, v: unknown, status = 200) {
  return new Response(JSON.stringify(v), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "POST" }, 405);
  const origin = req.headers.get("Origin") || "";
  if (!originOk(origin)) return json(req, { error: "origine refusée" }, 403);
  let body: { urls?: unknown } = {};
  try { body = await req.json(); } catch { return json(req, { error: "json" }, 400); }
  const urls = [...new Set((Array.isArray(body.urls) ? body.urls : []).map((u) => String(u).trim()))]
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 15);
  if (!urls.length) return json(req, { recipes: [], errors: [{ url: "", msg: "Aucun lien" }] }, 400);
  const recipes: unknown[] = [];
  const errors: { url: string; msg: string }[] = [];
  for (const url of urls) {
    try { recipes.push(await importOne(url)); }
    catch (e) { errors.push({ url, msg: String((e as Error).message || e) }); }
  }
  return json(req, { recipes, errors, at: new Date().toISOString() });
});
