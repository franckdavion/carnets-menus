"use strict";
/* Maisonnée · Présences des enfants : moteur de calcul (sans interface, sans réseau).
   Interprétation 100 % déterministe des titres d'événements : rien n'est envoyé à un service externe.
   Utilisable dans le navigateur (window.PRC) et dans Node (tests). */
(function (root) {
  const TZ = "Europe/Paris";

  /* ---------- jours « AAAA-MM-JJ » calculés en UTC : aucun effet des changements d'heure ---------- */
  const p2 = n => String(n).padStart(2, "0");
  const dU = s => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const dS = t => { const x = new Date(t); return `${x.getUTCFullYear()}-${p2(x.getUTCMonth() + 1)}-${p2(x.getUTCDate())}`; };
  const dAdd = (s, n) => dS(dU(s) + n * 864e5);
  const dDiff = (a, b) => Math.round((dU(b) - dU(a)) / 864e5);
  const dow = s => (new Date(dU(s)).getUTCDay() + 6) % 7; // 0 = lundi
  const monthDays = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m = 1…12
  const mFirst = (y, m) => `${y}-${p2(m)}-01`;
  const mLast = (y, m) => `${y}-${p2(m)}-${p2(monthDays(y, m))}`;
  function* eachDay(a, b) { for (let d = a; d <= b; d = dAdd(d, 1)) yield d; }

  // date et heure d'un instant à Paris (heure d'été / d'hiver comprise)
  let fmtP;
  function paris(iso) {
    fmtP = fmtP || new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const o = {}; for (const x of fmtP.formatToParts(new Date(iso))) o[x.type] = x.value;
    return { day: `${o.year}-${o.month}-${o.day}`, hm: `${o.hour === "24" ? "00" : o.hour}:${o.minute}` };
  }

  /* ---------- jours couverts par un événement Google ---------- */
  // Journée entière : la fin donnée par Google est EXCLUSIVE (ven → dim = fin le lundi).
  // Avec horaires : chaque jour touché compte ; une fin à 00:00 ne compte pas le jour suivant.
  function eventDays(e) {
    const s = e.start || {}, en = e.end || {};
    if (s.date) {
      const start = s.date, endEx = en.date || dAdd(start, 1);
      const end = endEx > start ? dAdd(endEx, -1) : start;
      return { start, end };
    }
    if (s.dateTime) {
      const a = paris(s.dateTime);
      if (!en.dateTime) return { start: a.day, end: a.day };
      const b = paris(en.dateTime);
      let end = b.day;
      if (b.hm === "00:00" && Date.parse(en.dateTime) > Date.parse(s.dateTime)) end = dAdd(b.day, -1);
      if (end < a.day) end = a.day;
      return { start: a.day, end };
    }
    return null;
  }

  /* ---------- lecture des titres ---------- */
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  const stem = w => /^\d+$/.test(w) || w.length < 4 ? w : w.replace(/s$/, "").replace(/e$/, "");
  const toks = s => norm(s).split(" ").filter(Boolean).map(stem);

  const DEFAULT_WORDS = {
    abs: ["absent", "absence", "visite", "DVH", "droit de visite", "week-end", "WE", "vacances", "séjour", "chez papa", "chez maman", "chez sa mère", "chez son père", "chez ses parents", "chez sa famille", "hospitalisation", "hôpital", "colo", "colonie", "camp"],
    rel: ["relais", "accueil relais", "accueil", "arrivée", "arrive"]
  };
  // mots « neutres » : dates, liaisons, moments de la journée
  const NEUTRAL = new Set(["du", "au", "aux", "le", "la", "les", "l", "de", "d", "des", "a", "et", "en", "jusqu", "partir", "matin", "soir", "midi", "apres", "jour", "jours", "nuit", "nuits", "semaine", "h", "er", "1er", "inclus", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "lun", "mar", "mer", "jeu", "ven", "sam", "dim", "janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre", "janv", "fevr", "avr", "juil", "sept", "oct", "nov", "dec"].map(stem));

  function findAll(T, P) {
    const out = [];
    if (!P.length) return out;
    for (let i = 0; i + P.length <= T.length; i++) if (P.every((p, k) => T[i + k] === p)) out.push(i);
    return out;
  }
  const childNames = c => [c.first_name, ...(c.aliases || [])].map(toks).filter(t => t.length);

  // Quels enfants enregistrés sont nommés, et ce que dit le reste du titre.
  // sig : abs (mot d'absence) · rel (mot de relais) · only (prénom seul, avec des dates au plus)
  //       other (autre chose : « Mathéo médecin ») · both (absence et relais) · datesko (dates du titre ≠ dates de l'événement)
  function analyse(title, children, words) {
    const W = words || DEFAULT_WORDS, T = toks(title), used = new Array(T.length).fill(false), found = [];
    for (const c of children) {
      let hit = false;
      for (const P of childNames(c)) for (const i of findAll(T, P)) { hit = true; for (let k = 0; k < P.length; k++) used[i + k] = true; }
      if (hit) found.push(c);
    }
    if (!found.length) return [];
    const mark = list => { let hit = false; for (const w of list || []) { const P = toks(w); for (const i of findAll(T, P)) if (P.every((_, k) => !used[i + k] || used[i + k] === "w")) { hit = true; for (let k = 0; k < P.length; k++) used[i + k] = "w"; } } return hit; };
    const abs = mark(W.abs), rel = mark(W.rel);
    const other = T.some((t, i) => !used[i] && !NEUTRAL.has(t) && !/^\d+$/.test(t));
    const m = /\bdu (\d{1,2})(?: er)?(?: [a-z]+)? au (\d{1,2})\b/.exec(norm(title));
    const sig = abs && rel ? "both" : abs ? "abs" : rel ? "rel" : other ? "other" : "only";
    return found.map(c => ({ child_id: c.id, sig, dates: m ? [+m[1], +m[2]] : null }));
  }

  // Événements Google → lignes « presence_events » (seuls ceux qui nomment un enfant enregistré)
  function rowsFromGoogle(items, cal, children, words) {
    const rows = [];
    for (const e of items || []) {
      if (!e || e.status === "cancelled") continue;
      const span = eventDays(e); if (!span) continue;
      for (const a of analyse(e.summary || "", children, words)) {
        let sig = a.sig;
        if (a.dates && (+span.start.slice(8) !== a.dates[0] || +span.end.slice(8) !== a.dates[1])) sig = "datesko";
        rows.push({ child_id: a.child_id, gid: e.id, series: e.recurringEventId || e.id, cal: cal || "", title: String(e.summary || "").slice(0, 200), sig, start_day: span.start, end_day: span.end });
      }
    }
    return rows;
  }

  // Remplace les événements d'une fenêtre par ceux que Google vient de renvoyer.
  // Google renvoie TOUT événement qui touche la fenêtre : ce qui n'est plus renvoyé a été supprimé ou déplacé.
  function reconcile(existing, fetched, from, to) {
    const key = r => r.child_id + "|" + r.gid, now = new Set(fetched.map(key));
    const deletes = existing.filter(r => r.start_day <= to && r.end_day >= from && !now.has(key(r)));
    return { upserts: fetched, deletes };
  }

  /* ---------- règles de calcul ---------- */
  const ruleKeys = ev => ["s:" + (ev.series || ev.gid), "t:" + norm(ev.title)];
  function interpret(ev, kind, rules) {
    for (const k of ruleKeys(ev)) { const r = rules && rules.get(k + "|" + ev.child_id); if (r) return r; }
    const s = ev.sig;
    if (kind === "permanent") return s === "abs" ? "absence" : s === "other" ? "ignore" : "ambig";
    if (kind === "relais") return s === "only" || s === "rel" ? "presence" : "ambig";
    return "ignore";
  }

  function index(data) {
    const by = (list, f) => { const m = new Map(); for (const x of list || []) { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
    const periods = by(data.periods, p => p.child_id);
    for (const l of periods.values()) l.sort((a, b) => String(a.start_day).localeCompare(String(b.start_day)));
    return {
      children: data.children || [], periods,
      events: by(data.events, e => e.child_id),
      overrides: new Map((data.overrides || []).map(o => [o.child_id + "|" + String(o.day).slice(0, 10), o])),
      rules: new Map((data.rules || []).map(r => [r.key + "|" + r.child_id, r.decision]))
    };
  }
  function kindOn(ix, childId, day) {
    let k = null;
    for (const p of ix.periods.get(childId) || []) if (p.start_day <= day && (!p.end_day || day <= p.end_day)) k = p.kind;
    return k;
  }
  // Statut d'une journée : correction manuelle > hors période (aucun accueil) > règle du type d'accueil de CE jour-là
  function dayStatus(ix, childId, day) {
    const kind = kindOn(ix, childId, day);
    const evs = (ix.events.get(childId) || []).filter(e => e.start_day <= day && day <= e.end_day).map(e => ({ ev: e, it: interpret(e, kind, ix.rules) }));
    const unsure = evs.some(x => x.it === "ambig");
    let st, auto;
    if (!kind) auto = "none";
    else if (kind === "permanent") auto = evs.some(x => x.it === "absence") ? "absent" : "present";
    else auto = evs.some(x => x.it === "presence") ? "present" : "none";
    const o = ix.overrides.get(childId + "|" + day);
    st = o ? o.status : auto;
    return { st, auto, kind, manual: !!o, override: o || null, unsure: !o && unsure && !!kind, evs };
  }
  function stats(ix, childId, from, to) {
    const r = { present: 0, absent: 0, none: 0, unsure: 0, manual: 0, placed: 0, perm: { present: 0, absent: 0 }, rel: { present: 0, none: 0 } };
    for (const d of eachDay(from, to)) {
      const s = dayStatus(ix, childId, d);
      r[s.st]++; if (s.unsure) r.unsure++; if (s.manual) r.manual++;
      if (s.st !== "none") r.placed++;
      if (s.kind === "permanent" && s.st !== "none") r.perm[s.st]++;
      if (s.kind === "relais") r.rel[s.st === "present" ? "present" : "none"]++;
    }
    return r;
  }
  // enfants à afficher sur une période : actifs, plus les archivés qui avaient un accueil pendant cette période
  function childrenFor(ix, from, to) {
    return ix.children.filter(c => {
      const ov = (ix.periods.get(c.id) || []).some(p => p.start_day <= to && (!p.end_day || p.end_day >= from));
      return c.archived ? ov : true;
    });
  }
  const ambiguous = (ix, from, to) => {
    const out = [];
    for (const c of ix.children) for (const e of ix.events.get(c.id) || []) {
      if (e.end_day < from || e.start_day > to) continue;
      const days = []; for (const d of eachDay(e.start_day > from ? e.start_day : from, e.end_day < to ? e.end_day : to)) { const k = kindOn(ix, c.id, d); if (k && interpret(e, k, ix.rules) === "ambig") days.push(d); }
      if (days.length) out.push({ child: c, ev: e, days });
    }
    return out;
  };
  // [« 2026-11-02 », « 2026-11-03 »…] → [[début, fin], …]
  function ranges(days) {
    const out = [];
    for (const d of [...days].sort()) { const l = out[out.length - 1]; if (l && dAdd(l[1], 1) === d) l[1] = d; else out.push([d, d]); }
    return out;
  }

  const API = { TZ, DEFAULT_WORDS, dAdd, dDiff, dow, monthDays, mFirst, mLast, eachDay, paris, eventDays, norm, toks, analyse, rowsFromGoogle, reconcile, interpret, ruleKeys, index, kindOn, dayStatus, stats, childrenFor, ambiguous, ranges };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.PRC = API;
})(typeof window !== "undefined" ? window : globalThis);
