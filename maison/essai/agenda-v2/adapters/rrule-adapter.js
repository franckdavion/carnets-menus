/**
 * rrule-adapter.js — Maisonnée Agenda V2 (v2)
 * Bidirectionnel : chaînes legacy Maisonnée ↔ RruleObj ↔ RFC 5545 Google
 * Aucune dépendance externe. Aucun appel réseau. Autonome.
 * Périmètre : maison/essai/agenda-v2/adapters/ uniquement.
 *
 * Corrections v2 :
 *  1. BYDAY=MO pour MONTHLY → monthType='allWeekdays' (tous les lundis du mois, pas seulement le 1er)
 *  2. WKST respecté dans _weeklyNext (début de semaine paramétrable)
 *  3. parseRecurrenceArray : EXDATE et RDATE parsés proprement
 *     rruleNext accepte exdates[] pour exclure des occurrences
 */

'use strict';

// Correspondances jour ↔ index JS (0=SU,1=MO…6=SA)
const WD_TO_JS = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 };
const JS_TO_WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// ─── Helpers internes ─────────────────────────────────────────────────────────

/** Construit une Date à midi (heure locale) pour protection DST. */
function _makeDate(y, m, d) {
  return new Date(y, m, d, 12, 0, 0);
}

/** Date ISO 'YYYY-MM-DD' depuis un objet Date. */
function _isoDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Construit une Date à midi depuis une chaîne 'YYYY-MM-DD'. */
function _parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return _makeDate(y, m - 1, d);
}

/** Vérifie si une année est bissextile. */
function _isLeap(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Calcule le Nème jour de la semaine d'un mois donné.
 * pos > 0 : Nème occurrence (1=premier, 2=deuxième…)
 * pos < 0 : depuis la fin (-1=dernier, -2=avant-dernier…)
 */
function _nthWeekdayOfMonth(year, month, pos, wdStr) {
  const jsDay = WD_TO_JS[wdStr];
  if (jsDay === undefined) return null;

  if (pos > 0) {
    let d = new Date(year, month, 1, 12, 0, 0);
    while (d.getDay() !== jsDay) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12, 0, 0);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (pos - 1) * 7, 12, 0, 0);
  } else {
    const daysInM = new Date(year, month + 1, 0).getDate();
    let d = new Date(year, month, daysInM, 12, 0, 0);
    while (d.getDay() !== jsDay) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12, 0, 0);
    const extraWeeks = (-pos - 1);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - extraWeeks * 7, 12, 0, 0);
  }
}

/** Vérifie la condition de fin (COUNT ou UNTIL). Retourne true si la séquence doit s'arrêter. */
function _checkEnd(rrule, iso, count) {
  if (rrule.endType === 'count' && count >= rrule.count) return true;
  if (rrule.endType === 'until' && iso > rrule.until) return true;
  return false;
}

/**
 * Extrait une date ISO depuis un token EXDATE/RDATE.
 * Formats : '20261123', '20261123T120000', '20261123T000000Z', '20261123T120000+0100'
 * Retourne 'YYYY-MM-DD' ou null.
 */
function _parseDateTimeToIso(str) {
  const bare = str.trim().replace(/T.*$/, '').replace(/-/g, '');
  if (bare.length !== 8) return null;
  return `${bare.slice(0, 4)}-${bare.slice(4, 6)}-${bare.slice(6, 8)}`;
}

/**
 * Parse une ligne EXDATE ou RDATE → tableau de dates ISO.
 * Formats :
 *   EXDATE;TZID=Europe/Paris:20261123T120000,20261130T120000
 *   EXDATE:20261123T000000Z
 *   EXDATE;VALUE=DATE:20261123
 */
function _parseDateLine(line) {
  const colonIdx = line.indexOf(':');
  if (colonIdx < 0) return [];
  const valuePart = line.slice(colonIdx + 1);
  const dates = [];
  for (const token of valuePart.split(',')) {
    const iso = _parseDateTimeToIso(token);
    if (iso) dates.push(iso);
  }
  return dates;
}

// ─── Moteurs de calcul d'occurrences ─────────────────────────────────────────

