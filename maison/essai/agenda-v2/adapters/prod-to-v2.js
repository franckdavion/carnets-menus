/**
 * prod-to-v2.js — Maisonnée Agenda Phase 0
 * Convertit un événement Supabase (table `events`) vers le format Agenda V2.
 *
 * Règles :
 *  - Aucune perte silencieuse : les champs inconnus sont portés dans _extra.
 *  - Les IDs Supabase réels (membres, événement) sont conservés tels quels.
 *  - Priorité à rrule_json (Phase 0+) sur repeat (legacy).
 *  - Pas de dépendance externe. Pas d'appel réseau.
 *  - Périmètre : maison/essai/agenda-v2/adapters/ uniquement.
 *  - Branche : preview/agenda-v2 uniquement.
 */

'use strict';

// ─── Champs connus de la table `events` ──────────────────────────────────────

const PROD_KNOWN_FIELDS = new Set([
  'id', 'household_id', 'created_by', 'created_at',
  'day', 'end_day', 'start_time', 'end_time', 'allday',
  'title', 'notes', 'place', 'kind',
  'members', 'repeat', 'rrule_json', 'reminders', 'gDefault',
  'travel', 'url', 'countdown', 'cal', 'colorId',
  'exdates', 'rdates', 'series_id',
]);

// ─── Mots-clés réservés (module Présences) ───────────────────────────────────

/**
 * Liste des mots-clés dont la présence dans un titre d'événement
 * déclenche une règle automatique dans le module Présences.
 * Source : presences-core.js — isDvh / isDeparture / isReturn + liste abs[].
 * Ne pas modifier sans vérifier presences-core.js.
 */
export const PRESENCE_KEYWORDS = [
  'abs', 'absent', 'absence', 'visite', 'dvh', 'droit de visite',
  'week-end', 'we', 'vacances', 'sejour', 'chez papa', 'chez maman',
  'chez sa mere', 'chez son pere', 'chez ses parents', 'chez sa famille',
  'hospitalisation', 'hopital', 'colo', 'colonie', 'camp',
  'dep', 'depart', 'retour', 'ret',
];

function _norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Retourne les mots-clés Présences détectés dans un titre.
 * Utilisé pour avertir l'éditeur V2 avant enregistrement.
 * @returns {string[]} liste des mots-clés trouvés (vide = aucun risque)
 */
export function detectPresenceKeywords(title) {
  if (!title) return [];
  const norm = _norm(title);
  return PRESENCE_KEYWORDS.filter(kw => new RegExp(`\\b${kw}\\b`).test(norm));
}

// ─── Conversion repeat → RruleObj ────────────────────────────────────────────

const UNIT_TO_FREQ = { days: 'DAILY', weeks: 'WEEKLY', months: 'MONTHLY', years: 'YEARLY' };

/**
 * Convertit le champ `repeat` Supabase en objet RruleObj V2.
 *
 * "none" / null → null
 * "weekly"      → {freq:'WEEKLY',   interval:1, byDay:[], endType:'never', wkst:'MO'}
 * "monthly"     → {freq:'MONTHLY',  interval:1, endType:'never', wkst:'MO'}
 * "yearly"      → {freq:'YEARLY',   interval:1, endType:'never', wkst:'MO'}
 * "custom:2:weeks"  → {freq:'WEEKLY',  interval:2, byDay:[], endType:'never', wkst:'MO'}
 * "custom:3:months" → {freq:'MONTHLY', interval:3, endType:'never', wkst:'MO'}
 *
 * @param {string|null} repeat
 * @returns {object|null}
 */
