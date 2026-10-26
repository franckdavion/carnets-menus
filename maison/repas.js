"use strict";
/* Maisonnée › Repas : proposer, voir et modifier la semaine de repas avec le moteur du Carnet de menus.
   Le Carnet (page ../) est chargé en arrière-plan dans un cadre invisible : ses règles, ses recettes,
   ses réglages et le carnet commun du foyer sont utilisés tels quels. Toute modification passe par lui,
   il l'enregistre dans le carnet commun et le pont (pont.js) la reporte dans Maisonnée (repas et courses). */

const CK = { frame: null, ready: false, err: "", busy: false, waiters: [] };
const cev = code => CK.frame.contentWindow.eval(code);          // lire / appeler dans le Carnet
const cj = code => JSON.parse(cev(`JSON.stringify(${code})`));  // copie simple de ses données
let rWeek = mondayOf(today()), rPick = null;                     // semaine affichée, recherche de recette
// read by the hidden Carnet: it only syncs on its own while this page is open
Object.defineProperty(window, "mzRepasActive", { get: () => screen === "app" && view === "repas" });

function carnetBoot() {
  if (CK.frame || mode !== "cloud") return;
  const f = document.createElement("iframe");
  f.src = CARNET_URL + "?arriere-plan=maisonnee";
  f.title = "Carnet de menus (arrière-plan)";
  f.setAttribute("aria-hidden", "true"); f.tabIndex = -1;
  f.style.cssText = "position:absolute;left:-9999px;top:0;width:390px;height:700px;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(f); CK.frame = f;
  const t0 = Date.now();
  const tick = async () => {
    let ok = false;
    try { ok = cev("typeof planWeek==='function' && typeof cloudOn==='function' && cloudOn() && !!recipes && Object.keys(recipes).length>0"); } catch (_) {}
    if (ok) {
      try { await cev("cloudSync()"); } catch (_) {}
      CK.ready = true; CK.waiters.splice(0).forEach(w => w());
      if (view === "repas") softRender();
      return;
    }
    if (Date.now() - t0 > 45000) {
      let why = "";
      try { why = cev("cloud.user ? (cloud.profile && cloud.profile.status !== 'active' ? 'pending' : 'empty') : 'nouser'"); } catch (_) { why = "load"; }
      CK.err = why === "pending" ? "Votre compte n'est pas encore validé dans le Carnet de menus."
        : why === "nouser" ? "Connectez-vous une fois au Carnet de menus avec votre compte."
        : why === "empty" ? "Le livre de recettes du Carnet est vide."
        : "Le Carnet de menus ne répond pas (réseau ?).";
      if (view === "repas") softRender();
      return;
    }
    setTimeout(tick, 600);
  };
  f.addEventListener("load", () => { CK.ready = false; setTimeout(tick, 400); });
}
// the others' changes: refresh from the shared carnet when the page comes back
async function carnetRefresh() { if (!CK.ready) return; try { await cev("cloudSync()"); } catch (_) {} if (view === "repas") softRender(); }
function carnetSave(msg) { cev("saveMenu()"); render(); if (msg) toast(msg); }
// validated meals go to the shopping list: their days are added to the Carnet's « courses pour » days
function shopIncludeWeek() {
  cev(`(()=>{const all=shopDates(),cur=Array.isArray(menu.shopDays)?menu.shopDays:defaultShopKeys(all);
    const add=all.filter(x=>x.key>=curWeek&&x.key<=ymd(addDays(parseYmd(curWeek),6))&&x.locked>0).map(x=>x.key);
    menu.shopDays=[...new Set([...cur,...add])].sort();})()`);
}

/* ---------- reading the carnet ---------- */
const RDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
function weekSlots(wk) {
  cev(`curWeek=${JSON.stringify(wk)}`);
  return cj(`(()=>{const w=(menu.weeks||{})[curWeek]||{},o={};for(const k of SLOT_ORDER){const s=w[k];o[k]={s:s||null,past:isPast(k),skip:skipped(k),
    name:s&&recipes[s.id]?recipes[s.id].name:"",kind:s&&recipes[s.id]?KIND_LABEL[kindOf(recipes[s.id])]||"":"",
    ent:s&&s.entree&&recipes[s.entree]?recipes[s.entree].name:"",des:s&&s.dessert&&recipes[s.dessert]?recipes[s.dessert].name:""};}return o;})()`);
}

