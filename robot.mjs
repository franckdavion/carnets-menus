// Robot du Carnet de menus : lit les recettes dont on lui donne le lien et tient l'agenda Google à jour.
// Exécuté par GitHub Actions dans le dépôt des données. Aucune dépendance.
const RAYONS=["Fruits & légumes","Boucherie & poisson","Crémerie","Épicerie","Boulangerie","Surgelés","Divers"];
const UNITS=["g","kg","ml","cl","l","pièce","c. à s.","c. à c.","botte","tranche","boîte","sachet","pincée"];
const CATS=["Plat","Végé","Rapide","Soupe","Dessert"];
const GUESS=[[/(?:^|[^a-zà-ÿœ])(?:poulet|bœuf|boeuf|porc|veau|agneau|lardon|jambon|saumon|thon|cabillaud|poisson|crevette|saucisse|steak|dinde|canard)/i,"Boucherie & poisson"],
 [/(?:^|[^a-zà-ÿœ])(?:lait|crème|creme|beurre|fromage|gruyère|gruyere|emmental|parmesan|mozza|cheddar|yaourt|œuf|oeuf|pâte brisée|pâte feuilletée|feta|chèvre)/i,"Crémerie"],
 [/(?:^|[^a-zà-ÿœ])(?:pain|baguette|brioche|tortilla)/i,"Boulangerie"],[/(?:^|[^a-zà-ÿœ])(?:surgel|glace|petits pois surg)/i,"Surgelés"],
 [/(?:^|[^a-zà-ÿœ])(?:oignon|ail|tomate|carotte|courgette|poivron|pomme|salade|citron|champignon|épinard|epinard|brocoli|potiron|courge|avocat|poireau|herbe|persil|ciboulette|basilic|banane|fruit|légume|legume|aubergine|patate|navet|chou|potimarron|butternut|citrouille|endive|fenouil|radis|betterave|échalote|gingembre|haricots verts|petits pois frais|concombre|melon|fraise|framboise|orange|clémentine|mangue|kiwi|raisin|coriandre|menthe|thym|romarin|laurier|cébette|ciboule)/i,"Fruits & légumes"]];
