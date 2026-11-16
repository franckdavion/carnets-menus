# Maisonnée Agenda V2 — Audit d'intégration

> Lecture seule — aucune modification de production, aucun déploiement.  
> Date : 2026-11-16

---

## Mission 1 — Dépendances internes de l'Agenda Maisonnée

### 1.1 Modules qui lisent ou écrivent les événements

| Module | Fichier | Rôle vis-à-vis de l'agenda |
|--------|---------|---------------------------|
| **Agenda principal** | `app.js` | CRUD complet des événements Supabase + sync Google Calendar |
| **Vue agenda** | `modules.js` | Rendu de la vue agenda (liste/mois/semaine) |
| **Anniversaires** | `modules.js` | `bdaysOn(day)` → injecté dans la vue agenda |
| **Évts Google** | `modules.js` | `gEventsOn(day)` → superpose les événements Google |
| **Tâches Google** | `modules.js` | `gTasksOn(day)` → superpose les tâches Google |
| **Présences** | `presences.js` + `presences-core.js` | Lit les événements Google Calendar pour calculer la garde des enfants |
| **Trajets** | `presences-trajets.js` + `presences-trajets-core.js` | Extrait les lieux/transports depuis les titres d'événements Google |
| **Tâches → Google** | `gtaches.js` | Copie les tâches Maisonnée en événements Google "toute la journée" |

---

### 1.2 Format des événements Supabase (table `events`)

```js
{
  id,            // uuid
  household_id,
  title,         // string
  day,           // ISO date "YYYY-MM-DD"
  end_day,       // ISO date | null
  start_time,    // "HH:MM" | null
  end_time,      // "HH:MM" | null
  repeat,        // "none"|"weekly"|"monthly"|"yearly"|"custom:N:unit"
  members,       // string[]  → ids du foyer
  place,         // string
  notes,         // string
  kind,          // "event"|"rdv"|"task"
  reminders,     // object[] (via MaisonGoogleReminders)
  gDefault,      // boolean
  created_by,    // user_id
  created_at,    // timestamp
}
```

**Récurrence** : champ `repeat` avec format propre :  
- `"weekly"`, `"monthly"`, `"yearly"` → fréquences simples  
- `"custom:N:unit"` (ex. `"custom:2:weeks"`) → intervalle libre  
- Développé par `MaisonCal.repeatRule()` + `recurrenceDate()` dans `app.js:1044`  
- Max 800 itérations par série

---

### 1.3 Synchronisation Google Calendar

**Écriture (app.js)** :
- `googleEventPayload(row)` (l.2288) → traduit un row Supabase en payload Google
- `saveGoogleEvent(calendarId, row)` (l.2334) → POST/PATCH vers l'API Google
- `saveGoogleReminders(calendarId, eventId, body)` (l.2314)
- Format de récurrence Google généré : `RRULE:FREQ=...;INTERVAL=N` (sans BYDAY, sans UNTIL/COUNT)

**Lecture (modules.js)** :
- `gFetch()` (l.4485) → charge les événements Google
- `gEventsOn(day)` (l.4558) → filtre `G.ev.items` par `e.day === day`
- `gTasksOn(day)` (l.4451) → filtre les tâches Google

---

### 1.4 Module Présences — dépendances agenda

**Source de données** : événements Google Calendar (titres).

**Règles d'interprétation** (`presences-core.js`) :
- `isDvh(title)` : `/\bdvh\b/` → "droit de visite hebdomadaire"
- `isDeparture(title)` : `/\b(dep|depart)\b/`
- `isReturn(title)` : `/\b(retour|ret)\b/`
- `isAbs(title)` : mots-clés `abs`, `absent`, `absence`, `visite`, `DVH`, `WE`, `vacances`…
- `dayStatus(ix, childId, day)` : priorité **override manuel > aucun accueil > règle auto**
- `interpret(ev, kind, rules)` : pour type `permanent` : DVH → présence, départ → départ, retour → retour, abs → absence

**Tables Supabase** :
- `children`, `child_periods`, `presence_events`, `presence_overrides`, `presence_rules`