VIEWS.repas = function () {
  if (mode !== "cloud") return `<div class="empty"><strong>Disponible avec un vrai foyer.</strong>La semaine de repas utilise le Carnet de menus du foyer.</div>`;
  carnetBoot();
  if (CK.err) return `<div class="empty"><strong>Repas indisponibles pour l'instant.</strong>${esc(CK.err)}<div class="btns"><a class="btn" href="${CARNET_URL}">Ouvrir le Carnet</a></div></div>`;
  if (!CK.ready) return `<div class="empty"><strong>Chargement du Carnet de menus…</strong>Recettes et réglages du foyer, quelques secondes la première fois.</div>`;
  let sl; try { sl = weekSlots(rWeek); } catch (_) { CK.ready = false; return `<div class="empty"><strong>Chargement du Carnet de menus…</strong></div>`; }
  const d = today(), cur = mondayOf(d);
  const filled = Object.values(sl).filter(x => x.s && x.name && !x.past), open = filled.filter(x => !x.s.lock);
  let out = `<div class="weeknav" style="margin-top:0"><button class="icon-btn plain" data-act="rWeek" data-v="-7" aria-label="Semaine précédente">${I.left}</button>
      <strong>${rWeek === cur ? "Cette semaine" : rWeek === addDays(cur, 7) ? "Semaine prochaine" : "Semaine du " + esc(fmtShort(rWeek))}</strong>
      <button class="icon-btn plain" data-act="rWeek" data-v="7" aria-label="Semaine suivante">${I.right}</button></div>
    <div class="btns" style="margin-top:6px"><button class="btn primary" data-act="rPropose" style="flex:1">✨ Proposer ma semaine</button><button class="btn" data-act="rPrefs" aria-label="Réglages de la proposition">Réglages</button></div>
    ${open.length ? `<div class="card warn" style="margin-top:12px"><strong>${open.length} repas en brouillon</strong><span class="small">Pas encore dans les courses.</span>
      <div class="btns" style="margin-top:8px"><button class="btn primary" data-act="rLockAll">Valider et envoyer aux courses</button></div></div>` : ""}`;
  for (let i = 0; i < 7; i++) {
    const day = addDays(rWeek, i), dn = RDAYS[i];
    out += `<section class="day-card ${day === d ? "today" : ""}"><header><h3>${dn}<span>${esc(fmtShort(day))}</span></h3></header>`;
    for (const m of ["midi", "soir"]) {
      const k = dn + "|" + m, x = sl[k];
      const lockIc = x.s && x.name ? (x.s.lock ? "🔒" : "✎") : "";
      out += `<button class="slot ${x.past ? "past" : ""}" data-act="rSlot" data-v="${esc(k)}" ${x.past && !x.name ? "disabled" : ""}>
        <b>${m === "midi" ? "Midi" : "Soir"}</b>
        <span class="what ${x.name ? "" : "none"}">${x.name ? esc(x.name) + (x.kind ? ` <span class="muted small">· ${esc(x.kind)}</span>` : "") + (x.ent || x.des ? `<br><span class="muted small">${[x.ent && "entrée : " + esc(x.ent), x.des && "dessert : " + esc(x.des)].filter(Boolean).join(" · ")}</span>` : "")
          : x.skip ? "Pas de repas prévu" : x.past ? "—" : "Choisir"}</span>
        <span class="small" title="${x.s && x.s.lock ? "Validé" : "Brouillon"}">${lockIc}</span></button>`;
    }
    out += `</section>`;
  }
  out += `<p class="muted small" style="margin-top:14px">🔒 validé, dans les courses · ✎ brouillon. Même semaine que dans le <a href="${CARNET_URL}" style="color:var(--accent);font-weight:700">Carnet de menus</a>.</p>`;
  return out;
};