const norm=s=>String(s||"").trim().toLowerCase();
/* ---------- paste a recipe (text from Live Text, a site, a message) ---------- */
const NB="(?![a-zà-ÿ])";
const UNIT_RE=[
  [new RegExp("^(?:kg|kilos?|kilogrammes?)\\.?"+NB,"i"),"kg"],
  [new RegExp("^(?:g|gr|grs|grammes?)\\.?"+NB,"i"),"g"],
  [new RegExp("^(?:ml|millilitres?)\\.?"+NB,"i"),"ml"],
  [new RegExp("^(?:cl|centilitres?)\\.?"+NB,"i"),"cl"],
  [new RegExp("^(?:dl|d(?:é|e)cilitres?)\\.?"+NB,"i"),"dl"],
  [new RegExp("^(?:l|litres?)\\.?"+NB,"i"),"l"],
  [new RegExp("^(?:cuill?(?:è|e)res?|cuill?\\.?|c\\.?)\\s*(?:à|a)[\\s.]*(?:soupe|s)\\.?"+NB,"i"),"c. à s."],
  [new RegExp("^(?:càs|cas|cs|tbsp)"+NB,"i"),"c. à s."],
  [new RegExp("^(?:cuill?(?:è|e)res?|cuill?\\.?|c\\.?)\\s*(?:à|a)[\\s.]*(?:caf(?:é|e)|c)\\.?"+NB,"i"),"c. à c."],
  [new RegExp("^(?:càc|cac|cc|tsp)"+NB,"i"),"c. à c."],
  [new RegExp("^pinc(?:é|e)es?"+NB,"i"),"pincée"],
  [new RegExp("^bottes?"+NB,"i"),"botte"],
  [new RegExp("^tranches?"+NB,"i"),"tranche"],
  [new RegExp("^bo(?:î|i)tes?"+NB,"i"),"boîte"],
  [new RegExp("^sachets?"+NB,"i"),"sachet"],
];
const FRAC={"½":".5","¼":".25","¾":".75","⅓":".33","⅔":".67","⅛":".125"};
const H_ING=/^(ingr(?:é|e)dients?|il vous faut|pour la (?:pâte|sauce|garniture|farce|p(?:â|a)te)|liste des ingr)/i;
const H_STEP=/^(?:la )?(?:pr(?:é|e)paration|(?:é|e)tapes?|instructions?|m(?:é|e)thode|d(?:é|e)roul(?:é|e)|recette|r(?:é|e)alisation|progression)\s*:?\s*$/i;
const TIME=/^(?:temps(?:\s+de)?|pr(?:é|e)paration|cuisson|repos|total|dur(?:é|e)e)[^\d]{0,25}(\d+)\s*(min|mn|h|heures?)\b\.?\s*(\d+)?/i;
const META=/(temps|pr(?:é|e)paration|cuisson|repos|difficult|co(?:û|u)t|budget|portions?|personnes?|parts?|calories|kcal)/i;
function pnum(s){
  s=String(s).replace(/[½¼¾⅓⅔⅛]/g,m=>FRAC[m]).replace(",",".").trim();
  let m;
  if((m=s.match(/^(\d+)\s+(\d+)\/(\d+)$/)))return +m[1]+ +m[2]/ +m[3];
  if((m=s.match(/^(\d+)\/(\d+)$/)))return +m[1]/ +m[2];
  if((m=s.match(/^(\d*)\.?(\d+)$/))&&!/^\d+$/.test(s)&&s.startsWith("."))return parseFloat("0"+s);
  if((m=s.match(/^(\d+)\.(\d+)$/)))return parseFloat(s);
  if((m=s.match(/^(\d+)(\.\d+)?$/)))return parseFloat(s);
  return NaN;
}
const QTY="(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?\\s*[½¼¾⅓⅔⅛]?|[½¼¾⅓⅔⅛])";
const WORDNUM={"un":1,"une":1,"deux":2,"trois":3,"quatre":4,"cinq":5,"six":6,"sept":7,"huit":8,"dix":10,"douze":12,"demi":0.5,"une demi":0.5};
function cleanName(n){
  return n.replace(/^\s*(de\s+|d['’]\s*|des\s+|du\s+)/i,"").replace(/\s+/g," ").replace(/[.;,:]+$/,"").trim();
}
function unitAndName(rest){
  rest=rest.trim();
  for(const[re,u]of UNIT_RE){const m=rest.match(re);if(m)return{u,n:cleanName(rest.slice(m[0].length))};}
  return{u:"pièce",n:cleanName(rest)};
}
function parseIng(line){
  let l=line.replace(/^[\s•·\-–—*▪◦○●✓☐]+/,"").replace(/\s+/g," ").trim();
  if(!l)return null;
  let m, q=0, u="pièce", n=l;
  if((m=l.match(new RegExp("^"+QTY+"\\s*(.*)$")))){
    q=pnum(m[1].replace(/\s+(?=[½¼¾⅓⅔⅛])/,"")); ({u,n}=unitAndName(m[2]));
    if(isNaN(q))q=0;
  }else if((m=l.match(/^(une demi|un|une|deux|trois|quatre|cinq|six|sept|huit|dix|douze|demi)\s+(.*)$/i))){
    q=WORDNUM[m[1].toLowerCase()]; ({u,n}=unitAndName(m[2]));
  }else if((m=l.match(new RegExp("^(.+?)\\s*[:\\-–—]\\s*"+QTY+"\\s*(.*)$")))){
    q=pnum(m[2]); const r=unitAndName(m[3]||""); u=r.u; n=cleanName(m[1]);
    if(r.n)n+=" "+r.n;
  }else if((m=l.match(new RegExp("^(.+?)\\s*\\(\\s*"+QTY+"\\s*([^)]*)\\)\\s*$")))){
    q=pnum(m[2]); const r=unitAndName(m[3]||""); u=r.u; n=cleanName(m[1]);
  }
  if(u==="dl"){q=q*10;u="cl";}
  n=n.replace(/\s*\((?:facultatif|optionnel)\)/i,"").trim();
  if(!n)return null;
  if(n.length>1&&n.slice(1)!==n.slice(1).toUpperCase())n=n.charAt(0).toLowerCase()+n.slice(1);
  return{q:Math.round(q*100)/100,u,n,r:guessRayon(n)};
}
function guessRayon(n){const g=GUESS.find(([re])=>re.test(n));return g?g[1]:"Épicerie";}
function looksLikeIng(l){
  const s=l.replace(/^[\s•·\-–—*▪◦○●✓☐]+/,"").trim();
  if(!s||s.length>90)return false;
  if(/^(\d+)\s*[.)]\s+\S/.test(s)&&s.length>40)return false;            // "1. Préchauffez le four…"
  if(new RegExp("^"+QTY).test(s))return true;
  if(/^(une demi|un|une|deux|trois|quatre|cinq|six|huit|dix|douze)\s+\S/i.test(s)&&s.split(" ").length<=7)return true;
  if(/^[^.!?]{2,40}\s*[:\-–]\s*\d/.test(s))return true;
  if(/\(\s*\d/.test(s)&&s.length<50)return true;
  if(/^(sel|poivre|sel et poivre|huile|beurre|persil|ciboulette|thym|laurier|muscade)\b/i.test(s)&&s.length<40)return true;
  return false;
}
function stepText(l){return l.replace(/^[\s•·\-–—*]+/,"").replace(/^(?:(?:é|e)tape\s*)?\d+\s*[.):\-–]?\s*/i,"").trim();}
function parseRecipeText(text){
  const raw=String(text||"").replace(/\r/g,"").split("\n").map(s=>s.replace(/\s+/g," ").trim()).filter(Boolean);
  const out={name:"",serves:0,time:0,ing:[],steps:[]};
  let mode="", minutes=0;
  for(const line of raw){
    const sv=line.match(/(?:pour|recette pour)\s*(\d+)\s*(?:personnes?|pers\.?|parts?|portions?|couverts?)|(\d+)\s*(?:personnes?|pers\.|parts|portions|couverts)\b/i);
    if(sv&&!out.serves&&line.length<60){out.serves=+(sv[1]||sv[2]);if(!H_ING.test(line))continue;}
    const tm=line.length<60&&line.match(TIME);
    if(tm){
      if(/^total|temps total/i.test(line)){minutes=-1e6;} // a total wins over the parts
      const v=/^h/i.test(tm[2])?(+tm[1])*60+(tm[3]?+tm[3]:0):+tm[1];
      if(/total/i.test(line))minutes=v+1e7; else if(minutes<1e6)minutes+=v;
      continue;
    }
    if(H_ING.test(line)&&line.length<50){mode="ing";const rest=line.replace(H_ING,"").replace(/^[\s:]+/,"");
      const sv2=rest.match(/(\d+)/); if(sv2&&!out.serves&&/pers|part|portion/i.test(rest))out.serves=+sv2[1];
      continue;}
    if(H_STEP.test(line)&&line.length<40){mode="step";continue;}
    if(!out.name&&!mode&&line.length<80&&!looksLikeIng(line)){out.name=line.replace(/[.:]+$/,"");continue;}
    if(mode==="ing"||(!mode||mode==="")&&looksLikeIng(line)){
      if(mode!=="ing"&&!looksLikeIng(line)){mode="step";}
      else if(mode==="ing"&&line.length>90){mode="step";}
      else{const p=parseIng(line);if(p)out.ing.push(p);continue;}
    }
    if(mode==="step"||line.length>=40||out.ing.length){mode="step";const t=stepText(line);
      if(t){ // glue lines broken in the middle of a sentence (Live Text wraps them)
        const prev=out.steps[out.steps.length-1];
        if(prev&&!/[.!?:]$/.test(prev)&&/^[a-zàâçéèêëîïôûù]/.test(t)&&!/^\d/.test(line))out.steps[out.steps.length-1]=prev+" "+t;
        else out.steps.push(t);}
    }
  }
  out.time=minutes>=1e7?minutes-1e7:Math.max(0,minutes);
  if(out.name&&out.name===out.name.toUpperCase())out.name=out.name.charAt(0)+out.name.slice(1).toLowerCase();
  if(!out.serves)out.serves=0;
  return out;
}


/* ---------- robot: reads requests in inbox/, writes answers in results/ ---------- */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 CarnetDeMenus/1.0";
const MEAT = /(b(?:œ|oe)uf|veau|agneau|porc|lardon|jambon|saucisse|chorizo|bacon|poulet|dinde|canard|volaille|saumon|cabillaud|thon|crevette|poisson|colin|merlu|truite|sardine|maquereau|moule|steak)/i;

async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "fr-FR,fr;q=0.9" }, redirect: "follow" });
  if (!r.ok) throw new Error("La page a répondu " + r.status);
  return await r.text();
}

