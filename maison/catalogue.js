"use strict";
/* Maisonnée › Courses : le catalogue de produits (celui des « Produits du quotidien » du Carnet, partagé avec le foyer)
   - tuiles par catégorie avec un emoji, recherche, ⭐ favoris en premier, « + Nouveau produit » ;
   - produits réguliers : une fréquence (🔁 chaque semaine…) ; quand la date revient, ils sont proposés dans « À racheter » ;
   - l'appli devine la fréquence d'après l'historique des courses terminées et la propose.
   Données dans le carnet commun (menu) : daily, dailyCat, dailyHidden (déjà là), dailyFav, dailyFreq, dailyEmoji,
   dailySnooze, dailyFreqNo ; dates d'achat : buyLog (écrit par le Carnet à « Courses terminées »). */

const CAT_EMOJI = { "Mes produits": "🏷️", "Hygiène": "🧴", "Entretien": "🧽", "Cuisine": "🍳", "Épicerie de base": "🥫", "Frais": "🥛", "Divers": "📦" };
const PROD_EMOJI = [
  [/pomme de terre|patate/i, "🥔"], [/banane/i, "🍌"], [/brioche|croissant|viennoiserie/i, "🥐"], [/bonbon|confiserie/i, "🍬"], [/orange|clémentine|clementine|mandarine/i, "🍊"],
  [/citron/i, "🍋"], [/fraise/i, "🍓"], [/raisin/i, "🍇"], [/poire/i, "🍐"], [/pêche|peche|abricot/i, "🍑"], [/melon|pastèque|pasteque/i, "🍉"], [/avocat/i, "🥑"],
  [/carotte/i, "🥕"], [/oignon/i, "🧅"], [/\bail\b/i, "🧄"], [/champignon/i, "🍄"], [/brocoli|chou/i, "🥦"], [/concombre|courgette/i, "🥒"], [/poivron|piment/i, "🫑"], [/maïs|mais/i, "🌽"],
  [/poulet|dinde|volaille/i, "🍗"], [/steak|bœuf|boeuf|viande|haché|hache/i, "🥩"], [/saumon|poisson|thon|cabillaud/i, "🐟"], [/crevette|gambas/i, "🦐"], [/saucisse|lardon|bacon/i, "🥓"],
  [/pizza/i, "🍕"], [/glace/i, "🍦"], [/compote/i, "🍏"], [/crème fraîche|creme fraiche|crème liquide/i, "🥛"], [/anti.?calcaire|détartrant|detartrant/i, "🧴"],
  [/papier toilette|pq/i, "🧻"], [/mouchoir/i, "🤧"], [/dentifrice|brosse.*dent/i, "🪥"], [/gel douche|savon|shampo/i, "🧼"], [/déodorant|deodorant|crème|creme/i, "🧴"],
  [/coton/i, "☁️"], [/rasoir/i, "🪒"], [/protection|tampon|serviette/i, "🌸"], [/sopalin|essuie/i, "🧻"], [/vaisselle|éponge|eponge/i, "🧽"],
  [/lessive|adoucissant|linge/i, "🧺"], [/poubelle/i, "🗑️"], [/javel|nettoyant|wc|lingette/i, "🧴"], [/aluminium|film|cuisson|congélation|congelation/i, "📜"],
  [/filtre/i, "☕"], [/café|cafe/i, "☕"], [/thé|the$|tisane/i, "🍵"], [/sucre/i, "🍬"], [/sel|poivre/i, "🧂"], [/huile|olive/i, "🫒"], [/farine/i, "🌾"],
  [/pâtes|pates|spaghetti/i, "🍝"], [/riz/i, "🍚"], [/céréale|cereale/i, "🥣"], [/confiture|miel/i, "🍯"], [/biscuit|gâteau|gateau/i, "🍪"], [/eau/i, "💧"],
  [/lait/i, "🥛"], [/œuf|oeuf/i, "🥚"], [/beurre/i, "🧈"], [/pain|baguette/i, "🥖"], [/yaourt/i, "🍶"], [/fromage|parmesan|râpé|rape|emmental|comté|comte/i, "🧀"], [/jambon/i, "🍖"],
  [/pile/i, "🔋"], [/ampoule/i, "💡"], [/allumette|bougie/i, "🔥"], [/vin/i, "🍷"], [/bière|biere/i, "🍺"], [/jus/i, "🧃"], [/chocolat/i, "🍫"], [/fruit|pomme/i, "🍎"],
  [/légume|legume|salade|tomate/i, "🥬"], [/croquette|chat|chien/i, "🐾"], [/couche|bébé|bebe/i, "👶"]
];
const CAT_EMOJI_PICK = ["🛒", "🍎", "🍌", "🥕", "🥬", "🥛", "🧀", "🥚", "🥖", "🥐", "🍖", "🍗", "🐟", "🍝", "🍚", "🥫", "🍪", "🍫", "🍬", "☕", "🧃", "💧", "🍷", "🧴", "🧼", "🧻", "🧽", "🧺", "🔋", "🐾", "👶", "📦"];
const CAT_FREQS = [[7, "Chaque semaine"], [14, "Toutes les 2 semaines"], [30, "Chaque mois"]];
let catQ = "", catProd = null, catNew = false, catF = "", catDelAsk = false;
const catNk = s => String(s || "").trim().toLowerCase();
const catFreqLabel = d => (CAT_FREQS.find(f => f[0] === d) || [0, `Tous les ${d} jours`])[1];

