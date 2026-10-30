-- Photos de recettes du Carnet (compte connecté).
-- Le seau est public : l'appli affiche l'adresse renvoyée par getPublicUrl.
-- L'envoi reste limité au dossier de la personne connectée.
-- Sur la base déjà en service, le seau et ces règles existent (supabase.txt) : ce script ne les recrée pas.

insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

do $$
begin
  if to_regprocedure('public.is_active()') is null or to_regprocedure('public.is_admin()') is null then
    return;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'photos: envoyer'
  ) then
    create policy "photos: envoyer" on storage.objects for insert to authenticated
      with check (bucket_id = 'recipe-photos' and public.is_active() and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'photos: remplacer les siennes'
  ) then
    create policy "photos: remplacer les siennes" on storage.objects for update to authenticated
      using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'photos: supprimer les siennes'
  ) then
    create policy "photos: supprimer les siennes" on storage.objects for delete to authenticated
      using (bucket_id = 'recipe-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
  end if;
end $$;
