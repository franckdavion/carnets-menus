const RAYONS=["Fruits & légumes","Boucherie & poisson","Crémerie","Épicerie","Boulangerie","Surgelés","Divers"];
const UNITS=["g","kg","ml","cl","l","pièce","c. à s.","c. à c.","botte","tranche","boîte","sachet","pincée"];
const CATS=["Plat","Végé","Rapide","Soupe","Entrée","Dessert"];
const NOT_MAIN=["Dessert","Entrée"]; // never proposed automatically as a meal
const MAIN_CATS=["Plat","Végé","Rapide","Soupe"];
// a recipe can sit in several categories: the first one is its main category
function catsOf(r){return r?[...new Set([r.cat,...(r.cats||[]),...(r.alsoMain?["Plat"]:[]),...(r.alsoEntree?["Entrée"]:[])].filter(Boolean))]:[];}
// photos of the dish: an image search on its name, works for every recipe, even future ones
const photoUrl=r=>"https://www.google.com/search?tbm=isch&q="+encodeURIComponent(r.name+" recette");
const photoBtn=r=>`<a class="btn photo-btn" href="${esc(photoUrl(r))}" target="_blank" rel="noopener">📷 Voir à quoi ça ressemble</a>`;
const inCat=(r,c)=>catsOf(r).includes(c);
const inCats=(r,cs)=>catsOf(r).some(c=>cs.includes(c));
const canMain=r=>inCats(r,MAIN_CATS);
const DAYS=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const MEALS=[["midi","Midi"],["soir","Soir"]];
// Quantités personnalisées : référence fixe au moment de la saisie.
// Ne jamais inférer la référence d'une ancienne recette depuis son nombre actuel.
const slotKey=(d,m)=>d+"|"+m;
const SLOT_ORDER=DAYS.flatMap(d=>MEALS.map(([m])=>slotKey(d,m)));
const slotLabel=k=>k.replace("|"," ");
function mondayOf(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function parseYmd(t){const[a,b,c]=String(t).split("-").map(Number);return new Date(a,b-1,c);}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
let curWeek=(()=>{const now=ymd(mondayOf(new Date()));let w=null;try{w=JSON.parse(localStorage.getItem("cm_week")||"null");}catch(e){}return w&&w>=now?w:now;})();
function W(){if(!menu.weeks)menu.weeks={};if(!menu.weeks[curWeek])menu.weeks[curWeek]={};return menu.weeks[curWeek];}
function weekIds(wk){const sl=(menu.weeks||{})[wk]||{};return Object.values(sl).map(x=>x&&x.id).filter(Boolean);}
function weekStartDate(){return parseYmd(curWeek);}
function todayInWeek(){const t=ymd(new Date()),w=weekStartDate();for(let i=0;i<7;i++)if(ymd(addDays(w,i))===t)return i;return -1;}
const shortDate=d=>d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
function isPast(k){const i=DAYS.indexOf(k.split("|")[0]);return ymd(addDays(weekStartDate(),i))<ymd(new Date());}
function slotsOf(id){return SLOT_ORDER.filter(k=>W()[k]&&W()[k].id===id);}
function onMenu(id){return slotsOf(id).length>0;}
function filledSlots(){return SLOT_ORDER.filter(k=>W()[k]&&recipes[W()[k].id]);}
function nextEmptySlot(){
  const ti=todayInWeek(), start=ti<0?0:ti*2+(new Date().getHours()>=14?1:0);
  for(let i=0;i<14;i++){const k=SLOT_ORDER[(start+i)%14];if(!W()[k])return k;}
  return null;
}
function normMenu(m){
  m=Object.assign({people:4,weeks:{},checked:{},extras:[],shopExtra:{}},m||{});
  m.prefs=Object.assign({veg:3,fish:2,skip:[],avoid:"",lightEve:false},m.prefs||{});
  m.weeks=Object.assign({},m.weeks);
  if(m.slots){ // older versions kept a single week
    const wk=m.weekStart||ymd(mondayOf(new Date()));
    if(Object.keys(m.slots).length&&!m.weeks[wk])m.weeks[wk]=m.slots;
  }
  if(!m.slots)m.slots={};
  if(m.items&&Object.keys(m.items).length&&!Object.keys(m.slots).length&&!Object.keys(m.weeks).length){ // oldest: one list + optional day
    for(const[id,n]of Object.entries(m.items)){
      let k=m.days&&m.days[id]?slotKey(m.days[id],"soir"):null;
      if(!k||m.slots[k])k=SLOT_ORDER.find(x=>!m.slots[x]);
      if(k)m.slots[k]={id,n:Number(n)||m.people};
    }
  }
  if(m.items&&Object.keys(m.slots).length&&!Object.keys(m.weeks).length)m.weeks[ymd(mondayOf(new Date()))]=m.slots;
  delete m.items;delete m.days;delete m.slots;delete m.weekStart;delete m.history;
  const oldest=ymd(addDays(mondayOf(new Date()),-371)); // one year of history
  for(const k of Object.keys(m.weeks))if(k<oldest||!m.weeks[k]||!Object.keys(m.weeks[k]).length)delete m.weeks[k];
  return m;
}
const GUESS=[[/(?:^|[^a-zà-ÿœ])(?:poulet|bœuf|boeuf|porc|veau|agneau|lardon|jambon|saumon|thon|cabillaud|poisson|crevette|saucisse|steak|dinde|canard)/i,"Boucherie & poisson"],
 [/(?:^|[^a-zà-ÿœ])(?:lait|crème|creme|beurre|fromage|gruyère|gruyere|emmental|parmesan|mozza|cheddar|yaourt|œuf|oeuf|pâte brisée|pâte feuilletée|feta|chèvre)/i,"Crémerie"],
 [/(?:^|[^a-zà-ÿœ])(?:pain|baguette|brioche|tortilla)/i,"Boulangerie"],[/(?:^|[^a-zà-ÿœ])(?:surgel|glace|petits pois surg)/i,"Surgelés"],
 [/(?:^|[^a-zà-ÿœ])(?:oignon|ail|tomate|carotte|courgette|poivron|pomme|salade|citron|champignon|épinard|epinard|brocoli|potiron|courge|avocat|poireau|herbe|persil|ciboulette|basilic|banane|fruit|légume|legume|aubergine|patate|navet|chou|potimarron|butternut|citrouille|endive|fenouil|radis|betterave|échalote|gingembre|haricots verts|petits pois frais|concombre|melon|fraise|framboise|orange|clémentine|mangue|kiwi|raisin|coriandre|menthe|thym|romarin|laurier|cébette|ciboule)/i,"Fruits & légumes"]];

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s||"").trim().toLowerCase();
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

