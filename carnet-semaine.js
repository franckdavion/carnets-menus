/* ---------- render ---------- */
function render(){
  $("#pplN").textContent=menu.people;
  $("#pplMinus").disabled=menu.people<=1;
  for(const v of["menu","week","rec","shop","wine","set"]){
    $("#v-"+v).hidden=view!==v;$("#footCopy").hidden=view==="set";
    $("#t-"+v).setAttribute("aria-selected",view===v);
  }
  applyPacks();refreshThumbs();if(view==="wine")renderWines();{const uf=$("#useFirst");if(uf)uf.innerHTML=useFirstHtml();}if(view==="rec")renderProps();
  {const f=$("#frForm"),to=view==="rec"?$("#frSlotRec"):view==="menu"?$("#v-menu"):null;if(to&&f.parentNode!==to)to.appendChild(f);} // "Qu'est-ce que je fais avec…" lives on Aujourd'hui and Recettes
  const ids=filledSlots();
  $("#b-menu").textContent=ids.length||""; $("#b-menu").hidden=!ids.length;
  const items=shopping(), extras=menu.extras||[];
  const left=items.length+extras.length;
  $("#b-shop").textContent=left||""; $("#b-shop").hidden=!left;
  {const nn=newsCount();$("#b-rec").textContent=nn||"";$("#b-rec").hidden=!nn;}
  if($("#now"))renderNow();
  if(view==="set")renderStart();
  if(!$("#recSheet").hidden)renderRecSheet();
  if($("#reviewSheet")&&!$("#reviewSheet").hidden)renderReview();
  if($("#storeSheet")&&!$("#storeSheet").hidden)renderStore();
  if(view==="week")renderWeek(); if(slotK&&!$("#slotSheet").hidden)renderSlotSheet();
  renderIdea(); renderMenu(); renderRecipes(); renderShop(items,extras,ids); renderTrips(); renderDrives();
}

function renderIdea(){
  const el=$("#idea");
  if(mode==="loading"){el.innerHTML='<span class="muted">Chargement des recettes…</span>';return;}
  const favIds=Object.keys(recipes).filter(id=>recipes[id].fav).sort((x,y)=>recipes[x].name.localeCompare(recipes[y].name,"fr"));
  const tabs=`<div class="chips"><button type="button" class="chip" data-act="ideaMode" data-v="sugg" aria-pressed="${ideaMode!=="fav"}">Suggestions</button><button type="button" class="chip" data-act="ideaMode" data-v="fav" aria-pressed="${ideaMode==="fav"}">★ Mes favoris${favIds.length?" ("+favIds.length+")":""}</button></div>`;
  const row=id=>{const r=recipes[id],on=onMenu(id);return`<div class="dish has-ph">${thumbHtml(id,"dish-ph")}<div>
     <button type="button" class="idea-name" data-act="viewRec" data-id="${esc(id)}" style="border:none;background:none;padding:0;text-align:left"><h3>${r.fav?"★ ":""}${esc(r.name)}</h3></button>
     <div class="meta"><span class="tag">${esc(r.cat||"")}</span>${r.time?esc(r.time)+" min · ":""}<button type="button" class="link" data-act="viewRec" data-id="${esc(id)}">Voir la recette</button></div></div>
     <div class="ctl"><button type="button" class="add${on?" on":""}" data-act="toggle" data-id="${esc(id)}">${on?"✓ Au menu":"+ Menu"}</button></div></div>`;};
  if(ideaMode==="fav"){
    el.innerHTML=`<span class="label">Pas d'idée ?</span>${tabs}`+(favIds.length
      ?`<div class="list">${favIds.slice(0,favShown).map(row).join("")}</div>${favIds.length>favShown?`<div class="row"><button type="button" class="btn ghost" data-act="ideaFavMore">Voir les ${favIds.length-favShown} autres favoris</button></div>`:""}`
      :'<span class="muted">Aucun favori pour l\'instant : touchez ☆ sur une recette pour l\'ajouter.</span>');
    return;}
  const pool=Object.keys(recipes).filter(id=>!onMenu(id)&&canMain(recipes[id]));
  if(!pool.length){el.innerHTML='<span class="label">Pas d\'idée ?</span>'+tabs+'<span class="muted">'+(Object.keys(recipes).length?"Toutes vos recettes sont déjà au menu.":"Ajoutez des recettes pour recevoir des idées.")+'</span>';return;}
  ideaIds=ideaIds.filter(id=>pool.includes(id));
  if(ideaIds.length<Math.min(IDEAS_N,pool.length)){
    const rest=pool.filter(id=>!ideaIds.includes(id)&&!ideaSeen.includes(id));
    const src=rest.length?rest:pool.filter(id=>!ideaIds.includes(id));
    while(ideaIds.length<Math.min(IDEAS_N,pool.length)&&src.length)ideaIds.push(src.splice(Math.floor(Math.random()*src.length),1)[0]);
  }
  el.innerHTML=`<span class="label">Pas d'idée ? Et pourquoi pas…</span>${tabs}
   <div class="list">${ideaIds.map(row).join("")}</div>
   ${pool.length>ideaIds.length?`<div class="row"><button type="button" class="btn ghost" data-act="reroll">Autres idées</button></div>`:""}`;
}

