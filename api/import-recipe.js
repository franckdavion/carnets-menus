const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 CarnetDeMenus/1.0";

function cors(req) {
  const origin = req.headers.origin || "";
  const ok = !origin || /github\.io$/.test(new URL(origin).hostname) || /vercel\.app$/.test(new URL(origin).hostname) || origin.includes("localhost");
  return {
    "Access-Control-Allow-Origin": ok ? (origin || "*") : "https://franckdavion.github.io",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

function findRecipe(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const x of node) {
      const r = findRecipe(x);
      if (r) return r;
    }
    return null;
  }
  const t = node["@type"];
  if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return node;
  for (const k of ["@graph", "mainEntity", "itemListElement"]) {
    const r = findRecipe(node[k]);
    if (r) return r;
  }
  return null;
}

function decode(t) {
  return String(t || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ")
    .trim();
}

function isoMinutes(v) {
  const m = String(v || "").match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return 0;
  return (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

function yieldOf(y) {
  const s = Array.isArray(y) ? y.join(" ") : String(y || "");
  const m = s.match(/\d+/);
  return m ? +m[0] : 4;
}

function parseIng(line) {
  const l = String(line || "").replace(/^[\s•\-–—*]+/, "").replace(/\s+/g, " ").trim();
  const m = l.match(/^(\d+[\s,./]*\d*)\s*(g|kg|ml|cl|l|c\. à s\.|c\. à c\.|pièce)?\s*(.*)$/i);
  if (m) return { q: parseFloat(m[1].replace(",", ".")) || 0, u: m[2] || "pièce", n: (m[3] || l).trim() || l, r: "Épicerie" };
  return { q: 0, u: "pièce", n: l, r: "Épicerie" };
}

async function importOne(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error("Adresse invalide");
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error("La page a répondu " + res.status);
  const html = await res.text();
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const b of blocks) {
    let j;
    try { j = JSON.parse(b.trim()); } catch { continue; }
    const r = findRecipe(j);
    if (!r || !r.name) continue;
    const ingTexts = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : []).map(decode).filter(Boolean);
    if (!ingTexts.length) continue;
    const minutes = isoMinutes(r.totalTime) || isoMinutes(r.prepTime) + isoMinutes(r.cookTime);
    const img = Array.isArray(r.image) ? r.image[0] : r.image;
    const steps = [];
    const walk = (x) => {
      if (!x) return;
      if (typeof x === "string") { steps.push(decode(x)); return; }
      if (Array.isArray(x)) return x.forEach(walk);
      if (x.itemListElement) return walk(x.itemListElement);
      if (x.text || x.name) steps.push(decode(x.text || x.name));
    };
    walk(r.recipeInstructions);
    return {
      name: decode(r.name),
      cat: "Plat",
      time: Math.round(minutes || 0),
      serves: yieldOf(r.recipeYield),
      ing: ingTexts.map(parseIng),
      steps: steps.join("\n"),
      source: url,
      image: typeof img === "object" && img ? img.url : typeof img === "string" ? img : "",
    };
  }
  throw new Error("Recette non reconnue sur cette page. Utilisez « Coller une recette ».");
}

export default async function handler(req, res) {
  const headers = cors(req);
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    return res.end();
  }
  if (req.method !== "POST") {
    res.writeHead(405, { ...headers, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "POST" }));
  }
  const urls = [...new Set((Array.isArray(req.body?.urls) ? req.body.urls : []).map((u) => String(u).trim()))]
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 15);
  if (!urls.length) {
    res.writeHead(400, { ...headers, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ recipes: [], errors: [{ url: "", msg: "Aucun lien" }] }));
  }
  const recipes = [];
  const errors = [];
  for (const url of urls) {
    try { recipes.push(await importOne(url)); }
    catch (e) { errors.push({ url, msg: String(e.message || e) }); }
  }
  res.writeHead(200, { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify({ recipes, errors, at: new Date().toISOString() }));
}
