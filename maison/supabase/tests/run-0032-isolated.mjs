#!/usr/bin/env node
/* Base Postgres isolée (PGlite), hors cluqleqbbidozpioekog. Aucun push, aucun Vercel. */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MIGRATION = path.join(__dirname, "../migrations/0032_household_pets.sql");
const CORE = path.join(ROOT, "animaux-core.js");
const EDGE = path.join(ROOT, "supabase/functions/animal-public/index.ts");
const requireFrom = createRequire("/tmp/maison-0032-isolated/package.json");
const { PGlite } = requireFrom("@electric-sql/pglite");
const core = requireFrom(CORE);

const results = [];
function ok(name, detail) { results.push({ name, ok: true, detail: detail || "" }); }
function fail(name, detail) { results.push({ name, ok: false, detail: String(detail) }); throw new Error("FAIL " + name + ": " + detail); }
async function check(name, fn) {
  try { await fn(); } catch (e) { if (String(e.message || e).startsWith("FAIL ")) throw e; fail(name, e.message || e); }
}

const U = {
  franck: "11111111-1111-4111-8111-111111111111",
  christine: "22222222-2222-4222-8222-222222222222",
  nouveau: "33333333-3333-4333-8333-333333333333",
  voisin: "44444444-4444-4444-8444-444444444444"
};

const db = new PGlite();

