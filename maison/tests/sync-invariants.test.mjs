import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let fail = 0;
const ok = (name, cond) => { console.log((cond ? "ok  " : "FAIL ") + name); if (!cond) fail++; };
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

const pont = read("maison/pont.js");
ok("pont : jamais effacer extra carnet faute de ligne DB", /Carnet a l'article/.test(pont) && pont.includes("shopInsert") && !/c && !r && inB[\s\S]*ex\.filter/.test(pont));
ok("pont : garde carnetLooksEmpty + recipesReady", pont.includes("carnetLooksEmpty") && pont.includes("recipesReady"));
ok("pont : fenêtre editUntil après saveMenu", pont.includes("editUntil") && pont.includes("90e3"));
ok("pont : mzRepasActive via bgIdle parent", pont.includes("mzRepasActive"));

const repas = read("maison/repas.js");
ok("repas : accueil dans mzRepasActive", /view === "home"/.test(repas) && repas.includes("mzRepasActive"));
ok("repas : compteur courses aligné carnet", repas.includes("mzShopTodoCount") && repas.includes("mzCarnetShopTodo"));

const modules = read("maison/modules.js");
const accueil = read("maison/accueil.js");
ok("accueil / modules : compteur via carnet si relié", modules.includes("mzShopTodoCount") && accueil.includes("mzShopTodoCount"));

ok("courses : pas de fusion cxMergeShop", !read("maison/courses.js").includes("cxMergeShop"));

const swM = read("maison/sw.js");
ok("cache Maisonnée à jour", swM.includes("carnet-archive-maison-v198"));

if (fail) { console.log(fail + " échec(s)"); process.exit(1); }
console.log("sync-invariants ok");