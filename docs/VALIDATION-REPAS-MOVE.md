# Validation — déplacement / remplacement / échange des repas

## Tests automatisés (21 scénarios)

```bash
node maison/tests/carnet-move.test.mjs      # moteur relocateMealSlots (6 cas)
node maison/tests/carnet-move-21.test.mjs   # achats, undo, conflits, persistance
```

Les tests `carnet-move-21` vérifient `menu.weeks`, `menu.bought`, `menu.checked` et les agrégats de besoins (harnais `scripts/move-test-harness.mjs`), pas seulement le calendrier.

### Liste des scénarios

| # | Intitulé |
|---|----------|
| 1 | Déplacement vers créneau libre |
| 2 | Déplacement repas en courses (`lock`) |
| 3 | Déplacement repas entièrement acheté |
| 4 | Déplacement partiellement acheté |
| 5 | Même semaine |
| 6 | Semaine suivante |
| 7 | Plusieurs mois |
| 8 | Remplacement victime sans achats |
| 9 | Remplacement victime en courses |
| 10 | Remplacement victime partiellement achetée |
| 11 | Remplacement victime entièrement achetée |
| 12 | Échange deux proposés |
| 13 | Échange deux en courses |
| 14 | Échange deux achetés |
| 15 | Ingrédients communs à plusieurs recettes |
| 16 | Annulation déplacement |
| 17 | Annulation remplacement |
| 18 | Annulation échange |
| 19 | Conflit (autre modification → undo refusé) |
| 20 | Échec relocation → rollback menu |
| 21 | Persistance JSON + achat ne revient pas aux courses |

## Essais manuels (Mac / iPhone)

```bash
chmod +x scripts/serve-demo-8765.sh
./scripts/serve-demo-8765.sh
```

| Appareil | URL |
|----------|-----|
| Mac | http://127.0.0.1:8765/demo-repas.html |
| iPhone (même Wi‑Fi) | http://&lt;IP affichée au lancement&gt;:8765/demo-repas.html |

Parcours à tester : calendrier déplacement, mois, midi/soir, Remplacer / Échanger / Annuler (barre « Annuler »), fermeture onglet puis réouverture.

## Isolation production

- `cmDemoRepas()` bloque `cloudSoon`, `cloudPush` et `cloudSync` lorsque `?demo=repas` ou `sessionStorage.cm_demo_repas=1`.
- Ne pas se connecter au compte Supabase pendant la démo si vous voulez éviter toute synchro au login (le mode démo coupe push/pull une fois la page chargée).
- **Aucun push / déploiement** requis pour ces essais.

## Sécurisation annulation

- Chaque déplacement enregistre `afterFp` (empreinte des créneaux après action).
- `undoRemove` refuse si le planning a divergé (conflit multi‑appareil).
- Restauration de `bought` / `checked` / `checkedQty` capturés au moment du déplacement.

## Déplacement + courses (UI)

- Un déplacement ou échange qui modifierait les quantités de courses de façon incohérente est **refusé** et le menu est restauré (plus de simple `console.warn`).

## Limites connues

- Les tests Node utilisent un agrégat de courses simplifié (toutes semaines verrouillées) ; l’UI Carnet filtre par jours sélectionnés en liste de courses — les invariants testés sur les totaux d’ingrédients restent valides.
- Vérification navigateur Mac/iPhone : manuelle ; non couverte par Node.
- GitHub sync (`scheduleSync`) n’est pas bloquée par le flag démo si l’admin a activé la synchro GitHub localement ; rester déconnecté ou en navigation privée pour l’essai.