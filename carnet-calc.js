/* Calculs partagés du Carnet : quantités, fusion des copies, fin de courses, adresses des photos.
   Le navigateur charge ce fichier avant les autres. Les tests Node le chargent aussi. */
(function (root) {
  "use strict";

  const num = n => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  function customIngredientQuantity(qt, slot) {
    const original = String(qt || "");
    const base = Number(slot && slot.ingCustomPeople), target = Number(slot && slot.n);
    if (!(base > 0) || !(target > 0) || base === target) return original;
    const m = original.match(/^(\s*)(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)(\s*.*)$/);
    if (!m) return original;
    let number;
    if (m[2].includes("/")) { const parts = m[2].split("/").map(x => Number(x.trim())); if (parts.length !== 2 || !parts[1]) return original; number = parts[0] / parts[1]; }
    else number = Number(m[2].replace(",", "."));
    if (!Number.isFinite(number)) return original;
    const scaled = Math.round(number * target / base * 100) / 100;
    return m[1] + String(scaled).replace(".", ",") + m[3];
  }

  function toBase(q, u) {
    q = Number(q) || 0;
    if (u === "kg") return [q * 1000, "g"]; if (u === "cl") return [q * 10, "ml"]; if (u === "l") return [q * 1000, "ml"]; return [q, u || ""];
  }
  function fmt(q, u) {
    if (!q) return "";
    if (u === "g") { if (q >= 1000) return num(Math.round(q / 100) / 10) + " kg"; return (q >= 100 ? Math.round(q / 10) * 10 : Math.max(5, Math.round(q / 5) * 5)) + " g"; }
    if (u === "ml") { if (q >= 1000) return num(Math.round(q / 100) / 10) + " l"; if (q >= 50) return Math.round(q / 10) + " cl"; return Math.max(5, Math.round(q / 5) * 5) + " ml"; }
    if (u === "pièce" || u === "") return q < 1 ? num(Math.max(.5, Math.round(q * 2) / 2)) : String(Math.round(q + 0.25));
    if (u === "c. à s." || u === "c. à c.") return num(Math.max(.5, Math.round(q * 2) / 2)) + " " + u;
    const n = Math.max(1, Math.ceil(q - 0.001));
    const pl = { botte: "bottes", tranche: "tranches", boîte: "boîtes", sachet: "sachets", pincée: "pincées" };
    return n + " " + (n > 1 && pl[u] ? pl[u] : u);
  }

  function mealPortionFactor(slot) { const v = Number(slot && slot.portionMultiplier); return Number.isFinite(v) && v >= 0.25 && v <= 4 ? v : 1; }
  function portionFactor() { return 1; }

  const DISH_RE = [[/quiche/i, "quiche", "quiches"], [/tartelette/i, "série de tartelettes", "séries de tartelettes"], [/tarte|tatin/i, "tarte", "tartes"], [/pizza/i, "pizza", "pizzas"], [/cake|banana bread/i, "cake", "cakes"], [/clafoutis|flan|far breton/i, "plat", "plats"], [/tourte|feuillet|pâté en croûte|galette des rois/i, "tourte", "tourtes"], [/g[âa]teau|fondant|brownie|moelleux|cheesecake|charlotte|b[ûu]che|quatre-quarts|savarin|kouign/i, "gâteau", "gâteaux"], [/lasagne|gratin|moussaka|parmentier|hachis/i, "plat", "plats"]];
  const FIXED_RE = /p[âa]te (bris[ée]e|feuillet[ée]e|sabl[ée]e|[àa] pizza)|rouleau de p[âa]te|fond de tarte/i;
  function dishOf(r) { if (!r) return null; const d = DISH_RE.find(([re]) => re.test(r.name || "")); return d ? { one: d[1], many: d[2] } : null; }
  function platsFor(r, p) { const S = r.serves || 4; return p <= Math.ceil(S * 1.5) ? 1 : Math.ceil(p / S); }
  function ingMult(r, i, p) { const S = r.serves || 4; if (!dishOf(r)) return p / S; const k = platsFor(r, p); if (k > 1) return k; return FIXED_RE.test(i.n || "") ? 1 : p / S; }
  function recipeIngredientBase(r, i, people, role) { const [q, u] = toBase(i.q, i.u); return [q * ingMult(r, i, Number(people) * portionFactor(r, role || "main")), u]; }
  function mealIngredientBase(r, i, people, slot) { const [q, u] = toBase(i.q, i.u); return [q * ingMult(r, i, Number(people) * mealPortionFactor(slot)), u]; }
  function mealCustomQuantity(qt, slot) { const text = String(customIngredientQuantity(qt, slot)); const m = text.trim().match(/^([\d.,\/ ]+)\s*(.*)$/); if (!m) return text; const [q, u] = toBase(m[1].trim(), m[2].trim()); return fmt(q * mealPortionFactor(slot), u) || text; }

  function merge3(b, l, r) {
    const J = x => JSON.stringify(x);
    const clone = x => x === undefined ? undefined : JSON.parse(J(x));
    function go(b, l, r) {
      if (J(l) === J(b)) return clone(r);
      if (J(r) === J(b)) return clone(l);
      const obj = x => x && typeof x === "object" && !Array.isArray(x);
      if (obj(l) && obj(r)) {
        const o = {}, bb = obj(b) ? b : {};
        for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) { const v = go(bb[k], l[k], r[k]); if (v !== undefined) o[k] = v; }
        return o;
      }
      return clone(l);
    }
    return go(b, l, r);
  }

  /* Une coche correspond à une quantité achetée. Si la recette grossit ensuite, le surplus redevient à acheter. */
  function settleCheckedGrowth(menu, items, today, until) {
    const checked = Object.assign({}, menu.checked || {});
    const checkedQty = Object.assign({}, menu.checkedQty || {});
    const bought = Object.assign({}, menu.bought || {});
    let changed = false;
    for (const i of items) {
      if (!checked[i.key]) continue;
      const saved = Number(checkedQty[i.key]);
      if (!Number.isFinite(saved) || saved <= 0) { checkedQty[i.key] = i.q; changed = true; continue; }
      if (i.q > saved + 0.0001) {
        const prior = bought[i.key];
        const priorQ = prior && prior.until >= today ? Number(prior.q) || 0 : 0;
        bought[i.key] = { q: priorQ + saved, until: prior && prior.until > until ? prior.until : until };
        delete checked[i.key];
        delete checkedQty[i.key];
        changed = true;
      }
    }
    return { checked, checkedQty, bought, changed };
  }

  /* Fin des courses : ce qui est coché quitte la liste, le reste reste, le trajet est archivé. */
  function applyFinishTrip(menu, items, today, until, rayons) {
    const norm = s => String(s || "").trim().toLowerCase();
    const bought = Object.assign({}, menu.bought);
    const missed = Object.assign({}, menu.missed);
    for (const k in bought) if (bought[k].until < today) delete bought[k];
    const got = [], miss = [];
    for (const i of items) {
      if (menu.checked[i.key]) {
        const b = bought[i.key];
        bought[i.key] = { q: (b && b.until >= today ? b.q : 0) + i.q, until: b && b.until > until ? b.until : until };
        delete missed[i.key];
        got.push({ n: i.n, q: fmt(i.q, i.u), r: rayons.includes(i.r) ? i.r : "Divers" });
      } else { missed[i.key] = today; miss.push(i.n); }
    }
    const keep = [];
    for (const x of menu.extras || []) {
      if (x.done) got.push({ n: x.t, q: "", r: "En plus" });
      else { miss.push(x.t); keep.push(Object.assign({}, x, { missed: today })); }
    }
    const trips = [{ d: today, got, miss }, ...(menu.trips || [])].slice(0, 20);
    const buyLog = Object.assign({}, menu.buyLog);
    for (const g of got) {
      const k = norm(String(g.n).split(" : ")[0]);
      buyLog[k] = [...(buyLog[k] || []).filter(d => d !== today), today].slice(-8);
    }
    return { bought, missed, extras: keep, checked: {}, trips, buyLog, got, miss };
  }

  /* Trois destinations, un seul endroit pour les construire :
     photos privées du dépôt de données, photos du carnet partagé sur le site, photos du compte (seau recipe-photos). */
  const RECIPE_PHOTO_BUCKET = "recipe-photos";
  function recipeDataPhotoPath(id) { return "photos/r-" + id + ".jpg"; }
  function sharePhotoRel(bookId, rid, ts) { return "partage-photos/" + bookId + "/" + rid + "-" + ts + ".jpg"; }
  function githubPagesFileUrl(site, rel) {
    if (!site) return "";
    const parts = String(site).split("/");
    if (parts.length < 2 || !parts[0] || !parts[1]) return "";
    return "https://" + parts[0].toLowerCase() + ".github.io/" + parts[1] + "/" + String(rel || "").replace(/^\//, "");
  }
  function shareBookUrl(site, id) { return id ? githubPagesFileUrl(site, "partage-" + id + ".json") : ""; }
  function sharePhotoPublicUrl(site, bookId, rid, ts) {
  if (!bookId) return "";
  return githubPagesFileUrl(site, "partage-photos/" + bookId + "/" + encodeURIComponent(rid) + "-" + ts + ".jpg");
}
  function cloudRecipePhotoRel(uid, id, key) { return uid + "/" + id + "-" + key + ".jpg"; }
  function cloudRecipePhotoUrl(sb, path) { return sb.storage.from(RECIPE_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl; }

  const api = {
    num, customIngredientQuantity, toBase, fmt, mealPortionFactor, portionFactor, dishOf, platsFor, ingMult,
    recipeIngredientBase, mealIngredientBase, mealCustomQuantity, merge3, settleCheckedGrowth, applyFinishTrip,
    RECIPE_PHOTO_BUCKET, recipeDataPhotoPath, sharePhotoRel, githubPagesFileUrl, shareBookUrl, sharePhotoPublicUrl,
    cloudRecipePhotoRel, cloudRecipePhotoUrl
  };
  Object.assign(root, api);
  if (typeof module !== "undefined" && module && module.exports) module.exports = api;
})(globalThis);