**Contrat implicite** : les titres des événements Google sont analysés à la volée. Toute modification du format de titre (par V2) pourrait casser la détection automatique.

---

### 1.5 Module Trajets — dépendances agenda

**Source de données** : événements Google Calendar (titres + lieux).

**Règles d'exclusion** (`presences-trajets-core.js`) :
- Exclut événements scolaires : `/\b(ecole|college|lycee|garderie|cantine|ramassage|bus scolaire)\b/`
- Types de trajet : `pp` (ping-pong), `medical`, `activite`

**Tables Supabase** :
- `child_trips`, `child_trip_places`, `child_trip_event_marks`, `child_trip_ignore_rules`

---

### 1.6 Module Tâches → Google (gtaches.js)

**Principe** : copie les tâches Maisonnée en événements Google "toute la journée".

**Marquage** : `extendedProperties.shared.mzk = householdId + "|" + taskId + "|" + day`  
Idempotent : ID événement = SHA-256 de `householdId + "|" + key` → préfixé `mz...`

**Tables** : lit `S.hh.google_tasks` (config) depuis Supabase `households`  
**Calendrier cible** : configurable par foyer, stocké dans `households.google_tasks`

**Dépendance V2** : aucune dépendance directe vers l'agenda V2 — les tâches restent dans leur propre module.

---

### 1.7 Synthèse des risques (Mission 1)

| Risque | Niveau | Module concerné |
|--------|--------|-----------------|
| Présences lisent les titres Google → V2 pourrait en créer avec des titres différents | **Élevé** | presences-core.js |
| Trajets excluent par titre → même risque | **Moyen** | presences-trajets-core.js |
| Format `repeat` Supabase incompatible avec RRULE V2 | **Élevé** | app.js / V2 |
| `reminders` format V2 (objets `{type, min}`) vs format prod (via MaisonGoogleReminders) | **Moyen** | app.js / V2 |
| `members[]` prod = ids foyer, V2 = ids fictifs `['f','m','l']` | **Élevé** | Tous modules |
| `googleEventPayload` ne génère pas BYDAY/UNTIL → sync Google incomplète pour V2 | **Moyen** | app.js |

---

## Mission 2 — Comparaison Agenda V2 vs Production

### 2.1 Structure des événements

| Champ | Production (Supabase) | Agenda V2 (shell.html) | Action requise |
|-------|----------------------|------------------------|---------------|
| Identifiant | `id` (uuid Supabase) | `id` (string locale) | Adapter à uuid |
| Date début | `day` (ISO) | `date` (ISO) | **Renommer** `date` → `day` |
| Date fin | `end_day` | `end_date` | **Renommer** `end_date` → `end_day` |
| Heure début | `start_time` ("HH:MM") | `start` ("HH:MM") | **Renommer** `start` → `start_time` |
| Heure fin | `end_time` ("HH:MM") | `end` ("HH:MM") | **Renommer** `end` → `end_time` |
| Récurrence | `repeat` ("none"\|"weekly"…) | `repeat` (string label) + `rrule` (objet RRULE) | **Migrer** (voir 2.2) |
| Membres | `members[]` (ids foyer Supabase) | `members[]` (ids fictifs `['f','m','l']`) | **Mapper** ids |
| Lieu | `place` | `lieu` | **Renommer** `lieu` → `place` |
| Rappels | `reminders[]` (via MaisonGoogleReminders) | `reminders[]` (objets `{type, min}`) | **Adapter** format |
| Agenda | — | `cal` (string) | Nouveau champ, optionnel |
| Type | `kind` ("event"\|"rdv"\|"task") | `type` ("event"\|"rdv"\|"task") | **Renommer** `type` → `kind` |
| Notes | `notes` | `notes` | ✓ Identique |
| Toute la journée | — | `allday` (bool) | Nouveau champ Supabase à ajouter |
| Countdown | — | `countdown` (bool) | Nouveau champ optionnel |
| Trajet | — | `travel` (string) | Nouveau champ optionnel |
| URL | — | `url` (string) | Nouveau champ optionnel |
| Contact/Tél/Email | — | `contact`, `phone`, `email` | Nouveaux champs (rdv) |
| SeriesId | — | `seriesId` | Nouveau champ pour séries récurrentes |
| exdates/rdates | — | `exdates[]`, `rdates[]` | Nouveaux champs RRULE |