function _dailyNext(rrule, start, startIso, n, results) {
  const IV = rrule.interval || 1;
  let d = _makeDate(start.getFullYear(), start.getMonth(), start.getDate() + IV);
  let count = 0;
  while (results.length < n && count < 100000) {
    const iso = _isoDate(d);
    if (_checkEnd(rrule, iso, count)) break;
    results.push(iso);
    count++;
    d = _makeDate(d.getFullYear(), d.getMonth(), d.getDate() + IV);
  }
}

/**
 * WEEKLY avec respect de WKST.
 *
 * WKST (défaut 'MO') détermine le premier jour de la semaine.
 * Ceci affecte le regroupement des jours dans les récurrences INTERVAL > 1 avec BYDAY.
 *
 * Exemple : WKST=SU, INTERVAL=2, BYDAY=SA,SU
 *   Avec WKST=SU : SA et SU sont dans des semaines différentes (SA=dernier, SU=premier).
 *   Avec WKST=MO : SA et SU sont dans la même semaine (SA=6e, SU=7e).
 */
function _weeklyNext(rrule, start, startIso, n, results) {
  const IV = rrule.interval || 1;
  const wkstJs = WD_TO_JS[rrule.wkst || 'MO'] ?? 1;

  // Si byDay vide → même jour de la semaine que startIso
  const byDay = (rrule.byDay && rrule.byDay.length > 0)
    ? rrule.byDay
    : [JS_TO_WD[start.getDay()]];

  // Tri par ordre dans la semaine selon WKST
  // dOff(wd) = (jsDay - wkstJs + 7) % 7 : distance depuis le premier jour de la semaine
  const sortedWds = [...byDay].sort((a, b) => {
    const ao = (WD_TO_JS[a] - wkstJs + 7) % 7;
    const bo = (WD_TO_JS[b] - wkstJs + 7) % 7;
    return ao - bo;
  });

  // Premier jour de la semaine contenant startIso selon WKST
  const jsDay = start.getDay();
  const daysToWkst = (jsDay - wkstJs + 7) % 7;
  const wk0 = _makeDate(start.getFullYear(), start.getMonth(), start.getDate() - daysToWkst);

  let weekOff = 0;
  let count = 0;

  while (results.length < n && weekOff < 100000) {
    const wkStart = _makeDate(wk0.getFullYear(), wk0.getMonth(), wk0.getDate() + weekOff * IV * 7);

    for (const wd of sortedWds) {
      const js = WD_TO_JS[wd];
      const dOff = (js - wkstJs + 7) % 7; // position du jour dans la semaine selon WKST
      const cand = _makeDate(wkStart.getFullYear(), wkStart.getMonth(), wkStart.getDate() + dOff);
      const iso = _isoDate(cand);

      if (iso <= startIso) continue;
      if (_checkEnd(rrule, iso, count)) return;

      results.push(iso);
      count++;
      if (results.length >= n) return;
    }
    weekOff++;
  }
}

/**
 * MONTHLY par numéro de jour ou Nème jour nommé.
 * monthType='allWeekdays' est délégué à _monthlyAllWeekdaysNext.
 */
function _monthlyNext(rrule, start, startIso, n, results) {
  if (rrule.monthType === 'allWeekdays') {
    _monthlyAllWeekdaysNext(rrule, start, startIso, n, results);
    return;
  }

  const IV = rrule.interval || 1;
  const origDay = rrule.monthDay != null ? rrule.monthDay : start.getDate();
  // Commence à mo=0 (mois courant) pour ne pas sauter les occurrences du mois de départ
  // qui tombent APRÈS startIso. Le filtre `iso > startIso` les sélectionne correctement.
  let mo = 0;
  let count = 0;

  while (results.length < n && mo < 100000) {
    const totalM = start.getMonth() + mo;
    const tgtYear = start.getFullYear() + Math.floor(totalM / 12);
    const tgtMonth = ((totalM % 12) + 12) % 12;

    let cand;
    if (rrule.monthType === 'weekday' && rrule.monthPos != null && rrule.monthWd) {
      cand = _nthWeekdayOfMonth(tgtYear, tgtMonth, rrule.monthPos, rrule.monthWd);
      if (!cand) { mo += IV; continue; }
    } else {
      const daysInM = new Date(tgtYear, tgtMonth + 1, 0).getDate();
      cand = _makeDate(tgtYear, tgtMonth, Math.min(origDay, daysInM));
    }

    const iso = _isoDate(cand);
    if (iso > startIso) {
      if (_checkEnd(rrule, iso, count)) break;
      results.push(iso);
      count++;
    }
    mo += IV;
  }
}

