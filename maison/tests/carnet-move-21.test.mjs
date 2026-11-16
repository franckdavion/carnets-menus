/**
 * 21 scénarios de validation — déplacement / remplacement / échange / achats / annulation.
 * Exécution : node maison/tests/carnet-move-21.test.mjs
 */
import {
  applyMealRelocationHarness,
  deepCloneMenu,
  fingerprintFromUndo,
  makeMenu,
  persistRoundtrip,
  recipesFixtures,
  shoppingSig,
  shoppingState,
  totalBoughtCredits,
  undoMoveHarness,
  useRecipes
} from "../../scripts/move-test-harness.mjs";

let fail = 0;
const scenarios = [];
const ok = (id, name, cond, detail = "") => {
  const pass = !!cond;
  scenarios.push({ id, name, pass, detail: pass ? "" : detail });
  console.log((pass ? "ok  " : "FAIL ") + `${id}. ${name}` + (detail && !pass ? " — " + detail : ""));
  if (!pass) fail++;
};

const R = {
  lasagnes: recipesFixtures.lasagnes,
  poulet: recipesFixtures.poulet,
  riz: recipesFixtures.riz,
  sharedA: recipesFixtures.sharedA,
  sharedB: recipesFixtures.sharedB
};
useRecipes(R);

const until = "2027-06-30";
const W1 = "2026-11-17";
const W2 = "2026-11-24";
const Wfar = "2026-02-09";
const get = (m, w, k) => ((m.weeks || {})[w] || {})[k] || null;
const patesKey = "pâtes|g";

// 1. Déplacement simple vers créneau libre (repas proposé, non validé courses)
{
  const m = makeMenu({
    weeks: { [W1]: { "Mercredi|midi": { id: "lasagnes", n: 4, label: "Lasagnes" } } }
  });
  const shop0 = shoppingSig(m, R);
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Mercredi|midi", toW: W1, toK: "Vendredi|soir", mode: "move"
  });
  ok(1, "Déplacement vers créneau libre", r.ok && get(m, W1, "Vendredi|soir")?.id === "lasagnes" && !get(m, W1, "Mercredi|midi"));
  ok(1, "… courses inchangées", shoppingSig(m, R) === shop0);
}

// 2. Déplacement repas « en courses » (lock)
{
  const m = makeMenu({
    weeks: { [W1]: { "Lundi|midi": { id: "lasagnes", n: 4, lock: true, label: "Lasagnes" } } }
  });
  const need0 = { ...shoppingState(m, R).need };
  const r = applyMealRelocationHarness(m, R, { fromW: W1, fromK: "Lundi|midi", toW: W1, toK: "Mardi|soir", mode: "move" });
  ok(2, "Déplacement repas en courses", r.ok && get(m, W1, "Mardi|soir")?.lock);
  ok(2, "… besoins identiques", JSON.stringify(shoppingState(m, R).need) === JSON.stringify(need0));
}

// 3. Déplacement repas entièrement acheté
{
  const m = makeMenu({
    weeks: {
      [W1]: {
        "Mercredi|midi": {
          id: "lasagnes", n: 4, lock: true, shopBought: true, mealState: "Courses faites", label: "Lasagnes"
        }
      }
    },
    bought: { [patesKey]: { q: 500, until } }
  });
  const credits0 = totalBoughtCredits(m);
  const r = applyMealRelocationHarness(m, R, { fromW: W1, fromK: "Mercredi|midi", toW: W2, toK: "Jeudi|soir", mode: "move" });
  ok(3, "Déplacement repas entièrement acheté", r.ok && get(m, W2, "Jeudi|soir")?.shopBought);
  ok(3, "… crédits achetés conservés", totalBoughtCredits(m) === credits0);
  ok(3, "… pâtes hors liste à acheter", !(patesKey in shoppingState(m, R).need));
}

