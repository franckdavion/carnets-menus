/* Rappels Google Agenda : payload et fan-out par compte (testable sans API). */
(function (root) {
  "use strict";

  function buildRemindersPayload(gDefault, minutes) {
    if (gDefault) return { useDefault: true };
    const mins = [...new Set((Array.isArray(minutes) ? minutes : []).filter(m => Number.isInteger(m) && m >= 0 && m <= 40320))].slice(0, 5);
    return { useDefault: false, overrides: mins.map(value => ({ method: "popup", minutes: value })) };
  }

  function normalizeRemindersBody(body) {
    if (!body || typeof body !== "object") return null;
    if (body.useDefault === true) return { useDefault: true };
    if (body.useDefault === false) {
      const overrides = Array.isArray(body.overrides) ? body.overrides : [];
      const mins = overrides.map(o => o && Number(o.minutes)).filter(m => Number.isInteger(m) && m >= 0 && m <= 40320);
      return buildRemindersPayload(false, mins);
    }
    return null;
  }

  function reminderTargets(actorUserId, members) {
    const out = [];
    for (const m of members || []) {
      if (!m || !m.userId) continue;
      if (m.userId === actorUserId) out.push({ userId: m.userId, name: m.name || "Vous", reason: "actor" });
      else if (m.familyReminders === true) out.push({ userId: m.userId, name: m.name || "Membre", reason: "consent" });
    }
    return out;
  }

  async function applyRemindersForAccounts(opts) {
    const reminders = normalizeRemindersBody(opts && opts.reminders);
    if (!reminders) throw new Error("invalid_reminders");
    const targets = reminderTargets(opts.actorUserId, opts.members);
    const results = [];
    for (const t of targets) {
      const member = (opts.members || []).find(m => m.userId === t.userId) || {};
      if (!member.hasToken) {
        results.push({ name: t.name, userId: t.userId, ok: false, skipped: false, error: "not_connected", reason: t.reason });
        continue;
      }
      try {
        const read = await opts.patchAndGet({ userId: t.userId, calendarId: opts.calendarId, eventId: opts.eventId, reminders });
        results.push({
          name: t.name,
          userId: t.userId,
          ok: true,
          reason: t.reason,
          reminders: read && read.reminders ? read.reminders : reminders
        });
      } catch (err) {
        const code = (err && err.code) || "write_failed";
        results.push({
          name: t.name,
          userId: t.userId,
          ok: false,
          reason: t.reason,
          error: code,
          message: err && err.safeMessage ? err.safeMessage : "Écriture Google impossible"
        });
      }
    }
    return { reminders, results };
  }

  function summarizeReminderResults(results) {
    const rows = results || [];
    const ok = rows.filter(r => r.ok).map(r => r.name);
    const fail = rows.filter(r => !r.ok);
    if (!rows.length) return "Aucun compte Google à mettre à jour.";
    if (!fail.length) return "Rappels enregistrés pour " + ok.join(" et ") + ".";
    if (!ok.length) return "Rappels non enregistrés : " + fail.map(r => r.name + " (" + (r.error === "not_connected" ? "Google non connecté" : r.error === "reconnect" ? "à reconnecter" : "échec Google") + ")").join(", ") + ".";
    return "Rappels enregistrés pour " + ok.join(" et ") + ". Pas pour " + fail.map(r => r.name).join(", ") + ".";
  }

  function sameGoogleCalendar(a, b) {
    if (!a || !b) return false;
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  const api = {
    buildRemindersPayload,
    normalizeRemindersBody,
    reminderTargets,
    applyRemindersForAccounts,
    summarizeReminderResults,
    sameGoogleCalendar
  };
  root.MaisonGoogleReminders = api;
  if (typeof module !== "undefined" && module && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
