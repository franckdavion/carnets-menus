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
['galerie','Galerie','📸'],['edt','Emploi du temps','🗓️']
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
function hourlyForecast(){const h=meteo?.hourly;if(!h)return '';const now=Date.now();let points=h.time.map((t,i)=>({t,i})).filter(x=>new Date(x.t).getTime()>=now-3600000).slice(0,4);return `<div class="ultimate-forecast">${points.map(x=>`<span>${x.t.slice(11,16)}<br><strong>${Math.round(h.temperature_2m[x.i])}°</strong><br>${h.precipitation_probability[x.i]}% pluie</span>`).join('')}</div>`}
function render(){const main=document.querySelector('main.view-home');if(!main)return;let el=main.querySelector('#ultimate-dashboard');if(!el){el=document.createElement('div');el.id='ultimate-dashboard';main.prepend(el)}
const w=meteo?.current,d=meteo?.daily;
const weather=w?`<div class="ultimate-big">${Math.round(w.temperature_2m)}°C</div><div class="ultimate-line">${codes(w.weather_code)}</div><div class="ultimate-secondary">Ressenti ${Math.round(w.apparent_temperature)}° · Vent ${Math.round(w.wind_speed_10m)} km/h${directionVent(w.wind_direction_10m)?` · ${directionVent(w.wind_direction_10m)}`:''}</div><div class="ultimate-secondary">Pluie ${d?.precipitation_probability_max?.[0]??'—'} %</div>`:'<div class="ultimate-secondary">Prévisions en cours de chargement ou indisponibles.</div>';
const iconForCode=n=>n==null?'☁️':n===0?'☀️':n<=3?'⛅':n<=48?'🌫️':n<=67?'🌧️':n<=77?'❄️':n<=82?'🌦️':'⛈️';
const icon3D=n=>n==null?'cloud':n===0?'sun':n<=3?'partly-cloudy-day':n<=48?'fog':n<=67?'rain':n<=77?'snow':n<=82?'rain':'storm';
const iconImage=n=>`<img class="mn-3d-weather" src="assets/weather3d/${icon3D(n)}.svg" alt="" loading="lazy" onerror="this.hidden=true"><span class="mn-icon-fallback">${iconForCode(n)}</span>`;
const weekday=iso=>new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:'Europe/Paris'}).format(new Date(iso+'T12:00:00')).replace('.','');
const todayCode=w?.weather_code;
const dailyCards=d?.time?.length?d.time.slice(0,7).map((day,i)=>`<div class="mn-day" aria-label="${day}"><span class="mn-day-name">${weekday(day)}</span><span class="mn-day-icon" aria-hidden="true">${iconImage(d.weather_code?.[i])}</span><strong>${Number.isFinite(d.temperature_2m_max?.[i])?Math.round(d.temperature_2m_max[i])+'°':'—'}</strong><small>${Number.isFinite(d.temperature_2m_min?.[i])?Math.round(d.temperature_2m_min[i])+'°':'—'}</small></div>`).join(''):'<p class="mn-weather-empty">Prévisions indisponibles</p>';
const now=new Date(),key=String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
const saint=ephemeride.saint||saintsConnus[key]||'Fête du jour indisponible';
el.innerHTML=`<section class="ultimate-hero"><div class="ultimate-scene" aria-hidden="true"><div class="ultimate-sun">☀️</div><div class="ultimate-cup"><img class="mn-3d-coffee" src="assets/weather3d/coffee.svg" alt="" onerror="this.hidden=true"><span class="mn-icon-fallback">☕</span></div></div><div class="ultimate-greeting"><div id="ultimate-header-controls" class="ultimate-header-controls" aria-label="Commandes du foyer"></div><div class="ultimate-kicker">⌂ MAISONNÉE · ULTIMATE</div><h1>Bonjour la famille ! ☀️</h1><p>Voici votre journée · ${date()}</p></div><div class="ultimate-window" aria-hidden="true"><i></i><i></i><i></i><i></i></div></section>
<section class="ultimate-grid"><div class="ultimate-card ultimate-today mn-weather-panel"><div class="ultimate-today-weather"><div class="mn-weather-art" aria-hidden="true">${iconImage(todayCode)}</div><div class="mn-weather-main"><h2><button type="button" id="ultimate-city">📍 ${place().city}</button></h2>${weather}</div></div><div class="ultimate-today-date"><h2 class="mn-ephemeris-heading"><img class="mn-3d-calendar" src="assets/weather3d/calendar.svg" alt="" onerror="this.hidden=true"><span>Éphéméride</span></h2><div class="ultimate-dayline">🌸 ${saint==='Émeline'?'Sainte Émeline':saint}</div><div class="ultimate-dayline">📅 ${jourAnnee(now)}ᵉ jour de l’année</div><div class="ultimate-dayline">📜 ${ephemeride.evenement||'Événement du jour indisponible'}</div><div class="ultimate-dayline">🍂 ${[11,0,1].includes(now.getMonth())?'Hiver':[2,3,4].includes(now.getMonth())?'Printemps':[5,6,7].includes(now.getMonth())?'Été':'Automne'}</div><div class="ultimate-dayline">🌅 Lever ${d?.sunrise?.[0]?.slice(11)||'—'} · Coucher ${d?.sunset?.[0]?.slice(11)||'—'}</div></div><div class="mn-week" aria-label="Prévisions météo sur sept jours">${dailyCards}</div></div></section>
<button type="button" class="ultimate-classic-button" id="ultimate-toggle-classic" aria-expanded="${main.classList.contains('ultimate-classic')}">${main.classList.contains('ultimate-classic')?'Masquer':'Afficher'} l’accueil classique et tous ses raccourcis</button>`;
integrateHeader(main);
window.maisonneeModuleGrid?.mount(main);

const toggle=el.querySelector('#ultimate-toggle-classic');toggle.addEventListener('click',()=>{main.classList.toggle('ultimate-classic');toggle.setAttribute('aria-expanded',String(main.classList.contains('ultimate-classic')));toggle.textContent=(main.classList.contains('ultimate-classic')?'Masquer':'Afficher')+' l’accueil classique et tous ses raccourcis';});
const cityBtn=el.querySelector('#ultimate-city');if(cityBtn)cityBtn.addEventListener('click',()=>{void changeCity()});
}
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
async function load(){try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${place().lat}&longitude=${place().lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset&timezone=Europe%2FParis&forecast_days=7`;const r=await fetch(u);if(!r.ok)throw Error('weather');meteo=await r.json()}catch(e){meteo=null}render()}
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