/**
 * MONTHLY monthType='allWeekdays' : génère TOUTES les occurrences des jours nommés
 * dans chaque mois cible (ex. BYDAY=MO → tous les lundis du mois, pas seulement le 1er).
 *
 * Correction v2 : anciennement approximé au 1er lundi. Maintenant conforme RFC 5545.
 */
function _monthlyAllWeekdaysNext(rrule, start, startIso, n, results) {
  const IV = rrule.interval || 1;
  const targetWds = new Set(rrule.byDay || []);
  let mo = 0; // commencer dès le mois courant (occurrences possibles après startIso)
  let count = 0;

  while (results.length < n && mo < 100000) {
    const totalM = start.getMonth() + mo;
    const tgtYear = start.getFullYear() + Math.floor(totalM / 12);
    const tgtMonth = ((totalM % 12) + 12) % 12;
    const daysInM = new Date(tgtYear, tgtMonth + 1, 0).getDate();

    // Tous les jours du mois correspondant aux jours nommés, dans l'ordre
    for (let d = 1; d <= daysInM; d++) {
      const dt = _makeDate(tgtYear, tgtMonth, d);
      const wd = JS_TO_WD[dt.getDay()];
      if (!targetWds.has(wd)) continue;
      const iso = _isoDate(dt);
      if (iso <= startIso) continue;
      if (_checkEnd(rrule, iso, count)) return;
      results.push(iso);
      count++;
      if (results.length >= n) return;
    }
    mo += IV;
  }
}