/* respect the site's robots.txt for the page we are asked to read */
const robotsCache = new Map();
async function allowed(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    let rules = [];
    try {
      const txt = await (await fetch(u.origin + "/robots.txt", { headers: { "User-Agent": UA } })).text();
      let applies = false;
      for (const raw of txt.split(/\r?\n/)) {
        const line = raw.replace(/#.*/, "").trim();
        const m = line.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);
        if (!m) continue;
        const k = m[1].toLowerCase(), v = m[2].trim();
        if (k === "user-agent") applies = v === "*";
        else if (applies && v) rules.push([k, v]);
      }
    } catch { rules = []; }
    robotsCache.set(u.origin, rules);
  }
  const p = u.pathname + u.search;
  let best = null;
  for (const [k, v] of robotsCache.get(u.origin)) {
    const re = new RegExp("^" + v.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (re.test(p) && (!best || v.length > best[1].length)) best = [k, v];
  }
  return !best || best[0] === "allow";
}

/* ---- schema.org Recipe (JSON-LD), used by Marmiton, 750g and most recipe sites ---- */
function findRecipe(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) { for (const x of node) { const r = findRecipe(x); if (r) return r; } return null; }
  const t = node["@type"];
  if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return node;
  for (const k of ["@graph", "mainEntity", "itemListElement"]) { const r = findRecipe(node[k]); if (r) return r; }
  return null;
}
function isoMinutes(v) {
  const m = String(v || "").match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return 0;
  return (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0);
}
const ENT = { eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", agrave: "à", acirc: "â", ccedil: "ç", ocirc: "ô", ouml: "ö", ucirc: "û", ugrave: "ù", uuml: "ü",
  icirc: "î", iuml: "ï", oelig: "œ", OElig: "Œ", Eacute: "É", Egrave: "È", Agrave: "À", Ccedil: "Ç", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", deg: "°", hellip: "…", ndash: "–", mdash: "—", frac12: "½", frac14: "¼", frac34: "¾" };
function decode(t) {
  return String(t || "").replace(/&([a-zA-Z]+\d*);/g, (m, n) => ENT[n] ?? (n === "amp" || n === "nbsp" || n === "quot" || n === "lt" || n === "gt" || n === "apos" ? m : m))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();
}
function stepsFrom(ins) {
  const out = [];
  const walk = x => {
    if (!x) return;
    if (typeof x === "string") { decode(x).split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/).forEach(s => s && out.push(s)); return; }
    if (Array.isArray(x)) return x.forEach(walk);
    if (x.itemListElement) return walk(x.itemListElement);
    if (x.text || x.name) out.push(decode(x.text || x.name));
  };
  walk(ins);
  return out.filter(Boolean).map(s => s.replace(/^(?:(?:é|e)tape\s*)?\d+\s*[.):\-–]?\s*/i, ""));
}
function yieldOf(y) {
  const s = Array.isArray(y) ? y.join(" ") : String(y || "");
  const m = s.match(/\d+/);
  return m ? +m[0] : 4;
}
function catOf(name, ings, minutes, cat) {
  const c = (Array.isArray(cat) ? cat.join(" ") : String(cat || "")).toLowerCase(), n = name.toLowerCase();
  if (/dessert|g(?:â|a)teau|tarte (?:aux|au) (?:pommes|poires|fraises|chocolat|citron)|cr(?:ê|e)pe|cookie|mousse au|clafoutis|crumble/.test(c + " " + n)) return "Dessert";
  if (/soupe|velout(?:é|e)|potage|bouillon|gaspacho/.test(c + " " + n)) return "Soupe";
  if (!MEAT.test(ings.join(" ") + " " + n)) return "Végé";
  if (minutes && minutes <= 30) return "Rapide";
  return "Plat";
}
function fromSchema(r, url) {
  const name = decode(r.name);
  const ingTexts = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : Array.isArray(r.ingredients) ? r.ingredients : []).map(decode).filter(Boolean);
  const minutes = isoMinutes(r.totalTime) || (isoMinutes(r.prepTime) + isoMinutes(r.cookTime));
  const img = Array.isArray(r.image) ? r.image[0] : r.image;
  return finish({ name, serves: yieldOf(r.recipeYield), time: minutes, ingTexts, steps: stepsFrom(r.recipeInstructions), cat: r.recipeCategory, image: typeof img === "object" && img ? img.url : img, url });
}