// the whole catalogue, read from the Carnet
function catData() {
  return cj(`(()=>{const cats=[];const mine=menu.daily||[];
    const loose=mine.filter(t=>!DAILY.some(([g])=>g===dailyCat(t)));if(loose.length)cats.push(["Mes produits",loose]);
    for(const[g,its]of DAILY){const l=[...its.filter(t=>!dailyHidden(t)),...mine.filter(t=>dailyCat(t)===g)];if(l.length)cats.push([g,l]);}
    const nk2=s=>String(s||"").trim().toLowerCase(),inList=new Set((menu.extras||[]).map(x=>nk2(x.t)));
    return{cats,own:mine,builtin:DAILY.flatMap(x=>x[1]),hidden:(menu.dailyHidden||[]).filter(t=>!mine.includes(t)&&DAILY.some(([,its])=>its.includes(t))),inList:[...inList],fav:menu.dailyFav||[],freq:menu.dailyFreq||{},emoji:menu.dailyEmoji||{},snooze:menu.dailySnooze||{},no:menu.dailyFreqNo||[],
      buy:menu.buyLog||{},trips:(menu.trips||[]).map(t=>({d:t.d,got:(t.got||[]).map(g=>nk2(g.n))}))};})()`);
}
const catEmoji = (C, t, g) => C.emoji[t] || (PROD_EMOJI.find(([re]) => re.test(t)) || [0, CAT_EMOJI[g] || "🛒"])[1];
// dates a product was bought: kept by the Carnet at « Courses terminées », plus the recent trips
function buyDates(C, t) {
  const k = catNk(t), s = new Set(C.buy[k] || []);
  for (const tr of C.trips) if (tr.got.some(g => g === k || g.startsWith(k + " :"))) s.add(tr.d);
  return [...s].sort();
}
const daysSince = d => Math.round((Date.parse(today() + "T12:00:00Z") - Date.parse(d + "T12:00:00Z")) / 864e5);
// products to buy again: their frequency has come round, and they are not already on the list
function catDue(C) {
  const out = [], inList = new Set(C.inList), t0 = today();
  for (const [t, f] of Object.entries(C.freq)) {
    if (!f || inList.has(catNk(t)) || (C.snooze[t] && C.snooze[t] > t0)) continue;
    const last = buyDates(C, t).pop();
    if (!last || daysSince(last) >= f) out.push({ t, f, last });
  }
  return out;
}
// a product bought regularly (3 times or more, at steady intervals) without a frequency yet: suggest one
function catGuess(C) {
  const all = new Set([...C.cats.flatMap(c => c[1]), ...Object.keys(C.buy)]);
  for (const t of all) {
    if (C.freq[t] || C.no.includes(t)) continue;
    const d = buyDates(C, t); if (d.length < 3) continue;
    const gaps = d.slice(1).map((x, i) => daysSince(d[i]) - daysSince(x)).filter(g => g > 0);
    if (gaps.length < 2) continue;
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (Math.max(...gaps) > avg * 1.8 || Math.min(...gaps) < avg * .5) continue;
    const f = avg <= 10 ? 7 : avg <= 20 ? 14 : avg <= 45 ? 30 : Math.round(avg);
    const name = C.cats.flatMap(c => c[1]).find(x => catNk(x) === catNk(t)) || t;
    return { t: name, avg: Math.round(avg), f };
  }
  return null;
}

