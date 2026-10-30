/* clearing the list, all at once or line by line: what is erased counts as already bought until the last shopping day (the menus stay as they are) */
let shopClearAsk=false;
function shopSnap(){return{type:"shop",before:JSON.parse(J({bought:menu.bought||{},extras:menu.extras||[],shopExtra:menu.shopExtra||{},checked:menu.checked||{},weeks:menu.weeks||{}}))};}
function eraseItem(i){const until=haveUntil(),today=ymd(new Date());menu.bought=Object.assign({},menu.bought);const b=menu.bought[i.key];
  menu.bought[i.key]={q:(b&&b.until>=today?b.q:0)+i.q,until:b&&b.until>until?b.until:until};if(menu.checked)delete menu.checked[i.key];}
function renderShop(items,extras,ids){
  const all=shopDates(), sel=visibleShopDates(), selK=sel.map(x=>x.key);
  const meals=sel.reduce((a,x)=>a+x.locked,0), unlocked=sel.reduce((a,x)=>a+x.n-x.locked,0);
  $("#shopDays").innerHTML=all.length?`<span class="label">Courses pour</span><div class="dchips">${all.map(x=>{const on=selK.includes(x.key);return`<span class="dchip${on?" on":""}"><button type="button" data-act="shopDay" data-d="${x.key}" aria-pressed="${on}">${on?"✓ "+esc(dayShort(x)):esc(dayShort(x))+` · ${x.n} repas`}</button></span>`;}).join("")}</div>
    <div class="row" style="gap:14px"><button type="button" class="link" data-act="shopDaysAll">Tous les jours</button><button type="button" class="link" data-act="shopDaysNone">Aucun</button></div>${shopPlanHtml(sel)}`
    :`<span class="muted" style="font-size:13px">Aucun repas prévu dans les 3 prochaines semaines.</span>`;
  const range=sel.length?(sel.length===1?dayShort(sel[0]):`Du ${dayShort(sel[0])} au ${dayShort(sel[sel.length-1])}`):"Aucun jour choisi";
  $("#shopSum").textContent=`${range} · `+(meals?`${meals} repas dans les courses · `:"")+`${items.length+extras.length} article${items.length+extras.length>1?"s":""}`;
  const el=$("#shopList");
  const xr=Object.entries(menu.shopExtra||{}).filter(([id])=>recipes[id]);
  const xrHtml=xr.length?`<div class="rayon"><h4>Recettes ajoutées hors menu</h4>${xr.map(([id,n])=>`<div class="xr-item"><button type="button" class="nm" data-act="viewRec" data-id="${esc(id)}">${esc(recipes[id].name)}${validatedUses(id).length?`<small class="muted" style="display:block;font-size:12px">déjà au menu validé : pas compté deux fois</small>`:""}</button><span class="q">${n} p. <button type="button" class="x" data-act="shopRm" data-id="${esc(id)}" aria-label="Retirer ${esc(recipes[id].name)}">✕</button></span></div>`).join("")}</div>`:"";
  const hint=false&&unlocked?`<div class="note" style="margin-top:12px">${unlocked} repas du menu ${unlocked>1?"ne sont pas verrouillés":"n'est pas verrouillé"} : verrouillez-${unlocked>1?"les":"le"} pour ajouter ${unlocked>1?"leurs":"ses"} ingrédients.</div>`:"";
  const hv=shopping(true).filter(isHave).sort((a,b)=>a.n.localeCompare(b.n,"fr"));
  const hvHtml=hv.length?`<details class="rayon"><summary class="muted" style="font-size:13px;cursor:pointer">Déjà à la maison (${hv.length}) · ingrédients masqués de la liste</summary>${hv.map(i=>`<div class="item" style="cursor:default"><span></span><span class="nm muted">${esc(i.n)}</span><span class="q muted">${esc(fmt(i.q,i.u))}</span><button type="button" class="have" data-act="haveUndo" data-k="${esc(i.key)}">Remettre</button></div>`).join("")}<button type="button" class="link" data-act="haveReset" style="margin-top:6px">Tout remettre dans la liste</button></details>`:"";
  if(!items.length&&!extras.length){el.innerHTML=hint+hvHtml+`<div class="muted" style="padding:16px 0">${sel.length?"Touchez un jour ci-dessus : ses repas et leurs ingrédients arrivent dans la liste.":"Choisissez ci-dessus les jours pour lesquels vous faites les courses."}</div>`;return;}
  const groups=RAYONS.map(ry=>({ry,its:items.filter(i=>(RAYONS.includes(i.r)?i.r:"Divers")===ry).sort((a,b)=>a.n.localeCompare(b.n,"fr"))})).filter(g=>g.its.length);
  const drive=(n,ref)=>!curDrive()?"":`<a class="drive" href="${driveUrl(n)}" target="_blank" rel="noopener" data-act="driveGo" data-ref="${esc(ref)}" aria-label="Chercher ${esc(n)} sur ${esc((curDrive()||{n:""}).n)}">Drive ↗</a>`;
  const cartBtn=ref=>`<button type="button" class="have on" data-act="cartUndo" data-ref="${esc(ref)}" aria-label="Retirer du panier">Au panier ✓</button>`;
  const missTag=d=>d?`<span class="miss">Pas trouvé le ${esc(shortDate(parseYmd(d)))}</span>`:"";
  let h=groups.map(g=>`<div class="rayon"><div class="rayon-h"><h4>${esc(g.ry)}</h4><button type="button" class="link" data-act="haveRayon" data-r="${esc(g.ry)}">J'ai tout ce rayon</button></div>${g.its.map(i=>
{const inCart=!!menu.checked[i.key];return`<div class="item${inCart?" done":""}" style="cursor:default"><span class="dot"></span>
      <span class="nm">${esc(i.n)} ${inCart?"":drive(i.n,"k:"+i.key)}${missTag((menu.missed||{})[i.key])}${i.from.length?`<span class="from">Pour : ${esc(i.from.join(" · "))}</span>`:""}</span><span class="q">${esc(fmt(i.q,i.u))}</span>${inCart?cartBtn("k:"+i.key):`<button type="button" class="have" data-act="haveIt" data-k="${esc(i.key)}" aria-label="J'ai déjà ${esc(i.n)}">J'ai déjà</button>`}<button type="button" class="x it-del" data-act="shopDel" data-k="${esc(i.key)}" aria-label="Effacer ${esc(i.n)} de la liste">✕</button></div>`;}).join("")}</div>`).join("");

  if(extras.length)h+=`<div class="rayon"><h4>En plus</h4>${extras.map((x,ix)=>`<div class="item${x.done?" done":""}" style="cursor:default"><span class="dot"></span>
      <span class="nm">${esc(x.t)} ${x.done?"":drive(x.t,"x:"+ix)}${missTag(x.missed)}</span><span></span>${x.done?cartBtn("x:"+ix):`<button type="button" class="x" data-act="rmX" data-i="${ix}" aria-label="Retirer ${esc(x.t)}">✕</button>`}</div>`).join("")}</div>`;
  const clr=`<div class="shop-clear">${shopClearAsk?`<span>Vider toute la liste ? Les repas restent au menu, à rajouter aux courses.</span><button type="button" class="btn danger" data-act="shopClearYes">Oui, vider</button><button type="button" class="btn ghost" data-act="shopClearNo">Non</button>`:`<button type="button" class="btn ghost" data-act="shopClear">🗑️ Vider la liste</button>`}</div>`;
  el.innerHTML=hint+clr+xrHtml+h+hvHtml;
}

