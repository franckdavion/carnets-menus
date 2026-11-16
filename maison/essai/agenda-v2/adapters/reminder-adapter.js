/**
 * reminder-adapter.js — Maisonnée Agenda V2
 * Adapter : anciens entiers Maisonnée ↔ objets V2 du prototype ↔ payload Google Calendar
 * Aucune dépendance externe. Aucun appel réseau. Autonome.
 * Ne modifie PAS google-reminders.js ni aucun fichier de production.
 * Périmètre : maison/essai/agenda-v2/adapters/ uniquement.
 */

'use strict';

const MAX_GOOGLE_REMINDERS = 5;
const MAX_MINUTES = 40320; // 28 jours — limite production Maisonnée

// ─── normalizeReminders ───────────────────────────────────────────────────────
/**
 * Normalise toutes les variantes de rappels en tableau de minutes entières.
 *
 * Formats d'entrée acceptés :
 *   A) number[]          — ancien format Maisonnée (entiers)
 *   B) {type:'preset', min:number}    — objet V2 prototype
 *      {type:'custom', min:number}    — objet V2 prototype
 *      {type:'exact',  date:str, time:str}  — heure absolue V2
 *      {type:'at',     at:str}        — heure absolue production existante
 *
 * Les rappels à heure exacte (type 'exact'/'at') restent identifiés en tant que tels.
 * Ils ne sont PAS convertis de façon approximative. Si eventStartIso est fourni,
 * l'offset exact est calculé ; sinon, canConvert=false.
 *
 * @param {Array} input
 * @param {string|null} eventStartIso  - 'YYYY-MM-DDTHH:MM' ou 'YYYY-MM-DDTHH:MM:SS'
 * @returns {{ minutes, hasExact, exactReminders, conversionNote, outOfRange }}
 */
export function normalizeReminders(input, eventStartIso = null) {
  if (!Array.isArray(input) || input.length === 0) {
    return { minutes: [], hasExact: false, exactReminders: [], conversionNote: null, outOfRange: [] };
  }

  const rawMinutes = [];
  const outOfRange = [];
  const exactReminders = [];
  let hasExact = false;

  for (const item of input) {
    if (typeof item === 'number') {
      // Format A : entier minutes (legacy)
      if (Number.isInteger(item) && item >= 0 && item <= MAX_MINUTES) {
        rawMinutes.push(item);
      } else {
        outOfRange.push(item);
      }
    } else if (item && typeof item === 'object') {
      const { type } = item;

      if (type === 'preset' || type === 'custom') {
        // Format B : objet V2 avec propriété min
        const min = Number(item.min);
        if (Number.isInteger(min) && min >= 0 && min <= MAX_MINUTES) {
          rawMinutes.push(min);
        } else if (Number.isFinite(min)) {
          outOfRange.push(min);
        }
      } else if (type === 'exact' || type === 'at') {
        // Rappel à heure absolue — conserver comme tel
        hasExact = true;
        const dateStr = type === 'exact'
          ? `${item.date}T${item.time}`
          : item.at;

        if (eventStartIso) {
          const reminderMs = new Date(dateStr).getTime();
          const eventMs = new Date(eventStartIso).getTime();

          if (isNaN(reminderMs) || isNaN(eventMs)) {
            exactReminders.push({
              original: item,
              computedMinutes: null,
              canConvert: false,
              reason: 'format de date invalide'
            });
          } else {
            const diffMin = Math.round((eventMs - reminderMs) / 60000);
            if (diffMin >= 0 && diffMin <= MAX_MINUTES) {
              rawMinutes.push(diffMin);
              exactReminders.push({ original: item, computedMinutes: diffMin, canConvert: true });
            } else {
              exactReminders.push({
                original: item,
                computedMinutes: diffMin,
                canConvert: false,
                reason: diffMin < 0
                  ? 'le rappel est postérieur à l\'heure de début'
                  : 'plus de 28 jours avant l\'événement'
              });
            }
          }
        } else {
          // Pas d'heure de début → impossible de convertir sans approximation
          exactReminders.push({
            original: item,
            computedMinutes: null,
            canConvert: false,
            reason: 'eventStartIso non fourni — conversion exacte impossible'
          });
        }
      }
      // Les types inconnus sont ignorés silencieusement (robustesse)
    }
  }

  // Dédoublonnage et tri croissant
  const minutes = [...new Set(rawMinutes)].sort((a, b) => a - b);

  const conversionNote = exactReminders.length > 0
    ? `${exactReminders.length} rappel(s) à heure exacte identifié(s) — ` +
      `l'offset sera recalculé si l'heure de l'événement change`
    : null;

  return { minutes, hasExact, exactReminders, conversionNote, outOfRange };
}