/* ---------- in the shopping list: « 🔁 À racheter » and the catalogue button ---------- */
function catDueHtml() {
  let C; try { C = catData(); } catch (_) { return ""; }
  const due = catDue(C), g = catGuess(C);
  let h = "";
  if (due.length) h += `<div class="card" style="margin-top:14px"><div class="inline" style="justify-content:space-between"><strong>🔁 À racheter</strong><button class="btn primary" data-act="catDueAll" style="padding:6px 12px;font-size:14px">Tout ajouter</button></div>
    <div class="list" style="margin-top:8px">${due.map(x => `<div class="cx-item"><span class="nm">${catEmoji(C, x.t)} ${esc(x.t)}<span class="cx-from">${x.last ? `acheté il y a ${daysSince(x.last)} jours` : "pas encore acheté"} · ${esc(catFreqLabel(x.f).toLowerCase())}</span></span>
      <button type="button" class="cx-have" data-act="catSnooze" data-v="${esc(x.t)}">Pas cette fois</button><button type="button" class="cx-have on" data-act="catAdd" data-v="${esc(x.t)}">+ Ajouter</button></div>`).join("")}</div></div>`;
  if (g) h += `<div class="card" style="margin-top:12px"><span class="small">💡 Vous achetez <strong>${esc(g.t)}</strong> environ tous les ${g.avg} jours : le mettre en 🔁 ${esc(catFreqLabel(g.f).toLowerCase())} ?</span>
    <div class="btns" style="margin-top:6px"><button class="btn primary" data-act="catGuessYes" data-v="${esc(g.t)}" data-f="${g.f}">Oui</button><button class="btn" data-act="catGuessNo" data-v="${esc(g.t)}">Non merci</button></div></div>`;
  return h;
}

