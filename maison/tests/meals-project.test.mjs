import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const code = fs.readFileSync(path.join(root, "maison/meals-project.js"), "utf8");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(code, ctx);
const { slotSig, rowFromSig } = ctx.window.MzMeals;

let fail = 0;
const ok = (n, c) => { console.log((c ? "ok  " : "FAIL ") + n); if (!c) fail++; };

ok("recette", slotSig({ id: "r1" }, { r1: { name: "Pâtes" } }) === "R:r1");
ok("note midi", slotSig({ note: "Pizza" }, {}) === "N:Pizza");
ok("restes", slotSig({ left: "lasagnes" }, {}) === "L:lasagnes");
ok("ligne note", rowFromSig("N:Pizza", "h", "2026-11-18", "midi", () => null, {}, "now").label === "Pizza");

if (fail) process.exit(1);
console.log("meals-project ok");