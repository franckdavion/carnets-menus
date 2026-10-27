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
Object.defineProperty(window, "mzRepasActive", { get: () => screen === "app" && (view === "repas" || view === "courses") });

function carnetBoot() {
  carnetLive();
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
      if (view === "repas" || view === "courses") softRender();
      return;
    }
    if (Date.now() - t0 > 45000) {
      let why = "";
      try { why = cev("cloud.user ? (cloud.profile && cloud.profile.status !== 'active' ? 'pending' : 'empty') : 'nouser'"); } catch (_) { why = "load"; }
      CK.err = why === "pending" ? "Votre compte n'est pas encore validé dans le Carnet de menus."
        : why === "nouser" ? "Connectez-vous une fois au Carnet de menus avec votre compte."
        : why === "empty" ? "Le livre de recettes du Carnet est vide."
        : "Le Carnet de menus ne répond pas (réseau ?).";
      if (view === "repas" || view === "courses") softRender();
      return;
    }
    setTimeout(tick, 600);
  };
  f.addEventListener("load", () => { CK.ready = false; setTimeout(tick, 400); });
}
// the others' changes arrive in the hidden Carnet (checked every 15 s): Repas and Courses are redrawn when its data changed
let ckSig = "";
setInterval(() => {
  if (!CK.ready || screen !== "app" || (view !== "repas" && view !== "courses") || document.visibilityState !== "visible") return;
  let sg = ""; try { sg = cev("hashOf([menu.weeks,menu.checked,menu.extras,menu.shopDays,menu.have,menu.shopExtra,menu.bought])"); } catch (_) { return; }
  if (ckSig && sg !== ckSig) softRender();
  ckSig = sg;
}, 3000);
// the others' changes: refresh from the shared carnet when the page comes back
async function carnetRefresh() { if (!CK.ready) return; try { await cev("cloudSync()"); } catch (_) {} if (view === "repas" || view === "courses") softRender(); }
// Mise à jour en direct (Supabase Realtime) : quand le carnet commun change (table user_state, ligne du
// propriétaire du carnet), on relance le chargement existant carnetRefresh() pour Repas et Courses.
let ckLive = null, ckLiveT = null;
function carnetLive() {
  const owner = S.hh && S.hh.carnet_user;
  if (mode !== "cloud" || !sb || !owner || (ckLive && ckLive.owner === owner)) return;
  if (ckLive) sb.removeChannel(ckLive.ch);            // autre foyer : on quitte l'ancien canal
  const ch = sb.channel("carnet-" + owner)
    .on("postgres_changes", { event: "*", schema: "public", table: "user_state", filter: "user_id=eq." + owner }, () => {
      clearTimeout(ckLiveT);                          // plusieurs changements d'affilée : un seul rechargement
      ckLiveT = setTimeout(() => { if (view === "repas" || view === "courses") carnetRefresh(); }, 800);
    })
    .subscribe(status => { if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("Carnet en direct :", status); });
  ckLive = { owner, ch };
}
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
    left:s&&!recipes[s.id]&&s.left?String(s.left):"",note:s&&!recipes[s.id]&&s.note?String(s.note):"",ent:s&&s.entree&&recipes[s.entree]?recipes[s.entree].name:"",des:s&&s.dessert&&recipes[s.dessert]?recipes[s.dessert].name:""};}return o;})()`);
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
    <div class="r-legend" aria-label="Légende"><span><i class="r-st prop">Proposé</i>peut encore changer</span><span><i class="r-st kept">✓ Gardé</i>ne change plus</span><span><i class="r-st shop">🛒 Courses</i>dans la liste</span></div>
    ${open.length ? `<p class="muted small" style="margin:10px 2px 0">${open.length} repas pas encore dans les courses : touchez un repas pour le garder ou l'ajouter aux courses.</p>` : ""}`;
  for (let i = 0; i < 7; i++) {
    const day = addDays(rWeek, i), dn = RDAYS[i];
    out += `<section class="day-card ${day === d ? "today" : ""}"><header><h3>${dn}<span>${esc(fmtShort(day))}</span></h3></header>`;
    for (const m of ["midi", "soir"]) {
      const k = dn + "|" + m, x = sl[k];
      const pin = !x.s || !x.name || x.past ? "" : x.s.lock ? `<span class="keep shop" title="Dans la liste de courses">🛒 Courses</span>`
        : `<button type="button" class="keep ${x.s.keep ? "on" : ""}" data-act="rKeep" data-v="${esc(k)}" aria-pressed="${!!x.s.keep}">${x.s.keep ? "✓ Gardé" : "Garder"}</button>`;
      if ((x.left || x.note) && !x.name) {
        out += `<div class="slot ${x.past ? "past" : ""}" role="button" tabindex="0" data-act="rSlot" data-v="${esc(k)}"><b>${m === "midi" ? "Midi" : "Soir"}</b><span class="what">${x.note ? `✏️ ${esc(x.note)}` : `🥡 Restes<br><span class="muted small">${esc(x.left)}</span>`}</span><span class="keep left">${x.note ? "✏️" : "🥡"}</span></div>`;
        continue;
      }
      const dis = false; // une case passée vide se touche aussi : pour noter ce qu'on a mangé
      out += `<div class="slot ${x.past ? "past" : ""}" ${dis ? "" : `role="button" tabindex="0" data-act="rSlot" data-v="${esc(k)}"`}>
        <b>${m === "midi" ? "Midi" : "Soir"}</b>
        <span class="what ${x.name ? "" : "none"}">${x.name ? esc(x.name) + (x.kind ? ` <span class="muted small">· ${esc(x.kind)}</span>` : "") + (x.ent || x.des ? `<br><span class="muted small">${[x.ent && "entrée : " + esc(x.ent), x.des && "dessert : " + esc(x.des)].filter(Boolean).join(" · ")}</span>` : "")
          : x.skip ? "Pas de repas prévu" : x.past ? `<span class="muted small">— noter ce qu'on a mangé</span>` : "Choisir"}</span>
        ${pin}</div>`;
    }
    out += `</section>`;
  }
  out += `<p class="muted small" style="margin-top:14px">« Garder » : « Proposer ma semaine » ne change plus ce repas, sans l'envoyer aux courses. « 🛒 Courses » : ses ingrédients sont dans la liste de courses. Même semaine que dans le <a href="${CARNET_URL}" style="color:var(--accent);font-weight:700">Carnet de menus</a>.</p>`;
  return out;
};

/* ---------- sheets ---------- */
function rProposeSheet() {
  openSheet("Proposer ma semaine", `
    <p class="muted small" style="margin-top:6px">Le Carnet choisit selon vos réglages : favoris, nombre de repas végé et poisson, soirs légers, sans répéter les recettes des dernières semaines.</p>
    <form data-form="rPropose">
      <div class="field"><span class="label">1. Quels repas remplir ?</span>${chipsHtml("rfill", [["empty", "Seulement les cases vides"], ["all", "Tout refaire"]], "empty")}
        <p class="muted small" style="margin:6px 2px 0">« Tout refaire » ne touche jamais aux repas <b>✓ Gardés</b> ni à ceux déjà <b>🛒 dans les courses</b>.</p></div>
      <div class="field"><span class="label">2. Et la liste de courses ?</span>${chipsHtml("rmode", [["draft", "Je choisirai repas par repas"], ["lock", "Tout mettre dans les courses"]], "draft")}
        <p class="muted small" style="margin:6px 2px 0">« Repas par repas » : rien ne part aux courses maintenant ; vous touchez ensuite chaque repas pour l'ajouter.</p></div>
      <p class="muted small">Le choix en <b>bleu avec ✓</b> est celui qui sera appliqué.</p>
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
  if (s && !x.name && (x.left || x.note)) return rLeftShow(k, title, x);
  if (x.past && !x.name) return rNoteSheet(k);
  if (!s || !x.name) { rPick = { k, role: "main", q: "" }; return rPickSheet(title); }
  const ro = x.past;
  // the same meal redrawn after a tap (ingredient, people…): stay where you were in the window
  const dlg = $("#sheet"), same = dlg.open && ($("#sheetTitle") || {}).textContent === title, st = dlg.scrollTop, si = $("#sheetIn").scrollTop;
  openSheet(title, `
    <p style="margin:8px 0 2px"><strong style="font-size:19px">${esc(x.name)}</strong></p>
    <button class="linkbtn" data-act="rRecipe" data-v="${esc(k)}" style="margin:2px 0 4px">📖 Voir la recette</button>
    ${x.kind ? `<p class="muted small" style="margin:0">${esc(x.kind)}</p>` : ""}
    ${ro ? "" : `<div class="r-status ${s.lock ? "shop" : s.keep ? "kept" : "prop"}">${s.lock
        ? `<b>🛒 Dans la liste de courses</b><span>Ses ingrédients cochés sont dans la liste. « Proposer ma semaine » ne le changera plus.</span>`
        : s.keep ? `<b>✓ Gardé</b><span>« Proposer ma semaine » ne le changera plus. Il n'est <u>pas encore</u> dans les courses : bouton « Ajouter aux courses » en bas.</span>`
        : `<b>Proposé</b><span>Ce repas peut encore changer si vous relancez « Proposer ma semaine ». Il n'est pas dans les courses.</span>`}</div>
    <p class="group-h" style="margin-top:16px">Changer le plat</p>
    <div class="btns" style="margin-top:0">
      <button class="btn" data-act="rReroll" data-v="${esc(k)}">↻ Autre idée</button>
      <button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="main">Choisir une recette</button></div>
    ${s.lock ? "" : `<p class="group-h" style="margin-top:16px">Le garder ?</p><div class="btns" style="margin-top:0"><button class="btn ${s.keep ? "primary" : ""}" data-act="rKeep" data-v="${esc(k)}" aria-pressed="${!!s.keep}">${s.keep ? "✓ Gardé · toucher pour ne plus le garder" : "Garder ce choix"}</button></div>`}
    <div class="inline" style="justify-content:space-between;margin-top:16px"><span>Personnes</span><span class="inline"><button class="icon-btn" data-act="rServ" data-v="${esc(k)}" data-d="-1" aria-label="Une personne de moins">−</button><strong style="min-width:2ch;text-align:center">${s.n || 4}</strong><button class="icon-btn" data-act="rServ" data-v="${esc(k)}" data-d="1" aria-label="Une personne de plus">+</button></span></div>
    <div class="field"><span class="label">Entrée</span>${x.ent ? `<span>${esc(x.ent)}</span> <button class="linkbtn small" data-act="rSide" data-v="${esc(k)}" data-r="entree">Retirer</button>` : `<button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="entree">+ Ajouter une entrée</button>`}</div>
    <div class="field"><span class="label">Dessert</span>${x.des ? `<span>${esc(x.des)}</span> <button class="linkbtn small" data-act="rSide" data-v="${esc(k)}" data-r="dessert">Retirer</button>` : `<button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="dessert">+ Ajouter un dessert</button>`}</div>
    ${ingBlock(k, s)}
    <div class="btns"><button class="btn danger block" data-act="rRemove" data-v="${esc(k)}">Retirer ce repas</button></div>
    <div class="sheet-sticky btns"><button class="btn block" data-act="closeSheet">Fermer</button></div>`}`);
  if (same) { dlg.scrollTop = st; $("#sheetIn").scrollTop = si; }
}
// the ingredients of this meal (dish, starter, dessert) for its number of people, computed like the Carnet's shopping list
function slotIngredients(k) {
  return cj(`(()=>{const s=${slotJs(k)};if(!s)return[];const acc={},skip=Array.isArray(s.noIng)?s.noIng:[];
    const add=(rid,role)=>{const r=recipes[rid];if(!r)return;const n=(s.n||menu.people||4)*portionFactor(r,role),f=n/(r.serves||4);
      for(const i of r.ing||[]){if(!i.n)continue;const[q,u]=toBase(i.q,i.u),key=norm(i.n)+"|"+u;
        if(!acc[key])acc[key]={key,n:i.n.trim(),u,q:0};acc[key].q+=q*ingMult(r,i,f*(r.serves||4));}};
    add(s.id,"main");if(s.entree)add(s.entree,"entree");if(s.dessert)add(s.dessert,"dessert");
    return Object.values(acc).map(i=>({key:i.key,n:i.n,qt:fmt(i.q,i.u)||"",on:!skip.includes(i.key)}));})()`);
}
function ingBlock(k, s) {
  let list = [];
  try { list = slotIngredients(k); } catch (_) {}
  if (!list.length) return `<p class="muted small" style="margin-top:16px">Pas d'ingrédients notés pour cette recette.</p>`;
  const n = list.filter(i => i.on).length;
  return `<p class="group-h" style="margin-top:20px">Les courses</p><div class="field" style="margin-top:0"><span class="label">Ingrédients pour ${s.n || 4} pers. · ${n}/${list.length} cochés</span>
    <p class="muted small" style="margin:2px 0 6px">Décochez ce que vous avez déjà à la maison : seuls les ingrédients cochés partiront dans la liste.</p>
    <div class="card" style="padding:0">${list.map(i => `<button type="button" class="shop-item ing-item ${i.on ? "on" : ""}" data-act="rIng" data-v="${esc(k)}" data-k="${esc(i.key)}" aria-pressed="${i.on}"><span class="box">${I.tick}</span><span class="nm">${esc(i.n)}</span><span class="q">${esc(i.qt)}</span></button>`).join("")}</div></div>
    <div class="btns" style="margin-top:10px">${s.lock
      ? `<p class="small" style="margin:0 0 6px;width:100%">✓ Dans les courses : ${n} ingrédient${n > 1 ? "s" : ""}.</p><button class="btn" data-act="rLock" data-v="${esc(k)}">Retirer des courses</button>`
      : `<button class="btn primary block" data-act="rLock" data-v="${esc(k)}" ${n ? "" : "disabled"}>🛒 Ajouter aux courses (${n} ingrédient${n > 1 ? "s" : ""})</button>`}</div>`;
}
// 📖 the recipe of a meal, as in the Carnet: photo, time, ingredients for the meal's people, steps
function rRecipeSheet(k) {
  cev(`curWeek=${JSON.stringify(rWeek)}`);
  const R = cj(`(()=>{const s=${slotJs(k)};const r=s&&recipes[s.id];if(!r)return null;
    const n=s.n||menu.people||4,f=n/(r.serves||4);
    const ing=(r.ing||[]).filter(i=>i.n).map(i=>{const[q,u]=toBase(i.q,i.u);const qq=q*ingMult(r,i,f*(r.serves||4));return{n:i.n.trim(),qt:q?fmt(qq,u)||"":""};});
    let steps=[];try{steps=stepsFor(s.id).steps||[];}catch(e){steps=String(r.steps||"").split("\\n").map(x=>x.trim()).filter(Boolean);}
    steps=steps.map(x=>typeof x==="string"?x:(x&&(x.t||x.text))||"").filter(Boolean);
    return{id:s.id,name:r.name,ph:rPhotoSrc(s.id)||"",time:r.time||0,n,ing,steps,src:typeof r.source==="string"&&/^https?:/.test(r.source)?r.source:""};})()`);
  if (!R) return;
  const [dn, m] = k.split("|");
  openSheet(R.name, `
    ${R.ph ? `<img src="${esc(R.ph)}" alt="" style="width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:14px;margin-top:6px">` : ""}
    <p class="muted small" style="margin:8px 0 0">${esc(dn)} ${esc(m)}${R.time ? ` · ⏱ ${R.time} min` : ""} · pour ${R.n} pers.</p>
    ${R.ing.length ? `<p class="group-h">Ingrédients</p><div class="list">${R.ing.map(i => `<div class="cx-item"><span class="nm">${esc(i.n)}</span>${i.qt ? `<span class="q">${esc(i.qt)}</span>` : ""}</div>`).join("")}</div>` : ""}
    ${R.steps.length ? `<p class="group-h">Préparation</p><ol style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:8px;line-height:1.5">${R.steps.map(t => `<li>${esc(t)}</li>`).join("")}</ol>` : ""}
    ${R.src ? `<p class="small" style="margin-top:14px"><a href="${esc(R.src)}" target="_blank" rel="noopener" style="color:var(--accent)">Recette d'origine ↗</a></p>` : ""}
    <div class="btns" style="margin-top:16px"><button class="btn" data-act="rRecipeOpen" data-v="${esc(k)}" data-id="${esc(R.id)}">Ouvrir dans le Carnet</button></div>
    <div class="sheet-sticky btns"><button class="btn" data-act="rSlot" data-v="${esc(k)}">← Retour au repas</button><button class="btn primary" data-act="rChoose" data-v="${esc(k)}" data-r="main" style="flex:1">Changer de recette</button></div>`);
}
// leaving for the Carnet: remember where we are, to come back to the same week with the same meal open
function rRecipeOpen(k, id) {
  LS.set("mz_return", { view: "repas", week: rWeek, slot: k, at: Date.now() });
  location.assign(CARNET_URL + "?recette=" + encodeURIComponent(id));
}
(function rReturn() {
  const r = LS.get("mz_return", null); if (!r) return;
  LS.del("mz_return");
  if (Date.now() - r.at > 6 * 3600e3) return;
  view = "repas"; LS.set("mz_view", "repas"); if (r.week) rWeek = r.week;
  if (r.slot) CK.waiters.push(() => setTimeout(() => { if (view === "repas") mealSlotSheet(r.slot); }, 50));
})();
function rPickSheet(title) {
  const p = rPick, label = { main: "Choisir le plat", entree: "Choisir l'entrée", dessert: "Choisir le dessert" }[p.role];
  openSheet(title || label, `<p class="muted small" style="margin-top:6px">${label}</p>
    ${p.role === "main" ? `<div class="btns" style="margin-top:4px"><button class="btn primary" data-act="rReroll" data-v="${esc(p.k)}">✨ Laisser le Carnet choisir</button><button class="btn" data-act="rLeft" data-v="${esc(p.k)}">🥡 Restes</button><button class="btn" data-act="rNote" data-v="${esc(p.k)}">✏️ Noter un repas</button></div>` : ""}
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

// 🥡 Restes : un repas fait avec ce qui reste (plats des jours précédents, ou le frigo). Rien à acheter, jamais changé par « Proposer ma semaine ».
function rLeftRecent(k) {
  const [dn, m] = k.split("|"), day = addDays(rWeek, RDAYS.indexOf(dn)), list = [];
  // les repas des 3 jours précédents (et le midi du même jour pour un soir), du plus récent au plus ancien
  for (let i = 0; i <= 3; i++) {
    const d = addDays(day, -i), w = mondayOf(d), dname = RDAYS[(parse(d).getDay() + 6) % 7];
    for (const mm of ["soir", "midi"]) {
      if (i === 0 && (m === "midi" || mm === "soir")) continue;
      list.push({ w, sk: dname + "|" + mm, d, mm });
    }
  }
  const names = cj(`(()=>{const L=${JSON.stringify(list.map(x => [x.w, x.sk]))};return L.map(([w,k])=>{const s=((menu.weeks||{})[w]||{})[k];return s&&recipes[s.id]?recipes[s.id].name:"";});})()`);
  const seen = new Set();
  return list.map((x, i) => ({ ...x, name: names[i] })).filter(x => x.name && !seen.has(x.name) && seen.add(x.name));
}
function rLeftSheet(k) {
  const [dn, m] = k.split("|"), rec = rLeftRecent(k), day = addDays(rWeek, RDAYS.indexOf(dn));
  const when = x => { const n = diffDays(x.d, day); return (n === 0 ? "ce midi" : n === 1 ? (x.mm === "soir" ? "hier soir" : "hier midi") : `${RDAYS[(parse(x.d).getDay() + 6) % 7].toLowerCase()} ${x.mm}`); };
  openSheet(`🥡 Restes · ${dn} ${m}`, `<p class="muted small" style="margin-top:6px">Un repas fait avec ce qui reste : rien ne part aux courses, et « Proposer ma semaine » ne le changera pas.</p>
    ${rec.length ? `<p class="group-h">Les plats des derniers jours</p><div class="list">${rec.map(x => `<button class="row" data-act="rLeftPut" data-v="${esc(k)}" data-t="${esc(x.name)}"><span class="main"><span class="t">${esc(x.name)}</span><span class="m">${esc(when(x))}</span></span></button>`).join("")}</div>` : `<p class="muted small">Pas de plat noté ces 3 derniers jours.</p>`}
    <p class="group-h">Ou autre chose</p>
    <div class="inline"><input class="input" id="rLeftQ" maxlength="80" placeholder="ex. lasagnes de dimanche" autocomplete="off"><button class="btn primary" data-act="rLeftPut" data-v="${esc(k)}">OK</button></div>
    <div class="btns"><button class="btn" data-act="rLeftPut" data-v="${esc(k)}" data-t="du frigo">🥡 Restes du frigo</button></div>
    <div class="sheet-sticky btns"><button class="btn block" data-act="closeSheet">Fermer</button></div>`);
}
function rLeftShow(k, title, x) {
  openSheet(title, `<p style="margin:8px 0 2px"><strong style="font-size:19px">${x.note ? "✏️ " + esc(x.note) : "🥡 Restes"}</strong></p>${x.note ? `<p class="muted small" style="margin:0">Repas noté (sans recette)</p>` : `<p style="margin:0">${esc(x.left)}</p>`}
    ${x.past ? "" : `<div class="r-status kept"><b>Rien à acheter</b><span>« Proposer ma semaine » ne changera pas ce repas.</span></div>`}
    <div class="btns"><button class="btn" data-act="rNote" data-v="${esc(k)}">✏️ Noter autre chose</button><button class="btn" data-act="rLeft" data-v="${esc(k)}">🥡 Restes</button>${x.past ? "" : `<button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="main">Choisir une recette</button>`}</div>
    <div class="btns"><button class="btn danger block" data-act="rRemove" data-v="${esc(k)}">Retirer ce repas</button></div>
    <div class="sheet-sticky btns"><button class="btn block" data-act="closeSheet">Fermer</button></div>`);
}

// ✏️ Noter un repas : ce qu'on a mangé (ou va manger) sans créer de recette. Rien à acheter, jamais remplacé.
const R_NOTES = ["Pizza", "Restaurant", "Sandwichs", "Chez des amis", "Croque-monsieur", "Plateau-repas", "Pâtes vite faites", "Omelette", "Raclette", "Fast-food"];
function rNoteSheet(k) {
  const [dn, m] = k.split("|"), past = weekSlots(rWeek)[k].past;
  openSheet(`✏️ ${dn} ${m}`, `<p class="muted small" style="margin-top:6px">${past ? "Qu'avez-vous mangé ?" : "Notez simplement le repas."} Aucune recette n'est créée, rien ne part aux courses.</p>
    <p class="group-h">En un geste</p>
    <div class="chips">${R_NOTES.map(t => `<button type="button" class="chip" data-act="rNotePut" data-v="${esc(k)}" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    <p class="group-h">Ou écrivez-le</p>
    <div class="inline"><input class="input" id="rNoteQ" maxlength="80" placeholder="ex. crêpes avec les enfants" autocomplete="off"><button class="btn primary" data-act="rNotePut" data-v="${esc(k)}">OK</button></div>
    <div class="btns"><button class="btn" data-act="rLeft" data-v="${esc(k)}">🥡 C'était des restes</button></div>
    <div class="sheet-sticky btns"><button class="btn block" data-act="closeSheet">Fermer</button></div>`);
}

/* ---------- actions ---------- */
const slotJs = k => `W()[${JSON.stringify(k)}]`;
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b || !String(b.dataset.act).startsWith("r") || !CK.ready && b.dataset.act !== "rWeek") return;
  const v = b.dataset.v, act = b.dataset.act;
  if (!["rRecipe", "rRecipeOpen", "rWeek", "rPropose", "rPrefs", "rLockAll", "rIng", "rKeep", "rSlot", "rReroll", "rChoose", "rLock", "rServ", "rSide", "rRemove", "rPut", "rNum", "rLeft", "rLeftPut", "rNote", "rNotePut"].includes(act)) return;
  if (act !== "rWeek") cev(`curWeek=${JSON.stringify(rWeek)}`);
  switch (act) {
    case "rWeek": rWeek = addDays(rWeek, +v); render(); break;
    case "rPropose": rProposeSheet(); break;
    case "rPrefs": rPrefsSheet(); break;
    case "rSlot": mealSlotSheet(v); break;
    case "rRecipe": rRecipeSheet(v); break;
    case "rRecipeOpen": rRecipeOpen(v, b.dataset.id); return;
    case "rLockAll": {
      const n = cev(`(()=>{let n=0;for(const k of SLOT_ORDER){const s=W()[k];if(s&&recipes[s.id]&&!s.lock&&!isPast(k)){s.lock=true;n++;}}return n;})()`);
      shopIncludeWeek();
      carnetSave(`${n} repas validé${n > 1 ? "s" : ""} : les ingrédients partent dans les courses.`); break;
    }
    case "rReroll": {
      const id = cev(`(()=>{const k=${JSON.stringify(v)},s=W()[k];const nb=bestFor(k,s&&s.id?[s.id]:[]);if(!nb)return "";W()[k]=Object.assign({},s||{},{id:nb,n:s&&s.n?s.n:menu.people});if(W()[k].left||W()[k].note){delete W()[k].left;delete W()[k].note;delete W()[k].keep;}return nb;})()`);
      closeSheet(); if (!id) { toast("Pas d'autre recette possible avec ces réglages."); break; }
      carnetSave(); mealSlotSheet(v); break;
    }
    case "rChoose": rPick = { k: v, role: b.dataset.r, q: "" }; rPickSheet(); break;
    case "rPut": {
      const { k, role } = rPick;
      if (role === "main") cev(`(()=>{const k=${JSON.stringify(k)},s=W()[k];W()[k]=Object.assign({},s||{},{id:${JSON.stringify(v)},n:s&&s.n?s.n:menu.people});if(W()[k].left||W()[k].note){delete W()[k].left;delete W()[k].note;delete W()[k].keep;}})()`);
      else cev(`(()=>{const s=W()[${JSON.stringify(k)}];if(s)s[${JSON.stringify(role)}]=${JSON.stringify(v)};})()`);
      carnetSave(); mealSlotSheet(k); break;
    }
    case "rLock": { const on = cev(`(()=>{const s=${slotJs(v)};if(s)s.lock=!s.lock;return !!(s&&s.lock);})()`); shopIncludeWeek();
      carnetSave(on ? "Ajouté aux courses : les ingrédients sont dans la liste." : "Retiré des courses."); mealSlotSheet(v); break; }
    case "rKeep": { const on = cev(`(()=>{const s=${slotJs(v)};if(!s)return false;if(s.keep)delete s.keep;else s.keep=true;return !!s.keep;})()`);
      carnetSave(on ? "Gardé : « Proposer ma semaine » ne le changera plus." : "Ce repas pourra de nouveau changer.");
      if (b.closest("#sheet")) mealSlotSheet(v); break; }
    case "rIng": cev(`(()=>{const s=${slotJs(v)};if(!s)return;const k=${JSON.stringify(b.dataset.k)},l=Array.isArray(s.noIng)?s.noIng.slice():[];
      const i=l.indexOf(k);if(i>=0)l.splice(i,1);else l.push(k);if(l.length)s.noIng=l;else delete s.noIng;})()`); carnetSave(); mealSlotSheet(v); break;
    case "rServ": cev(`(()=>{const s=${slotJs(v)};if(s)s.n=Math.max(1,Math.min(20,(s.n||menu.people||4)+(${+b.dataset.d})));})()`); carnetSave(); mealSlotSheet(v); break;
    case "rSide": cev(`(()=>{const s=${slotJs(v)};if(s)delete s[${JSON.stringify(b.dataset.r)}];})()`); carnetSave(); mealSlotSheet(v); break;
    case "rRemove": cev(`delete ${slotJs(v)}`); closeSheet(); carnetSave("Repas retiré."); break;
    case "rLeft": rLeftSheet(v); break;
    case "rNote": rNoteSheet(v); break;
    case "rNotePut": {
      const inp = $("#rNoteQ"), t = String(b.dataset.t != null ? b.dataset.t : (inp && inp.value.trim()) || "").slice(0, 80);
      if (!t) { toast("Écrivez ce que vous avez mangé, ou touchez un choix."); break; }
      const was = cev(`(()=>{const k=${JSON.stringify(v)},s=W()[k]||{},was=!!s.lock;W()[k]=Object.assign({},s,{note:${JSON.stringify(t)},keep:true,n:s.n||menu.people});["id","lock","noIng","left"].forEach(f=>delete W()[k][f]);return was;})()`);
      if (was) shopIncludeWeek();
      closeSheet(); carnetSave(`✏️ ${t} : noté.`); break;
    }
    case "rLeftPut": {
      const f = b.closest("#sheet"), inp = f && f.querySelector("#rLeftQ");
      const t = String(b.dataset.t != null ? b.dataset.t : (inp && inp.value.trim()) || "du frigo").slice(0, 80);
      const was = cev(`(()=>{const k=${JSON.stringify(v)},s=W()[k]||{},was=!!s.lock;W()[k]=Object.assign({},s,{left:${JSON.stringify(t)},keep:true,n:s.n||menu.people});delete W()[k].id;delete W()[k].lock;delete W()[k].noIng;delete W()[k].note;return was;})()`);
      if (was) shopIncludeWeek();
      closeSheet(); carnetSave(`🥡 Restes (${t}) : rien à acheter pour ce repas.`); break;
    }
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
    const held = cev(`SLOT_ORDER.filter(k=>W()[k]&&recipes[W()[k].id]&&!isPast(k)&&(W()[k].lock||W()[k].keep)).length`);
    const kept = all && held && !lock ? ` (${held} repas gardés ou déjà dans les courses n'ont pas été changés)` : "";
    carnetSave(after === before && !all ? "Rien à remplir : toutes les cases sont prises." : lock ? `Semaine proposée : tous les repas sont dans les courses 🛒.` : `${n} repas proposés${kept}. Touchez un repas pour le garder ou l'ajouter aux courses.`);
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