/* ---- fallback: page data of sites built with Next.js (Jow and others) ---- */
function fromNextData(html, url) {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let data; try { data = JSON.parse(m[1]); } catch { return null; }
  let found = null;
  const seen = new Set();
  const walk = o => {
    if (found || !o || typeof o !== "object" || seen.has(o)) return;
    seen.add(o);
    if (!Array.isArray(o) && (o.title || o.name) && Array.isArray(o.ingredients) && o.ingredients.length && (o.directions || o.steps || o.instructions)) { found = o; return; }
    for (const v of Object.values(o)) walk(v);
  };
  walk(data);
  if (!found) return null;
  const unitName = u => !u ? "" : typeof u === "string" ? u : (u.abbreviation || u.abbr || u.name || u.label || "");
  const ingTexts = found.ingredients.map(i => {
    if (typeof i === "string") return decode(i);
    const name = i.name || i.label || (i.ingredient && (i.ingredient.name || i.ingredient.label)) || "";
    const q = i.quantity ?? i.qty ?? i.amount ?? i.quantityPerCover ?? "";
    return decode([q, unitName(i.unit), name].filter(x => x !== "" && x != null).join(" "));
  }).filter(Boolean);
  const steps = stepsFrom((found.directions || found.steps || found.instructions || []).map(s => typeof s === "string" ? s : (s.label || s.text || s.description || s.name || "")));
  const serves = +(found.coversCount || found.covers || found.servings || found.yield || 0) || 4;
  const minutes = (+found.preparationTime || 0) + (+found.cookingTime || 0) + (+found.restingTime || 0) || +found.totalTime || 0;
  return finish({ name: decode(found.title || found.name), serves, time: minutes, ingTexts, steps, cat: "", image: found.imageUrl || found.image, url });
}

