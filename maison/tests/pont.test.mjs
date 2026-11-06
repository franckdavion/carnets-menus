import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let fail = 0;
const ok = (name, cond) => { console.log((cond ? "ok  " : "FAIL ") + name); if (!cond) fail++; };
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

const order = ["carnet-calc.js", "carnet-base.js", "carnet-github.js", "carnet-semaine.js", "carnet-courses.js", "carnet-repas.js", "carnet-partage.js", "carnet-cloud.js", "maison/pont.js"];
const page = read("index.html");
// Les scripts sont chargés avec une version de cache : comparer les chemins sans ?v=...
const pageScripts = page.replace(/(src="[^"?]+)\?[^"]*(")/g, "$1$2");
let at = 0;
for (const file of order) {
  const i = pageScripts.indexOf(`src="${file}"`, at);
  ok("page charge " + file, i > at);
  if (i > at) at = i;
}
const sw = read("sw.js");
ok("cache du Carnet contient chaque fichier", order.filter(f => f !== "maison/pont.js").every(f => sw.includes(f)) && sw.includes("maison/pont.js") && /carnet-v\d+/.test(sw));
ok("l'ancien fichier unique n'est plus chargé", !page.includes('src="carnet.js"') && !fs.existsSync(path.join(root, "carnet.js")));

const carnet = order.filter(f => f.startsWith("carnet-")).map(read).join("\n");
for (const name of ["planWeek", "cloudOn", "cloudSync", "hashOf", "saveMenu", "shopping", "shopDates", "mondayOf", "parseYmd", "addDays", "slotKey"]) {
  ok("le Carnet expose " + name, new RegExp("function " + name + "\\b|const " + name + "=").test(carnet));
}
ok("le pont revient vers Maisonnée", read("maison/pont.js").includes('a.href = "maison/"') && read("maison/pont.js").includes("window.pontSync = pontSync"));
ok("Maisonnée ouvre le Carnet", read("maison/app.js").includes('const CARNET_URL = "../"'));
ok("Repas charge le Carnet en arrière-plan", read("maison/repas.js").includes("f.src = CARNET_URL") && read("maison/repas.js").includes("mzRepasActive"));
ok("une feuille Maisonnée allégée", read("maison/maison.css").split("!important").length - 1 < 1800);

/* Session commune : contrôles sans compte réel, sans accès à Supabase. */
const appSource = read("maison/app.js");
const vm = await import("node:vm");
let validSyntax = true;
try { new vm.Script(appSource); } catch (e) { validSyntax = false; console.error(e); }
ok("Maisonnée : syntaxe JavaScript complète", validSyntax);
ok("session locale conservée et non effacée sur panne réseau",
  appSource.includes('storageKey: "cm_sb_auth"') &&
  appSource.includes('mzOfflineStartup("", false);') &&
  appSource.includes('if (error) throw error;'));
ok("retour d'Internet et réveil iPhone réessayent la session",
  appSource.includes('window.addEventListener("online"') &&
  appSource.includes('if (!user) return mzResumeCloudSession();'));
ok("carte de fidélité : erreur réseau distincte d'une session absente",
  appSource.includes('if (auth.error) throw auth.error;') &&
  appSource.includes('if (!auth.data?.user) return { login: true };'));
ok("connexion manuelle possible sans vider le foyer",
  appSource.includes('data-v="login">Se reconnecter') &&
  appSource.includes('mode === "cloud" && S.hh ? "app" : "welcome"'));

const loadFn = /function loadSb\(\) \{[\s\S]*?\n\}/.exec(appSource)?.[0];
const resumeFn = /async function mzResumeCloudSession\(\) \{[\s\S]*?\n\}/.exec(appSource)?.[0];
ok("contrôleurs auth présents", !!loadFn && !!resumeFn);
if (loadFn && resumeFn) {
  let creations = 0;
  const loadEnv = {
    window: { supabase: { createClient: () => { creations++; return { name: "client" }; } } },
    setTimeout, clearTimeout
  };
  vm.runInNewContext(
    'let sb = null, sbLoading = null; const SB_URL="test", SB_KEY="test";\n' +
    loadFn + '\nthis.loadSb = loadSb;', loadEnv
  );
  const [first, second] = await Promise.all([loadEnv.loadSb(), loadEnv.loadSb()]);
  ok("deux chargements simultanés produisent un seul client",
    creations === 1 && first === second);

  let calls = 0, renders = 0, entered = 0, online = true;
  let session = null, err = null;
  const resumeEnv = {
    navigator: { get onLine() { return online; } },
    mode: "cloud", user: null, screen: "app", mzAuthNeedsLogin: false,
    mzAuthResumeRunning: null,
    sb: { auth: { getSession: async () => {
      calls++; return { data: { session }, error: err };
    } } },
    loadSb: async () => {}, render: () => { renders++; },
    enterCloud: async () => { entered++; }, console: { warn: () => {} }
  };
  vm.runInNewContext(resumeFn + '\nthis.resume = mzResumeCloudSession;\n' +
    'this.inspect = () => ({ user, mzAuthNeedsLogin });', resumeEnv);
  online = false;
  await resumeEnv.resume();
  ok("mode avion : pas de demande Supabase", calls === 0 && renders === 0);
  online = true;
  err = new Error("Réseau indisponible");
  await resumeEnv.resume();
  ok("panne réseau : aucune fausse demande de connexion",
    calls === 1 && renders === 0 && !resumeEnv.inspect().mzAuthNeedsLogin);
  err = null;
  await resumeEnv.resume();
  await resumeEnv.resume();
  ok("session absente : bandeau de connexion affiché une seule fois",
    calls === 3 && renders === 1 && resumeEnv.inspect().mzAuthNeedsLogin);
  session = { user: { id: "utilisateur-fictif" } };
  await resumeEnv.resume();
  ok("session rétablie : récupération du foyer sans mot de passe",
    entered === 1 && resumeEnv.inspect().user?.id === "utilisateur-fictif" &&
    !resumeEnv.inspect().mzAuthNeedsLogin);
}

if (fail) { console.log(fail + " échec(s)"); process.exit(1); }
console.log("pont ok");
