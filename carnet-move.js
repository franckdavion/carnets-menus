"use strict";
/* Déplacer, échanger ou remplacer un repas planifié (toutes semaines, tous états).
   Ne pas appeler releaseMeal sur un simple déplacement : le bloc repas garde lock, achats, etc. */
(() => {
  let moveCtx = null, moveMonth = null, moveSel = null, moveMeal = "soir", moveConflict = null;

  function getMealSlot(w, k) { return ((menu.weeks || {})[w] || {})[k] || null; }

  function mealSlotFromDate(dateYmd, meal) {
    const d = parseYmd(dateYmd), w = ymd(mondayOf(d)), dn = DAYS[(d.getDay() + 6) % 7];
    return { w, k: slotKey(dn, meal), date: dateYmd, dn };
  }

  function planningTitle(w, k, s) {
    if (!s) return "";
    if (typeof slotDishName === "function") { const n = slotDishName(s); if (n) return n; }
    if (s.note) return s.note;
    if (s.left) return "Restes : " + s.left;
    return "Repas planifié";
  }

  function dayPlanningOn(dateYmd) {
    const d = parseYmd(dateYmd), w = ymd(mondayOf(d)), dn = DAYS[(d.getDay() + 6) % 7], wk = (menu.weeks || {})[w] || {};
    const past = dateYmd < ymd(new Date());
    return MEALS.map(([m, lab]) => {
      const k = slotKey(dn, m), s = wk[k];
      return { m, lab, k, w, s, past, used: slotUsed(s), title: planningTitle(w, k, s) };
    });
  }

  function ensureShopDaysForWeeks(weeks) {
    for (const w of weeks) {
      const wk = (menu.weeks || {})[w] || {};
      for (const [k, s] of Object.entries(wk)) {
        if (s && s.lock && typeof cmEnsureShoppingDay === "function") {
          const prev = curWeek;
          try { curWeek = w; cmEnsureShoppingDay(k); } finally { curWeek = prev; }
        }
      }
    }
  }

  function slotDateYmd(w, k) {
    const i = DAYS.indexOf(String(k).split("|")[0]);
    if (i < 0) return "";
    return ymd(addDays(parseYmd(w + "T12:00:00"), i));
  }

  function moveSlotsFingerprint(slots) {
    return (slots || []).map(s => `${s.w}|${s.k}|${JSON.stringify(getMealSlot(s.w, s.k))}`).join(";");
  }

  function applyMealRelocation(opts) {
    if (!opts || !opts.fromW || !opts.fromK || !opts.toW || !opts.toK) return { ok: false, code: "args" };
    const toDate = opts.toDate || slotDateYmd(opts.toW, opts.toK);
    if (toDate && toDate < ymd(new Date())) return { ok: false, code: "past" };
    const snapMenu = JSON.parse(JSON.stringify(menu));
    const mode = opts.mode || "move";
    const vict = getMealSlot(opts.toW, opts.toK);
    if (mode === "replace" && vict && slotUsed(vict) && typeof detachRemovedMealPurchases === "function") {
      detachRemovedMealPurchases(opts.toW, opts.toK);
    }
    const core = relocateMealSlots(menu, recipes, opts);
    if (!core.ok) {
      menu.weeks = snapMenu.weeks;
      menu.bought = snapMenu.bought;
      menu.checked = snapMenu.checked;
      menu.checkedQty = snapMenu.checkedQty;
      return core;
    }
    ensureShopDaysForWeeks([opts.fromW, opts.toW]);
    core.afterFp = moveSlotsFingerprint(core.undo);
    return Object.assign({ ok: true }, core);
  }

  function showMoveUndo(label, snap) {
    undoStack.push(snap);
    if (undoStack.length > 20) undoStack.shift();
    const bar = $("#undoBar");
    $("#undoText").textContent = label;
    bar.hidden = false;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { bar.hidden = true; }, 12000);
  }

  function finishMove(opts, core, label) {
    saveMenu();
    if (opts.fromW === curWeek && typeof flashSlot === "function") flashSlot(opts.fromK);
    if (opts.toW === curWeek && opts.fromK !== opts.toK && typeof flashSlot === "function") flashSlot(opts.toK);
    if (opts.fromW !== curWeek && opts.toW === curWeek) { curWeek = opts.toW; LS.set("cm_week", curWeek); }
    const snap = {
      type: "move",
      slots: core.undo,
      afterFp: core.afterFp,
      shopBefore: typeof shopping === "function" ? JSON.stringify(shopping(true).map(i => [i.key, i.q])) : "",
      boughtSnap: JSON.parse(JSON.stringify(menu.bought || {})),
      checkedSnap: JSON.parse(JSON.stringify(menu.checked || {})),
      checkedQtySnap: JSON.parse(JSON.stringify(menu.checkedQty || {}))
    };
    showMoveUndo(label, snap);
    $("#moveSheet").hidden = true;
    $("#moveConflict").hidden = true;
    moveCtx = null; moveConflict = null;
    render();
    toast(label);
  }

  function tryMove(mode) {
    if (!moveCtx || !moveSel) return;
    const dest = mealSlotFromDate(moveSel, moveMeal);
    const opts = { fromW: moveCtx.w, fromK: moveCtx.k, toW: dest.w, toK: dest.k, toDate: moveSel, mode: mode || "move" };
    const snapMenu = JSON.parse(JSON.stringify(menu));
    const beforeShop = typeof shopping === "function" ? shopping(true).map(i => [i.key, i.q]) : [];
    const core = applyMealRelocation(opts);
    if (core.needChoice) {
      const victim = getMealSlot(dest.w, dest.k);
      moveConflict = { opts, victim, dest };
      renderMoveConflict();
      $("#moveConflict").hidden = false;
      return;
    }
    if (!core.ok) {
      if (core.code === "past") toast("Choisissez une date à venir.");
      else if (core.code === "same") toast("C'est déjà ce créneau.");
      else toast("Déplacement impossible pour l'instant.");
      return;
    }
    const afterShop = typeof shopping === "function" ? shopping(true).map(i => [i.key, i.q]) : [];
    const shopOk = JSON.stringify(beforeShop) === JSON.stringify(afterShop);
    const fromName = planningTitle(moveCtx.w, moveCtx.k, getMealSlot(moveCtx.w, moveCtx.k));
    const lab = `${fromName} → ${dest.dn} ${moveMeal === "midi" ? "midi" : "soir"} (${shortDate(parseYmd(moveSel))})`;
    if (!shopOk && (opts.mode === "move" || opts.mode === "swap")) {
      menu.weeks = snapMenu.weeks;
      menu.bought = snapMenu.bought;
      menu.checked = snapMenu.checked;
      menu.checkedQty = snapMenu.checkedQty;
      toast("Déplacement annulé : les besoins en courses auraient changé de façon incohérente.");
      return;
    }
    finishMove(opts, core, "✓ " + lab);
  }

  function renderMoveConflict() {
    if (!moveConflict) return;
    const v = moveConflict.victim, vn = planningTitle(moveConflict.dest.w, moveConflict.dest.k, v);
    const from = getMealSlot(moveCtx.w, moveCtx.k), fn = planningTitle(moveCtx.w, moveCtx.k, from);
    let warn = "";
    if (v && typeof cmShopBought === "function" && cmShopBought(v)) {
      warn = `<p class="note">« ${esc(vn)} » a des ingrédients déjà achetés : ils restent au stock (rien ne repart aux courses).</p>`;
    } else if (v && v.lock) {
      warn = `<p class="note">« ${esc(vn)} » est dans les courses : seuls les ingrédients pas encore achetés sortiront de la liste.</p>`;
    }
    $("#moveConflictBody").innerHTML = `<p><b>${esc(fn)}</b> → <b>${esc(moveConflict.dest.dn)} ${moveMeal === "midi" ? "midi" : "soir"}</b> est déjà pris par <b>${esc(vn)}</b>.</p>${warn}
      <div class="move-conflict-btns">
        <button type="button" class="btn primary block" data-act="moveDo" data-mode="replace">Remplacer « ${esc(vn)} »</button>
        <button type="button" class="btn block" data-act="moveDo" data-mode="swap">Échanger les deux repas</button>
        <button type="button" class="btn ghost block" data-act="moveCancel">Annuler</button>
      </div>`;
  }

  function renderMoveCal() {
    const t = new Date(), m0 = moveMonth || new Date(t.getFullYear(), t.getMonth(), 1);
    moveMonth = m0;
    $("#moveTitle").textContent = m0.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const first = mondayOf(m0), cells = [], today = ymd(new Date());
    for (let i = 0; i < 42; i++) {
      const d = addDays(first, i);
      if (i >= 35 && d.getMonth() !== m0.getMonth()) break;
      cells.push(d);
    }
    const sel = moveSel || "";
    $("#moveCal").innerHTML = ["L", "M", "M", "J", "V", "S", "D"].map(x => `<span class="wd">${x}</span>`).join("")
      + cells.map(d => {
        const out = d.getMonth() !== m0.getMonth(), k = ymd(d), fut = k >= today, has = dayPlanningOn(k).some(x => x.used);
        return `<button type="button" data-act="moveDay" data-d="${k}" class="${has ? "has" : ""}${k === today ? " today" : ""}${k === sel ? " sel" : ""}${!fut ? " past-day" : ""}" ${out || !fut ? "disabled" : ""}>${d.getDate()}<span class="pt"></span></button>`;
      }).join("");
    renderMoveDay();
  }

  function renderMoveDay() {
    const box = $("#moveDay");
    if (!moveSel) { box.innerHTML = `<p class="muted">Choisissez une date future dans le calendrier.</p>`; return; }
    const sd = parseYmd(moveSel), slots = dayPlanningOn(moveSel);
    const from = moveCtx && getMealSlot(moveCtx.w, moveCtx.k);
    const fn = from ? planningTitle(moveCtx.w, moveCtx.k, from) : "";
    box.innerHTML = `<p><strong style="text-transform:capitalize">${esc(sd.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}</strong></p>
      <p class="muted small">Déplacer <b>${esc(fn)}</b> · choisissez midi ou soir</p>
      <div class="move-slots">${slots.map(s => {
        const same = moveCtx && moveCtx.w === s.w && moveCtx.k === s.k;
        const free = !s.used;
        const on = moveMeal === s.m;
        return `<button type="button" class="move-slot${on ? " on" : ""}${free ? " free" : " busy"}" data-act="movePickMeal" data-m="${s.m}" ${same ? "disabled" : ""}>
          <span class="move-slot-l">${s.lab}</span>
          <span class="move-slot-t">${same ? "Ce repas (origine)" : free ? "Libre" : esc(s.title)}</span>
        </button>`;
      }).join("")}</div>
      <div class="btns" style="margin-top:12px"><button type="button" class="btn primary block" data-act="moveGo" ${slots.find(s => s.m === moveMeal && !(moveCtx && moveCtx.w === s.w && moveCtx.k === s.k)) ? "" : "disabled"}>Déplacer ici</button></div>`;
  }

  function openMealMove(w, k) {
    const s = getMealSlot(w, k);
    if (!s || !slotUsed(s)) { toast("Rien à déplacer sur ce créneau."); return; }
    if (slotDateYmd(w, k) < ymd(new Date())) { toast("Ce repas est passé : notez-le ou modifiez le calendrier sur un autre créneau."); return; }
    moveCtx = { w, k };
    moveMonth = null;
    moveSel = null;
    moveMeal = k.split("|")[1] === "midi" ? "midi" : "soir";
    moveConflict = null;
    $("#moveFrom").textContent = planningTitle(w, k, s) + " · " + slotLabel(k) + (w !== curWeek ? " (sem. " + shortDate(parseYmd(w)) + ")" : "");
    renderMoveCal();
    $("#moveConflict").hidden = true;
    $("#moveSheet").hidden = false;
    $("#moveSheet .sheet-in").scrollTop = 0;
  }

  window.openMealMove = openMealMove;
  window.applyMealRelocation = applyMealRelocation;
  window.dayPlanningOn = dayPlanningOn;
  window.getMealSlot = getMealSlot;
  window.planningTitle = planningTitle;
  window.mealSlotFromDate = mealSlotFromDate;

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-act^='move']");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "closeMove") { $("#moveSheet").hidden = true; moveCtx = null; return; }
    if (a === "moveMonth") { moveMonth = addDays(moveMonth || new Date(), Number(b.dataset.d) * 28); moveMonth = new Date(moveMonth.getFullYear(), moveMonth.getMonth(), 1); renderMoveCal(); return; }
    if (a === "moveDay") { moveSel = b.dataset.d; renderMoveCal(); return; }
    if (a === "movePickMeal") { moveMeal = b.dataset.m; renderMoveDay(); return; }
    if (a === "moveGo") { tryMove("move"); return; }
    if (a === "moveDo") { tryMove(b.dataset.mode); return; }
    if (a === "moveCancel") { $("#moveConflict").hidden = true; moveConflict = null; return; }
  });
})();