let recipes={};
let menu={people:4,weeks:{},checked:{},extras:[]};
let mode="loading", db=null, menuRef=null;
// page shown when the app opens: chosen in Réglages, or the last one used
const START_VIEWS=[["last","Dernière utilisée"],["menu","Aujourd'hui"],["week","Semaine"],["rec","Recettes"],["shop","Courses"],["wine","Vins"]];
let view=(()=>{const s=LS.get("cm_start","last");return s!=="last"&&START_VIEWS.some(x=>x[0]===s)?s:LS.get("cm_view","menu");})();
function renderStart(){const el=$("#startChips");if(!el)return;const s=LS.get("cm_start","last");
  el.innerHTML=START_VIEWS.map(([v,l])=>`<button type="button" class="chip" data-act="startView" data-v="${v}" aria-pressed="${s===v}">${l}</button>`).join("");}
// the chosen filters stay until you change them (kept on the phone, even if the app reloads)
let filter=Object.assign({q:"",cat:"Toutes",kind:"",quick:false,light:false,fav:false,theme:"",cats:[],kinds:[]},LS.get("cm_filter",{}));
let openId=null, confirmDel=null, ideaId=null, ideaIds=[], ideaSeen=[];
const IDEAS_N=5;
let ideaMode="sugg", favShown=10;

