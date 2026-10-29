"use strict";
/* Maisonnée › Courses : la liste de courses du Carnet de menus, avec ses fonctions
   (jours couverts, rayons et quantités, « j'ai déjà », articles en plus, recettes hors menu,
   cocher au fil du magasin, courses terminées, vider la liste).
   Tout passe par le Carnet chargé en arrière-plan (repas.js) : mêmes calculs, mêmes données, même liste pour tout le foyer. */

let cxHaveOpen = false; // « Déjà à la maison » stays open while you put items back, until you close it
let cxClearAsk = false, cxFinishAsk = false, cxUndo = false;
// run one of the Carnet's own buttons (same code as a tap in the Carnet)
function cxStateClass(st){return ({"Proposé":"proposed","Gardé":"saved","En courses":"shopping","Courses faites":"purchased","Terminé":"completed"})[st]||"proposed";}
function cxStateLabel(st){return ({"Proposé":"👨‍🍳 Proposé","Gardé":"✓ Gardé","En courses":"🛒 En courses","Courses faites":"🧺 Courses faites","Terminé":"⚑ Terminé"})[st]||"👨‍🍳 Proposé";}
function cclick(d) {
  const doc = CK.frame.contentDocument, b = doc.createElement("button");
  b.type = "button"; b.style.display = "none";
  for (const [k, v] of Object.entries(d)) b.dataset[k] = v;
  doc.body.appendChild(b); b.click(); b.remove();
}
function cxData() {
  return cj(`(()=>{const all=shopDates(),selK=visibleShopDates().map(x=>x.key);
    const days=all.map(x=>({key:x.key,lab:dayShort(x),on:selK.includes(x.key),full:x.locked===x.n,any:x.locked>0,n:x.n}));
    const plan=visibleShopDates().map(x=>({key:x.key,lab:x.dn+" "+x.d.getDate(),w:ymd(mondayOf(x.d)),meals:MEALS.map(([m,lab])=>{const k=slotKey(x.dn,m),s=x.wk[k];
      return s&&recipes[s.id]?{k,id:s.id,m:lab,name:recipes[s.id].name,n:s.n||menu.people||4,lock:!!s.lock,state:["Proposé","Gardé","En courses","Courses faites","Terminé"].includes(s.mealState)?s.mealState:(s.lock?"En courses":s.keep?"Gardé":"Proposé")}:null;}).filter(Boolean)})).filter(d=>d.meals.length);
    const items=shopping().map(i=>({key:i.key,n:i.n,qt:fmt(i.q,i.u)||"",r:RAYONS.includes(i.r)?i.r:"Divers",from:i.from||[],on:!!menu.checked[i.key],miss:(menu.missed||{})[i.key]||""}));
    const extras=(menu.extras||[]).map((x,ix)=>({ix,t:x.t,on:!!x.done,miss:x.missed||""}));
    const xr=Object.entries(menu.shopExtra||{}).filter(([id])=>recipes[id]).map(([id,n])=>({id,n,name:recipes[id].name,dup:validatedUses(id).length>0}));
    const have=shopping(true).filter(isHave).map(i=>({key:i.key,n:i.n,qt:fmt(i.q,i.u)||""})).sort((a,b)=>a.n.localeCompare(b.n,"fr"));
    return {days,plan,items,extras,xr,have,duplicateWarnings:shoppingDuplicateWarnings(),learn:menu.rayonLearn||{},order:menu.rayonOrder||[]};})()`);
}
/* rayons: every item in the aisle where it is found in the shop, in the order of « my » shop.
   An item typed by hand finds its aisle by its name; moved once by hand, it stays there next time (menu.rayonLearn,
   shared with the household like the rest of the carnet). The order of the aisles is menu.rayonOrder. */
