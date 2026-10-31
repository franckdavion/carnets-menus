/* Accueil : météo, éphéméride et grille.
   La ville et la disposition vont dans households.home (migration 0017). */
window.maisonHomeStore = (() => {
  const KEY = "maisonnee_ultimate_v3_grid_v1";
  function local() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function num(v, fallback) {
    const n = typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : fallback;
  }
  function read() {
    const shared = typeof S !== "undefined" && S.hh && S.hh.home && typeof S.hh.home === "object" ? S.hh.home : null;
    const saved = local();
    const order = shared && Array.isArray(shared.order) && shared.order.length ? shared.order
      : saved && Array.isArray(saved.order) ? saved.order : null;
    const hidden = shared && Array.isArray(shared.hidden) ? shared.hidden
      : saved && Array.isArray(saved.hidden) ? saved.hidden : [];
    return {
      order,
      hidden,
      city: (shared && shared.city) || (saved && saved.city) || "Doullens",
      lat: num(shared && shared.lat, num(saved && saved.lat, 50.001)),
      lon: num(shared && shared.lon, num(saved && saved.lon, 2.345))
    };
  }
  async function write(patch) {
    const cur = read();
    const home = {
      order: patch.order || cur.order || [],
      hidden: patch.hidden || cur.hidden || [],
      city: patch.city || cur.city,
      lat: patch.lat != null ? patch.lat : cur.lat,
      lon: patch.lon != null ? patch.lon : cur.lon
    };
    try { localStorage.setItem(KEY, JSON.stringify(home)); } catch (e) {}
    if (typeof S !== "undefined" && S.hh) {
      S.hh.home = home;
      if (typeof saveLocal === "function") saveLocal();
      if (typeof mode !== "undefined" && mode === "cloud" && typeof sb !== "undefined" && sb) {
        const { error } = await sb.from("households").update({ home }).eq("id", S.hh.id);
        if (error) console.warn("Disposition du foyer", error.message || error);
      }
    }
    return home;
  }
  return { read, write };
})();

