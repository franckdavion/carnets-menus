"use strict";
/* Pont Carnet de menus ⇄ Maisonnée.
   Chargé par la page du Carnet, après son propre script. Quand le compte connecté a relié son Carnet
   à un foyer Maisonnée (households.carnet_user), il synchronise dans les deux sens :
   - les repas, de la semaine passée à 4 semaines devant ;
   - la liste de courses : articles calculés par le Carnet (repas validés), articles ajoutés à la main, coches.
   Il ajoute aussi un bouton « Maisonnée » en haut du Carnet pour revenir dans l'autre appli. */
(() => {
  const P = { cloudOk: false, busy: false, again: false, timer: null, skip: false, userEdit: false, me: null, meFor: "", map: null, mapAt: 0, hid: null };
  // only after this copy has received the shared carnet once: a copy still showing what it had in memory
  // (phone just reopened, new device) must not send its old week to Maisonnée
  const ready = () => typeof cloud !== "undefined" && typeof cloudOn === "function" && cloudOn() && typeof menu !== "undefined" && P.cloudOk;

  /* ---------- button back to Maisonnée ---------- */
  function addBackButton() {
    const host = document.querySelector("header.top .top-r") || document.querySelector("header.top");
    if (!host || document.getElementById("mzBack")) return;
    const a = document.createElement("a");
    a.id = "mzBack"; a.href = "maison/"; a.textContent = "🏠 Maisonnée";
    a.setAttribute("aria-label", "Revenir dans Maisonnée");
    a.style.cssText = "display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:999px;border:1px solid currentColor;font-size:14px;font-weight:700;text-decoration:none;color:inherit;white-space:nowrap;opacity:.9";
    host.insertBefore(a, host.firstChild);
  }

  /* ---------- recipe ids: Carnet key (legacy id or "c-<uuid>") ⇄ Supabase uuid ---------- */
  async function loadMap(sb) {
    if (P.map && Date.now() - P.mapAt < 10 * 60e3) return;
    const k2u = {}, u2k = {};
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from("recipes").select("id,legacy_id").range(from, from + 999);
      if (error || !data) break;
      for (const r of data) { const k = r.legacy_id || "c-" + r.id; k2u[k] = r.id; u2k[r.id] = k; }
      if (data.length < 1000) break;
    }
    P.map = { k2u, u2k }; P.mapAt = Date.now();
  }
  const uuidToKey = u => (P.map && P.map.u2k[u]) || "c-" + u;
  const keyToUuid = k => (P.map && P.map.k2u[k]) || (k.startsWith("c-") ? k.slice(2) : null);
  const AISLES = ["Fruits & légumes", "Boulangerie", "Boucherie & poisson", "Crémerie", "Épicerie", "Surgelés", "Boissons", "Hygiène & maison", "Divers"];
  const aisleOf = r => AISLES.includes(r) ? r : "Divers";

  /* ---------- the sync ---------- */
  async function pontSync() {
    if (!ready()) return;
    if (P.busy) { P.again = true; return; }
    P.busy = true;
    try {
      const sb = cloud.sb, uid = cloud.user.id;
      const { data: hs, error: he } = await sb.from("households").select("id,carnet_user").eq("carnet_user", cloud.owner || uid).limit(1);
      if (he || !hs || !hs.length) { P.hid = null; return; }
      const hid = P.hid = hs[0].id;
      await loadMap(sb);
      const start = addDays(mondayOf(new Date()), -7), from = ymd(start), to = ymd(addDays(new Date(), 27));
      const [ml, sh] = await Promise.all([
        sb.from("meals").select("*").eq("household_id", hid).gte("day", from).lte("day", to),
        sb.from("shopping_items").select("*").eq("household_id", hid)
      ]);
      if (ml.error || sh.error) throw ml.error || sh.error;

      if (!P.me || P.meFor !== uid) {
        let me = null;
        try { if (window.parent && window.parent !== window && window.parent.S && window.parent.S.me) me = window.parent.S.me; } catch (e) {}
        if (!me) { const { data: mm } = await sb.from("household_members").select("id").eq("household_id", hid).eq("user_id", uid).maybeSingle(); me = mm && mm.id; }
        if (me) { P.me = me; P.meFor = uid; }
      }
      const before = JSON.stringify([menu.weeks, menu.extras, menu.checked, menu.mzBase]);
      const base = menu.mzBase && menu.mzBase.hid === hid ? JSON.parse(JSON.stringify(menu.mzBase)) : { hid, meals: {}, extras: {}, checked: {} };
      const ops = [], authored = [], now = new Date().toISOString();
      const shopInsert = row => { if (P.userEdit) authored.push(row); ops.push(sb.from("shopping_items").insert(row)); };
      let pulled = 0;

      /* 1. meals: each side's change goes to the other; if both changed, the Carnet (open now) wins */
      const M = {};
      for (const m of ml.data) M[m.day + "|" + m.slot] = m;
      // a meal saved in Maisonnée by name (recipe not in the common book) is the same Carnet recipe when the name matches
      const byName = {};
      for (const [id, r] of Object.entries(recipes)) if (r && r.name && !byName[norm(r.name)]) byName[norm(r.name)] = id;
      for (let d = new Date(start); ymd(d) <= to; d = addDays(d, 1)) {
        const day = ymd(d), wk = ymd(mondayOf(d)), dn = DAYS[(d.getDay() + 6) % 7];
        for (const [slot] of MEALS) {
          const k = day + "|" + slot, sk = slotKey(dn, slot), sl = ((menu.weeks || {})[wk] || {})[sk];
          const cSig = sl && recipes[sl.id] ? "R:" + sl.id : "";
          const mm = M[k];
          let mSig = "";
          if (mm && mm.recipe_id) mSig = "R:" + uuidToKey(mm.recipe_id);
          else if (mm && mm.label) {
            const n = norm(mm.label);
            mSig = sl && recipes[sl.id] && norm(recipes[sl.id].name) === n ? "R:" + sl.id : byName[n] ? "R:" + byName[n] : "T:" + mm.label;
          }
          const b = base.meals[k];
          let cNew = cSig, mNew = mSig;
          if (!b) { if (cSig && cSig !== mSig) mNew = cSig; else if (!cSig && mSig.startsWith("R:")) cNew = mSig; }
          else if (cSig !== b.c) mNew = cSig;
          else if (mSig !== b.m) cNew = mSig.startsWith("R:") ? mSig : "";
          if (mNew !== mSig) {
            if (!mNew) { if (mm) ops.push(sb.from("meals").delete().eq("id", mm.id)); }
            else {
              const key = mNew.slice(2), ru = keyToUuid(key);
              const row = { household_id: hid, day, slot, recipe_id: ru || null, label: ru ? "" : (recipes[key] ? recipes[key].name : ""), updated_at: now };
              ops.push(sb.from("meals").upsert(row, { onConflict: "household_id,day,slot" }));
            }
          }
          if (cNew !== cSig) {
            menu.weeks = menu.weeks || {};
            if (!menu.weeks[wk]) menu.weeks[wk] = {};
            if (!cNew) { if (!(sl && (sl.left || sl.note))) delete menu.weeks[wk][sk]; } // des « restes » ne sont pas effacés par la synchro des repas
            else {
              const key = cNew.slice(2);
              if (recipes[key]) menu.weeks[wk][sk] = Object.assign({}, sl && sl.id === key ? sl : {}, { id: key, n: (sl && sl.n) || menu.people || 4, lock: true });
              else cNew = cSig;
            }
            if (cNew !== cSig) pulled++;
          }
          base.meals[k] = { c: cNew, m: mNew };
        }
      }
      for (const k of Object.keys(base.meals)) if (k.slice(0, 10) < from) delete base.meals[k];

      /* 2. shopping list */
      const items = typeof shopping === "function" ? shopping() : [];
      const C = {}; for (const i of items) C[i.key] = i;
      const rowsC = {}, rowsX = {};
      for (const r of sh.data) {
        const src = r.source || "";
        if (src.startsWith("carnet:")) { const key = src.slice(7); if (rowsC[key]) ops.push(sb.from("shopping_items").delete().eq("id", r.id)); else rowsC[key] = r; }
        else if (!src.startsWith("menu:")) { const key = norm(r.name); if (rowsX[key]) ops.push(sb.from("shopping_items").delete().eq("id", r.id)); else rowsX[key] = r; }
      }
      // 2a. ingredients of the validated meals: the Carnet decides the list, ticks go both ways
      for (const [key, i] of Object.entries(C)) {
        const r = rowsC[key], cDone = !!(menu.checked || {})[key], b = base.checked[key];
        let done = cDone;
        if (r) {
          const mDone = !!r.done;
          if (b !== undefined && cDone === b && mDone !== b) {
            done = mDone; menu.checked = Object.assign({}, menu.checked);
            if (done) {
              menu.checked[key] = true;
              (menu.checkedQty||(menu.checkedQty={}))[key] = i.q;
            } else {
              delete menu.checked[key];
              if(menu.checkedQty)delete menu.checkedQty[key];
            }
            pulled++;
          }
          const want = { name: i.n, qty: fmt(i.q, i.u) || "", aisle: aisleOf(i.r), done };
          if (r.name !== want.name || r.qty !== want.qty || r.aisle !== want.aisle || !!r.done !== done) ops.push(sb.from("shopping_items").update(want).eq("id", r.id));
        } else shopInsert({ household_id: hid, name: i.n, qty: fmt(i.q, i.u) || "", aisle: aisleOf(i.r), done: cDone, source: "carnet:" + key });
        base.checked[key] = done;
      }
      for (const [key, r] of Object.entries(rowsC)) if (!C[key]) { ops.push(sb.from("shopping_items").delete().eq("id", r.id)); delete base.checked[key]; }
      // 2b. items added by hand on either side (Carnet « En plus » ⇄ Maisonnée)
      let ex = (menu.extras || []).slice(), exChanged = false;
      const CE = {}; for (const x of ex) if (x && x.t) CE[norm(x.t)] = x;
      for (const k of new Set([...Object.keys(CE), ...Object.keys(rowsX), ...Object.keys(base.extras)])) {
        const c = CE[k], r = rowsX[k], inB = Object.prototype.hasOwnProperty.call(base.extras, k), b = base.extras[k];
        if (c && r) {
          const cD = !!c.done, mD = !!r.done; let done = cD;
          if (inB && cD === b && mD !== b) { done = mD; ex = ex.map(x => x === c ? Object.assign({}, x, { done: mD }) : x); exChanged = true; pulled++; }
          else if (cD !== mD) ops.push(sb.from("shopping_items").update({ done: cD }).eq("id", r.id));
          base.extras[k] = done;
        } else if (c) {
          if (inB) { ex = ex.filter(x => x !== c); exChanged = true; pulled++; delete base.extras[k]; }
          else { shopInsert({ household_id: hid, name: c.t, qty: "", aisle: "Divers", done: !!c.done, source: "x" }); base.extras[k] = !!c.done; }
        } else if (r) {
          if (inB) { ops.push(sb.from("shopping_items").delete().eq("id", r.id)); delete base.extras[k]; }
          else { ex.push({ t: r.name, done: !!r.done }); exChanged = true; pulled++; base.extras[k] = !!r.done; }
        } else delete base.extras[k];
      }
      if (exChanged) menu.extras = ex;

      if (authored.length && authored.length <= 15 && P.me) for (const row of authored) row.added_by = P.me;
      const res = await Promise.all(ops);
      const bad = res.find(r => r && r.error);
      if (bad) throw bad.error;
      menu.mzBase = base;
      if (JSON.stringify([menu.weeks, menu.extras, menu.checked, menu.mzBase]) !== before) {
        P.skip = true; saveMenu();
        if (typeof render === "function") render();
        if (pulled && typeof toast === "function") toast("🏠 Mis à jour depuis Maisonnée");
      }
    } catch (e) { console.warn("Pont Maisonnée :", e); }
    finally { P.busy = false; P.userEdit = false; if (P.again) { P.again = false; soon(1500); } }
  }
  function soon(ms) { clearTimeout(P.timer); P.timer = setTimeout(pontSync, ms); }

  /* ---------- when to sync: after the Carnet's own cloud sync, after each change, every minute ---------- */
  if (typeof saveMenu === "function") {
    const orig = saveMenu;
    window.saveMenu = function () { const r = orig.apply(this, arguments); if (P.skip) P.skip = false; else { P.userEdit = true; soon(3000); } return r; };
  }
  if (typeof cloudSync === "function") {
    const orig = cloudSync;
    window.cloudSync = async function () { const r = await orig.apply(this, arguments); if (!cloud.msg) P.cloudOk = true; soon(400); return r; };
  }
  // the hidden copy of the Carnet inside Maisonnée only syncs while Maisonnée's Repas page is open
  const bgIdle = () => { try { return window.frameElement && !(window.parent && window.parent.mzRepasActive); } catch (e) { return false; } };
  setInterval(() => { if (document.visibilityState === "visible" && !bgIdle()) pontSync(); }, 60e3);
  window.pontSync = pontSync;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addBackButton); else addBackButton();
  setTimeout(pontSync, 4000);
})();