// 4. Déplacement partiellement acheté
{
  const m = makeMenu({
    weeks: { [W1]: { "Vendredi|midi": { id: "lasagnes", n: 4, lock: true, label: "Lasagnes" } } },
    bought: { [patesKey]: { q: 200, until } },
    checked: { [patesKey]: true }
  });
  const r = applyMealRelocationHarness(m, R, { fromW: W1, fromK: "Vendredi|midi", toW: W1, toK: "Samedi|soir", mode: "move" });
  const need = shoppingState(m, R).need[patesKey] || 0;
  ok(4, "Déplacement partiellement acheté", r.ok && get(m, W1, "Samedi|soir")?.lock);
  ok(4, "… reste à acheter cohérent", need > 0 && need < 500);
  ok(4, "… crédit partiel conservé", (m.bought[patesKey]?.q || 0) === 200);
}

// 5. Même semaine, créneaux différents
{
  const m = makeMenu({ weeks: { [W1]: { "Lundi|soir": { id: "poulet", n: 4, lock: true } } } });
  const r = applyMealRelocationHarness(m, R, { fromW: W1, fromK: "Lundi|soir", toW: W1, toK: "Dimanche|midi", mode: "move" });
  ok(5, "Déplacement même semaine", r.ok && get(m, W1, "Dimanche|midi")?.id === "poulet");
}

// 6. Semaine suivante
{
  const m = makeMenu({
    weeks: {
      [W1]: { "Mercredi|midi": { id: "riz", n: 4, lock: true } },
      [W2]: {}
    }
  });
  const sig0 = shoppingSig(m, R);
  const r = applyMealRelocationHarness(m, R, { fromW: W1, fromK: "Mercredi|midi", toW: W2, toK: "Mercredi|midi", mode: "move" });
  ok(6, "Déplacement semaine suivante", r.ok && get(m, W2, "Mercredi|midi")?.id === "riz");
  ok(6, "… courses globales stables", shoppingSig(m, R) === sig0);
}

// 7. Plusieurs mois
{
  const m = makeMenu({
    weeks: { [W1]: { "Lundi|midi": { id: "lasagnes", n: 4, shopBought: true, lock: true } } }
  });
  const r = applyMealRelocationHarness(m, R, { fromW: W1, fromK: "Lundi|midi", toW: Wfar, toK: "Mardi|soir", mode: "move" });
  ok(7, "Déplacement à plusieurs mois", r.ok && get(m, Wfar, "Mardi|soir")?.shopBought);
}

// 8. Remplacement victime sans achats
{
  const m = makeMenu({
    weeks: {
      [W1]: { "Mercredi|midi": { id: "lasagnes", n: 4, lock: true } },
      [W2]: { "Samedi|soir": { id: "poulet", n: 4, lock: true } }
    }
  });
  const need0 = JSON.stringify(shoppingState(m, R).need);
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Mercredi|midi", toW: W2, toK: "Samedi|soir", mode: "replace"
  });
  ok(8, "Remplacement sans achats victime", r.ok && get(m, W2, "Samedi|soir")?.id === "lasagnes");
  ok(8, "… poulet retiré du planning", !get(m, W2, "Samedi|soir") || get(m, W2, "Samedi|soir").id !== "poulet");
  ok(8, "… besoins non achetés poulet retirés", JSON.stringify(shoppingState(m, R).need) !== need0);
}

// 9. Remplacement victime en courses
{
  const m = makeMenu({
    weeks: {
      [W1]: {
        "Jeudi|midi": { id: "riz", n: 4, lock: true },
        "Jeudi|soir": { id: "poulet", n: 4, lock: true }
      }
    }
  });
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Jeudi|midi", toW: W1, toK: "Jeudi|soir", mode: "replace"
  });
  ok(9, "Remplacement victime en courses", r.ok && get(m, W1, "Jeudi|soir")?.id === "riz");
  const need = shoppingState(m, R).need;
  ok(9, "… plus de besoin poulet", !Object.keys(need).some(k => k.includes("poulet")));
}

// 10. Remplacement victime partiellement achetée (crédits conservés)
{
  const m = makeMenu({
    weeks: {
      [W1]: { "Mardi|midi": { id: "lasagnes", n: 4, lock: true } },
      [W2]: { "Samedi|soir": { id: "poulet", n: 4, lock: true } }
    },
    bought: { "poulet|pièce": { q: 1, until } }
  });
  const b0 = { ...m.bought };
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Mardi|midi", toW: W2, toK: "Samedi|soir", mode: "replace"
  });
  ok(10, "Remplacement partiellement acheté", r.ok);
  ok(10, "… achat poulet non perdu", (m.bought["poulet|pièce"]?.q || 0) >= (b0["poulet|pièce"]?.q || 0));
}

