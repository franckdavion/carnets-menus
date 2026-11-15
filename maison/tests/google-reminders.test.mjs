import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = require("../supabase/functions/_shared/google-reminders.js");
let fail = 0;
const ok = (name, cond) => { console.log((cond ? "ok  " : "FAIL ") + name); if (!cond) fail++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

ok("useDefault à la création", same(R.buildRemindersPayload(true, []), { useDefault: true }));
ok("aucun rappel", same(R.buildRemindersPayload(false, []), { useDefault: false, overrides: [] }));
ok("deux rappels inhabituels", same(R.buildRemindersPayload(false, [100, 34]), {
  useDefault: false,
  overrides: [{ method: "popup", minutes: 100 }, { method: "popup", minutes: 34 }]
}));
ok("suppression d'un rappel", same(R.buildRemindersPayload(false, [38]), {
  useDefault: false,
  overrides: [{ method: "popup", minutes: 38 }]
}));
ok("plus de 5 tronqués", R.buildRemindersPayload(false, [1, 2, 3, 4, 5, 6]).overrides.length === 5);
ok("minutes hors plage ignorées", same(R.buildRemindersPayload(false, [-1, 40321, 10]), {
  useDefault: false,
  overrides: [{ method: "popup", minutes: 10 }]
}));

ok("même agenda par identifiant", R.sameGoogleCalendar("christinebinet2905@gmail.com", "ChristineBinet2905@gmail.com"));
ok("agendas distincts", !R.sameGoogleCalendar("christinebinet2905@gmail.com", "abc@group.calendar.google.com"));

const franck = { userId: "f", name: "Franck", hasToken: true, familyReminders: false };
const christine = { userId: "c", name: "Christine", hasToken: true, familyReminders: false };
ok("sans consentement : seulement l'auteur", same(
  R.reminderTargets("f", [franck, christine]).map(t => t.userId),
  ["f"]
));
christine.familyReminders = true;
ok("avec consentement : les deux", same(
  R.reminderTargets("f", [franck, christine]).map(t => t.userId + ":" + t.reason),
  ["f:actor", "c:consent"]
));
ok("Christine n'est pas ciblée si c'est elle l'auteur sans auto-consent des autres", same(
  R.reminderTargets("c", [{ ...franck, familyReminders: false }, christine]).map(t => t.userId),
  ["c"]
));

const writes = [];
const patchAndGet = async ({ userId, reminders }) => {
  writes.push({ userId, reminders });
  return { reminders };
};

const both = await R.applyRemindersForAccounts({
  actorUserId: "f",
  calendarId: "christinebinet2905@gmail.com",
  eventId: "test-event",
  reminders: R.buildRemindersPayload(false, [100, 34]),
  members: [franck, christine],
  patchAndGet
});
ok("fan-out deux écritures séparées", writes.length === 2 && writes[0].userId === "f" && writes[1].userId === "c");
ok("même payload pour les deux", same(writes[0].reminders, writes[1].reminders));
ok("succès des deux", both.results.every(r => r.ok));

const none = await R.applyRemindersForAccounts({
  actorUserId: "f",
  calendarId: "cal",
  eventId: "e",
  reminders: R.buildRemindersPayload(false, []),
  members: [franck, { ...christine, hasToken: false }],
  patchAndGet: async ({ userId }) => ({ reminders: { useDefault: false, overrides: [] } })
});
ok("Christine sans jeton : échec signalé, pas d'exception", none.results[0].ok && none.results[1].error === "not_connected");
ok("résumé partiel", R.summarizeReminderResults(none.results).includes("Pas pour Christine"));

const failed = await R.applyRemindersForAccounts({
  actorUserId: "f",
  calendarId: "cal",
  eventId: "e",
  reminders: { useDefault: true },
  members: [franck],
  patchAndGet: async () => { const e = new Error("no"); e.code = "forbidden"; e.safeMessage = "lecture seule"; throw e; }
});
ok("échec Google de l'auteur", failed.results[0].ok === false && failed.results[0].error === "forbidden");
ok("résumé échec total", R.summarizeReminderResults(failed.results).includes("non enregistrés"));

let otherTouched = false;
await R.applyRemindersForAccounts({
  actorUserId: "f",
  calendarId: "cal",
  eventId: "e",
  reminders: R.buildRemindersPayload(false, [10]),
  members: [franck, { ...christine, familyReminders: false, hasToken: true }],
  patchAndGet: async ({ userId }) => {
    if (userId === "c") otherTouched = true;
    return { reminders: {} };
  }
});
ok("sans consentement Christine jamais écrite", otherTouched === false);

if (fail) {
  console.error(fail + " test(s) failed");
  process.exit(1);
}
console.log("all google-reminders tests passed");
