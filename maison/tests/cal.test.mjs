import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const C = require("../supabase/functions/_shared/cal.js");
let fail = 0;
const ok = (name, cond) => { console.log((cond ? "ok  " : "FAIL ") + name); if (!cond) fail++; };

ok("vendredi 30 octobre 2026", C.isoDay("2026-10-30") === 5);
ok("lundi 26 octobre 2026", C.isoDay("2026-10-26") === 1);
ok("changement d'heure mars", C.addDays("2026-03-28", 1) === "2026-03-29");
ok("changement d'heure octobre", C.addDays("2026-10-24", 1) === "2026-10-25");
ok("fin d'année", C.addDays("2026-12-31", 1) === "2027-01-01");
ok("écart de jours", C.diffDays("2026-10-30", "2026-11-02") === 3);

const daily = { freq: "daily", every_n: 1, weekdays: [], next_due: "2026-10-30" };
ok("tâche chaque jour", C.nextDue(daily, "2026-10-30") === "2026-10-31");
const every = { freq: "every", every_n: 3, weekdays: [], next_due: "2026-10-30" };
ok("tâche tous les 3 jours", C.nextDue(every, "2026-10-30") === "2026-11-02");
const weekly = { freq: "weekly", every_n: 1, weekdays: [1, 4], next_due: "2026-10-26" };
ok("tâche lundi et jeudi, depuis vendredi", C.nextDue(weekly, "2026-10-30") === "2026-11-02");
const monthly = { freq: "monthly", every_n: 1, weekdays: [], next_due: "2026-01-31" };
ok("31 janvier vers février 2026", C.nextDue(monthly, "2026-01-31") === "2026-02-28");
ok("31 janvier 2024 vers le 29 février", C.nextDue(monthly, "2024-01-31") === "2024-02-29");

ok("règle hebdo", JSON.stringify(C.repeatRule("weekly")) === JSON.stringify({ unit: "weeks", interval: 1 }));
ok("règle custom", JSON.stringify(C.repeatRule("custom:2:weeks")) === JSON.stringify({ unit: "weeks", interval: 2 }));
ok("sans répétition", C.repeatRule("none") === null && C.repeatRule("custom:0:weeks") === null);
ok("custom trop long refusé", C.repeatRule("custom:1000:days") === null);

ok("date custom toutes les 2 semaines", C.recurrenceDate("2026-10-30", 2, "weeks", 2) === "2026-11-27");
ok("31 janvier plus un mois", C.recurrenceDate("2026-01-31", 1, "months", 1) === "2026-02-28");

const once = { day: "2026-11-02", repeat: "none" };
ok("événement unique dans la fenêtre", JSON.stringify(C.startsBetween(once, "2026-11-01", "2026-11-03")) === JSON.stringify(["2026-11-02"]));
ok("événement unique hors fenêtre", C.startsBetween(once, "2026-11-03", "2026-11-04").length === 0);
const custom = { day: "2026-10-30", repeat: "custom:2:weeks" };
ok("deux départs sur quatre semaines", JSON.stringify(C.startsBetween(custom, "2026-10-30", "2026-11-20")) === JSON.stringify(["2026-10-30", "2026-11-13"]));

ok("claim rappel", C.reminderClaim("ev", 30, "user", "2026-11-02") === "ev:30:user:2026-11-02");
ok("claim message", C.messageClaim("m1", "u1") === "msg:m1:u1");
ok("claim matin", C.digestClaim("2026-10-30", "u1") === "digest:2026-10-30:u1");
ok("claim anniversaire", C.birthdayEveClaim("b1", "2026-11-01", "u1") === "bday-eve:b1:2026-11-01:u1");

if (fail) { console.log(fail + " échec(s)"); process.exit(1); }
console.log("dates ok");