/* ---------- the catalogue window: compact rows, filters, one tap = on the list ---------- */
function catSheet(keepScroll) {
  const C = catData(), q = catNk(catQ), inList = new Set(C.inList), sc = keepScroll && $("#sheet").open ? $("#sheet").scrollTop : 0;
  const all = C.cats.flatMap(c => c[1]), gOf = t => (C.cats.find(c => c[1].includes(t)) || ["Mes produits"])[0];
  const favs = C.fav.filter(t => all.includes(t));
  const row = t => { const on = inList.has(catNk(t)), f = C.freq[t], fav = favs.includes(t);
    return `<div class="cat-row ${on ? "on" : ""}"><button type="button" class="cat-rmain" data-act="catToggle" data-v="${esc(t)}" aria-pressed="${on}"><span class="cat-rem">${catEmoji(C, t, gOf(t))}</span><span class="cat-rnm">${esc(t)}${fav ? ' <span class="cat-rfav" aria-label="favori">★</span>' : ""}${f ? `<small>🔁 ${esc(catFreqLabel(f).toLowerCase())}</small>` : ""}</span><span class="cat-rchk" aria-hidden="true">${on ? "✓" : "+"}</span></button>
      <button type="button" class="cat-rmore" data-act="catProd" data-v="${esc(t)}" data-g="${esc(gOf(t))}" aria-label="Modifier ${esc(t)}">⋯</button></div>`; };
  const list = l => `<div class="cat-list">${l.map(row).join("")}</div>`;
  const chip = (v, l) => `<button type="button" class="chip" data-act="catFilter" data-v="${esc(v)}" aria-pressed="${catF === v}">${l}</button>`;
  let body = `<div class="cat-top"><input class="input" id="catQ" type="search" placeholder="Chercher un produit" value="${esc(catQ)}" autocomplete="off">
    <div class="chips cat-filters">${chip("", "Tout")}${favs.length ? chip("fav", "⭐ Favoris") : ""}${chip("list", `Dans ma liste (${C.inList.length})`)}${C.cats.map(([g]) => chip("g:" + g, `${CAT_EMOJI[g] || "🛒"} ${esc(g)}`)).join("")}</div></div>`;
  if (q) {
    const l = all.filter(t => catNk(t).includes(q));
    body += l.length ? list(l) : `<p class="muted" style="margin-top:12px">Aucun produit « ${esc(catQ)} ». <button class="linkbtn" data-act="catNew">Le créer</button></p>`;
  } else if (catF === "fav") body += list(favs);
  else if (catF === "list") { const l = all.filter(t => inList.has(catNk(t))); body += l.length ? list(l) : `<p class="muted" style="margin-top:12px">Rien du catalogue dans la liste pour l'instant.</p>`; }
  else if (catF.startsWith("g:")) { const g = catF.slice(2), c = C.cats.find(x => x[0] === g); body += c ? list(c[1]) : ""; }
  else {
    if (favs.length) body += `<p class="group-h">⭐ Mes favoris</p>${list(favs)}`;
    for (const [g, its] of C.cats) { const l = its.filter(t => !favs.includes(t)); if (l.length) body += `<p class="group-h">${CAT_EMOJI[g] || "🛒"} ${esc(g)}</p>${list(l)}`; }
    if (C.hidden.length) body += `<details class="cat-hidden"><summary class="muted small">Produits masqués (${C.hidden.length})</summary><div class="cat-list">${C.hidden.map(t => `<div class="cat-row"><span class="cat-rmain" style="cursor:default"><span class="cat-rem">${catEmoji(C, t)}</span><span class="cat-rnm muted">${esc(t)}</span></span><button type="button" class="btn small" data-act="catUnhide" data-v="${esc(t)}" style="margin-right:8px">Remettre</button></div>`).join("")}</div></details>`;
  }
  const n = C.inList.length;
  openSheet("Catalogue", body + `<div style="height:16px"></div><div class="sheet-sticky btns"><button class="btn" data-act="catNew">+ Nouveau produit</button><button class="btn primary" data-act="closeSheet" style="flex:1">Terminé · ${n} dans la liste</button></div>`);
  if (keepScroll) $("#sheet").scrollTop = sc;
}
function catProdSheet(t, g) {
  const C = catData(), f = C.freq[t] || 0, fav = C.fav.includes(t), em = catEmoji(C, t, g), on = C.inList.includes(catNk(t)), own = C.own.includes(t);
  const cats = ["Mes produits", ...C.cats.map(c => c[0]).filter(x => x !== "Mes produits")];
  const sugg = [...new Set([em, ...CAT_EMOJI_PICK, ...(window.IngredientEmoji?.choices || [])])];
  openSheet(t, `<form data-form="catProd" autocomplete="off">
    <label class="field" style="margin-top:6px"><span class="label">Nom</span><input class="input" name="name" value="${esc(t)}" maxlength="60" required></label>
    <div class="field"><span class="label">Emoji</span><div class="inline" style="gap:10px"><input class="input" name="emoji" id="catEm" value="${esc(em)}" maxlength="4" style="width:70px;text-align:center;font-size:24px;flex:none"><span class="muted small">ou touchez-en un :</span></div>
      <div class="cat-empick">${sugg.map(x => `<button type="button" data-act="catEmojiPick" data-v="${x}" aria-pressed="${x === em}">${x}</button>`).join("")}</div></div>
    <label class="field"><span class="label">Rayon</span><select class="input" name="cat">${cats.map(c => `<option ${c === g ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
    <label class="switch" style="margin-top:14px"><span><strong>⭐ Favori</strong><br><span class="muted small">en tête du catalogue</span></span><input type="checkbox" name="fav" ${fav ? "checked" : ""}></label>
    <div class="field"><span class="label">🔁 Produit régulier</span><div class="chips">${[[0, "Non"], ...CAT_FREQS].map(([d, l]) => `<button type="button" class="chip" data-act="catFreqPick" data-v="${d}" aria-pressed="${f === d}">${l}</button>`).join("")}</div>
      <label class="inline" style="gap:8px;margin-top:8px"><span class="small">ou tous les</span><input class="input" name="days" type="number" min="1" max="365" value="${f && !CAT_FREQS.some(x => x[0] === f) ? f : ""}" style="width:90px"><span class="small">jours</span></label>
      <input type="hidden" name="freq" value="${f}"></div>
    ${(() => { const d = buyDates(C, t); return d.length ? `<p class="muted small">Dernier achat : il y a ${daysSince(d[d.length - 1])} jours${d.length > 1 ? ` · ${d.length} achats notés` : ""}.</p>` : ""; })()}
    <div class="btns" style="margin-top:18px">${catDelAsk
      ? `<div class="card warn" style="width:100%"><strong>${own ? "Supprimer" : "Masquer"} « ${esc(t)} » du catalogue ?</strong>${own ? "" : `<p class="muted small" style="margin:4px 0 0">C'est un produit de base : il est masqué, et pourra être remis.</p>`}
          <div class="btns">${on ? `<button type="button" class="btn danger" data-act="catDelYes" data-l="1">${own ? "Supprimer" : "Masquer"} et retirer de la liste</button>` : ""}<button type="button" class="btn ${on ? "" : "danger"}" data-act="catDelYes">${own ? "Supprimer" : "Masquer"}${on ? " (garder dans la liste)" : ""}</button><button type="button" class="btn" data-act="catDelNo">Annuler</button></div></div>`
      : `<button type="button" class="btn danger" data-act="catDel">🗑️ ${own ? "Supprimer ce produit" : "Masquer ce produit"}</button>`}</div>
    <div class="sheet-sticky btns"><button type="button" class="btn" data-act="catBack">← Catalogue</button><button class="btn primary" type="submit" style="flex:1">Enregistrer</button></div></form>`, { catT: t, catG: g });
}
// rename a product: its list entry, favourite, frequency, emoji, history follow the new name (same rules as the Carnet)
function catRename(t, nn, g) {
  return cev(`(()=>{const t=${JSON.stringify(t)},nn=${JSON.stringify(nn)},g=${JSON.stringify(g)};
    const builtIn=DAILY.flatMap(x=>x[1]);
    if(nn!==t&&[...(menu.daily||[]),...builtIn.filter(x=>!dailyHidden(x))].some(x=>nk(x)===nk(nn)&&x!==t))return "exists";
    const own=(menu.daily||[]).includes(t),grpOrig=(DAILY.find(([,its])=>its.includes(t))||[""])[0];
    if(nn===t&&(own||g===grpOrig)){if(own){menu.dailyCat=Object.assign({},menu.dailyCat);if(g==="Mes produits")delete menu.dailyCat[t];else menu.dailyCat[t]=g;}return "ok";}
    if(own)menu.daily=menu.daily.map(x=>x===t?nn:x);
    else{menu.dailyHidden=[...new Set([...(menu.dailyHidden||[]),t])];menu.daily=[...(menu.daily||[]),nn];}
    menu.dailyCat=Object.assign({},menu.dailyCat);delete menu.dailyCat[t];if(g!=="Mes produits")menu.dailyCat[nn]=g;
    if(nn!==t){
      menu.extras=(menu.extras||[]).map(x=>nk(x.t)===nk(t)?Object.assign({},x,{t:nn}):x);
      menu.dailyFav=(menu.dailyFav||[]).map(x=>x===t?nn:x);menu.dailyFreqNo=(menu.dailyFreqNo||[]).map(x=>x===t?nn:x);
      for(const f of["dailyFreq","dailyEmoji","dailySnooze"]){const o=Object.assign({},menu[f]);if(t in o){o[nn]=o[t];delete o[t];}menu[f]=o;}
      const bl=Object.assign({},menu.buyLog),a=nk(t),b=nk(nn);if(bl[a]){bl[b]=[...new Set([...(bl[b]||[]),...bl[a]])].sort();delete bl[a];}menu.buyLog=bl;}
    return "ok";})()`);
}
function catNewSheet() {
  const C = catData();
  openSheet("Nouveau produit", `<form data-form="catNew">
    <label class="field"><span class="label">Nom</span><input class="input" name="name" required maxlength="60" value="${esc(catQ)}" placeholder="Ex. Croquettes du chat"></label>
    <label class="field"><span class="label">Catégorie</span><select class="input" name="cat">${["Mes produits", ...C.cats.map(c => c[0]).filter(x => x !== "Mes produits")].map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
    <label class="inline" style="gap:8px;margin-top:6px"><input type="checkbox" name="fav" checked> ⭐ En favori</label>
    <label class="inline" style="gap:8px;margin-top:6px"><input type="checkbox" name="add" checked> Ajouter tout de suite à la liste</label>
    <div class="sheet-sticky btns"><button type="button" class="btn" data-act="catBack">← Catalogue</button><button class="btn primary" type="submit" style="flex:1">Créer</button></div></form>`);
}
// add / take off the list (the Carnet's « En plus » articles)
const catAdd = t => cev(`(()=>{const t=${JSON.stringify(t)};if(inExtras(t)<0)menu.extras=[...(menu.extras||[]),{t,done:false}];saveMenu();})()`);
const catToggle = t => cev(`(()=>{const t=${JSON.stringify(t)},i=inExtras(t);if(i>=0){menu.extras=menu.extras.filter((x,j)=>j!==i);}else menu.extras=[...(menu.extras||[]),{t,done:false}];saveMenu();return i<0;})()`);
const catSet = (field, key, val) => cev(`(()=>{const o=Object.assign({},menu[${JSON.stringify(field)}]);if(${JSON.stringify(val)}===null)delete o[${JSON.stringify(key)}];else o[${JSON.stringify(key)}]=${JSON.stringify(val)};menu[${JSON.stringify(field)}]=o;saveMenu();})()`);

const CAT_ACTS = ["catFilter", "catEmojiPick", "catDel", "catDelYes", "catDelNo", "catUnhide", "catOpen", "catToggle", "catFav", "catProd", "catBack", "catNew", "catFreqPick", "catAdd", "catDueAll", "catSnooze", "catGuessYes", "catGuessNo"];
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || !CAT_ACTS.includes(b.dataset.act) || !CK.ready) return;
  const a = b.dataset.act, v = b.dataset.v;
  switch (a) {
    case "catOpen": catQ = ""; catF = ""; catSheet(); break;
    case "catFilter": catF = v; catQ = ""; catSheet(); break;
    case "catEmojiPick": { const i = $("#catEm"); if (i) i.value = v; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); break; }
    case "catDel": catDelAsk = true; catProdSheet(sheetCtx.catT, sheetCtx.catG); $("#sheet").scrollTop = $("#sheet").scrollHeight; break;
    case "catDelNo": catDelAsk = false; catProdSheet(sheetCtx.catT, sheetCtx.catG); break;
    case "catDelYes": {
      const t = sheetCtx.catT, rm = !!b.dataset.l; catDelAsk = false;
      cev(`(()=>{const t=${JSON.stringify(t)};
        if((menu.daily||[]).includes(t)){menu.daily=menu.daily.filter(x=>x!==t);if(menu.dailyCat){menu.dailyCat=Object.assign({},menu.dailyCat);delete menu.dailyCat[t];}}
        else menu.dailyHidden=[...new Set([...(menu.dailyHidden||[]),t])];
        menu.dailyFav=(menu.dailyFav||[]).filter(x=>x!==t);
        for(const f of["dailyFreq","dailySnooze"]){const o=Object.assign({},menu[f]);delete o[t];menu[f]=o;}
        if(${rm})menu.extras=(menu.extras||[]).filter(x=>nk(x.t)!==nk(t));saveMenu();})()`);
      toast(`${t} retiré du catalogue${rm ? " et de la liste" : ""}.`); catSheet(); render(); break;
    }
    case "catUnhide": cev(`(()=>{menu.dailyHidden=(menu.dailyHidden||[]).filter(x=>x!==${JSON.stringify(v)});saveMenu();})()`); toast(`${v} remis dans le catalogue.`); catSheet(true); break;
    case "catToggle": catToggle(v); catSheet(true); render(); break;
    case "catFav": cev(`(()=>{const t=${JSON.stringify(v)},l=menu.dailyFav||[];menu.dailyFav=l.includes(t)?l.filter(x=>x!==t):[...l,t];saveMenu();})()`); catSheet(true); break;
    case "catProd": catDelAsk = false; catProdSheet(v, b.dataset.g); break;
    case "catBack": catSheet(); break;
    case "catNew": catNewSheet(); break;
    case "catFreqPick": { const f = b.closest("form"); f.querySelector("[name=freq]").value = v; f.querySelector("[name=days]").value = ""; f.querySelectorAll("[data-act=catFreqPick]").forEach(x => x.setAttribute("aria-pressed", x === b)); break; }
    case "catAdd": catAdd(v); render(); toast(`${v} ajouté à la liste.`); break;
    case "catDueAll": { const C = catData(), due = catDue(C); due.forEach(x => catAdd(x.t)); render(); toast(`${due.length} produit${due.length > 1 ? "s" : ""} ajouté${due.length > 1 ? "s" : ""} à la liste.`); break; }
    case "catSnooze": { const C = catData(), f = C.freq[v] || 7; catSet("dailySnooze", v, addDays(today(), Math.max(2, Math.round(f / 2)))); render(); toast("Reproposé plus tard."); break; }
    case "catGuessYes": catSet("dailyFreq", v, +b.dataset.f); render(); toast(`${v} : 🔁 ${catFreqLabel(+b.dataset.f).toLowerCase()}.`); break;
    case "catGuessNo": cev(`(()=>{menu.dailyFreqNo=[...new Set([...(menu.dailyFreqNo||[]),${JSON.stringify(v)}])];saveMenu();})()`); render(); break;
  }
});
document.addEventListener("input", e => {
  if (e.target.id !== "catQ") return;
  catQ = e.target.value; const pos = e.target.selectionStart;
  catSheet(); const i = $("#catQ"); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (_) {} }
});
document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-form=catProd], form[data-form=catNew]"); if (!f || !CK.ready) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(f).entries());
  if (f.dataset.form === "catProd") {
    const t = sheetCtx.catT, freq = +(fd.days || 0) || +(fd.freq || 0), nn = String(fd.name || "").trim().slice(0, 60) || t;
    const r = catRename(t, nn, fd.cat || sheetCtx.catG || "Mes produits");
    if (r === "exists") { toast(`« ${nn} » existe déjà dans le catalogue.`); return; }
    catSet("dailyFreq", nn, freq > 0 ? Math.min(365, freq) : null);
    if (fd.emoji && fd.emoji.trim()) catSet("dailyEmoji", nn, fd.emoji.trim());
    cev(`(()=>{const t=${JSON.stringify(nn)},l=menu.dailyFav||[];menu.dailyFav=${!!fd.fav}?(l.includes(t)?l:[...l,t]):l.filter(x=>x!==t);saveMenu();})()`);
    toast(nn !== t ? `Renommé en « ${nn} ».` : "Produit enregistré."); catSheet(); render();
  } else {
    const t = (fd.name || "").trim(); if (!t) return;
    cev(`(()=>{const t=${JSON.stringify(t)},g=${JSON.stringify(fd.cat || "Mes produits")};const all=[...(menu.daily||[]),...DAILY.flatMap(x=>x[1])];
      if(!all.some(x=>nk(x)===nk(t))){menu.daily=[...(menu.daily||[]),t];if(g!=="Mes produits")menu.dailyCat=Object.assign({},menu.dailyCat,{[t]:g});}
      if(${!!fd.fav})menu.dailyFav=[...new Set([...(menu.dailyFav||[]),t])];
      if(${!!fd.add}&&inExtras(t)<0)menu.extras=[...(menu.extras||[]),{t,done:false}];saveMenu();})()`);
    catQ = ""; toast(`${t} ajouté au catalogue.`); catSheet(); render();
  }
});
