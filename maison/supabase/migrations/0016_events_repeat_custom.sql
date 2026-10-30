-- Maisonnée : répétition personnalisée (custom:3:weeks, etc.)
-- À coller une fois si le foyer existe déjà.
-- L'appli et la fonction maison-push-dispatch écrivent ce format.

alter table public.events drop constraint if exists events_repeat_check;
alter table public.events add constraint events_repeat_check check (
  repeat in ('none', 'weekly', 'monthly', 'yearly')
  or repeat ~ '^custom:[1-9][0-9]{0,2}:(days|weeks|months|years)$'
);