/* ---------- quantities ---------- */
/* days covered by the shopping list: upcoming days that have meals, chosen by the user */
const SHOP_SPAN=21;
function shopDates(){
  const t=new Date(),t0=new Date(t.getFullYear(),t.getMonth(),t.getDate()),out=[];
  for(let i=0;i<SHOP_SPAN;i++){const d=addDays(t0,i),wk=(menu.weeks||{})[ymd(mondayOf(d))];if(!wk)continue;
    const dn=DAYS[(d.getDay()+6)%7],sl=MEALS.map(([m])=>wk[slotKey(dn,m)]).filter(s=>s&&recipes[s.id]);
    if(sl.length)out.push({d,key:ymd(d),dn,wk,n:sl.length,locked:sl.filter(s=>s.lock).length});}
  return out;
}
function defaultShopKeys(all){const end=ymd(addDays(mondayOf(new Date()),6));return all.filter(x=>x.key<=end).map(x=>x.key);}
// V9: an explicitly sent meal must be included in the calculation window.
// The visual day filter (shopViewDays) remains independent.
function cmEnsureShoppingDay(k){
  const day=k&&k.split("|")[0], i=DAYS.indexOf(day);
  if(i<0)return;
  const d=addDays(new Date(curWeek+"T12:00:00"),i), key=ymd(d);
  if(!shopDates().some(x=>x.key===key))return;
  const keys=Array.isArray(menu.shopDays)?menu.shopDays.slice():defaultShopKeys(shopDates());
  if(!keys.includes(key))menu.shopDays=[...keys,key].sort();
}
function selectedShopDates(){
  const all=shopDates(), keys=Array.isArray(menu.shopDays)?menu.shopDays:defaultShopKeys(all);
  return all.filter(x=>keys.includes(x.key));
}
// V9.1 : les jours affichés sont indépendants des jours servant au calcul des courses.
function visibleShopDates(){
  const all=shopDates(), keys=Array.isArray(menu.shopViewDays)?menu.shopViewDays:defaultShopKeys(all);
  return all.filter(x=>keys.includes(x.key));
}
function setVisibleShopDays(keys){
  menu.shopViewDays=[...new Set(keys)];
  render();saveMenu();
}

const dayShort=x=>x.dn.slice(0,3)+". "+x.d.getDate();
/* "j'en ai déjà": hidden from the list until the last chosen shopping day has passed */
function isHave(i){const v=(menu.have||{})[i.key];return !!v&&v>=ymd(new Date());}
function haveUntil(){const s=selectedShopDates();return s.length?s[s.length-1].key:ymd(new Date());}
// Portion choisie pour un repas : aucune multiplication automatique liée à la catégorie.
function platsLine(r,p,id){const d=dishOf(r);if(!d)return"";const k=platsFor(r,p);
  return`<span class="plats"><span>— ${k} ${k>1?d.many:d.one}</span><span class="ctl"><button class="step sm" data-act="vplat" data-id="${esc(id)}" data-d="-1" ${k<=1?"disabled":""} aria-label="Un plat de moins">−</button><button class="step sm" data-act="vplat" data-id="${esc(id)}" data-d="1" aria-label="Un plat de plus">+</button></span></span>`;}
/* ---------- a meal changed after its shopping was done: postpone it, keep its ingredients to use first, or cook something with them ---------- */
let bumpCtx=null;
function mealBought(w,k){const s=((menu.weeks||{})[w]||{})[k];if(!s||!recipes[s.id]||!s.lock)return false;const dt=ymd(addDays(parseYmd(w),DAYS.indexOf(k.split("|")[0])));
  const st=mealState(k,s,dt);return!!st&&st[0]==="p3";}
