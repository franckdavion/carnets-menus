/* Place dans la petite mémoire web du téléphone (environ 5 Mo sur iPhone), partagée par le Carnet de menus et Maisonnée.
   Quand elle est pleine, la connexion ne peut plus être gardée (il faut se reconnecter) et les changements se perdent.
   Chargé en premier par les deux applis : on vérifie qu'il reste de la place et on retire, dans l'ordre, ce qui se retrouve tout seul. */
(function () {
  "use strict";
  const LSK = localStorage;
  const size = () => { let n = 0; try { for (let i = 0; i < LSK.length; i++) { const k = LSK.key(i); n += k.length + (LSK.getItem(k) || "").length; } } catch (e) {} return n; };
  // room for about 600 KB more (session, week, shopping list…)
  const fits = () => { try { LSK.setItem("__place", "x".repeat(300000)); LSK.removeItem("__place"); return true; } catch (e) { try { LSK.removeItem("__place"); } catch (x) {} return false; } };
  const rm = (...ks) => ks.forEach(k => { try { LSK.removeItem(k); } catch (e) {} });
  // my photos already sent to the household's storage: shown from there, no copy needed on the phone
  function dropSentPhotos() {
    try {
      const ph = JSON.parse(LSK.getItem("cm_rphotos") || "{}"), up = JSON.parse(LSK.getItem("cm_cloud_photos") || "{}"), rec = JSON.parse(LSK.getItem("cm_recipes") || "{}");
      let n = 0;
      for (const id of Object.keys(ph)) { const r = rec[id]; if (r && r.photo && up[id] && up[id].p === String(r.photo)) { delete ph[id]; n++; } }
      if (n) LSK.setItem("cm_rphotos", JSON.stringify(ph));
    } catch (e) {}
  }
  function freeSpace(all) {
    try { if (LSK.getItem("cm_state_owner")) rm("cm_base"); } catch (e) {} // old GitHub sync copy: unused with the household carnet
    const steps = [
      () => rm("cm_rph_orig", "cm_menu_backup"),     // originals kept for re-cropping, old backup
      () => rm("cm_autoph5"),                        // automatic photo searches: found again when needed
      () => rm("mz_cache"),                          // Maisonnée's quick-start copy: reloaded from the cloud
      dropSentPhotos
    ];
    for (const s of steps) { if (!all && fits()) break; s(); }
    return fits();
  }
  window.lsSize = size;
  window.freeSpace = freeSpace;
  window.lsRoomOk = freeSpace(false);
})();
