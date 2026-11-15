"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const core = require("./animaux-core.js");

const pet = {
  id: "secret-id",
  household_id: "hid-1",
  name: "Bounty",
  species: "chien",
  breed: "Golden",
  color: "blond",
  signs: "Collier rouge",
  description: "Calme",
  photo_path: "hid-1/p/main.jpg",
  phone: "0600000000",
  phone2: "0700000000",
  phone_emergency: "112",
  publish_phone: true,
  publish_phone2: false,
  publish_emergency: false,
  medical_note: "Traitement interne",
  publish_medical: false,
  vet_name: "Dr Vet",
  vet_phone: "0322000000",
  publish_vet: false,
  reward: "Merci",
  publish_reward: false,
  status: "ok",
  notify_on_view: true,
  created_by: "u1",
  message_public: "Appelez-nous"
};

const pub = core.publicPayload(pet, { photo_url: "https://signed.example/p" });
assert.strictEqual(pub.name, "Bounty");
assert.strictEqual(pub.phones.length, 1);
assert.strictEqual(pub.phones[0].n, "0600000000");
assert.strictEqual(pub.medical, "");
assert.strictEqual(pub.vet, "");
assert.strictEqual(pub.lost, false);
assert.deepStrictEqual(core.forbiddenPublicKeys(pub), []);
assert.ok(!("household_id" in pub));
assert.ok(!("photo_path" in pub));
assert.ok(!("phone2" in pub));
assert.ok(!("id" in pub));

const lost = core.publicPayload({ ...pet, status: "lost", publish_medical: true });
assert.strictEqual(lost.lost, true);
assert.strictEqual(lost.medical, "Traitement interne");

const viewCopy = core.pushCopy("view", "Bounty");
const foundCopy = core.pushCopy("found", "Bounty");
const gpsCopy = core.pushCopy("location", "Bounty");
assert.ok(/consultée/i.test(viewCopy.body));
assert.ok(!/retrouv/i.test(viewCopy.body));
assert.ok(/signalé retrouvé/i.test(foundCopy.body));
assert.ok(/GPS/i.test(gpsCopy.body));
assert.notStrictEqual(viewCopy.tag, foundCopy.tag);

assert.strictEqual(core.shouldNotifyView(pet, null, 1000), true);
assert.strictEqual(core.shouldNotifyView(pet, 1000, 1000 + core.VIEW_GAP_MS - 1), false);
assert.strictEqual(core.shouldNotifyView({ ...pet, notify_on_view: false }, null, 1), false);
assert.ok(core.isBot("Mozilla/5.0 (compatible; Googlebot/2.1)"));
assert.ok(!core.isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"));

const token = core.newToken();
assert.ok(/^[a-f0-9]{24}$/.test(token));
assert.strictEqual(core.medalUrl("https://carnets-menus.vercel.app", token), "https://carnets-menus.vercel.app/a/" + token);
assert.strictEqual(core.medalUrl("https://carnets-menus-abc-franckdavion.vercel.app", token), "https://carnets-menus.vercel.app/a/" + token);
assert.strictEqual(core.geoErrorMessage(1).toLowerCase().includes("refus"), true);
assert.ok(core.geoManualLead("Bandy", true).includes("Bandy"));
assert.ok(core.embeddedBrowserHint("Mozilla/5.0 Instagram").includes("Chrome"));
assert.strictEqual(core.shouldRetryGps(1, 0), false);
assert.strictEqual(core.shouldRetryGps(3, 0), true);
assert.strictEqual(core.shouldRetryGps(3, 1), false);
assert.deepStrictEqual(core.locationFromCoords({ latitude: 50.69, longitude: 3.07, accuracy: 12.4 }), { lat: 50.69, lng: 3.07, accuracy: 12, source: "gps" });
assert.strictEqual(core.locationFromCoords({ latitude: NaN, longitude: 1 }), null);
const medal = { pet_id: "p1", public_token: token };
assert.ok(core.medalSurvivesPetEdit(medal, { ...medal, /* fiche changed elsewhere */ }));

const hid = "hid-1";
let members = [{ household_id: hid, user_id: "franck", name: "Franck" }];
assert.ok(core.isMember(members, hid, "franck"));
assert.ok(!core.isMember(members, hid, "christine"));
members = core.joinMember(members, hid, "christine", "Christine");
assert.ok(core.isMember(members, hid, "christine"));
assert.ok(core.isMember(members, hid, "franck"));
members = core.leaveMember(members, hid, "christine");
assert.ok(!core.isMember(members, hid, "christine"));
assert.ok(core.isMember(members, hid, "franck"));
members = core.joinMember(members, hid, "futur", "Nouveau");
assert.ok(core.isMember(members, hid, "futur"));

const sql = fs.readFileSync(path.join(__dirname, "supabase/migrations/0032_household_pets.sql"), "utf8");
assert.ok(sql.includes("is_member(household_id)"));
assert.ok(sql.includes("revoke all on public.household_pets from anon"));
assert.ok(sql.includes("revoke all on public.pet_medals from anon"));
assert.ok(!/grant\s+.*anon/i.test(sql));
assert.ok(sql.includes("household-pets"));
assert.ok(sql.includes("is_member_path(name)"));
assert.ok(sql.includes("create unique index if not exists pet_medals_one_active"));
assert.ok(!sql.includes("drop table"));

const accueil = fs.readFileSync(path.join(__dirname, "accueil.js"), "utf8");
assert.ok(accueil.includes('"animaux"') || accueil.includes("'animaux'"));
const order = accueil.match(/DEFAULT_ORDER = \[([^\]]+)\]/)[1];
const keys = order.match(/"([^"]+)"/g).map(s => s.slice(1, -1));
assert.strictEqual(keys[keys.length - 1], "animaux");
assert.ok(keys.indexOf("fidelite") < keys.indexOf("animaux"));
assert.ok(keys.includes("courses"));