// Shared five-state model, compatible with Maisonnée (mealState + keep + lock).
const CM_MEAL_STATES=["Proposé","Gardé","En courses","Courses faites","Terminé"];
function cmMealStatus(s){
  if(!s)return "Proposé";
  if(CM_MEAL_STATES.includes(s.mealState))return s.mealState;
  return s.lock?"En courses":s.keep?"Gardé":"Proposé";
}
function cmSetMealStatus(s,state){
  if(!s||!CM_MEAL_STATES.includes(state))return;
  s.mealState=state;
  s.keep=state!=="Proposé";
  s.lock=["En courses","Courses faites","Terminé"].includes(state);
}
function cmStatusChips(k,s){
  const active=cmMealStatus(s);
  return `<div class="cm-state-box"><strong>État du repas</strong><div class="cm-state-options" role="group" aria-label="État du repas">${CM_MEAL_STATES.map((st,i)=>`<button type="button" class="cm-state-chip cm-state-${i}" data-state="${st}" disabled aria-pressed="${st===active}">${["◷","✓","🛒","✓","✓"][i]} ${st}</button>`).join("")}</div></div>`;
}
// state of a meal: proposed (not validated), validated (in the list), shopping done (validated and nothing left to buy for it)
function mealState(k,s,date){if(!s||!recipes[s.id])return null;if(s.mealState==="Courses faites"||s.mealState==="Terminé")return["p3",s.mealState==="Terminé"?"✓ terminé":"✓ courses faites"];if(!s.lock)return["p1","🛒 à ajouter aux courses"];
  const sel=selectedShopDates().some(x=>x.key===date);if(!sel)return["p2","✓ dans les courses"];
  const r=recipes[s.id],dd=parseYmd(date),when=`${k.split("|")[0]} ${dd.getDate()} ${k.split("|")[1]}`;
  const left=shopping().some(i=>i.from.some(f=>f.endsWith("("+when+")")));return left?["p2","✓ dans les courses"]:["p3","✓ courses faites"];}
function mealCard(d,i,m,lab){const k=slotKey(d,m),s=W()[k],r=s&&recipes[s.id],date=ymd(addDays(weekStartDate(),i)),past=isPast(k);
  const side=s?[s.entree&&recipes[s.entree]?"entrée : "+recipes[s.entree].name:"",s.dessert&&recipes[s.dessert]?"dessert : "+recipes[s.dessert].name:"",(s.extra||[]).length?"en plus : "+s.extra.join(", "):""].filter(Boolean):[];
  if(!r&&s&&(s.note||s.left))return`<button type="button" class="mc${past?" past":""}" data-act="wcell" data-k="${k}" data-slot="${k}"><span class="mc-ph mc-noph">${s.note?"✏️":"🥡"}</span><span class="mc-t"><span class="mc-m">${lab}</span><b>${s.note?esc(s.note):"Restes : "+esc(s.left)}</b><small>Sans recette · rien à acheter</small></span></button>`;
  if(!r&&!side.length)return past?`<button type="button" class="mc mc-empty dim" data-act="wcell" data-k="${k}" data-slot="${k}"><span class="mc-m">${lab}</span><span class="mc-t">✏️ Noter ce qu'on a mangé</span></button>`
    :`<button type="button" class="mc mc-empty${m==="midi"&&menu.prefs.skip.includes(d)?" dim":""}" data-act="pick" data-k="${k}" data-slot="${k}"><span class="mc-m">${lab}</span><span class="mc-t">${m==="midi"&&menu.prefs.skip.includes(d)?"Pas à la maison · choisir":"+ Choisir un plat"}</span></button>`;
  const ph=r?rPhotoSrc(s.id):"",st=past?null:mealState(k,s,date),nut=slotNut(s);
  return`<button type="button" class="mc${past?" past":""}${s&&s.lock?" locked":""}" data-act="wcell" data-k="${k}" data-slot="${k}">
    ${ph?`<img class="mc-ph" src="${esc(ph)}" alt=""${r&&!r.photo?` data-auto="${esc(s.id)}"`:""} loading="lazy">`:`<span class="mc-ph mc-noph">${lab==="Midi"?"☀️":"🌙"}</span>`}
    <span class="mc-t"><span class="mc-m">${lab}</span><b>${r?esc(r.name):"Plat à choisir"} ${s.n?`<span class="muted" style="font-size:.82em;font-weight:500;white-space:nowrap">· 👥 ${s.n} pers.</span>`:""}</b>${side.length?`<small>${esc(side.join(" · "))}</small>`:""}
      ${r&&!past?`<small class="mc-info">${[showOn("nut")&&nut?esc(fmtNut(nut,true)):"",showOn("wine")?esc(drinkLine(r)):""].filter(Boolean).join(" · ")}${menu.prefs.dissoc?" "+dissocBadge(mealDissoc(s)):""}</small>`:""}</span>
    ${st?`<span class="cm-card-state cm-state-${CM_MEAL_STATES.indexOf(cmMealStatus(s))}">${esc(cmMealStatus(s))}</span>`:""}</button>`;}