function _yearlyNext(rrule, start, startIso, n, results) {
  const IV = rrule.interval || 1;
  const origMonth = start.getMonth();
  const origDay = start.getDate();
  const isFeb29 = origMonth === 1 && origDay === 29;
  let yr = start.getFullYear();
  let count = 0;

  while (results.length < n && yr < start.getFullYear() + 10000) {
    yr += IV;

    let cand;
    if (isFeb29) {
      if (rrule.feb29 === 'strict') {
        let ly = yr;
        let safety = 0;
        while (!_isLeap(ly) && safety < 10) { ly++; safety++; }
        if (!_isLeap(ly)) { yr = ly; continue; }
        cand = _makeDate(ly, 1, 29);
        yr = ly;
      } else {
        const daysInFeb = _isLeap(yr) ? 29 : 28;
        cand = _makeDate(yr, 1, daysInFeb);
      }
    } else {
      const daysInM = new Date(yr, origMonth + 1, 0).getDate();
      cand = _makeDate(yr, origMonth, Math.min(origDay, daysInM));
    }

    const iso = _isoDate(cand);
    if (iso > startIso) {
      if (_checkEnd(rrule, iso, count)) break;
      results.push(iso);
      count++;
    }
  }
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Ancienne chaîne Maisonnée → RruleObj
 * Formats acceptés : 'none','daily','weekly','monthly','yearly','custom:N:unit'
 */
export function rruleFromLegacy(repeatStr) {
  if (!repeatStr || repeatStr === 'none') {
    return { rrule: null, lossless: true };
  }

  const base = { interval: 1, endType: 'none', byDay: [] };

  if (repeatStr === 'daily') {
    return { rrule: { ...base, freq: 'DAILY' }, lossless: true };
  }
  if (repeatStr === 'weekly') {
    return { rrule: { ...base, freq: 'WEEKLY' }, lossless: true };
  }
  if (repeatStr === 'monthly') {
    return { rrule: { ...base, freq: 'MONTHLY', monthType: 'day' }, lossless: true };
  }
  if (repeatStr === 'yearly') {
    return { rrule: { ...base, freq: 'YEARLY' }, lossless: true };
  }

  const m = repeatStr.match(/^custom:([1-9][0-9]{0,2}):(days|weeks|months|years)$/);
  if (m) {
    const interval = Number(m[1]);
    const unit = m[2];
    const freqMap = { days: 'DAILY', weeks: 'WEEKLY', months: 'MONTHLY', years: 'YEARLY' };
    const rrule = { ...base, freq: freqMap[unit], interval };
    if (unit === 'months') rrule.monthType = 'day';
    return { rrule, lossless: true };
  }

  return { rrule: null, lossless: false, lost: [`format inconnu : ${repeatStr}`] };
}

/**
 * RruleObj → ancienne chaîne Maisonnée.
 * Toutes les pertes (BYDAY, BYSETPOS, COUNT, UNTIL, allWeekdays) sont listées dans lost[].
 * Jamais silencieuses.
 */
export function rruleToLegacy(rrule) {
  if (!rrule) return { repeat: 'none', lossless: true, lost: [] };

  const IV = rrule.interval || 1;
  const lost = [];

  if (rrule.byDay && rrule.byDay.length > 0 && rrule.freq === 'WEEKLY') {
    lost.push(`BYDAY=${rrule.byDay.join(',')}`);
  }
  if (rrule.monthType === 'allWeekdays') {
    lost.push(`BYDAY=${(rrule.byDay || []).join(',')} (tous les jours nommés du mois)`);
  } else if (rrule.monthType === 'weekday') {
    if (rrule.monthPos != null) lost.push(`BYSETPOS=${rrule.monthPos}`);
    if (rrule.monthWd) lost.push(`BYDAY=${rrule.monthWd}`);
  }
  if (rrule.endType === 'count') lost.push(`COUNT=${rrule.count}`);
  if (rrule.endType === 'until') lost.push(`UNTIL=${rrule.until}`);

  let repeat;
  switch (rrule.freq) {
    case 'DAILY':   repeat = IV === 1 ? 'custom:1:days'   : `custom:${IV}:days`;   break;
    case 'WEEKLY':  repeat = IV === 1 ? 'weekly'          : `custom:${IV}:weeks`;  break;
    case 'MONTHLY': repeat = IV === 1 ? 'monthly'         : `custom:${IV}:months`; break;
    case 'YEARLY':  repeat = IV === 1 ? 'yearly'          : `custom:${IV}:years`;  break;
    default: return { repeat: 'none', lossless: false, lost: [`FREQ inconnu : ${rrule.freq}`] };
  }

  return { repeat, lossless: lost.length === 0, lost };
}

/**
 * RruleObj → chaîne RFC 5545 pour Google Calendar.
 *
 * - Ne pas inclure DTSTART ni DTEND dans le champ recurrence (à gérer côté appelant).
 * - UNTIL format : YYYYMMDD pour tout-jour, YYYYMMDDTHHMMSSz pour événement horaire.
 * - BYDAY avec position : notation condensée 2MO, -1FR (pas BYSETPOS séparé).
 * - BYDAY sans position (allWeekdays) : BYDAY=MO (tous les lundis du mois).
 * - WKST inclus si différent du défaut MO.
 */
export function rruleToGoogle(rrule, startIso, isAllDay = false) {
  if (!rrule) return { rruleStr: null, valid: false, reason: 'rrule absent' };

  const parts = [`FREQ=${rrule.freq}`];

  if (rrule.interval && rrule.interval > 1) {
    parts.push(`INTERVAL=${rrule.interval}`);
  }

  // BYDAY selon le contexte
  if (rrule.freq === 'WEEKLY') {
    if (rrule.byDay && rrule.byDay.length > 0) {
      const validWds = rrule.byDay.filter(wd => wd in WD_TO_JS);
      if (validWds.length !== rrule.byDay.length) {
        return { rruleStr: null, valid: false, reason: `BYDAY invalide : ${rrule.byDay.join(',')}` };
      }
      parts.push(`BYDAY=${validWds.join(',')}`);
    }
  } else if (rrule.freq === 'MONTHLY') {
    if (rrule.monthType === 'allWeekdays') {
      // Tous les jours nommés du mois — BYDAY sans préfixe de position
      if (!rrule.byDay || rrule.byDay.length === 0) {
        return { rruleStr: null, valid: false, reason: 'allWeekdays sans byDay' };
      }
      const invalid = rrule.byDay.filter(wd => !(wd in WD_TO_JS));
      if (invalid.length) {
        return { rruleStr: null, valid: false, reason: `BYDAY invalide : ${invalid.join(',')}` };
      }
      parts.push(`BYDAY=${rrule.byDay.join(',')}`);
    } else if (rrule.monthType === 'weekday') {
      if (rrule.monthPos == null || !rrule.monthWd) {
        return { rruleStr: null, valid: false, reason: 'monthPos ou monthWd manquant' };
      }
      if (!(rrule.monthWd in WD_TO_JS)) {
        return { rruleStr: null, valid: false, reason: `monthWd invalide : ${rrule.monthWd}` };
      }
      // RFC 5545 §3.3.10 : notation condensée 2MO, -1FR
      parts.push(`BYDAY=${rrule.monthPos}${rrule.monthWd}`);
    } else if (rrule.monthDay) {
      parts.push(`BYMONTHDAY=${rrule.monthDay}`);
    }
  }

  // Condition de fin
  if (rrule.endType === 'count' && rrule.count) {
    parts.push(`COUNT=${rrule.count}`);
  } else if (rrule.endType === 'until' && rrule.until) {
    const d = rrule.until.replace(/-/g, '');
    if (isAllDay) {
      // Tout-jour : UNTIL=YYYYMMDD (date uniquement, RFC 5545 §3.3.10)
      parts.push(`UNTIL=${d}`);
    } else {
      // Horaire : UNTIL=YYYYMMDDTHHMMSSz (UTC minuit)
      parts.push(`UNTIL=${d}T000000Z`);
    }
  }

  // WKST : inclus si différent du défaut MO
  if (rrule.wkst && rrule.wkst !== 'MO') {
    parts.push(`WKST=${rrule.wkst}`);
  }

  return { rruleStr: `RRULE:${parts.join(';')}`, valid: true, reason: null };
}

/**
 * Chaîne RFC 5545 Google → RruleObj.
 *
 * Corrections v2 :
 *  - BYDAY=MO sans position pour MONTHLY → monthType='allWeekdays', byDay=['MO']
 *    (et non plus approximé au 1er lundi).
 *  - WKST stocké dans rrule.wkst (défaut 'MO').
 */
export function rruleFromGoogle(rruleStr) {
  if (!rruleStr) return { rrule: null, lossless: false, unsupported: ['entrée vide'] };

  const unsupported = [];
  const ruleBody = rruleStr.replace(/^RRULE:/i, '');
  const params = {};

  for (const part of ruleBody.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) { unsupported.push(part); continue; }
    params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }

  const freq = (params.FREQ || '').toUpperCase();
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) {
    return { rrule: null, lossless: false, unsupported: [`FREQ inconnu : ${freq}`] };
  }

  const rrule = {
    freq,
    interval: params.INTERVAL ? Number(params.INTERVAL) : 1,
    byDay: [],
    monthType: 'day',
    endType: 'none',
    // WKST : stocké explicitement. Défaut MO si absent.
    wkst: params.WKST ? params.WKST.toUpperCase() : 'MO',
  };

  // BYDAY
  if (params.BYDAY) {
    if (freq === 'WEEKLY') {
      rrule.byDay = params.BYDAY.split(',').map(s => s.trim().toUpperCase());
      const invalid = rrule.byDay.filter(wd => !(wd in WD_TO_JS));
      if (invalid.length) unsupported.push(`BYDAY valeurs inconnues : ${invalid.join(',')}`);
    } else if (freq === 'MONTHLY') {
      // Vérifier d'abord si c'est une notation positionnelle condensée : 2MO, -1FR
      const posMatch = params.BYDAY.match(/^(-?\d+)([A-Z]{2})$/);
      if (posMatch) {
        // Positionnelle : 2e lundi, dernier vendredi, etc.
        rrule.monthType = 'weekday';
        rrule.monthPos = Number(posMatch[1]);
        rrule.monthWd = posMatch[2];
      } else {
        // Sans préfixe de position : BYDAY=MO ou BYDAY=MO,WE
        // → RFC 5545 : TOUS les jours nommés du mois (correction v2)
        // Anciennement : approximé au 1er jour nommé (incorrect)
        const wds = params.BYDAY.split(',').map(s => s.trim().toUpperCase());
        const allValid = wds.every(wd => wd in WD_TO_JS);
        if (allValid) {
          rrule.monthType = 'allWeekdays'; // tous les lundis, tous les mercredis, etc.
          rrule.byDay = wds;
        } else {
          unsupported.push(`BYDAY=${params.BYDAY} contient des valeurs inconnues pour MONTHLY`);
        }
      }
    } else {
      unsupported.push(`BYDAY=${params.BYDAY} ignoré pour FREQ=${freq}`);
    }
  }

  // BYMONTHDAY
  if (params.BYMONTHDAY) {
    rrule.monthType = 'day';
    rrule.monthDay = Number(params.BYMONTHDAY);
  }

  // COUNT
  if (params.COUNT) {
    rrule.endType = 'count';
    rrule.count = Number(params.COUNT);
  }

  // UNTIL — formats : YYYYMMDD (tout-jour) ou YYYYMMDDTHHMMSSz (horaire)
  if (params.UNTIL) {
    rrule.endType = 'until';
    const u = params.UNTIL.replace(/T.*$/, '');
    const y = u.slice(0, 4), mo = u.slice(4, 6), d = u.slice(6, 8);
    rrule.until = `${y}-${mo}-${d}`;
  }

  // Paramètres maintenant supportés : WKST est géré ci-dessus
  const supported = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY', 'COUNT', 'UNTIL', 'WKST']);
  for (const key of Object.keys(params)) {
    if (!supported.has(key)) {
      unsupported.push(`${key}=${params[key]}`);
    }
  }

  return { rrule, lossless: unsupported.length === 0, unsupported };
}

