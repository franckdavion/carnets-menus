import webpush from "npm:web-push@3.6.7";
// Side-effect : pet-notify-core s’attache à globalThis (CJS IIFE, pas d’export ESM fiable en Deno).
import "./pet-notify-core.js";

type PetNotifyCore = typeof globalThis extends { maisonPetNotifyCore: infer T } ? T : Record<string, never>;
// @ts-ignore — défini par pet-notify-core.js
const PN = globalThis.maisonPetNotifyCore as PetNotifyCore;
if (!PN?.bundleDueAt) throw new Error("pet-notify-core: chargement échoué");

const env = (k: string) => Deno.env.get(k) || "";

export function vapidReady() {
  return [env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY")].every(Boolean);
}

export async function pushToHousehold(
  supabase: ReturnType<typeof import("npm:@supabase/supabase-js@2").createClient>,
  householdId: string,
  petId: string,
  sessionId: string,
  copy: { title: string; body: string; kind?: string },
  tagSuffix: string,
  claimId: string,
  dry: boolean
) {
  if (dry || !vapidReady()) {
    if (!dry && !vapidReady()) console.error("pet-push: secrets VAPID manquants");
    return { sent: 0, skipped: dry };
  }
  webpush.setVapidDetails(env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
  const url = PN.petDetailUrl(petId, sessionId);
  const tag = PN.pushTag(sessionId, tagSuffix);
  const payload = JSON.stringify({
    title: String(copy.title || "Maisonnée").slice(0, 100),
    body: String(copy.body || "").slice(0, 240),
    tag,
    url,
    renotify: tagSuffix.startsWith("late")
  });
  const { data: members } = await supabase.from("household_members").select("user_id").eq("household_id", householdId).not("user_id", "is", null);
  let sent = 0;
  for (const m of members || []) {
    const uid = m.user_id as string;
    const { data: prefRow } = await supabase.from("maison_push_prefs").select("prefs").eq("user_id", uid).maybeSingle();
    const prefs = (prefRow && prefRow.prefs) || {};
    if (prefs.animaux === false) continue;
    const { data: subs } = await supabase.from("maison_push_subscriptions").select("id,subscription").eq("user_id", uid);
    if (!subs?.length) continue;
    const claim = claimId + ":" + uid;
    const { error: claimErr } = await supabase.from("maison_push_deliveries").insert({ id: claim });
    if (claimErr) continue;
    let ok = 0;
    for (const sub of subs) {
      try {
        const subscription = typeof sub.subscription === "string" ? JSON.parse(sub.subscription) : sub.subscription;
        await webpush.sendNotification(subscription as webpush.PushSubscription, payload, {
          TTL: 86400,
          urgency: "high",
          contentEncoding: "aes128gcm",
          headers: { Urgency: "high" }
        });
        ok++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode || 0;
        console.error("pet-push", JSON.stringify({ uid, code, message: (e as { message?: string }).message || String(e) }));
        if ([404, 410].includes(code)) await supabase.from("maison_push_subscriptions").delete().eq("id", sub.id);
      }
    }
    if (ok) sent += ok;
    else await supabase.from("maison_push_deliveries").delete().eq("id", claim);
  }
  return { sent };
}

export async function flushOneSession(
  supabase: ReturnType<typeof import("npm:@supabase/supabase-js@2").createClient>,
  session: Record<string, unknown>,
  pet: Record<string, unknown>,
  dry: boolean
) {
  const id = session.id as string;
  const { data: locked } = await supabase.from("pet_consult_sessions")
    .update({ bundle_sent_at: new Date().toISOString(), last_push_at: new Date().toISOString() })
    .eq("id", id)
    .is("bundle_sent_at", null)
    .lte("bundle_due_at", new Date().toISOString())
    .select("*")
    .maybeSingle();
  if (!locked) return { flushed: false };
  const snap = (locked.snapshot || {}) as Record<string, unknown>;
  if (!PN.shouldSendBundle(snap)) {
    const fp = PN.snapshotFingerprint(snap);
    await supabase.from("pet_consult_sessions").update({ last_push_fingerprint: fp }).eq("id", id);
    return { flushed: true, pushed: false };
  }
  const copy = PN.buildBundleCopy(String(pet.name || ""), snap);
  const fp = PN.snapshotFingerprint(snap);
  const res = await pushToHousehold(
    supabase,
    String(locked.household_id),
    String(locked.pet_id),
    id,
    copy,
    "bundle",
    "pet-bundle:" + id,
    dry
  );
  await supabase.from("pet_consult_sessions").update({ last_push_fingerprint: fp }).eq("id", id);
  return { flushed: true, pushed: (res.sent || 0) > 0 };
}

export async function flushDueBundles(
  supabase: ReturnType<typeof import("npm:@supabase/supabase-js@2").createClient>,
  dry: boolean,
  limit = 40
) {
  const { data: due } = await supabase.from("pet_consult_sessions")
    .select("*")
    .is("bundle_sent_at", null)
    .lte("bundle_due_at", new Date().toISOString())
    .order("bundle_due_at", { ascending: true })
    .limit(limit);
  let count = 0;
  for (const row of due || []) {
    const { data: pet } = await supabase.from("household_pets").select("name, notify_on_view").eq("id", (row as { pet_id: string }).pet_id).maybeSingle();
    await flushOneSession(supabase, row as Record<string, unknown>, pet || { name: "l’animal", notify_on_view: true }, dry);
    count++;
  }
  return { count };
}

export { PN };