// ─── buildGooglePayload ───────────────────────────────────────────────────────
/**
 * Construit la payload Google Calendar pour les rappels.
 * Ne tronque JAMAIS silencieusement.
 * Si > 5 rappels : requiresDecision=true, les excédents sont dans truncated[].
 *
 * Compatible avec google-reminders.js buildRemindersPayload() — même format de sortie,
 * mais sans tronquer et avec signalement explicite.
 *
 * @param {number[]} minutes
 * @param {boolean} useDefault
 * @returns {{ payload, kept, truncated, requiresDecision }}
 */
export function buildGooglePayload(minutes, useDefault = false) {
  if (useDefault) {
    return {
      payload: { useDefault: true },
      kept: [],
      truncated: [],
      requiresDecision: false
    };
  }

  const valid = [...new Set(
    (Array.isArray(minutes) ? minutes : [])
      .filter(m => Number.isInteger(m) && m >= 0 && m <= MAX_MINUTES)
  )].sort((a, b) => a - b);

  const kept = valid.slice(0, MAX_GOOGLE_REMINDERS);
  const truncated = valid.slice(MAX_GOOGLE_REMINDERS);

  return {
    payload: {
      useDefault: false,
      overrides: kept.map(m => ({ method: 'popup', minutes: m }))
    },
    kept,
    truncated,
    requiresDecision: truncated.length > 0
  };
}

// ─── remindersToGoogle ────────────────────────────────────────────────────────
/**
 * Pipeline complet : normaliser + préparer payload Google + détecter excès.
 *
 * Si requiresDecision=true, la payload NE DOIT PAS être envoyée automatiquement.
 * L'appelant doit présenter truncated[] à l'utilisateur et recueillir un choix explicite.
 *
 * @param {Array}        input
 * @param {string|null}  eventStartIso
 * @param {boolean}      useDefault
 */
export function remindersToGoogle(input, eventStartIso = null, useDefault = false) {
  const norm = normalizeReminders(input, eventStartIso);
  const google = buildGooglePayload(norm.minutes, useDefault);

  return {
    payload: google.payload,
    normalized: norm.minutes,
    kept: google.kept,
    truncated: google.truncated,
    requiresDecision: google.requiresDecision,
    hasExact: norm.hasExact,
    exactReminders: norm.exactReminders,
    conversionNotes: norm.conversionNote ? [norm.conversionNote] : [],
    outOfRange: norm.outOfRange
  };
}

// ─── canFanOut ────────────────────────────────────────────────────────────────
/**
 * Détermine les membres de la famille qui recevront le rappel (fan-out).
 * Compatible avec reminderTargets() de google-reminders.js.
 * Ne modifie PAS google-reminders.js.
 *
 * @param {string} actorUserId
 * @param {Array<{userId, name?, hasToken, familyReminders}>} members
 */
export function canFanOut(actorUserId, members) {
  if (!Array.isArray(members)) return { targets: [], missingToken: [] };

  const targets = [];
  const missingToken = [];

  for (const m of members) {
    // Inclure l'acteur lui-même + membres avec familyReminders=true
    const shouldInclude = m.userId === actorUserId || m.familyReminders === true;
    if (!shouldInclude) continue;

    if (m.hasToken) {
      targets.push({
        userId: m.userId,
        name: m.name || m.userId,
        reason: m.userId === actorUserId ? 'actor' : 'familyReminders'
      });
    } else {
      missingToken.push(m.userId);
    }
  }

  return { targets, missingToken };
}
