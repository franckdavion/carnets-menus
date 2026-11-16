/**
 * v2-to-prod.js — Maisonnée Agenda Phase 0
 * Convertit un événement Agenda V2 vers le format Supabase (table `events`).
 * Réciproque de prod-to-v2.js.
 *
 * Règles :
 *  - Aucune perte silencieuse : les champs _extra sont ré-injectés.
 *  - Les IDs Supabase réels sont conservés — jamais remplacés par des IDs fictifs.
 *  - rrule_json stocke l'objet RRULE complet (BYDAY, UNTIL, exdates, etc.).
 *  - repeat est dérivé pour maintenir la compatibilité avec app.js / cal.js.
 *  - Les RRULE avancées dégradent repeat vers le plus proche équivalent simple.
 *  - Pas de dépendance externe. Pas d'appel réseau.
 *  - Périmètre : maison/essai/agenda-v2/adapters/ uniquement.
 *  - Branche : preview/agenda-v2 uniquement.
 */

'use strict';

import { detectPresenceKeywords } from './prod-to-v2.js';
export { detectPresenceKeywords };

// ─── Conversion RruleObj → repeat (rétrogradation) ───────────────────────────

/**
 * Convertit un objet RruleObj V2 en chaîne `repeat` Supabase.
 *
 * La conversion est lossy pour les RRULE avancées (byDay, endType, exdates).
 * C'est intentionnel : ces données sont préservées dans rrule_json.
 * `repeat` sert uniquement à la compatibilité avec l'ancien code (app.js, cal.js).
 *
 * null                        → "none"
 * {freq:'WEEKLY',  interval:1} → "weekly"
 * {freq:'MONTHLY', interval:1} → "monthly"
 * {freq:'YEARLY',  interval:1} → "yearly"
 * {freq:'WEEKLY',  interval:2} → "custom:2:weeks"
 * {freq:'DAILY',   interval:3} → "custom:3:days"
 *
 * @param {object|null} rrule
 * @returns {string}
 */