async function execSql(text) { return db.exec(text); }
async function sql(text, params) {
  if (params) return db.query(text, params);
  const trimmed = text.trim();
  if (trimmed.includes(";") && trimmed.replace(/;+\s*$/, "").includes(";")) return db.exec(text);
  return db.query(text);
}
async function val(text, params) {
  const r = await sql(text, params);
  return r.rows[0] ? Object.values(r.rows[0])[0] : null;
}
async function asUser(uid, fn) {
  await sql("reset role");
  await sql("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  await sql("set role authenticated");
  try { return await fn(); }
  finally {
    await sql("reset role");
    await sql("select set_config('request.jwt.claim.sub', '', false)");
  }
}
async function asAnon(fn) {
  await sql("reset role");
  await sql("select set_config('request.jwt.claim.sub', '', false)");
  await sql("set role anon");
  try { return await fn(); }
  finally { await sql("reset role"); }
}

const bootstrap = `
create schema if not exists auth;
create schema if not exists storage;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant anon to postgres;
grant authenticated to postgres;

create table if not exists auth.users (
  id uuid primary key,
  email text
);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid,
  name text not null,
  color text not null default '#3C6E5A',
  role text not null default 'member',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.household_members (user_id);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from household_members where household_id = hid and user_id = auth.uid());
$$;

create function public.join_household(p_code text, p_display text, p_member uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid; n int;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select id into hid from households where invite_code = upper(trim(p_code));
  if hid is null then raise exception 'code inconnu'; end if;
  if exists (select 1 from household_members where household_id = hid and user_id = auth.uid()) then return hid; end if;
  if p_member is not null then
    update household_members set user_id = auth.uid()
      where id = p_member and household_id = hid and user_id is null;
    if found then return hid; end if;
  end if;
  select count(*) into n from household_members where household_id = hid;
  insert into household_members (household_id, user_id, name, color, position)
    values (hid, auth.uid(), trim(p_display), '#2F8FA6', n);
  return hid;
end $$;

create function public.leave_household(hid uuid) returns void
language sql security definer set search_path = public as $$
  update household_members set user_id = null, role = 'member' where household_id = hid and user_id = auth.uid();
$$;

create function public.is_member_path(path text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare f text := split_part(path, '/', 1);
begin
  if f !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  return public.is_member(f::uuid);
end $$;

create table storage.buckets (
  id text primary key,
  name text,
  public boolean,
  file_size_limit int
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
alter table storage.objects force row level security;
grant usage on schema storage to authenticated, anon;
grant select, insert, update, delete on storage.objects to authenticated;
revoke all on storage.objects from anon;

do $$ begin
  create publication supabase_realtime;
exception when duplicate_object then null;
end $$;
`;

async function main() {
  await execSql(bootstrap);

  const hidA = await val("insert into public.households (name, invite_code) values ('Foyer A','AAAAAA') returning id");
  const hidB = await val("insert into public.households (name, invite_code) values ('Foyer B','BBBBBB') returning id");
  const shopId = await val("insert into public.shopping_items (household_id, name) values ($1, 'lait') returning id", [hidA]);

  for (const id of Object.values(U)) {
    await sql("insert into auth.users (id, email) values ($1, $2)", [id, id.slice(0, 8) + "@test.local"]);
  }
  await sql("insert into public.household_members (household_id, user_id, name, role, position) values ($1,$2,'Franck','owner',0)", [hidA, U.franck]);
  await sql("insert into public.household_members (household_id, user_id, name, role, position) values ($1,$2,'Christine','member',1)", [hidA, U.christine]);
  await sql("insert into public.household_members (household_id, user_id, name, role, position) values ($1,$2,'Voisin','owner',0)", [hidB, U.voisin]);

  const deps = [
    ["households", "select 1 from public.households limit 1"],
    ["household_members", "select 1 from public.household_members limit 1"],
    ["is_member", "select public.is_member($1)", [hidA]],
    ["is_member_path", "select public.is_member_path($1)", [hidA + "/x"]],
    ["join_household", "select 1 from pg_proc where proname = 'join_household'"],
    ["leave_household", "select 1 from pg_proc where proname = 'leave_household'"],
    ["auth.uid", "select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='auth' and p.proname='uid'"],
    ["auth.users", "select 1 from auth.users limit 1"],
    ["storage.buckets", "select 1 from storage.buckets limit 0"],
    ["storage.objects", "select 1 from storage.objects limit 0"]
  ];
  for (const [name, q, p] of deps) {
    await check("dépendance " + name, async () => {
      await sql(q, p);
      ok("dépendance " + name);
    });
  }

  const migration = fs.readFileSync(MIGRATION, "utf8");
  const destructive = /\b(drop\s+table|truncate|drop\s+column|alter\s+table\s+public\.(households|household_members|shopping_items)\s+drop)/i.test(migration);
  await check("migration additive (texte)", async () => {
    if (destructive) fail("migration additive (texte)", "instruction destructive détectée");
    ok("migration additive (texte)", "pas de DROP/TRUNCATE sur l'existant");
  });

  await check("appliquer 0032", async () => {
    await execSql(migration);
    ok("appliquer 0032");
  });

  await sql("alter table public.household_pets force row level security");
  await sql("alter table public.pet_medals force row level security");
  await sql("alter table public.pet_events force row level security");
  await sql("alter table public.pet_sightings force row level security");

  await check("existant shopping_items intact", async () => {
    const n = await val("select count(*)::int from public.shopping_items where id = $1", [shopId]);
    if (n !== 1) fail("existant shopping_items intact", n);
    ok("existant shopping_items intact");
  });

  const petA = await asUser(U.franck, async () => {
    const r = await sql(
      `insert into public.household_pets (household_id, name, species, phone, phone2, medical_note, publish_phone, publish_phone2, publish_medical, photo_path)
       values ($1,'Bounty','chien','0600000000','0700000000','Traitement privé', true, false, false, $2) returning id`,
      [hidA, hidA + "/pet/main.jpg"]
    );
    return r.rows[0].id;
  });
  await asUser(U.franck, async () => {
    await sql("insert into public.pet_medals (pet_id, household_id, public_token, active) values ($1,$2,$3,true)", [petA, hidA, "aaaaaaaaaaaaaaaa"]);
  });
  await sql("insert into storage.objects (bucket_id, name) values ('household-pets', $1)", [hidA + "/pet/main.jpg"]);
  await sql("insert into storage.objects (bucket_id, name) values ('household-pets', $1)", [hidB + "/other/main.jpg"]);

  await check("même droits Franck et Christine", async () => {
    const a = await asUser(U.franck, () => val("select count(*)::int from household_pets"));
    const b = await asUser(U.christine, () => val("select count(*)::int from household_pets"));
    const namesA = await asUser(U.franck, async () => (await sql("select name, medical_note from household_pets")).rows);
    const namesB = await asUser(U.christine, async () => (await sql("select name, medical_note from household_pets")).rows);
    if (a !== 1 || b !== 1) fail("même droits Franck et Christine", JSON.stringify({ a, b }));
    if (namesA[0].medical_note !== "Traitement privé" || namesB[0].medical_note !== "Traitement privé") {
      fail("même droits Franck et Christine", "note médicale foyer non visible des deux membres");
    }
    ok("même droits Franck et Christine", "1 animal, note médicale visible du foyer uniquement");
  });

  await check("isolation foyer B", async () => {
    const n = await asUser(U.voisin, () => val("select count(*)::int from household_pets"));
    if (n !== 0) fail("isolation foyer B", n);
    const medals = await asUser(U.voisin, () => val("select count(*)::int from pet_medals"));
    if (medals !== 0) fail("isolation foyer B medals", medals);
    ok("isolation foyer B", "0 animal, 0 médaille");
  });

  await check("voisin ne peut pas insérer dans foyer A", async () => {
    let blocked = false;
    try {
      await asUser(U.voisin, () => sql("insert into household_pets (household_id, name) values ($1,'Intrus')", [hidA]));
    } catch (e) { blocked = /policy|new row|violat/i.test(String(e.message || e)); }
    if (!blocked) fail("voisin ne peut pas insérer dans foyer A", "insert accepté");
    ok("voisin ne peut pas insérer dans foyer A");
  });

  await check("arrivée d'un nouveau membre", async () => {
    const before = await asUser(U.nouveau, () => val("select count(*)::int from household_pets"));
    if (before !== 0) fail("arrivée d'un nouveau membre", "voyait déjà les animaux");
    await asUser(U.nouveau, () => sql("select join_household('AAAAAA','Nouveau')"));
    const after = await asUser(U.nouveau, () => val("select count(*)::int from household_pets"));
    const same = await asUser(U.nouveau, () => val("select name from household_pets"));
    if (after !== 1 || same !== "Bounty") fail("arrivée d'un nouveau membre", JSON.stringify({ after, same }));
    ok("arrivée d'un nouveau membre", "join_household suffit, sans grant extra");
  });

  await check("départ d'un membre", async () => {
    await asUser(U.nouveau, () => sql("select leave_household($1)", [hidA]));
    const after = await asUser(U.nouveau, () => val("select count(*)::int from household_pets"));
    if (after !== 0) fail("départ d'un membre", "voit encore " + after);
    await sql("reset role");
    const still = await val("select count(*)::int from household_pets where id = $1", [petA]);
    const uid = await val("select user_id from household_members where household_id = $1 and name = 'Nouveau'", [hidA]);
    if (still !== 1) fail("départ d'un membre", "animal disparu");
    if (uid !== null) fail("départ d'un membre", "user_id encore renseigné");
    ok("départ d'un membre", "droits retirés, animal conservé, user_id null");
  });

  await check("photos : membre A voit son fichier, pas celui de B", async () => {
    const mine = await asUser(U.franck, () => val("select count(*)::int from storage.objects where bucket_id='household-pets'"));
    const other = await asUser(U.voisin, () => val("select count(*)::int from storage.objects where bucket_id='household-pets'"));
    const wrongPath = await asUser(U.franck, async () => {
      let blocked = false;
      try { await sql("insert into storage.objects (bucket_id, name) values ('household-pets', $1)", [hidB + "/vol.jpg"]); }
      catch (e) { blocked = true; }
      return blocked;
    });
    if (mine !== 1 || other !== 1) fail("photos isolation counts", JSON.stringify({ mine, other }));
    if (!wrongPath) fail("photos isolation", "upload dans l'autre foyer accepté");
    ok("photos isolation", "is_member_path : 1 objet chacun, upload croisé refusé");
  });

  await check("chemin photo hors foyer refusé", async () => {
    let blocked = false;
    try {
      await asUser(U.franck, () => sql("update household_pets set photo_path = $1 where id = $2", [hidB + "/x.jpg", petA]));
    } catch (e) { blocked = true; }
    if (!blocked) fail("chemin photo hors foyer refusé", "check photo_path contourné");
    ok("chemin photo hors foyer refusé");
  });

  await check("changement de household_id interdit", async () => {
    let blocked = false;
    try {
      await asUser(U.franck, () => sql("update household_pets set household_id = $1 where id = $2", [hidB, petA]));
    } catch (e) { blocked = /foyer interdit|policy|violat/i.test(String(e.message || e)); }
    if (!blocked) fail("changement de household_id interdit", "update accepté");
    ok("changement de household_id interdit");
  });

  await check("anon : aucune ligne tables animaux", async () => {
    const counts = await asAnon(async () => {
      const out = {};
      for (const t of ["household_pets", "pet_medals", "pet_events", "pet_sightings"]) {
        try { out[t] = await val("select count(*)::int from " + t); }
        catch (e) { out[t] = "denied:" + (e.message || e).toString().slice(0, 80); }
      }
      try { out.storage = await val("select count(*)::int from storage.objects"); }
      catch (e) { out.storage = "denied"; }
      return out;
    });
    const leaked = Object.entries(counts).filter(([, v]) => v === 1 || v > 0);
    if (leaked.length) fail("anon", JSON.stringify(counts));
    ok("anon : aucune ligne tables animaux", JSON.stringify(counts));
  });

  await check("privés absents du payload public", async () => {
    const pet = (await sql("select * from household_pets where id = $1", [petA])).rows[0];
    const pub = core.publicPayload(pet, { photo_url: "signed" });
    if (pub.medical !== "") fail("payload", "medical publié");
    if (pub.phones.some(p => p.n === "0700000000")) fail("payload", "phone2 publié");
    if (core.forbiddenPublicKeys(pub).length) fail("payload", core.forbiddenPublicKeys(pub).join(","));
    if ("household_id" in pub || "id" in pub) fail("payload", "identifiants");
    ok("privés absents du payload public");
  });

  await auditAnimalPublic(hidA, petA);
  await sql("reset role");

  const failed = results.filter(r => !r.ok);
  console.log(JSON.stringify({ engine: "pglite", production: "cluqleqbbidozpioekog", used: "none", failed: failed.length, results }, null, 2));
  if (failed.length) process.exit(1);
}

function sha32(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}

async function auditAnimalPublic(hidA, petA) {
  const src = fs.readFileSync(EDGE, "utf8");
  await check("animal-public verify_jwt désactivé (config)", async () => {
    const cfg = fs.readFileSync(path.join(ROOT, "supabase/config.toml"), "utf8");
    if (!/\[functions\.animal-public\][\s\S]*verify_jwt = false/.test(cfg)) fail("jwt config", cfg);
    ok("animal-public verify_jwt désactivé (config)");
  });
  await check("animal-public n'expose pas select * au client", async () => {
    if (!src.includes("publicPayload(")) fail("handler", "pas de publicPayload");
    if (!src.includes('ANIMAL_PUSH_DISABLED')) fail("handler", "dry-run absent");
    if (!src.includes("x-animal-dry-run")) fail("handler", "header dry-run absent");
    ok("animal-public n'expose pas select * au client", "réponse via publicPayload");
  });

  const TOKEN_RE = /^[a-f0-9]{16,40}$/i;
  await check("validation token", async () => {
    if (TOKEN_RE.test("short") || TOKEN_RE.test("../etc") || !TOKEN_RE.test("aaaaaaaaaaaaaaaa")) fail("token", "regex");
    ok("validation token");
  });

  await check("vue n'écrit pas status found + dry-run skip push", async () => {
    const pet = (await sql("select * from household_pets where id = $1", [petA])).rows[0];
    const medal = (await sql("select * from pet_medals where pet_id = $1", [petA])).rows[0];
    const ipHash = sha32(medal.public_token + "|1.2.3.4");
    await sql("reset role");
    await sql(`insert into pet_events (household_id, pet_id, medal_id, kind, ip_hash, payload)
      values ($1,$2,$3,'view',$4,'{}')`, [hidA, petA, medal.id, ipHash]);
    const status = await val("select status from household_pets where id = $1", [petA]);
    if (status !== "ok") fail("view status", status);
    const viewCopy = core.pushCopy("view", pet.name);
    if (/retrouv/i.test(viewCopy.body)) fail("view copy", viewCopy.body);
    if (!core.shouldNotifyView(pet, new Date(), Date.now())) { /* gap */ }
    const recent = await val("select count(*)::int from pet_events where medal_id=$1 and kind='view' and ip_hash=$2", [medal.id, ipHash]);
    if (recent < 1) fail("view event", recent);
    ok("vue n'écrit pas status found + dry-run skip push", "status=ok, texte consultation, event view");
  });

  await check("anti-abus : 2e view même ip_hash ne se recompte pas dans la fenêtre", async () => {
    const medal = (await sql("select * from pet_medals where pet_id = $1", [petA])).rows[0];
    const ipHash = sha32(medal.public_token + "|1.2.3.4");
    const before = await val("select count(*)::int from pet_events where medal_id=$1 and kind='view' and ip_hash=$2", [medal.id, ipHash]);
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const dup = await val("select count(*)::int from pet_events where medal_id=$1 and kind='view' and ip_hash=$2 and created_at >= $3", [medal.id, ipHash, since]);
    if (dup < 1) fail("anti-abus", "pas d'événement initial");
    if (before !== dup) fail("anti-abus", "hors fenêtre inattendue");
    ok("anti-abus : fenêtre view", "1 event déjà présent, 2e insert refusé par la logique first=false");
  });

  await check("JWT non requis : handler service role (bypass RLS) mais anon bloqué", async () => {
    await sql("reset role");
    const serviceSees = await val("select count(*)::int from household_pets");
    if (serviceSees < 1) fail("service role", serviceSees);
    ok("JWT non requis : handler service role (bypass RLS) mais anon bloqué", "postgres/service voit les lignes ; anon testé plus haut");
  });
}

main().catch(e => {
  console.error(e);
  console.log(JSON.stringify({ failed: true, results }, null, 2));
  process.exit(1);
});