/* ---------- store mode: big checkboxes, ticked items drop into the cart ---------- */
function storeRows(){
  const rows=shopping().map(i=>({id:"k:"+i.key,n:i.n,q:fmt(i.q,i.u),from:i.from,r:RAYONS.includes(i.r)?i.r:"Divers",on:!!menu.checked[i.key]}));
  (menu.extras||[]).forEach((x,ix)=>rows.push({id:"x:"+ix,n:x.t,q:"",from:[],r:"En plus",on:!!x.done}));
  return rows;
}
function renderStore(){
  const rows=storeRows(),done=rows.filter(r=>r.on),todo=rows.filter(r=>!r.on);
  $("#storeFill").style.width=(rows.length?done.length/rows.length*100:0)+"%";
  $("#storeCount").textContent=`${done.length} / ${rows.length} dans le caddie`;
  const row=r=>`<button type="button" class="srow${r.on?" on":""}" data-act="storeTick" data-s="${esc(r.id)}" aria-pressed="${r.on}"><span class="box">${r.on?"✓":""}</span><span class="nm">${esc(r.n)}${r.from.length?`<span class="from">${esc(r.from.join(" · "))}</span>`:""}</span><span class="q">${esc(r.q)}</span></button>`;
  const order=[...RAYONS,"En plus"];
  let h=order.map(g=>{const its=todo.filter(r=>r.r===g).sort((a,b)=>a.n.localeCompare(b.n,"fr"));return its.length?`<h4 class="store-h">${esc(g)}</h4>${its.map(row).join("")}`:"";}).join("");
  if(!rows.length)h='<p class="muted">La liste est vide : ajoutez des repas aux courses ou des produits.</p>';
  else if(!todo.length)h='<p class="note" style="margin-top:12px">Tout est dans le caddie !</p>';
  if(done.length)h+=`<h4 class="store-h" style="color:var(--muted)">Dans le caddie (${done.length})</h4>${done.sort((a,b)=>a.n.localeCompare(b.n,"fr")).map(row).join("")}`;
  $("#storeList").innerHTML=h;
  $("#storeEnd").innerHTML=!rows.length?"":finishAsk
    ?`<p style="margin:0"><strong>${done.length} article${done.length>1?"s":""} acheté${done.length>1?"s":""}</strong>${todo.length?`, ${todo.length} non trouvé${todo.length>1?"s":""} (${todo.length>1?"ils restent":"il reste"} dans la liste)`:""}. Terminer les courses ?</p>
       <div class="row"><button type="button" class="btn primary" data-act="finishYes">Oui, terminer</button><button type="button" class="btn ghost" data-act="finishNo">Pas encore</button></div>`
    :`<button type="button" class="btn primary" data-act="finishAsk" ${done.length?"":"disabled"}>Courses terminées</button><span class="muted" style="font-size:12px">${done.length?"Ce qui est coché sort de la liste et va dans l'historique. Le reste est gardé pour la prochaine fois.":"Cochez ce que vous mettez dans le caddie."}</span>`;
}

