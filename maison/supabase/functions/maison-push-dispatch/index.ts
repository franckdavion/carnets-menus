// Supabase Edge Function "maison-push-dispatch".
// À appeler toutes les minutes avec le header x-cron-secret (vérification JWT désactivée).
//
// Notifications envoyées :
//  1. Rappels des rendez-vous Maisonnée (y compris répétés), jusqu'à 4 semaines avant.
//  2. Nouveaux messages de la messagerie du foyer (à tous sauf l'auteur).
//  3. Résumé du matin, à l'heure choisie par chacun : tâches du jour, agenda Maisonnée du jour,
//     repas du soir, anniversaires du jour, documents qui expirent.
//  4. Anniversaires : la veille à 19 h (et dans le résumé du matin le jour même).
// Chaque personne choisit ce qu'elle reçoit (table maison_push_prefs, réglée depuis la cloche).
// Les rendez-vous enregistrés dans Google Agenda sont rappelés par Google Agenda lui-même.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const env = (key: string) => Deno.env.get(key) || "";
const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
webpush.setVapidDetails(env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));

const MINUTE = 60000;
const DAY = 86400000;
const MAX_DELAY = 40320; // 4 semaines, en minutes
const zone = "Europe/Paris";

type Prefs = { messages: boolean; reminders: boolean; digest: boolean; digest_at: string; birthdays: boolean };
const DEFAULT_PREFS: Prefs = { messages: true, reminders: true, digest: true, digest_at: "07:30", birthdays: true };

