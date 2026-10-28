/* Maisonnée Ultimate : ajout non destructif sur l'accueil uniquement. */
(()=>{'use strict';
const city='Doullens',lat=50.001,lon=2.345;let meteo=null;
const date=()=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'full'}).format(new Date());
// Éphéméride : données indépendantes de la météo et de la navigation.
const ephemeride={saint:'',evenement:''};
const saintsConnus={'01-01':'Marie, Mère de Dieu','02-14':'Valentin','03-19':'Joseph','05-01':'Joseph artisan','06-24':'Jean-Baptiste','07-14':'Camille','08-15':'Assomption','09-29':'Michel','10-27':'Émeline','10-28':'Simon et Jude','10-31':'Quentin','11-01':'Toussaint','11-11':'Martin','12-06':'Nicolas','12-25':'Noël'};
const evenementsConnus={'10-28':'1886 : inauguration de la statue de la Liberté à New York.'};
function jourAnnee(d){const debut=Date.UTC(d.getFullYear(),0,1),jour=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());return Math.floor((jour-debut)/86400000)+1}
function texteSur(s){return String(s||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()}
async function chargerEphemeride(){
 const now=new Date(),key=String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 ephemeride.saint=saintsConnus[key]||'';
 ephemeride.evenement=evenementsConnus[key]||'';
 // Wikipédia fournit des événements datés, sans modifier les autres modules.
 try{const r=await fetch(`https://fr.wikipedia.org/api/rest_v1/feed/onthisday/events/${now.getMonth()+1}/${now.getDate()}`,{headers:{Accept:'application/json'}});if(r.ok){const data=await r.json();const events=(data.events||[]).filter(x=>x.year&&x.text);if(events.length){const e=events.find(x=>x.year>=1800&&x.year<=2000)||events[0];ephemeride.evenement=`${e.year} : ${texteSur(e.text)}`.slice(0,145)}}}catch(e){}
 // API du calendrier des prénoms : si indisponible, ne jamais inventer de saint.
 if(!ephemeride.saint){try{const r=await fetch('https://nameday.abalin.net/api/V2/today?country=fr');if(r.ok){const data=await r.json();const value=data?.data?.namedays?.fr||data?.namedays?.fr;if(typeof value==='string')ephemeride.saint=texteSur(value)}}catch(e){}}
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
<section class="ultimate-grid"><div class="ultimate-card ultimate-today mn-weather-panel"><div class="ultimate-today-weather"><div class="mn-weather-art" aria-hidden="true">${iconImage(todayCode)}</div><div class="mn-weather-main"><h2>📍 ${city}</h2>${weather}</div></div><div class="ultimate-today-date"><h2 class="mn-ephemeris-heading"><img class="mn-3d-calendar" src="assets/weather3d/calendar.svg" alt="" onerror="this.hidden=true"><span>Éphéméride</span></h2><div class="ultimate-dayline">🌸 ${saint==='Émeline'?'Sainte Émeline':saint}</div><div class="ultimate-dayline">📅 ${jourAnnee(now)}ᵉ jour de l’année</div><div class="ultimate-dayline">📜 ${ephemeride.evenement||'Événement du jour indisponible'}</div><div class="ultimate-dayline">🍂 ${[11,0,1].includes(now.getMonth())?'Hiver':[2,3,4].includes(now.getMonth())?'Printemps':[5,6,7].includes(now.getMonth())?'Été':'Automne'}</div><div class="ultimate-dayline">🌅 Lever ${d?.sunrise?.[0]?.slice(11)||'—'} · Coucher ${d?.sunset?.[0]?.slice(11)||'—'}</div></div><div class="mn-week" aria-label="Prévisions météo sur sept jours">${dailyCards}</div></div></section>
<button type="button" class="ultimate-classic-button" id="ultimate-toggle-classic" aria-expanded="${main.classList.contains('ultimate-classic')}">${main.classList.contains('ultimate-classic')?'Masquer':'Afficher'} l’accueil classique et tous ses raccourcis</button>`;
integrateHeader(main);
window.maisonneeModuleGrid?.mount(main);

const toggle=el.querySelector('#ultimate-toggle-classic');toggle.addEventListener('click',()=>{main.classList.toggle('ultimate-classic');toggle.setAttribute('aria-expanded',String(main.classList.contains('ultimate-classic')));toggle.textContent=(main.classList.contains('ultimate-classic')?'Masquer':'Afficher')+' l’accueil classique et tous ses raccourcis';});
}
function showForecast(){
 let dialog=document.querySelector('#ultimate-forecast-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='ultimate-forecast-dialog';document.body.appendChild(dialog)}
 const h=meteo?.hourly,d=meteo?.daily;const now=Date.now();
 const hours=h?.time?.map((t,i)=>({t,i})).filter(x=>new Date(x.t).getTime()>=now-3600000).slice(0,24)||[];
 const days=d?.time||[];
 dialog.innerHTML=`<div class="ultimate-dialog-top"><h2>🌤️ Prévisions · ${city}</h2><button type="button" id="ultimate-close-forecast" aria-label="Fermer">✕</button></div><h3>Prochaines 24 heures</h3><div class="ultimate-hour-list">${hours.length?hours.map(x=>`<div><strong>${x.t.slice(11,16)}</strong><span>${Math.round(h.temperature_2m[x.i])}°</span><span>☔ ${h.precipitation_probability[x.i]} %</span></div>`).join(''):'Prévisions indisponibles'}</div><h3>Jours suivants</h3><div class="ultimate-hour-list">${days.map((day,i)=>`<div><strong>${day.slice(5)}</strong><span>${Math.round(d.temperature_2m_min?.[i]??0)}° / ${Math.round(d.temperature_2m_max?.[i]??0)}°</span><span>☔ ${d.precipitation_probability_max?.[i]??'—'} %</span></div>`).join('')}</div>`;
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
async function load(){try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset&timezone=Europe%2FParis&forecast_days=7`;const r=await fetch(u);if(!r.ok)throw Error('weather');meteo=await r.json()}catch(e){meteo=null}render()}
function init(){const app=document.querySelector('#app');if(!app)return;new MutationObserver(()=>{if(document.querySelector('main.view-home')&&!document.querySelector('#ultimate-dashboard'))render()}).observe(app,{childList:true});render();load();chargerEphemeride();setInterval(load,1800000);setInterval(()=>{const d=new Date();if(d.getHours()===0)chargerEphemeride()},60000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