function finish(x) {
  if (!x.name || !x.ingTexts.length) return null;
  const ing = x.ingTexts.map(parseIng).filter(Boolean);
  return {
    name: x.name, cat: catOf(x.name, x.ingTexts, x.time, x.cat), time: Math.round(x.time || 0), serves: x.serves || 4,
    ing, steps: x.steps.join("\n"), source: x.url, image: typeof x.image === "string" ? x.image : "",
  };
}

async function importOne(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error("Adresse invalide");
  if (!(await allowed(url))) throw new Error("Ce site n'autorise pas la lecture automatique de cette page");
  const html = await get(url);
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  for (const b of blocks) {
    let j; try { j = JSON.parse(b.trim()); } catch { continue; }
    const r = findRecipe(j);
    if (r) { const rec = fromSchema(r, url); if (rec) return rec; }
  }
  const nd = fromNextData(html, url);
  if (nd) return nd;
  throw new Error("Recette non reconnue sur cette page. Utilisez « Coller une recette ».");
}


/* ---------- Google Agenda: keep the "Repas" calendar equal to agenda.json ---------- */
const G_TOKEN = process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const G_API = process.env.GOOGLE_API_BASE || "https://www.googleapis.com/calendar/v3";
async function googleToken(keyJson) {
  let sa; try { sa = JSON.parse(keyJson); } catch { throw new Error("La clé Google (secret GOOGLE_CLE) n'est pas un fichier JSON complet"); }
  const now = Math.floor(Date.now() / 1000), b64u = o => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = b64u({ alg: "RS256", typ: "JWT" }) + "." + b64u({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/calendar.events", aud: G_TOKEN, iat: now, exp: now + 3600 });
  const sig = crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key).toString("base64url");
  const r = await fetch(G_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned + "." + sig }) });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error("Google a refusé la clé du compte robot (" + (j.error_description || j.error || r.status) + ")");
  return j.access_token;
}
async function syncGoogle(agenda) {
  const token = await googleToken(process.env.GOOGLE_CLE);
  const cal = String(process.env.GOOGLE_AGENDA || "").trim();
  const base = `${G_API}/calendars/${encodeURIComponent(cal)}/events`;
  const H = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
  const call = async (method, url, body) => {
    const r = await fetch(url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 404 && method === "GET") return null;
    if (!r.ok && !(method === "DELETE" && (r.status === 404 || r.status === 410))) {
      const t = await r.text();
      if (r.status === 403 || r.status === 404) throw new Error("Le compte robot n'a pas accès à l'agenda : partagez-le avec lui (droit « Modifier les événements ») et vérifiez l'ID de l'agenda");
      throw new Error("Google Agenda a répondu " + r.status + " : " + t.slice(0, 200));
    }
    return r.status === 204 ? {} : r.json().catch(() => ({}));
  };
  const times = agenda.times || { midi: ["12:00", "13:30"], soir: ["19:30", "21:00"] };
  const desired = {};
  for (const [k, name] of Object.entries(agenda.calendar || {})) {
    const [date, meal] = k.split("|"); const t = times[meal] || times.soir;
    desired["carnet" + date.replace(/-/g, "") + meal] = {
      summary: (meal === "midi" ? "Midi : " : "Soir : ") + name,
      start: { dateTime: `${date}T${t[0]}:00`, timeZone: "Europe/Paris" },
      end: { dateTime: `${date}T${t[1]}:00`, timeZone: "Europe/Paris" },
      transparency: "transparent", description: "Ajouté par le Carnet de menus", status: "confirmed",
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 70 * 864e5).toISOString(), to = new Date(Date.now() + 120 * 864e5).toISOString();
  const existing = {};
  let page = "";
  do {
    const j = await call("GET", `${base}?showDeleted=true&singleEvents=true&maxResults=2500&timeMin=${encodeURIComponent(from)}&timeMax=${encodeURIComponent(to)}${page ? "&pageToken=" + page : ""}`);
    for (const e of (j && j.items) || []) if (String(e.id).startsWith("carnet")) existing[e.id] = e;
    page = j && j.nextPageToken || "";
  } while (page);
  let added = 0, changed = 0, removed = 0;
  for (const [id, ev] of Object.entries(desired)) {
    const ex = existing[id];
    const same = ex && ex.status !== "cancelled" && ex.summary === ev.summary &&
      String(ex.start && ex.start.dateTime || "").slice(11, 16) === ev.start.dateTime.slice(11, 16) &&
      String(ex.start && ex.start.dateTime || "").slice(0, 10) === ev.start.dateTime.slice(0, 10);
    if (same) continue;
    if (!ex) {
      const r = await fetch(base, { method: "POST", headers: H, body: JSON.stringify({ id, ...ev }) });
      if (r.status === 409) { await call("PUT", `${base}/${id}`, ev); changed++; }   // a deleted event with this id still exists
      else if (!r.ok) { if (r.status === 403 || r.status === 404) throw new Error("Le compte robot n'a pas accès à l'agenda : partagez-le avec lui (droit « Modifier les événements ») et vérifiez l'ID de l'agenda"); throw new Error("Google Agenda a répondu " + r.status); }
      else added++;
    } else { await call("PUT", `${base}/${id}`, ev); changed++; }
  }
  for (const [id, ex] of Object.entries(existing)) {
    if (desired[id] || ex.status === "cancelled") continue;
    const day = String(ex.start && (ex.start.dateTime || ex.start.date) || "").slice(0, 10);
    if (day && day < today) continue;   // past meals stay as history
    await call("DELETE", `${base}/${id}`); removed++;
  }
  return { added, changed, removed, total: Object.keys(desired).length };
}

async function main() {
  fs.mkdirSync("results", { recursive: true });
  const inbox = fs.existsSync("inbox") ? fs.readdirSync("inbox").filter(f => f.endsWith(".json")) : [];
  for (const f of inbox) {
    const file = path.join("inbox", f);
    let req; try { req = JSON.parse(fs.readFileSync(file, "utf8")); } catch { fs.rmSync(file); continue; }
    const out = { id: req.id || f.replace(/\.json$/, ""), type: req.type, at: new Date().toISOString(), recipes: [], errors: [] };
    if (req.type === "import") {
      for (const url of (req.urls || []).slice(0, 15)) {
        try { out.recipes.push(await importOne(url)); console.log("OK", url); }
        catch (e) { out.errors.push({ url, msg: String(e.message || e) }); console.log("ERREUR", url, e.message); }
      }
    }
    fs.writeFileSync(path.join("results", out.id + ".json"), JSON.stringify(out, null, 1));
    fs.rmSync(file);
  }
  if (fs.existsSync("agenda.json") && !(process.env.GOOGLE_CLE && process.env.GOOGLE_AGENDA)) {
    console.log("Agenda Google : secrets GOOGLE_CLE / GOOGLE_AGENDA absents, agenda non mis à jour");
    fs.writeFileSync("agenda-status.json", JSON.stringify({ ok: false, at: new Date().toISOString(), msg: "les secrets GOOGLE_CLE et GOOGLE_AGENDA ne sont pas enregistrés dans le dépôt" }, null, 1));
  }
  if (fs.existsSync("agenda.json") && process.env.GOOGLE_CLE && process.env.GOOGLE_AGENDA) {
    let st;
    try {
      const r = await syncGoogle(JSON.parse(fs.readFileSync("agenda.json", "utf8")));
      st = { ok: true, at: new Date().toISOString(), msg: `${r.total} repas dans l'agenda (${r.added} ajoutés, ${r.changed} modifiés, ${r.removed} retirés)` };
    } catch (e) { st = { ok: false, at: new Date().toISOString(), msg: String(e.message || e) }; }
    console.log("Agenda Google :", st.msg);
    fs.writeFileSync("agenda-status.json", JSON.stringify(st, null, 1));
  }
  // keep the folder tidy: answers older than 3 days are removed
  for (const f of fs.readdirSync("results")) {
    const p = path.join("results", f);
    if (Date.now() - fs.statSync(p).mtimeMs > 3 * 864e5) fs.rmSync(p);
    else { try { const at = Date.parse(JSON.parse(fs.readFileSync(p, "utf8")).at); if (Date.now() - at > 3 * 864e5) fs.rmSync(p); } catch {} }
  }
}
await main();
