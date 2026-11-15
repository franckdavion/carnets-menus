import { clampInt, encodeCleaningMode, namesForRoomIds, parseSegmentIds, unknownRoomsError, unknownSegmentIds, withoutHiddenRooms, type DreameMapRoom } from "./clean_payload.ts";
import {
  admin, ACT_PAUSE, ACT_STOP, ACT_CHARGE, CLEANING_MODE,
  json, cors, householdOf, logDreameDiag, userFrom, type DreameCred
} from "./dreame_config.ts";
import { dreameListDevices, dreameLogin, dreameSendCommand, dreameSetPropRows, dreameWriteCleaningRoute, isUnreachable, pickDefaultDevice } from "./dreame_iot.ts";
import {
  dreameCleanSegments, dreameFetchMapRooms, dreameReadRobotLocation, dreameReadSettings,
  getCred, listPrograms, mergeNamedRooms, normalizeProgram, normalizeRegion, packAutoWash,
  readState, routeAction, settingsLabels
} from "./dreame_ops.ts";

function listedRooms(cred: DreameCred | null | undefined): DreameMapRoom[] {
  if (!cred) return [];
  const rooms = Array.isArray(cred.map_rooms) ? cred.map_rooms as DreameMapRoom[] : [];
  return withoutHiddenRooms(rooms, cred.hidden_map_room_ids);
}