/* ---------- Intermarché drive: open the site's search for an item ---------- */
function driveTerm(n){return String(n).replace(/\([^)]*\)/g," ").replace(/^\s*(bou\.|botte de|boîtes? de|sachets? de|pots? de|tranches? de)\s*/i,"").replace(/\s*:.*$/,"").replace(/\s+/g," ").trim();}
const DRIVES0=[{n:"Intermarché",u:"https://www.intermarche.com/recherche/{q}"},{n:"Leclerc",u:"https://fd16-courses.leclercdrive.fr/magasin-088001-088001-Doullens/recherche.aspx?TexteRecherche={q}"},{n:"Match",u:"https://www.supermarchesmatch.fr/fr/recherche?recherche={q}"}];
function drives(){return Array.isArray(menu.drives)?menu.drives:DRIVES0;}
function curDrive(){const ds=drives();return ds.find(d=>d.n===menu.driveSel)||ds[0]||null;}
function driveUrl(n){const d=curDrive();return d?d.u.split("{q}").join(encodeURIComponent(driveTerm(n))):"#";}
function renderDrives(){
  const ds=drives(),cur=curDrive();
  $("#driveBar").innerHTML=`<span class="label">Mon drive</span><div class="row" style="gap:6px;align-items:center">${ds.map(d=>`<span class="dchip${cur&&cur.n===d.n?" on":""}"><button type="button" data-act="driveSel" data-n="${esc(d.n)}">${cur&&cur.n===d.n?"✓ ":""}${esc(d.n)}</button></span>`).join("")}<button type="button" class="link" data-act="openDrives">Gérer</button></div>`;
  if($("#drivesSheet").hidden)return;
  $("#drivesList").innerHTML=ds.length?ds.map((d,i)=>`<div class="drive-row"><strong>${esc(d.n)}</strong><button type="button" class="x" data-act="driveDel" data-i="${i}" aria-label="Supprimer ${esc(d.n)}">✕</button><span class="muted">${esc(d.u.replace("{q}","…"))}</span></div>`).join(""):'<p class="muted" style="margin:0">Aucun drive enregistré.</p>';
}

