/* Copie déployée avec les Edge Functions — source canonique : maison/pet-notify-core.js */
(function (root) {
  const COLLECT_MS = 120 * 1000;
  const SESSION_IP_ATTACH_MS = 0;
  const PUSH_BODY_MAX = 240;
  const APP_HOME = "https://carnets-menus.vercel.app/maison/";

  function timeFr(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "";
    }
  }

  function petDetailUrl(petId, sessionId) {
    let u = APP_HOME + "?v=animaux&pet=" + encodeURIComponent(petId || "");
    if (sessionId) u += "&session=" + encodeURIComponent(sessionId);
    return u;
  }

  function emptySnapshot() {
    return { view_at: null, found_at: null, finder_name: "", finder_phone: "", message: "", location: null };
  }

  function snapshotFingerprint(snap) {
    const s = snap || {};
    const loc = s.location;
    return JSON.stringify({
      found: s.found_at || null,
      fn: s.finder_name || "",
      fp: s.finder_phone || "",
      msg: s.message || "",
      loc: loc ? { lat: loc.lat, lng: loc.lng, address: loc.address || "", source: loc.source || "", at: loc.at || null } : null
    });
  }

  function bundlePriority(snap) {
    if (snap.found_at) return 3;
    if (snap.location) return 2;
    return 1;
  }

  function segmentList(petName, snap) {
    const n = petName || "Animal";
    const t = timeFr(snap.view_at);
    const loc = snap.location;
    const segs = [];
    segs.push({ key: "name", text: n, priority: 0 });
    if (t) segs.push({ key: "time", text: "Consulté " + t, priority: 1 });
    if (snap.found_at) segs.push({ key: "found", text: "SIGNALÉ RETROUVÉ", priority: 2 });
    if (loc) {
      if (loc.source === "manual" && loc.address) {
        segs.push({ key: "loc", text: "Lieu: " + String(loc.address).trim(), priority: 3 });
      } else if (loc.lat != null && loc.lng != null) {
        const acc = loc.accuracy != null ? " ±" + loc.accuracy + " m" : "";
        segs.push({
          key: "loc",
          text: "GPS " + Number(loc.lat).toFixed(4) + ", " + Number(loc.lng).toFixed(4) + acc,
          priority: 3
        });
      } else if (loc.address) {
        segs.push({ key: "loc", text: "Lieu: " + String(loc.address).trim(), priority: 3 });
      }
    }
    if (snap.finder_name) segs.push({ key: "who", text: String(snap.finder_name), priority: 4 });
    if (snap.finder_phone) segs.push({ key: "tel", text: String(snap.finder_phone), priority: 5 });
    if (!snap.found_at && !loc && !snap.finder_name && !snap.finder_phone) {
      segs.push({ key: "none", text: "Aucune position ni contact", priority: 6 });
    }
    return segs;
  }

  function packBody(segs, maxLen) {
    const sorted = segs.slice().sort((a, b) => a.priority - b.priority);
    let kept = [];
    let body = "";
    const joiner = " · ";
    for (const s of sorted) {
      const next = kept.length ? kept.join(joiner) + joiner + s.text : s.text;
      if (next.length <= maxLen) kept.push(s.text);
      else break;
    }
    body = kept.join(joiner);
    const omitted = sorted.filter(s => kept.indexOf(s.text) < 0).map(s => s.key);
    return { body, omitted, truncated: omitted.length > 0 };
  }

  function buildTitle(petName, snap) {
    const n = petName || "Animal";
    if (snap.found_at) return n + " · signalé retrouvé";
    if (snap.location) return n + " · position transmise";
    return n + " · médaille consultée";
  }

  function buildBundleCopy(petName, snap) {
    const segs = segmentList(petName, snap);
    const packed = packBody(segs, PUSH_BODY_MAX);
    let body = packed.body;
    if (packed.truncated) {
      body = (body.length ? body + " · " : "") + "Détails dans Maisonnée";
      if (body.length > PUSH_BODY_MAX) body = body.slice(0, PUSH_BODY_MAX - 1) + "…";
    }
    return {
      title: buildTitle(petName, snap),
      body,
      kind: snap.found_at ? "bundle_found" : (snap.location ? "bundle_loc" : "bundle_view"),
      truncated: packed.truncated,
      omitted: packed.omitted
    };
  }

  function diffLateCopy(petName, beforeFp, afterSnap) {
    const afterFp = snapshotFingerprint(afterSnap);
    if (afterFp === beforeFp) return null;
    const copy = buildBundleCopy(petName, afterSnap);
    if (beforeFp && afterSnap) {
      copy.title = (petName || "Animal") + " · nouvelle info";
      copy.kind = "late_update";
    }
    return copy;
  }

  function mergeSnapshot(snap, kind, data) {
    const s = Object.assign(emptySnapshot(), snap || {});
    data = data || {};
    const now = data.at || new Date().toISOString();
    if (kind === "view" && !s.view_at) s.view_at = now;
    if (kind === "found") {
      s.found_at = s.found_at || now;
      if (data.finder_name) s.finder_name = data.finder_name;
      if (data.finder_phone) s.finder_phone = data.finder_phone;
    }
    if (kind === "message") {
      if (data.message) s.message = data.message;
      if (data.finder_name) s.finder_name = data.finder_name;
      if (data.finder_phone) s.finder_phone = data.finder_phone;
    }
    if (kind === "location") {
      s.location = {
        at: now,
        lat: data.lat != null ? data.lat : null,
        lng: data.lng != null ? data.lng : null,
        accuracy: data.accuracy != null ? data.accuracy : null,
        address: data.address || "",
        source: data.source || "gps"
      };
    }
    if (data.finder_name) s.finder_name = data.finder_name;
    if (data.finder_phone) s.finder_phone = data.finder_phone;
    return s;
  }

  function bundleDueAt(openedAt) {
    const t = openedAt ? new Date(openedAt).getTime() : Date.now();
    return new Date(t + COLLECT_MS).toISOString();
  }

  function pushTag(sessionId, suffix) {
    return ("pet-" + String(sessionId).slice(0, 8) + "-" + suffix).slice(0, 32);
  }

  function shouldSendBundle(snap) {
    return !!(snap && snap.view_at);
  }

  const api = {
    COLLECT_MS,
    SESSION_IP_ATTACH_MS,
    SESSION_REOPEN_MS: SESSION_IP_ATTACH_MS,
    PUSH_BODY_MAX,
    timeFr,
    petDetailUrl,
    emptySnapshot,
    snapshotFingerprint,
    bundlePriority,
    segmentList,
    packBody,
    buildBundleCopy,
    diffLateCopy,
    mergeSnapshot,
    bundleDueAt,
    pushTag,
    shouldSendBundle
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.maisonPetNotifyCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);