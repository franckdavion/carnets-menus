"use strict";
/* Maisonnée › Courses : la liste de courses du Carnet de menus, avec ses fonctions
   (jours couverts, rayons et quantités, « j'ai déjà », articles en plus, recettes hors menu,
   cocher au fil du magasin, courses terminées, vider la liste).
   Tout passe par le Carnet chargé en arrière-plan (repas.js) : mêmes calculs, mêmes données, même liste pour tout le foyer. */

let cxClearAsk = false, cxFinishAsk = false, cxUndo = false;
// run one of the Carnet's own buttons (same code as a tap in the Carnet)
function cclick(d) {
  const doc = CK.frame.contentDocument, b = doc.createElement("button");
  b.type = "button"; b.style.display = "none";
  for (const [k, v] of Object.entries(d)) b.dataset[k] = v;
  doc.body.appendChild(b); b.click(); b.remove();
}
function cxData() {
  return cj(`(()=>{const all=shopDates(),selK=selectedShopDates().map(x=>x.key);
    const days=all.map(x=>({key:x.key,lab:dayShort(x),on:selK.includes(x.key),full:x.locked===x.n,any:x.locked>0}));
    const items=shopping().map(i=>({key:i.key,n:i.n,qt:fmt(i.q,i.u)||"",r:RAYONS.includes(i.r)?i.r:"Divers",from:i.from||[],on:!!menu.checked[i.key],miss:(menu.missed||{})[i.key]||""}));
    const extras=(menu.extras||[]).map((x,ix)=>({ix,t:x.t,on:!!x.done,miss:x.missed||""}));
    const xr=Object.entries(menu.shopExtra||{}).filter(([id])=>recipes[id]).map(([id,n])=>({id,n,name:recipes[id].name,dup:validatedUses(id).length>0}));
    const have=shopping(true).filter(isHave).map(i=>({key:i.key,n:i.n,qt:fmt(i.q,i.u)||""})).sort((a,b)=>a.n.localeCompare(b.n,"fr"));
    return {days,items,extras,xr,have,rayons:RAYONS};})()`);
}
const cxShort = d => { try { return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); } catch (_) { return d; } };

