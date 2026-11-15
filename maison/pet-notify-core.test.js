"use strict";
const assert = require("assert");
const PN = require("./pet-notify-core.js");

const t = "2026-11-14T13:32:00.000Z";
const base = { view_at: t, found_at: null, finder_name: "", finder_phone: "", message: "", location: null };

const viewCopy = PN.buildBundleCopy("Bandy", base);
assert.ok(viewCopy.title.includes("Bandy"));
assert.ok(viewCopy.body.includes("Consulté"));
assert.ok(/Aucune position/i.test(viewCopy.body));
assert.ok(viewCopy.body.length <= PN.PUSH_BODY_MAX);

const gps = Object.assign({}, base, {
  location: { at: t, lat: 50.69, lng: 3.07, accuracy: 12, address: "", source: "gps" }
});
assert.ok(/position/i.test(PN.buildBundleCopy("Bandy", gps).title));
assert.ok(PN.buildBundleCopy("Bandy", gps).body.includes("50.69"));

const manual = Object.assign({}, base, {
  location: { at: t, lat: null, lng: null, address: "Devant la boulangerie", source: "manual" }
});
assert.ok(PN.buildBundleCopy("Bandy", manual).body.includes("Devant la boulangerie"));

const found = Object.assign({}, base, {
  found_at: t,
  finder_name: "Franky",
  finder_phone: "0612345678",
  location: { at: t, lat: null, lng: null, address: "Rue X", source: "manual" }
});
const fcopy = PN.buildBundleCopy("Bandy", found);
assert.ok(/retrouvé/i.test(fcopy.title));
assert.ok(fcopy.body.includes("Franky") || fcopy.body.includes("Rue X"));

const fp0 = PN.snapshotFingerprint(base);
const fp1 = PN.snapshotFingerprint(Object.assign({}, base, { location: gps.location }));
const late = PN.diffLateCopy("Bandy", fp0, Object.assign({}, base, { location: gps.location }));
assert.ok(late && (late.body.includes("GPS") || late.title.includes("nouvelle")));
assert.strictEqual(PN.diffLateCopy("Bandy", fp1, Object.assign({}, base, { location: gps.location })), null);

assert.strictEqual(PN.COLLECT_MS, 120000);
assert.ok(PN.bundleDueAt(t) > t);

console.log("pet-notify-core: ok");