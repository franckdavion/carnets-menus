/* Place dans la petite mémoire web du téléphone (environ 5 Mo sur iPhone), partagée par le Carnet de menus et Maisonnée.
   Quand elle est pleine, la connexion ne peut plus être gardée (il faut se reconnecter) et les changements se perdent.
   Chargé en premier par les deux applis : on vérifie qu'il reste de la place et on retire, dans l'ordre, ce qui se retrouve tout seul.
   On ne touche jamais à la session ni à l'identité du foyer. */
(function () {
  "use strict";
  const LSK = localStorage;
  const KEEP = /^(cm_sb_auth|mz_auth_tokens|mz_core|mz_hh|mz_mode|mz_view)/;
  const size = () => { let n = 0; try { for (let i = 0; i < LSK.length; i++) { const k = LSK.key(i); n += k.length + (LSK.getItem(k) || "").length; } } catch (e) {} return n; };
  const fits = () => { try { LSK.setItem("__place", "x".repeat(20000)); LSK.removeItem("__place"); return true; } catch (e) { try { LSK.removeItem("__place"); } catch (x) {} return false; } };
  const rm = (...ks) => ks.forEach(k => {
    if (KEEP.test(k)) return;
    try { LSK.removeItem(k); } catch (e) {}
  });
  function dropSentPhotos() {
    try {
      const ph = JSON.parse(LSK.getItem("cm_rphotos") || "{}"), up = JSON.parse(LSK.getItem("cm_cloud_photos") || "{}"), rec = JSON.parse(LSK.getItem("cm_recipes") || "{}");
      let n = 0;
      for (const id of Object.keys(ph)) { const r = rec[id]; if (r && r.photo && up[id] && up[id].p === String(r.photo)) { delete ph[id]; n++; } }
      if (n) LSK.setItem("cm_rphotos", JSON.stringify(ph));
    } catch (e) {}
  }
  function slimMaisonCache() {
    try {
      const raw = LSK.getItem("mz_cache");
      if (!raw || raw.length < 80000) return;
      const s = JSON.parse(raw);
      LSK.setItem("mz_cache", JSON.stringify({
        hh: s.hh, me: s.me, members: s.members || [], shelly: s.shelly || [],
        vShelly: !!s.vShelly, shop: s.shop || [], tasks: s.tasks || [],
        events: s.events || [], meals: s.meals || [], at: Date.now(),
        photos: [], docs: [], recipes: null
      }));
    } catch (e) {}
  }
  function freeSpace(all) {
    try { if (LSK.getItem("cm_state_owner")) rm("cm_base"); } catch (e) {}
    const steps = [
      () => rm("cm_rph_orig", "cm_menu_backup"),
      () => rm("cm_autoph5"),
      dropSentPhotos,
      slimMaisonCache
    ];
    for (const s of steps) { if (!all && fits()) break; s(); }
    return fits();
  }
  window.lsSize = size;
  window.freeSpace = freeSpace;
  window.lsRoomOk = freeSpace(false);
})();