---

### 2.2 Systèmes de récurrence

| Aspect | Production | V2 |
|--------|------------|-----|
| Format stocké | `repeat: "none"\|"weekly"\|"monthly"\|"yearly"\|"custom:N:unit"` | `rrule: {freq, interval, byDay, monthType, monthDay, monthPos, monthWd, endType, until, count, feb29, wkst}` |
| Développement | `MaisonCal.repeatRule()` + `recurrenceDate()` dans app.js | `rruleNext(r, startIso, n, exdates)` dans shell.html + `rrule-adapter.js` |
| Jours spécifiques | Non (jour de semaine implicite) | Oui : `byDay: ['MO','WE',…]` |
| Fin de série | Non | Oui : `endType: 'never'\|'until'\|'count'` |
| Exdates | Non | Oui : `exdates[]` |
| Rdates | Non | Oui : `rdates[]` |
| Complexité mensuelle | Simple (jour fixe) | Riche : `monthType: 'day'\|'week'\|'last'\|'custom'` + `monthPos`, `monthWd` |
| Sync Google | RRULE simple (`FREQ=X;INTERVAL=N`) | Doit générer RRULE complète avec BYDAY/UNTIL |

**Compatibilité ascendante** : un événement prod `repeat:"weekly"` peut être converti en `rrule:{freq:'WEEKLY',interval:1,byDay:[],endType:'never'}`. Un événement V2 riche (`byDay:['MO','WE']`) n'a pas d'équivalent prod direct → nécessite la nouvelle colonne RRULE.

---

### 2.3 Rappels

| Aspect | Production | V2 |
|--------|------------|-----|
| Format | `MaisonGoogleReminders.buildRemindersPayload()` → format Google API | `{type:'preset'\|'custom'\|'exact', min:N, label:?, date:?, time:?}` |
| Rendu | Via `MaisonGoogleReminders.summarizeReminderResults()` | Via `fmtRemLabel(r)` dans shell.html |
| Rappels par défaut | `gDefault: true` → utilise les rappels Google par défaut | — |
| Format à aligner | Objet V2 → doit être traduit au format Google API lors de la sync | Adapter `reminder-adapter.js` (223 lignes, déjà présent) |

---

### 2.4 Membres / Foyer

| Aspect | Production | V2 |
|--------|------------|-----|
| `MEMBERS` | Chargés dynamiquement depuis Supabase `households.members` | Hardcodés : `[{id:'f',…},{id:'m',…},{id:'l',…}]` |
| Couleurs | Stockées dans Supabase | Hardcodées dans `MEMBERS` |
| Avatars | Générés depuis les initiales | Idem |
| Impact | `members[]` dans les événements = ids réels Supabase | Doit pointer vers les mêmes ids après intégration |

---

### 2.5 Navigation

| Aspect | Production | V2 |
|--------|------------|-----|
| Navigation principale | Tab bar Maisonnée (5 onglets) | Pill flottante (3 boutons simulés) + tab bar V2 masqué |
| Entrée depuis | `VIEWS.agenda` dans modules.js | Shell HTML autonome |
| Retour | `mzBack()` → `sessionStorage.mz_return_to` | Simulé |
| Création événement | `eventSheet(e, day, …)` dans app.js | FAB Maisonnée + éditeur plein écran V2 |

---

### 2.6 Adaptateurs V2 déjà développés

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `adapters/rrule-adapter.js` | 758 | Développement RRULE → occurrences (`rruleNext`, `rruleDesc`, `_requiresAdapter`) |
| `adapters/reminder-adapter.js` | 223 | Format rappels V2 ↔ Google API |

Ces adaptateurs sont des ES modules chargés dans `shell.html` via `<script type="module">` et exposés via `window._RA` et `window._RemA`.

