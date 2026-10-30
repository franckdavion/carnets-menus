/* Dates, répétitions et identifiants d'envoi.
   Une seule copie : le navigateur charge ce fichier, la fonction maison-push-dispatch l'importe.
   Les jours sont calculés à 12:00 UTC pour que le changement d'heure ne décale pas la date. */
(function (root) {
  "use strict";
  const DAY = 86400000;

  function addDays(day, n) {
    const d = new Date(String(day).slice(0, 10) + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function diffDays(a, b) {
    return Math.round((Date.parse(String(b).slice(0, 10) + "T12:00:00Z") - Date.parse(String(a).slice(0, 10) + "T12:00:00Z")) / DAY);
  }

  function isoDay(day) {
    return ((new Date(String(day).slice(0, 10) + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;
  }

  function repeatRule(repeat) {
    const m = /^custom:(\d{1,3}):(days|weeks|months|years)$/.exec(repeat || "");
    if (m) {
      const interval = Number(m[1]);
      if (interval < 1) return null;
      return { unit: m[2], interval };
    }
    const unit = { weekly: "weeks", monthly: "months", yearly: "years" }[repeat];
    return unit ? { unit, interval: 1 } : null;
  }

  function recurrenceDate(start, i, unit, interval) {
    const n = i * interval;
    if (unit === "days") return addDays(start, n);
    if (unit === "weeks") return addDays(start, 7 * n);
    const d = new Date(String(start).slice(0, 10) + "T12:00:00Z");
    const months = unit === "years" ? n * 12 : n;
    const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, 12));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
    return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d.getUTCDate(), last), 12)).toISOString().slice(0, 10);
  }

  function startsBetween(e, from, to) {
    if (!e.repeat || e.repeat === "none") return e.day >= from && e.day <= to ? [e.day] : [];
    const rule = repeatRule(e.repeat);
    if (!rule) return [];
    const out = [];
    for (let i = 0; i < 2000; i++) {
      const d = recurrenceDate(e.day, i, rule.unit, rule.interval);
      if (d > to) break;
      if (d >= from) out.push(d);
    }
    return out;
  }

  function nextDue(t, base) {
    switch (t.freq) {
      case "daily": return addDays(base, 1);
      case "every": return addDays(base, Math.max(1, t.every_n || 1));
      case "weekly": {
        const days = t.weekdays && t.weekdays.length ? t.weekdays : [isoDay(t.next_due)];
        for (let i = 1; i <= 7; i++) {
          const d = addDays(base, i);
          if (days.includes(isoDay(d))) return d;
        }
        return addDays(base, 7);
      }
      case "monthly": {
        const want = Number(String(t.next_due).slice(8, 10));
        const b = new Date(String(base).slice(0, 10) + "T12:00:00Z");
        let y = b.getUTCFullYear();
        let m = b.getUTCMonth() + 1;
        if (m > 11) { m = 0; y++; }
        const last = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate();
        return new Date(Date.UTC(y, m, Math.min(want, last), 12)).toISOString().slice(0, 10);
      }
      default: return null;
    }
  }

  function reminderClaim(eventId, delay, userId, start) {
    return eventId + ":" + delay + ":" + userId + ":" + start;
  }
  function messageClaim(messageId, userId) {
    return "msg:" + messageId + ":" + userId;
  }
  function digestClaim(day, userId) {
    return "digest:" + day + ":" + userId;
  }
  function birthdayEveClaim(id, day, userId) {
    return "bday-eve:" + id + ":" + day + ":" + userId;
  }
  function shoppingClaim(ids, userId) {
    return "shop:" + ids + ":" + userId;
  }

  const api = {
    addDays, diffDays, isoDay, repeatRule, recurrenceDate, startsBetween, nextDue,
    reminderClaim, messageClaim, digestClaim, birthdayEveClaim, shoppingClaim
  };
  root.MaisonCal = api;
  if (typeof module !== "undefined" && module && module.exports) module.exports = api;
})(globalThis);