$("#driveForm").addEventListener("submit",e=>{e.preventDefault();
  const n=$("#driveName").value.trim(),raw=$("#driveAddr").value.trim(),err=$("#driveErr");err.textContent="";
  if(!n){err.textContent="Donnez un nom au drive.";return;}
  if(!/^https?:\/\//i.test(raw)){err.textContent="Collez l'adresse complète de la page (elle commence par https://).";return;}
  const m=raw.match(/lait/i);if(!m){err.textContent="L'adresse doit contenir le mot « lait » : faites la recherche « lait » sur le site puis copiez l'adresse.";return;}
  const u=raw.slice(0,m.index)+"{q}"+raw.slice(m.index+4);
  const ds=drives().filter(d=>norm(d.n)!==norm(n));menu.drives=[...ds,{n,u}];menu.driveSel=n;
  $("#driveName").value="";$("#driveAddr").value="";render();renderDrives();saveMenu();toast(n+" enregistré");});

/* ---------- finishing a trip: bought items leave the list, missed ones stay, the trip goes to history ---------- */
let finishAsk=false, lastFinish=null;
function finishTrip(){
  const completedMealIds=typeof window.maisonneeFinishEligibleMeals==="function" ? window.maisonneeFinishEligibleMeals() : [];
  const snap=JSON.stringify({checked:menu.checked,bought:menu.bought,missed:menu.missed,extras:menu.extras,trips:menu.trips,weeks:menu.weeks});
  const today=ymd(new Date()), until=haveUntil()>today?haveUntil():today;
  const items=shopping();
  const next=applyFinishTrip(menu,items,today,until,RAYONS);
  menu.bought=next.bought;menu.missed=next.missed;menu.extras=next.extras;menu.checked=next.checked;menu.trips=next.trips;menu.buyLog=next.buyLog;
  // A confirmed shopping trip completes only the planned meals whose ingredients
  // were all checked (or already available). Unrelated extras never block them.
  if(completedMealIds.length && typeof window.maisonneeApplyFinishedMeals==="function"){
    window.maisonneeApplyFinishedMeals(completedMealIds);
  }
  lastFinish=snap; finishAsk=false;
  $("#storeSheet").hidden=true; render(); saveMenu();
  toast(`Courses terminées : ${next.got.length} article${next.got.length>1?"s":""} acheté${next.got.length>1?"s":""}`);
}
function undoFinish(){if(!lastFinish)return;const o=JSON.parse(lastFinish);["checked","bought","missed","extras","trips","weeks"].forEach(k=>{if(k in o)menu[k]=o[k];else delete menu[k];});lastFinish=null;render();saveMenu();toast("Courses remises comme avant");}
function renderTrips(){
  $("#finishNote").innerHTML=lastFinish?`<div class="note row" style="justify-content:space-between">Courses terminées.<button type="button" class="btn" data-act="finishUndo">Annuler</button></div>`:"";
  const tr=menu.trips||[];
  $("#tripList").innerHTML=tr.length?`<details class="field" style="margin-top:8px"><summary class="label" style="cursor:pointer">Courses précédentes (${tr.length})</summary>${tr.map((t,ti)=>`<details class="trip"><summary>${esc(parseYmd(t.d).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"}))} · ${t.got.length} article${t.got.length>1?"s":""}</summary>
      ${[...RAYONS,"En plus"].map(ry=>{const its=t.got.filter(x=>x.r===ry);return its.length?`<div class="rayon"><h4>${esc(ry)}</h4>${its.map(x=>`<div class="item" style="cursor:default"><span class="dot"></span><span class="nm">${esc(x.n)}</span><span class="q">${esc(x.q)}</span><span></span></div>`).join("")}</div>`:"";}).join("")}
      ${t.miss.length?`<p class="muted" style="font-size:13px;margin:8px 0 0">Non trouvé : ${esc(t.miss.join(", "))}</p>`:""}
      <button type="button" class="link" data-act="tripReuse" data-i="${ti}" style="margin-top:8px">Remettre dans la liste</button></details>`).join("")}</details>`:"";
}