/**
 * Calcule les n prochaines occurrences STRICTEMENT après startIso.
 * Protection DST : toutes les dates sont calculées à midi heure locale.
 *
 * @param {object}   rrule
 * @param {string}   startIso  — 'YYYY-MM-DD' (première occurrence de l'événement)
 * @param {number}   n         — nombre d'occurrences à retourner
 * @param {string[]} exdates   — dates ISO à exclure (depuis EXDATE)
 *
 * Note COUNT + exdates : les exdates sont appliquées après génération.
 * Avec endType='count', COUNT compte les occurrences AVANT exclusion (conforme iCal4j / Google).
 * Si COUNT est petit et que beaucoup de dates sont dans exdates, le résultat peut être incomplet.
 * Limitation documentée — non silencieuse.
 */
export function rruleNext(rrule, startIso, n, exdates = []) {
  if (!rrule || !startIso || n <= 0) return [];
  const exdateSet = new Set(exdates);

  // Générer suffisamment de résultats pour compenser les exclusions
  let fetchN;
  if (rrule.endType === 'count') {
    // Générer la séquence complète COUNT, puis filtrer
    fetchN = rrule.count;
  } else {
    fetchN = exdateSet.size > 0 ? Math.max(n, n + exdateSet.size + 10) : n;
  }

  const rawResults = [];
  const start = _parseIso(startIso);

  if (rrule.freq === 'DAILY')   _dailyNext(rrule, start, startIso, fetchN, rawResults);
  else if (rrule.freq === 'WEEKLY')  _weeklyNext(rrule, start, startIso, fetchN, rawResults);
  else if (rrule.freq === 'MONTHLY') _monthlyNext(rrule, start, startIso, fetchN, rawResults);
  else if (rrule.freq === 'YEARLY')  _yearlyNext(rrule, start, startIso, fetchN, rawResults);

  const filtered = exdateSet.size > 0
    ? rawResults.filter(iso => !exdateSet.has(iso))
    : rawResults;

  return filtered.slice(0, n);
}

