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
    const from=curWeek,to=ymd(addDays(parseYmd(curWeek),6));
    const week=all.filter(x=>x.key>=from&&x.key<=to);
    const drop=new Set(week.filter(x=>!(x.locked>0)).map(x=>x.key));
    const add=week.filter(x=>x.locked>0).map(x=>x.key);
    menu.shopDays=[...new Set([...cur.filter(k=>!drop.has(k)),...add])].sort();})()`);
}
const MEAL_LOCK_STATES = ["En courses", "Courses faites", "Terminé"];
const MEAL_HINT = {
  "Proposé": "La proposition de semaine peut remplacer ce repas.",
  "Gardé": "Ce repas reste au menu. Rien n'est à acheter.",
  "En courses": "Les ingrédients cochés sont dans la liste. Le repas passe à Acheté quand chacun est coché ou marqué « J'ai déjà ».",
  "Courses faites": "Acheté : ces ingrédients sont comptés comme achetés. Un ingrédient partagé avec un autre repas reste à acheter pour celui-là.",
  "Terminé": "Le repas est cuisiné. La liste de courses ne change pas toute seule."
};
const MEAL_CHOICES = ["Proposé", "Gardé", "En courses", "Terminé"];
function mealHadPurchases(k) {
  return !!cev(`(()=>{
    const s=${slotJs(k)};if(!s)return false;
    const ids=[s.id,s.entree,s.dessert].filter(Boolean);
    return ids.some(id=>{const r=recipes[id];return (r&&r.ing||[]).some(i=>{
      if(!i.n)return false;
      const base=recipeIngredientBase(r,i,s.n||4,"main");
      const key=norm(i.n)+"|"+base[1];
      const b=menu.bought&&menu.bought[key];
      return !!(menu.checked&&menu.checked[key])||!!(b&&b.until>=ymd(new Date())&&Number(b.q)>0);
    });});
  })()`);
}
function holdCartLines(k, items) {
  const payload = (items || []).filter(i => i.on).map(i => ({ key: i.key, n: i.n, qt: i.qt || "" }));
  return cev(`(()=>{
    const slot=${JSON.stringify(k)};
    const items=${JSON.stringify(payload)};
    const present=new Set((shopping(true)||[]).map(i=>i.key));
    if(!Array.isArray(menu.extras))menu.extras=[];
    let left=0,kept=0;
    for(const i of items){
      const base=String(i.key).split("#")[0];
      const stays=[...present].some(p=>p===i.key||p===base||String(p).startsWith(base+"|nouvelle-preparation:"));
      const checked=!!(menu.checked&&(menu.checked[i.key]||menu.checked[base]));
      if(stays){kept++;continue;}
      if(checked){
        if(!menu.extras.some(x=>x.heldSlot===slot&&x.heldKey===i.key))
          menu.extras.push({t:i.qt?i.n+" · "+i.qt:i.n,done:true,heldSlot:slot,heldKey:i.key});
        kept++;
      }else left++;
    }
    return {left,kept};
  })()`) || { left: 0, kept: 0 };
}
function releaseHeldLines(k) {
  cev(`menu.extras=(menu.extras||[]).filter(x=>x.heldSlot!==${JSON.stringify(k)})`);
}
async function writeMealStatus(k, state) {
  if (!MEAL_STATES.includes(state)) return null;
  const cur = mealState(cj(`W()[${JSON.stringify(k)}]`));
  if (!cur || cur === state) return null;
  if (state === "Courses faites") {
    cev(`(()=>{const s=${slotJs(k)};if(s&&typeof cmMarkBought==="function")cmMarkBought(s);})()`);
    shopIncludeWeek();
    return "Déjà acheté pour ce repas : ses ingrédients sont comptés comme achetés.";
  }
  if (state === "Terminé") {
    let mode = "keep";
    if (cur === "En courses") {
      mode = await mzAskLeaveCart();
      if (!mode) return null;
    }
    cev(`(()=>{const s=${slotJs(k)};if(s&&typeof cmFinishMeal==="function")cmFinishMeal(s,${JSON.stringify(mode)});})()`);
    shopIncludeWeek();
    return mode === "drop"
      ? "Repas terminé. Ce qui n'était pas coché sort de la liste."
      : "Repas terminé. La liste de courses reste telle quelle.";
  }
  const locking = state === "En courses";
  const wasLock = !!cj(`!!(${slotJs(k)}&&${slotJs(k)}.lock)`);
  let restart = false;
  if (locking && !wasLock) {
    if (mealHadPurchases(k)) {
      const choice = await mzV9ChoiceCourses();
      if (choice === null) return null;
      restart = choice === true || choice === "restart";
    }
    releaseHeldLines(k);
  }
  const leaving = !locking && wasLock ? slotIngredients(k) : null;
  cev(`(()=>{const s=${slotJs(k)};if(!s)return;
    if(typeof cmSetMealStatus==="function")cmSetMealStatus(s,${JSON.stringify(state)});
    else{s.mealState=${JSON.stringify(state)};s.keep=${state !== "Proposé"};s.lock=${locking};delete s.shopBought;}
    if(${locking && !wasLock}){
      if(${restart})s.freshShopKey="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
      else delete s.freshShopKey;
    }
    if(!${locking})delete s.freshShopKey;
  })()`);
  let msg = "État : " + state;
  if (leaving) {
    const n = holdCartLines(k, leaving);
    const bits = [];
    if (n.left) bits.push(n.left + " ingrédient" + (n.left > 1 ? "s" : "") + " pas encore acheté" + (n.left > 1 ? "s" : "") + " " + (n.left > 1 ? "sortent" : "sort") + " de la liste");
    if (n.kept) bits.push(n.kept + " déjà coché" + (n.kept > 1 ? "s" : "") + " ou partagé" + (n.kept > 1 ? "s" : "") + " " + (n.kept > 1 ? "restent" : "reste"));
    msg = bits.length ? "Retiré des courses : " + bits.join(". ") + "." : "Retiré des courses.";
  } else if (state === "En courses") msg = restart ? "Nouvelle préparation : ingrédients à acheter." : "Ajouté aux courses : les achats existants sont conservés.";
  else if (state === "Gardé") msg = "Gardé : la proposition de semaine ne le changera plus.";
  else if (state === "Proposé") msg = "Ce repas pourra de nouveau changer.";
  shopIncludeWeek();
  return msg;
}

/* ---------- reading the carnet ---------- */
const MEAL_STATES = ["Proposé", "Gardé", "En courses", "Courses faites", "Terminé"];
// Coefficient de portions pour l’interface Maisonnée.
// Le Carnet possède sa propre fonction dans son iframe : elle n’est pas visible
// depuis cette page. Sans cette définition, ouvrir une fiche repas déclenche
// ReferenceError: mealPortionFactor is not defined (Repas et Courses).
function mealPortionFactor(slot) {
  const v = Number(slot && slot.portionMultiplier);
  return Number.isFinite(v) && v >= 0.25 && v <= 4 ? v : 1;
}
function mealState(s) { return s && MEAL_STATES.includes(s.mealState) ? s.mealState : s && s.lock ? "En courses" : s && s.keep ? "Gardé" : "Proposé"; }
function mealBadgeClass(st) { return ({"Proposé":"proposed","Gardé":"saved","En courses":"shopping","Courses faites":"purchased","Terminé":"completed"})[st] || "proposed"; }
function mealBadgeLabel(st) { return ({"Proposé":"👨‍🍳 Proposé","Gardé":"✓ Gardé","En courses":"🛒 En courses","Courses faites":"🧺 Acheté","Terminé":"⚑ Terminé"})[st] || "Proposé"; }
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
    <div class="r-intro"><span aria-hidden="true">🗓️</span><div><strong>Préparez vos repas de la semaine</strong><small>Proposez des repas, confirmez vos choix et suivez les courses.</small></div></div>
    <div class="btns" style="margin-top:10px"><button class="btn primary" data-act="rPropose" style="flex:1">✨ Proposer ma semaine</button><button class="btn" data-act="rPrefs" aria-label="Réglages de la proposition">⚙️ Réglages</button></div>
    <details class="r-legend-fold"><summary>États des repas</summary>
    <div class="r-legend" aria-label="Légende des états des repas">
      ${MEAL_STATES.map(st=>`<span class="r-legend-item"><i class="r-meal-badge ${mealBadgeClass(st)}">${mealBadgeLabel(st)}</i><small>${({"Proposé":"À valider","Gardé":"Confirmé","En courses":"À acheter","Courses faites":"Coché au caddie","Terminé":"Cuisiné"})[st]}</small></span>`).join("")}
    </div></details>`;
  for (let i = 0; i < 7; i++) {
    const day = addDays(rWeek, i), dn = RDAYS[i];
    out += `<section class="day-card ${day === d ? "today" : ""}"><header><h3>${dn}<span>${esc(fmtShort(day))}</span></h3></header>`;
    for (const m of ["midi", "soir"]) {
      const k = dn + "|" + m, x = sl[k];
      const state = mealState(x.s);
      const pin = !x.s || !x.name ? "" : `<span class="keep r-meal-badge ${mealBadgeClass(state)}" aria-label="État : ${esc(state)}">${mealBadgeLabel(state)}</span>`;
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
// Depuis l'accueil : le plat affiché (ce midi, ou ce soir après 15 h) ouvre sa fiche.
function openHomeMeal(day, slot) {
  if (!day || (slot !== "midi" && slot !== "soir")) return;
  if (mode !== "cloud") { mealSheet(day, slot); return; }
  const open = () => {
    rWeek = mondayOf(day);
    mealSlotSheet(RDAYS[isoDay(day) - 1] + "|" + slot);
  };
  carnetBoot();
  if (CK.ready) { open(); return; }
  if (CK.err) { toast(CK.err); return; }
  toast("Ouverture du repas…");
  CK.waiters.push(() => { if (CK.ready) open(); });
}
function homeQty(q, u) {
  if (q == null || q === "") return "";
  const n = String(q).replace(".", ",");
  return !u || u === "pièce" ? n : n + " " + u;
}
function homeRecipeFromBook(id) {
  const list = S.recipes || (typeof DEMO_RECIPES !== "undefined" ? DEMO_RECIPES : []);
  const r = list.find(x => x && (x.legacy_id === id || x.id === id || ("c-" + x.id) === id));
  if (!r) return null;
  const steps = Array.isArray(r.steps) ? r.steps : String(r.steps || "").split("\n").map(x => x.trim()).filter(Boolean);
  return {
    id: r.legacy_id || r.id,
    name: r.name || "Recette",
    ph: r.image || "",
    time: r.time || 0,
    serves: r.serves || 4,
    fav: !!r.fav,
    ing: (r.ing || []).filter(i => i && i.n).map(i => ({ n: String(i.n).trim(), qt: homeQty(i.q, i.u) })),
    steps
  };
}
function homeRecipeFromCarnet(id) {
  if (!CK.ready || !id) return null;
  return cj(`(()=>{
    const want=${JSON.stringify(id)};
    const key=recipes[want]?want:(recipes["c-"+want]?"c-"+want:Object.keys(recipes).find(k=>recipes[k]&&(k===want||recipes[k].legacy===want))||"");
    const r=recipes[key]; if(!r) return null;
    let steps=[]; try{steps=stepsFor(key).steps||[];}catch(e){}
    if(!steps.length) steps=String(r.steps||"").split("\\n").map(x=>x.trim()).filter(Boolean);
    steps=steps.map(x=>typeof x==="string"?x:(x&&(x.t||x.text))||"").filter(Boolean);
    const ing=(r.ing||[]).filter(i=>i&&i.n).map(i=>{const [q,u]=toBase(i.q,i.u); return {n:i.n.trim(),qt:q?fmt(q,u)||"":""};});
    return {id:key,name:r.name||"Recette",ph:(typeof rPhotoSrc==="function"?rPhotoSrc(key):"")||"",time:r.time||0,serves:r.serves||4,fav:!!r.fav,ing,steps};
  })()`);
}
function homeRecipeSheet(R) {
  if (!R) { toast("Cette recette n'est pas disponible."); return; }
  const ing = R.ing.length
    ? `<div class="list">${R.ing.map(i => `<div class="cx-item"><span class="nm">${typeof IngredientEmoji !== "undefined" ? IngredientEmoji.html(i.n) : ""} ${esc(i.n)}</span><span class="q">${esc(i.qt)}</span></div>`).join("")}</div>`
    : `<p class="muted">Aucun ingrédient renseigné.</p>`;
  const steps = R.steps.length
    ? `<ol style="padding-left:22px;display:flex;flex-direction:column;gap:10px;line-height:1.5">${R.steps.map(t => `<li>${esc(t)}</li>`).join("")}</ol>`
    : `<p class="muted">Aucune étape notée.</p>`;
  openSheet(R.name, `
    <section class="meal-compact meal-redesign">
      <div class="meal-top-card">
        <div class="meal-hero">
          ${R.ph ? `<img class="meal-photo" src="${esc(R.ph)}" alt="Photo du plat">` : `<div class="meal-photo meal-no-photo" aria-label="Aucune photo">🍽️</div>`}
          <div class="meal-hero-text"><strong class="meal-name">${esc(R.name)}</strong>
            <div class="meal-hero-actions"><button type="button" class="btn meal-favorite" data-act="rHomeFav" data-v="${esc(R.id)}" aria-pressed="${!!R.fav}">${R.fav ? "★ Favori" : "☆ Favori"}</button><button class="btn meal-cook-launch" data-act="rHomeCook" data-v="${esc(R.id)}">👨‍🍳 Cuisiner pas à pas</button></div>
          </div>
        </div>
        <p class="muted small meal-status-hint">${R.time ? "⏱ " + R.time + " min · " : ""}${R.serves} personnes</p>
      </div>
      <div class="meal-section-card"><h3>🛒 Ingrédients</h3>${ing}</div>
      <div class="meal-section-card"><h3>📝 Étapes</h3>${steps}</div>
    </section>
    <div class="sheet-sticky btns"><button class="btn block" data-act="closeSheet">Fermer</button></div>`);
}
function openHomeRecipe(id) {
  if (!id) return;
  const show = () => homeRecipeSheet(homeRecipeFromCarnet(id) || homeRecipeFromBook(id));
  if (mode !== "cloud") { homeRecipeSheet(homeRecipeFromBook(id)); return; }
  carnetBoot();
  if (CK.ready) { show(); return; }
  if (CK.err) { show(); return; }
  toast("Ouverture de la recette…");
  CK.waiters.push(() => { if (CK.ready) show(); });
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
  const favorite = !!cj(`!!(recipes[${JSON.stringify(s.id)}]&&recipes[${JSON.stringify(s.id)}].fav)`);
  const photo = cj(`rPhotoSrc(${JSON.stringify(s.id)})||""`);
  openSheet(title, `
    <section class="meal-compact meal-redesign">
      <div class="meal-top-card">
        <div class="meal-hero">
          ${photo ? `<img class="meal-photo" src="${esc(photo)}" alt="Photo du plat" loading="lazy" data-act="rPhotoEdit" data-v="${esc(k)}" style="cursor:pointer" title="Changer la photo">` : `<div class="meal-photo meal-no-photo" aria-label="Aucune photo disponible" data-act="rPhotoEdit" data-v="${esc(k)}" style="cursor:pointer">🍽️</div>`}
          <div class="meal-hero-text"><strong class="meal-name">${esc(x.name)}</strong><button class="btn meal-rename-compact" data-act="rRename" data-v="${esc(k)}" aria-label="Renommer la recette" title="Renommer">✏️<span> Renommer</span></button>
            <div class="meal-hero-actions"><button type="button" class="btn meal-favorite" data-act="rFav" data-v="${esc(k)}" aria-pressed="${favorite}">${favorite ? "★ Favori" : "☆ Favori"}</button><button class="btn meal-cook-launch" data-act="rCook" data-v="${esc(k)}">👨‍🍳 Cuisiner pas à pas</button></div>
          </div>
        </div>
        <div class="meal-status" role="group" aria-label="État du repas">${MEAL_CHOICES.map(st => `<button type="button" class="meal-status-btn${mealState(s)===st ? " is-on" : ""}" data-act="rState" data-v="${esc(k)}" data-state="${esc(st)}" aria-pressed="${mealState(s)===st}">${esc(st)}</button>`).join("")}</div>
        ${mealState(s)==="Courses faites" ? `<p class="meal-bought">Acheté : ses ingrédients sont comptés comme achetés. Un ingrédient partagé reste pour l'autre repas.</p>` : ""}
        ${mealState(s)==="En courses" ? `<button type="button" class="btn meal-bought-btn" data-act="rBought" data-v="${esc(k)}">Déjà acheté pour ce repas</button>` : ""}
        <p class="muted small meal-status-hint">${MEAL_HINT[mealState(s)] || ""}</p>
      </div>
      <div class="meal-section-card meal-ingredients-card"><h3>🛒 Ingrédients et courses</h3><div class="meal-ingredient-controls"><div class="meal-persons"><span>👥 Personnes</span><div class="meal-stepper"><button class="icon-btn" data-act="rServ" data-v="${esc(k)}" data-d="-1" aria-label="Une personne de moins">−</button><strong>${s.n || 4}</strong><button class="icon-btn" data-act="rServ" data-v="${esc(k)}" data-d="1" aria-label="Une personne de plus">+</button></div></div>
          <label class="meal-persons meal-portions"><span>🍽️ Portions</span><select class="input meal-portion-select" data-meal-portion="${esc(k)}" aria-label="Choisir les portions"><option value="1" ${mealPortionFactor(s)===1?'selected':''}>Normale ×1</option><option value="1.5" ${mealPortionFactor(s)===1.5?'selected':''}>Généreuse ×1,5</option><option value="custom" ${![1,1.5].includes(mealPortionFactor(s))?'selected':''}>${![1,1.5].includes(mealPortionFactor(s))?'Personnalisée '+String(mealPortionFactor(s)).replace('.',',')+'×':'Personnalisée…'}</option></select></label></div>
        ${ingBlock(k, s)}
      </div>
      <div class="meal-section-card"><h3>🍴 Composer mon repas</h3><div class="meal-compose-grid">
        <div class="meal-compose-item meal-compose-main"><b>🍽️ Plat principal</b><span>${esc(x.name)}</span></div>
        <div class="meal-compose-item meal-compose-side"><b>🥗 Entrée</b>${x.ent ? `<span>${esc(x.ent)}</span><button class="linkbtn small" data-act="rSide" data-v="${esc(k)}" data-r="entree">Retirer</button>` : `<button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="entree">+ Ajouter une entrée</button>`}</div>
        <div class="meal-compose-item meal-compose-side"><b>🍰 Dessert</b>${x.des ? `<span>${esc(x.des)}</span><button class="linkbtn small" data-act="rSide" data-v="${esc(k)}" data-r="dessert">Retirer</button>` : `<button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="dessert">+ Ajouter un dessert</button>`}</div>
      </div></div>
    </section>
    <div class="btns"><button class="btn danger block" data-act="rRemoveChoose" data-v="${esc(k)}">Retirer ce repas</button></div>
    <div class="sheet-sticky btns"><button class="btn block" data-act="closeSheet">Fermer</button></div>`);
  if (same) { dlg.scrollTop = st; $("#sheetIn").scrollTop = si; }
}
// Fenêtre de retrait persistante : revenir à la fiche seulement avec « Fermer ».
let rRemoveContext = null;
function rRemoveChooseSheet(k) {
  if (!rRemoveContext || rRemoveContext.k !== k) rRemoveContext = {k, week:rWeek, all:false};
  const x = weekSlots(rWeek)[k], slot = x && x.s;
  const hasMain = !!(slot && x.name), hasEntree = !!(slot && slot.entree), hasDessert = !!(slot && slot.dessert);
  const empty = !hasMain && !hasEntree && !hasDessert;
  const buttons = empty ? `<p class="muted" role="status">Aucun élément restant dans ce repas.</p>` : `
    ${hasMain ? `<button type="button" class="btn block" data-act="rRemovePart" data-v="${esc(k)}" data-r="main">🍽️ Plat principal · ${esc(x.name)}</button>` : ""}
    ${hasEntree ? `<button type="button" class="btn block" data-act="rRemovePart" data-v="${esc(k)}" data-r="entree">🥗 Entrée · ${esc(x.ent || "Entrée")}</button>` : ""}
    ${hasDessert ? `<button type="button" class="btn block" data-act="rRemovePart" data-v="${esc(k)}" data-r="dessert">🍰 Dessert · ${esc(x.des || "Dessert")}</button>` : ""}
    <button type="button" class="btn danger block" data-act="rRemovePart" data-v="${esc(k)}" data-r="all">🗑️ Tout le repas</button>`;
  openSheet("Retirer un élément de ce repas", `<div class="meal-remove-choice">
    <p class="muted">Que souhaitez-vous retirer ?</p>
    ${slot && slot.lock ? `<p class="muted small">Ce repas est dans les courses. Le retirer enlève les ingrédients qui ne sont pas encore cochés. Ce qui est déjà dans le caddie, ou partagé avec un autre repas, reste.</p>` : ""}
    ${buttons}
  </div>`);
}
// Le bouton Fermer de l'en-tête est le seul chemin de retour après un retrait.
document.addEventListener("click", e => {
  const b=e.target.closest('[data-act="closeSheet"]');
  if(!b || !rRemoveContext || !document.querySelector('#sheetTitle')?.textContent.includes('Retirer un élément de ce repas')) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const ctx=rRemoveContext; rRemoveContext=null;
  rWeek=ctx.week;
  if(ctx.all){closeSheet();render();return;}
  const x=weekSlots(rWeek)[ctx.k];
  if(x && x.s && x.name) mealSlotSheet(ctx.k);
  else if(x && x.s){rPick={k:ctx.k,role:"main",q:""};rPickSheet();}
  else {closeSheet();render();}
},true);
// the ingredients of this meal (dish, starter, dessert) for its number of people, computed like the Carnet's shopping list
function slotIngredients(k) {
  return cj(`(()=>{const s=${slotJs(k)};if(!s)return[];const acc={},skip=Array.isArray(s.noIng)?s.noIng:[];
    const add=(rid,role)=>{const r=recipes[rid];if(!r)return;const n=(s.n||menu.people||4)*mealPortionFactor(s),f=n/(r.serves||4);
      for(const i of r.ing||[]){if(!i.n)continue;const[q,u]=toBase(i.q,i.u),key=norm(i.n)+"|"+u;
        if(!acc[key])acc[key]={key,n:i.n.trim(),u,q:0};acc[key].q+=q*ingMult(r,i,f*(r.serves||4));}};
    add(s.id,"main");if(s.entree)add(s.entree,"entree");if(s.dessert)add(s.dessert,"dessert");
    if(Array.isArray(s.ingCustom))return s.ingCustom.map(i=>({key:i.key,n:i.n,qt:typeof customIngredientQuantity==="function"?mealCustomQuantity(i.qt,s):i.qt||"",on:!skip.includes(i.key)}));
    return Object.values(acc).map(i=>({key:i.key,n:i.n,qt:fmt(i.q,i.u)||"",on:!skip.includes(i.key)}));})()`);
}
function rFriendlyQty(qt){
  const t=String(qt||"");
  const m=t.match(/^\s*(\d+(?:[.,]\d+)?)\s*(tranches?|pièces?|unités?|oeufs?|œufs?)\s*$/i);
  if(!m)return t;
  return String(Math.max(0,Math.round(Number(m[1].replace(",",".")))))+" "+m[2];
}
function rEditIngredientsSheet(k) {
  const items=slotIngredients(k);
  const meta=cj(`(()=>{const s=${slotJs(k)},r=s&&recipes[s.id];return {people:Number(s&&s.n)||Number(menu.people)||4,base:Number(r&&r.serves)||4,name:r&&r.name||"Recette",shared:!!(r&&r.shared)};})()`);
  openSheet("Modifier les ingrédients · "+meta.name, `<p class="muted small">Une seule liste pour la recette et le repas. <strong>Recette de référence : ${meta.base} pers. · Repas prévu : ${meta.people} pers.</strong> Les valeurs ci-dessous concernent ${meta.people} personnes.</p>
    <form id="rIngEditForm" data-k="${esc(k)}"><div id="rIngEditRows">${items.map((i,j)=>`<div class="field" style="display:flex;gap:8px;align-items:center;margin:8px 0"><span style="font-size:23px">${IngredientEmoji.html(i.n)}</span><input class="input" name="name${j}" aria-label="Ingrédient" value="${esc(i.n)}" style="flex:2;min-width:0"><input class="input" name="qty${j}" aria-label="Quantité" value="${esc(rFriendlyQty(i.qt))}" style="flex:1;min-width:0"><button type="button" class="btn" data-act="rIngDelete" aria-label="Supprimer">×</button></div>`).join("")}</div>
    <div class="btns"><button type="button" class="btn" data-act="rIngAdd">+ Ajouter un ingrédient</button></div>
    <p class="group-h">Enregistrer les modifications</p>
    <div class="r-save-options" style="display:grid;gap:8px">
      <label class="card" style="padding:12px"><input type="radio" name="saveMode" value="meal" checked> <strong>Enregistrer pour ce repas</strong><br><small>La recette originale reste inchangée.</small></label>
      <label class="card" style="padding:12px"><input type="radio" name="saveMode" value="original" ${meta.shared?'disabled':''}> <strong>Enregistrer sur la recette existante</strong><br><small>Met à jour la recette pour tous ses futurs usages.</small></label>
      <label class="card" style="padding:12px"><input type="radio" name="saveMode" value="variant"> <strong>Créer une nouvelle variante</strong><br><small>Conserve la recette originale.</small></label>
    </div>
    <div class="sheet-sticky btns"><button type="button" class="btn" data-act="rRecipeTab" data-v="${esc(k)}" data-tab="ing">Annuler</button><button type="submit" class="btn primary">✓ Enregistrer</button></div></form>`);
}

function ingBlock(k, s) {
  let list = [];
  try { list = slotIngredients(k); } catch (_) {}
  const n = list.filter(i => i.on).length;
  const st = mealState(s);
  const onList = MEAL_LOCK_STATES.includes(st);
  const rows = list.length ? `<div class="card" style="padding:0">${list.map(i => `<div class="ing-emoji-row"><button type="button" class="shop-item ing-item ${i.on ? "on" : ""}" data-act="rIng" data-v="${esc(k)}" data-k="${esc(i.key)}" aria-pressed="${i.on}"><span class="box">${I.tick}</span></button><button type="button" class="ing-emoji-change" data-ing-emoji-name="${esc(i.n)}" title="Changer l’emoji de ${esc(i.n)}">${IngredientEmoji.html(i.n)}</button><span class="ing-emoji-label ${i.on ? 'on' : ''}">${esc(i.n)}</span><span class="ing-emoji-qty">${esc(i.qt)}</span></div>`).join("")}</div>` : `<p class="muted small">Pas d'ingrédients notés pour cette recette.</p>`;
  return `<p class="group-h" style="margin-top:20px">Les courses</p><div class="field" style="margin-top:0"><span class="label">${list.length ? `Ingrédients pour ${s.n || 4} pers. · ${n}/${list.length} cochés` : "Ingrédients"}</span>
    <p class="muted small" style="margin:2px 0 6px">${onList ? "Décochez ce que vous avez déjà : seuls les ingrédients cochés restent dans la liste." : "Décochez ce que vous avez déjà. Ils partiront dans la liste quand le repas passera « En courses »."}</p>
    ${rows}</div>
    <div class="meal-quick-add">
      <p class="group-h">Ajouter à ce repas</p>
      <div class="meal-quick-row"><input class="input" name="qn" maxlength="80" placeholder="Ingrédient" autocomplete="off" aria-label="Ingrédient à ajouter"><input class="input" name="qq" maxlength="40" placeholder="Quantité" autocomplete="off" aria-label="Quantité"><button type="button" class="btn primary" data-act="rQuickIng" data-v="${esc(k)}">Ajouter</button></div>
      <p class="muted small">${onList ? "La ligne arrive tout de suite dans la liste de courses." : "La ligne rejoint ce repas. Elle partira aux courses avec lui."}</p>
    </div>
    <details class="meal-options meal-options-inline"><summary aria-label="Options pratiques" title="Options pratiques">⚙️ Options</summary><div class="meal-actions">
        <button class="btn" data-act="rRecipe" data-v="${esc(k)}">📖 Voir la recette</button>
        <button class="btn" data-act="rQuantities" data-v="${esc(k)}">✏️ Modifier les quantités</button>
        <button class="btn" data-act="rVariant" data-v="${esc(k)}">Créer une variante</button>
        <button class="btn" data-act="rEditIngredients" data-v="${esc(k)}">Modifier les ingrédients</button>
        <button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="main">Choisir une autre recette</button>
        <button class="btn" data-act="rReroll" data-v="${esc(k)}">Autre idée</button>
      </div></details>`;
}
// Fiche cuisine Maisonnée : les données restent celles du Carnet embarqué.
let rRecipeTab = "ing";
let rRecipeReturnSlot = null;
// The recipe is a child of the meal sheet. Closing it returns to the meal.
document.addEventListener("click", e => {
  const btn=e.target.closest('[data-act="closeSheet"]');
  if(!btn || !rRecipeReturnSlot || !document.querySelector('#sheetIn [data-recipe-detail]')) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const k=rRecipeReturnSlot; rRecipeReturnSlot=null;
  mealSlotSheet(k);
}, true);
function rRecipeSheet(k, tab) {
  rRecipeReturnSlot=k;
  if (tab) rRecipeTab = tab;
  cev(`curWeek=${JSON.stringify(rWeek)}`);
  const R = cj(`(()=>{const s=${slotJs(k)};const r=s&&recipes[s.id];if(!r)return null;
    const n=(s.n||menu.people||4)*mealPortionFactor(s),f=n/(r.serves||4);
    const ing=Array.isArray(s.ingCustom)?s.ingCustom.filter(i=>i.n).map(i=>({n:i.n.trim(),qt:typeof customIngredientQuantity==="function"?mealCustomQuantity(i.qt,s):i.qt||""})):(r.ing||[]).filter(i=>i.n).map(i=>{const[q,u]=toBase(i.q,i.u);const qq=q*ingMult(r,i,f*(r.serves||4));return{n:i.n.trim(),qt:q?fmt(qq,u)||"":""};});
    let steps=[];try{steps=stepsFor(s.id).steps||[];}catch(e){steps=String(r.steps||"").split("\\n").filter(Boolean);}
    steps=steps.map(x=>typeof x==="string"?x:(x&&(x.t||x.text))||"").filter(Boolean);
    return{id:s.id,name:r.name,ph:rPhotoSrc(s.id)||"",time:r.time||0,n,ing,steps,fav:!!r.fav,
      serves:r.serves||4,src:typeof r.source==="string"&&/^https?:/.test(r.source)?r.source:"",
      info:r.note||r.notes||r.description||"",wine:r.wine||r.wines||""};})()`);
  if (!R) return;
  const [dn,m]=k.split("|");
  const tabs=`<div class="btns" style="margin-top:14px;display:flex;gap:6px">${[["ing","🥕 Ingrédients"],["steps","📝 Étapes"],["info","ℹ️ Infos"]].map(([id,label])=>`<button class="btn ${rRecipeTab===id?"primary":""}" style="flex:1;padding:9px 4px" data-act="rRecipeTab" data-v="${esc(k)}" data-tab="${id}">${label}</button>`).join("")}</div>`;
  let body="";
  if(rRecipeTab==="ing") body=`<p class="muted small">Recette de référence : ${R.serves} personne(s). Repas prévu : ${R.n} personne(s). Les quantités affichées ci-dessous correspondent au repas prévu${cj(`(()=>{const s=${slotJs(k)};return s&&Array.isArray(s.ingCustom)?" (personnalisé)":""})()`)}.</p><div class="btns" style="margin-top:12px"><button class="btn primary block" data-act="rEditIngredients" data-v="${esc(k)}">✏️ Modifier les ingrédients et quantités</button></div>
    ${R.ing.length?`<div class="list">${R.ing.map(i=>`<div class="cx-item"><span class="nm"><button type="button" class="ing-emoji-change" data-ing-emoji-name="${esc(i.n)}" title="Changer l’emoji">${IngredientEmoji.html(i.n)}</button> ${esc(i.n)}</span><span class="q">${esc(i.qt)}</span></div>`).join("")}</div>`:`<p class="muted">Aucun ingrédient renseigné.</p>`}`;
  if(rRecipeTab==="steps") body=`<div class="btns" style="margin-top:12px"><button class="btn primary" data-act="rEditSteps" data-v="${esc(k)}">✏️ Ajouter / modifier les étapes</button></div>${R.steps.length?`<ol style="padding-left:22px;display:flex;flex-direction:column;gap:10px;line-height:1.5">${R.steps.map(t=>`<li>${esc(t)}</li>`).join("")}</ol>`:`<p class="muted">Aucune étape : ajoutez votre préparation.</p>`}`;
  if(rRecipeTab==="info") body=`<div style="margin-top:14px">${R.info?`<p>${esc(typeof R.info==="string"?R.info:JSON.stringify(R.info))}</p>`:`<p class="muted">Aucune note enregistrée pour cette recette.</p>`}${R.wine?`<p>🍷 ${esc(typeof R.wine==="string"?R.wine:JSON.stringify(R.wine))}</p>`:""}${R.src?`<p><a href="${esc(R.src)}" target="_blank" rel="noopener">Recette d'origine ↗</a></p>`:""}<button class="btn" data-act="rRecipeOpen" data-v="${esc(k)}" data-id="${esc(R.id)}">Toutes les informations dans le Carnet ↗</button></div>`;
  openSheet(R.name,`
    <div data-recipe-detail="1" style="display:none"></div>
    ${R.ph?`<img src="${esc(R.ph)}" alt="" style="width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:14px;margin-top:6px">`:""}
    <p class="muted small" style="margin:8px 0">${esc(dn)} ${esc(m)}${R.time?` · ⏱ ${R.time} min`:""}</p>
    <div class="btns" style="align-items:center"><button class="btn" data-act="rRecipeServ" data-v="${esc(k)}" data-d="-1" ${R.n<=1?"disabled":""}>−</button><strong>${R.n} pers.</strong><button class="btn" data-act="rRecipeServ" data-v="${esc(k)}" data-d="1">+</button><button class="btn" data-act="rRecipeFav" data-v="${esc(k)}">${R.fav?"★ Favori":"☆ Favori"}</button></div>
    ${tabs}${body}
    <div class="btns" style="margin-top:16px"><button class="btn primary" data-act="rCook" data-v="${esc(k)}">👨‍🍳 Cuisiner pas à pas</button><button class="btn" data-act="rRecipeOpen" data-v="${esc(k)}" data-id="${esc(R.id)}">Ouvrir dans le Carnet</button></div>
    <div class="sheet-sticky btns"><button class="btn" data-act="rSlot" data-v="${esc(k)}">← Retour au repas</button><button class="btn" data-act="rChoose" data-v="${esc(k)}" data-r="main">Changer de recette</button></div>`);
}
function rEditStepsSheet(k) {
  cev(`curWeek=${JSON.stringify(rWeek)}`);
  const data=cj(`(()=>{const s=${slotJs(k)},r=s&&recipes[s.id];if(!r)return null;return{id:s.id,name:r.name,steps:String(r.steps||"").split("\\n").map(x=>x.trim()).filter(Boolean),display:stepsFor(s.id).steps||[],shared:!!r.shared};})()`);
  if(!data)return;
  if(data.shared){alert("Cette recette est partagée en lecture seule. Personnalisez-la dans le Carnet de menus.");return;}
  // Les étapes détaillées du catalogue sont parfois distinctes de r.steps : préremplir avec les étapes visibles.
  const steps=data.display.length?data.display:data.steps;
  openSheet("Modifier les étapes · "+data.name,`<p class="muted small">Les étapes enregistrées seront utilisées dans Maisonnée et Carnet de menus. Vous pouvez les réordonner.</p>
    <form id="rStepsForm" data-k="${esc(k)}" data-id="${esc(data.id)}"><div id="rStepsRows">${steps.map(t=>rStepRow(t)).join("")}</div>
    <button type="button" class="btn" data-act="rStepAdd">+ Ajouter une étape</button>
    <div class="sheet-sticky btns"><button type="button" class="btn" data-act="rRecipeTab" data-v="${esc(k)}" data-tab="steps">Annuler</button><button class="btn primary" type="submit">Enregistrer les étapes</button></div></form>`);
}
function rStepRow(t="") {return `<div class="field r-step-edit" style="display:flex;gap:6px;align-items:flex-start;margin:8px 0"><textarea class="input" rows="3" style="flex:1;min-width:0" aria-label="Texte de l'étape">${esc(t)}</textarea><div style="display:flex;flex-direction:column;gap:4px"><button type="button" class="btn" data-act="rStepUp" aria-label="Monter">↑</button><button type="button" class="btn" data-act="rStepDown" aria-label="Descendre">↓</button><button type="button" class="btn" data-act="rStepDelete" aria-label="Supprimer">×</button></div></div>`;}
// Enregistrer dans le moteur de recettes existant, sans toucher au repas planifié.
document.addEventListener("submit",async e=>{
  const f=e.target.closest("#rStepsForm");if(!f||!CK.ready)return;
  e.preventDefault();const steps=[...f.querySelectorAll("textarea")].map(x=>x.value.trim()).filter(Boolean);
  if(!steps.length&&!confirm("Enregistrer une recette sans aucune étape ?"))return;
  const id=f.dataset.id,k=f.dataset.k;
  try {
    await cev(`(async()=>{const id=${JSON.stringify(id)},r=recipes[id];if(!r)throw Error("Recette introuvable");saveRecipe(id,{...r,steps:${JSON.stringify(steps.join("\n"))}});})()`);
    toast("Étapes enregistrées localement ; synchronisation en cours.");rRecipeSheet(k,"steps");
  }catch(err){console.error(err);alert("Impossible d'enregistrer les étapes.");}
});
// Édition ciblée des quantités de la recette, sans changer les emojis existants.
function rQuantitiesSheet(k) {
  cev(`curWeek=${JSON.stringify(rWeek)}`);
  const data=cj(`(()=>{const s=${slotJs(k)},r=s&&recipes[s.id];return r?{id:s.id,name:r.name,serves:Number(r.serves)||4,mealPeople:Number(s.n)||Number(menu.people)||4,ing:r.ing||[]}:null})()`);
  if(!data)return;
  const rows=data.ing.map((i,j)=>`<label class="field" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <span style="font-size:24px">${IngredientEmoji.html(i.n||"")}</span><span style="flex:1;min-width:110px">${esc(i.n||"")}</span>
    <input class="input" type="number" min="0" step="any" inputmode="decimal" name="q${j}" value="${esc(i.q??"")}" style="width:92px" aria-label="Quantité ${esc(i.n||"")}">
    <span>${esc(i.u||"")}</span></label>`).join("");
  openSheet("Quantités · "+data.name,`<p class="muted small"><strong>Quantités de référence pour ${data.serves} personne(s).</strong><br>Repas prévu pour ${data.mealPeople} personne(s). Les valeurs ci-dessous sont celles de la recette de référence, pas celles du repas prévu. Les emojis, ingrédients et étapes sont conservés.</p>
    <form id="rQuantityForm" data-k="${esc(k)}" data-id="${esc(data.id)}">
      ${rows}<div class="sheet-sticky btns" style="display:flex;flex-wrap:wrap">
      <button type="button" class="btn" data-act="rRecipe" data-v="${esc(k)}">Annuler</button>
      <button type="submit" class="btn primary" name="mode" value="original">Enregistrer sur cette recette</button>
      <button type="submit" class="btn" name="mode" value="variant">Créer une variante</button>
      </div></form>`);
}
document.addEventListener("submit",async e=>{
  const f=e.target.closest("#rQuantityForm");if(!f||!CK.ready)return;
  e.preventDefault();
  const submitter=e.submitter,mode=submitter?.value==="variant"?"variant":"original";
  const id=f.dataset.id,k=f.dataset.k;
  const values=[...f.querySelectorAll('input[type="number"]')].map(x=>x.value.trim());
  if(values.some(x=>x!==""&&(!Number.isFinite(Number(x))||Number(x)<0))){alert("Quantité invalide.");return;}
  let newName="";
  if(mode==="variant"){
    newName=prompt("Nom de la nouvelle variante :");
    if(newName===null)return;
    newName=newName.trim();
    if(!newName){alert("Donnez un nom à la variante.");return;}
  } else if(!confirm("Modifier les quantités de cette recette pour tous ses usages ?"))return;
  cev(`curWeek=${JSON.stringify(rWeek)}`);
  const newId=mode==="variant"?"variante-"+Math.random().toString(36).slice(2,11):id;
  const result=cev(`(()=>{const id=${JSON.stringify(id)},nid=${JSON.stringify(newId)},r=recipes[id];if(!r)return null;
    const v=${JSON.stringify(values)},n=JSON.parse(JSON.stringify(r));
    n.ing=(n.ing||[]).map((i,j)=>({...i,q:v[j]===""?i.q:Number(v[j])}));
    if(nid!==id){n.name=${JSON.stringify(newName)};n.variantOf=id;delete n.shared;delete n.sharedBy;delete n.cloudAuthor;}
    return {id:nid,recipe:n};})()`);
  if(!result)return;
  try{
    await cev(`saveRecipe(${JSON.stringify(result.id)},${JSON.stringify(result.recipe)})`);
    if(mode==="variant"){
      cev(`(()=>{const s=${slotJs(k)};if(s)s.id=${JSON.stringify(newId)};})()`);
      carnetSave("Variante créée et placée dans le repas.");
    }else carnetSave("Quantités de la recette enregistrées.");
    rRecipeSheet(k);
  }catch(err){console.error(err);alert("Enregistrement impossible. Aucune modification confirmée.");}
});
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
  if (!["rPortion", "rPortionCustom", "rRecipeTab", "rRecipeServ", "rRecipeFav", "rEditSteps", "rStepAdd", "rStepUp", "rStepDown", "rStepDelete", "rCook", "rCookNext", "rCookPrev", "rCookRecipe", "rCookBack", "rCookExit", "rRecipe", "rRecipeOpen", "rVariant", "rFav", "rEditIngredients", "rQuantities", "rPhotoEdit", "rRename", "rIngAdd", "rIngDelete", "rWeek", "rPropose", "rPrefs", "rLockAll", "rIng", "rKeep", "rSlot", "rReroll", "rChoose", "rLock", "rState", "rBought", "rQuickIng", "rServ", "rSide", "rRemove", "rRemoveChoose", "rRemovePart", "rPut", "rNum", "rLeft", "rLeftPut", "rNote", "rNotePut", "rHomeFav", "rHomeCook"].includes(act)) return;
  if (act !== "rWeek") cev(`curWeek=${JSON.stringify(rWeek)}`);
  switch (act) {
    case "rPortion": case "rPortionCustom": {
      let f=Number(b.dataset.f);
      if(act==="rPortionCustom"){const old=cj(`(()=>{const s=${slotJs(v)};return mealPortionFactor(s);})()`);const input=prompt("Coefficient de portion pour ce repas (0,25 à 4)",String(old).replace('.',','));if(input===null)break;f=Number(input.replace(',','.'));}
      if(!Number.isFinite(f)||f<0.25||f>4){alert("Coefficient entre 0,25 et 4 requis");break;}
      cev(`(()=>{const s=${slotJs(v)};if(s)s.portionMultiplier=${f};})()`);carnetSave();mealSlotSheet(v);break;
    }
    case "rWeek": rWeek = addDays(rWeek, +v); render(); break;
    case "rPropose": rProposeSheet(); break;
    case "rPrefs": rPrefsSheet(); break;
    case "rSlot": rRecipeReturnSlot=null; mealSlotSheet(v); break;
    case "rRecipe": rRecipeSheet(v); break;
    case "rRecipeTab": rRecipeSheet(v,b.dataset.tab); break;
    case "rEditSteps": rEditStepsSheet(v); break;
    case "rStepAdd": {const box=document.querySelector("#rStepsRows");if(box)box.insertAdjacentHTML("beforeend",rStepRow());break;}
    case "rStepDelete": b.closest(".r-step-edit")?.remove();break;
    case "rStepUp": {const row=b.closest(".r-step-edit");if(row?.previousElementSibling)row.parentElement.insertBefore(row,row.previousElementSibling);break;}
    case "rStepDown": {const row=b.closest(".r-step-edit");if(row?.nextElementSibling)row.parentElement.insertBefore(row.nextElementSibling,row);break;}
    case "rRecipeServ": {
      const legacy=cev(`(()=>{const s=${slotJs(v)};return !!(s&&Array.isArray(s.ingCustom)&&s.ingCustom.length&&!Number(s.ingCustomPeople));})()`);
      if(legacy){const raw=prompt("Cette recette contient des quantités personnalisées anciennes. Pour combien de personnes ces quantités ont-elles été saisies ? (Ex. 7 pour les 14 tranches de pain)");if(raw===null)break;const base=Number(raw.trim());if(!Number.isInteger(base)||base<1||base>100){alert("Indique un nombre entier de personnes entre 1 et 100.");break;}cev(`(()=>{const s=${slotJs(v)};if(s)s.ingCustomPeople=${base};})()`);}
      const delta=Number(b.dataset.d)||0;
      const n=cev(`(()=>{const s=${slotJs(v)};if(!s)return null;s.n=Math.max(1,Math.min(30,(s.n||menu.people||4)+${delta}));return s.n;})()`);
      if(n!==null){carnetSave();rRecipeSheet(v);}break;
    }
    case "rRecipeFav": {
      const x=cev(`(()=>{const s=${slotJs(v)},r=s&&recipes[s.id];if(!r)return null;return {id:s.id,recipe:{...r,fav:!r.fav}};})()`);
      if(x){await cev(`saveRecipe(${JSON.stringify(x.id)},${JSON.stringify(x.recipe)})`);rRecipeSheet(v);}break;
    }

    case "rCook": rCookStart(v); break;
    case "rHomeCook": rCookStart("", v); break;
    case "rHomeFav": {
      const changed = cev(`(()=>{const id=${JSON.stringify(v)},r=recipes[id];if(!r)return null;r.fav=!r.fav;return {id,fav:r.fav};})()`);
      if (changed) {
        try { await cev(`saveRecipe(${JSON.stringify(changed.id)},recipes[${JSON.stringify(changed.id)}])`); } catch (err) { console.warn("Favori", err); }
        homeRecipeSheet(homeRecipeFromCarnet(changed.id));
      }
      break;
    }
    case "rCookNext": rCookMove(1); break;
    case "rCookPrev": rCookMove(-1); break;
    case "rCookRecipe": rCookShowRecipe(); break;
    case "rCookBack": rCookRestore(); break;
    case "rCookExit": rCookExit(); break;
    case "rFav": {
      const changed=cev(`(()=>{const s=${slotJs(v)};const r=s&&recipes[s.id];if(!r)return null;r.fav=!r.fav;return {id:s.id,recipe:r,fav:r.fav};})()`);
      if(changed){
        // Persist recipe favourites through the Carnet's recipe store, not only menu state.
        try { await cev(`saveRecipe(${JSON.stringify(changed.id)},recipes[${JSON.stringify(changed.id)}])`); } catch(err) { console.warn("Favori",err); }
        carnetSave(changed.fav?"Recette ajoutée aux favoris.":"Recette retirée des favoris."); mealSlotSheet(v);
      }
      break;
    }
    case "rEditIngredients": rEditIngredientsSheet(v); break;
    case "rQuantities": rQuantitiesSheet(v); break;
    case "rPhotoEdit": {
      const id=cj(`(()=>{const s=${slotJs(v)};return s?s.id:""})()`);
      if(id){ LS.set("mz_return", {view:"repas",week:rWeek,slot:v,at:Date.now()}); location.assign(CARNET_URL+"?recette="+encodeURIComponent(id)+"&photoDirecte=1"); }
      break;
    }
    case "rRename": {
      const data=cj(`(()=>{const s=${slotJs(v)},r=s&&recipes[s.id];return r?{id:s.id,name:r.name}:null})()`);
      if(!data)break;
      const name=prompt("Nouveau nom de la recette :",data.name);
      if(name===null||!name.trim()||name.trim()===data.name)break;
      const updated=cev(`(()=>{const r=recipes[${JSON.stringify(data.id)}];if(!r)return null;return {...r,name:${JSON.stringify(name.trim())}}})()`);
      if(updated)try{
        await cev(`(async()=>{
          const id=${JSON.stringify(data.id)},wanted=${JSON.stringify(name.trim())};
          saveRecipe(id,{...recipes[id],name:wanted});
          if(!cloudOn())throw Error("Connexion au carnet commun indisponible");
          // Attendre une éventuelle synchronisation déjà en cours.
          for(let i=0;i<40&&cloud.busy;i++)await new Promise(r=>setTimeout(r,250));
          if(cloud.busy)throw Error("Synchronisation déjà en cours : réessayez");
          await cloudPush();
          if((cloud.lastErr||[]).length)throw Error(cloud.lastErr.join(" ; "));
          const {data:remote,error}=await cloud.sb.from("recipes").select("name").eq("legacy_id",id).maybeSingle();
          if(error)throw error;
          if(!remote||remote.name!==wanted)throw Error("Le nouveau nom n’est pas confirmé dans Supabase");
        })()`);
        carnetSave("Recette renommée et synchronisée");mealSlotSheet(v);
      }catch(err){console.error(err);alert("Renommage non confirmé dans le carnet commun : "+(err.message||err));}
      break;
    }
    case "rIngAdd": {
      const rows=document.querySelector("#rIngEditRows");if(!rows)break;
      const row=document.createElement("div");row.className="field";row.style.cssText="display:flex;gap:8px;align-items:center;margin:8px 0";
      row.innerHTML='<input class="input" aria-label="Ingrédient" placeholder="Ingrédient" style="flex:2;min-width:0"><input class="input" aria-label="Quantité" placeholder="Quantité (ex. 200 g)" style="flex:1;min-width:0"><button type="button" class="btn" data-act="rIngDelete" aria-label="Supprimer">×</button>';
      rows.appendChild(row);break;
    }
    case "rIngDelete": b.closest(".field")?.remove();break;
    case "rVariant": {
      const x=weekSlots(rWeek)[v]; if(!x || !x.s || !x.s.id) break;
      const url=CARNET_URL+"?variante="+encodeURIComponent(x.s.id)+"&repasSemaine="+encodeURIComponent(rWeek)+"&repasCase="+encodeURIComponent(v);
      window.location.assign(url); break;
    }
    case "rRecipeOpen": rRecipeOpen(v, b.dataset.id); return;
    case "rLockAll": {
      const n = cev(`(()=>{let n=0;for(const k of SLOT_ORDER){const s=W()[k];if(s&&recipes[s.id]&&!s.lock&&!isPast(k)&&s.mealState!=="Courses faites"&&s.mealState!=="Terminé"){s.lock=true;s.keep=true;s.mealState="En courses";n++;}}return n;})()`);
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
    case "rState":
    case "rBought": {
      const msg = await writeMealStatus(v, act === "rBought" ? "Courses faites" : b.dataset.state);
      if (msg) carnetSave();
      mealSlotSheet(v);
      if (msg) toast(msg, null, null, $("#sheet .meal-status") || b);
      break;
    }
    case "rQuickIng": {
      const box = b.closest(".meal-quick-add");
      const name = (box && box.querySelector("[name=qn]") ? box.querySelector("[name=qn]").value : "").trim();
      const qt = (box && box.querySelector("[name=qq]") ? box.querySelector("[name=qq]").value : "").trim();
      if (!name) { toast("Écrivez l'ingrédient.", null, null, box || b); break; }
      const items = slotIngredients(v).map(i => ({ n: i.n, qt: i.qt || "", key: i.key }));
      items.push({ n: name, qt, key: "" });
      const onCourses = MEAL_LOCK_STATES.includes(mealState((weekSlots(rWeek)[v] || {}).s));
      cev(`(()=>{const s=${slotJs(v)};if(!s)return;
        const arr=${JSON.stringify(items)};
        s.ingCustomPeople=Number(s.n)||Number(menu.people)||4;
        s.ingCustom=arr.map((i,j)=>{
          if(i.key)return {n:i.n,qt:i.qt||"",key:i.key};
          const m=String(i.qt||"").match(/^([\\d.,\\/ ]+)\\s*(.*)$/);
          const u=m?m[2].trim():"";
          return {n:i.n,qt:i.qt||"",key:norm(i.n)+"|"+u.toLowerCase()+"#"+j};
        });
      })()`);
      carnetSave(onCourses ? "Ajouté à ce repas et à la liste de courses." : "Ajouté à ce repas.");
      mealSlotSheet(v); break;
    }
    case "rLock": {
      const cur = mealState(cj(`${slotJs(v)}`));
      const msg = await writeMealStatus(v, MEAL_LOCK_STATES.includes(cur) ? "Gardé" : "En courses");
      if (msg) { carnetSave(msg); mealSlotSheet(v); }
      break;
    }
    case "rKeep": {
      const cur = mealState(cj(`${slotJs(v)}`));
      const msg = await writeMealStatus(v, cur === "Gardé" ? "Proposé" : "Gardé");
      if (msg) { carnetSave(msg); if (b.closest("#sheet")) mealSlotSheet(v); }
      break;
    }
    case "rIng": cev(`(()=>{const s=${slotJs(v)};if(!s)return;const k=${JSON.stringify(b.dataset.k)},l=Array.isArray(s.noIng)?s.noIng.slice():[];
      const i=l.indexOf(k);if(i>=0)l.splice(i,1);else l.push(k);if(l.length)s.noIng=l;else delete s.noIng;})()`); carnetSave(); mealSlotSheet(v); break;
    case "rServ": {
      const legacy=cev(`(()=>{const s=${slotJs(v)};return !!(s&&Array.isArray(s.ingCustom)&&s.ingCustom.length&&!Number(s.ingCustomPeople));})()`);
      if(legacy){const raw=prompt("Pour combien de personnes les quantités personnalisées ont-elles été saisies ? (Ex. 7 pour le croque-monsieur)");if(raw===null)break;const base=Number(raw.trim());if(!Number.isInteger(base)||base<1||base>100){alert("Indique un nombre entier entre 1 et 100.");break;}cev(`(()=>{const s=${slotJs(v)};if(s)s.ingCustomPeople=${base};})()`);}
      cev(`(()=>{const s=${slotJs(v)};if(s)s.n=Math.max(1,Math.min(20,(s.n||menu.people||4)+(${+b.dataset.d})));})()`); carnetSave(); mealSlotSheet(v); break;
    }
    case "rSide": cev(`(()=>{const s=${slotJs(v)};if(s)delete s[${JSON.stringify(b.dataset.r)}];})()`); carnetSave(); mealSlotSheet(v); break;
    case "rRemoveChoose": rRemoveChooseSheet(v); break;
    case "rRemovePart": {
      const part=b.dataset.r;
      if(!["main","entree","dessert","all"].includes(part))break;
      const x=weekSlots(rWeek)[v];if(!x||!x.s)break;
      if(part==="all"){
        const locked = !!(x.s && x.s.lock);
        const lines = locked ? slotIngredients(v) : [];
        cev(`(()=>{const s=${slotJs(v)};if(s){s.lock=false;}})()`);
        if (locked) holdCartLines(v, lines);
        cev(`delete ${slotJs(v)}`);
        shopIncludeWeek();
        carnetSave();
        rRemoveContext=null;
        closeSheet();
        toast(locked ? "Repas retiré. Les ingrédients pas encore achetés sortent de la liste. Ce qui est déjà coché, ou partagé, reste." : "Repas retiré.");
        break;
      }else if(part==="main"){
        const locked = !!(x.s && x.s.lock);
        const lines = locked ? slotIngredients(v) : [];
        cev(`(()=>{const s=${slotJs(v)};if(!s)return;delete s.id;delete s.ingCustom;delete s.ingCustomPeople;delete s.noIng;delete s.lock;delete s.mealState;})()`);
        if (locked) holdCartLines(v, lines);
        shopIncludeWeek();
        carnetSave();
      }else{
        cev(`(()=>{const s=${slotJs(v)};if(s)delete s[${JSON.stringify(part)}];})()`);
        carnetSave();
      }
      const left=weekSlots(rWeek)[v];
      const still=left&&left.s&&(left.name||left.s.entree||left.s.dessert);
      if(!still){rRemoveContext=null;closeSheet();toast("Repas retiré.");}
      else rRemoveChooseSheet(v);
      break;
    }
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
document.addEventListener("submit",async e => {
  const f=e.target.closest("#rIngEditForm");if(!f||!CK.ready)return;
  e.preventDefault();const k=f.dataset.k,items=[];
  for(const row of f.querySelectorAll("#rIngEditRows .field")){
    const inputs=row.querySelectorAll("input"),n=(inputs[0]?.value||"").trim(),qt=(inputs[1]?.value||"").trim();
    if(n)items.push({n,qt});
  }
  if(!items.length){alert("Ajoutez au moins un ingrédient.");return;}
  const mode=f.querySelector('input[name="saveMode"]:checked')?.value||"meal";
  const info=cj(`(()=>{const s=${slotJs(k)},r=s&&recipes[s.id];return s&&r?{id:s.id,people:Number(s.n)||Number(menu.people)||4,recipe:r}:null;})()`);
  if(!info)return;
  let newName="";
  if(mode==="variant"){
    newName=prompt("Nom de la nouvelle variante :",info.recipe.name+" (variante)");
    if(newName===null)return;newName=newName.trim();if(!newName){alert("Indiquez un nom.");return;}
  }
  if(mode==="original"&&!confirm("Modifier définitivement la recette existante pour tous ses futurs usages ?"))return;
  cev(`curWeek=${JSON.stringify(rWeek)}`);
  try{
    if(mode==="meal"){
      const ok=cev(`(()=>{const s=${slotJs(k)};if(!s)return false;const arr=${JSON.stringify(items)};
        s.ingCustomPeople=Number(s.n)||Number(menu.people)||4;
        s.ingCustom=arr.map((i,j)=>{const m=i.qt.match(/^([\\d.,\\/ ]+)\\s*(.*)$/),u=m?m[2].trim():"";return {n:i.n,qt:i.qt,key:norm(i.n)+"|"+u.toLowerCase()+"#"+j};});
        s.noIng=[];return true;})()`);
      if(!ok)throw Error("Repas introuvable");
    }else{
      const newId=mode==="variant"?"variante-"+Math.random().toString(36).slice(2,11):info.id;
      const result=cev(`(()=>{const r=recipes[${JSON.stringify(info.id)}];if(!r)return null;
        const arr=${JSON.stringify(items)},n=JSON.parse(JSON.stringify(r));
        const old=n.ing||[];
        n.ing=arr.map(i=>{const m=i.qt.match(/^\\s*(\\d+(?:[.,]\\d+)?|\\d+\\s*\\/\\s*\\d+)\\s*(.*)$/);
          const q=m?(m[1].includes("/")?m[1].split("/").map(Number).reduce((a,b)=>a/b):Number(m[1].replace(",","."))):0;
          const u=m?m[2].trim():"";
          const previous=old.find(x=>norm(x.n)===norm(i.n));return {...(previous||{}),n:i.n,q,u};});
        n.serves=${info.people};
        if(${JSON.stringify(mode)}==="variant"){n.name=${JSON.stringify(newName)};n.variantOf=${JSON.stringify(info.id)};delete n.shared;delete n.sharedBy;delete n.cloudAuthor;}
        return n;})()`);
      if(!result)throw Error("Recette introuvable");
      await cev(`saveRecipe(${JSON.stringify(newId)},${JSON.stringify(result)})`);
      cev(`(()=>{const s=${slotJs(k)};if(!s)return;${mode==="variant"?`s.id=${JSON.stringify(newId)};`:""}delete s.ingCustom;delete s.ingCustomPeople;delete s.noIng;})()`);
    }
    carnetSave(mode==="meal"?"Ingrédients de ce repas enregistrés.":mode==="variant"?"Nouvelle variante enregistrée.":"Recette mise à jour.");
    rRecipeSheet(k,"ing");
  }catch(err){console.error(err);alert("Enregistrement non confirmé : "+(err.message||err));}
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
    if (lock) { cev(`(()=>{for(const k of SLOT_ORDER){const s=W()[k];if(s&&recipes[s.id]&&!isPast(k)&&s.mealState!=="Courses faites"&&s.mealState!=="Terminé"){s.lock=true;s.keep=true;s.mealState="En courses";}}})()`); shopIncludeWeek(); }
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

// Sélecteur compact des portions : même donnée et même calcul que les anciens boutons.
document.addEventListener("change", e => {
  const el=e.target.closest("select[data-meal-portion]"); if(!el || !CK.ready) return;
  const k=el.dataset.mealPortion;
  let f=Number(el.value);
  if(el.value==="custom") {
    const old=cj(`(()=>{const s=${slotJs(k)};return mealPortionFactor(s);})()`);
    const input=prompt("Coefficient de portion pour ce repas (0,25 à 4)",String(old).replace('.',','));
    if(input===null){mealSlotSheet(k);return;}
    f=Number(input.replace(',','.'));
  }
  if(!Number.isFinite(f)||f<0.25||f>4){alert("Coefficient entre 0,25 et 4 requis");mealSlotSheet(k);return;}
  cev(`curWeek=${JSON.stringify(rWeek)}`);
  cev(`(()=>{const s=${slotJs(k)};if(s)s.portionMultiplier=${f};})()`);
  carnetSave();mealSlotSheet(k);
});

// États explicites conservés dans le carnet commun et synchronisés par le pont existant.
document.addEventListener("change", e => {
  const el=e.target.closest("select[data-meal-state]"); if(!el || !CK.ready) return;
  const k=el.dataset.mealState, state=el.value;
  if(!MEAL_STATES.includes(state)) return;
  cev(`curWeek=${JSON.stringify(rWeek)}`);
  writeMealStatus(k, state).then(msg => { if (msg) { carnetSave(msg); mealSlotSheet(k); } else mealSlotSheet(k); });
});

// Mode cuisine local à Maisonnée : aucun changement de page ni de données Carnet.
let rCookSession = null;
let rCookRecipeVisible = false;
// A native <dialog> occupies the browser top layer: close it before showing cooking mode.
document.querySelector("#sheet").addEventListener("close", () => {
  if (rCookSession && rCookRecipeVisible) {
    rCookRecipeVisible = false;
    rCookDraw();
  }
});
function rCookStart(k, recipeId) {
  const data = recipeId
    ? cj(`(()=>{const id=${JSON.stringify(recipeId)},r=recipes[id];if(!r)return null;
    let steps=[];try{steps=stepsFor(id).steps||[];}catch(e){}
    if(!steps.length)steps=String(r.steps||'').split('\\n').filter(Boolean);
    return {name:r.name,photo:(typeof rPhotoSrc==='function'?rPhotoSrc(id):'')||'',steps:steps.map(x=>typeof x==='string'?x:(x&&(x.t||x.text||x.title))||'').filter(Boolean)};})()`)
    : cj(`(()=>{const s=${slotJs(k)},r=s&&recipes[s.id];if(!r)return null;
    let steps=[];try{steps=stepsFor(s.id).steps||[];}catch(e){}
    if(!steps.length)steps=String(r.steps||'').split('\\n').filter(Boolean);
    return {name:r.name,photo:rPhotoSrc(s.id)||'',steps:steps.map(x=>typeof x==='string'?x:(x&&(x.t||x.text||x.title))||'').filter(Boolean)};})()`);
  if(!data || !data.steps.length){alert('Cette recette ne possède pas encore d’étapes de préparation.');return;}
  rCookSession={k, id: recipeId || "", data, i:0};
  rCookRecipeVisible=false;
  closeSheet();
  if(!document.querySelector('#mzCookOverlay')){
    const el=document.createElement('section');el.id='mzCookOverlay';el.className='mz-cook-overlay';el.setAttribute('aria-label','Cuisiner pas à pas');
    document.body.appendChild(el);
  }
  rCookDraw();
}
function rCookDraw(){
  if(!rCookSession)return;
  const {k,data,i}=rCookSession,steps=data.steps,n=steps.length;
  const el=document.querySelector('#mzCookOverlay');if(!el)return;
  el.innerHTML=`<div class="mz-cook-shell">
    <header class="mz-cook-header"><h2>👨‍🍳 Cuisiner pas à pas</h2><strong>${esc(data.name)}</strong><div class="mz-cook-buttons"><button class="btn" data-act="rCookRecipe">📖 Fiche recette</button><button class="btn" data-act="rCookExit">← Retour au repas</button></div></header>
    <div class="mz-cook-layout"><nav class="mz-cook-list" aria-label="Étapes de préparation"><h3>Étapes (${i+1}/${n})</h3>${steps.map((st,j)=>`<div class="mz-cook-step ${j===i?'active':''}"><b>${j+1}</b><span>${esc(st).slice(0,85)}</span></div>`).join('')}</nav>
    <main class="mz-cook-main"><div class="mz-cook-progress"><strong>Étape ${i+1} sur ${n}</strong><progress value="${i+1}" max="${n}"></progress></div><div class="mz-cook-content">${data.photo?`<img src="${esc(data.photo)}" alt="Photo de la recette">`:''}<p>${esc(steps[i])}</p></div><footer><button class="btn" data-act="rCookPrev" ${i===0?'disabled':''}>← Précédent</button><button class="btn primary" data-act="rCookNext" ${i===n-1?'disabled':''}>Suivant →</button></footer></main></div>
  </div>`;
  el.hidden=false;
}
function rCookMove(d){if(!rCookSession)return;rCookSession.i=Math.max(0,Math.min(rCookSession.data.steps.length-1,rCookSession.i+d));rCookDraw();}
function rCookShowRecipe(){if(!rCookSession)return;document.querySelector('#mzCookOverlay').hidden=true;rCookRecipeVisible=true;
  if(rCookSession.k) rRecipeSheet(rCookSession.k); else homeRecipeSheet(homeRecipeFromCarnet(rCookSession.id));
  const holder=document.querySelector('#sheetIn .sheet-sticky');if(holder){const btn=document.createElement('button');btn.className='btn primary';btn.dataset.act='rCookBack';btn.textContent='← Revenir à la préparation';holder.prepend(btn);}}
function rCookRestore(){if(!rCookSession)return;rCookRecipeVisible=false;closeSheet();rCookDraw();}
function rCookExit(){if(!rCookSession)return;const k=rCookSession.k,id=rCookSession.id;const el=document.querySelector('#mzCookOverlay');if(el)el.hidden=true;rCookRecipeVisible=false;rCookSession=null;if(k)mealSlotSheet(k);else if(id)homeRecipeSheet(homeRecipeFromCarnet(id)||homeRecipeFromBook(id));}