// 11. Remplacement victime entièrement achetée
{
  const m = makeMenu({
    weeks: {
      [W1]: { "Mercredi|soir": { id: "riz", n: 4, lock: true } },
      [W2]: {
        "Samedi|midi": {
          id: "poulet", n: 4, lock: true, shopBought: true, mealState: "Courses faites"
        }
      }
    },
    bought: { "poulet|pièce": { q: 1, until }, "pommes de terre|g": { q: 800, until } }
  });
  const credits = totalBoughtCredits(m);
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Mercredi|soir", toW: W2, toK: "Samedi|midi", mode: "replace"
  });
  ok(11, "Remplacement repas déjà acheté", r.ok && get(m, W2, "Samedi|midi")?.id === "riz");
  ok(11, "… stock victime conservé", totalBoughtCredits(m) >= credits - 1e-6);
}

// 12. Échange deux repas proposés
{
  const m = makeMenu({
    weeks: {
      [W1]: {
        "Lundi|midi": { id: "lasagnes", n: 4 },
        "Mardi|soir": { id: "poulet", n: 4 }
      }
    }
  });
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Lundi|midi", toW: W1, toK: "Mardi|soir", mode: "swap"
  });
  ok(12, "Échange deux proposés", r.ok && get(m, W1, "Lundi|midi")?.id === "poulet" && get(m, W1, "Mardi|soir")?.id === "lasagnes");
}

// 13. Échange deux en courses
{
  const m = makeMenu({
    weeks: {
      [W1]: { "Mercredi|midi": { id: "lasagnes", n: 4, lock: true }, "Jeudi|soir": { id: "poulet", n: 4, lock: true } }
    }
  });
  const sig = shoppingSig(m, R);
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Mercredi|midi", toW: W1, toK: "Jeudi|soir", mode: "swap"
  });
  ok(13, "Échange deux en courses", r.ok);
  ok(13, "… courses inchangées", shoppingSig(m, R) === sig);
}

// 14. Échange deux repas achetés
{
  const m = makeMenu({
    weeks: {
      [W1]: {
        "Vendredi|midi": { id: "lasagnes", n: 4, lock: true, shopBought: true },
        "Vendredi|soir": { id: "poulet", n: 4, lock: true, shopBought: true }
      }
    },
    bought: { [patesKey]: { q: 500, until }, "poulet|pièce": { q: 1, until } }
  });
  const c0 = totalBoughtCredits(m);
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Vendredi|midi", toW: W1, toK: "Vendredi|soir", mode: "swap"
  });
  ok(14, "Échange deux achetés", r.ok && get(m, W1, "Vendredi|midi")?.shopBought && get(m, W1, "Vendredi|soir")?.shopBought);
  ok(14, "… pas de double comptage crédits", Math.abs(totalBoughtCredits(m) - c0) < 1e-6);
}

// 15. Ingrédients communs (pâtes) — déplacement ne double pas
{
  const m = makeMenu({
    weeks: {
      [W1]: {
        "Lundi|midi": { id: "sharedA", n: 4, lock: true },
        "Mardi|midi": { id: "sharedB", n: 4, lock: true }
      }
    }
  });
  const q0 = shoppingState(m, R).need[patesKey] || 0;
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Lundi|midi", toW: W1, toK: "Mercredi|soir", mode: "move"
  });
  const q1 = shoppingState(m, R).need[patesKey] || 0;
  ok(15, "Ingrédient partagé", r.ok && Math.abs(q1 - q0) < 1e-6);
}

// 16. Annulation déplacement (undo)
{
  const m = makeMenu({ weeks: { [W1]: { "Mercredi|midi": { id: "lasagnes", n: 4, lock: true } } } });
  const shop0 = shoppingSig(m, R);
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Mercredi|midi", toW: W1, toK: "Jeudi|soir", mode: "move"
  });
  const snap = {
    undo: r.undo,
    afterFp: r.afterFp,
    shopBefore: shop0,
    boughtSnap: deepCloneMenu(m).bought,
    checkedSnap: deepCloneMenu(m).checked
  };
  const u = undoMoveHarness(m, R, snap);
  ok(16, "Annulation déplacement", u.ok && get(m, W1, "Mercredi|midi")?.id === "lasagnes");
  ok(16, "… courses restaurées", shoppingSig(m, R) === shop0);
}

