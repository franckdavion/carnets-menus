"use strict";
/* Maisonnée › Courses : le catalogue de produits (celui des « Produits du quotidien » du Carnet, partagé avec le foyer)
   - tuiles par catégorie avec un emoji, recherche, ⭐ favoris en premier, « + Nouveau produit » ;
   - produits réguliers : une fréquence (🔁 chaque semaine…) ; quand la date revient, ils sont proposés dans « À racheter » ;
   - l'appli devine la fréquence d'après l'historique des courses terminées et la propose.
   Données dans le carnet commun (menu) : daily, dailyCat, dailyHidden (déjà là), dailyFav, dailyFreq, dailyEmoji,
   dailySnooze, dailyFreqNo ; dates d'achat : buyLog (écrit par le Carnet à « Courses terminées »). */

const CAT_EMOJI = { "Mes produits": "⭐", "Hygiène": "🧴", "Entretien": "🧽", "Cuisine": "🍳", "Épicerie de base": "🥫", "Frais": "🥛", "Divers": "📦" };
const PROD_EMOJI = [
  [/papier toilette|pq/i, "🧻"], [/mouchoir/i, "🤧"], [/dentifrice|brosse.*dent/i, "🪥"], [/gel douche|savon|shampo/i, "🧼"], [/déodorant|deodorant|crème|creme/i, "🧴"],
  [/coton/i, "☁️"], [/rasoir/i, "🪒"], [/protection|tampon|serviette/i, "🌸"], [/sopalin|essuie/i, "🧻"], [/vaisselle|éponge|eponge/i, "🧽"],
  [/lessive|adoucissant/i, "🧺"], [/poubelle/i, "🗑️"], [/javel|nettoyant|wc|lingette/i, "🧴"], [/aluminium|film|cuisson|congélation|congelation/i, "📜"],
  [/filtre/i, "☕"], [/café|cafe/i, "☕"], [/thé|the$|tisane/i, "🍵"], [/sucre/i, "🍬"], [/sel|poivre/i, "🧂"], [/huile/i, "🫒"], [/farine/i, "🌾"],
  [/pâtes|pates/i, "🍝"], [/riz/i, "🍚"], [/céréale|cereale/i, "🥣"], [/confiture|miel/i, "🍯"], [/biscuit|gâteau|gateau/i, "🍪"], [/eau/i, "💧"],
  [/lait/i, "🥛"], [/œuf|oeuf/i, "🥚"], [/beurre/i, "🧈"], [/pain|baguette/i, "🥖"], [/yaourt/i, "🍶"], [/fromage|parmesan|râpé|rape/i, "🧀"], [/jambon/i, "🍖"],
  [/pile/i, "🔋"], [/ampoule/i, "💡"], [/allumette|bougie/i, "🔥"], [/vin/i, "🍷"], [/bière|biere/i, "🍺"], [/jus/i, "🧃"], [/chocolat/i, "🍫"], [/fruit|pomme|banane/i, "🍎"],
  [/légume|legume|salade|tomate/i, "🥬"], [/croquette|chat|chien/i, "🐾"], [/couche|bébé|bebe/i, "👶"]
];
const CAT_FREQS = [[7, "Chaque semaine"], [14, "Toutes les 2 semaines"], [30, "Chaque mois"]];
let catQ = "", catProd = null, catNew = false;
const catNk = s => String(s || "").trim().toLowerCase();
const catFreqLabel = d => (CAT_FREQS.find(f => f[0] === d) || [0, `Tous les ${d} jours`])[1];

