-- Contrôles à exécuter uniquement sur une base isolée (jamais la production
-- sans accord). Vérifie RLS, anon, is_member, et le départ d'un membre.

-- 1. Anon ne lit pas les tables.
-- 2. Un membre (auth.uid dans household_members.user_id) lit household_pets du hid.
-- 3. Après leave_household, is_member(hid) est faux : plus aucun animal.
-- 4. Après join_household, le nouvel uid lit les mêmes lignes, sans grant extra.
-- 5. pet_medals.public_token reste identique après update du nom de l'animal.

-- Exemple (à adapter aux comptes de test locaux) :
-- begin;
--   select public.is_member('HID'::uuid);
--   select count(*) from public.household_pets where household_id = 'HID';
--   select public.leave_household('HID'::uuid);
--   select public.is_member('HID'::uuid); -- attendu false
-- rollback;