function bumpDo(c,v){const s=menu.weeks[c.w][c.k],r=recipes[s.id];
  if(v==="later"){const nw=ymd(addDays(parseYmd(c.w),7));menu.weeks[nw]=menu.weeks[nw]||{};const wk=menu.weeks[nw];
    const order=[c.k,...SLOT_ORDER.filter(x=>x!==c.k)],dest=order.find(x=>!wk[x]||!recipes[wk[x].id]);
    if(dest){wk[dest]={id:s.id,n:s.n};toast(`« ${r.name} » reporté à ${slotLabel(dest)} (semaine prochaine)`);}else toast("La semaine prochaine est complète : plat non reporté");}
  if(v==="first"){menu.useFirst=[...(menu.useFirst||[]),{id:"u"+Date.now().toString(36),name:r.name,ing:(r.ing||[]).filter(i=>!/sel|poivre|huile|eau\b/i.test(i.n)).map(i=>i.n).slice(0,12),at:ymd(new Date())}];toast("Ingrédients notés sur Aujourd'hui : à consommer vite ou à congeler");}
  if(v==="fridge"){$("#frIn").value=(r.ing||[]).filter(i=>!PANTRY.test(i.n)).map(i=>i.n).slice(0,6).join(", ");view="rec";render();$("#frRecBox").open=true;runFridge();setTimeout(()=>$("#frRecBox").scrollIntoView({behavior:"smooth",block:"start"}),100);saveMenu();return;}
  saveMenu();const btn=document.createElement("button");btn.dataset.act="shopSwap";btn.dataset.w=c.w;btn.dataset.k=c.k;btn.dataset.go="1";btn.hidden=true;document.body.appendChild(btn);btn.click();btn.remove();}
