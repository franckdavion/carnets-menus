import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSegmentSelects,
  CLEAN_ROUTES,
  encodeCleaningMode,
  isCleaningInProgress,
  mergeNamedRooms,
  namesForRoomIds,
  parseMapRoomsFromJson,
  parseSegmentIds,
  planSegmentClean,
  routeAllowed,
  shouldSkipMapRequest,
  START_SEQUENCE,
  startCustomParams,
  summarizeMiotParams,
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

test("salle à manger seule → segment 7 uniquement", () => {
  const ids = parseSegmentIds([7]);
  assert.deepEqual(ids, [7]);
  assert.deepEqual(unknownSegmentIds(ids, rooms), []);
  assert.deepEqual(namesForRoomIds(ids, rooms), ["Salle à manger"]);
  const selects = buildSegmentSelects(ids, 1, 1, 1, 2);
  assert.deepEqual(selects, [[7, 1, 1, 2, 1]]);
  const params = startCustomParams(selects);
  assert.deepEqual(params.in[0], { piid: 1, value: 18 });
  const payload = JSON.parse(String(params.in[1].value));
  assert.equal(payload.selects.length, 1);
  assert.equal(payload.selects[0][0], 7);
});

test("salon 4, pièce 5 distincte, salle à manger 7", () => {
  assert.deepEqual(namesForRoomIds([4], rooms), ["Salon"]);
  assert.deepEqual(namesForRoomIds([5], rooms), ["Pièce 5"]);
  assert.deepEqual(namesForRoomIds([7], rooms), ["Salle à manger"]);
  assert.deepEqual(buildSegmentSelects([4], 1, 2, 1, 2)[0][0], 4);
  assert.deepEqual(buildSegmentSelects([5], 1, 2, 1, 2)[0][0], 5);
  assert.notEqual(namesForRoomIds([5], rooms)[0], "Salle à manger");
});

test("cinq pièces séparément", () => {
  for (const room of rooms) {
    const ids = parseSegmentIds([room.id]);
    assert.deepEqual(ids, [room.id]);
    assert.deepEqual(unknownSegmentIds(ids, rooms), []);
    assert.deepEqual(namesForRoomIds(ids, rooms), [room.name]);
  }
});