export function rruleToRepeat(rrule) {
  if (!rrule || !rrule.freq || rrule.freq === 'NONE') return 'none';

  const { freq, interval = 1 } = rrule;
  const unit = { DAILY: 'days', WEEKLY: 'weeks', MONTHLY: 'months', YEARLY: 'years' }[freq];
  if (!unit) return 'none';

  if (interval === 1) {
    const simple = { WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' };
    if (simple[freq]) return simple[freq];
  }

  if (!Number.isInteger(interval) || interval < 1 || interval > 999) return 'none';
  return `custom:${interval}:${unit}`;
}

// ─── Normalisation des rappels → format prod ─────────────────────────────────

/**
 * Normalise les rappels V2 vers le format prod (number[]).
 *
 * V2  : [{type:'preset', min:30}, {type:'custom', min:60}]
 * Prod: [30, 60]
 *
 * Les rappels à heure exacte (type:'exact') ne peuvent pas être convertis
 * sans la date de l'événement → retournés sous forme d'objet pour signalement.
 * Aucune perte silencieuse.
 *
 * @returns {{ minutes: number[], exactReminders: object[], hasExact: boolean }}
 */
export function normalizeRemindersToProd(reminders) {
  if (!Array.isArray(reminders)) return { minutes: [], exactReminders: [], hasExact: false };

  const minutes = [];
  const exactReminders = [];

  for (const r of reminders) {
    if (typeof r === 'number') {
      if (Number.isFinite(r) && r >= 0) minutes.push(r);
    } else if (r && typeof r === 'object') {
      if (r.type === 'preset' || r.type === 'custom') {
        const min = Number(r.min);
        if (Number.isFinite(min) && min >= 0) minutes.push(min);
      } else if (r.type === 'exact' || r.type === 'at') {
        exactReminders.push(r); // préservé, signalé
      } else if (typeof r.min === 'number') {
        minutes.push(r.min); // objet inconnu avec min → converti
      }
    }
  }

  return { minutes, exactReminders, hasExact: exactReminders.length > 0 };
}

// ─── v2ToProd (conversion principale) ────────────────────────────────────────

/**
 * Convertit un événement Agenda V2 vers un objet Supabase `events`.
 *
 * @param {object} ev  - Événement V2
 * @param {object} [opts]
 * @param {boolean} [opts.isNewRecord=false] - true = pas d'id requis (INSERT)
 * @returns {{ row: object, warnings: string[] }}
 *   row      : objet prêt pour Supabase
 *   warnings : liste d'avertissements (perte partielle, mots-clés présence, etc.)
 *
 * @throws {TypeError|Error} si les champs obligatoires sont manquants
 */
export function v2ToProd(ev, opts = {}) {
  if (!ev || typeof ev !== 'object') throw new TypeError('v2ToProd: ev doit être un objet');
  if (!opts.isNewRecord && !ev.id) throw new Error('v2ToProd: ev.id est requis pour une mise à jour');
  if (!ev.date) throw new Error('v2ToProd: ev.date est requis');

  const warnings = [];

  // ─── Récurrence ────────────────────────────────────────────────────────────
  // rrule_json : stockage complet de la RRULE V2 (Phase 0 migration SQL)
  const rrule_json = ev.rrule || null;
  // repeat : chaîne legacy pour compatibilité app.js / cal.js
  const repeat = rruleToRepeat(ev.rrule);

  // Avertissement si la RRULE avancée ne peut pas être représentée en repeat
  if (rrule_json && repeat !== 'none') {
    const hasAdvanced = (rrule_json.byDay && rrule_json.byDay.length > 0)
      || rrule_json.endType === 'until' || rrule_json.endType === 'count'
      || (Array.isArray(ev.exdates) && ev.exdates.length > 0);
    if (hasAdvanced) {
      warnings.push(
        'RRULE avancée (byDay/until/count/exdates) stockée dans rrule_json — ' +
        'le champ repeat est une approximation. ' +
        'Migration SQL Phase 0 requise pour les exploiter.'
      );
    }
  }

  // ─── Rappels ───────────────────────────────────────────────────────────────
  const { minutes: reminderMinutes, exactReminders, hasExact } = normalizeRemindersToProd(ev.reminders);
  if (hasExact) {
    warnings.push(
      `${exactReminders.length} rappel(s) à heure exacte (type:'exact') non convertis ` +
      'en entiers — conservés sous forme d\'objet. ' +
      'Utiliser MaisonGoogleReminders.buildRemindersPayload() pour la sync Google.'
    );
  }
  const reminders = hasExact
    ? [...reminderMinutes, ...exactReminders]
    : reminderMinutes;

  // ─── Mots-clés Présences ───────────────────────────────────────────────────
  const presenceKws = detectPresenceKeywords(ev.title);
  if (presenceKws.length > 0) {
    warnings.push(
      `Titre contient ${presenceKws.length} mot(s)-clé(s) réservé(s) pour le module Présences : ` +
      `"${presenceKws.join('", "')}" — ` +
      'cet événement sera interprété automatiquement dans le calcul de garde.'
    );
  }

  // ─── Construction du row ───────────────────────────────────────────────────
  const row = {
    // Identifiants
    ...(ev.id          && { id:           ev.id }),
    ...(ev.household_id && { household_id: ev.household_id }),
    ...(ev.created_by  && { created_by:   ev.created_by }),
    ...(ev.created_at  && { created_at:   ev.created_at }),

    // Dates/heures (renommage inverse)
    day:        ev.date,
    end_day:    ev.end_date ?? null,
    start_time: ev.start ?? null,
    end_time:   ev.end ?? null,
    allday:     ev.allday != null ? Boolean(ev.allday) : !ev.start,

    // Contenu
    title:  ev.title ?? '',
    notes:  ev.notes ?? '',
    place:  ev.lieu ?? '',
    kind:   ev.type ?? 'event',

    // Membres — IDs Supabase conservés tels quels
    members: Array.isArray(ev.members) ? [...ev.members] : [],

    // Récurrence
    repeat,
    rrule_json,

    // Rappels
    reminders,
    gDefault: Boolean(ev.gDefault),

    // Champs optionnels
    ...(ev.colorId   != null && { colorId:   ev.colorId }),
    travel:    ev.travel    ?? null,
    url:       ev.url       ?? null,
    countdown: Boolean(ev.countdown),
    cal:       ev.cal       ?? null,
  };

  // Champs RRULE avancés (Phase 0+)
  if (Array.isArray(ev.exdates) && ev.exdates.length > 0) row.exdates = [...ev.exdates];
  if (Array.isArray(ev.rdates)  && ev.rdates.length  > 0) row.rdates  = [...ev.rdates];
  if (ev.series_id) row.series_id = ev.series_id;

  // Ré-injection des champs _extra (aucune perte silencieuse)
  if (ev._extra && typeof ev._extra === 'object') {
    for (const [k, v] of Object.entries(ev._extra)) {
      if (!(k in row)) row[k] = v;
      else warnings.push(`_extra.${k} ignoré : conflit avec un champ standard.`);
    }
  }

  return { row, warnings };
}
