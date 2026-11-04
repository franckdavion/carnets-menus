-- Maisonnée : informations facultatives de planification des tâches familiales.
-- Compatibilité totale avec les tâches existantes, sans modification des règles RLS.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time time without time zone;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deadline_on date;