export async function dreameHandler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  try {
    const user = await userFrom(req);
    if (!user) return json(req, { error: "Connexion Maisonnée requise" }, 401);
    const member = await householdOf(user.id);
    if (!member) return json(req, { error: "Vous n'êtes dans aucun foyer" }, 403);
    const hid = member.household_id;
    const url = new URL(req.url);
    const payload = req.method === "POST" ? await req.json().catch(() => ({})) as Record<string, unknown> : {};
    const action = routeAction(url, payload);

    if (action === "status") {
      const cred = await getCred(hid);
      const { data: hh } = await admin.from("households").select("dreame_device_id").eq("id", hid).maybeSingle();
      const rooms = listedRooms(cred);
      return json(req, {
        connected: !!cred,
        device_id: hh?.dreame_device_id ?? cred?.device_id ?? null,
        device_name: cred?.device_name || null,
        rooms,
        programs: cred ? listPrograms(cred) : [],
        auto_wash: packAutoWash(cred)
      });
    }

    if (action === "connect" && req.method === "POST") {
      const email = String(payload.email || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const region = normalizeRegion(payload.region);
      const country = String(payload.country || "FR").trim().toUpperCase().slice(0, 2);
      const lang = String(payload.lang || "fr").trim().toLowerCase().slice(0, 5);
      const pickDid = payload.device_id != null ? String(payload.device_id) : null;
      if (!email || !email.includes("@")) return json(req, { error: "Adresse e-mail Dreame invalide" }, 400);
      if (password.length < 4) return json(req, { error: "Mot de passe Dreame invalide" }, 400);
      const probe: DreameCred = {
        household_id: hid,
        email,
        password,
        region,
        country,
        lang,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        uid: null,
        device_id: null,
        device_name: null,
        device_model: null
      };
      const tok = await dreameLogin(probe);
      const withTok = { ...probe, access_token: tok.access_token, refresh_token: tok.refresh_token, token_expires_at: tok.expires_at, uid: tok.uid };
      const devices = await dreameListDevices(withTok);
      if (!devices.length) return json(req, { error: "Aucun appareil sur ce compte Dreame Home." }, 400);
      const device = pickDefaultDevice(devices, pickDid);
      if (!device) return json(req, { error: "Aucun aspirateur sélectionnable." }, 400);
      const { error } = await admin.from("household_dreame").upsert({
        household_id: hid,
        email,
        password,
        region,
        country,
        lang,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        token_expires_at: tok.expires_at,
        uid: tok.uid,
        device_id: device.did,
        device_name: device.name,
        device_model: device.model,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      });
      if (error) throw error;
      await admin.from("households").update({ dreame_device_id: device.did }).eq("id", hid);
      return json(req, {
        connected: true,
        device_id: device.did,
        device_name: device.name,
        devices: devices.map(d => ({ id: d.did, name: d.name, model: d.model, online: d.online }))
      });
    }

    if (action === "disconnect" && req.method === "POST") {
      await admin.from("household_dreame").delete().eq("household_id", hid);
      await admin.from("households").update({ dreame_device_id: null }).eq("id", hid);
      return json(req, { connected: false });
    }

    const cred = await getCred(hid);
    if (!cred) return json(req, { error: "Dreame Home n'est pas relié" }, 400);

    if (action === "devices") {
      const devices = await dreameListDevices(cred);
      return json(req, {
        devices: devices.map(d => ({ id: d.did, name: d.name, model: d.model, online: d.online }))
      });
    }

    if (action === "state") {
      const quick = url.searchParams.get("quick") === "1" || payload.quick === true;
      const st = await readState(cred, quick);
      return json(req, st);
    }

    if (action === "live_prefs") {
      const did = cred.device_id;
      if (!did) return json(req, { error: "Aucun aspirateur Dreame sélectionné" }, 400);
      const live = await dreameReadSettings(cred, did, false, true);
      const prefs = settingsLabels({
        suction: live.suction,
        water: live.water,
        cleaning_mode: live.cleaning_mode
      });
      const settings_readable = live.cleaning_mode != null || live.suction != null || live.water != null;
      return json(req, {
        ok: true,
        settings_readable,
        live_ok: settings_readable || live.status != null || live.battery != null,
        status: live.status,
        battery: live.battery,
        cleaning_route: live.cleaning_route,
        cleaning_mode_raw: live.cleaning_mode_raw,
        ...prefs
      });
    }

    if (action === "robot_where") {
      const did = cred.device_id;
      if (!did) return json(req, { error: "Aucun aspirateur Dreame sélectionné" }, 400);
      const loc = await dreameReadRobotLocation(cred, did);
      const ids = loc.robot ? [loc.robot] : [];
      const mapRooms = listedRooms(cred);
      return json(req, {
        ok: true,
        current_room_ids: ids,
        current_rooms: namesForRoomIds(ids, mapRooms),
        job_room_ids: loc.job,
        job_rooms: namesForRoomIds(loc.job, mapRooms),
        charger_room_id: loc.charger
      });
    }

    if (action === "rooms") {
      const cached = listedRooms(cred);
      const hidden = cred.hidden_map_room_ids;
      const did = cred.device_id;
      if (!did) return json(req, { rooms: cached, hint: cached.length ? null : "Aucun aspirateur Dreame sélectionné", live_ok: false });
      try {
        const map = await dreameFetchMapRooms(cred, did);
        if (map.rooms?.length) {
          const rooms = withoutHiddenRooms(mergeNamedRooms(map.rooms, cached), hidden);
          logDreameDiag("map_rooms_merged", {
            live: (map.rooms || []).map(r => r.id),
            cached: cached.map((r: { id?: number }) => r.id),
            hidden: parseSegmentIds(hidden),
            merged: rooms.map(r => ({ id: r.id, name: r.name }))
          });
          await admin.from("household_dreame").update({ map_rooms: rooms, updated_at: new Date().toISOString() }).eq("household_id", hid);
          return json(req, { ...map, rooms });
        }
        if (cached.length) {
          return json(req, {
            rooms: cached,
            hint: map.hint || "Liste issue du cache : relisez la carte si le découpage Dreame a changé.",
            live_ok: map.live_ok,
            cached: true
          });
        }
        return json(req, map);
      } catch (e) {
        if (cached.length) {
          return json(req, {
            rooms: cached,
            hint: (e instanceof Error ? e.message : "Lecture de carte impossible") + " Liste en cache, peut-être périmée.",
            live_ok: false,
            cached: true
          });
        }
        throw e;
      }
    }

    if (action === "command" && req.method === "POST") {
      const did = cred.device_id;
      if (!did) return json(req, { error: "Aucun aspirateur Dreame sélectionné" }, 400);
      const act = String(payload.action || "");
      const mapRooms = listedRooms(cred);
      let sent_ids: number[] = [];
      let cleanResult: Awaited<ReturnType<typeof dreameCleanSegments>> | null = null;
      if (act === "start" || act === "play") {
        const cleaning_mode = payload.cleaning_mode !== undefined ? clampInt(payload.cleaning_mode, 0, 3, 2) : null;
        const suction = payload.suction !== undefined ? clampInt(payload.suction, 0, 3, 1) : null;
        const water = payload.water !== undefined ? clampInt(payload.water, 1, 3, 2) : null;
        const ids = parseSegmentIds(payload.segment_ids);
        if (!ids.length) return json(req, { error: "Choisissez au moins une pièce à nettoyer." }, 400);
        const unknown = unknownSegmentIds(ids, mapRooms);
        if (unknown.length) return json(req, { error: unknownRoomsError(unknown, mapRooms), unknown_ids: unknown }, 400);
        sent_ids = ids;
        logDreameDiag("start", { ids, rooms: namesForRoomIds(ids, mapRooms), path: "multi" });
        // CleanRoute est écrit via set_prefs, jamais collé à START_CUSTOM.
        cleanResult = await dreameCleanSegments(cred, did, ids, {
          cleaning_mode: cleaning_mode ?? 2,
          cleaning_mode_raw: typeof payload.cleaning_mode_raw === "number" ? payload.cleaning_mode_raw : null,
          suction: suction ?? 1,
          water: water ?? 2,
          repeats: clampInt(payload.repeats, 1, 3, 1)
        });
      } else if (act === "pause") {
        await dreameSendCommand(cred, did, "action", { did, siid: ACT_PAUSE.siid, aiid: ACT_PAUSE.aiid, in: [] });
      } else if (act === "stop") {
        await dreameSendCommand(cred, did, "action", { did, siid: ACT_STOP.siid, aiid: ACT_STOP.aiid, in: [] });
      } else if (act === "dock" || act === "charge") {
        await dreameSendCommand(cred, did, "action", { did, siid: ACT_CHARGE.siid, aiid: ACT_CHARGE.aiid, in: [] });
      } else if (act === "set_prefs") {
        const updates: { siid: number; piid: number; value: unknown }[] = [];
        if (payload.suction !== undefined) {
          updates.push({ siid: 4, piid: 4, value: clampInt(payload.suction, 0, 3, 1) });
        }
        if (payload.water !== undefined) {
          updates.push({ siid: 4, piid: 5, value: clampInt(payload.water, 1, 3, 2) });
        }
        if (payload.cleaning_mode !== undefined) {
          const mode = clampInt(payload.cleaning_mode, 0, 3, 2);
          const raw = typeof payload.cleaning_mode_raw === "number" ? payload.cleaning_mode_raw : null;
          const encoded = encodeCleaningMode(mode, raw);
          updates.push({ siid: CLEANING_MODE.siid, piid: CLEANING_MODE.piid, value: encoded });
        }
        const writes: Promise<unknown>[] = [];
        if (updates.length) writes.push(dreameSetPropRows(cred, did, updates));
        if (payload.cleaning_route !== undefined) {
          writes.push(dreameWriteCleaningRoute(cred, did, clampInt(payload.cleaning_route, 1, 4, 1)));
        }
        if (!writes.length) return json(req, { ok: true, skipped: true });
        await Promise.all(writes);
        const overlay = settingsLabels({
          suction: payload.suction !== undefined ? clampInt(payload.suction, 0, 3, 1) : null,
          water: payload.water !== undefined ? clampInt(payload.water, 1, 3, 2) : null,
          cleaning_mode: payload.cleaning_mode !== undefined ? clampInt(payload.cleaning_mode, 0, 3, 2) : null
        });
        const nextRaw = payload.cleaning_mode !== undefined
          ? encodeCleaningMode(
            clampInt(payload.cleaning_mode, 0, 3, 2),
            typeof payload.cleaning_mode_raw === "number" ? payload.cleaning_mode_raw : null
          )
          : undefined;
        return json(req, {
          ok: true,
          ...overlay,
          cleaning_mode_raw: nextRaw,
          cleaning_route: payload.cleaning_route !== undefined ? clampInt(payload.cleaning_route, 1, 4, 1) : undefined
        });
      } else if (act === "clean_room") {
        const segmentId = parseSegmentIds([payload.segment_id])[0] || 0;
        if (!segmentId) return json(req, { error: "Pièce Dreame invalide" }, 400);
        const unknown = unknownSegmentIds([segmentId], mapRooms);
        if (unknown.length) return json(req, { error: unknownRoomsError(unknown, mapRooms), unknown_ids: unknown }, 400);
        sent_ids = [segmentId];
        let cur = { cleaning_mode: 2 as number | null, suction: 1 as number | null, water: 2 as number | null, cleaning_mode_raw: null as number | null };
        try { cur = await dreameReadSettings(cred, did); } catch { /* défauts */ }
        const cleaning_mode = payload.cleaning_mode !== undefined
          ? clampInt(payload.cleaning_mode, 0, 3, 2)
          : clampInt(cur.cleaning_mode, 0, 3, 2);
        const suction = payload.suction !== undefined
          ? clampInt(payload.suction, 0, 3, 1)
          : clampInt(cur.suction, 0, 3, 1);
        const water = payload.water !== undefined
          ? clampInt(payload.water, 1, 3, 2)
          : clampInt(cur.water, 1, 3, 2);
        const repeats = clampInt(payload.repeats, 1, 3, 1);
        logDreameDiag("start", { ids: [segmentId], rooms: namesForRoomIds([segmentId], mapRooms), path: "single" });
        cleanResult = await dreameCleanSegments(cred, did, [segmentId], {
          cleaning_mode,
          cleaning_mode_raw: typeof payload.cleaning_mode_raw === "number" ? payload.cleaning_mode_raw : cur.cleaning_mode_raw,
          suction,
          water,
          repeats
        });
      } else if (act === "clean_rooms" || act === "run_program") {
        let cleaning_mode: number;
        let suction: number;
        let water: number;
        let repeats: number;
        let ids: number[];
        if (act === "run_program") {
          const prog = listPrograms(cred).find(p => p.id === String(payload.program_id || ""));
          if (!prog) return json(req, { error: "Programme introuvable" }, 404);
          cleaning_mode = prog.cleaning_mode;
          suction = prog.suction;
          water = prog.water;
          repeats = prog.repeats;
          ids = parseSegmentIds(prog.room_ids);
        } else {
          let cur = { cleaning_mode: 2 as number | null, suction: 1 as number | null, water: 2 as number | null };
          try { cur = await dreameReadSettings(cred, did); } catch { /* défauts */ }
          cleaning_mode = payload.cleaning_mode !== undefined
            ? clampInt(payload.cleaning_mode, 0, 3, 2)
            : clampInt(cur.cleaning_mode, 0, 3, 2);
          suction = payload.suction !== undefined
            ? clampInt(payload.suction, 0, 3, 1)
            : clampInt(cur.suction, 0, 3, 1);
          water = payload.water !== undefined
            ? clampInt(payload.water, 1, 3, 2)
            : clampInt(cur.water, 1, 3, 2);
          repeats = clampInt(payload.repeats, 1, 3, 1);
          ids = parseSegmentIds(payload.segment_ids);
        }
        if (!ids.length) return json(req, { error: "Choisissez au moins une pièce" }, 400);
        const unknown = unknownSegmentIds(ids, mapRooms);
        if (unknown.length) return json(req, { error: unknownRoomsError(unknown, mapRooms), unknown_ids: unknown }, 400);
        sent_ids = ids;
        logDreameDiag("start", { ids, rooms: namesForRoomIds(ids, mapRooms), path: act === "run_program" ? "program" : "multi" });
        cleanResult = await dreameCleanSegments(cred, did, ids, { cleaning_mode, suction, water, repeats });
      } else if (act === "rooms") {
        const map = await dreameFetchMapRooms(cred, did);
        return json(req, map);
      } else return json(req, { error: "Commande inconnue" }, 400);
      return json(req, {
        ok: true,
        command_sent: true,
        connected: true,
        device_id: did,
        device_name: cred.device_name || "Dreame",
        commandable: true,
        live_ok: true,
        segment_ids: sent_ids,
        rooms: namesForRoomIds(sent_ids, mapRooms),
        selects: cleanResult?.selects,
        cleaning_mode: cleanResult?.cleaning_mode,
        cleaning_mode_encoded: cleanResult?.cleaning_mode_encoded,
        mode_write_ok: cleanResult?.mode_write_ok,
        robot_status: cleanResult?.robot_status ?? undefined,
        clean_confirmed: cleanResult?.clean_confirmed ?? undefined,
        robot_note: sent_ids.length
          ? (cleanResult?.clean_confirmed
            ? "Le robot a quitté l’état d’attente : nettoyage en cours."
            : "Commande acceptée par le cloud. Si le robot affiche « zone inatteignable », l’accès physique ou la carte Dreame est en cause, pas l’identifiant Maisonnée.")
          : undefined
      });
    }

    if (action === "pick_device" && req.method === "POST") {
      const deviceId = String(payload.device_id || "");
      const devices = await dreameListDevices(cred);
      const device = devices.find(d => d.did === deviceId);
      if (!device) return json(req, { error: "Appareil introuvable" }, 404);
      await admin.from("household_dreame").update({
        device_id: device.did,
        device_name: device.name,
        device_model: device.model,
        updated_at: new Date().toISOString()
      }).eq("household_id", hid);
      await admin.from("households").update({ dreame_device_id: device.did }).eq("id", hid);
      return json(req, { ok: true, device_id: device.did, device_name: device.name });
    }

    if (action === "save_rooms" && req.method === "POST") {
      const current = Array.isArray(cred.map_rooms) ? cred.map_rooms : [];
      const incoming = Array.isArray(payload.rooms) ? payload.rooms as { id?: unknown; name?: unknown }[] : [];
      if (!incoming.length && !current.length) return json(req, { error: "Aucune pièce à enregistrer" }, 400);
      const byId = new Map(current.map(r => [r.id, r]));
      for (const row of incoming) {
        const id = clampInt(row.id, 1, 99, 0);
        const name = String(row.name || "").trim().slice(0, 40);
        if (!id || !name) continue;
        byId.set(id, { id, name });
      }
      const rooms = [...byId.values()].sort((a, b) => a.id - b.id);
      await admin.from("household_dreame").update({ map_rooms: rooms, updated_at: new Date().toISOString(), updated_by: user.id }).eq("household_id", hid);
      return json(req, { ok: true, rooms });
    }

    if (action === "save_program" && req.method === "POST") {
      const raw = (payload.program && typeof payload.program === "object" ? payload.program : payload) as Record<string, unknown>;
      const prog = normalizeProgram(raw);
      if (!prog) return json(req, { error: "Nommez le programme et choisissez au moins une pièce" }, 400);
      const list = listPrograms(cred);
      const idx = list.findIndex(p => p.id === prog.id);
      if (idx >= 0) list[idx] = prog;
      else {
        if (list.length >= 20) return json(req, { error: "Maximum 20 programmes" }, 400);
        list.push(prog);
      }
      await admin.from("household_dreame").update({ clean_programs: list, updated_at: new Date().toISOString(), updated_by: user.id }).eq("household_id", hid);
      return json(req, { ok: true, program: prog, programs: list });
    }

    if (action === "delete_program" && req.method === "POST") {
      const id = String(payload.id || "");
      const list = listPrograms(cred).filter(p => p.id !== id);
      await admin.from("household_dreame").update({ clean_programs: list, updated_at: new Date().toISOString(), updated_by: user.id }).eq("household_id", hid);
      return json(req, { ok: true, programs: list });
    }

    if (action === "auto_wash_config" && req.method === "POST") {
      const enabled = payload.enabled === true;
      const minutes = Math.max(4, Math.min(15, Number(payload.interval_minutes) || 5));
      const { error } = await admin.from("household_dreame").update({
        auto_wash_enabled: enabled,
        auto_wash_interval_minutes: minutes,
        auto_wash_last_error: null,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      }).eq("household_id", hid);
      if (error) throw error;
      const next = await getCred(hid);
      return json(req, { ok: true, auto_wash: packAutoWash(next) });
    }

    return json(req, { error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    if (isUnreachable(e)) {
      return json(req, { error: e instanceof Error ? e.message : "Commandes indisponibles", live_ok: false, commandable: false }, 409);
    }
    return json(req, { error: e instanceof Error ? e.message : "Erreur serveur Dreame" }, 500);
  }
}
