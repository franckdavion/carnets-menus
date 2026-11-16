"use strict";
/* Maisonnée : quand le carnet commun change, projeter les repas vers meals (tous les écrans, même accueil). */
(() => {
  let ch = null, t = null, inflight = false, again = false;

  async function projectFromState(menu) {
    if (mode !== "cloud" || !sb || !S.hh || !S.hh.id || !S.hh.carnet_user || !menu || typeof MzMeals === "undefined") return;
    if (inflight) { again = true; return; }
    inflight = true;
    try {
      const recipes = {};
      if (S.recipes) for (const r of S.recipes) if (r.legacy_id) recipes[r.legacy_id] = { name: r.name };
      await MzMeals.projectMeals(sb, S.hh.id, menu, recipes);
      try { await loadCloud(S.hh.id); } catch (e) { console.warn("Rechargement repas", e); }
      softRender();
    } catch (e) { console.warn("Projection repas", e); }
    finally {
      inflight = false;
      if (again) { again = false; setTimeout(() => projectFromState(menu), 400); }
    }
  }

  function mealsLive() {
    const owner = S.hh && S.hh.carnet_user;
    if (mode !== "cloud" || !sb || !owner) return;
    if (ch) { sb.removeChannel(ch); ch = null; }
    ch = sb.channel("meals-proj-" + owner)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_state", filter: "user_id=eq." + owner }, p => {
        const menu = p.new && p.new.menu && p.new.menu.menu;
        if (!menu) return;
        clearTimeout(t);
        t = setTimeout(() => projectFromState(menu), 600);
      })
      .subscribe();
  }

  const origEnter = typeof enterCloud === "function" ? enterCloud : null;
  if (origEnter) {
    window.enterCloud = async function () {
      await origEnter.apply(this, arguments);
      mealsLive();
    };
  }
  window.mzMealsLive = mealsLive;
})();