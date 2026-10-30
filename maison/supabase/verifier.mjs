// Vérifie le dépôt avant un déploiement des fonctions.
// Ne contacte pas Supabase : les secrets vivent dans le projet, pas dans les fichiers.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const maison = path.resolve(here, "..");
const root = path.resolve(maison, "..");
let fail = 0;
const ok = (name, cond) => { console.log((cond ? "ok  " : "FAIL ") + name); if (!cond) fail++; };
const text = (abs) => fs.readFileSync(abs, "utf8");

const cal = text(path.join(here, "functions/_shared/cal.js"));
ok("cal.js expose MaisonCal", cal.includes("root.MaisonCal = api") && cal.includes("function repeatRule") && cal.includes("function nextDue"));

const push = text(path.join(here, "functions/maison-push-dispatch/index.ts"));
ok("push importe cal.js", push.includes('import "../_shared/cal.js"'));
ok("push refuse sans x-cron-secret", push.includes('req.headers.get("x-cron-secret")') && push.includes("CRON_SECRET"));
ok("push refuse sans clés VAPID", push.includes("VAPID secrets missing") && push.includes("VAPID_PRIVATE_KEY"));
ok("push compte les échecs Google", push.includes("googleFailed"));
ok("push écrit l'erreur sur le foyer", push.includes("google_tasks") && push.includes("err"));

const gcal = text(path.join(here, "functions/google-calendar/index.ts"));
ok("google-calendar signe le state", gcal.includes("crypto.subtle.verify") && gcal.includes("HMAC"));
ok("google-calendar n'ouvre le calendrier qu'à l'utilisateur connecté", gcal.includes("userFrom") && gcal.includes("Unauthorized"));

const sql16 = text(path.join(maison, "supabase/migrations/0016_events_repeat_custom.sql"));
ok("répétition custom autorisée", sql16.includes("events_repeat_check") && sql16.includes("custom:"));
const sql17 = text(path.join(maison, "supabase/migrations/0017_household_home.sql"));
ok("colonne home accordée au foyer", sql17.includes("add column if not exists home") && sql17.includes("grant update (home)"));

const page = text(path.join(maison, "index.html"));
ok("page Maisonnée : une feuille et l'accueil", page.includes('href="maison.css"') && page.includes('src="accueil.js"') && page.includes('src="supabase/functions/_shared/cal.js"'));
ok("page Maisonnée sans les anciennes feuilles", !/ultimate\.css|design-stable\.css|v3-icons/.test(page));
const sw = text(path.join(maison, "sw.js"));
ok("cache Maisonnée aligné", sw.includes("maison.css") && sw.includes("accueil.js") && sw.includes("supabase/functions/_shared/cal.js") && sw.includes("carnet-archive-maison-v64"));

const carnet = text(path.join(root, "index.html"));
const carnetSw = text(path.join(root, "sw.js"));
ok("Carnet découpé", carnet.includes('href="carnet.css"') && carnet.includes('src="carnet-calc.js"') && carnet.includes('src="carnet-cloud.js"') && carnet.includes('src="maison/pont.js"') && !carnet.includes('src="carnet.js"'));
ok("cache Carnet aligné", carnetSw.includes("carnet.css") && carnetSw.includes("carnet-calc.js") && carnetSw.includes("carnet-courses.js") && carnetSw.includes("carnet-v203"));

for (const name of ["ultimate.css", "ultimate.js", "ultimate-modules.js", "v3-icons-and-add-position.js", "presences.css", "design-stable.css"]) {
  ok("retiré " + name, !fs.existsSync(path.join(maison, name)));
}
ok("pas de copie d'octobre dans le site", !fs.existsSync(path.join(root, "version-23-octobre")) && !fs.existsSync(path.join(root, "version-etape-1")));
ok("carnet.json hors du site", !fs.existsSync(path.join(root, "carnet.json")) && fs.existsSync(path.join(root, "..", "carnets-donnees", "carnet.json")));

const secrets = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "CRON_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
ok("noms de secrets attendus par les fonctions", secrets.every(s => push.includes(s) || gcal.includes(s)));
console.log("Secrets à avoir dans Supabase, pas dans le dépôt : " + secrets.join(", "));

if (fail) { console.log(fail + " échec(s)"); process.exit(1); }
console.log("vérification ok");