// the future meals of the shown week that are planned but not validated yet
function weekToValidate(){const ws=weekStartDate(),today=ymd(new Date()),out=[];
  DAYS.forEach((d,i)=>{if(ymd(addDays(ws,i))<today)return;MEALS.forEach(([m])=>{const k=slotKey(d,m),s=W()[k];if(s&&recipes[s.id]&&!s.lock&&!isPast(k))out.push({w:curWeek,k});});});return out;}
function renderWeekFrame(){const grid=LS.get("cm_wmode","list")==="grid";
  $("#wmodeSeg").innerHTML=[["list","☰ Liste"],["grid","▦ Tableau"]].map(([v,l])=>`<button type="button" class="chip" data-act="weekMode" data-v="${v}" aria-pressed="${(v==="grid")===grid}">${l}</button>`).join("");
  $("#menuList").hidden=grid;$("#weekGrid").hidden=!grid;$("#weekEditBtn").hidden=!grid;
  const t=weekToValidate();$("#weekValidate").innerHTML=t.length?`<button type="button" class="btn primary week-cta" data-act="weekValidate">🛒 Tout ajouter aux courses (${t.length} repas) → voir les ingrédients</button>`:"";
  $("#weekTitle").textContent="Semaine du "+shortDate(weekStartDate());}
function renderMenu(){
  const el=$("#menuList"), filled=filledSlots();renderWeekFrame();
  $("#clearBtn").hidden=!filled.length;
  const cnt={vege:0,poisson:0,soupe:0};
  for(const k of filled){const r=recipes[W()[k].id],kd=kindOf(r);if(kd in cnt)cnt[kd]++;if(r.cat==="Soupe")cnt.soupe++;}
  { const cur=ymd(mondayOf(new Date())), nxt=ymd(addDays(mondayOf(new Date()),7)), nn=ymd(addDays(mondayOf(new Date()),14)), w=curWeek;
    const opts=[[cur,"Cette semaine"],[nxt,"Prochaine"],[nn,"Dans 2 sem."]];
    $("#weekSel").innerHTML=opts.map(([v,l])=>`<button class="chip" data-act="week" data-w="${v}" aria-pressed="${v===w}">${l} · ${shortDate(parseYmd(v))}</button>`).join(""); }
  $("#weekSum").textContent=filled.length?`${filled.length} repas · ${cnt.vege} végé · ${cnt.poisson} poisson${cnt.soupe?` · ${cnt.soupe} soupe${cnt.soupe>1?"s":""}`:""}`:"";
  $("#proposeAsk").innerHTML=undoWeek&&undoWeek.week===curWeek?`<div class="note row" style="justify-content:space-between">Nouvelle semaine proposée${undoWeek.locked?" (repas verrouillés gardés)":""}.
    <button class="btn" data-act="proposeUndo">Revenir à l'ancienne</button></div>`:"";
  if(mode==="loading"){el.innerHTML="";return;}
  const t=todayInWeek(), ws=weekStartDate();
  const diff=filled.some(k=>!isPast(k)&&W()[k].n!==menu.people);
  el.innerHTML=`<div class="week">${DAYS.map((d,i)=>{const pastDay=ymd(addDays(ws,i))<ymd(new Date()),empty=MEALS.every(([m])=>{const s=W()[slotKey(d,m)];return!s||!slotUsed(s);});
    if(pastDay&&empty)return`<div class="day-past">${d} ${addDays(ws,i).getDate()} · aucun repas noté · <button type="button" class="btn ghost" style="padding:2px 10px;font-size:13px" data-act="wcell" data-k="${slotKey(d,"midi")}">✏️ midi</button> <button type="button" class="btn ghost" style="padding:2px 10px;font-size:13px" data-act="wcell" data-k="${slotKey(d,"soir")}">✏️ soir</button></div>`; // a past day with nothing: one short line
    return`<div class="day-card${i===t?" today":""}${ymd(addDays(ws,i))<ymd(new Date())?" past":""}"><div class="day-h">${d} <span class="muted" style="font-family:var(--f-body);font-size:13px">${shortDate(addDays(ws,i))}</span>${i===t?' <span class="tag">Aujourd\'hui</span>':""}${(menu.prefs.days||{})[d]?` <span class="muted" style="font-family:var(--f-body);font-size:12px">· ${esc((DAY_STYLES.find(x=>x[0]===menu.prefs.days[d])||["",""])[1])}</span>`:""}</div>${(()=>{const n=sumNut(MEALS.map(([m])=>slotNut(W()[slotKey(d,m)])));return n?`<div class="day-nut">Journée : ${esc(fmtNut(n))} / pers.</div>`:"";})()}
    ${MEALS.map(([m,lab])=>mealCard(d,i,m,lab)).join("")}</div>`;}).join("")}</div>`
    +(diff?`<div class="row" style="margin-top:10px"><button class="btn ghost" data-act="applyAll">Mettre tous les repas à ${menu.people} pers.</button></div>`:"");
}