test("combinaisons et Toutes", () => {
  assert.deepEqual(parseSegmentIds([1, 6]), [1, 6]);
  assert.deepEqual(parseSegmentIds([4, 7, 6]), [4, 7, 6]);
  const all = parseSegmentIds(rooms.map(r => r.id));
  assert.deepEqual(all, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(unknownSegmentIds(all, rooms), []);
  const selects = buildSegmentSelects(all, 1, 2, 1, 2);
  assert.deepEqual(selects.map(row => row[0]), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(selects.every(row => row[4] === 1));
});

test("id 99 refusé ; 2 et 7 sont sur la carte", () => {
  assert.deepEqual(unknownSegmentIds([2], rooms), []);
  assert.deepEqual(unknownSegmentIds([7], rooms), []);
  assert.deepEqual(unknownSegmentIds([99], rooms), [99]);
  const msg = unknownRoomsError([99], rooms);
  assert.match(msg, /99/);
  assert.match(msg, /Salle à manger \(7\)/);
  assert.match(msg, /Pièce 5 \(5\)/);
});

test("parse ignore les ids hors plage au lieu de les coincer à 99", () => {
  assert.deepEqual(parseSegmentIds([5, 0, 150, "abc", "5"]), [5]);
});

test("quatre itinéraires : En profondeur seulement en serpillière", () => {
  assert.equal(routeAllowed(2, "deep"), false);
  assert.equal(routeAllowed(1, "deep"), true);
  assert.equal(routeAllowed(3, "deep"), true);
  assert.equal(routeAllowed(2, "standard"), true);
  assert.equal(routeAllowed(0, "fast"), true);
  assert.equal(CLEAN_ROUTES.deep, 3);
});

test("pause / stop / dock : actions MIoT inchangées", () => {
  assert.deepEqual(
    { pause: { siid: 2, aiid: 2 }, stop: { siid: 4, aiid: 2 }, dock: { siid: 3, aiid: 1 } },
    { pause: { siid: 2, aiid: 2 }, stop: { siid: 4, aiid: 2 }, dock: { siid: 3, aiid: 1 } }
  );
});

test("HA : aspiration seule — selects réels, mode encodé 2, salle à manger 7", () => {
  const plan = planSegmentClean([7], 1, 0, 2, 2);
  assert.equal(plan.cleaning_mode, 0);
  assert.equal(plan.cleaning_mode_encoded, 2);
  assert.deepEqual(plan.selects, [[7, 1, 2, 2, 1]]);
  assert.deepEqual(plan.sequence, START_SEQUENCE);
  assert.equal(plan.action.siid, 4);
  assert.equal(plan.action.aiid, 1);
  assert.equal(plan.action.in[0].value, 18);
});

test("HA : lavage seul — selects réels, mode encodé 1", () => {
  const plan = planSegmentClean([7], 1, 1, 1, 3);
  assert.equal(plan.cleaning_mode_encoded, encodeCleaningMode(1));
  assert.equal(plan.cleaning_mode_encoded, 1);
  assert.deepEqual(plan.selects, [[7, 1, 1, 3, 1]]);
});

test("HA : aspiration puis lavage — selects réels, mode encodé 3, salon + salle à manger", () => {
  const plan = planSegmentClean([4, 7], 2, 3, 3, 1);
  assert.equal(plan.cleaning_mode, 3);
  assert.equal(plan.cleaning_mode_encoded, 3);
  assert.deepEqual(plan.selects, [[4, 2, 3, 1, 1], [7, 2, 3, 1, 1]]);
  assert.ok(plan.selects.every(row => row[4] === 1));
});

test("HA : aspiration + serpillière — swap mop-pad 2 → 0", () => {
  const plan = planSegmentClean([1, 3, 4, 5, 6], 1, 2, 1, 2);
  assert.equal(plan.cleaning_mode_encoded, 0);
  assert.deepEqual(plan.selects.map(row => row[0]), [1, 3, 4, 5, 6]);
});

test("parseur : seg_inf imbriqué récupère 2, 7 et 8", () => {
  const parsed = parseMapRoomsFromJson({
    map_extend: {
      seg_inf: {
        1: { name: "Buanderie" },
        2: {},
        3: { name: "Salle de bain" },
        4: { name: "Salon" },
        5: {},
        6: { name: "Cuisine" },
        7: { name: "Salle à manger" },
        8: {}
      }
    }
  });
  assert.deepEqual(parsed.map(r => r.id), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(parsed.find(r => r.id === 7).name, "Salle à manger");
  assert.equal(parsed.find(r => r.id === 5).name, "Pièce 5");
});

test("cache : ne recolle plus Salle à manger sur le 5 si le 7 apparaît", () => {
  const stale = [
    { id: 1, name: "Buanderie" },
    { id: 3, name: "Salle de bain" },
    { id: 4, name: "Salon" },
    { id: 5, name: "Salle à manger" },
    { id: 6, name: "Cuisine" }
  ];
  const live = [
    { id: 1, name: "Buanderie" },
    { id: 2, name: "Pièce 2" },
    { id: 3, name: "Salle de bain" },
    { id: 4, name: "Salon" },
    { id: 5, name: "Pièce 5" },
    { id: 6, name: "Cuisine" },
    { id: 7, name: "Salle à manger" },
    { id: 8, name: "Pièce 8" }
  ];
  const merged = mergeNamedRooms(live, stale);
  assert.equal(merged.find(r => r.id === 4).name, "Salon");
  assert.equal(merged.find(r => r.id === 5).name, "Pièce 5");
  assert.equal(merged.find(r => r.id === 7).name, "Salle à manger");
  assert.deepEqual(merged.map(r => r.id), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("cache incomplet : le 7 reste si le parseur live est partiel", () => {
  const cache = rooms;
  const livePartial = [
    { id: 1, name: "Buanderie" },
    { id: 3, name: "Salle de bain" },
    { id: 4, name: "Salon" },
    { id: 5, name: "Pièce 5" },
    { id: 6, name: "Cuisine" }
  ];
  const merged = mergeNamedRooms(livePartial, cache);
  assert.equal(merged.find(r => r.id === 7).name, "Salle à manger");
  assert.equal(merged.find(r => r.id === 4).name, "Salon");
  assert.equal(merged.find(r => r.id === 5).name, "Pièce 5");
});

test("pièces 2 et 8 masquées : hors liste, pièce 5 conservée", () => {
  const live = rooms;
  const cache = rooms.filter(r => r.id !== 2 && r.id !== 8);
  const merged = withoutHiddenRooms(mergeNamedRooms(live, cache), [2, 8]);
  assert.deepEqual(merged.map(r => r.id), [1, 3, 4, 5, 6, 7]);
  assert.equal(merged.find(r => r.id === 5).name, "Pièce 5");
  assert.equal(merged.find(r => r.id === 7).name, "Salle à manger");
  assert.equal(merged.find(r => r.id === 2), undefined);
  assert.equal(merged.find(r => r.id === 8), undefined);
});

test("programmes cuisine/buanderie inchangés", () => {
  const programs = [
    { room_ids: [6], name: "aspirateur cuisine" },
    { room_ids: [1], name: "buanderie aspiration puis lavage" }
  ];
  for (const p of programs) {
    assert.deepEqual(unknownSegmentIds(p.room_ids, rooms), []);
    assert.notDeepEqual(p.room_ids, [5]);
    assert.notDeepEqual(p.room_ids, [7]);
  }
});

test("REQUEST_MAP : l’état robot prime sur un simple délai", () => {
  assert.equal(isCleaningInProgress(6), false);
  assert.equal(isCleaningInProgress(2), false);
  assert.equal(isCleaningInProgress(1), true);
  assert.equal(isCleaningInProgress(122), true);
  assert.equal(shouldSkipMapRequest(6, null, 1000), false);
  assert.equal(shouldSkipMapRequest(1, null, 1000), true);
  assert.equal(shouldSkipMapRequest(6, 900, 1000), true);
  assert.equal(shouldSkipMapRequest(6, 900, 900 + 26_000), false);
});

test("journaux : résumé MIoT sans did ni jeton", () => {
  const summary = summarizeMiotParams({
    did: "SECRET_DID",
    siid: 4,
    aiid: 1,
    in: [
      { piid: 1, value: 18 },
      { piid: 10, value: JSON.stringify({ selects: [[5, 1, 1, 2, 1]] }) }
    ]
  });
  assert.equal(summary.siid, 4);
  assert.equal(summary.aiid, 1);
  assert.deepEqual(summary.selects, [[5, 1, 1, 2, 1]]);
  assert.equal("did" in summary, false);
});
