const assert = require("assert");
const P = require("./carnet-photos.js");

const NAME = "Bowl poulet, boulgour et crudités";
const kfc = {
  u: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Logo_KFC.svg/640px-Logo_KFC.svg.png",
  title: "KFC",
  desc: "Chaîne de restauration rapide",
  extract: "Kentucky Fried Chicken, aussi connue sous le sigle KFC"
};
const camilla = {
  u: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Queen_Camilla_2025.jpg",
  title: "Camilla Parker Bowles",
  desc: "Reine consort du Royaume-Uni",
  extract: "Camilla, née Camilla Rosemary Shand, épouse Parker Bowles"
};
const lasagne = {
  u: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Lasagne_Bolognese.jpg",
  title: "Lasagnes",
  desc: "Plat de pâtes italien",
  extract: "Les lasagnes bolognaises sont un plat de pâtes en couches"
};
const crabPng = {
  u: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Crab.png",
  title: "Crab.png",
  desc: "dessin de crabe",
  extract: "Illustration d'un crabe"
};
const wax = {
  u: "https://example.com/wax-beans.jpg",
  title: "Haricots beurre",
  desc: "légume",
  extract: "Phaseolus vulgaris wax beans"
};

function score(name, c) { return P.scoreCandidate(name, c); }

assert.strictEqual(score(NAME, kfc), 0, "KFC logo rejected");
assert.ok(P.offTopic(P.blobOf(kfc)), "KFC off-topic");
assert.strictEqual(score(NAME, camilla), 0, "Camilla rejected");
assert.ok(!P.acceptAuto(score(NAME, camilla)));
assert.strictEqual(score("Bowl poulet, boulgour et crudités", {
  u: "https://example.com/Bowles_portrait.jpg", title: "Bowles", desc: "portrait"
}), 0, "bowl ≠ Bowles");

assert.ok(P.acceptAuto(score("Lasagnes bolognaises", lasagne)), "lasagnes accepted");
assert.ok(!P.acceptAuto(score("Bouchées de crabe", crabPng)), "crab drawing rejected for auto");
assert.ok(!P.acceptAuto(score("Velouté de brocoli", wax)), "wax beans rejected");

const ranked = P.rank(NAME, [kfc, camilla, lasagne], "auto");
assert.strictEqual(ranked.length, 0, "no auto photo among off-topic results");

const personal = { photo: 1, autoPick: kfc.u };
assert.ok(P.looksPersonal(personal));
assert.ok(!P.looksPersonal({ autoPick: kfc.u }));

const qs = P.searchQueries(NAME);
assert.ok(qs.some(q => /boulgour|crudit/.test(P.fold(q))), "queries use distinctive words");
assert.ok(!qs.some(q => q === "bowl poulet"), "do not search only weak+generic");

function src(r) {
  if (r.photo || r.cloudPhoto) return "personal";
  if (r.pick && r.pick.u) return "pick";
  if (r.image) return "import";
  if (r.autoPick && P.acceptAuto(score(r.name, { u: r.autoPick, title: r.autoPick }))) return "auto";
  return "empty";
}
assert.strictEqual(src({ name: NAME, photo: 1, autoPick: kfc.u }), "personal");
assert.strictEqual(src({ name: NAME, pick: { u: "https://ok.jpg" }, autoPick: kfc.u }), "pick");
assert.strictEqual(src({ name: NAME, image: "https://site.jpg", autoPick: kfc.u }), "import");
assert.strictEqual(src({ name: NAME, autoPick: kfc.u }), "empty");
assert.strictEqual(src({ name: NAME }), "empty");

console.log("carnet-photos.test.js: OK");