---

## Mission 3 — Plan d'intégration progressif

### Principes directeurs

1. **Source de vérité unique** : Supabase reste la source de vérité pour les données prod. L'Agenda V2 lit depuis Supabase, écrit vers Supabase via les fonctions existantes de `app.js`.
2. **Zéro migration destructive** : chaque nouvelle colonne est additive (`allday`, `rrule_json`, `travel`, `url`, `countdown`, `series_id`). Les colonnes existantes sont conservées.
3. **Rétrocompatibilité** : `app.js` continue de fonctionner avec l'ancien format. L'adaptateur V2 traduit à la volée.
4. **Réutiliser les fonctions existantes** : `googleEventPayload()`, `saveGoogleEvent()`, `gFetch()`, `occurrences()`, `MaisonGoogleReminders` sont réutilisés tels quels ou enrichis.
5. **Aucune modification des modules Présences/Trajets** : ils lisent Google Calendar, pas les événements V2 directement.

---

### Phase 0 — Préparation (sans déploiement prod)

**Objectif** : aligner les modèles de données.

**Actions** :
- [ ] Définir le schéma de migration SQL (colonnes additives) :
  ```sql
  ALTER TABLE events 
    ADD COLUMN IF NOT EXISTS allday boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS rrule_json jsonb DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS travel text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS url text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS countdown boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS series_id uuid DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS exdates text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS rdates text[] DEFAULT '{}';
  ```
- [ ] Écrire un adaptateur `prod-to-v2(row)` qui traduit un événement Supabase vers le format V2 :
  - `row.day` → `e.date`
  - `row.start_time` → `e.start`
  - `row.end_time` → `e.end`
  - `row.place` → `e.lieu`
  - `row.kind` → `e.type`
  - `row.repeat` → `e.rrule` via `repeatToRrule(repeat)`
  - `row.rrule_json` (si présent) → `e.rrule` (prioritaire)
- [ ] Écrire un adaptateur `v2-to-prod(es)` pour le chemin inverse (éditeur V2 → save Supabase)
- [ ] Tests unitaires sur les deux adaptateurs avec les cas prod actuels

**Préconditions** : validation du schéma SQL avec l'équipe, aucun déploiement.

---

### Phase 1 — Vue lecture seule en production

**Objectif** : remplacer `VIEWS.agenda` par l'Agenda V2 en lecture seule. L'éditeur V2 est désactivé.

**Actions** :
- [ ] Intégrer le code de rendu V2 (liste/semaine/mois) dans `modules.js` ou un nouveau fichier `agenda-v2-view.js` chargé conditionnellement
- [ ] Remplacer `VIEWS.agenda` par la nouvelle vue V2, en injectant les données Supabase via l'adaptateur `prod-to-v2`
- [ ] Réutiliser `gEventsOn(day)` et `bdaysOn(day)` pour les événements Google et anniversaires
- [ ] Désactiver le FAB de création et l'éditeur V2 (renvoyer vers `eventSheet` existant)
- [ ] Tester sur `preview/agenda-v2` Vercel

**Régressions à surveiller** :
- Vue agenda prod affiche bien tous les événements existants
- Récurrences prod (`repeat:"weekly"`) s'affichent correctement dans la vue liste
- Anniversaires toujours visibles
- Présences/Trajets non affectés (ne lisent pas la vue agenda)

---

### Phase 2 — Éditeur V2 activé (nouvelles fonctionnalités)

**Objectif** : remplacer `eventSheet()` par l'éditeur V2 pour la création/modification.

**Actions** :
- [ ] Brancher l'éditeur V2 sur `v2-to-prod(es)` → `saveEvent()` → Supabase + `saveGoogleEvent()`
- [ ] Enrichir `googleEventPayload()` pour générer des RRULE complètes (BYDAY, UNTIL, COUNT) depuis `rrule_json`
- [ ] Brancher `window._RemA` (reminder-adapter) pour la sync rappels
- [ ] Migration SQL Phase 0 déployée sur Supabase
- [ ] Tester la création d'un événement récurrent V2 → vérifier que Google Calendar le reçoit correctement

