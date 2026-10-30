-- Maisonnée, étape 9 : événements et rendez-vous sur plusieurs jours (date de fin)
alter table public.events add column if not exists end_day date;
alter table public.events drop constraint if exists events_end_day_check;
alter table public.events add constraint events_end_day_check check (end_day is null or end_day >= day);