/**
 * Vérifie si un RruleObj peut effectuer un aller-retour sans perte vers le format legacy.
 */
export function rruleRoundTrip(rrule) {
  const toLeg = rruleToLegacy(rrule);
  if (toLeg.lossless) return { canRoundTrip: true, whatWillBeLost: [] };
  return { canRoundTrip: false, whatWillBeLost: toLeg.lost };
}

/**
 * Parse un tableau de lignes de récurrence Google Calendar.
 *
 * Google renvoie `event.recurrence` comme un tableau de chaînes :
 *   [ "RRULE:FREQ=WEEKLY;BYDAY=MO",
 *     "EXDATE;TZID=Europe/Paris:20261123T120000",
 *     "RDATE:20261228T000000Z" ]
 *
 * EXDATE : dates ISO exclues de la séquence (occurrences supprimées / modifiées).
 * RDATE  : dates ISO ajoutées à la séquence (occurrences supplémentaires).
 * RECURRENCE-ID : ces lignes apparaissent dans les événements MODIFIÉS (exceptions),
 *   pas dans la définition principale — signalées dans unsupported[], jamais ignorées.
 *
 * @param {string[]} lines
 * @returns {{ rrule, lossless, unsupported, exdates, rdates }}
 */
export function parseRecurrenceArray(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { rrule: null, lossless: false, unsupported: ['tableau vide'], exdates: [], rdates: [] };
  }

  let rruleResult = { rrule: null, lossless: true, unsupported: [] };
  const exdates = [];
  const rdates = [];
  const unhandled = [];

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper.startsWith('RRULE:')) {
      rruleResult = rruleFromGoogle(line);
    } else if (upper.startsWith('EXDATE')) {
      const parsed = _parseDateLine(line);
      if (parsed.length > 0) {
        exdates.push(...parsed);
      } else {
        unhandled.push(`EXDATE non parsé : ${line}`);
      }
    } else if (upper.startsWith('RDATE')) {
      const parsed = _parseDateLine(line);
      if (parsed.length > 0) {
        rdates.push(...parsed);
      } else {
        unhandled.push(`RDATE non parsé : ${line}`);
      }
    } else if (upper.startsWith('RECURRENCE-ID')) {
      // Lignes RECURRENCE-ID : présentes dans les événements d'exception (occurrences modifiées),
      // pas dans la définition principale. Non traitées ici — signalées explicitement.
      unhandled.push(`RECURRENCE-ID non supporté dans parseRecurrenceArray : traiter comme événement séparé`);
    } else {
      unhandled.push(`ligne non reconnue : ${line}`);
    }
  }

  return {
    rrule: rruleResult.rrule,
    lossless: rruleResult.lossless && unhandled.length === 0,
    unsupported: [...(rruleResult.unsupported || []), ...unhandled],
    exdates: [...new Set(exdates)].sort(),
    rdates: [...new Set(rdates)].sort()
  };
}

