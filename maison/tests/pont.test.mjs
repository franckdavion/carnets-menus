import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let fail = 0;
const ok = (name, cond) => { console.log((cond ? "ok  " : "FAIL ") + name); if (!cond) fail++; };
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

const order = ["carnet-calc.js", "carnet-base.js", "carnet-github.js", "carnet-semaine.js", "carnet-courses.js", "carnet-repas.js", "carnet-partage.js", "carnet-cloud.js", "maison/pont.js"];
const page = read("index.html");
let at = 0;
for (const file of order) {
  const i = page.indexOf(`src="${file}"`, at);
  ok("page charge " + file, i > at);
  if (i > at) at = i;
}
const sw = read("sw.js");
ok("cache du Carnet contient chaque fichier", order.filter(f => f !== "maison/pont.js").every(f => sw.includes(f)) && sw.includes("maison/pont.js") && sw.includes("carnet-v207"));
ok("l'ancien fichier unique n'est plus chargé", !page.includes('src="carnet.js"') && !fs.existsSync(path.join(root, "carnet.js")));

const carnet = order.filter(f => f.startsWith("carnet-")).map(read).join("\n");
for (const name of ["planWeek", "cloudOn", "cloudSync", "hashOf", "saveMenu", "shopping", "shopDates", "mondayOf", "parseYmd", "addDays", "slotKey"]) {
  ok("le Carnet expose " + name, new RegExp("function " + name + "\\b|const " + name + "=").test(carnet));
}
ok("le pont revient vers Maisonnée", read("maison/pont.js").includes('a.href = "maison/"') && read("maison/pont.js").includes("window.pontSync = pontSync"));
ok("Maisonnée ouvre le Carnet", read("maison/app.js").includes('const CARNET_URL = "../"'));
ok("Repas charge le Carnet en arrière-plan", read("maison/repas.js").includes("f.src = CARNET_URL") && read("maison/repas.js").includes("mzRepasActive"));
ok("une feuille Maisonnée allégée", read("maison/maison.css").split("!important").length - 1 < 1697);

if (fail) { console.log(fail + " échec(s)"); process.exit(1); }
console.log("pont ok");