**Régressions à surveiller** :
- Anciens événements (sans `rrule_json`) toujours lisibles et modifiables
- Présences : les titres créés par V2 doivent respecter les mots-clés abs/dvh/dep/retour si l'événement concerne la garde
- `gtaches.js` non affecté (tâches propres)

---

### Phase 3 — Nettoyage et migration des données

**Objectif** : convertir les événements existants vers le nouveau format.

**Actions** :
- [ ] Script de migration (read-only Supabase d'abord) : `repeat:"weekly"` → `rrule_json:{freq:'WEEKLY',interval:1,...}`
- [ ] Backfill `allday` depuis `start_time IS NULL`
- [ ] Supprimer la compatibilité `repeat` string côté V2 (garder uniquement `rrule_json`)
- [ ] Supprimer `app.js` `recurrenceDate()` / `MaisonCal.repeatRule()` (ou conserver pour `gtaches.js`)

**Préconditions** : Phase 2 validée en prod depuis ≥ 2 semaines, aucune régression observée.

---

### 3.1 Tests de régression recommandés

| Scénario | Module | Test |
|----------|--------|------|
| Événement hebdo prod visible dans vue V2 | Vue liste | Chercher l'événement recurring dans la liste sur 4 semaines |
| Création événement V2 → Google Calendar | Éditeur + sync | Créer un rdv, vérifier dans Google Calendar |
| Rappel personnalisé V2 → format Google | reminder-adapter | Créer rappel 30min avant, vérifier payload Google |
| Anniversaire visible dans vue V2 | bdaysOn | Vérifier qu'une date d'anniversaire apparaît dans la liste |
| Présences non affectées après Phase 1 | presences.js | Vérifier que les calculs de garde restent corrects |
| Mot-clé abs dans titre V2 → présences | presences-core.js | Créer un événement avec "Abs K" dans le titre, vérifier calcul |
| Tâches → Google non affectées | gtaches.js | Vérifier que les événements `mz...` restent en place |

---

### 3.2 Synthèse des risques d'intégration

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Format `repeat` prod incompatible avec RRULE V2 | Certaine | Élevé | Adaptateur `repeatToRrule()` + migration schema |
| Présences cassées si titres V2 changent | Faible (si contrôlé) | Élevé | Documenter les mots-clés réservés, avertir l'éditeur V2 |
| IDs membres fictifs V2 ≠ IDs Supabase | Certaine | Élevé | Charger `MEMBERS` depuis Supabase dès Phase 1 |
| `googleEventPayload` génère RRULE incomplète | Certaine | Moyen | Enrichir la fonction en Phase 2 |
| `rrule-adapter.js` chargé en ES module → délai | Faible | Faible | Déjà géré par `window._RA` guard dans `saveEditor()` |
| Migration SQL additive casse une requête existante | Très faible | Faible | Colonnes nullable avec DEFAULT, testé en préproduction |

---

## Résumé exécutif

**Ce qui existe déjà dans V2 et est réutilisable :**
- Rendu Liste/Semaine/Mois complet, testé sur Vercel
- Éditeur événement/rdv/tâche avec tous les champs avancés
- Adaptateur RRULE (`rrule-adapter.js`, 758 lignes, testé)
- Adaptateur rappels (`reminder-adapter.js`, 223 lignes)
- Navigation shell Maisonnée (pill + barre titre + avatars)

**Ce qui doit être fait avant l'intégration :**
1. Schéma SQL additif (Phase 0) — 1 migration, non destructive
2. Deux adaptateurs de données `prod-to-v2` / `v2-to-prod` — ≈ 60 lignes chacun
3. Chargement des membres depuis Supabase dans V2
4. Enrichissement de `googleEventPayload()` pour RRULE complètes
5. Tests de régression Présences (mots-clés de titre)

**Durée estimée (sans Phase 3)** : Phase 0 = 1 jour · Phase 1 = 2 jours · Phase 2 = 3 jours · Tests = 1 jour = **~1 semaine en tout**, sans régression de production.
