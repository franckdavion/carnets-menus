// Supabase Edge Function "maison-push-dispatch".
// À appeler toutes les minutes avec le header x-cron-secret (vérification JWT désactivée).
//
// Notifications envoyées :
//  1. Rappels des rendez-vous Maisonnée (y compris répétés), jusqu'à 4 semaines avant.
//  2. Nouveaux messages de la messagerie du foyer (à tous sauf l'auteur).
//  3. Résumé du matin, à l'heure choisie par chacun : tâches du jour, agenda Maisonnée du jour,
//     repas du soir, anniversaires du jour, documents qui expirent.
//  4. Anniversaires : la veille à 19 h (et dans le résumé du matin le jour même).
//  5. Toutes les 5 minutes : les tâches des foyers qui l'ont demandé sont recopiées dans Google Agenda
//     (households.google_tasks, script supabase/migrations/0012_taches_google.sql ; secrets GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET).
// Chaque personne choisit ce qu'elle reçoit (table maison_push_prefs, réglée depuis la cloche).
// Les rendez-vous enregistrés dans Google Agenda sont rappelés par Google Agenda lui-même.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import "../_shared/cal.js";

interface MaisonCalApi {
  addDays(day: string, n: number): string;
  diffDays(a: string, b: string): number;
  nextDue(t: { freq: string; every_n: number; weekdays: number[]; next_due: string }, base: string): string | null;
  startsBetween(e: { day: string; repeat: string }, from: string, to: string): string[];
  reminderClaim(eventId: string, delay: number, userId: string, start: string): string;
  messageClaim(messageId: string, userId: string): string;
  digestClaim(day: string, userId: string): string;
  birthdayEveClaim(id: string, day: string, userId: string): string;
}
const MaisonCal = (globalThis as unknown as { MaisonCal: MaisonCalApi }).MaisonCal;
const { addDays, diffDays, nextDue, startsBetween } = MaisonCal;

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
const hm = (t: string | null) => { if (!t) return ""; const [h, m] = String(t).slice(0, 5).split(":"); return `${Number(h)} h${m === "00" ? "" : " " + m}`; };
function whenFr(day: string, startTime: string | null, today: string) {
  const label = day === today ? "aujourd'hui" : day === addDays(today, 1) ? "demain"
    : new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`));
  return startTime ? `${label} à ${hm(startTime)}` : `${label} (toute la journée)`;
}

/* ---------- envoi ---------- */
let sent = 0, failed = 0, googleFailed = 0;
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

/* ---------- 5. tâches → Google Agenda (même règle que l'appli, maison/gtaches.js) ---------- */
type Task = { id: string; title: string; room: string; assignee: string | null; rotate: boolean; freq: string; every_n: number; weekdays: number[]; next_due: string };
async function googleToken(userId: string) {
  const { data } = await supabase.from("google_calendar_tokens").select("*").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Google Agenda n'est plus connecté pour ce compte.");
  if (data.access_token && Date.parse(data.expires_at) > Date.now() + 2 * MINUTE) return data.access_token as string;
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: data.refresh_token, client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), grant_type: "refresh_token" }) });
  const t = await r.json();
  if (!r.ok) throw new Error("Google refuse la connexion (" + (t.error || r.status) + ") : reconnectez Google dans Ma famille.");
  await supabase.from("google_calendar_tokens").update({ access_token: t.access_token, expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("user_id", userId);
  return t.access_token as string;
}
async function syncTasks(today: string) {
  const { data: hhs, error } = await supabase.from("households").select("id,google_tasks").not("google_tasks", "is", null);
  if (error) return; // script 11 pas encore collé
  for (const h of hhs || []) {
    const cfg = h.google_tasks || {};
    if (!cfg.on || !cfg.cal || !cfg.user_id) continue;
    let err = "", n = 0;
    try {
      const token = await googleToken(cfg.user_id);
      const g = async (method: string, path: string, body?: unknown) => {
        const r = await fetch("https://www.googleapis.com/calendar/v3/" + path, { method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
        if (method === "POST" && r.status === 409) return { conflict: true }; // this event id exists already (perhaps deleted)
        if (!r.ok && !(method === "DELETE" && [404, 410].includes(r.status))) throw new Error("Google " + r.status);
        return method === "DELETE" ? null : r.json();
      };
      const from = addDays(today, -7), to = addDays(today, 14);
      const [tk, lg, mb] = await Promise.all([
        supabase.from("tasks").select("id,title,room,assignee,rotate,freq,every_n,weekdays,next_due").eq("household_id", h.id).eq("archived", false),
        supabase.from("task_log").select("id,task_id,member_id,title,done_on").eq("household_id", h.id).gte("done_on", from).lte("done_on", today),
        supabase.from("household_members").select("id,name,position").eq("household_id", h.id)
      ]);
      const ms = (mb.data || []).sort((a, b) => a.position - b.position || String(a.name).localeCompare(String(b.name)));
      const who = (id: string | null) => { const m = ms.find(x => x.id === id); return m ? " · " + m.name : ""; };
      const turn = (id: string) => { const i = ms.findIndex(x => x.id === id); return ms.length && i >= 0 ? ms[(i + 1) % ms.length].id : id; };
      const want: Record<string, { day: string; title: string; room: string }> = {};
      for (const t of (tk.data || []) as Task[]) {
        let d: string | null = t.next_due, a = t.assignee, guard = 0;
        while (d && d <= to && guard++ < 60) {
          const day = d < today ? today : d, k = `${t.id}|${day}`;
          if (!want[k]) want[k] = { day, title: `🧹 ${t.title}${who(a)}`, room: t.room || "" };
          d = nextDue(t, d); if (t.rotate && a) a = turn(a);
        }
      }
      for (const l of lg.data || []) { want[`log|${l.id}`] = { day: l.done_on, title: `✓ ${l.title}${who(l.member_id)}`, room: "" }; delete want[`${l.task_id}|${l.done_on}`]; }
      // fixed event id from the household and the task/day (same as the app): no double, even when two write at once
      const evId = async (k: string) => { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(h.id + "|" + k)); return "mz" + [...new Uint8Array(d)].slice(0, 20).map(x => x.toString(16).padStart(2, "0")).join(""); };
      const base = "calendars/" + encodeURIComponent(cfg.cal) + "/events", have: Record<string, { id: string; summary: string; start: { date?: string } }[]> = {};
      let page = "";
      do {
        const q = new URLSearchParams({ sharedExtendedProperty: "mzhh=" + h.id, timeMin: from + "T00:00:00Z", timeMax: addDays(to, 2) + "T00:00:00Z", singleEvents: "true", maxResults: "2500" });
        if (page) q.set("pageToken", page);
        const r = await g("GET", base + "?" + q);
        for (const e of r.items || []) { const k = e.extendedProperties?.shared?.mzk; if (k) (have[k] = have[k] || []).push(e); }
        page = r.nextPageToken || "";
      } while (page);
      for (const [k, w] of Object.entries(want)) {
        const id = await evId(k), list = have[k] || [];
        const body = { summary: w.title, description: "Tâche Maisonnée" + (w.room ? " · " + w.room : ""), start: { date: w.day }, end: { date: addDays(w.day, 1) }, transparency: "transparent", extendedProperties: { shared: { mzhh: h.id, mzk: k } } };
        for (const e of list) if (e.id !== id) { await g("DELETE", base + "/" + encodeURIComponent(e.id)); n++; }
        const e = list.find(x => x.id === id);
        if (e) { if (e.summary !== w.title || e.start?.date !== w.day) { await g("PATCH", base + "/" + id, body); n++; } }
        else { const r = await g("POST", base, { ...body, id }); if (r?.conflict) await g("PUT", base + "/" + id, { ...body, status: "confirmed" }); n++; }
        delete have[k];
      }
      for (const list of Object.values(have)) for (const e of list) { await g("DELETE", base + "/" + encodeURIComponent(e.id)); n++; }
    } catch (e) { err = (e as Error).message || "Erreur Google Agenda"; googleFailed++; console.error("Tâches → Google", h.id, err); }
    await supabase.from("households").update({ google_tasks: { ...cfg, at: new Date().toISOString(), err, changed: n } }).eq("id", h.id);
  }
}

Deno.serve(async req => {
  if (!env("CRON_SECRET") || req.headers.get("x-cron-secret") !== env("CRON_SECRET")) return new Response("Unauthorized", { status: 401 });
  if (![env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY")].every(Boolean)) return new Response("VAPID secrets missing", { status: 500 });

  sent = 0; failed = 0; googleFailed = 0; subsCache.clear();
  const now = Date.now(), { day: today, time: nowTime } = parisDateParts(new Date(now));
  const yesterday = addDays(today, -1), tomorrow = addDays(today, 1);

  // tâches → Google Agenda, toutes les 5 minutes (sans gêner les notifications si Google répond mal)
  if (new Date(now).getUTCMinutes() % 5 === 0 && env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET")) {
    try { await syncTasks(today); } catch (e) { googleFailed++; console.error("Tâches → Google", e); }
  }

  // qui reçoit des notifications, et avec quelles préférences
  const { data: allSubs } = await supabase.from("maison_push_subscriptions").select("user_id");
  const users = new Set((allSubs || []).map(s => s.user_id as string));
  if (!users.size) return Response.json({ sent, failed, googleFailed, note: "aucun appareil abonné" });
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
          await pushOnce(MaisonCal.reminderClaim(ev.id, delay, m.user_id, start), m.user_id, {
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
      await pushOnce(MaisonCal.messageClaim(msg.id, m.user_id), m.user_id, {
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
      await pushOnce(MaisonCal.birthdayEveClaim(b.id, tomorrow, m.user_id), m.user_id, { title: "🎂 Anniversaire demain", body: `${b.name}${age}`, tag: `bday-${b.id}`, url: "./?v=anniv" });
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
      await pushOnce(MaisonCal.digestClaim(today, m.user_id), m.user_id, { title: "☀️ Votre journée", body: parts.join("\n").slice(0, 400), tag: `digest-${today}`, url: "./" });
    }
  }

  // ménage : les traces d'envoi de plus de 40 jours ne servent plus
  if (new Date(now).getUTCMinutes() === 0) await supabase.from("maison_push_deliveries").delete().lt("sent_at", new Date(now - 40 * DAY).toISOString());

  return Response.json({ sent, failed, googleFailed, checked: seen.size });
});