const shopViewBase = shopView;
VIEWS.courses = function () {
  if (mode !== "cloud" || !isLinked()) return shopViewBase();
  carnetBoot();
  if (CK.err) return `<div class="card warn"><strong>Liste du Carnet indisponible.</strong><span class="small">${esc(CK.err)}</span></div>` + shopViewBase();
  if (!CK.ready) return `<div class="empty"><strong>Chargement de la liste du Carnet…</strong>Quelques secondes la première fois.</div>`;
  let D; try { D = cxData(); } catch (e) { return shopViewBase(); }
  const tick = i => `<span class="box">${I.tick}</span>`;
  const row = (i, ref) => `<div class="cx-item ${i.on ? "done" : ""}">
      <button type="button" class="cx-tick" data-act="cxTick" data-v="${esc(ref)}" aria-pressed="${i.on}" aria-label="${i.on ? "Retirer du caddie" : "Dans le caddie"} : ${esc(i.n || i.t)}">${tick(i)}</button>
      <span class="nm">${esc(i.n || i.t)}${i.miss && !i.on ? `<span class="cx-miss">Pas trouvé le ${esc(cxShort(i.miss))}</span>` : ""}${i.from && i.from.length ? `<span class="cx-from">Pour : ${esc(i.from.join(" · "))}</span>` : ""}</span>
      ${i.qt ? `<span class="q">${esc(i.qt)}</span>` : ""}
      ${i.on ? "" : ref.startsWith("k:") ? `<button type="button" class="cx-have" data-act="cxHave" data-v="${esc(i.key)}">J'ai déjà</button>` : `<button type="button" class="cx-x" data-act="cxRmX" data-v="${i.ix}" aria-label="Retirer ${esc(i.t)}">✕</button>`}
    </div>`;
  const todo = D.items.filter(i => !i.on), todoX = D.extras.filter(x => !x.on);
  const done = [...D.items.filter(i => i.on).map(i => row(i, "k:" + i.key)), ...D.extras.filter(x => x.on).map(x => row(x, "x:" + x.ix))];
  const total = D.items.length + D.extras.length;
  const sel = D.days.filter(x => x.on);
  let out = `<div class="card linkcard"><span>La même liste que le Carnet de menus, pour tout le foyer.</span><a class="linkbtn" href="${CARNET_URL}">Ouvrir le Carnet</a></div>`;
  out += `<p class="group-h">Courses pour</p>${D.days.length ? `<div class="chips">${D.days.map(x => `<button type="button" class="chip" data-act="cxDay" data-v="${esc(x.key)}" aria-pressed="${x.on}">${x.on ? "✓ " : ""}${esc(x.lab)} ${x.full ? "🔒" : x.any ? "◐" : "🔓"}</button>`).join("")}</div>
    <div class="btns" style="margin-top:8px"><button class="linkbtn small" data-act="cxDaysAll">Tous les jours</button><button class="linkbtn small" data-act="cxDaysNone">Aucun</button></div>`
    : `<p class="muted small">Aucun repas prévu dans les 3 prochaines semaines.</p>`}
    <p class="muted small" style="margin:8px 2px 0">${sel.length ? `${sel.length} jour${sel.length > 1 ? "s" : ""} · ` : ""}${total} article${total > 1 ? "s" : ""}${done.length ? ` · ${done.length} dans le caddie` : ""}. 🔒 repas envoyés aux courses · 🔓 pas encore (dans Repas).</p>
    <form data-form="cxAdd" class="inline" style="margin-top:14px" autocomplete="off">
      <input class="input" id="cxIn" name="name" aria-label="Article à ajouter" placeholder="Ajouter : lait, piles, pain…" enterkeyhint="done">
      <button class="btn ink" type="submit">Ajouter</button></form>`;
  if (cxUndo) out += `<div class="card" style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px"><span>Courses terminées.</span><button class="btn" data-act="cxFinishUndo">Annuler</button></div>`;
  if (D.xr.length) out += `<p class="group-h">Recettes ajoutées hors menu</p><div class="list">${D.xr.map(x => `<div class="cx-item"><span class="nm">${esc(x.name)}${x.dup ? `<span class="cx-from">déjà au menu validé : pas compté deux fois</span>` : ""}</span><span class="q">${x.n} pers.</span><button type="button" class="cx-x" data-act="cxRmR" data-v="${esc(x.id)}" aria-label="Retirer ${esc(x.name)}">✕</button></div>`).join("")}</div>`;
  if (!total) out += `<div class="empty" style="margin-top:16px"><strong>La liste est vide.</strong>${sel.length ? "Envoyez des repas de ces jours aux courses depuis Repas, ou ajoutez des articles ci-dessus." : "Choisissez ci-dessus les jours pour lesquels vous faites les courses."}</div>`;
  for (const ry of D.rayons) {
    const l = todo.filter(i => i.r === ry).sort((a, b) => a.n.localeCompare(b.n, "fr"));
    if (l.length) out += `<div class="cx-rayon"><p class="group-h">${esc(ry)}</p><button type="button" class="linkbtn small" data-act="cxHaveRayon" data-v="${esc(ry)}">J'ai tout ce rayon</button></div><div class="list">${l.map(i => row(i, "k:" + i.key)).join("")}</div>`;
  }
  if (todoX.length) out += `<p class="group-h">En plus</p><div class="list">${todoX.map(x => row(x, "x:" + x.ix)).join("")}</div>`;
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
  if (D.have.length) out += `<details class="card" style="margin-top:16px"><summary class="muted">Déjà à la maison (${D.have.length})</summary><div class="list" style="margin-top:8px">${D.have.map(i => `<div class="cx-item"><span class="nm muted">${esc(i.n)}</span><span class="q">${esc(i.qt)}</span><button type="button" class="cx-have" data-act="cxHaveUndo" data-v="${esc(i.key)}">Remettre</button></div>`).join("")}</div></details>`;
  if (total || D.xr.length) out += cxClearAsk
    ? `<div class="card warn" style="margin-top:16px"><span>Vider toute la liste ? Les repas restent au menu, à renvoyer aux courses.</span><div class="btns"><button class="btn danger" data-act="cxClearYes">Oui, vider</button><button class="btn" data-act="cxClearNo">Non</button></div></div>`
    : `<div class="btns" style="margin-top:16px"><button class="btn" data-act="cxClear">🗑️ Vider la liste</button></div>`;
  return out;
};

const CX_ACTS = ["cxTick", "cxHave", "cxHaveRayon", "cxHaveUndo", "cxRmX", "cxRmR", "cxDay", "cxDaysAll", "cxDaysNone", "cxFinish", "cxFinishYes", "cxFinishNo", "cxFinishUndo", "cxClear", "cxClearYes", "cxClearNo"];
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || !CX_ACTS.includes(b.dataset.act) || !CK.ready) return;
  const a = b.dataset.act, v = b.dataset.v;
  let msg = "";
  switch (a) {
    case "cxTick": cclick({ act: "storeTick", s: v }); break;
    case "cxHave": cclick({ act: "haveIt", k: v }); msg = "Retiré de la liste : vous l'avez déjà."; break;
    case "cxHaveRayon": cev(`(()=>{const ry=${JSON.stringify(v)},u=haveUntil();menu.have=Object.assign({},menu.have);
      shopping().filter(i=>(RAYONS.includes(i.r)?i.r:"Divers")===ry&&!menu.checked[i.key]).forEach(i=>{menu.have[i.key]=u;});saveMenu();})()`); msg = `Rayon « ${v} » retiré : vous avez déjà tout.`; break;
    case "cxHaveUndo": cclick({ act: "haveUndo", k: v }); break;
    case "cxRmX": cclick({ act: "rmX", i: v }); break;
    case "cxRmR": cclick({ act: "shopRm", id: v }); break;
    case "cxDay": cclick({ act: "shopDay", d: v }); break;
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
