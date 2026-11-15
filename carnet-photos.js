/* Pertinence des photos de recettes (Carnet + Maisonnée).
   Filtre les logos / marques / personnes, exige un lien avec le nom du plat. */
(function (root) {
  const STOP = new Set("de du des d la le les l au aux a et en avec sans sur pour facon style ma mon mes maison express rapide facile leger legere legers legeres allege allegee cremeux cremeuse fondant fondante simple revisite revisitee minute moelleux croustillant gourmand healthy recette meilleure aux".split(" "));
  const WEAK = new Set(["bowl", "plat", "dish", "food", "meal", "menu", "house", "maison", "special", "deluxe"]);
  const GENERIC = new Set(["poulet", "chicken", "riz", "rice", "sauce", "salade", "salad", "viande", "poisson", "fromage", "soupe", "gateau", "pain", "oeuf", "oeufs", "legume", "legumes", "eau", "sel", "huile"]);
  const FOOD_HINT = /plat|recette|cuisine|culinaire|food|dish|cooked|cooking|gratin|soupe|veloute|salade|roti|rotie|curry|tajine|risotto|lasagne|pasta|pates|four|poele|assiette|servi|servie|homemade|fait maison|boulgour|bulgur|crudite|bowl food|poke|nugget|frit|frite|mijote|braise|fournee|borek|börek|crab cake/i;
  const OFF = /kfc|kentucky|mcdonald|burger[\s_-]?king|quick|nando|camilla|bowles|parker[\s_-]?bowles|reine[\s_-]?consort|queen[\s_-]?camilla|first responder bowl|superbowl|super[\s_-]?bowl|nfl|football|logo|svg|blason|armoiries|drapeau|flag|portrait|personnalit|acteur|actrice|chanteu|film\b|album\b|chanson|entreprise|societe|franchise|restauration rapide|fast[\s_-]?food|cha[iî]ne de restauration|master poulet|tasty crousty|adieu poulet|colonel[\s_-]?sanders|wikimedia.*person|aotearoa|clipart|icon\b|icone|mascot|poster|affiche|diagram|schema|carte de|locator|coat of arms/i;
  const ILLUSTRATION = /\.(svg)(\?|$)|\/wikipedia\/(fr|en|commons)\/.+\.svg/i;

  function fold(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae");
  }
  function hay(s) {
    return fold(s).replace(/[_./%()[\]-]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function tokens(s) {
    return hay(s).split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP.has(w));
  }
  function phKeywords(name) {
    return tokens(name).filter(w => !WEAK.has(w)).slice(0, 5);
  }
  function coreTerms(name) {
    return phKeywords(name).filter(w => !WEAK.has(w));
  }
  function distinctive(name) {
    return coreTerms(name).filter(w => !GENERIC.has(w));
  }
  function blobOf(c) {
    if (!c) return "";
    return [c.title, c.desc, c.page, c.src, c.u, c.extract].filter(Boolean).join(" ");
  }
  function offTopic(text) {
    const h = hay(text);
    return OFF.test(h) || ILLUSTRATION.test(String(text || ""));
  }
  function closeTok(a, b) {
    if (a === b) return true;
    if (a.length < 4 || b.length < 4) return false;
    const [short, long] = a.length <= b.length ? [a, b] : [b, a];
    return long.startsWith(short) && long.length - short.length <= 2;
  }
  function overlap(need, hayset) {
    const hits = [];
    for (const w of need) {
      if (hayset.has(w) || [...hayset].some(h => closeTok(w, h))) hits.push(w);
    }
    return hits;
  }
  function scoreCandidate(recipeName, cand) {
    const text = blobOf(cand);
    if (!recipeName || !cand || !cand.u) return 0;
    if (offTopic(text)) return 0;
    if (ILLUSTRATION.test(cand.u)) return 0;
    const need = coreTerms(recipeName);
    if (!need.length) return 0;
    const hayset = new Set(tokens(text));
    const hits = overlap(need, hayset);
    if (!hits.length) return 0;
    const dist = distinctive(recipeName);
    const distHits = dist.filter(w => hits.includes(w));
    if (dist.length && !distHits.length && hits.length < 2) return 0;
    if (dist.length >= 2 && !distHits.length) return 0;
    const food = FOOD_HINT.test(hay(text));
    if (!food && distHits.length < 2) return distHits.length ? 1 : 0;
    let n = hits.length + distHits.length * 2;
    if (food) n += 2;
    if (GENERIC.has(hits[0]) && !distHits.length) n -= 1;
    return Math.max(0, n);
  }
  function acceptAuto(score) { return score >= 3; }
  function acceptPicker(score) { return score >= 2; }
  function searchQueries(name) {
    const keys = phKeywords(name);
    const dist = distinctive(name);
    const full = keys.join(" ");
    const culinary = dist.length ? dist.join(" ") + " recette plat" : keys.slice(0, 3).join(" ") + " recette";
    const out = [];
    if (full) out.push(full);
    if (culinary && culinary !== full) out.push(culinary);
    if (dist.length) out.push(dist.join(" "));
    return [...new Set(out.filter(Boolean))];
  }
  function rank(recipeName, list, mode) {
    const ok = mode === "picker" ? acceptPicker : acceptAuto;
    return (list || [])
      .map(c => Object.assign({}, c, { score: scoreCandidate(recipeName, c) }))
      .filter(c => ok(c.score))
      .sort((a, b) => b.score - a.score);
  }
  function looksPersonal(r) {
    return !!(r && (r.photo || r.cloudPhoto));
  }

  const api = {
    fold, hay, tokens, phKeywords, coreTerms, distinctive, offTopic,
    scoreCandidate, acceptAuto, acceptPicker, searchQueries, rank, looksPersonal, blobOf
  };
  root.carnetPhotos = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