/* ---------- sheets ---------- */
function rProposeSheet() {
  openSheet("Proposer ma semaine", `
    <p class="muted small" style="margin-top:6px">Le Carnet choisit selon vos réglages : favoris, nombre de repas végé et poisson, soirs légers, sans répéter les recettes des dernières semaines.</p>
    <form data-form="rPropose">
      <div class="field"><span class="label">Que remplir</span>${chipsHtml("rfill", [["empty", "Seulement les cases vides"], ["all", "Tout refaire (sauf les repas validés)"]], "empty")}</div>
      <div class="field"><span class="label">Ensuite</span>${chipsHtml("rmode", [["draft", "Brouillon, à valider plus tard"], ["lock", "Valider directement"]], "draft")}</div>
      <p class="muted small">Validé = verrouillé et envoyé dans la liste de courses.</p>
      <div class="sheet-sticky btns"><button class="btn primary block" type="submit">Proposer</button></div>
    </form>`);
}
function rPrefsSheet() {
  const p = cj("menu.prefs"), styles = cj("DAY_STYLES");
  openSheet("Réglages de la proposition", `
    <form data-form="rPrefs">
      <div class="inline" style="justify-content:space-between;margin-top:10px"><span>Repas végétariens par semaine</span><span class="inline"><button type="button" class="icon-btn" data-act="rNum" data-v="veg:-1">−</button><strong id="rp-veg" style="min-width:2ch;text-align:center">${p.veg}</strong><button type="button" class="icon-btn" data-act="rNum" data-v="veg:1">+</button></span></div>
      <div class="inline" style="justify-content:space-between;margin-top:10px"><span>Repas poisson par semaine</span><span class="inline"><button type="button" class="icon-btn" data-act="rNum" data-v="fish:-1">−</button><strong id="rp-fish" style="min-width:2ch;text-align:center">${p.fish}</strong><button type="button" class="icon-btn" data-act="rNum" data-v="fish:1">+</button></span></div>
      <label class="switch"><span><strong>Soirs plus légers</strong></span><input type="checkbox" name="lightEve" ${p.lightEve ? "checked" : ""}></label>
      <div class="field"><span class="label">Pas de repas le midi</span>${chipsHtml("rskip", RDAYS.map(d => [d, d.slice(0, 3) + "."]), p.skip || [], true)}</div>
      <div class="field"><span class="label">Style de chaque jour</span>${RDAYS.map(d => `<label class="inline" style="justify-content:space-between;margin-top:6px"><span class="small">${d}</span><select class="input" name="st-${d}" style="max-width:170px">${styles.map(([v, l]) => `<option value="${v}" ${((p.days || {})[d] || "") === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`).join("")}</div>
      <label class="field"><span class="label">À éviter (séparés par des virgules)</span><input class="input" name="avoid" value="${esc(p.avoid || "")}" placeholder="Ex. champignons, céleri"></label>
      <p class="muted small">Ces réglages sont ceux du Carnet : ils valent pour tout le foyer.</p>
      <div class="sheet-sticky btns"><button class="btn primary block" type="submit">Enregistrer</button></div>
    </form>`, { veg: p.veg, fish: p.fish });
}
function mealSlotSheet(k) {
  cev(`curWeek=${JSON.stringify(rWeek)}`);
  const x = weekSlots(rWeek)[k], s = x.s, [dn, m] = k.split("|"), day = addDays(rWeek, RDAYS.indexOf(dn));
  const title = `${dn} ${m} · ${fmtShort(day)}`;
  if (!s || !x.name) { rPick = { k, role: "main", q: "" }; return rPickSheet(title); }
  const ro = x.past;
  openSheet(title, `
    <p style="margin:8px 0 2px"><strong style="font-size:19px">${esc(x.name)}</strong></p>
    <p class="muted small" style="margin:0">${x.kind ? esc(x.kind) + " · " : ""}${s.lock ? "🔒 validé, dans les courses" : "✎ brouillon"}</p>
    ${ro ? "" : `<div class="btns">
      <button class="btn" data-act="rReroll" data-v="${esc(k)}">↻ Autre idée</button>
      <button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="main">Choisir une recette</button>
      <button class="btn ${s.lock ? "" : "primary"}" data-act="rLock" data-v="${esc(k)}">${s.lock ? "Déverrouiller" : "Valider"}</button></div>
    <div class="inline" style="justify-content:space-between;margin-top:16px"><span>Personnes</span><span class="inline"><button class="icon-btn" data-act="rServ" data-v="${esc(k)}" data-d="-1" aria-label="Une personne de moins">−</button><strong style="min-width:2ch;text-align:center">${s.n || 4}</strong><button class="icon-btn" data-act="rServ" data-v="${esc(k)}" data-d="1" aria-label="Une personne de plus">+</button></span></div>
    <div class="field"><span class="label">Entrée</span>${x.ent ? `<span>${esc(x.ent)}</span> <button class="linkbtn small" data-act="rSide" data-v="${esc(k)}" data-r="entree">Retirer</button>` : `<button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="entree">+ Ajouter une entrée</button>`}</div>
    <div class="field"><span class="label">Dessert</span>${x.des ? `<span>${esc(x.des)}</span> <button class="linkbtn small" data-act="rSide" data-v="${esc(k)}" data-r="dessert">Retirer</button>` : `<button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="dessert">+ Ajouter un dessert</button>`}</div>
    <div class="sheet-sticky btns"><button class="btn danger block" data-act="rRemove" data-v="${esc(k)}">Retirer ce repas</button></div>`}`);
}
function rPickSheet(title) {
  const p = rPick, label = { main: "Choisir le plat", entree: "Choisir l'entrée", dessert: "Choisir le dessert" }[p.role];
  openSheet(title || label, `<p class="muted small" style="margin-top:6px">${label}</p>
    ${p.role === "main" ? `<div class="btns" style="margin-top:4px"><button class="btn primary" data-act="rReroll" data-v="${esc(p.k)}">✨ Laisser le Carnet choisir</button></div>` : ""}
    <input class="input" id="rPickQ" type="search" placeholder="Chercher une recette" autocomplete="off" style="margin-top:12px">
    <div class="list" id="rPickList" style="margin-top:10px">${rPickList("")}</div>`);
}
function rPickList(q) {
  const role = rPick.role;
  const list = cj(`(()=>{const q=${JSON.stringify(q.trim().toLowerCase())},role=${JSON.stringify(role)};
    return Object.entries(recipes).filter(([id,r])=>{const c=catsOf(r);
      const ok=role==="main"?canMain(r):role==="entree"?(c.includes("Entrée")||c.includes("Soupe")):c.includes("Dessert");
      return ok&&!r.linkOnly&&(!q||(r.name||"").toLowerCase().includes(q));})
    .sort((a,b)=>(b[1].fav?1:0)-(a[1].fav?1:0)||String(a[1].name).localeCompare(String(b[1].name),"fr")).slice(0,80)
    .map(([id,r])=>({id,n:r.name,f:!!r.fav,t:r.time||0,c:r.cat||""}));})()`);
  return list.map(r => `<button class="row" data-act="rPut" data-v="${esc(r.id)}"><span class="main"><span class="t">${r.f ? "★ " : ""}${esc(r.n)}</span><span class="m">${esc(r.c)}${r.t ? " · " + r.t + " min" : ""}</span></span></button>`).join("") || `<p class="muted" style="padding:14px">Aucune recette ne correspond.</p>`;
}

/* ---------- actions ---------- */
const slotJs = k => `W()[${JSON.stringify(k)}]`;
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b || !String(b.dataset.act).startsWith("r") || !CK.ready && b.dataset.act !== "rWeek") return;
  const v = b.dataset.v, act = b.dataset.act;
  if (!["rWeek", "rPropose", "rPrefs", "rLockAll", "rSlot", "rReroll", "rChoose", "rLock", "rServ", "rSide", "rRemove", "rPut", "rNum"].includes(act)) return;
  if (act !== "rWeek") cev(`curWeek=${JSON.stringify(rWeek)}`);
  switch (act) {
    case "rWeek": rWeek = addDays(rWeek, +v); render(); break;
    case "rPropose": rProposeSheet(); break;
    case "rPrefs": rPrefsSheet(); break;
    case "rSlot": mealSlotSheet(v); break;
    case "rLockAll": {
      const n = cev(`(()=>{let n=0;for(const k of SLOT_ORDER){const s=W()[k];if(s&&recipes[s.id]&&!s.lock&&!isPast(k)){s.lock=true;n++;}}return n;})()`);
      shopIncludeWeek();
      carnetSave(`${n} repas validé${n > 1 ? "s" : ""} : les ingrédients partent dans les courses.`); break;
    }
    case "rReroll": {
      const id = cev(`(()=>{const k=${JSON.stringify(v)},s=W()[k];const nb=bestFor(k,s&&s.id?[s.id]:[]);if(!nb)return "";W()[k]=Object.assign({},s||{},{id:nb,n:s&&s.n?s.n:menu.people});return nb;})()`);
      closeSheet(); if (!id) { toast("Pas d'autre recette possible avec ces réglages."); break; }
      carnetSave(); mealSlotSheet(v); break;
    }
    case "rChoose": rPick = { k: v, role: b.dataset.r, q: "" }; rPickSheet(); break;
    case "rPut": {
      const { k, role } = rPick;
      if (role === "main") cev(`(()=>{const k=${JSON.stringify(k)},s=W()[k];W()[k]=Object.assign({},s||{},{id:${JSON.stringify(v)},n:s&&s.n?s.n:menu.people});})()`);
      else cev(`(()=>{const s=W()[${JSON.stringify(k)}];if(s)s[${JSON.stringify(role)}]=${JSON.stringify(v)};})()`);
      carnetSave(); mealSlotSheet(k); break;
    }
    case "rLock": cev(`(()=>{const s=${slotJs(v)};if(s)s.lock=!s.lock;})()`); shopIncludeWeek(); carnetSave(); mealSlotSheet(v); break;
    case "rServ": cev(`(()=>{const s=${slotJs(v)};if(s)s.n=Math.max(1,Math.min(20,(s.n||menu.people||4)+(${+b.dataset.d})));})()`); carnetSave(); mealSlotSheet(v); break;
    case "rSide": cev(`(()=>{const s=${slotJs(v)};if(s)delete s[${JSON.stringify(b.dataset.r)}];})()`); carnetSave(); mealSlotSheet(v); break;
    case "rRemove": cev(`delete ${slotJs(v)}`); closeSheet(); carnetSave("Repas retiré."); break;
    case "rNum": {
      const [k, d] = v.split(":"), el = $("#rp-" + k); if (!el || !sheetCtx) break;
      sheetCtx[k] = Math.max(0, Math.min(14, (sheetCtx[k] || 0) + +d)); el.textContent = sheetCtx[k]; break;
    }
  }
});
document.addEventListener("input", e => { if (e.target.id === "rPickQ" && rPick) $("#rPickList").innerHTML = rPickList(e.target.value); });
document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-form]"); if (!f || !["rPropose", "rPrefs"].includes(f.dataset.form)) return;
  e.preventDefault();
  cev(`curWeek=${JSON.stringify(rWeek)}`);
  if (f.dataset.form === "rPropose") {
    const all = chipVal(f, "rfill") === "all", lock = chipVal(f, "rmode") === "lock";
    const before = cev(`SLOT_ORDER.filter(k=>W()[k]&&recipes[W()[k].id]).length`);
    cev(`planWeek(${all})`);
    let n = cev(`SLOT_ORDER.filter(k=>W()[k]&&recipes[W()[k].id]&&!isPast(k)&&!W()[k].lock).length`);
    if (lock) { cev(`(()=>{for(const k of SLOT_ORDER){const s=W()[k];if(s&&recipes[s.id]&&!isPast(k))s.lock=true;}})()`); shopIncludeWeek(); }
    const after = cev(`SLOT_ORDER.filter(k=>W()[k]&&recipes[W()[k].id]).length`);
    closeSheet();
    carnetSave(after === before && !all ? "Rien à remplir : toutes les cases sont prises." : lock ? `Semaine proposée et validée : les ingrédients partent dans les courses.` : `${n} repas proposés en brouillon. Touchez un repas pour le changer.`);
  } else {
    const fd = Object.fromEntries(new FormData(f).entries()), days = {};
    for (const d of RDAYS) if (fd["st-" + d]) days[d] = fd["st-" + d];
    const p = { veg: sheetCtx.veg, fish: sheetCtx.fish, lightEve: !!fd.lightEve, skip: chipVals(f, "rskip"), avoid: (fd.avoid || "").trim(), days };
    cev(`Object.assign(menu.prefs, ${JSON.stringify(p)})`);
    closeSheet(); carnetSave("Réglages enregistrés.");
  }
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && view === "repas") carnetRefresh(); });
// start loading the carnet early, so Repas opens quickly
setTimeout(() => { if (mode === "cloud" && screen === "app") carnetBoot(); }, 2500);
if (view === "repas") render();