function useFirstHtml(){const l=menu.useFirst||[];if(!l.length)return"";
  return`<div class="use-first"><span class="label">🧊 À consommer en priorité (ou à congeler)</span>${l.map(x=>`<div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:8px"><span style="font-size:14px"><b>${esc(x.ing.join(", "))}</b><br><small class="muted">achetés pour ${esc(x.name)}</small></span><button type="button" class="btn ghost" data-act="useFirstDone" data-id="${x.id}">✓ Fait</button></div>`).join("")}</div>`;}
function shopping(all){
  const acc={};
  const add=(rid,n,when,role,skip,freshKey)=>{
    const r=recipes[rid]; if(!r)return;
    const f=n/(r.serves||4);
    for(const i of r.ing||[]){
      if(!i.n)continue;
      const[q,u]=recipeIngredientBase(r,i,n,role);
      const baseKey=norm(i.n)+"|"+u;
      const key=freshKey?baseKey+"|nouvelle-preparation:"+freshKey:baseKey;
      if(skip&&skip.includes(baseKey))continue; // left out of this meal's shopping (chosen in Maisonnée › Repas)
      if(!acc[key])acc[key]={key,n:i.n.trim(),u,q:0,r:i.r||"Divers",from:[]};
      acc[key].q+=q;
      const lab=r.name+(when?" ("+when+")":"");
      if(!acc[key].from.includes(lab))acc[key].from.push(lab);
    }
  };
  // Only locked meals go to the shopping list: unlocking a meal takes its ingredients off.
  // Only the days chosen at the top of the shopping list count.
  for(const x of selectedShopDates())for(const[m]of MEALS){
    const sl=x.wk[slotKey(x.dn,m)]; if(!sl||!sl.lock||!recipes[sl.id]||sl.mealState==="Courses faites"||sl.mealState==="Terminé")continue;
    const when=x.dn+" "+x.d.getDate()+" "+m;
    const sk=Array.isArray(sl.noIng)?sl.noIng:null;
    if(Array.isArray(sl.ingCustom)){
      for(const i of sl.ingCustom){if(!i.n||sk&&sk.includes(i.key))continue;
        const match=String(mealCustomQuantity(i.qt,sl)).trim().match(/^([\d.,\/ ]+)\s*(.*)$/);
        const raw=match?match[1].trim():"",unit=match?match[2].trim():"";
        const [q,u]=toBase(raw,unit),key=norm(i.n)+"|"+u+(sl.freshShopKey?"|nouvelle-preparation:"+sl.freshShopKey:"");
        if(!acc[key])acc[key]={key,n:i.n.trim(),u,q:0,r:"Divers",from:[]};
        acc[key].q+=q;
        const lab=recipes[sl.id].name+" ("+when+")";
        if(!acc[key].from.includes(lab))acc[key].from.push(lab);
      }
    }else{
      add(sl.id,sl.n,when,"main",sk,sl.freshShopKey); if(sl.entree)add(sl.entree,sl.n,when,"entree",sk,sl.freshShopKey); if(sl.dessert)add(sl.dessert,sl.n,when,"dessert",sk,sl.freshShopKey);
    }
  }
  for(const[rid,n]of Object.entries(menu.shopExtra||{}))if(!validatedUses(rid).length)add(rid,n,"hors menu");
  // V4 : une coche correspond à une quantité achetée, jamais à une quantité future.
  // Le recalcul est centralisé : il fonctionne également après une synchronisation
  // depuis un autre appareil ou une modification de recette.
  const nowDay=ymd(new Date());
  const settled=settleCheckedGrowth(menu,Object.values(acc),nowDay,haveUntil());
  menu.checked=settled.checked;menu.checkedQty=settled.checkedQty;menu.bought=settled.bought;
  const changed=settled.changed;
  if(changed){
    // Ne pas réentrer dans render() depuis shopping().
    try{localStorage.setItem("cm_menu",JSON.stringify(menu));}catch(e){}
    if(typeof scheduleSync==="function")scheduleSync();
    if(typeof cloudSoon==="function")cloudSoon();
  }
  const today=ymd(new Date()), bt=menu.bought||{};
  const list=Object.values(acc).map(i=>{const b=bt[i.key];if(b&&b.until>=today)i.q=Math.max(0,i.q-b.q);return i;})
    .filter(i=>!(bt[i.key]&&bt[i.key].until>=today&&i.q<=0.0001));
  return all?list:list.filter(i=>!isHave(i));
}

/* V9.5 — diagnostic non destructif des doublons possibles.
   Ne fusionne jamais des articles, ne modifie ni quantités ni achats. */
function shoppingDuplicateWarnings(){
  const items=shopping(true), groups=new Map();
  const similar=n=>norm(n).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[’']/g,"'").replace(/\s+/g," ").replace(/s\b/g,"").trim();
  for(const i of items){
    const key=similar(i.n)+"|"+i.u;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(i);
  }
  return [...groups.values()].filter(g=>g.length>1)
    .map(g=>g.map(i=>i.n+(i.u?" ("+i.u+")":"")));
}
/* ---------- storage (on this phone) ---------- */
function saveMenu(){
  try{localStorage.setItem("cm_menu",JSON.stringify(menu));}
  catch(e){ // phone storage full: drop what can be rebuilt, then try again
    try{["cm_base","cm_rph_orig"].forEach(k=>localStorage.removeItem(k));localStorage.setItem("cm_menu",JSON.stringify(menu));}
    catch(x){toast("Mémoire du téléphone pleine : la semaine n'est pas enregistrée sur ce téléphone");}}LS.set("cm_menu_at",Date.now());scheduleSync();cloudSoon();}
function saveRecipe(id,data){recipes[id]=data;LS.set("cm_recipes",recipes);render();scheduleSync();cloudSoon();}
function removeRecipe(id){cloudDeleted(id);for(const wk of Object.values(menu.weeks||{}))for(const[k,sl]of Object.entries(wk||{})){if(!sl)continue;if(sl.id===id)delete wk[k];else{if(sl.entree===id)delete sl.entree;if(sl.dessert===id)delete sl.dessert;}}saveMenu();delete recipes[id];LS.set("cm_recipes",recipes);render();scheduleSync();}