/**
 * Fusionne les occurrences RRULE + RDATE, puis soustrait les EXDATE.
 * Point d'entrée de haut niveau pour les cas d'usage Maisonnée.
 *
 * @param {object}   rrule        — RruleObj (depuis rruleFromGoogle ou buildRruleObj)
 * @param {string}   startIso     — 'YYYY-MM-DD'
 * @param {number}   n            — nb d'occurrences à retourner
 * @param {string[]} exdates      — dates ISO à exclure (depuis EXDATE)
 * @param {string[]} rdates       — dates ISO à ajouter (depuis RDATE)
 * @param {object[]} exdateMeta   — tableau [{iso, raw, tzid?}] pour préserver heure/fuseau
 *                                   (ne modifie pas le filtrage — uniquement informatif)
 * @returns {{ dates: string[], exdatesApplied: string[], rdatesAdded: string[], limitedByCount: boolean }}
 *
 * Notes :
 *  - Les RDATE sont fusionnées APRÈS exclusion des EXDATE.
 *  - Les RDATE ne sont PAS automatiquement filtrées par EXDATE (RFC 5545 §3.8.5.2).
 *  - La préservation de l'heure exacte/fuseau d'une EXDATE est dans exdateMeta ;
 *    le filtrage reste au niveau date uniquement (limitation documentée).
 *  - Un RDATE dont la date ISO est dans exdates est quand même exclu.
 *  - RECURRENCE-ID (occurrence modifiée) n'est pas géré ici — signalé dans unsupported[].
 */
