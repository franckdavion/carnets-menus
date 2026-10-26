// Supabase Edge Function "maison-push-dispatch".
// À appeler toutes les minutes avec le header x-cron-secret.
// Seuls les rendez-vous INTERNES avec rappels sont pris en charge dans cette première étape.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const env = (key: string) => Deno.env.get(key) || "";

const supabase = createClient(
  env("SUPABASE_URL"),
  env("SUPABASE_SERVICE_ROLE_KEY")
);

webpush.setVapidDetails(
  env("VAPID_SUBJECT"),
  env("VAPID_PUBLIC_KEY"),
  env("VAPID_PRIVATE_KEY")
);

const MINUTE = 60000;
const zone = "Europe/Paris";

function parisDateParts(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(d);

  const x = Object.fromEntries(
    p.map(v => [v.type, v.value])
  );

  return {
    day: `${x.year}-${x.month}-${x.day}`,
    time: `${x.hour}:${x.minute}`
  };
}

function localTimestamp(day: string, time: string) {
  // Resolve a Europe/Paris wall-clock time to an instant, including DST.

  const desired = Date.parse(`${day}T${time}:00Z`);
  let guess = desired;

  for (let i = 0; i < 3; i++) {
    const actual = parisDateParts(new Date(guess));

    const delta =
      desired -
      Date.parse(`${actual.day}T${actual.time}:00Z`);

    guess += delta;

    if (!delta) break;
  }

  return guess;
}

// « aujourd'hui à 18 h 30 », « demain à 9 h », « mardi 3 novembre à 14 h »
function whenFr(day: string, startTime: string | null) {
  const today = parisDateParts(new Date()).day;
  const tomorrow = parisDateParts(new Date(Date.now() + 86400000)).day;
  const d = new Date(`${day}T12:00:00Z`);
  const label = day === today ? "aujourd'hui" : day === tomorrow ? "demain"
    : new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(d);
  if (!startTime) return label + " (toute la journée)";
  const [h, m] = String(startTime).slice(0, 5).split(":");
  return `${label} à ${Number(h)} h${m === "00" ? "" : " " + m}`;
}

Deno.serve(async req => {

  // Vérification de la clé de sécurité Cron
  if (
    !env("CRON_SECRET") ||
    req.headers.get("x-cron-secret") !== env("CRON_SECRET")
  ) {
    return new Response("Unauthorized", {
      status: 401
    });
  }

  // Vérification des clés VAPID
  if (
    ![
      env("VAPID_SUBJECT"),
      env("VAPID_PUBLIC_KEY"),
      env("VAPID_PRIVATE_KEY")
    ].every(Boolean)
  ) {
    return new Response("VAPID secrets missing", {
      status: 500
    });
  }

  const now = Date.now();

  const day = parisDateParts(new Date(now)).day;

  // rappels jusqu'à 4 semaines avant : on regarde les rendez-vous des 29 prochains jours
  const MAX_DELAY = 40320;
  const tomorrow = parisDateParts(
    new Date(now + (MAX_DELAY + 1440) * MINUTE)
  ).day;

  const yesterday = parisDateParts(
    new Date(now - 86400000)
  ).day;

  // Recherche des rendez-vous internes
  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id,household_id,title,day,start_time,reminders,members,repeat"
    )
    .gte("day", yesterday)
    .lte("day", tomorrow)
    .not("reminders", "is", null)
    .limit(5000);

  if (error) {
    return new Response(error.message, {
      status: 500
    });
  }

  let sent = 0;
  let failed = 0;

  for (const event of events || []) {

    // Les événements récurrents ne sont pas encore traités
    if (event.repeat !== "none") continue;

    // Vérification des rappels
    if (
      !Array.isArray(event.reminders) ||
      !event.reminders.length
    ) {
      continue;
    }

    const start = localTimestamp(
      event.day,
      String(event.start_time || "09:00").slice(0, 5)
    );

    for (const delay of event.reminders) {

      if (
        typeof delay !== "number" ||
        delay < 0 ||
        delay > MAX_DELAY
      ) {
        continue;
      }

      const due = start - delay * MINUTE;

      if (
        now < due ||
        now >= due + 2 * MINUTE
      ) {
        continue;
      }

      // Recherche des membres du foyer
      const { data: members, error: me } = await supabase
        .from("household_members")
        .select("id,user_id")
        .eq("household_id", event.household_id)
        .not("user_id", "is", null);

      if (me) {
        failed++;
        continue;
      }

      const eligible = (members || []).filter(
        m =>
          !event.members?.length ||
          event.members.includes(m.id)
      );

      for (const m of eligible) {

        // Identifiant unique pour éviter les doublons
        const deliveryId =
          `${event.id}:${delay}:${m.user_id}:${event.day}`;

        const { error: claimError } = await supabase
          .from("maison_push_deliveries")
          .insert({
            id: deliveryId
          });

        if (claimError) {
          continue;
        }

        // Recherche des appareils enregistrés
        const { data: subs } = await supabase
          .from("maison_push_subscriptions")
          .select("id,subscription")
          .eq("user_id", m.user_id);

        for (const sub of subs || []) {

          try {

            // Envoi de la notification
            await webpush.sendNotification(
              sub.subscription,
              JSON.stringify({
                title: "Rappel Maisonnée",

                body: `${event.title} — ${whenFr(event.day, event.start_time)}`,

                tag: `event-${event.id}`,

                url: "./"
              })
            );

            sent++;

          } catch (e) {

            failed++;

            // Suppression des abonnements expirés
            if (
              [404, 410].includes(
                (e as { statusCode?: number }).statusCode || 0
              )
            ) {
              await supabase
                .from("maison_push_subscriptions")
                .delete()
                .eq("id", sub.id);
            }

            // ==========================================
            // DIAGNOSTIC DÉTAILLÉ DES ERREURS WEB PUSH
            // ==========================================

            const pushError = e as {
              statusCode?: number;
              message?: string;
              body?: string;
            };

            console.error(
              "Push error details:",
              JSON.stringify({
                statusCode: pushError?.statusCode,
                message: pushError?.message,
                body: pushError?.body
              })
            );

            // ==========================================
            // FIN DU DIAGNOSTIC
            // ==========================================

          }
        }
      }
    }
  }

  // ménage : les traces d'envoi de plus de 40 jours ne servent plus
  if (new Date(now).getUTCMinutes() === 0) {
    await supabase.from("maison_push_deliveries").delete().lt("sent_at", new Date(now - 40 * 86400000).toISOString());
  }

  return Response.json({
    sent,
    failed,
    checked: events?.length || 0
  });

});