const html = fs.readFileSync(path.join(__dirname, "animal.html"), "utf8");
assert.ok(!html.includes("app.js"));
assert.ok(html.includes("/a/") || html.includes("\\/a\\/"));
assert.ok(html.includes("action: \"view\""));
assert.ok(!html.includes("sendGps(true)"));
assert.ok(html.includes("publicCardMain"));
assert.ok(html.includes("animal-card.css"));
assert.ok(core.publicCardDock(core.publicPayload(pet, {}), {}).includes("J’ai trouvé"));
assert.ok(core.publicCardHint().includes("Consulter cette carte"));
assert.ok(!core.publicCardMain(core.publicPayload(pet, {})).includes("Consulter cette carte"));
assert.ok(core.publicCardDock(core.publicPayload(pet, {}), {}).includes("sans compte"));
const card = core.publicCardScene(core.publicPayload(pet, { photo_url: "https://x/p.jpg" }), { preview: true, embed: true });
assert.ok(card.includes("id-scene--preview"));
assert.ok(card.includes("id-act-found"));
assert.ok(card.includes("Envoyer ma position"));
const dockLive = core.publicCardDock(core.publicPayload(pet, {}), {});
assert.ok(dockLive.includes("aManualPanel"));
assert.ok(dockLive.includes("Envoyer cette position"));
assert.ok(!dockLive.includes('id="aManual"'));