// when a recipe arrived in my book: created, imported, copied, or new in a book I follow
function addedAt(id){const r=recipes[id];if(!r)return 0;const t=Date.parse(r.createdAt||"")||0,n=shNews[id]&&shNews[id].at||0;return Math.max(t,n);}
function renderRecipes(){
  const cats=["Toutes",...CATS.filter(c=>Object.values(recipes).some(r=>inCat(r,c)))];
  if(!cats.includes(filter.cat))filter.cat="Toutes";
  filter.cats=filter.cats||[];filter.kinds=filter.kinds||[];LS.set("cm_filter",filter);
  const nF=filter.cats.length+filter.kinds.length+(filter.quick?1:0)+(filter.light?1:0)+(filter.theme?1:0);
  $("#favQuick").setAttribute("aria-pressed",!!filter.fav);
  $("#filtBtn").textContent=`🎛️ Filtres (${nF}) ▾`;$("#filtBtn").classList.toggle("on",nF>0);
  if(!$("#filtSheet").hidden)renderFilt();
  {const KL={vege:"Végé",poisson:"Poisson",volaille:"Volaille",rouge:"Viande rouge",porc:"Porc"},parts=[...filter.cats,...filter.kinds.map(k=>KL[k]||k),filter.light?"Léger":"",filter.quick?"30 min et moins":"",filter.theme?THEME_LABEL[filter.theme]:""].filter(Boolean);
   $("#filtSum").innerHTML=parts.length?`Filtres : ${esc(parts.join(" · "))} · <button type="button" class="link" data-act="filtReset">effacer</button>`:"";}
  const list=Object.entries(recipes)
    .filter(([,r])=>!filter.cats.length||filter.cats.some(c=>inCat(r,c)))
    .filter(([,r])=>!filter.kinds.length||filter.kinds.includes(kindOf(r)))
    .filter(([,r])=>recMatch(r,filter.q,"",filter.quick,filter.light,filter.fav,filter.theme==="nouveau"?"":filter.theme))
    .sort(filter.theme==="nouveau"?(a,b)=>addedAt(b[0])-addedAt(a[0])||a[1].name.localeCompare(b[1].name,"fr"):(a,b)=>a[1].name.localeCompare(b[1].name,"fr"));
  const el=$("#recList");
  if(mode==="loading"){el.innerHTML='<div class="empty">Chargement des recettes…</div>';return;}
  if(!Object.keys(recipes).length){el.innerHTML='<div class="empty"><strong>Votre carnet est vide</strong>Touchez « Nouvelle recette » pour ajouter votre premier plat.</div>';return;}
  if(!list.length){const near=filter.q?closeNames(filter.q,Object.keys(recipes)):[],q=filter.q.trim(),e=encodeURIComponent(q);
    const web=q?`<div class="web-find"><span class="label">🌐 Rechercher « ${esc(q)} » sur Internet</span><div class="row"><a class="btn primary" target="_blank" rel="noopener" href="https://www.marmiton.org/recettes/recherche.aspx?aqt=${e}">Marmiton ↗</a><a class="btn" target="_blank" rel="noopener" href="https://www.750g.com/recherche?q=${e}">750g ↗</a><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=${e}+recette">Google ↗</a></div><span class="muted" style="font-size:12px">Une recette vous plaît ? Copiez son lien et collez-le dans « Importer du web ».</span></div>`:"";
    el.innerHTML=(near.length?`<div class="empty">Pas de « ${esc(filter.q)} »… vouliez-vous dire :<div class="row" style="justify-content:center;margin-top:10px">${near.map(id=>`<button class="btn" data-act="recSearch" data-q="${esc(recipes[id].name)}">${esc(recipes[id].name)}</button>`).join("")}</div></div>`
      :`<div class="empty">Aucune recette ne correspond${q?` à « ${esc(q)} »`:" à cette recherche"}.</div>`)+web;return;}
  const shown=list.slice(0,Math.max(recLimit,list.findIndex(([id])=>id===openId)+1));
  el.innerHTML=shown.map(([id,r])=>{
    const sl=slotsOf(id), on=sl.length>0, open=openId===id, p=viewServ[id]||(on?W()[sl[0]].n:menu.people), f=p/(r.serves||4);
    let det="";
    if(open){
      const ings=(r.ing||[]).map(i=>{const[b,u]=recipeIngredientBase(r,i,p,"main");return`<li class="q">${esc(fmt(b,u))}</li><li>${esc(i.n)}</li>`;}).join("");
      const steps=stepsFor(id).steps;
      const catRow=r.shared?"":`<div class="dchips">${CATS.map(c=>{const on=inCat(r,c);return`<span class="dchip${on?" on":""}"><button type="button" data-act="recCat" data-id="${esc(id)}" data-c="${c}" aria-pressed="${on}">${on?"✓ ":""}${c}</button></span>`;}).join("")}</div>`;
      const role=r.cat==="Entrée"?"entree":r.cat==="Dessert"?"dessert":undefined,dk=r.linkOnly?null:drinkFor(r,role);
      const drinkRow=dk&&showOn("wine")?`<div class="drink">🍷 Vin : ${esc(dk[0])} ${vivinoLink(pairingQuery(dk[0]),"Vivino")}<br>🥤 Sans alcool : ${esc(dk[1])}</div>`:"";
      det=`<div class="detail">${rPhotoSrc(id)?recPhotoBlock(id,true):""}${catRow}<div class="row">${photoBtn(r)}${rPhotoSrc(id)?"":recPhotoBlock(id)}<button type="button" class="btn" data-act="editRec" data-id="${esc(id)}">✏️ ${r.shared?"Personnaliser":"Modifier"}</button></div>${drinkRow}<div class="serv-row"><span class="label">Ingrédients pour</span>
          <div class="ctl"><button class="step sm" data-act="vserv" data-id="${esc(id)}" data-d="-1" ${p<=1?"disabled":""} aria-label="Une personne de moins">−</button><span class="n">${p} pers.</span><button class="step sm" data-act="vserv" data-id="${esc(id)}" data-d="1" aria-label="Une personne de plus">+</button></div>
          ${platsLine(r,p,id)}<span class="muted" style="font-size:12px">recette prévue pour ${r.serves||4}${dishOf(r)?` (1 ${dishOf(r).one})`:""}</span></div>
        <div class="row">${shopBtn(id,p)}</div>
        ${on?`<div class="muted" style="font-size:12px">Au menu : ${sl.map(k=>slotLabel(k)+" ("+W()[k].n+" p.)").join(", ")}${sl.some(k=>W()[k].n!==p)?` · <button class="link" data-act="vservApply" data-id="${esc(id)}">Mettre ${p} pers. au menu</button>`:""}</div>`:""}
        <ul class="ings">${ings}</ul>
        ${steps.length?`<span class="label">Étapes</span><ol class="steps">${steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`:""}
        <div class="row">${confirmDel===id
          ?`<span>Supprimer cette recette ?</span><button class="btn danger" data-act="delYes" data-id="${esc(id)}">Supprimer</button><button class="btn ghost" data-act="delNo">Annuler</button>`
          :`${r.source?`<a class="link" href="${esc(r.source)}" target="_blank" rel="noopener">Voir la recette d'origine</a>`:""}${r.shared?`<span class="muted" style="font-size:12px">Recette de ${esc(r.sharedBy||"un proche")} · lecture seule</span>`:`<button class="x" data-act="del" data-id="${esc(id)}">Supprimer la recette</button>`}`}</div></div>`;
    }
    return`<article class="card${on?" on":""}"><div class="card-h">
      <button class="open${rPhotoSrc(id)?" has-ph":""}" data-act="open" data-id="${esc(id)}" aria-expanded="${open}" id="card-${esc(id)}">${rPhotoSrc(id)?`<img class="rp-th" src="${esc(rPhotoSrc(id))}" alt=""${!r.photo?(rPhotoSrc(id)===r.image?` data-site="${esc(id)}"`:` data-auto="${esc(id)}"`):""}>`:""}<h3>${r.fav?`<span title="Recette favorite" style="color:#e6a900;text-shadow:0 0 6px #ffc43c">★ </span>`:""}${esc(r.name)}</h3>
      <div class="meta">${shNews[id]?`<span class="tag news">${shNews[id].k==="new"?"🆕 Nouveau":"✎ Modifiée"}</span> `:""}${r.shared?`<span class="tag" style="color:#712B13">de ${esc(r.sharedBy||"")} · </span>`:""}<span class="tag">${esc(catsOf(r).join(" · "))}</span>${filter.theme==="nouveau"&&addedAt(id)?`<span style="color:var(--accent);font-weight:600">🆕 ajoutée ${esc(ago(addedAt(id)))} · </span>`:""}${r.time?esc(r.time)+" min · ":""}${esc(fmtNut(nutri(r),true))}${(()=>{const ts=THEMES.map(x=>x[0]).filter(t=>t!=="nouveau"&&t!=="partage"&&t!=="detail"&&t!=="airfryer"&&hasTheme(r,t)&&!(t==="legumes"&&hasTheme(r,"dessert-legumes")));return ts.length?`<span class="themes">${ts.map(t=>esc(THEME_LABEL[t])).join(" · ")}</span>`:"";})()}</div></button>
      <div class="card-btns"><button class="star${r.fav?" on":""}" data-act="fav" data-id="${esc(id)}" aria-pressed="${!!r.fav}" aria-label="${r.fav?"Retirer des favoris":"Ajouter aux favoris"}">${r.fav?"★":"☆"}</button>
      <button class="add${on?" on":""}" data-act="toggle" data-id="${esc(id)}">${on?"✓ Au menu":"+ Menu"}</button></div>
    </div>${det}</article>`;}).join("")+(list.length>shown.length?`<button class="btn" data-act="more" style="align-self:center">Afficher ${Math.min(50,list.length-shown.length)} de plus (${list.length-shown.length} restantes)</button>`:"");
}

/* before validating: a page with the planned ingredients; tick what to buy, the rest counts as "j'ai déjà" */
let lockPend=[], lockItems=[], lockMeals="", lockEdit=false;
function lockPreview(targets,edit,keep){ // targets: [{w,k}]; edit = a meal already validated; keep = recompute after a change of servings
  const sl=t=>((menu.weeks||{})[t.w]||{})[t.k];targets=targets.filter(t=>sl(t)&&recipes[sl(t).id]&&(edit?sl(t).lock:!sl(t).lock));if(!targets.length)return;
  lockEdit=!!edit;
  if(!keep)lockOrigN=targets.map(t=>({t,n:sl(t).n}));
  const dayOf=t=>ymd(addDays(parseYmd(t.w),DAYS.indexOf(t.k.split("|")[0]))),avail=shopDates().map(x=>x.key);
  const savedDays=menu.shopDays,need=[...new Set(targets.map(dayOf))].filter(d=>avail.includes(d));
  lockDays=need;menu.shopDays=[...new Set([...selectedShopDates().map(x=>x.key),...need])].sort();
  const prev=keep?Object.fromEntries(lockItems.map(i=>[i.key,{buy:i.buy,have:i.d-i.bq}])):{};
  if(edit)targets.forEach(t=>delete sl(t).lock);
  // planned = what the recipes need; listed = what is in the list now (after "j'en ai déjà" or erasing)
  const q=()=>Object.fromEntries(shopping(true).map(i=>[i.key,i.q]));const bt=menu.bought;
  const before=q();menu.bought={};const rawBefore=q();menu.bought=bt;
  targets.forEach(t=>sl(t).lock=true);const afterL=shopping(true);menu.bought={};const rawAfter=shopping(true);menu.bought=bt;
  if(!edit)targets.forEach(t=>delete sl(t).lock);
  const listedNow=Object.fromEntries(afterL.map(i=>[i.key,i.q]));
  lockItems=rawAfter.map(i=>{const d=i.q-(rawBefore[i.key]||0),cur=Math.max(0,(listedNow[i.key]||0)-(before[i.key]||0)),home=isHave(i),p=prev[i.key];
    const erased=!home&&cur<d-1e-6;
    return Object.assign({},i,{d,cur,erased,was:before[i.key]||0,home,buy:p?p.buy:(!home&&cur>1e-6),bq:p?Math.max(0,d-p.have):(cur>1e-6?cur:d)});}).filter(i=>i.d>0.0001);
  menu.shopDays=savedDays;
  lockPend=targets;
  lockMeals=targets.map((t,ix)=>{const s=sl(t),r=recipes[s.id],dn=t.k.split("|")[0],date=addDays(parseYmd(t.w),DAYS.indexOf(dn));
    const parts=[r.name,s.entree&&recipes[s.entree]?"entrée "+recipes[s.entree].name:"",s.dessert&&recipes[s.dessert]?"dessert "+recipes[s.dessert].name:""].filter(Boolean).join(" + ");
    return`<div class="lk-meal"><div style="flex:1;min-width:0"><b>${esc(dn)} ${date.getDate()} · ${t.k.endsWith("midi")?"midi":"soir"}</b><span>${esc(parts)}</span><small class="muted">recette prévue pour ${r.serves||4}${r.cat==="Entrée"&&canMain(r)?` · servie en plat ×${String(portionFactor(r,"main")).replace(".",",")}`:""}</small></div>
      <div class="ctl"><button type="button" class="step sm" data-act="lockN" data-i="${ix}" data-d="-1" ${s.n<=1?"disabled":""} aria-label="Une personne de moins">−</button><span class="n">${s.n} pers.</span><button type="button" class="step sm" data-act="lockN" data-i="${ix}" data-d="1" aria-label="Une personne de plus">+</button></div></div>`;}).join("");
  $("#lockTitle").textContent=edit?"Dans les courses":targets.length>1?`Ajouter ${targets.length} repas aux courses`:"Ajouter ce repas aux courses";
  renderLock();if(!keep){$("#lockSheet").hidden=false;$("#lockSheet .sheet-in").scrollTop=0;}
}
let lockOrigN=[],lockDays=[];
// step of the − / + buttons, by unit
function qStep(u,q){if(u==="g")return q>=1000?100:q>=200?50:10;if(u==="ml")return q>=500?100:50;if(u==="c. à s."||u==="c. à c.")return .5;return 1;}
function renderLock(){
  const groups=RAYONS.map(ry=>({ry,its:lockItems.filter(i=>(RAYONS.includes(i.r)?i.r:"Divers")===ry).sort((a,b)=>a.n.localeCompare(b.n,"fr"))})).filter(g=>g.its.length);
  const nb=lockItems.filter(i=>i.buy).length;
  $("#lockBody").innerHTML=`<div class="lk-meals">${lockMeals}</div>
    <div class="row" style="justify-content:space-between;align-items:baseline"><span class="label">Ingrédients prévus · cochez ce qu'il faut acheter</span></div>
    <div class="row" style="gap:14px;margin-top:-4px"><button type="button" class="link" data-act="lockAll" data-v="1">Tout cocher</button><button type="button" class="link" data-act="lockAll" data-v="0">Tout décocher</button></div>
    ${lockItems.length?"":`<p class="muted" style="margin:0">Ces recettes n'ont pas d'ingrédients notés.</p>`}
    ${(()=>{const cur=shopping(),ex=menu.extras||[];if(!cur.length&&!ex.length)return"";
      const gs=RAYONS.map(ry=>({ry,its:cur.filter(i=>(RAYONS.includes(i.r)?i.r:"Divers")===ry).sort((a,b)=>a.n.localeCompare(b.n,"fr"))})).filter(g=>g.its.length);
      return`<details class="lk-cur"><summary>Voir la liste de courses actuelle (${cur.length+ex.length} article${cur.length+ex.length>1?"s":""})</summary>
        ${gs.map(g=>`<h4>${esc(g.ry)}</h4>${g.its.map(i=>`<div class="lk-cl"><span>${esc(i.n)}</span><b>${esc(fmt(i.q,i.u))}</b></div>`).join("")}`).join("")}
        ${ex.length?`<h4>En plus</h4>${ex.map(x=>`<div class="lk-cl"><span>${esc(x.t)}</span></div>`).join("")}`:""}</details>`;})()}
    ${lockEdit?`<button type="button" class="btn danger" data-act="lockUndo" style="align-self:flex-start;order:99">Retirer ce repas des courses</button>`:""}
    ${groups.map(g=>`<div class="lk-ry"><h4>${esc(g.ry)}</h4>${g.its.map(i=>`<div class="lk-it${i.buy?" on":""}"><button type="button" class="lk-t" data-act="lockTog" data-k="${esc(i.key)}" aria-pressed="${i.buy}"><span class="lk-box" aria-hidden="true">${i.buy?"✓":""}</span><span class="lk-n">${esc(i.n)}<small>${!i.buy&&i.erased?"effacé de la liste · touchez pour le remettre":i.buy?[i.was?`déjà ${esc(fmt(i.was,i.u))} dans la liste`:"",Math.abs(i.bq-i.d)>1e-6?`prévu ${esc(fmt(i.d,i.u))} · j'en ai déjà ${esc(fmt(Math.max(0,i.d-i.bq),i.u))||"un peu"}`:""].filter(Boolean).join(" · "):"j'ai déjà · pas acheté"}</small></span></button>
      ${i.buy?`<span class="lk-q"><button type="button" class="step sm" data-act="lockQ" data-k="${esc(i.key)}" data-d="-1" aria-label="Moins de ${esc(i.n)}">−</button><b>${i.was?"+":""}${esc(fmt(i.bq,i.u))||"?"}</b><button type="button" class="step sm" data-act="lockQ" data-k="${esc(i.key)}" data-d="1" aria-label="Plus de ${esc(i.n)}">+</button></span>`:`<b class="muted">${esc(fmt(i.d,i.u))}</b>`}</div>`).join("")}</div>`).join("")}`;
  $("#lockYesBtn").textContent=lockEdit?`✓ Enregistrer · ${nb} en liste de courses`:nb?`🛒 Ajouter · ${nb} en liste de courses`:"✓ Ajouter (rien à acheter)";
}
function lockConfirm(){if(lockDays.length){menu.shopDays=[...new Set([...selectedShopDates().map(x=>x.key),...lockDays])].sort();lockDays=[];}
  const n0=shopping().length,until=haveUntil(),today=ymd(new Date());let n=0;
  for(const t of lockPend){const s=((menu.weeks||{})[t.w]||{})[t.k];if(s&&!s.lock){cmSetMealStatus(s,"En courses");n++;}}
  menu.have=Object.assign({},menu.have);menu.bought=Object.assign({},menu.bought);
  for(const i of lockItems){
    if(i.home){if(i.buy)delete menu.have[i.key];else continue;}
    if(!i.buy&&!i.was&&i.cur>1e-6){menu.have[i.key]=until;continue;} // nothing else of it on the list: "j'ai déjà"
    const delta=(i.buy?i.bq:0)-(i.home?i.d:i.cur); // what the list must gain (or lose) for this meal
    if(Math.abs(delta)>1e-6){const b=menu.bought[i.key],q0=b&&b.until>=today?b.q:0,q1=q0-delta;
      if(Math.abs(q1)<1e-6)delete menu.bought[i.key];else menu.bought[i.key]={q:q1,until:b&&b.until>until?b.until:until};}
  }
  const ed=lockEdit;lockPend=[];lockItems=[];lockEdit=false;lockOrigN=[];$("#lockSheet").hidden=true;render();saveMenu();
  const n1=shopping().length;toast(ed?`Liste à jour : ${n1} article${n1>1?"s":""}`:`${n} repas ajouté${n>1?"s":""} aux courses · liste à jour : ${n1} article${n1>1?"s":""}${n1>n0?` (+${n1-n0})`:""}`);}
// what is planned on the chosen shopping days, with the lock of each meal (only locked meals go into the list)
function shopPlanHtml(sel){
  if(!sel.length)return"";
  const nm=id=>recipes[id]?recipes[id].name:"";let unl=0;
  const days=sel.map(x=>{const w=ymd(mondayOf(x.d));
    const lines=MEALS.map(([m,lab])=>{const k=slotKey(x.dn,m),s=x.wk[k];if(!s||!recipes[s.id])return"";if(!s.lock)unl++;
      const sub=[s.entree&&recipes[s.entree]?"Entrée : "+nm(s.entree):"",s.dessert&&recipes[s.dessert]?"Dessert : "+nm(s.dessert):""].filter(Boolean).join(" · ");
      return`<div class="sp-meal${s.lock?" ok":""}"><span class="sp-m">${lab}</span><button type="button" class="sp-n" data-act="viewRec" data-id="${esc(s.id)}">${esc(nm(s.id))}${sub?`<small>${esc(sub)}</small>`:""}<small>${s.n} pers.</small></button>
        <button type="button" class="sp-swap" data-act="shopSwap" data-w="${w}" data-k="${k}" aria-label="Changer de plat">↻</button>
        <button type="button" class="sp-lock${s.lock?" on":""}" data-act="shopLock" data-w="${w}" data-k="${k}" aria-pressed="${!!s.lock}">${["Courses faites","Terminé"].includes(cmMealStatus(s))?cmMealStatus(s):s.lock?"✓ Dans les courses":"🛒 Ajouter"}</button></div>`;}).join("");
    return`<div class="sp-day"><b>${esc(x.dn)} ${x.d.getDate()}</b>${lines}</div>`;}).join("");
  return`<details class="sp" open><summary><span class="label" style="display:inline">Au menu ces jours-là</span> <span class="muted" style="font-size:12px">${unl?`· ${unl} repas pas encore dans les courses`:"· tout est dans les courses ✓"}</span></summary>${days}
    ${unl?`<button type="button" class="btn primary" data-act="shopLockAll" style="align-self:flex-start">🛒 Tout ajouter aux courses (${unl} repas)</button><span class="muted" style="font-size:12px">Les repas avec ✓ sont dans la liste de courses. Touchez un jour ci-dessus pour ajouter ou retirer tous ses repas.</span>`:""}</details>`;
}