// the whole catalogue, read from the Carnet
function catData() {
  return cj(`(()=>{const cats=[];const mine=menu.daily||[];
    const loose=mine.filter(t=>!DAILY.some(([g])=>g===dailyCat(t)));if(loose.length)cats.push(["Mes produits",loose]);
    for(const[g,its]of DAILY){const l=[...its.filter(t=>!dailyHidden(t)),...mine.filter(t=>dailyCat(t)===g)];if(l.length)cats.push([g,l]);}
    const nk2=s=>String(s||"").trim().toLowerCase(),inList=new Set((menu.extras||[]).map(x=>nk2(x.t)));
    return{cats,inList:[...inList],fav:menu.dailyFav||[],freq:menu.dailyFreq||{},emoji:menu.dailyEmoji||{},snooze:menu.dailySnooze||{},no:menu.dailyFreqNo||[],
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

/* ---------- the catalogue window ---------- */
function catSheet(keepScroll) {
  const C = catData(), q = catNk(catQ), inList = new Set(C.inList), sc = keepScroll && $("#sheet").open ? $("#sheet").scrollTop : 0;
  const match = t => !q || catNk(t).includes(q);
  const tile = (t, g) => { const on = inList.has(catNk(t)), fav = C.fav.includes(t), f = C.freq[t];
    return `<div class="cat-tile ${on ? "on" : ""}"><button type="button" class="cat-main" data-act="catToggle" data-v="${esc(t)}" aria-pressed="${on}"><span class="cat-em">${catEmoji(C, t, g)}</span><span class="cat-nm">${esc(t)}</span>${f ? `<span class="cat-fq">🔁 ${f === 7 ? "1 sem." : f === 14 ? "2 sem." : f === 30 ? "1 mois" : f + " j"}</span>` : ""}${on ? `<span class="cat-ok">✓</span>` : ""}</button>
      <button type="button" class="cat-star ${fav ? "on" : ""}" data-act="catFav" data-v="${esc(t)}" aria-label="${fav ? "Retirer des favoris" : "Mettre en favori"}">${fav ? "★" : "☆"}</button><button type="button" class="cat-more" data-act="catProd" data-v="${esc(t)}" data-g="${esc(g)}" aria-label="Réglages du produit">⋯</button></div>`; };
  const gOf = t => (C.cats.find(c => c[1].includes(t)) || ["Mes produits"])[0];
  const favs = C.fav.filter(t => match(t));
  let body = `<input class="input" id="catQ" type="search" placeholder="Chercher un produit" value="${esc(catQ)}" autocomplete="off" style="margin-top:6px">`;
  if (favs.length) body += `<p class="group-h">⭐ Mes favoris</p><div class="cat-grid">${favs.map(t => tile(t, gOf(t))).join("")}</div>`;
  for (const [g, its] of C.cats) { const l = its.filter(match); if (l.length) body += `<p class="group-h">${CAT_EMOJI[g] || "🛒"} ${esc(g)}</p><div class="cat-grid">${l.map(t => tile(t, g)).join("")}</div>`; }
  if (q && !C.cats.some(c => c[1].some(match))) body += `<p class="muted" style="margin-top:12px">Aucun produit « ${esc(catQ)} ». <button class="linkbtn" data-act="catNew">Le créer</button></p>`;
  const n = C.inList.length;
  openSheet("Catalogue", body + `<div style="height:16px"></div><div class="sheet-sticky btns"><button class="btn" data-act="catNew">+ Nouveau produit</button><button class="btn primary" data-act="closeSheet" style="flex:1">Terminé · ${n} article${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""}</button></div>`);
  if (keepScroll) $("#sheet").scrollTop = sc;
}
function catProdSheet(t, g) {
  const C = catData(), f = C.freq[t] || 0, own = cj(`(menu.daily||[]).includes(${JSON.stringify(t)})`);
  const cats = ["Mes produits", ...C.cats.map(c => c[0]).filter(x => x !== "Mes produits")];
  openSheet(t, `<form data-form="catProd">
    <div class="inline" style="gap:12px;margin-top:6px"><label class="field" style="flex:none;width:84px"><span class="label">Emoji</span><input class="input" name="emoji" value="${esc(catEmoji(C, t, g))}" maxlength="4" style="text-align:center;font-size:24px"></label>
      <label class="field" style="flex:1"><span class="label">Catégorie</span><select class="input" name="cat" ${own ? "" : "disabled"}>${cats.map(c => `<option ${c === g ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label></div>
    <div class="field"><span class="label">🔁 Produit régulier</span><div class="chips">${[[0, "Non"], ...CAT_FREQS].map(([d, l]) => `<button type="button" class="chip" data-act="catFreqPick" data-v="${d}" aria-pressed="${f === d}">${l}</button>`).join("")}</div>
      <label class="inline" style="gap:8px;margin-top:8px"><span class="small">ou tous les</span><input class="input" name="days" type="number" min="1" max="365" value="${f && !CAT_FREQS.some(x => x[0] === f) ? f : ""}" style="width:90px"><span class="small">jours</span></label>
      <input type="hidden" name="freq" value="${f}"></div>
    ${(() => { const d = buyDates(C, t); return d.length ? `<p class="muted small">Dernier achat : il y a ${daysSince(d[d.length - 1])} jours${d.length > 1 ? ` · ${d.length} achats notés` : ""}.</p>` : ""; })()}
    <div class="sheet-sticky btns"><button type="button" class="btn" data-act="catBack">← Catalogue</button><button class="btn primary" type="submit" style="flex:1">Enregistrer</button></div></form>`, { catT: t });
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

const CAT_ACTS = ["catOpen", "catToggle", "catFav", "catProd", "catBack", "catNew", "catFreqPick", "catAdd", "catDueAll", "catSnooze", "catGuessYes", "catGuessNo"];
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || !CAT_ACTS.includes(b.dataset.act) || !CK.ready) return;
  const a = b.dataset.act, v = b.dataset.v;
  switch (a) {
    case "catOpen": catQ = ""; catSheet(); break;
    case "catToggle": catToggle(v); catSheet(true); render(); break;
    case "catFav": cev(`(()=>{const t=${JSON.stringify(v)},l=menu.dailyFav||[];menu.dailyFav=l.includes(t)?l.filter(x=>x!==t):[...l,t];saveMenu();})()`); catSheet(true); break;
    case "catProd": catProdSheet(v, b.dataset.g); break;
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
    const t = sheetCtx.catT, freq = +(fd.days || 0) || +(fd.freq || 0);
    catSet("dailyFreq", t, freq > 0 ? Math.min(365, freq) : null);
    if (fd.emoji && fd.emoji.trim()) catSet("dailyEmoji", t, fd.emoji.trim());
    if (fd.cat) cev(`(()=>{const t=${JSON.stringify(t)};if((menu.daily||[]).includes(t)){menu.dailyCat=Object.assign({},menu.dailyCat);if(${JSON.stringify(fd.cat)}==="Mes produits")delete menu.dailyCat[t];else menu.dailyCat[t]=${JSON.stringify(fd.cat)};saveMenu();}})()`);
    toast("Produit enregistré."); catSheet(); render();
  } else {
    const t = (fd.name || "").trim(); if (!t) return;
    cev(`(()=>{const t=${JSON.stringify(t)},g=${JSON.stringify(fd.cat || "Mes produits")};const all=[...(menu.daily||[]),...DAILY.flatMap(x=>x[1])];
      if(!all.some(x=>nk(x)===nk(t))){menu.daily=[...(menu.daily||[]),t];if(g!=="Mes produits")menu.dailyCat=Object.assign({},menu.dailyCat,{[t]:g});}
      if(${!!fd.fav})menu.dailyFav=[...new Set([...(menu.dailyFav||[]),t])];
      if(${!!fd.add}&&inExtras(t)<0)menu.extras=[...(menu.extras||[]),{t,done:false}];saveMenu();})()`);
    catQ = ""; toast(`${t} ajouté au catalogue.`); catSheet(); render();
  }
});