export function repeatToRrule(repeat) {
  if (!repeat || repeat === 'none') return null;

  // Format custom:N:unit
  const m = /^custom:(\d{1,3}):(days|weeks|months|years)$/.exec(repeat);
  if (m) {
    const interval = Number(m[1]);
    if (interval < 1) return null;
    const freq = UNIT_TO_FREQ[m[2]];
    const r = { freq, interval, endType: 'never', wkst: 'MO' };
    if (freq === 'WEEKLY') r.byDay = [];
    return r;
  }

  // Format simple
  const simple = { weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
  const freq = simple[repeat];
  if (!freq) return null;

  const r = { freq, interval: 1, endType: 'never', wkst: 'MO' };
  if (freq === 'WEEKLY') r.byDay = [];
  return r;
}

// ─── Normalisation des rappels → format V2 ───────────────────────────────────

/**
 * Normalise les rappels prod (number[] ou objets V2 déjà présents) vers le format V2.
 * Prod : [30, 60]           → [{type:'preset', min:30}, {type:'preset', min:60}]
 * V2   : [{type:'preset',…}] → inchangé
 */
export function normalizeRemindersToV2(reminders) {
  if (!Array.isArray(reminders)) return [];
  return reminders.map(r => {
    if (typeof r === 'number') {
      if (!Number.isFinite(r) || r < 0) return null;
      return { type: 'preset', min: r };
    }
    if (r && typeof r === 'object') return r; // déjà V2
    return null;
  }).filter(Boolean);
}

// ─── prodToV2 (conversion principale) ────────────────────────────────────────

/**
 * Convertit un événement Supabase (table `events`) vers le format Agenda V2.
 *
 * Champs V2 produits :
 *   id, household_id, created_by, created_at,
 *   date, end_date, start, end, allday,
 *   title, notes, lieu, type,
 *   members, rrule, reminders, gDefault,
 *   travel, url, countdown, cal, colorId,
 *   exdates, rdates, series_id,
 *   _extra (champs inconnus)
 *
 * @param {object} row - Ligne Supabase
 * @returns {object} Événement V2
 * @throws {TypeError|Error} si les champs obligatoires sont manquants
 */
export function prodToV2(row) {
  if (!row || typeof row !== 'object') throw new TypeError('prodToV2: row doit être un objet');
  if (!row.id) throw new Error('prodToV2: row.id est requis');
  if (!row.day) throw new Error('prodToV2: row.day est requis');

  // Récurrence : priorité à rrule_json (Phase 0+), sinon conversion depuis repeat
  const rrule = row.rrule_json
    ? (typeof row.rrule_json === 'string' ? JSON.parse(row.rrule_json) : row.rrule_json)
    : repeatToRrule(row.repeat);

  const ev = {
    id:           row.id,
    household_id: row.household_id ?? null,
    created_by:   row.created_by ?? null,
    created_at:   row.created_at ?? null,

    // Dates/heures (renommage)
    date:         row.day,
    end_date:     row.end_day ?? null,
    start:        row.start_time ?? null,
    end:          row.end_time ?? null,
    allday:       row.allday != null ? Boolean(row.allday) : !row.start_time,

    // Contenu
    title:        row.title ?? '',
    notes:        row.notes ?? '',
    lieu:         row.place ?? '',
    type:         row.kind ?? 'event',

    // Membres — IDs Supabase conservés tels quels, jamais remplacés par des IDs fictifs
    members:      Array.isArray(row.members) ? [...row.members] : [],

    // Récurrence
    rrule:        rrule ?? null,

    // Rappels
    reminders:    normalizeRemindersToV2(row.reminders),
    gDefault:     Boolean(row.gDefault),

    // Champs optionnels
    colorId:      row.colorId ?? null,
    travel:       row.travel ?? null,
    url:          row.url ?? null,
    countdown:    Boolean(row.countdown),
    cal:          row.cal ?? null,
  };

  // Champs RRULE avancés (Phase 0+)
  if (Array.isArray(row.exdates)  && row.exdates.length  > 0) ev.exdates   = [...row.exdates];
  if (Array.isArray(row.rdates)   && row.rdates.length   > 0) ev.rdates    = [...row.rdates];
  if (row.series_id) ev.series_id = row.series_id;

  // Champs inconnus → préservés dans _extra pour éviter toute perte silencieuse
  const extra = {};
  for (const k of Object.keys(row)) {
    if (!PROD_KNOWN_FIELDS.has(k)) extra[k] = row[k];
  }
  if (Object.keys(extra).length > 0) ev._extra = extra;

  return ev;
}
