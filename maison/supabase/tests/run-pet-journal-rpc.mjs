#!/usr/bin/env node
/* RPC journal animaux — PGlite isolé, aucune donnée prod. */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const requireFrom = createRequire("/tmp/maison-0032-isolated/package.json");
const { PGlite } = requireFrom("@electric-sql/pglite");

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

const bootstrap = fs.readFileSync(path.join(__dirname, "run-0032-isolated.mjs"), "utf8")
  .match(/const bootstrap = `([\s\S]*?)`;/)[1];

const U = { franck: "11111111-1111-4111-8111-111111111111" };

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

async function main() {
  await execSql(bootstrap);
  const hid = await val("insert into public.households (name, invite_code) values ('Foyer test','ZZZZZZ') returning id");
  await sql("insert into auth.users (id, email) values ($1, 't@test.local')", [U.franck]);
  await sql("insert into household_members (household_id, user_id, name, role) values ($1,$2,'Test','owner')", [hid, U.franck]);

  for (const f of ["0032_household_pets.sql", "0033_pet_consult_sessions.sql", "0034_pet_journal_delete.sql", "0035_pet_journal_update_notifications.sql"]) {
    await execSql(fs.readFileSync(path.join(ROOT, "migrations", f), "utf8"));
  }

  const setup = await (async () => {
    const pet = await val(
      `insert into household_pets (household_id, name, species, publish_phone) values ($1,'RpcTest','chien',false) returning id`,
      [hid]
    );
    const medal = await val(
      `insert into pet_medals (household_id, pet_id, public_token, active) values ($1,$2,'abcdabcdabcdabcd',true) returning id`,
      [hid, pet]
    );
    const evLoc = await val(
      `insert into pet_events (household_id, pet_id, medal_id, kind, ip_hash, payload) values ($1,$2,$3,'location','x','{}') returning id`,
      [hid, pet, medal]
    );
    await sql(`insert into pet_events (household_id, pet_id, medal_id, kind, ip_hash, payload) values
      ($1,$2,$3,'view','v','{}'), ($1,$2,$3,'message','m','{"message":"hi"}'), ($1,$2,$3,'found','f','{"lat":1,"lng":2}')`,
      [hid, pet, medal]);
    await sql(`insert into pet_sightings (household_id, pet_id, event_id, lat, lng) values ($1,$2,$3,48,2)`, [hid, pet, evLoc]);
    await sql(`insert into pet_consult_sessions (household_id, pet_id, medal_id, opened_at, bundle_due_at, snapshot) values ($1,$2,$3,now(),now()+'1 hour'::interval,'{}')`, [hid, pet, medal]);
    return { pet, evLoc };
  })();

  await asUser(U.franck, async () => {
    await sql(`select public.pet_clear_notifications($1)`, [setup.pet]);
    const n = await val(`select count(*)::int from pet_events where pet_id=$1`, [setup.pet]);
    const loc = await val(`select count(*)::int from pet_events where pet_id=$1 and kind='location'`, [setup.pet]);
    const sight = await val(`select count(*)::int from pet_sightings where pet_id=$1`, [setup.pet]);
    const sess = await val(`select count(*)::int from pet_consult_sessions where pet_id=$1`, [setup.pet]);
    if (n !== 1 || loc !== 1) throw new Error("clear_notifications events: " + n);
    if (sight !== 1) throw new Error("clear_notifications sightings");
    if (sess !== 0) throw new Error("clear_notifications sessions");
  });

  await sql(`insert into pet_events (household_id, pet_id, medal_id, kind, ip_hash, payload)
    values ($1,$2,(select id from pet_medals where pet_id=$2 limit 1),'found','g','{"lat":3,"lng":4,"note":"x"}')`, [hid, setup.pet]);
  await asUser(U.franck, async () => {
    await sql(`select public.pet_clear_positions($1)`, [setup.pet]);
    const ev = await val(`select count(*)::int from pet_events where pet_id=$1`, [setup.pet]);
    const geo = await val(`select count(*)::int from pet_events where pet_id=$1 and (payload ? 'lat')`, [setup.pet]);
    const sight = await val(`select count(*)::int from pet_sightings where pet_id=$1`, [setup.pet]);
    if (ev !== 1) throw new Error("clear_positions: signalement sans GPS doit rester, count=" + ev);
    if (geo !== 0) throw new Error("clear_positions payload geo");
    if (sight !== 0) throw new Error("clear_positions sightings");
  });

  await sql(`insert into pet_events (household_id, pet_id, medal_id, kind, ip_hash, payload)
    values ($1,$2,(select id from pet_medals where pet_id=$2 limit 1),'view','z','{}')`, [hid, setup.pet]);
  await asUser(U.franck, async () => {
    await sql(`select public.pet_clear_journal($1)`, [setup.pet]);
    const all = await val(`select count(*)::int from pet_events where pet_id=$1`, [setup.pet]);
    if (all !== 0) throw new Error("clear_journal");
  });

  console.log(JSON.stringify({ ok: true, engine: "pglite", tests: ["pet_clear_notifications", "pet_clear_positions", "pet_clear_journal"] }));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});