/* Grille indépendante : les actions natives data-act=go restent inchangées. */
(()=>{'use strict';
const items=[
['agenda','Calendrier','📅'],['repas','Repas','🍽️'],['courses','Courses','🛒'],['recettes','Recettes','📖'],
['tasks','Tâches','✅'],['messages','Messages','💬'],['presences','Présences','👧'],['foyer','Ma famille','👨‍👩‍👧'],
['anniv','Anniversaires','🎂'],['docs','Documents','📁'],['budget','Budget','💶'],['carte','Localisation','📍'],
['galerie','Galerie','📸'],['edt','Emploi du temps','🗓️'],['domotique','Domotique','🏠']
];
const KEY='maisonnee_ultimate_v3_grid_v1';
let edit=false,dragId=null;
function openEditor(){edit=true;document.querySelector('[data-act=go][data-v=home]')?.click();setTimeout(()=>{const main=document.querySelector('main.view-home');if(main){mount(main);main.querySelector('#ultimate-module-grid')?.scrollIntoView({block:'nearest'})}},150)}
function load(){const h=window.maisonHomeStore.read();if(h.order&&h.order.length)return {order:h.order.slice(),hidden:(h.hidden||[]).slice()};return {order:items.map(x=>x[0]),hidden:[]}}
let config=load();
function save(){window.maisonHomeStore.write({order:config.order,hidden:config.hidden})}
const label=k=>items.find(x=>x[0]===k);
function sorted(){return [...items].sort((a,b)=>{const ia=config.order.indexOf(a[0]),ib=config.order.indexOf(b[0]);return (ia<0?999:ia)-(ib<0?999:ib)})}
function render(host){
 if(!host)return;
 const visible=sorted().filter(x=>!config.hidden.includes(x[0])),hidden=sorted().filter(x=>config.hidden.includes(x[0]));
 host.innerHTML=`<div class="umod-heading"><h2>🏡 Notre maison</h2>${edit?'<button type="button" class="umod-edit" data-umod="edit">✓ Terminer</button>':''}</div>
 <div class="umod-grid">${visible.map(([k,t,ico])=>`<div class="umod-slot" draggable="${edit}" data-module="${k}">
 <button type="button" class="umod-link" ${edit?'disabled':''} data-act="go" data-v="${k}"><span class="umod-ico">${ico}</span><span>${t}</span></button>
 ${edit?`<div class="umod-tools"><button type="button" data-umod="up" data-id="${k}" aria-label="Déplacer ${t} avant">←</button><button type="button" data-umod="down" data-id="${k}" aria-label="Déplacer ${t} après">→</button><button type="button" data-umod="hide" data-id="${k}" aria-label="Masquer ${t}">×</button></div>`:''}
 </div>`).join('')}</div>
 ${edit?`<div class="umod-hidden"><h3>Modules masqués</h3>${hidden.length?hidden.map(([k,t])=>`<button type="button" data-umod="show" data-id="${k}">＋ ${t}</button>`).join(''):'<p>Aucun module masqué.</p>'}<button type="button" data-umod="reset">Réinitialiser la disposition</button><p>La disposition est partagée avec le foyer. Masquer un raccourci ne supprime aucune donnée.</p></div>`:''}`;
}
function mount(main){
 const dashboard=main.querySelector('#ultimate-dashboard');if(!dashboard)return;
 if(!edit)config=load();
 let host=dashboard.querySelector('#ultimate-module-grid');
 if(!host){host=document.createElement('section');host.id='ultimate-module-grid';host.setAttribute('aria-label','Modules personnalisables');dashboard.appendChild(host)}
 render(host);
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-umod]');if(!b)return;
 const host=b.closest('#ultimate-module-grid');if(!host)return;
 const action=b.dataset.umod,id=b.dataset.id;
 if(action==='edit')edit=!edit;
 if(action==='hide'&&!config.hidden.includes(id))config.hidden.push(id);
 if(action==='show')config.hidden=config.hidden.filter(k=>k!==id);
 if(action==='reset'){config={order:items.map(x=>x[0]),hidden:[]}}
 if(action==='up'||action==='down'){
  const order=sorted().map(x=>x[0]);const i=order.indexOf(id),j=i+(action==='up'?-1:1);
  if(j>=0&&j<order.length){[order[i],order[j]]=[order[j],order[i]];config.order=order}
 }
 save();render(host);
});
document.addEventListener('dragstart',e=>{const slot=e.target.closest('.umod-slot');if(edit&&slot){dragId=slot.dataset.module;e.dataTransfer.effectAllowed='move'}});
document.addEventListener('dragover',e=>{if(edit&&dragId&&e.target.closest('.umod-slot'))e.preventDefault()});
document.addEventListener('drop',e=>{const slot=e.target.closest('.umod-slot');if(!edit||!slot||!dragId)return;e.preventDefault();const order=sorted().map(x=>x[0]);const a=order.indexOf(dragId),b=order.indexOf(slot.dataset.module);if(a>=0&&b>=0){order.splice(a,1);order.splice(b,0,dragId);config.order=order;save();render(slot.closest('#ultimate-module-grid'))}dragId=null});
function setVisible(key, visible){
 if(!items.some(x=>x[0]===key))return;
 config.hidden=config.hidden.filter(k=>k!==key);
 if(!visible)config.hidden.push(key);
 save();
 const host=document.querySelector('#ultimate-module-grid');
 if(host)render(host);
}
window.maisonneeModuleGrid={mount,openEditor,setVisible};
})();

