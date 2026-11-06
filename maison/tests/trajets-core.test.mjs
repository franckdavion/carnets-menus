// Scénarios déterministes et sans réseau pour le moteur Trajets.
 // Ne lit aucune donnée familiale et n'écrit jamais dans Supabase/Google.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PRC = require("../presences-core.js");
const T = require("../presences-trajets-core.js");
const children = [
  { id: "matheo", first_name: "Mathéo", aliases: ["Matheo"] },
  { id: "kais", first_name: "Kaïs", aliases: ["Kais"] },
];
const ev = (id, summary, hour = "09:00", location = "Doullens, France") => ({
  id, summary, location,
  start: { dateTime: `2026-11-02T${hour}:00+01:00` },
  end: { dateTime: `2026-11-02T${hour === "11:00" ? "12:00" : "10:00"}:00+01:00` },
});
let count = 0;
const check = (description, f) => { f(); count++; console.log("✓ " + description); };

check("Reconnaissance des noms accentués", () => assert.deepEqual(T.matches("Dentiste Mathéo et Kaïs", children, PRC), ["matheo", "kais"]));
check("Les trajets scolaires ne sont pas proposés", () => assert.equal(T.matches("École Mathéo", children, PRC).length, 0));
check("Événements annulés et incomplets ignorés", () => {
  const items = [{ ...ev("cancel", "Dentiste Mathéo"), status: "cancelled" },
                 { id: "invalid", summary: "Dentiste Kaïs" }];
  assert.equal(T.make(items, "cal", children, PRC).length, 0);
});
const shared = T.make([ev("shared", "Dentiste Mathéo et Kaïs")], "cal", children, PRC);
check("Rendez-vous partagé par deux enfants = un seul trajet", () => {
  assert.equal(shared.length, 1);
  assert.deepEqual(shared[0].child_ids, ["matheo", "kais"]);
});
check("Un même identifiant Google en double = un seul trajet", () => {
  assert.equal(T.make([ev("same", "Dentiste Mathéo"), ev("same", "Dentiste Mathéo")], "cal", children, PRC).length, 1);
});
check("Calendriers multiples : dédoublonnage par empreinte", () => {
  const first = T.make([ev("id-1", "Orthophoniste Mathéo")], "cal-a", children, PRC);
  const second = T.make([ev("id-2", "Orthophoniste Mathéo")], "cal-b", children, PRC);
  assert.equal(T.dedupe([...first, ...second]).length, 1);
});
check("Trajet déjà validé : dédoublonnage par identifiant événement", () => {
  const r = shared[0];
  assert.equal(T.dedupe(shared, [{ child_id: "kais", calendar_id: r.calendar, event_id: r.event_id }]).length, 0);
});
check("Trajet déjà validé : dédoublonnage par empreinte", () => {
  assert.equal(T.dedupe(shared, [{ child_id: "matheo", event_fingerprint: shared[0].fingerprint }]).length, 0);
});
const favourites = [
  { id: "home", label: "Maison", address: "Rue du domicile", is_home: true, keywords: "" },
  { id: "city", label: "Doullens", address: "Doullens", is_home: false, keywords: "doullens" },
];
check("Ville Google exacte : lieu favori correspondant", () => {
  const r = T.resolvedLocation(shared[0], favourites);
  assert.equal(r.place?.id, "city");
});
check("Deux lieux homonymes : aucune adresse choisie arbitrairement", () => {
  const r = T.resolvedLocation(shared[0], [...favourites,
    { id: "other", label: "Doullens", address: "Autre adresse", is_home: false, keywords: "" }]);
  assert.equal(r.place, null);
  assert.equal(r.origin, "google");
});
check("Adresse Google inconnue : conserver l'adresse, sans choisir un favori", () => {
  const r = T.resolvedLocation({ ...shared[0], location: "Rue inconnue, Amiens" }, favourites);
  assert.equal(r.place, null);
  assert.equal(r.address, "Rue inconnue, Amiens");
});
const ortho = [
  ...T.make([ev("ortho-m", "Orthophoniste Mathéo", "09:00")], "cal", children, PRC),
  ...T.make([ev("ortho-k", "Orthophoniste Kaïs", "11:00")], "cal", children, PRC),
];
check("Rendez-vous successifs pour une activité : regroupement seulement proposé", () => {
  const group = T.groupCandidates(ortho[0], ortho, children, favourites);
  assert.deepEqual(group.map(r => r.event_id), ["ortho-m", "ortho-k"]);
});
check("Rendez-vous éloignés de plusieurs heures : pas de regroupement", () => {
  const far = T.make([ev("ortho-late", "Orthophoniste Kaïs", "16:00")], "cal", children, PRC);
  assert.equal(T.groupCandidates(ortho[0], [ortho[0], ...far], children, favourites).length, 1);
});
check("Des lieux distincts ne sont pas regroupés", () => {
  const other = T.make([ev("ortho-other", "Orthophoniste Kaïs", "11:00", "Amiens, France")], "cal", children, PRC);
  assert.equal(T.groupCandidates(ortho[0], [ortho[0], ...other], children, favourites).length, 1);
});
check("Un aller-retour = deux trajets", () => assert.equal(T.legs("round", "domicile", "cabinet").length, 2));
check("Un trajet ping-pong = quatre segments", () => assert.equal(T.legs("four", "domicile", "club").length, 4));
check("Somme kilométrique arrondie au dixième", () => assert.equal(T.total([1.123, 2.211]), 3.3));
console.log(`Trajets : ${count} vérifications de reconnaissance, doublons, lieux et kilomètres réussies (fictives).`);