/* ---------- dates à l'heure de Paris ---------- */
function parisDateParts(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const x = Object.fromEntries(p.map(v => [v.type, v.value]));
  return { day: `${x.year}-${x.month}-${x.day}`, time: `${x.hour}:${x.minute}` };
}
// heure « murale » de Paris → instant (gère les changements d'heure)
function localTimestamp(day: string, time: string) {
  const desired = Date.parse(`${day}T${time}:00Z`);
  let guess = desired;
  for (let i = 0; i < 3; i++) {
    const actual = parisDateParts(new Date(guess));
    const delta = desired - Date.parse(`${actual.day}T${actual.time}:00Z`);
    guess += delta;
    if (!delta) break;
  }
  return guess;
}
const addDays = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diffDays = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY);
const hm = (t: string | null) => { if (!t) return ""; const [h, m] = String(t).slice(0, 5).split(":"); return `${Number(h)} h${m === "00" ? "" : " " + m}`; };
function whenFr(day: string, startTime: string | null, today: string) {
  const label = day === today ? "aujourd'hui" : day === addDays(today, 1) ? "demain"
    : new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`));
  return startTime ? `${label} à ${hm(startTime)}` : `${label} (toute la journée)`;
}

/* ---------- répétitions (même règle que l'appli) ---------- */
function repeatRule(repeat: string): { unit: string; interval: number } | null {
  const m = /^custom:(\d{1,3}):(days|weeks|months|years)$/.exec(repeat || "");
  if (m) return { unit: m[2], interval: Number(m[1]) };
  const unit = ({ weekly: "weeks", monthly: "months", yearly: "years" } as Record<string, string>)[repeat];
  return unit ? { unit, interval: 1 } : null;
}
function recurrenceDate(start: string, i: number, unit: string, interval: number) {
  const n = i * interval;
  if (unit === "days") return addDays(start, n);
  if (unit === "weeks") return addDays(start, 7 * n);
  const d = new Date(`${start}T12:00:00Z`), months = unit === "years" ? n * 12 : n;
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, 12));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d.getUTCDate(), last), 12)).toISOString().slice(0, 10);
}
// dates de début de l'événement comprises entre from et to
function startsBetween(e: { day: string; repeat: string }, from: string, to: string) {
  if (!e.repeat || e.repeat === "none") return e.day >= from && e.day <= to ? [e.day] : [];
  const r = repeatRule(e.repeat); if (!r) return [];
  const out: string[] = [];
  for (let i = 0; i < 2000; i++) { const d = recurrenceDate(e.day, i, r.unit, r.interval); if (d > to) break; if (d >= from) out.push(d); }
  return out;
}

/* ---------- envoi ---------- */
let sent = 0, failed = 0;
const subsCache = new Map<string, { id: string; subscription: unknown }[]>();
async function subsOf(userId: string) {
  if (!subsCache.has(userId)) { const { data } = await supabase.from("maison_push_subscriptions").select("id,subscription").eq("user_id", userId); subsCache.set(userId, data || []); }
  return subsCache.get(userId)!;
}
// envoie une seule fois par « claim » (identifiant unique de l'envoi)
async function pushOnce(claim: string, userId: string, payload: { title: string; body: string; tag: string; url?: string }) {
  const subs = await subsOf(userId);
  if (!subs.length) return;
  const { error } = await supabase.from("maison_push_deliveries").insert({ id: claim });
  if (error) return; // déjà envoyé
  for (const sub of subs) {
    try { await webpush.sendNotification(sub.subscription as webpush.PushSubscription, JSON.stringify({ url: "./", ...payload })); sent++; }
    catch (e) {
      failed++;
      const code = (e as { statusCode?: number }).statusCode || 0;
      if ([404, 410].includes(code)) await supabase.from("maison_push_subscriptions").delete().eq("id", sub.id);
      console.error("Push error:", JSON.stringify({ statusCode: code, message: (e as { message?: string })?.message }));
    }
  }
}

Deno.serve(async req => {
  if (!env("CRON_SECRET") || req.headers.get("x-cron-secret") !== env("CRON_SECRET")) return new Response("Unauthorized", { status: 401 });
  if (![env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY")].every(Boolean)) return new Response("VAPID secrets missing", { status: 500 });

  sent = 0; failed = 0; subsCache.clear();
  const now = Date.now(), { day: today, time: nowTime } = parisDateParts(new Date(now));
  const yesterday = addDays(today, -1), tomorrow = addDays(today, 1);

  // qui reçoit des notifications, et avec quelles préférences
  const { data: allSubs } = await supabase.from("maison_push_subscriptions").select("user_id");
  const users = new Set((allSubs || []).map(s => s.user_id as string));
  if (!users.size) return Response.json({ sent, failed, note: "aucun appareil abonné" });
  const { data: prefRows, error: prefErr } = await supabase.from("maison_push_prefs").select("user_id,prefs").in("user_id", [...users]);
  const prefs = (uid: string): Prefs => ({ ...DEFAULT_PREFS, ...((prefErr ? null : (prefRows || []).find(p => p.user_id === uid)?.prefs) || {}) });

  // membres (avec compte) de chaque foyer
  const { data: members } = await supabase.from("household_members").select("id,household_id,user_id,name").not("user_id", "is", null);
  const byHousehold = new Map<string, { id: string; user_id: string; name: string }[]>();
  for (const m of members || []) { if (!byHousehold.has(m.household_id)) byHousehold.set(m.household_id, []); byHousehold.get(m.household_id)!.push(m); }
  const memberName = new Map<string, string>(); for (const m of members || []) memberName.set(m.id, m.name);

  /* ===== 1. Rappels des rendez-vous (simples et répétés) ===== */
  const horizon = parisDateParts(new Date(now + (MAX_DELAY + 1440) * MINUTE)).day;
  const [single, repeated] = await Promise.all([
    supabase.from("events").select("id,household_id,title,day,start_time,reminders,members,repeat").not("reminders", "is", null).gte("day", yesterday).lte("day", horizon).limit(5000),
    supabase.from("events").select("id,household_id,title,day,start_time,reminders,members,repeat").not("reminders", "is", null).neq("repeat", "none").lte("day", horizon).limit(5000)
  ]);
  const seen = new Set<string>();
  for (const ev of [...(single.data || []), ...(repeated.data || [])]) {
    if (seen.has(ev.id)) continue; seen.add(ev.id);
    if (!Array.isArray(ev.reminders) || !ev.reminders.length) continue;
    for (const start of startsBetween(ev, yesterday, horizon)) {
      const startAt = localTimestamp(start, String(ev.start_time || "09:00").slice(0, 5));
      for (const delay of ev.reminders) {
        if (typeof delay !== "number" || delay < 0 || delay > MAX_DELAY) continue;
        const due = startAt - delay * MINUTE;
        if (now < due || now >= due + 2 * MINUTE) continue;
        const targets = (byHousehold.get(ev.household_id) || []).filter(m => !ev.members?.length || ev.members.includes(m.id));
        for (const m of targets) {
          if (!prefs(m.user_id).reminders) continue;
          await pushOnce(`${ev.id}:${delay}:${m.user_id}:${start}`, m.user_id, {
            title: "⏰ Rappel", body: `${ev.title} — ${whenFr(start, ev.start_time, today)}`, tag: `event-${ev.id}-${start}`, url: "./?v=agenda"
          });
        }
      }
    }
  }

  /* ===== 2. Nouveaux messages ===== */
  const { data: msgs } = await supabase.from("messages").select("id,household_id,member_id,body,created_at").gte("created_at", new Date(now - 3 * MINUTE).toISOString()).order("created_at").limit(200);
  for (const msg of msgs || []) {
    const text = String(msg.body || "").replace(/\s+/g, " ").trim();
    for (const m of (byHousehold.get(msg.household_id) || []).filter(x => x.id !== msg.member_id)) {
      if (!prefs(m.user_id).messages) continue;
      await pushOnce(`msg:${msg.id}:${m.user_id}`, m.user_id, {
        title: `💬 ${memberName.get(msg.member_id) || "Message"}`, body: text.length > 180 ? text.slice(0, 177) + "…" : text, tag: `msg-${msg.id}`, url: "./?v=messages"
      });
    }
  }

  /* ===== 3 et 4. Résumé du matin et anniversaires de demain ===== */
  // qui doit recevoir quelque chose maintenant ?
  const inWindow = (at: string) => nowTime >= at && Date.parse(`2000-01-01T${nowTime}:00Z`) < Date.parse(`2000-01-01T${at}:00Z`) + 15 * MINUTE;
  const digestHouseholds = new Set<string>(), eveHouseholds = new Set<string>();
  for (const [hid, ms] of byHousehold) for (const m of ms) {
    const p = prefs(m.user_id);
    if (p.digest && inWindow(p.digest_at || "07:30")) digestHouseholds.add(hid);
    if (p.birthdays && inWindow("19:00")) eveHouseholds.add(hid);
  }

  for (const hid of new Set([...digestHouseholds, ...eveHouseholds])) {
    const ms = byHousehold.get(hid) || [];
    const [tasks, events, bdays, meals, docs] = await Promise.all([
      supabase.from("tasks").select("title,assignee,next_due").eq("household_id", hid).eq("archived", false).lte("next_due", today),
      supabase.from("events").select("title,day,end_day,start_time,members,repeat").eq("household_id", hid),
      supabase.from("birthdays").select("id,name,day,month,year").eq("household_id", hid),
      supabase.from("meals").select("slot,recipe_id,label").eq("household_id", hid).eq("day", today),
      supabase.from("documents").select("title,expires_on,member_id").eq("household_id", hid).in("expires_on", [today, addDays(today, 7), addDays(today, 30)])
    ]);
    const bdayOn = (d: string) => (bdays.data || []).filter(b => b.month === Number(d.slice(5, 7)) && b.day === Number(d.slice(8, 10)));

    // anniversaires de demain, la veille au soir
    if (eveHouseholds.has(hid)) for (const b of bdayOn(tomorrow)) for (const m of ms) {
      const p = prefs(m.user_id); if (!p.birthdays || !inWindow("19:00")) continue;
      const age = b.year ? ` (${Number(tomorrow.slice(0, 4)) - b.year} ans)` : "";
      await pushOnce(`bday-eve:${b.id}:${tomorrow}:${m.user_id}`, m.user_id, { title: "🎂 Anniversaire demain", body: `${b.name}${age}`, tag: `bday-${b.id}`, url: "./?v=anniv" });
    }

    if (!digestHouseholds.has(hid)) continue;
    // repas du soir (nom de la recette si besoin)
    let dinner = "";
    const soir = (meals.data || []).find(x => x.slot === "soir");
    if (soir) {
      if (soir.label) dinner = soir.label;
      else if (soir.recipe_id) { const { data: r } = await supabase.from("recipes").select("name").eq("id", soir.recipe_id).maybeSingle(); dinner = r?.name || ""; }
    }
    for (const m of ms) {
      const p = prefs(m.user_id); if (!p.digest || !inWindow(p.digest_at || "07:30")) continue;
      const parts: string[] = [];
      const myTasks = (tasks.data || []).filter(t => !t.assignee || t.assignee === m.id);
      if (myTasks.length) parts.push(`✅ ${myTasks.length} tâche${myTasks.length > 1 ? "s" : ""} : ${myTasks.slice(0, 3).map(t => t.title).join(", ")}${myTasks.length > 3 ? "…" : ""}`);
      const todays: string[] = [];
      for (const e of events.data || []) {
        if (e.members?.length && !e.members.includes(m.id)) continue;
        const len = e.end_day && e.end_day > e.day ? diffDays(e.day, e.end_day) : 0;
        if (startsBetween(e, addDays(today, -len), today).length) todays.push(`${e.start_time && startsBetween(e, today, today).length ? hm(e.start_time) + " " : ""}${e.title}`);
      }
      if (todays.length) parts.push(`📅 ${todays.slice(0, 3).join(", ")}${todays.length > 3 ? "…" : ""}`);
      const bt = bdayOn(today); if (bt.length && p.birthdays) parts.push(`🎂 ${bt.map(b => b.name).join(", ")}`);
      if (dinner) parts.push(`🍽️ Ce soir : ${dinner}`);
      for (const d of docs.data || []) {
        if (d.member_id && d.member_id !== m.id) continue;
        const left = diffDays(today, d.expires_on);
        parts.push(`📄 ${d.title} expire ${left === 0 ? "aujourd'hui" : `dans ${left} jours`}`);
      }
      if (!parts.length) continue;
      await pushOnce(`digest:${today}:${m.user_id}`, m.user_id, { title: "☀️ Votre journée", body: parts.join("\n").slice(0, 400), tag: `digest-${today}`, url: "./" });
    }
  }

  // ménage : les traces d'envoi de plus de 40 jours ne servent plus
  if (new Date(now).getUTCMinutes() === 0) await supabase.from("maison_push_deliveries").delete().lt("sent_at", new Date(now - 40 * DAY).toISOString());

  return Response.json({ sent, failed, checked: seen.size });
});
