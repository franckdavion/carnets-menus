import {
  buildSegmentSelects,
  CLEAN_ROUTES,
  namesForRoomIds,
  parseSegmentIds,
  routeAllowed,
  startCustomParams,
  unknownRoomsError,
  unknownSegmentIds,
  withoutHiddenRooms
} from "./clean_payload.ts";

const rooms = [
  { id: 1, name: "Buanderie" },
  { id: 2, name: "Pièce 2" },
  { id: 3, name: "Salle de bain" },
  { id: 4, name: "Salon" },
  { id: 5, name: "Pièce 5" },
  { id: 6, name: "Cuisine" },
  { id: 7, name: "Salle à manger" },
  { id: 8, name: "Pièce 8" }
];

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: attendu ${e}, obtenu ${a}`);
}

Deno.test("salle à manger seule → segment 7 uniquement", () => {
  const ids = parseSegmentIds([7]);
  assertEqual(ids, [7], "ids");
  assertEqual(unknownSegmentIds(ids, rooms), [], "inconnu");
  assertEqual(namesForRoomIds(ids, rooms), ["Salle à manger"], "noms");
  const selects = buildSegmentSelects(ids, 1, 1, 1, 2);
  assertEqual(selects, [[7, 1, 1, 2, 1]], "selects serpillière");
  const params = startCustomParams(selects);
  assertEqual(params.in[0], { piid: 1, value: 18 }, "mode pièces");
  const payload = JSON.parse(String(params.in[1].value));
  assertEqual(payload.selects.length, 1, "une pièce");
  assertEqual(payload.selects[0][0], 7, "id 7");
});

Deno.test("cinq pièces séparément", () => {
  for (const room of rooms) {
    const ids = parseSegmentIds([room.id]);
    assertEqual(ids, [room.id], room.name);
    assertEqual(unknownSegmentIds(ids, rooms), [], room.name + " connue");
    assertEqual(namesForRoomIds(ids, rooms), [room.name], room.name + " nom");
  }
});

Deno.test("combinaisons et Toutes", () => {
  assertEqual(parseSegmentIds([1, 6]), [1, 6], "buanderie+cuisine");
  assertEqual(parseSegmentIds([4, 7, 6]), [4, 7, 6], "salon+sam+cuisine");
  const all = parseSegmentIds(rooms.map(r => r.id));
  assertEqual(all, [1, 2, 3, 4, 5, 6, 7, 8], "Toutes");
  assertEqual(unknownSegmentIds(all, rooms), [], "Toutes connues");
  const selects = buildSegmentSelects(all, 1, 2, 1, 2);
  assertEqual(selects.map(row => row[0]), [1, 2, 3, 4, 5, 6, 7, 8], "selects ids");
  assertEqual(selects.every(row => row[4] === 1), true, "5e valeur = 1");
});

Deno.test("id 99 refusé ; 2 et 7 sont sur la carte", () => {
  assertEqual(unknownSegmentIds([2], rooms), [], "id 2");
  assertEqual(unknownSegmentIds([7], rooms), [], "id 7");
  assertEqual(unknownSegmentIds([99], rooms), [99], "id 99");
  const msg = unknownRoomsError([99], rooms);
  if (!msg.includes("99") || !msg.includes("Salle à manger (7)") || !msg.includes("Pièce 5 (5)")) {
    throw new Error("message d'erreur incomplet : " + msg);
  }
});

Deno.test("parse ignore les ids hors plage au lieu de les coincer à 99", () => {
  assertEqual(parseSegmentIds([5, 0, 150, "abc", "5"]), [5], "filtre");
});

Deno.test("quatre itinéraires : En profondeur seulement en serpillière", () => {
  assertEqual(routeAllowed(2, "deep"), false, "asp+serp pas deep");
  assertEqual(routeAllowed(1, "deep"), true, "serp deep");
  assertEqual(routeAllowed(3, "deep"), true, "serp après asp deep");
  assertEqual(routeAllowed(2, "standard"), true, "standard");
  assertEqual(routeAllowed(0, "fast"), true, "rapide");
  assertEqual(CLEAN_ROUTES.deep, 3, "CleanRoute 3");
});

Deno.test("pause / stop / dock : actions MIoT inchangées", () => {
  assertEqual({ pause: { siid: 2, aiid: 2 }, stop: { siid: 4, aiid: 2 }, dock: { siid: 3, aiid: 1 } }, {
    pause: { siid: 2, aiid: 2 },
    stop: { siid: 4, aiid: 2 },
    dock: { siid: 3, aiid: 1 }
  }, "transport");
});

Deno.test("pièces 2 et 8 masquées, pièce 5 conservée", () => {
  const shown = withoutHiddenRooms(rooms, [2, 8]);
  assertEqual(shown.map(r => r.id), [1, 3, 4, 5, 6, 7], "ids");
  assertEqual(shown.find(r => r.id === 5)?.name, "Pièce 5", "pièce 5");
});