const CX_RAYONS = ["Fruits & légumes", "Boulangerie", "Boucherie & poisson", "Crémerie", "Épicerie", "Surgelés", "Boissons", "Hygiène & maison", "Divers"];
const CX_GUESS = [
  [/(?:^|[^a-zà-ÿœ])(?:pile|ampoule|lessive|adoucissant|liquide vaisselle|pastille|éponge|eponge|essuie|sopalin|papier toilette|pq|mouchoir|sac poubelle|sacs poubelle|javel|nettoyant|détergent|detergent|savon|gel douche|shampo|dentifrice|brosse à dents|rasoir|déodorant|deodorant|coton|couche|lingette|serviette|tampon|aluminium|film|allumette|bougie|insecticide|croquette|litière|litiere)/i, "Hygiène & maison"],
  [/(?:^|[^a-zà-ÿœ])(?:eau|jus|soda|coca|limonade|sirop|bière|biere|vin|champagne|cidre|café|cafe|thé|the |tisane|infusion|lait d'avoine|lait de soja)/i, "Boissons"],
  [/(?:^|[^a-zà-ÿœ])(?:pain|baguette|brioche|croissant|pain de mie|biscotte|tortilla|wrap)/i, "Boulangerie"],
  [/(?:^|[^a-zà-ÿœ])(?:surgel|glace|frites|poêlée|poelee|pizza surg)/i, "Surgelés"],
  [/(?:^|[^a-zà-ÿœ])(?:fromage râpé|fromage rape|râpé|rape)/i, "Crémerie"],
  [/(?:^|[^a-zà-ÿœ])(?:riz|pâtes|pates|farine|sucre|sel|poivre|huile|vinaigre|moutarde|ketchup|mayonnaise|conserve|boîte|boite|biscuit|gâteau|gateau|chocolat|céréale|cereale|confiture|miel|levure|bouillon|épice|epice|lentille|pois chiche|haricot|semoule|quinoa|chips|compote|sauce|olive|thon en boîte)/i, "Épicerie"]
];
function cxGuess(name, learn) {
  const k = String(name || "").trim().toLowerCase();
  if (learn && learn[k]) return learn[k];
  const g = CX_GUESS.find(([re]) => re.test(" " + k));
  if (g) return g[1];
  try { const r = cev(`(()=>{const n=${JSON.stringify(k)};const g=GUESS.find(([re])=>re.test(n));return g?g[1]:""})()`); if (r) return r; } catch (_) {}
  return "Divers";
}
const cxOrder = order => [...(order || []).filter(r => CX_RAYONS.includes(r)), ...CX_RAYONS.filter(r => !(order || []).includes(r))];
let cxOrderDraft = null;
function cxOrderSheet() {
  const l = cxOrderDraft;
  openSheet("Ordre des rayons", `<p class="muted small" style="margin:6px 0 10px">Rangez les rayons dans l'ordre où vous les traversez dans votre magasin : la liste suivra cet ordre.</p>
    <div class="list">${l.map((r, i) => `<div class="cx-item"><span class="nm"><strong>${i + 1}.</strong> ${esc(r)}</span>
      <button type="button" class="cx-x" data-act="cxOrdMove" data-v="${i}" data-d="-1" ${i ? "" : "disabled"} aria-label="Monter ${esc(r)}">▲</button>
      <button type="button" class="cx-x" data-act="cxOrdMove" data-v="${i}" data-d="1" ${i < l.length - 1 ? "" : "disabled"} aria-label="Descendre ${esc(r)}">▼</button></div>`).join("")}</div>
    <div class="sheet-sticky btns"><button class="btn primary" data-act="cxOrdSave" style="flex:1">Enregistrer</button><button class="btn" data-act="cxOrdReset">Ordre habituel</button></div>`);
}
function cxMoveSheet(name, cur) {
  openSheet("Ranger dans quel rayon ?", `<p style="margin:6px 0 10px"><strong>${esc(name)}</strong><br><span class="muted small">Retenu pour la prochaine fois, pour tout le foyer.</span></p>
    <div class="chips">${CX_RAYONS.map(r => `<button type="button" class="chip" data-act="cxMoveTo" data-n="${esc(name)}" data-v="${esc(r)}" aria-pressed="${r === cur}">${esc(r)}</button>`).join("")}</div>`);
}
const cxShort = d => { try { return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); } catch (_) { return d; } };

// Préférences d'affichage locales uniquement : ne modifient jamais les données de courses.
// Icônes purement décoratives : les noms, l’ordre et les règles des rayons restent inchangés.
function cxRayonIcon(name) {
  const n = String(name || "").toLocaleLowerCase("fr");
  if (/fruit|légume|legume/.test(n)) return "🥕";
  if (/boucher|poisson|viande|charcut/.test(n)) return "🥩";
  if (/crèmer|cremer|laitage|frais/.test(n)) return "🧀";
  if (/épicer|epicer/.test(n)) return "🥫";
  if (/surgel/.test(n)) return "❄️";
  if (/hygi|maison|entretien/.test(n)) return "🧴";
  if (/boulanger|pain/.test(n)) return "🥖";
  if (/boisson/.test(n)) return "🥤";
  return "📦";
}
// Affichage uniquement : réutiliser les emojis du catalogue, y compris les choix personnalisés.
function cxProductEmoji(name) {
  const label = String(name || "");
  try {
    const local = JSON.parse(localStorage.getItem("maisonnee-ingredient-emojis-v1") || "{}");
    const key = window.IngredientEmoji?.normalize?.(label);
    if (key && local[key]) return local[key];
    if (typeof catData === "function") {
      const C = catData();
      const k = Object.keys(C.emoji || {}).find(x => window.IngredientEmoji?.normalize?.(x) === key);
      if (k && C.emoji[k]) return C.emoji[k];
    }
  } catch (_) {}
  return window.IngredientEmoji?.get(label) || "🛒";
}

const cxFoldStorageKey = "maisonnee_courses_rayons_ouverts_v1";
let cxFoldState = (() => { try { return JSON.parse(sessionStorage.getItem(cxFoldStorageKey) || "{}"); } catch (_) { return {}; } })();
function cxFoldSave() { try { sessionStorage.setItem(cxFoldStorageKey, JSON.stringify(cxFoldState)); } catch (_) {} }
const shopViewBase = shopView;
VIEWS.courses = function () {
  if (mode !== "cloud" || !isLinked()) return shopViewBase();
  carnetBoot();
  if (CK.err) return `<div class="card warn"><strong>Liste du Carnet indisponible.</strong><span class="small">${esc(CK.err)}</span></div>` + shopViewBase();
  if (!CK.ready) return `<div class="empty"><strong>Chargement de la liste du Carnet…</strong>Quelques secondes la première fois.</div>`;
  let D; try { D = cxData(); } catch (e) { return shopViewBase(); }
  const tick = i => `<span class="box">${I.tick}</span>`;
  const row = (i, ref) => `<div class="cx-item ${i.on ? "done" : ""}" ${ref.startsWith("x:") ? `data-mz-shop-name="${esc(String(i.t || "").trim().toLocaleLowerCase("fr"))}"` : ""}>
      <button type="button" class="cx-tick" data-act="cxTick" data-v="${esc(ref)}" aria-pressed="${i.on}" aria-label="${i.on ? "Retirer du caddie" : "Dans le caddie"} : ${esc(i.n || i.t)}">${tick(i)}</button>
      <span class="nm"><button type="button" class="cx-emoji-edit" data-act="cxEmojiEdit" data-n="${esc(i.n || i.t)}" aria-label="Changer l’emoji de ${esc(i.n || i.t)}" title="Changer l’emoji"><span class="cx-ingredient-emoji" aria-hidden="true">${cxProductEmoji(i.n || i.t)}</span></button><button type="button" class="cx-name" data-act="cxMove" data-n="${esc(i.n || i.t)}" data-r="${esc(i.r || "")}">${esc(i.n || i.t)}</button>${i.miss && !i.on ? `<span class="cx-miss">Pas trouvé le ${esc(cxShort(i.miss))}</span>` : ""}${i.from && i.from.length ? `<span class="cx-from">Pour : ${esc(i.from.join(" · "))}</span>` : ""}</span>
      ${i.qt ? `<span class="q">${esc(i.qt)}</span>` : ""}
      ${i.on ? "" : ref.startsWith("k:") ? `<button type="button" class="cx-have" data-act="cxHave" data-v="${esc(i.key)}">J'ai déjà</button>` : `<button type="button" class="cx-x" data-act="cxRmX" data-v="${i.ix}" aria-label="Retirer ${esc(i.t)}">✕</button>`}
    </div>`;
  for (const i of D.items) i.r = D.learn[String(i.n).trim().toLowerCase()] || i.r;
  for (const x of D.extras) x.r = cxGuess(x.t, D.learn);
  const todo = D.items.filter(i => !i.on), todoX = D.extras.filter(x => !x.on);
  const done = [...D.items.filter(i => i.on).map(i => row(i, "k:" + i.key)), ...D.extras.filter(x => x.on).map(x => row(x, "x:" + x.ix))];
  const total = D.items.length + D.extras.length;
  const sel = D.days.filter(x => x.on);
  const nLeft = todo.length + todoX.length;
  let out = `<button type="button" class="cx-jump" data-act="cxJump">🛒 Ma liste de courses<span>${total ? (nLeft ? `${nLeft} article${nLeft > 1 ? "s" : ""} à prendre` : "tout est dans le caddie ✓") : "liste vide"}</span><i aria-hidden="true">↓</i></button>`;
  out += `<div class="cx-ultimate-stats" aria-label="Résumé des courses"><div><strong>${nLeft}</strong><span>À prendre</span></div><div><strong>${done.length}</strong><span>Dans le panier</span></div><div><strong>${sel.length}</strong><span>Jours sélectionnés</span></div></div>
    <div class="cx-ultimate-progress"><span style="width:${total ? Math.round(done.length / total * 100) : 0}%"></span></div>
    <div class="cx-ultimate-actions"><button class="btn primary" type="button" data-act="cxJump">🛒 Mode magasin</button><button class="btn" type="button" data-act="cxAddFocus">＋ Ajouter un article</button><a class="btn" href="${CARNET_URL}">📖 Ouvrir le Carnet</a></div>
    <details class="card cx-ultimate-help"><summary>ⓘ Aide et états des repas</summary><p class="muted small">Touchez un plat pour choisir une action. Touchez son état pour ouvrir la fiche du repas.</p><div class="cx-state-legend">${["Proposé","Gardé","En courses","Courses faites","Terminé"].map(st=>`<span class="r-meal-badge ${cxStateClass(st)}">${cxStateLabel(st)}</span>`).join("")}</div></details>`;

  if(D.duplicateWarnings&&D.duplicateWarnings.length) out += `<details class="card" style="margin-top:12px"><summary>⚠️ ${D.duplicateWarnings.length} doublon${D.duplicateWarnings.length>1?"s":""} possible${D.duplicateWarnings.length>1?"s":""} à vérifier</summary><p class="muted small">Ces articles se ressemblent. Aucun regroupement ni achat n'a été modifié automatiquement.</p>${D.duplicateWarnings.map(g=>`<p class="small">${g.map(esc).join(" / ")}</p>`).join("")}</details>`;
  out += `<p class="group-h">Courses pour</p>${D.days.length ? `<div class="chips">${D.days.map(x => `<button type="button" class="chip" data-act="cxDay" data-v="${esc(x.key)}" aria-pressed="${x.on}">${x.on ? esc(x.lab) : esc(x.lab) + " · " + x.n + " repas"}</button>`).join("")}</div>
    <div class="btns" style="margin-top:8px"><button class="linkbtn small" data-act="cxDaysAll">Tous les jours</button><button class="linkbtn small" data-act="cxDaysNone">Aucun</button></div>`
    : `<p class="muted small">Aucun repas prévu dans les 3 prochaines semaines.</p>`}
    <p class="muted small" style="margin:8px 2px 0">${sel.length ? `${sel.length} jour${sel.length > 1 ? "s" : ""} · ` : ""}${total} article${total > 1 ? "s" : ""}${done.length ? ` · ${done.length} dans le caddie` : ""}. Touchez un jour pour voir ses repas et choisir ce qui part dans les courses.</p>
    ${D.plan.length ? `<p class="group-h">Au menu ces jours-là</p><div class="cx-ultimate-days">${D.plan.map(d => `<section class="cx-ultimate-day"><h3>${esc(d.lab)} <small>${d.meals.length} repas</small></h3>${d.meals.map(m=>`<div class="cx-ultimate-meal"><button type="button" class="cx-ultimate-meal-name" data-act="cxMealActions" data-w="${esc(d.w)}" data-v="${esc(m.k)}" data-name="${esc(m.name)}" data-n="${m.n}" data-meal="${esc(m.m)}"><span class="cx-ultimate-meal-time">${/midi/i.test(m.m)?"☀️":"🌙"} ${esc(m.m)}</span><strong>${esc(m.name)}</strong><small>👥 ${m.n} pers. · Options ›</small></button><button type="button" class="r-meal-badge ${cxStateClass(m.state)}" data-act="cxMeal" data-w="${esc(d.w)}" data-v="${esc(m.k)}">${cxStateLabel(m.state)}</button></div>`).join("")}</section>`).join("")}</div>` : ""}
    ${typeof catDueHtml === "function" ? catDueHtml() : ""}
    <form data-form="cxAdd" class="inline" style="margin-top:14px" autocomplete="off">
      <input class="input" id="cxIn" name="name" aria-label="Article à ajouter" placeholder="Ajouter : lait, piles, pain…" enterkeyhint="done">
      <button class="btn ink" type="submit">Ajouter</button></form>
    <div class="btns" style="margin-top:8px"><button class="btn block" data-act="catOpen">🛍️ Catalogue · favoris, produits réguliers</button></div>`;
  if (cxUndo) out += `<div class="card" style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px"><span>Courses terminées.</span><button class="btn" data-act="cxFinishUndo">Annuler</button></div>`;
  if (D.xr.length) out += `<p class="group-h">Recettes ajoutées hors menu</p><div class="list">${D.xr.map(x => `<div class="cx-item"><span class="nm">${esc(x.name)}${x.dup ? `<span class="cx-from">déjà au menu validé : pas compté deux fois</span>` : ""}</span><span class="q">${x.n} pers.</span><button type="button" class="cx-x" data-act="cxRmR" data-v="${esc(x.id)}" aria-label="Retirer ${esc(x.name)}">✕</button></div>`).join("")}</div>`;
  if (total) out += `<div class="cx-progress" role="status" aria-label="Progression des courses : ${done.length} sur ${total} articles achetés">
    <div class="cx-progress-label"><strong>🛒 ${done.length} acheté${done.length > 1 ? "s" : ""}</strong><span>${nLeft} restant${nLeft > 1 ? "s" : ""} · ${total} au total</span></div>
    <div class="cx-progress-track"><span style="width:${Math.round(done.length / total * 100)}%"></span></div>
  </div>`;
  out += `<h2 class="cx-list-h" id="cxList">🛒 Liste de courses${total ? `<span>${nLeft ? nLeft + " à prendre" : "tout est pris"}${done.length ? " · " + done.length + " dans le caddie" : ""}</span>` : ""}</h2>`;
  if (!total) out += `<div class="empty" style="margin-top:16px"><strong>La liste est vide.</strong>${sel.length ? "Envoyez des repas de ces jours aux courses depuis Repas, ou ajoutez des articles ci-dessus." : "Choisissez ci-dessus les jours pour lesquels vous faites les courses."}</div>`;
  if (todo.length + todoX.length) out += `<div class="btns" style="margin-top:14px;justify-content:space-between"><span class="muted small" style="align-self:center">Rangée par rayon · touchez un article pour changer son rayon</span><button class="linkbtn small" data-act="cxOrder">Ordre des rayons</button></div>`;
  for (const ry of cxOrder(D.order)) {
    const l = todo.filter(i => i.r === ry).sort((a, b) => a.n.localeCompare(b.n, "fr")), lx = todoX.filter(x => x.r === ry).sort((a, b) => a.t.localeCompare(b.t, "fr"));
    if (!l.length && !lx.length) continue;
    const opened = cxFoldState[ry] !== false;
    out += `<section class="cx-fold ${opened ? "is-open" : ""}" data-cx-rayon="${esc(ry)}">
      <div class="cx-rayon cx-fold-head"><button type="button" class="cx-fold-toggle" data-act="cxFold" data-v="${esc(ry)}" aria-expanded="${opened}" aria-controls="cx-fold-${cxOrder(D.order).indexOf(ry)}"><span class="cx-rayon-icon" aria-hidden="true">${cxRayonIcon(ry)}</span><strong>${esc(ry)}</strong><span class="cx-fold-count">${l.length + lx.length} à prendre</span><span class="cx-fold-arrow" aria-hidden="true">⌄</span></button></div>
      <div class="cx-fold-body" id="cx-fold-${cxOrder(D.order).indexOf(ry)}" ${opened ? "" : "hidden"}>${l.length ? `<div class="cx-fold-actions"><button type="button" class="linkbtn small" data-act="cxHaveRayon" data-v="${esc(ry)}">J'ai tout ce rayon</button></div>` : ""}<div class="list">${l.map(i => row(i, "k:" + i.key)).join("")}${lx.map(x => row(x, "x:" + x.ix)).join("")}</div></div>
    </section>`;
  }
  if (total && !todo.length && !todoX.length) out += `<div class="empty" style="margin-top:16px"><strong>Tout est dans le caddie !</strong></div>`;
  if (done.length) {
    out += `<p class="group-h">Dans le caddie (${done.length})</p><div class="list">${done.join("")}</div>`;
    const left = todo.length + todoX.length;
    out += cxFinishAsk
      ? `<div class="card" style="margin-top:12px"><strong>${done.length} article${done.length > 1 ? "s" : ""} acheté${done.length > 1 ? "s" : ""}</strong>${left ? `, ${left} non trouvé${left > 1 ? "s" : ""} (${left > 1 ? "ils restent" : "il reste"} dans la liste)` : ""}. Terminer les courses ?
          <div class="btns"><button class="btn primary" data-act="cxFinishYes">Oui, terminer</button><button class="btn" data-act="cxFinishNo">Pas encore</button></div></div>`
      : `<div class="btns"><button class="btn primary block" data-act="cxFinish">Courses terminées</button></div>
         <p class="muted small" style="margin-top:6px">Ce qui est coché sort de la liste. Le reste est gardé pour la prochaine fois.</p>`;
  }
  if (D.have.length) out += `<details class="card" id="cxHave" style="margin-top:16px" ${cxHaveOpen ? "open" : ""}><summary class="muted">Déjà à la maison (${D.have.length})</summary>
    <div style="display:flex;justify-content:flex-end;margin-top:6px"><button type="button" class="btn ghost" data-act="cxHaveClose" aria-label="Refermer la liste">✕ Refermer</button></div><div class="list" style="margin-top:8px">${D.have.map(i => `<div class="cx-item"><span class="nm muted">${esc(i.n)}</span><span class="q">${esc(i.qt)}</span><button type="button" class="cx-have" data-act="cxHaveUndo" data-v="${esc(i.key)}">Remettre</button></div>`).join("")}</div></details>`;
  if (total || D.xr.length) out += cxClearAsk
    ? `<div class="card warn" style="margin-top:16px"><span>Vider toute la liste ? Les repas restent au menu, à renvoyer aux courses.</span><div class="btns"><button class="btn danger" data-act="cxClearYes">Oui, vider</button><button class="btn" data-act="cxClearNo">Non</button></div></div>`
    : `<div class="btns" style="margin-top:16px"><button class="btn" data-act="cxClear">🗑️ Vider la liste</button></div>`;
  return out;
};

document.addEventListener("toggle", e => { if (e.target.id === "cxHave") cxHaveOpen = e.target.open; }, true);
// « Courses pour » : a day's summary first (same rules as the Carnet: dayApply)
let cxDayK = null, cxDaySel = {};
function cxDaySheet(d, fresh) {
  const x = cj(`(()=>{const x=dayInfo(${JSON.stringify(d)});if(!x)return null;const inList=selectedShopDates().some(y=>y.key===x.key);
    return{key:x.key,title:(t=>t.charAt(0).toUpperCase()+t.slice(1))(x.d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})),w:ymd(mondayOf(x.d)),inList,
      meals:MEALS.map(([m,lab])=>{const k=slotKey(x.dn,m),s=x.wk[k];return s&&recipes[s.id]?{k,lab,name:recipes[s.id].name,n:s.n||menu.people,lock:!!s.lock}:null;}).filter(Boolean)};})()`);
  if (!x) return;
  if (fresh) { cxDayK = d; cxDaySel = {}; for (const m of x.meals) cxDaySel[m.k] = x.inList ? m.lock : true; }
  const ks = Object.keys(cxDaySel).filter(k => cxDaySel[k] !== false);
  const n = cev(`dayIngCount(dayInfo(${JSON.stringify(d)}),${JSON.stringify(ks)})`);
  const sc = $("#sheet").open ? $("#sheet").scrollTop : 0;
  openSheet(x.title, `<p class="muted small" style="margin:4px 0 8px">${x.inList ? "Ce jour est dans la liste de courses." : "Ce qui est prévu ce jour-là : choisissez ce qui part dans les courses."}</p>
    ${x.meals.length ? `<div class="list">${x.meals.map(m => { const on = cxDaySel[m.k] !== false;
      return `<div class="cx-item"><span class="nm"><span class="cx-from" style="margin:0">${esc(m.lab)}</span><strong>${esc(m.name)}</strong> <span class="muted small">· ${m.n} pers.</span><br><button type="button" class="linkbtn small" data-act="cxDsSee" data-w="${esc(x.w)}" data-k="${esc(m.k)}">voir / changer</button></span>
        <button type="button" class="cx-have ${on ? "on" : ""}" data-act="cxDsTog" data-k="${esc(m.k)}" aria-pressed="${on}">${on ? "✓ Dans les courses" : "Pas cette fois"}</button></div>`; }).join("")}</div>` : `<p class="muted">Aucun repas prévu ce jour.</p>`}
    <div class="sheet-sticky btns" style="flex-direction:column;align-items:stretch">
      <button class="btn primary" data-act="cxDsApply" ${ks.length || x.inList ? "" : "disabled"}>${x.inList ? "Mettre à jour" : "🛒 Ajouter ce jour aux courses"} · ${ks.length} repas, ${n} ingrédient${n > 1 ? "s" : ""}</button>
      ${x.inList ? `<button class="btn ghost" data-act="cxDsRemove">Retirer ce jour des courses</button>` : ""}</div>`);
  if (!fresh) $("#sheet").scrollTop = sc;
}
const CX_ACTS = ["cxEmojiEdit", "cxAddFocus", "cxMealActions", "cxActionRecipe", "cxActionMeal", "cxActionChange", "cxFold", "cxDsTog", "cxDsSee", "cxDsApply", "cxDsRemove", "cxMealLock", "cxMeal", "cxRecipe", "cxHaveClose", "cxMove", "cxMoveTo", "cxOrder", "cxOrdMove", "cxOrdSave", "cxOrdReset", "cxTick", "cxHave", "cxHaveRayon", "cxHaveUndo", "cxRmX", "cxRmR", "cxDay", "cxDaysAll", "cxDaysNone", "cxFinish", "cxFinishYes", "cxFinishNo", "cxFinishUndo", "cxClear", "cxClearYes", "cxClearNo"];
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || !CX_ACTS.includes(b.dataset.act) || !CK.ready) return;
  const a = b.dataset.act, v = b.dataset.v;
  let msg = "";
  switch (a) {
    case "cxAddFocus": { const target=document.getElementById("cxIn"); if(target){target.scrollIntoView({behavior:"smooth",block:"center"});target.focus();} return; }
    case "cxMealActions": {
      const w=b.dataset.w,k=b.dataset.v;
      openSheet(b.dataset.name, `<p class="muted small">${esc(b.dataset.meal)} · ${esc(b.dataset.n)} personnes</p><div class="cx-ultimate-menu"><button class="btn" data-act="cxActionRecipe" data-w="${esc(w)}" data-v="${esc(k)}">📖 Voir la recette complète</button><button class="btn" data-act="cxActionMeal" data-w="${esc(w)}" data-v="${esc(k)}">✏️ Modifier ce repas / son état</button><button class="btn" data-act="cxActionRecipe" data-w="${esc(w)}" data-v="${esc(k)}">🥕 Modifier les ingrédients ou créer une variante dans la recette</button><button class="btn" data-act="cxActionChange" data-w="${esc(w)}" data-v="${esc(k)}">🔄 Changer de repas</button><a class="btn" href="${CARNET_URL}">📚 Ouvrir le Carnet de menus</a></div>`);
      return;
    }
    case "cxActionRecipe": closeSheet(); rWeek=b.dataset.w; rRecipeSheet(v); return;
    case "cxActionMeal": closeSheet(); rWeek=b.dataset.w; mealSlotSheet(v); return;
    case "cxActionChange": closeSheet(); rWeek=b.dataset.w; rPick = { k: v, role: "main", q: "" }; rPickSheet(); return;
    case "cxFold": {
      cxFoldState[v] = cxFoldState[v] === false;
      cxFoldSave();
      const section = b.closest(".cx-fold"), body = section && section.querySelector(".cx-fold-body");
      if (section && body) { const opened = cxFoldState[v]; section.classList.toggle("is-open", opened); body.hidden = !opened; b.setAttribute("aria-expanded", String(opened)); }
      return;
    }
    case "cxHaveClose": cxHaveOpen = false; break;
    case "cxMealLock": { const on = cev(`(()=>{const s=((menu.weeks||{})[${JSON.stringify(b.dataset.w)}]||{})[${JSON.stringify(v)}];if(!s)return false;if(s.lock)delete s.lock;else s.lock=true;saveMenu();return !!s.lock;})()`);
      msg = on ? "Ajouté aux courses." : "Retiré des courses."; break; }
    case "cxMeal": rWeek = b.dataset.w; mealSlotSheet(v); return;
    case "cxRecipe": rWeek = b.dataset.w; rRecipeSheet(v); return;
    case "cxEmojiEdit": {
      const name = b.dataset.n;
      if (window.IngredientEmoji?.pick) {
        window.IngredientEmoji.pick(name, () => {
          // Actualise uniquement les icônes visibles, sans recalculer ni toucher aux courses.
          document.querySelectorAll('.cx-emoji-edit[data-n]').forEach(button => {
            if (window.IngredientEmoji.normalize(button.dataset.n) !== window.IngredientEmoji.normalize(name)) return;
            const icon = button.querySelector('.cx-ingredient-emoji');
            if (icon) icon.textContent = cxProductEmoji(name);
          });
        });
      }
      return;
    }
    case "cxMove": cxMoveSheet(b.dataset.n, b.dataset.r); return;
    case "cxMoveTo": cev(`(()=>{menu.rayonLearn=Object.assign({},menu.rayonLearn,{[${JSON.stringify(String(b.dataset.n).trim().toLowerCase())}]:${JSON.stringify(v)}});saveMenu();})()`); closeSheet(); msg = `Rangé dans « ${v} ».`; break;
    case "cxOrder": cxOrderDraft = cxOrder(cxData().order); cxOrderSheet(); return;
    case "cxOrdMove": { const i = +v, j = i + +b.dataset.d, l = cxOrderDraft; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; const sc = $("#sheet").scrollTop; cxOrderSheet(); $("#sheet").scrollTop = sc; return; }
    case "cxOrdSave": cev(`menu.rayonOrder=${JSON.stringify(cxOrderDraft)};saveMenu()`); closeSheet(); msg = "Ordre des rayons enregistré."; break;
    case "cxOrdReset": cev(`delete menu.rayonOrder;saveMenu()`); closeSheet(); msg = "Ordre habituel des rayons."; break;
    case "cxTick": cclick({ act: "storeTick", s: v }); break;
    case "cxHave": cclick({ act: "haveIt", k: v }); msg = "Retiré de la liste : vous l'avez déjà."; break;
    case "cxHaveRayon": cev(`(()=>{const ry=${JSON.stringify(v)},u=haveUntil();menu.have=Object.assign({},menu.have);
      shopping().filter(i=>((menu.rayonLearn||{})[norm(i.n)]||(RAYONS.includes(i.r)?i.r:"Divers"))===ry&&!menu.checked[i.key]).forEach(i=>{menu.have[i.key]=u;});saveMenu();})()`); msg = `Rayon « ${v} » retiré : vous avez déjà tout.`; break;
    case "cxHaveUndo": cclick({ act: "haveUndo", k: v }); break;
    case "cxRmX": cclick({ act: "rmX", i: v }); break;
    case "cxRmR": cclick({ act: "shopRm", id: v }); break;
    case "cxDay": cclick({ act: "shopDay", d: v }); break;
    case "cxDsTog": cxDaySel[b.dataset.k] = cxDaySel[b.dataset.k] === false; cxDaySheet(cxDayK, false); return;
    case "cxDsSee": rWeek = b.dataset.w; mealSlotSheet(b.dataset.k); return;
    case "cxDsApply": case "cxDsRemove": {
      const add = a === "cxDsApply";
      msg = cev(`(()=>{dayK=${JSON.stringify(cxDayK)};daySel=${JSON.stringify(cxDaySel)};const r=dayApply(${add});saveMenu();return r;})()`);
      closeSheet(); break; }
    case "cxDaysAll": cclick({ act: "shopDaysAll" }); break;
    case "cxDaysNone": cclick({ act: "shopDaysNone" }); break;
    case "cxFinish": cxFinishAsk = true; break;
    case "cxFinishNo": cxFinishAsk = false; break;
    case "cxFinishYes": cclick({ act: "finishYes" }); cxFinishAsk = false; cxUndo = true; msg = "Courses terminées."; break;
    case "cxFinishUndo": cclick({ act: "finishUndo" }); cxUndo = false; msg = "Courses remises comme avant."; break;
    case "cxClear": cxClearAsk = true; break;
    case "cxClearNo": cxClearAsk = false; break;
    case "cxClearYes": cclick({ act: "shopClearYes" }); cxClearAsk = false; msg = "Liste vidée."; break;
  }
  render(); if (msg) toast(msg);
});
document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-form=cxAdd]"); if (!f || !CK.ready) return;
  e.preventDefault();
  const t = (new FormData(f).get("name") || "").toString().trim(); if (!t) return;
  cev(`menu.extras=[...(menu.extras||[]),{t:${JSON.stringify(t)},done:false}];saveMenu()`);
  render(); const i = document.getElementById("cxIn"); if (i) i.focus();
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && view === "courses") carnetRefresh(); });
if (view === "courses") render();

// Ma famille: how full this phone's storage is, with a button to make room
const foyerViewMem = VIEWS.foyer;
VIEWS.foyer = function () {
  const mo = lsSize() * 2 / 1e6; // characters are stored on 2 bytes
  return foyerViewMem() + `<h2>Mémoire sur ce téléphone</h2><div class="card"><span>${mo.toFixed(1).replace(".", ",")} Mo utilisés par le Carnet et Maisonnée${mo > 8 ? " : c'est presque plein." : "."}</span>
    <div class="btns"><button class="btn" data-act="memFree">Libérer de la place</button></div>
    <p class="muted small" style="margin:6px 0 0">Retire seulement ce qui se retrouve tout seul (anciennes copies, photos d'origine gardées pour recadrer, recherches de photos). Si la mémoire est pleine, l'appli ne peut plus garder votre connexion.</p></div>`;
};
document.addEventListener("click", e => {
  if (!e.target.closest("[data-act=memFree]")) return;
  const before = lsSize(); freeSpace(true); render();
  toast(`${((before - lsSize()) * 2 / 1e6).toFixed(1).replace(".", ",")} Mo libérés.`);
});

/* ---------- aller directement à la liste (au magasin) ---------- */
// ↓ bouton du haut, « ↑ Menus » pour remonter, et retour direct sur la liste si on l'avait quittée en étant dedans
let cxInList = null, cxJumpPending = view === "courses" && LS.get("mz_cx_inlist", false), cxPrevView = null;
const cxGoList = smooth => { const h = $("#cxList"); if (h) h.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }); };
function cxUpBtn() {
  let b = $("#cxUp");
  const h = view === "courses" && $("#cxList"), inList = !!h && h.getBoundingClientRect().top < 120;
  if (!b) { b = document.createElement("button"); b.id = "cxUp"; b.type = "button"; b.className = "cx-up"; b.dataset.act = "cxUp"; b.textContent = "↑ Menus"; document.body.appendChild(b); }
  b.hidden = !inList;
  if (view === "courses" && h && !cxJumpPending && cxInList !== inList) { cxInList = inList; LS.set("mz_cx_inlist", inList); }
}
afterRender = (orig => function () {
  orig();
  if (view === "courses" && cxPrevView !== "courses") cxJumpPending = LS.get("mz_cx_inlist", false);
  if (view !== "courses") cxJumpPending = false;
  cxPrevView = view;
  if (cxJumpPending && $("#cxList")) { cxJumpPending = false; setTimeout(() => { cxGoList(false); cxUpBtn(); }, 30); }
  cxUpBtn();
})(afterRender);
window.addEventListener("scroll", () => cxUpBtn(), { passive: true });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act=cxJump],[data-act=cxUp]"); if (!b) return;
  if (b.dataset.act === "cxJump") cxGoList(true);
  else { window.scrollTo({ top: 0, behavior: "smooth" }); LS.set("mz_cx_inlist", false); }
});

// V9.4: the same Carnet engine detects completed meals; Maisonnée displays the dialog.
window.addEventListener("message", e => {
  if(e.origin!==location.origin||!CK.frame||e.source!==CK.frame.contentWindow)return;
  const data=e.data;
  if(!data||data.type!=="maisonnee-meals-shopping-complete"||!Array.isArray(data.ids))return;
  if(window.confirm(data.msg)){
    cev(`window.maisonneeConfirmShoppingMeals(${JSON.stringify(data.ids)})`);
    if(typeof softRender==="function")softRender();
  }
});

/* V9.6 : signal non bloquant des nouveaux articles, depuis le Carnet partagé. */
window.addEventListener('message', function(event){
  if(event.origin!==location.origin || !event.data || event.data.type!=='cm-courses-v96-new')return;
  const n=Number(event.data.count)||0;
  if(n>0 && view==='courses'){
    toast(n+' nouvel'+(n>1?'s':'')+' article'+(n>1?'s':'')+' ajouté'+(n>1?'s':'')+' aux courses');
    try{softRender();}catch(e){}
  }
});

/* V9.8 : navigation vers les articles reçus, sans toucher au moteur des courses. */
function mzFocusCourseItems() {
  if (view !== 'courses') return;
  const items = window.mzCourseTargets || [];
  if (!items.length) return;
  const rows = [...document.querySelectorAll('[data-mz-shop-name]')];
  const names = items.map(x => String(x.name || '').trim().toLocaleLowerCase('fr'));
  const matches = rows.filter(el => names.includes(el.getAttribute('data-mz-shop-name')));
  if (matches.length) {
    const first = matches[0];
    const fold = first.closest('.cx-fold');
    if (fold) {
      fold.classList.add('is-open');
      const body = fold.querySelector('.cx-fold-body'); if (body) body.hidden = false;
      const toggle = fold.querySelector('.cx-fold-toggle'); if (toggle) toggle.setAttribute('aria-expanded','true');
    }
    matches.forEach(el => { el.style.outline = '2px solid #38bdf8'; el.style.outlineOffset = '2px'; el.style.borderRadius = '12px'; setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 9000); });
    first.scrollIntoView({behavior:'smooth',block:'center'});
  } else {
    const h = document.querySelector('#cxList'); if (h) h.scrollIntoView({behavior:'smooth',block:'start'});
    if (typeof toast === 'function') toast('Article déjà acheté, retiré ou non visible dans cette liste.');
  }
  window.mzCourseTargets = [];
}

/* Réglages de notifications déplacés depuis la cloche vers Ma famille. */
const mzFoyerSettingsBase = VIEWS.foyer;
VIEWS.foyer = function () { return mzFoyerSettingsBase() + `<h2>Réglages</h2><div class="card"><strong>Notifications</strong><p class="muted small">Autorisations, rappels et notifications push de cet appareil.</p><button class="btn" data-act="pushSettings">Configurer les notifications</button></div>`; };
