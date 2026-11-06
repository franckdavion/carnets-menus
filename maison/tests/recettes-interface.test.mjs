// Tests autonomes de l'interface Recettes sur la branche test.
// Aucun navigateur, compte, appel réseau ni écriture de données.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const html = read("index.html");
const js = read("carnet-partage.js");
const css = read("carnet.css");
const recipes = read("carnet-semaine.js");
let count = 0;
const check = (label, fn) => { fn(); count++; console.log("✓ " + label); };

check("syntaxe des scripts Recettes", () => {
  for (const p of ["carnet-partage.js", "carnet-semaine.js", "carnet-courses.js", "carnet-cloud.js", "carnet-base.js", "carnet-repas.js"]) {
    new vm.Script(read(p), { filename: p });
  }
});

check("tous les identifiants HTML sont uniques", () => {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, "Identifiant HTML dupliqué");
  for (const id of ["v-rec", "recList", "recActions", "recWebPanel", "findForm", "q", "favQuick", "filtBtn"]) {
    assert.equal(ids.filter(x => x === id).length, 1, "Identifiant absent : " + id);
  }
});

check("menu Ajouter et navigation Recettes conservés", () => {
  for (const action of ["newRecipe", "goFind", "impOpen", "impPaste", "openReview", "recActionsClose", "recLayout", "recAll", "kindFav", "openFilt"]) {
    assert.ok(html.includes('data-act="' + action + '"'), "Bouton absent : " + action);
  }
  assert.ok(js.includes('if(a==="recActionsClose")'));
  assert.ok(js.includes('else if(a==="recAll")'));
  assert.ok(js.includes('else if(a==="goFind")'));
});

check("styles liste, galerie et photographie", () => {
  for (const selector of ["#recList.rec-gallery", "#v-rec .rec-actions-backdrop", "#v-rec .rec-actions-menu", "#recSheet .rp img"]) {
    assert.ok(css.includes(selector), "Style absent : " + selector);
  }
  assert.ok(css.includes("aspect-ratio:3/2"));
  assert.ok(recipes.includes('const el=$("#recList");'));
  assert.ok(recipes.includes("el.innerHTML="));
});

const start = js.indexOf("function applyRecLayout(){");
const end = js.indexOf("\napplyRecLayout();", start);
assert.ok(start >= 0 && end > start, "Fonction applyRecLayout introuvable");
const applySource = js.slice(start, end);
const saved = new Map();
const classes = new Set();
const controls = ["list", "gallery"].map(v => ({
  dataset: { v }, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; }
}));
const document = { querySelectorAll: () => controls };
const $ = selector => selector === "#recList"
  ? { classList: { toggle(name, on) { on ? classes.add(name) : classes.delete(name); } } }
  : null;
const LS = { get(key, fallback) { return saved.get(key) ?? fallback; }, set(key, value) { saved.set(key, value); } };
const apply = new Function("LS", "$", "document", applySource + "\nreturn applyRecLayout;")(LS, $, document);

check("liste par défaut", () => {
  apply();
  assert.ok(!classes.has("rec-gallery"));
  assert.equal(controls[0].attrs["aria-pressed"], "true");
  assert.equal(controls[1].attrs["aria-pressed"], "false");
});

check("passage en galerie et mémorisation du choix", () => {
  LS.set("cm_rec_layout", "gallery");
  apply();
  assert.ok(classes.has("rec-gallery"));
  assert.equal(controls[0].attrs["aria-pressed"], "false");
  assert.equal(controls[1].attrs["aria-pressed"], "true");
});

check("retour en liste sans altérer les recettes", () => {
  LS.set("cm_rec_layout", "list");
  apply();
  assert.ok(!classes.has("rec-gallery"));
  assert.equal(controls[0].attrs["aria-pressed"], "true");
});

console.log("\n" + count + " contrôles de l'interface Recettes validés (sans modification de données).");