// 17. Annulation remplacement
{
  const m = makeMenu({
    weeks: {
      [W1]: { "Lundi|soir": { id: "riz", n: 4, lock: true } },
      [W2]: { "Samedi|midi": { id: "poulet", n: 4, lock: true } }
    }
  });
  const shop0 = shoppingSig(m, R);
  const bought0 = deepCloneMenu(m).bought;
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Lundi|soir", toW: W2, toK: "Samedi|midi", mode: "replace"
  });
  const snap = { undo: r.undo, afterFp: r.afterFp, shopBefore: shop0, boughtSnap: bought0 };
  const u = undoMoveHarness(m, R, snap);
  ok(17, "Annulation remplacement", u.ok && get(m, W2, "Samedi|midi")?.id === "poulet");
}

// 18. Annulation échange
{
  const m = makeMenu({
    weeks: { [W1]: { "Mardi|midi": { id: "lasagnes", n: 4 }, "Mercredi|soir": { id: "poulet", n: 4 } } }
  });
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Mardi|midi", toW: W1, toK: "Mercredi|soir", mode: "swap"
  });
  const snap = { undo: r.undo, afterFp: r.afterFp };
  const u = undoMoveHarness(m, R, snap);
  ok(18, "Annulation échange", u.ok && get(m, W1, "Mardi|midi")?.id === "lasagnes");
}

// 19. Conflit sync / autre appareil (empreinte différente → undo refusé)
{
  const m = makeMenu({ weeks: { [W1]: { "Jeudi|midi": { id: "lasagnes", n: 4, lock: true } } } });
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Jeudi|midi", toW: W1, toK: "Vendredi|midi", mode: "move"
  });
  const snap = { undo: r.undo, afterFp: r.afterFp };
  get(m, W1, "Vendredi|midi").n = 6;
  const u = undoMoveHarness(m, R, snap);
  ok(19, "Détection conflit annulation", !u.ok && u.code === "conflict");
}

// 20. Échec moteur → menu non corrompu (rollback)
{
  const m = makeMenu({ weeks: { [W1]: { "Mercredi|midi": { id: "lasagnes", n: 4 } } } });
  const raw = JSON.stringify(m);
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Mercredi|midi", toW: W1, toK: "Mercredi|midi", mode: "move"
  });
  ok(20, "Échec sauvegarde / relocation invalide", !r.ok);
  ok(20, "… menu inchangé", JSON.stringify(m) === raw);
}

// 21. Persistance (fermeture / réouverture) + ingrédient acheté ne revient pas injustement
{
  const m = makeMenu({
    weeks: {
      [W1]: {
        "Samedi|midi": { id: "lasagnes", n: 4, lock: true, shopBought: true, mealState: "Courses faites" }
      }
    },
    bought: { [patesKey]: { q: 500, until } }
  });
  const r = applyMealRelocationHarness(m, R, {
    fromW: W1, fromK: "Samedi|midi", toW: W2, toK: "Dimanche|soir", mode: "move"
  });
  const reloaded = persistRoundtrip(m);
  ok(21, "Repas visible après roundtrip LS", get(reloaded, W2, "Dimanche|soir")?.shopBought);
  const need = shoppingState(reloaded, R).need;
  ok(21, "… ingrédient acheté absent des courses", !(patesKey in need));
  useRecipes(R);
  ok(21, "… empreinte undo stable", fingerprintFromUndo(reloaded, R, r.undo).length > 10);
}

const passed = scenarios.filter(s => s.pass).length;
const unique = [...new Set(scenarios.map(s => s.id))];
console.log("\n--- Bilan : " + passed + "/" + scenarios.length + " assertions, " + unique.length + " scénarios ---");

if (fail) {
  console.log(fail + " échec(s)");
  process.exit(1);
}
console.log("carnet-move-21 ok");