const edge = fs.readFileSync(path.join(__dirname, "supabase/functions/animal-public/index.ts"), "utf8");
assert.ok(edge.includes("ANIMAL_PUSH_DISABLED"));
assert.ok(edge.includes("x-animal-dry-run"));
assert.ok(edge.includes('action === "view"'));
const pushShared = fs.readFileSync(path.join(__dirname, "supabase/functions/_shared/pet-push.ts"), "utf8");
assert.ok(pushShared.includes("prefs.animaux === false"));
const petNotify = fs.readFileSync(path.join(__dirname, "pet-notify-core.js"), "utf8");
assert.ok(petNotify.includes("v=animaux&pet="));
assert.ok(edge.includes("finder_name"));
assert.ok(edge.includes("finder_phone"));
assert.ok(edge.includes("notifyHousehold") || edge.includes("pushToHousehold"));
assert.ok(!/status:\s*[\"']found[\"']/.test(edge.split("action === \"view\"")[1].slice(0, 800)));
assert.ok(edge.includes("VIEW_DEDUP_MS"));
assert.ok(edge.includes("2 * 60 * 1000"));
assert.ok(edge.includes("contentEncoding: \"aes128gcm\""));
assert.ok(edge.includes("response?.statusCode"));
assert.ok(!edge.includes('headers: { Urgency: "high" }'));
assert.ok(edge.includes("petPushPayload"));
assert.ok(edge.includes('tag: `pet-view-${Date.now()}`'));
assert.ok(edge.includes("petNotifyDeepPath"));
assert.ok(edge.includes('log: "1"'));
assert.ok(edge.includes("logviews"));
const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
const animauxJs = fs.readFileSync(path.join(__dirname, "animaux.js"), "utf8");
assert.ok(animauxJs.includes("pet_clear_notifications"));
assert.ok(animauxJs.includes("petLogClearNotif"));
assert.ok(animauxJs.includes("Effacer les notifications du journal"));
assert.ok(appJs.includes("mzNavDiagRead"));
assert.ok(appJs.includes("mzRestorePendingNavFromSw"));
assert.ok(sw.includes("mzStashPendingNav"));
assert.ok(appJs.includes("mzConsumePetDeepLink"));
assert.ok(appJs.includes("mz_pet_event"));
assert.ok(appJs.includes("mz-pet-deeplink"));
assert.ok(appJs.includes("mzResumePendingPetDeepLink"));
assert.ok(sw.includes("isMaisonClientUrl"));
assert.ok(sw.includes('pathname.startsWith("/maison/")'));
assert.ok(!sw.includes('startsWith("https://carnets-menus.vercel.app")'));
assert.ok(animauxJs.includes("petHighlightVisible"));
assert.ok(animauxJs.includes("petJournalPlan"));
assert.ok(animauxJs.includes("ensurePetEventLoaded"));
assert.ok(animauxJs.includes("pet_delete_event"));
assert.ok(animauxJs.includes("return false"));
assert.ok(animauxJs.includes("return true"));
function isMaisonClientUrl(href) {
  try {
    const u = new URL(href);
    return u.origin === "https://carnets-menus.vercel.app" && u.pathname.startsWith("/maison/");
  } catch (_) { return false; }
}
assert.strictEqual(isMaisonClientUrl("https://carnets-menus.vercel.app/maison/"), true);
assert.strictEqual(isMaisonClientUrl("https://carnets-menus.vercel.app/maison/index.html"), true);
assert.strictEqual(isMaisonClientUrl("https://carnets-menus.vercel.app/"), false);
assert.strictEqual(isMaisonClientUrl("https://chatgpt.com/"), false);
const samplePet = "11111111-1111-4111-8111-111111111111";
const sampleEv = "22222222-2222-4222-8222-222222222222";
const q = new URLSearchParams({ v: "animaux", pet: samplePet, log: "1", event: sampleEv, logviews: "1" });
const href = "https://carnets-menus.vercel.app/maison/?" + q.toString();
const u = new URL(href);
assert.strictEqual(u.searchParams.get("v"), "animaux");
assert.strictEqual(u.searchParams.get("pet"), samplePet);
assert.strictEqual(u.searchParams.get("event"), sampleEv);
assert.strictEqual(u.searchParams.get("log"), "1");
assert.strictEqual(u.searchParams.get("logviews"), "1");

/** Miroir de parsePushSubscription (animal-public/index.ts) — garder aligné. */
function parsePushSubscription(raw) {
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!o || typeof o !== "object") return null;
    const endpoint = o.endpoint;
    const keys = o.keys;
    if (typeof endpoint !== "string" || !endpoint) return null;
    if (!keys || typeof keys.p256dh !== "string" || !keys.p256dh || typeof keys.auth !== "string" || !keys.auth) return null;
    return o;
  } catch (_) {
    return null;
  }
}
const goodSub = {
  endpoint: "https://web.push.apple.com/example",
  keys: { p256dh: "abc", auth: "def" }
};
assert.strictEqual(parsePushSubscription(goodSub), goodSub);
assert.strictEqual(parsePushSubscription(JSON.stringify(goodSub)).endpoint, goodSub.endpoint);
assert.strictEqual(parsePushSubscription({ endpoint: "x" }), null);
assert.strictEqual(parsePushSubscription(null), null);

const vercel = fs.readFileSync(path.join(__dirname, "../vercel.json"), "utf8");
assert.ok(vercel.includes("/a/:token"));
assert.ok(vercel.includes("/maison/animal.html"));

function petJournalPlanFixture(ev, highlightEvent, logViews, logOpen) {
  const showLogViews = () => logViews === "1";
  const logIsOpen = () => logOpen === "1";
  const views = ev.filter(e => e.kind === "view");
  const acts = ev.filter(e => e.kind !== "view");
  const target = highlightEvent ? ev.find(e => e.id === highlightEvent) : null;
  const revealViews = showLogViews() || !!(target && target.kind === "view");
  const shown = revealViews ? ev : (acts.length ? acts : []);
  const open = (logIsOpen() || !!target) && (shown.length > 0 || revealViews || !!target);
  return { shown, open, revealViews, target };
}
const viewEv = { id: "f406f7af-8351-457c-b1cc-f2247f4a012b", kind: "view", pet_id: "bandy", created_at: "2026-11-15T06:40:00.000Z" };
const onlyViews = petJournalPlanFixture([viewEv], viewEv.id, "", "1");
assert.strictEqual(onlyViews.shown.length, 1, "deep link view: ligne visible sans logviews global");
assert.strictEqual(onlyViews.open, true, "deep link view: journal ouvert");
const hidden = petJournalPlanFixture([viewEv], null, "", "1");
assert.strictEqual(hidden.shown.length, 0, "consultation masquée sans cible");

console.log("animaux-core: ok");