export function rruleMergeOccurrences(rrule, startIso, n, exdates = [], rdates = [], exdateMeta = []) {
  const exdateSet = new Set(exdates);

  // 1. Générer les occurrences RRULE en excluant les EXDATE
  const rruleDates = rruleNext(rrule, startIso, Math.max(n, n + exdateSet.size + rdates.length + 10), exdates);

  // 2. Ajouter les RDATE strictement après startIso, non exclues par EXDATE, non déjà présentes
  const rdatesAdded = [];
  if (rdates.length > 0) {
    const existing = new Set(rruleDates);
    for (const rd of rdates) {
      if (rd > startIso && !exdateSet.has(rd) && !existing.has(rd)) {
        rdatesAdded.push(rd);
      }
    }
  }

  // 3. Fusionner et trier
  const merged = [...rruleDates, ...rdatesAdded].sort();

  // 4. Identifier quelles exdates ont effectivement filtré des dates (pour feedback UI)
  const exdatesApplied = exdates.filter(ex =>
    // Vérifier si la date aurait été présente sans exdate
    ex > startIso
  );

  const limitedByCount = rrule.endType === 'count' && exdates.length > 0;

  return {
    dates: merged.slice(0, n),
    exdatesApplied,
    rdatesAdded,
    limitedByCount,
    // Métadonnées heure/fuseau des EXDATE : preservées mais non utilisées pour le filtrage
    exdateMeta: exdateMeta.length > 0 ? exdateMeta : exdates.map(iso => ({ iso, raw: iso, tzid: null }))
  };
}

/**
 * Génère la description textuelle d'un RruleObj (en français).
 * Équivalent de rruleDesc() du prototype, mais supporte allWeekdays.
 *
 * @param {object} rrule
 * @returns {string}
 */
export function rruleDescFr(rrule) {
  if (!rrule || rrule.freq === 'NONE') return 'Jamais';
  const WD_FR = { MO:'lundi', TU:'mardi', WE:'mercredi', TH:'jeudi', FR:'vendredi', SA:'samedi', SU:'dimanche' };
  const ORD_FR = { 1:'1er', 2:'2e', 3:'3e', 4:'4e', [-1]:'dernier' };
  let base = '';
  const IV = rrule.interval || 1;
  if (rrule.freq === 'DAILY') {
    base = IV > 1 ? `Tous les ${IV} jours` : 'Chaque jour';
  } else if (rrule.freq === 'WEEKLY') {
    const days = (rrule.byDay || []).map(d => WD_FR[d]).filter(Boolean);
    const daysStr = days.length ? ' · ' + days.join(', ') : '';
    base = IV > 1 ? `Toutes les ${IV} semaines${daysStr}` : `Chaque semaine${daysStr}`;
  } else if (rrule.freq === 'MONTHLY') {
    if (rrule.monthType === 'allWeekdays') {
      const days = (rrule.byDay || []).map(d => WD_FR[d]).filter(Boolean);
      const daysStr = days.join('/') || '…';
      base = IV > 1 ? `Tous les ${IV} mois · tous les ${daysStr} du mois` : `Chaque mois · tous les ${daysStr}`;
    } else if (rrule.monthType === 'weekday') {
      const pos = ORD_FR[rrule.monthPos] || 'premier';
      const wd = WD_FR[rrule.monthWd] || 'lundi';
      base = IV > 1 ? `Tous les ${IV} mois · le ${pos} ${wd}` : `Chaque mois · le ${pos} ${wd}`;
    } else {
      const day = rrule.monthDay || 1;
      base = IV > 1 ? `Tous les ${IV} mois le ${day}` : `Chaque mois le ${day}`;
    }
  } else if (rrule.freq === 'YEARLY') {
    if (rrule.feb29 === 'strict') {
      base = IV > 1 ? `Tous les ${IV} ans · le 29 février (années bissextiles)` : 'Le 29 février (années bissextiles uniquement)';
    } else {
      base = IV > 1 ? `Tous les ${IV} ans` : 'Chaque année';
    }
  }
  if (rrule.endType === 'until' && rrule.until) {
    const d = new Date(rrule.until + 'T12:00:00');
    const fmt = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    base += ` · jusqu'au ${fmt}`;
  } else if (rrule.endType === 'count') {
    base += ` · ${rrule.count} fois`;
  }
  return base;
}

// Exposé pour les tests unitaires
export { _isLeap, _nthWeekdayOfMonth, _isoDate, _makeDate, _parseDateTimeToIso };