/* Maisonnée Ultimate : ajout non destructif sur l'accueil uniquement. */
(()=>{'use strict';
let meteo=null;
function place(){const h=window.maisonHomeStore.read();return {city:h.city||'Doullens',lat:Number.isFinite(h.lat)?h.lat:50.001,lon:Number.isFinite(h.lon)?h.lon:2.345}}
const date=()=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'full'}).format(new Date());
// Éphéméride : données indépendantes de la météo et de la navigation.
const ephemeride={saint:'',evenement:''};
const saintsConnus={'01-01':'Marie, Mère de Dieu','02-14':'Valentin','03-19':'Joseph','05-01':'Joseph artisan','06-24':'Jean-Baptiste','07-14':'Camille','08-15':'Assomption','09-29':'Michel','10-27':'Émeline','10-28':'Simon et Jude','10-29':'Narcisse','10-30':'Bienvenue','10-31':'Quentin','11-01':'Toussaint','11-11':'Martin','12-06':'Nicolas','12-25':'Noël'};
const evenementsConnus={'10-28':'1886 : inauguration de la statue de la Liberté à New York.'};
function jourAnnee(d){const debut=Date.UTC(d.getFullYear(),0,1),jour=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());return Math.floor((jour-debut)/86400000)+1}
function texteSur(s){return String(s||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()}
async function chargerEphemeride(){
 const now=new Date(),key=String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 ephemeride.saint=saintsConnus[key]||'';
 ephemeride.evenement=evenementsConnus[key]||'';
 // Cache quotidien : conserver les dernières informations valides pour cette date.
 try{const saved=JSON.parse(localStorage.getItem('mn_ephemeride_'+key)||'null');if(saved){ephemeride.saint ||= saved.saint||'';ephemeride.evenement ||= saved.evenement||''}}catch(e){}
 // Wikipédia fournit des événements datés, sans modifier les autres modules.
 try{const r=await fetch(`https://fr.wikipedia.org/api/rest_v1/feed/onthisday/events/${now.getMonth()+1}/${now.getDate()}`,{headers:{Accept:'application/json'}});if(r.ok){const data=await r.json();const events=(data.events||[]).filter(x=>x.year&&x.text);if(events.length){const e=events.find(x=>x.year>=1800&&x.year<=2000)||events[0];ephemeride.evenement=`${e.year} : ${texteSur(e.text)}`.slice(0,145)}}}catch(e){}
 // API du calendrier des prénoms : si indisponible, ne jamais inventer de saint.
 if(!ephemeride.saint){try{const r=await fetch('https://nameday.abalin.net/api/V2/today?country=fr');if(r.ok){const data=await r.json();const value=data?.data?.namedays?.fr||data?.namedays?.fr;if(typeof value==='string')ephemeride.saint=texteSur(value)}}catch(e){}}
 try{if(ephemeride.saint||ephemeride.evenement)localStorage.setItem('mn_ephemeride_'+key,JSON.stringify(ephemeride))}catch(e){}
 render();
}

const directionVent=deg=>Number.isFinite(Number(deg))&&deg!==null&&deg!==undefined?['N','NE','E','SE','S','SO','O','NO'][Math.round(((Number(deg)%360)+360)%360/45)%8]:null;
const codes=n=>n===0?'☀️ Ensoleillé':n<=3?'⛅ Nuageux':n<=48?'🌫️ Brouillard':n<=67?'🌧️ Pluie':n<=77?'❄️ Neige':n<=82?'🌦️ Averses':'⛈️ Orages';
const iconForCode=n=>n==null?'☁️':n===0?'☀️':n<=3?'⛅':n<=48?'🌫️':n<=67?'🌧️':n<=77?'❄️':n<=82?'🌦️':'⛈️';
const icon3D=n=>n==null?'cloud':n===0?'sun':n<=3?'partly-cloudy-day':n<=48?'fog':n<=67?'rain':n<=77?'snow':n<=82?'rain':'storm';
const iconImage=n=>`<img class="mn-3d-weather" src="assets/weather3d/${icon3D(n)}.svg" alt="" loading="lazy" onerror="this.hidden=true"><span class="mn-icon-fallback">${iconForCode(n)}</span>`;
const saisonDe=m=>[11,0,1].includes(m)?'Hiver':[2,3,4].includes(m)?'Printemps':[5,6,7].includes(m)?'Été':'Automne';
function infoLune(date){
 const synod=29.530588853;
 const known=Date.UTC(2000,0,6,18,14,0);
 let age=((date.getTime()-known)/86400000)%synod;
 if(age<0)age+=synod;
 const illum=Math.round((1-Math.cos(2*Math.PI*age/synod))/2*100);
 const bornes=[[1.84566,'Nouvelle lune'],[5.53699,'Premier croissant'],[9.22831,'Premier quartier'],[12.91963,'Lune gibbeuse'],[16.61096,'Pleine lune'],[20.30228,'Lune gibbeuse'],[23.99361,'Dernier quartier'],[27.68493,'Dernier croissant'],[29.53059,'Nouvelle lune']];
 let nom='Nouvelle lune';
 for(const [limite,label] of bornes){if(age<limite){nom=label;break}}
 return {nom,illum};
}
const HOME_CAL='mz_home_cal';
function agendaChoisi(){
 const v=typeof LS!=='undefined'?LS.get(HOME_CAL,null):null;
 if(!v||v.id==='family'||!v.id)return {id:'family',name:'Agenda familial'};
 const list=typeof G!=='undefined'&&Array.isArray(G.list)?G.list:[];
 const known=list.find(c=>c.id===v.id);
 if(known)return {id:known.id,name:known.name};
 if(list.length)return {id:'family',name:'Agenda familial'};
 return {id:v.id,name:v.name||'Agenda Google'};
}
function heureMaintenant(){const n=new Date();return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')}
function encoreLa(day,start,end){
 const d=typeof today==='function'?today():'';
 if(!d||day>d)return true;
 if(day<d)return false;
 if(!start)return true;
 const now=heureMaintenant();
 if(end)return end>now;
 return start>=now;
}
function texteEvenement(e,dayKey){
 const day=e[dayKey];
 const quand=(typeof dayLabel==='function'?dayLabel(day):day)+(e.start_time&&typeof hm==='function'?' · '+hm(e.start_time):'');
 return {t:e.title||'Événement',m:quand};
}
function prochainFamille(){
 if(typeof occurrences!=='function'||typeof today!=='function'||typeof addDays!=='function')return null;
 return occurrences(today(),addDays(today(),45)).find(e=>encoreLa(e.on,e.start_time,e.end_time))||null;
}
function prochainGoogle(calId){
 if(typeof G==='undefined'||!G.ev||!Array.isArray(G.ev.items)||typeof today!=='function'||typeof addDays!=='function')return null;
 const d=today(),fin=addDays(d,45),best=new Map();
 for(const e of G.ev.items){
  if(e.cal!==calId||e.day<d||e.day>fin||!encoreLa(e.day,e.start_time,e.end_time))continue;
  const prev=best.get(e.id);
  if(!prev||e.day<prev.day||(e.day===prev.day&&String(e.start_time||'')<String(prev.start_time||'')))best.set(e.id,e);
 }
 return [...best.values()].sort((a,b)=>a.day.localeCompare(b.day)||String(a.start_time||'').localeCompare(String(b.start_time||'')))[0]||null;
}
function apercuCalendrier(){
 const choix=agendaChoisi();
 const vide={k:choix.name,t:'Agenda du foyer',m:'Ouvrir le calendrier'};
 try{
  if(choix.id==='family'){
   const e=prochainFamille();
   return e?{k:choix.name,...texteEvenement(e,'on')}:{k:choix.name,t:'Rien de prévu',m:'Les 45 prochains jours'};
  }
  const e=prochainGoogle(choix.id);
  if(e)return {k:choix.name,...texteEvenement(e,'day')};
  if(typeof G!=='undefined'&&G.busy)return {k:choix.name,t:'Lecture de l’agenda',m:''};
  if(typeof G!=='undefined'&&G.ev&&Array.isArray(G.ev.items))return {k:choix.name,t:'Rien de prévu',m:'Les 45 prochains jours'};
 }catch(e){}
 return vide;
}
function ouvrirChoixAgenda(){
 const cur=agendaChoisi();
 const list=typeof G!=='undefined'&&Array.isArray(G.list)?G.list:[];
 const puce=(id,name)=>`<button type="button" class="chip" data-act="homeCalPick" data-v="${esc(id)}" aria-pressed="${cur.id===id?'true':'false'}">${esc(name)}</button>`;
 openSheet('Quel agenda ?',`<p class="muted small" style="margin:6px 0 10px">Le prochain événement de cet agenda, sur l’accueil. Ce choix reste sur ce téléphone.</p><div class="chips">${puce('family','Agenda familial')}${list.map(c=>puce(c.id,c.name)).join('')}</div>${list.length?'':`<p class="muted small">Les agendas Google s’affichent ici lorsqu’ils sont connectés dans Ma famille.</p>`}<div class="sheet-sticky btns"><button type="button" class="btn primary block" data-act="closeSheet">Terminé</button></div>`);
}
function apercuMaison(){
 const vide={cal:apercuCalendrier(),repas:{k:'Ce soir',t:'Menu de la semaine',m:'Choisir un plat'},courses:{k:'Liste de courses',t:'À voir',m:''},recette:{k:'Idée du jour',t:'Livre de recettes',m:'Voir la fiche'}};
 try{
  if(typeof S==='undefined'||!S)return vide;
  const d=typeof today==='function'?today():'';
  if(typeof mealAt==='function'&&d){
   const hour=new Date().getHours();
   let slot=hour<15?'midi':'soir';
   let meal=typeof mealAt==='function'?mealAt(d,slot):null;
   if(!meal&&typeof mealAt==='function'){const other=slot==='midi'?'soir':'midi';if(mealAt(d,other)){meal=mealAt(d,other);slot=other;}}
   const nom=meal&&typeof mealName==='function'?mealName(meal):'';
   vide.repas={k:slot==='midi'?'Ce midi':'Ce soir',t:nom||'Rien de prévu',m:nom?'Au menu':'Choisir un plat',day:d,slot};
  }
  const reste=Array.isArray(S.shop)?S.shop.filter(x=>!x.done).length:0;
  vide.courses={k:'Liste de courses',t:reste?reste+(reste>1?' articles':' article'):'Liste vide',m:reste?'À acheter':'Rien à ajouter'};
  const livre=(Array.isArray(S.recipes)&&S.recipes.length)?S.recipes:(typeof DEMO_RECIPES!=='undefined'?DEMO_RECIPES:[]);
  if(livre.length){const r=livre[jourAnnee(new Date())%livre.length];vide.recette={k:'Idée du jour',t:r.name||'Recette',m:r.time?r.time+' min':'Voir la fiche',id:r.legacy_id||r.id||''};}
 }catch(e){}
 return vide;
}
function restoreHeader(){
 const header=document.querySelector('#app > header.top');
 const source=header?.querySelector('.wrap');
 const parked=document.querySelector('#ultimate-header-controls');
 if(!source||!parked)return;
 while(parked.firstChild)source.appendChild(parked.firstChild);
 header.classList.remove('ultimate-header-moved');
}
function render(){
 const main=document.querySelector('main.view-home');if(!main)return;
 restoreHeader();
 let el=main.querySelector('#ultimate-dashboard');if(!el){el=document.createElement('div');el.id='ultimate-dashboard';main.prepend(el)}
 el.className='';
 const w=meteo?.current,d=meteo?.daily,now=new Date();
 const weather=w?`<div class="ultimate-big">${Math.round(w.temperature_2m)}°C</div><div class="ultimate-line">${codes(w.weather_code)}</div><div class="ultimate-secondary">Ressenti ${Math.round(w.apparent_temperature)}° · Vent ${Math.round(w.wind_speed_10m)} km/h${directionVent(w.wind_direction_10m)?` · ${directionVent(w.wind_direction_10m)}`:''}</div><div class="ultimate-secondary">Pluie ${d?.precipitation_probability_max?.[0]??'—'} %</div>`:'<div class="ultimate-secondary">Prévisions en cours de chargement ou indisponibles.</div>';
 const weekday=iso=>new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:'Europe/Paris'}).format(new Date(iso+'T12:00:00')).replace('.','');
 const dailyCards=d?.time?.length?d.time.slice(0,7).map((day,i)=>`<div class="mn-day" aria-label="${day}"><span class="mn-day-name">${weekday(day)}</span><span class="mn-day-icon" aria-hidden="true">${iconImage(d.weather_code?.[i])}</span><strong>${Number.isFinite(d.temperature_2m_max?.[i])?Math.round(d.temperature_2m_max[i])+'°':'—'}</strong><small>${Number.isFinite(d.temperature_2m_min?.[i])?Math.round(d.temperature_2m_min[i])+'°':'—'}</small></div>`).join(''):'<p class="mn-weather-empty">Prévisions indisponibles</p>';
 const key=String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 const saint=ephemeride.saint||saintsConnus[key]||'Fête du jour indisponible';
 const lune=infoLune(now);
 const heure=iso=>iso?String(iso).slice(11,16):'—';
 const g=apercuMaison();
 const plus={agenda:{k:g.cal.k,t:g.cal.t,m:g.cal.m},repas:{k:g.repas.k,t:g.repas.t,m:g.repas.m},courses:{k:g.courses.k,t:g.courses.t,m:g.courses.m},recettes:{k:g.recette.k,t:g.recette.t,m:g.recette.m}};
 const ton=k=>k==='agenda'?'cal':k==='recettes'?'recette':k;
 let pins=typeof homePins==='function'?homePins():['agenda','repas','courses','recettes'];
 try{const order=window.maisonHomeStore&&window.maisonHomeStore.read().order;if(Array.isArray(order)&&order.length)pins=[...pins].sort((a,b)=>{const ia=order.indexOf(a),ib=order.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)})}catch(e){}
 const cartes=pins.map(k=>{
  const mod=typeof modOf==='function'?modOf(k):null;if(!mod)return '';
  let ligne='',meta='',kicker='';
  try{const extra=plus[k];if(extra){kicker=extra.k;ligne=extra.t;meta=extra.m}else if(typeof mod.sub==='function')ligne=mod.sub()}catch(e){ligne=mod.t}
  const tete=`<span class="mn-card-h"><img src="assets/modules3d/${k}.svg" alt="" width="46" height="46"><span>${esc(mod.t)}</span><span class="mn-chev" aria-hidden="true">›</span></span>`;
  const corps=`<strong>${esc(ligne)}</strong>${meta?`<small>${esc(meta)}</small>`:''}`;
  if(k==='agenda')return `<div class="mn-card mn-card-cal mn-card-split"><button type="button" class="mn-card-open" data-act="go" data-v="agenda">${tete}</button><button type="button" class="mn-card-src" data-act="homeCal" aria-haspopup="dialog" aria-label="Choisir l’agenda affiché, actuellement ${esc(kicker)}">${esc(kicker)} ▾</button><button type="button" class="mn-card-open" data-act="go" data-v="agenda">${corps}</button></div>`;
  if(k==='repas'&&g.repas.day&&g.repas.slot)return `<div class="mn-card mn-card-repas mn-card-split"><button type="button" class="mn-card-open" data-act="go" data-v="repas">${tete}</button><button type="button" class="mn-card-open" data-act="homeRepas" data-day="${esc(g.repas.day)}" data-slot="${esc(g.repas.slot)}" aria-label="${ligne&&ligne!=='Rien de prévu'?'Ouvrir la fiche de '+ligne:'Choisir le repas'}">${kicker?`<span class="mn-card-k">${esc(kicker)}</span>`:''}${corps}</button></div>`;
  if(k==='recettes'&&g.recette.id)return `<button type="button" class="mn-card mn-card-${ton(k)}" data-act="homeRecette" data-v="${esc(g.recette.id)}">${tete}${kicker?`<span class="mn-card-k">${esc(kicker)}</span>`:''}${corps}</button>`;
  return `<button type="button" class="mn-card mn-card-${ton(k)}" data-act="go" data-v="${k}">${tete}${kicker?`<span class="mn-card-k">${esc(kicker)}</span>`:''}${corps}</button>`;
 }).join('');
 const band=(window.mnJour&&mnJour.at(now))||{id:'matin',hello:'Bonjour la famille ! ☀️'};
 const jourLabel=date().replace(/^./,c=>c.toUpperCase());
 el.innerHTML=`<section class="mn-dayframe mn-dayband" data-mn-band="${band.id}"><section class="ultimate-hero mn-dayband" data-mn-band="${band.id}"><div class="mn-band-sky" aria-hidden="true"></div><div class="ultimate-greeting mn-band-copy"><div id="ultimate-header-controls" class="ultimate-header-controls" aria-label="Commandes du foyer"></div><h1 class="mn-band-hello">${band.hello}</h1><p class="mn-band-date"><svg class="mn-band-cal" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5 2.2v2.6M11 2.2v2.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg><span>${jourLabel}</span></p></div></section>
<section class="ultimate-grid"><div class="ultimate-card ultimate-today mn-weather-panel"><div class="mn-meteo-col"><div class="ultimate-today-weather"><div class="mn-weather-art" aria-hidden="true">${iconImage(w?.weather_code)}</div><div class="mn-weather-main"><h2><button type="button" id="ultimate-city">📍 ${place().city}</button></h2>${weather}</div></div><div class="mn-week" aria-label="Prévisions météo sur sept jours">${dailyCards}</div></div><div class="ultimate-today-date"><h2 class="mn-ephemeris-heading"><img class="mn-3d-calendar" src="assets/weather3d/calendar.svg" alt="" onerror="this.hidden=true"><span>Éphéméride</span></h2><div class="ultimate-dayline">🌸 ${saint==='Émeline'?'Sainte Émeline':saint}</div><div class="ultimate-dayline">📅 ${jourAnnee(now)}ᵉ jour de l’année</div><div class="ultimate-dayline">📜 ${ephemeride.evenement||'Événement du jour indisponible'}</div><div class="ultimate-dayline">🍂 ${saisonDe(now.getMonth())}</div><div class="ultimate-dayline">🌅 Lever ${d?.sunrise?.[0]?.slice(11)||'—'} · Coucher ${d?.sunset?.[0]?.slice(11)||'—'}</div><div class="ultimate-dayline">🌙 ${esc(lune.nom)} · ${lune.illum} %</div><div class="ultimate-dayline">🌙 Lever ${heure(d?.moonrise?.[0])} · Coucher ${heure(d?.moonset?.[0])}</div></div></div></section></section>
<section class="mn-house" aria-label="Notre maison"><h2><svg class="mn-house-mark" viewBox="0 0 32 32" aria-hidden="true"><path fill="#f7fcff" d="M16 3.2 3.2 14.4h3V28h6.4v-7.8h6.8V28H25.8v-13.6h3L16 3.2z"/></svg><span class="mn-house-label">Notre maison</span><span class="mn-house-line" aria-hidden="true"></span></h2><div class="mn-house-grid">
${cartes||'<p class="mn-house-empty">Aucun module sur l’accueil. Ajoutez-en depuis Explorer, avec Personnaliser l’accueil.</p>'}
</div></section>
<button type="button" class="ultimate-classic-button" id="ultimate-toggle-classic" aria-expanded="${main.classList.contains('ultimate-classic')}">${main.classList.contains('ultimate-classic')?'Masquer':'Afficher'} l’accueil classique et tous ses raccourcis</button>`;
 integrateHeader(main);
 if(window.mnJour)mnJour.mount(el);
 const toggle=el.querySelector('#ultimate-toggle-classic');
 toggle.addEventListener('click',()=>{main.classList.toggle('ultimate-classic');toggle.setAttribute('aria-expanded',String(main.classList.contains('ultimate-classic')));toggle.textContent=(main.classList.contains('ultimate-classic')?'Masquer':'Afficher')+' l’accueil classique et tous ses raccourcis';});
 const cityBtn=el.querySelector('#ultimate-city');if(cityBtn)cityBtn.addEventListener('click',()=>{void changeCity()});
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-act="homeCal"],[data-act="homeCalPick"],[data-act="homeRecette"],[data-act="homeRepas"]');if(!b)return;
 if(b.dataset.act==='homeRepas'){if(typeof openHomeMeal==='function')openHomeMeal(b.dataset.day,b.dataset.slot);return}
 if(b.dataset.act==='homeRecette'){if(typeof openHomeRecipe==='function')openHomeRecipe(b.dataset.v);return}
 if(b.dataset.act==='homeCal'){ouvrirChoixAgenda();return}
 const id=b.dataset.v;
 let name='Agenda familial';
 if(id!=='family'){
  const c=(typeof G!=='undefined'&&Array.isArray(G.list)?G.list:[]).find(x=>x.id===id);
  if(!c)return;
  name=c.name;
 }
 LS.set(HOME_CAL,{id,name});
 b.parentElement.querySelectorAll('[data-act="homeCalPick"]').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
 render();
});
function showForecast(){
 let dialog=document.querySelector('#ultimate-forecast-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='ultimate-forecast-dialog';document.body.appendChild(dialog)}
 const h=meteo?.hourly,d=meteo?.daily;const now=Date.now();
 const hours=h?.time?.map((t,i)=>({t,i})).filter(x=>new Date(x.t).getTime()>=now-3600000).slice(0,24)||[];
 const days=d?.time||[];
 dialog.innerHTML=`<div class="ultimate-dialog-top"><h2>🌤️ Prévisions · ${place().city}</h2><button type="button" id="ultimate-close-forecast" aria-label="Fermer">✕</button></div><h3>Prochaines 24 heures</h3><div class="ultimate-hour-list">${hours.length?hours.map(x=>`<div><strong>${x.t.slice(11,16)}</strong><span>${Math.round(h.temperature_2m[x.i])}°</span><span>☔ ${h.precipitation_probability[x.i]} %</span></div>`).join(''):'Prévisions indisponibles'}</div><h3>Jours suivants</h3><div class="ultimate-hour-list">${days.map((day,i)=>`<div><strong>${day.slice(5)}</strong><span>${Math.round(d.temperature_2m_min?.[i]??0)}° / ${Math.round(d.temperature_2m_max?.[i]??0)}°</span><span>☔ ${d.precipitation_probability_max?.[i]??'—'} %</span></div>`).join('')}</div>`;
 dialog.querySelector('#ultimate-close-forecast').onclick=()=>dialog.close();dialog.showModal();
}
function integrateHeader(main){
  // Déplace les boutons DOM d'origine : aucune action ni gestion de compte recréée.
  const header=document.querySelector('#app > header.top');
  const target=main.querySelector('#ultimate-header-controls');
  const source=header?.querySelector('.wrap');
  if(!target||!source)return;
  while(source.firstChild)target.appendChild(source.firstChild);
  header.classList.add('ultimate-header-moved');
}
async function changeCity(){
 const current=place().city;
 const next=window.prompt("Ville pour la météo du foyer", current);
 if(!next)return;
 const name=next.trim();
 if(!name||name===current)return;
 let city=name, lat=place().lat, lon=place().lon;
 try{
  const r=await fetch("https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(name)+"&count=1&language=fr&format=json");
  if(r.ok){const data=await r.json();const hit=data.results&&data.results[0];if(hit){city=hit.name;lat=hit.latitude;lon=hit.longitude;}}
 }catch(e){}
 await window.maisonHomeStore.write({city,lat,lon});
 await load();
}
async function load(){try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${place().lat}&longitude=${place().lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset,moonrise,moonset&timezone=Europe%2FParis&forecast_days=7`;const r=await fetch(u);if(!r.ok)throw Error('weather');meteo=await r.json()}catch(e){meteo=null}render()}
function init(){const app=document.querySelector('#app');if(!app)return;new MutationObserver(()=>{if(document.querySelector('main.view-home')&&!document.querySelector('#ultimate-dashboard'))render()}).observe(app,{childList:true});render();load();chargerEphemeride();setInterval(load,1800000);let lastDay=new Date().toDateString();setInterval(()=>{const day=new Date().toDateString();if(day!==lastDay){lastDay=day;chargerEphemeride();load()}},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){const day=new Date().toDateString();if(day!==lastDay){lastDay=day;chargerEphemeride()}load()}})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

(()=>{'use strict';
const icons={'Photos':'📸','Tâche':'✅','Tâches':'✅','Événement':'📅','Rendez-vous':'📅','Article de courses':'🛒','Dépense':'💶','Anniversaire':'🎂','Document':'📁','Créneau':'🗓️','Message':'💬','Calendrier':'📅','Repas':'🍽️','Courses':'🛒','Recettes':'📖','Messages':'💬','Présences':'👧','Ma famille':'👨‍👩‍👧','Anniversaires':'🎂','Documents':'📁','Budget':'💶','Localisation':'📍','Galerie':'📸','Emploi du temps':'🗓️'};
function clean(s){return(s||'').replace(/\s+/g,' ').trim()}
function sync(){
 document.querySelectorAll('main .sq,dialog.sheet .sq').forEach(b=>{
 const title=b.querySelector('.sq-t');const label=clean(title?.textContent);
 let key=label;if(!icons[key])key=Object.keys(icons).find(x=>x.toLowerCase()===key.toLowerCase())||key;
 if(!icons[key])return;
 const ico=b.querySelector('.sq-ic');if(!ico)return;
 if(ico.dataset.sharedIcon===key)return;
 ico.dataset.sharedIcon=key;ico.textContent=icons[key];ico.classList.add('v3-shared-icon');
 });
 const family=document.querySelector('main.view-foyer');
 if(family&&!family.querySelector('#ultimate-family-personalize')){
  const btn=document.createElement('button');btn.type='button';btn.id='ultimate-family-personalize';btn.textContent='⚙️ Personnaliser les boutons de l’accueil';
  family.prepend(btn);
 }
 const home=document.querySelector('main.view-home');
 const head=home?.querySelector('#ultimate-module-grid .umod-heading');
 const fab=document.querySelector('button.fab[data-act="quickAdd"]');
 if(false&&head&&fab&&!head.contains(fab)){
  fab.classList.add('v3-fab-in-grid');
  head.appendChild(fab);
 }
}
document.addEventListener('click',e=>{if(e.target.closest('#ultimate-family-personalize')){e.preventDefault();window.maisonneeModuleGrid?.openEditor()}});
let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;sync()})}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();
