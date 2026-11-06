/* Accueil : météo partagée (households.home), grille par membre (home_prefs, 0023). */
window.maisonHomeStore = (() => {
  const LEGACY_KEY = "maisonnee_ultimate_v3_grid_v1";
  const GEO_KEY = "maisonnee_home_geo_v1";
  function memberKey() {
    return (typeof S !== "undefined" && S.me) ? String(S.me) : "local";
  }
  function gridKey() { return "maisonnee_home_grid_v1_" + memberKey(); }
  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }
  function num(v, fallback) {
    const n = typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : fallback;
  }
  function meRecord() {
    return typeof meM === "function" ? meM() : null;
  }
  function legacyHouseGrid() {
    const shared = typeof S !== "undefined" && S.hh && S.hh.home && typeof S.hh.home === "object" ? S.hh.home : null;
    if (!shared) return null;
    const order = Array.isArray(shared.order) && shared.order.length ? shared.order : null;
    const hidden = Array.isArray(shared.hidden) ? shared.hidden : null;
    if (!order && !hidden) return null;
    return { order: order || [], hidden: hidden || [] };
  }
  function readGrid() {
    const me = meRecord();
    const fromMember = me && me.home_prefs && typeof me.home_prefs === "object" ? me.home_prefs : null;
    if (fromMember) {
      return {
        order: Array.isArray(fromMember.order) && fromMember.order.length ? fromMember.order : null,
        hidden: Array.isArray(fromMember.hidden) ? fromMember.hidden : []
      };
    }
    const saved = readJson(gridKey()) || readJson(LEGACY_KEY);
    if (saved && (Array.isArray(saved.order) || Array.isArray(saved.hidden))) {
      return {
        order: Array.isArray(saved.order) && saved.order.length ? saved.order : null,
        hidden: Array.isArray(saved.hidden) ? saved.hidden : []
      };
    }
    const legacy = legacyHouseGrid();
    if (legacy) return legacy;
    return { order: null, hidden: [] };
  }
  function readGeo() {
    const shared = typeof S !== "undefined" && S.hh && S.hh.home && typeof S.hh.home === "object" ? S.hh.home : null;
    const saved = readJson(GEO_KEY);
    return {
      city: (shared && shared.city) || (saved && saved.city) || "Doullens",
      lat: num(shared && shared.lat, num(saved && saved.lat, 50.001)),
      lon: num(shared && shared.lon, num(saved && saved.lon, 2.345))
    };
  }
  function read() {
    const grid = readGrid();
    const geo = readGeo();
    return { order: grid.order, hidden: grid.hidden, ...geo };
  }
  function householdHomePatch(geo, dom) {
    const prev = (typeof S !== "undefined" && S.hh && S.hh.home) || {};
    return {
      city: geo.city,
      lat: geo.lat,
      lon: geo.lon,
      ...(dom ? { dom } : prev.dom ? { dom: prev.dom } : {})
    };
  }
  async function writeGrid(prefs) {
    const order = Array.isArray(prefs.order) ? prefs.order : readGrid().order || [];
    const hidden = Array.isArray(prefs.hidden) ? prefs.hidden : readGrid().hidden || [];
    // Conserver les préférences d'accueil des autres modules (fonds, etc.).
    const previous = meRecord()?.home_prefs;
    const payload = { ...(previous && typeof previous === "object" ? previous : {}), order, hidden };
    try { localStorage.setItem(gridKey(), JSON.stringify(payload)); } catch (e) {}
    const me = meRecord();
    if (me && typeof S !== "undefined" && S.members) {
      me.home_prefs = payload;
      const i = S.members.findIndex(m => m.id === me.id);
      if (i >= 0) S.members[i] = me;
      if (typeof saveLocal === "function") saveLocal();
    }
    if (typeof mode !== "undefined" && mode === "cloud" && typeof sb !== "undefined" && sb && typeof S !== "undefined" && S.me) {
      const { error } = await sb.from("household_members").update({ home_prefs: payload }).eq("id", S.me);
      if (error) console.warn("Accueil personnel", error.message || error);
    }
    return payload;
  }
  async function writeGeo(geo) {
    try { localStorage.setItem(GEO_KEY, JSON.stringify(geo)); } catch (e) {}
    if (typeof S !== "undefined" && S.hh) {
      const dom = S.hh.home && S.hh.home.dom;
      S.hh.home = householdHomePatch(geo, dom);
      if (typeof saveLocal === "function") saveLocal();
      if (typeof mode !== "undefined" && mode === "cloud" && typeof sb !== "undefined" && sb) {
        const { error } = await sb.from("households").update({ home: S.hh.home }).eq("id", S.hh.id);
        if (error) console.warn("Météo du foyer", error.message || error);
      }
    }
    return geo;
  }
  async function write(patch) {
    const cur = read();
    const tasks = [];
    if (patch.order !== undefined || patch.hidden !== undefined) {
      tasks.push(writeGrid({
        order: patch.order !== undefined ? patch.order : cur.order,
        hidden: patch.hidden !== undefined ? patch.hidden : cur.hidden
      }));
    }
    if (patch.city !== undefined || patch.lat !== undefined || patch.lon !== undefined) {
      tasks.push(writeGeo({
        city: patch.city !== undefined ? patch.city : cur.city,
        lat: patch.lat !== undefined ? patch.lat : cur.lat,
        lon: patch.lon !== undefined ? patch.lon : cur.lon
      }));
    }
    await Promise.all(tasks);
    return read();
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
function openEditor(){
 edit=true;
 const homeBtn=document.querySelector('[data-act=go][data-v=home]');
 if(homeBtn)homeBtn.click();
 else{
  const main=document.querySelector('main.view-home');
  if(main){syncEditChrome(main);mount(main)}
 }
 requestAnimationFrame(()=>document.querySelector('.mn-house')?.scrollIntoView({block:'start'}));
}
function load(){const h=window.maisonHomeStore.read();if(h.order&&h.order.length)return {order:h.order.slice(),hidden:(h.hidden||[]).slice()};return {order:items.map(x=>x[0]),hidden:[]}}
let config=load();
function save(){window.maisonHomeStore.write({order:config.order,hidden:config.hidden})}
const label=k=>items.find(x=>x[0]===k);
function sorted(){return [...items].sort((a,b)=>{const ia=config.order.indexOf(a[0]),ib=config.order.indexOf(b[0]);return (ia<0?999:ia)-(ib<0?999:ib)})}
function cols(host){
 const grid=document.querySelector('.mn-house-grid')||host?.querySelector('.umod-grid');
 if(!grid)return 2;
 const n=getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length;
 return n||2;
}
function move(id, delta){
 const order=sorted().map(x=>x[0]);
 const i=order.indexOf(id),j=i+delta;
 if(i<0||j<0||j>=order.length)return;
 [order[i],order[j]]=[order[j],order[i]];
 config.order=order;
}
function reorderModules(fromId,toId){
 if(!fromId||fromId===toId)return;
 const order=sorted().map(x=>x[0]);
 const a=order.indexOf(fromId),b=order.indexOf(toId);
 if(a<0||b<0)return;
 order.splice(a,1);
 order.splice(b,0,fromId);
 config.order=order;
 save();
 if(typeof window.maisonneeHomePaint==='function')window.maisonneeHomePaint();
}
function syncEditChrome(main){
 if(!main)return;
 main.classList.toggle('mn-home-editing',edit);
}
function repaint(){
 if(typeof window.maisonneeHomePaint==='function')window.maisonneeHomePaint();
 else{
  const host=document.querySelector('#ultimate-module-grid');
  if(host)render(host);
 }
}
const LONG_MS=480;
let suppressClick=false,pressTimer=null,pressTarget=null,pressPointer=null,pressStart=null,drag=null;
function clearPress(){
 if(pressTimer){clearTimeout(pressTimer);pressTimer=null}
 pressTarget=null;pressPointer=null;pressStart=null;
}
function endDrag(){
 if(!drag)return;
 drag.item.classList.remove('mn-house-lift','mn-house-drop-target');
 drag.ghost?.remove();
 drag=null;
}
function startDrag(item,e){
 endDrag();clearPress();
 const r=item.getBoundingClientRect();
 const ghost=item.cloneNode(true);
 ghost.classList.add('mn-house-ghost');
 ghost.style.width=r.width+'px';
 ghost.style.height=r.height+'px';
 document.body.appendChild(ghost);
 item.classList.add('mn-house-lift');
 drag={id:item.dataset.module,item,ghost,offsetX:e.clientX-r.left,offsetY:e.clientY-r.top,pointerId:e.pointerId};
 moveGhost(e.clientX,e.clientY);
 if(typeof navigator.vibrate==='function')navigator.vibrate(14);
 try{item.setPointerCapture(e.pointerId)}catch(err){}
}
function moveGhost(x,y){
 if(!drag)return;
 drag.ghost.style.transform=`translate3d(${x-drag.offsetX}px,${y-drag.offsetY}px,0)`;
 document.querySelectorAll('.mn-house-item.mn-house-drop-target').forEach(el=>el.classList.remove('mn-house-drop-target'));
 const hit=document.elementFromPoint(x,y)?.closest('.mn-house-item');
 if(hit&&hit.dataset.module!==drag.id)hit.classList.add('mn-house-drop-target');
 drag.over=hit&&hit.dataset.module!==drag.id?hit.dataset.module:null;
}
function finishDrag(){
 if(!drag)return;
 const from=drag.id,to=drag.over;
 suppressClick=true;
 endDrag();
 if(to)reorderModules(from,to);
 setTimeout(()=>{suppressClick=false},400);
}
document.addEventListener('pointerdown',e=>{
 if(!edit||e.button!==0)return;
 const item=e.target.closest('.mn-house-grid .mn-house-item');
 if(!item)return;
 clearPress();
 pressTarget=item;pressPointer=e.pointerId;pressStart={x:e.clientX,y:e.clientY};
 pressTimer=setTimeout(()=>{if(pressTarget===item)startDrag(item,e)},LONG_MS);
},{passive:true});
document.addEventListener('pointermove',e=>{
 if(drag&&drag.pointerId===e.pointerId){e.preventDefault();moveGhost(e.clientX,e.clientY);return}
 if(!pressTimer||pressPointer!==e.pointerId||!pressStart)return;
 if(Math.hypot(e.clientX-pressStart.x,e.clientY-pressStart.y)>12)clearPress();
},{passive:false});
document.addEventListener('pointerup',e=>{
 if(drag&&drag.pointerId===e.pointerId){finishDrag();clearPress();return}
 clearPress();
});
document.addEventListener('pointercancel',()=>{endDrag();clearPress()});
document.addEventListener('click',e=>{
 if(!edit)return;
 if(suppressClick){e.preventDefault();e.stopPropagation();return}
 if(e.target.closest('.mn-house-grid')&&e.target.closest('[data-act],[data-dom-cmd]')){
  e.preventDefault();e.stopPropagation();
 }
},true);
function render(host){
 if(!host)return;
 const visible=sorted().filter(x=>!config.hidden.includes(x[0])),hidden=sorted().filter(x=>config.hidden.includes(x[0]));
 host.innerHTML=`<div class="umod-heading"><h2>🏡 Notre maison</h2>${edit?'<button type="button" class="umod-edit" data-umod="edit">✓ Terminer</button>':''}</div>
 <div class="umod-grid">${visible.map(([k,t,ico])=>`<div class="umod-slot" draggable="${edit}" data-module="${k}">
 <button type="button" class="umod-link" ${edit?'disabled':''} data-act="go" data-v="${k}"><span class="umod-ico">${ico}</span><span>${t}</span></button>
 ${edit?`<div class="umod-tools">
 <button type="button" data-umod="rowup" data-id="${k}" aria-label="Remonter ${t}">↑</button>
 <button type="button" data-umod="left" data-id="${k}" aria-label="Déplacer ${t} à gauche">←</button>
 <button type="button" data-umod="right" data-id="${k}" aria-label="Déplacer ${t} à droite">→</button>
 <button type="button" data-umod="rowdown" data-id="${k}" aria-label="Descendre ${t}">↓</button>
 <button type="button" data-umod="hide" data-id="${k}" aria-label="Masquer ${t}">×</button>
 </div>`:''}
 </div>`).join('')}</div>
 ${edit?`<div class="umod-hidden"><h3>Modules masqués</h3>${hidden.length?hidden.map(([k,t])=>`<button type="button" data-umod="show" data-id="${k}">＋ ${t}</button>`).join(''):'<p>Aucun module masqué.</p>'}<button type="button" data-umod="reset">Réinitialiser la disposition</button><p>Votre accueil est personnel (téléphone et compte). La météo reste partagée avec le foyer. Masquer un raccourci ne supprime aucune donnée.</p></div>`:''}`;
}
function mount(main){
 const dashboard=main.querySelector('#ultimate-dashboard');if(!dashboard)return;
 syncEditChrome(main);
 if(!edit)config=load();
 let host=dashboard.querySelector('#ultimate-module-grid');
 if(!host){host=document.createElement('section');host.id='ultimate-module-grid';host.setAttribute('aria-label','Modules personnalisables');dashboard.appendChild(host)}
 render(host);
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-umod]');if(!b)return;
 const host=b.closest('#ultimate-module-grid, .mn-house');if(!host)return;
 e.preventDefault();e.stopPropagation();
 const action=b.dataset.umod,id=b.dataset.id;
 if(action==='edit'){edit=!edit;syncEditChrome(document.querySelector('main.view-home'))}
 if(action==='hide'&&!config.hidden.includes(id))config.hidden.push(id);
 if(action==='show')config.hidden=config.hidden.filter(k=>k!==id);
 if(action==='reset'){config={order:items.map(x=>x[0]),hidden:[]}}
 const step=cols(host);
 if(action==='left')move(id,-1);
 if(action==='right')move(id,1);
 if(action==='rowup')move(id,-step);
 if(action==='rowdown')move(id,step);
 if(action==='up')move(id,-1);
 if(action==='down')move(id,1);
 save();
 repaint();
});
document.addEventListener('dragstart',e=>{const slot=e.target.closest('.umod-slot');if(edit&&slot){dragId=slot.dataset.module;e.dataTransfer.effectAllowed='move'}});
document.addEventListener('dragover',e=>{if(edit&&dragId&&e.target.closest('.umod-slot'))e.preventDefault()});
document.addEventListener('drop',e=>{const slot=e.target.closest('.umod-slot');if(!edit||!slot||!dragId)return;e.preventDefault();reorderModules(dragId,slot.dataset.module);dragId=null});
function setVisible(key, visible){
 if(!items.some(x=>x[0]===key))return;
 config.hidden=config.hidden.filter(k=>k!==key);
 if(!visible)config.hidden.push(key);
 save();
 const host=document.querySelector('#ultimate-module-grid');
 if(host)render(host);
}
window.maisonneeModuleGrid={mount,openEditor,setVisible,reorderModules,editing:()=>edit};
})();

/* Maisonnée Ultimate : ajout non destructif sur l'accueil uniquement. */
(()=>{'use strict';
let meteo=null,meteoDernierSucces=0,meteoEnAttente=false,meteoCleActive='',meteoEssais=0,meteoRetryTimer=null,meteoSequence=0;
// Lecture seule de la météo de Maisonnée : aucune seconde requête météo pour le fond.
window.maisonneeHomeWeather=()=>({
 code:meteo?.current?.weather_code!=null&&Number.isInteger(Number(meteo.current.weather_code))?Number(meteo.current.weather_code):null,
 city:place().city, observedAt:meteoDernierSucces||null, stale:!!meteoEnAttente
});
function place(){const h=window.maisonHomeStore.read();return {city:h.city||'Doullens',lat:Number.isFinite(h.lat)?h.lat:50.001,lon:Number.isFinite(h.lon)?h.lon:2.345}}
const date=()=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'full'}).format(new Date());
// Éphéméride : données indépendantes de la météo et de la navigation.
const ephemeride={saint:'',evenement:''};
const saintsConnus={'01-01':'Marie, Mère de Dieu','02-14':'Valentin','03-19':'Joseph','05-01':'Joseph artisan','06-24':'Jean-Baptiste','07-14':'Camille','08-15':'Assomption','09-29':'Michel','10-27':'Émeline','10-28':'Simon et Jude','10-29':'Narcisse','10-30':'Bienvenue','10-31':'Quentin','11-01':'Toussaint','11-02':'Commémoration des défunts','11-03':'Hubert','11-04':'Charles Borromée','11-11':'Martin','12-06':'Nicolas','12-25':'Noël'};
const evenementsConnus={'10-28':'1886 : inauguration de la statue de la Liberté à New York.'};
// Calendrier de fêtes français disponible hors ligne, 366 dates (29 février inclus).
// Noms et dates : faits calendaires ; référence de vérification :
// https://github.com/archidote/api_fetes_prenoms_france (database/calendrier.json).
// Les fêtes mobiles et les saisons ne sont pas figées à une date arbitraire.
const fetesParMois = [
 null,
 ["Jour de l'an","Basile","Geneviève","Odilon","Edouard","Mélaine","Raymond","Lucien","Alix","Guillaume","Pauline","Tatiana","Yvette","Nina","Rémi","Marcel","Roseline","Prisca","Marius","Sébastien","Agnès","Vincent","Banard","François de Sales","Conversion de Paul","Paule","Angèle","Thomas d'Aquin","Gildas","Martine","Marcelle"],
 ["Ella","Présentation","Blaise","Véronique","Agathe","Gaston","Eugènie","Jacqueline","Apolline","Arnaud","Notre Dame de Lourdes","Félix","Béatrice","Valentin","Claude","Julienne","Alexis","Bernadette","Gabin","Aimée","Pierre-Damien","Isabelle","Lazare","Modeste","Roméo","Nestor","Honorine","Romain","Auguste"],
 ["Aubin","Charles le Bon","Guénolé","Casimir","Olive","Colette","Félicité","Jean de Dieu","Françoise","Vivien","Rosine","Justine","Rodrigue","Mathilde","Louise","Bénédicte","Patrice","Cyrille","Joseph","Herbert","Clémence","Léa","Victorien","Catherine","Annonciation","Larissa","Habib","Gontran","Gwladys","Amédée","Benjamin"],
 ["Hugues","Sandrine","Richard","Isidore","Irène","Marcellin","Jean-Baptiste de la Salle","Julie","Gautier","Fulbert","Stanislas","Jules","Ida","Maxime","Paterne","Benoît-Joseph","Anicet","Parfait","Emma","Odette","Anselme","Alexandre","Georges","Fidèle","Marc","Alida","Zita","Valérie","Catherine de Sienne","Robert"],
 ["Fête du travail","Boris","Philippe, Jacques","Sylvain","Judith","Prudence","Gisèle","Armistice 1945","Pacôme","Solange","Estelle","Achille","Rolande","Matthias","Denise","Honoré","Pascal","Eric","Yves","Bernardin","Constantin","Emile","Didier","Donatien","Sophie","Bérenger","Augustin","Germain","Aymar","Ferdinand","Visitation de la Sainte Vierge"],
 ["Justin","Blandine","Kévin","Clotilde","Igor","Norbert","Gilbert","Médard","Diane","Landry","Barnabé","Guy","Antoine de Padoue","Elisée","Germaine","Jean-François Régis","Hervé","Léonce","Romuald","Silvère","Rodolphe","Alban","Audrey","Jean-Baptiste","Prosper","Anthelme","Fernand","Irénée","Pierre, Paul","Martial"],
 ["Thierry","Martinien","Thomas","Florent","Antoine","Mariette","Raoul","Thibault","Amandine","Ulrich","Benoît","Olivier","Henri, Joël","Fête Nationale","Donald","Notre Dame du Mont Carmel","Charlotte","Frédéric","Arsène","Marina","Victor","Marie-Madeleine","Brigitte","Christine","Jacques","Anne, Joachin","Nathalie","Samson","Marthe","Juliette","Ignace de Loyola"],
 ["Alphonse","Julien Eymard","Lydie","Jean-Marie Vianney","Abel","Transfiguration","Gaétan","Dominique","Amour","Laurent","Claire","Clarisse","Hippolyte","Evrard","Assomption","Armel","Hyacinthe","Hélène","Jean-Eudes","Bernard","Christophe","Fabrice","Rose de Lima","Barthélémy","Louis","Natacha","Monique","Augustin","Sabine","Fiacre","Aristide"],
 ["Gilles","Ingrid","Grégoire","Rosalie","Raïssa","Bertrand","Reine","Nativité","Alain","Inès","Adelphe","Apollinaire","Aimé","Croix Glorieuse","Roland","Edith","Renaud","Nadège","Emilie","Davy","Matthieu","Maurice","Constant","Thècle","Hermann","Côme, Damien","Vincent de Paul","Venceslas","Michel, Gabriel, Raphaël","Jérôme"],
 ["Thérèse de l'Enfant Jésus","Léger","Gérard","François d'Assise","Fleur","Bruno","Serge","Pélagie","Denis","Ghislain","Firmin","Wilfried","Géraud","Juste","Thérèse d'Avila","Edwige","Baudoin","Luc","René","Adeline","Céline","Elodie","Jean de Capistran","Florentin","Crépin","Dimitri","Emeline","Jude","Narcisse","Bienvenu","Quentin"],
 ["Toussaint","Défunts","Hubert","Charles","Sylvie","Bertille","Carine","Geoffroy","Théodore","Léon","Armistice 1918","Christian","Brice","Sidoine","Albert","Marguerite","Elisabeth","Aude","Tanguy","Edmond","Présence de Marie","Cécile","Clément","Flora","Catherine","Delphine","Sévrin","Jacques de la Marche","Saturnin","André"],
 ["Florence","Viviane","François-Xavier","Barbara","Gérald","Nicolas","Ambroise","Immaculée Conception","Pierre Fourier","Romaric","Daniel","Jeanne-Françoise de Chantal","Lucie","Odile","Ninon","Alice","Gaël","Gatien","Urbain","Théophile","Pierre Canisius","Françoise-Xavière","Armand","Adèle","Noël","Etienne","Jean","Innocents","David","Roger","Sylvestre"]
];
function cleEphemeride(d){return String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function feteEphemeride(d){
 const key=cleEphemeride(d);
 return saintsConnus[key]||fetesParMois[d.getMonth()+1]?.[d.getDate()-1]||'Fête du jour';
}
function jourAnnee(d){const debut=Date.UTC(d.getFullYear(),0,1),jour=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());return Math.floor((jour-debut)/86400000)+1}
function texteSur(s){return String(s||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()}
async function chargerEphemeride(){
 const now=new Date(),key=cleEphemeride(now);
 // Afficher immédiatement les informations locales, même si les API échouent.
 ephemeride.saint=feteEphemeride(now);
 ephemeride.evenement=evenementsConnus[key]||'';
 try{const saved=JSON.parse(localStorage.getItem('mn_ephemeride_'+key)||'null');if(saved&&typeof saved.evenement==='string'&&!ephemeride.evenement)ephemeride.evenement=saved.evenement}catch(e){}
 render();
 // L'actualité historique reste facultative, limitée à cinq secondes.
 const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
 const timer=ctrl?setTimeout(()=>ctrl.abort(),5000):null;
 try{
  const r=await fetch(`https://fr.wikipedia.org/api/rest_v1/feed/onthisday/events/${now.getMonth()+1}/${now.getDate()}`,{headers:{Accept:'application/json'},signal:ctrl?ctrl.signal:undefined});
  if(!r.ok)return;
  const data=await r.json();
  if(key!==cleEphemeride(new Date()))return;
  const events=(data.events||[]).filter(x=>x.year&&x.text);
  if(!events.length)return;
  const e=events.find(x=>x.year>=1800&&x.year<=2000)||events[0];
  ephemeride.evenement=`${e.year} : ${texteSur(e.text)}`.slice(0,145);
  try{localStorage.setItem('mn_ephemeride_'+key,JSON.stringify({saint:ephemeride.saint,evenement:ephemeride.evenement}))}catch(e){}
  render();
 }catch(e){}finally{if(timer)clearTimeout(timer)}
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
  if(typeof carnetMealName==='function'&&d){
   const hour=new Date().getHours();
   let slot=hour<15?'midi':'soir';
   let nom=carnetMealName(d,slot);
   if(nom===''){const other=slot==='midi'?'soir':'midi';const suivant=carnetMealName(d,other);if(suivant){nom=suivant;slot=other;}}
   vide.repas={k:slot==='midi'?'Ce midi':'Ce soir',t:nom===null?'Menu en cours de synchronisation':nom||'Rien de prévu',m:nom===null?'Synchronisation en cours':nom?'Au menu':'Choisir un plat',day:d,slot};
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
function mzHomeLite(){
 try{
  const touch=(navigator.maxTouchPoints||0)>=1||matchMedia('(pointer: coarse)').matches;
  const short=Math.min(window.innerWidth||0,window.innerHeight||0,screen.width||0,screen.height||0);
  // Tablette seulement : l’iPhone (côté court < 600) garde fonds, flous et Ken Burns.
  return touch&&short>=600&&short<=1366;
 }catch(e){return false}
}
function mzSyncHomeLite(){
 document.documentElement.classList.toggle('mz-home-lite',!!document.querySelector('main.view-home')&&mzHomeLite());
}
let lastHomePaint='';
function render(){
 const main=document.querySelector('main.view-home');if(!main)return;
 mzSyncHomeLite();
 if(document.documentElement.classList.contains('mz-scrolling'))return;
 let el=main.querySelector('#ultimate-dashboard');if(!el){el=document.createElement('div');el.id='ultimate-dashboard';main.prepend(el)}
 el.className='';
 const w=meteo?.current,d=meteo?.daily,now=new Date();
 const weather=w?`<div class="ultimate-big">${Math.round(w.temperature_2m)}°C</div><div class="ultimate-line">${codes(w.weather_code)}</div><div class="ultimate-secondary">Ressenti ${Math.round(w.apparent_temperature)}° · Vent ${Math.round(w.wind_speed_10m)} km/h${directionVent(w.wind_direction_10m)?` · ${directionVent(w.wind_direction_10m)}`:''}</div><div class="ultimate-secondary">Pluie ${d?.precipitation_probability_max?.[0]??'—'} %</div>${meteoEnAttente?`<div class="ultimate-secondary">Dernières prévisions conservées (${new Date(meteoDernierSucces).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}) · actualisation en attente</div>`:''}`:'<div class="ultimate-secondary">Prévisions momentanément indisponibles · nouvel essai automatique.</div>';
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
 const wrap=(k,html)=>`<div class="mn-house-item" data-module="${k}">${html}</div>`;
 const cartes=pins.map(k=>{
  const mod=typeof modOf==='function'?modOf(k):null;if(!mod)return '';
  let ligne='',meta='',kicker='';
  try{const extra=plus[k];if(extra){kicker=extra.k;ligne=extra.t;meta=extra.m}else if(typeof mod.sub==='function')ligne=mod.sub()}catch(e){ligne=mod.t}
  const tete=`<span class="mn-card-h"><img src="assets/modules3d/${k}.svg" alt="" width="46" height="46"><span>${esc(mod.t)}</span><span class="mn-chev" aria-hidden="true">›</span></span>`;
  const corps=`<strong>${esc(ligne)}</strong>${meta?`<small>${esc(meta)}</small>`:''}`;
  if(k==='agenda')return wrap(k,`<div class="mn-card mn-card-cal mn-card-split"><button type="button" class="mn-card-open" data-act="go" data-v="agenda">${tete}</button><button type="button" class="mn-card-src" data-act="homeCal" aria-haspopup="dialog" aria-label="Choisir l’agenda affiché, actuellement ${esc(kicker)}">${esc(kicker)} ▾</button><button type="button" class="mn-card-open" data-act="go" data-v="agenda">${corps}</button></div>`);
  if(k==='repas'&&g.repas.day&&g.repas.slot)return wrap(k,`<div class="mn-card mn-card-repas mn-card-split"><button type="button" class="mn-card-open" data-act="go" data-v="repas">${tete}</button><button type="button" class="mn-card-open" data-act="homeRepas" data-day="${esc(g.repas.day)}" data-slot="${esc(g.repas.slot)}" aria-label="${ligne&&ligne!=='Rien de prévu'?'Ouvrir la fiche de '+ligne:'Choisir le repas'}">${kicker?`<span class="mn-card-k">${esc(kicker)}</span>`:''}${corps}</button></div>`);
  if(k==='recettes'&&g.recette.id)return wrap(k,`<div class="mn-card mn-card-${ton(k)} mn-card-split"><button type="button" class="mn-card-open" data-act="go" data-v="recettes" aria-label="Ouvrir le Carnet de menus">${tete}</button><button type="button" class="mn-card-open" data-act="homeRecette" data-v="${esc(g.recette.id)}" aria-label="Ouvrir la fiche de ${esc(g.recette.t)}">${kicker?`<span class="mn-card-k">${esc(kicker)}</span>`:''}${corps}</button></div>`);
  if(k==='domotique'){
    const gates=typeof window.domHomeGates==='function'?window.domHomeGates():{};
    if(typeof window.domScheduleState==='function'){
      const now=Date.now();
      if(!window._domHomePollAt||now-window._domHomePollAt>45000){
        window._domHomePollAt=now;
        window.domScheduleState(false,changed=>{if(changed&&document.querySelector('main.view-home'))render()});
      }
    }
    const btn=(g,lab)=>g?`<button type="button" class="btn mn-gate-btn" data-dom-cmd="${esc(g.id)}" data-dom-action="Ouvrir" ${g.ready?'':'disabled'}>${lab}</button>`:'';
    const probe=typeof gates.voiture?.temp==='number'
      ?`<strong>Extérieur ${String(gates.voiture.temp).replace('.',',')} °C</strong>`
      :`<strong>Extérieur</strong><small>Sonde du portail</small>`;
    return wrap(k,`<div class="mn-card mn-card-domotique mn-card-split"><button type="button" class="mn-card-open" data-act="go" data-v="domotique">${tete}${probe}</button><div class="mn-card-gates">${btn(gates.pieton,'Piéton')}${btn(gates.voiture,'Voiture')}</div></div>`);
  }
  return wrap(k,`<button type="button" class="mn-card mn-card-${ton(k)}" data-act="go" data-v="${k}">${tete}${kicker?`<span class="mn-card-k">${esc(kicker)}</span>`:''}${corps}</button>`);
 }).join('');
 const editing=window.maisonneeModuleGrid?.editing?.();
 main.classList.toggle('mn-home-editing',!!editing);
 const houseEdit=editing?`<div class="mn-house-editbar"><p class="mn-house-hint">Maintenez une carte, puis déplacez-la à l’emplacement voulu.</p><button type="button" class="umod-edit mn-house-done" data-umod="edit">✓ Terminer</button></div>`:'';
 const band=(window.mnJour&&mnJour.at(now))||{id:'matin',hello:'Bonjour la famille ! ☀️'};
 const meAcc=(typeof meM==='function'?meM():null);
 const bandHello=meAcc&&meAcc.name?({matin:`Bonjour ${meAcc.name} ! ☀️`,aprem:`Bel après-midi ${meAcc.name} ! ☀️`,soir:`Bonsoir ${meAcc.name} ! 🌙`,nuit:`Bonne nuit ${meAcc.name} ! 🌙`}[band.id]||band.hello):band.hello;
 const jourLabel=date().replace(/^./,c=>c.toUpperCase());
 const html=`<section class="mn-dayframe mn-dayband" data-mn-band="${band.id}"><section class="ultimate-hero mn-dayband" data-mn-band="${band.id}"><div class="mn-band-sky" aria-hidden="true"></div><div class="ultimate-greeting mn-band-copy"><div id="ultimate-header-controls" class="ultimate-header-controls" aria-label="Commandes du foyer"></div><h1 class="mn-band-hello">${esc(bandHello)}</h1><p class="mn-band-date"><svg class="mn-band-cal" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5 2.2v2.6M11 2.2v2.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg><span>${jourLabel}</span></p></div></section>
<section class="ultimate-grid"><div class="ultimate-card ultimate-today mn-weather-panel"><div class="mn-meteo-col"><div class="ultimate-today-weather"><div class="mn-weather-art" aria-hidden="true">${iconImage(w?.weather_code)}</div><div class="mn-weather-main"><h2><button type="button" id="ultimate-city">📍 ${place().city}</button></h2>${weather}</div></div><div class="mn-week" aria-label="Prévisions météo sur sept jours">${dailyCards}</div></div><div class="ultimate-today-date"><h2 class="mn-ephemeris-heading"><img class="mn-3d-calendar" src="assets/weather3d/calendar.svg" alt="" onerror="this.hidden=true"><span>Éphéméride</span></h2><div class="ultimate-dayline">🌸 ${esc(saint==='Émeline'?'Sainte Émeline':saint)}</div><div class="ultimate-dayline">📅 ${jourAnnee(now)}ᵉ jour de l’année</div><div class="ultimate-dayline">📜 ${esc(ephemeride.evenement||'Événement du jour indisponible')}</div><div class="ultimate-dayline">🍂 ${saisonDe(now.getMonth())}</div><div class="ultimate-dayline">🌅 Lever ${d?.sunrise?.[0]?.slice(11)||'—'} · Coucher ${d?.sunset?.[0]?.slice(11)||'—'}</div><div class="ultimate-dayline">🌙 ${esc(lune.nom)} · ${lune.illum} %</div><div class="ultimate-dayline">🌙 Lever ${heure(d?.moonrise?.[0])} · Coucher ${heure(d?.moonset?.[0])}</div></div></div></section></section>
<section class="mn-house" aria-label="Notre maison">${houseEdit}<h2><svg class="mn-house-mark" viewBox="0 0 32 32" aria-hidden="true"><path fill="#f7fcff" d="M16 3.2 3.2 14.4h3V28h6.4v-7.8h6.8V28H25.8v-13.6h3L16 3.2z"/></svg><span class="mn-house-label">Notre maison</span><span class="mn-house-line" aria-hidden="true"></span></h2><div class="mn-house-grid">
${cartes||'<p class="mn-house-empty">Aucun module sur l’accueil. Ajoutez-en depuis Explorer, avec Personnaliser l’accueil.</p>'}
</div></section>
<button type="button" class="ultimate-classic-button" id="ultimate-toggle-classic" aria-expanded="${main.classList.contains('ultimate-classic')}">${main.classList.contains('ultimate-classic')?'Masquer':'Afficher'} l’accueil classique et tous ses raccourcis</button>`;
 if(html===lastHomePaint&&el.querySelector('.mn-house-grid')&&el.querySelector('.mn-band-sky svg')){
  if(!document.querySelector('#app > header.top.ultimate-header-moved'))integrateHeader(main);
  return;
 }
 lastHomePaint=html;
 if(el.querySelector('#ultimate-header-controls')&&document.querySelector('#app > header.top.ultimate-header-moved'))restoreHeader();
 el.innerHTML=html;
 integrateHeader(main);
 if(window.mnJour)mnJour.mount(el);
 const toggle=el.querySelector('#ultimate-toggle-classic');
 toggle.addEventListener('click',()=>{main.classList.toggle('ultimate-classic');toggle.setAttribute('aria-expanded',String(main.classList.contains('ultimate-classic')));toggle.textContent=(main.classList.contains('ultimate-classic')?'Masquer':'Afficher')+' l’accueil classique et tous ses raccourcis';});
 const cityBtn=el.querySelector('#ultimate-city');if(cityBtn)cityBtn.addEventListener('click',()=>{void changeCity()});
 if(window.maisonneeModuleGrid?.editing?.())window.maisonneeModuleGrid.mount(main);
}
window.maisonneeHomePaint=render;
(()=>{let pause;window.addEventListener('scroll',()=>{
  if(!document.querySelector('main.view-home'))return;
  const frame=document.querySelector('main.view-home .mn-dayframe');
  frame?.classList.add('is-paused');
  document.documentElement.classList.add('mz-scrolling');
  document.querySelectorAll('.mn-bg-video').forEach(v=>{try{v.pause()}catch(e){}});
  clearTimeout(pause);
  pause=setTimeout(()=>{
    frame?.classList.remove('is-paused');
    document.documentElement.classList.remove('mz-scrolling');
  },280);
},{passive:true});})();
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
 const next=window.prompt("Ville pour la météo (partagée avec tout le foyer)", current);
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
// Météo : ne jamais effacer une prévision valide pour une panne passagère de l'API.
// Le cache, limité à la journée et à 12 heures, est propre à la ville configurée.
function meteoCacheKey(p){return 'mn_meteo_v2_'+Number(p.lat).toFixed(3)+'_'+Number(p.lon).toFixed(3)}
function meteoJour(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function meteoValide(d){return !!(d&&d.current&&Number.isFinite(Number(d.current.temperature_2m))&&d.daily&&Array.isArray(d.daily.time)&&d.daily.time[0]===meteoJour()&&Array.isArray(d.daily.temperature_2m_max))}
function meteoCacheLire(p){
 try{
  const c=JSON.parse(localStorage.getItem(meteoCacheKey(p))||'null');
  if(c&&Number.isFinite(c.at)&&Date.now()-c.at>=0&&Date.now()-c.at<12*3600000&&meteoValide(c.data))return c;
 }catch(e){}
 return null;
}
async function meteoDemander(p,versionReduite){
 const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
 const timeout=ctrl?setTimeout(()=>ctrl.abort(),9000):null;
 const variables='temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset'+(versionReduite?'':',moonrise,moonset');
 const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(p.lat)}&longitude=${encodeURIComponent(p.lon)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability&daily=${variables}&timezone=Europe%2FParis&forecast_days=7`;
 try{
  const r=await fetch(url,{cache:'no-store',signal:ctrl?ctrl.signal:undefined});
  if(!r.ok)throw Error('Météo HTTP '+r.status);
  const d=await r.json();
  if(!meteoValide(d))throw Error('Données météo incomplètes');
  return d;
 }finally{if(timeout)clearTimeout(timeout)}
}
async function load(){
 const p=place(),cle=meteoCacheKey(p),seq=++meteoSequence;
 if(cle!==meteoCleActive){meteoCleActive=cle;meteo=null;meteoDernierSucces=0;meteoEnAttente=false;meteoEssais=0;}
 if(!meteo){const c=meteoCacheLire(p);if(c){meteo=c.data;meteoDernierSucces=c.at;meteoEnAttente=true;render()}}
 try{
  let d;
  try{d=await meteoDemander(p,false)}catch(e){
   // Si une variable astronomique n'est pas servie temporairement, demander le cœur météo.
   d=await meteoDemander(p,true);
  }
  if(seq!==meteoSequence||cle!==meteoCacheKey(place()))return;
  meteo=d;meteoEnAttente=false;meteoDernierSucces=Date.now();meteoEssais=0;
  if(meteoRetryTimer){clearTimeout(meteoRetryTimer);meteoRetryTimer=null}
  try{localStorage.setItem(cle,JSON.stringify({at:meteoDernierSucces,data:d}))}catch(e){}
 }catch(e){
  if(seq!==meteoSequence||cle!==meteoCacheKey(place()))return;
  meteoEnAttente=!!meteo;
  console.warn('Prévisions météo non disponibles :',e&&e.message||e);
  // Deux tentatives espacées, puis le rafraîchissement périodique habituel.
  if(meteoEssais<2&&!meteoRetryTimer){
   const delai=meteoEssais++?180000:60000;
   meteoRetryTimer=setTimeout(()=>{meteoRetryTimer=null;void load()},delai);
  }
 }
 render();
 window.maisonneeFondBibliotheque?.weatherChanged?.();
}
function init(){const app=document.querySelector('#app');if(!app)return;let homePaintQueued=false;new MutationObserver(()=>{if(!document.querySelector('main.view-home')||document.querySelector('#ultimate-dashboard'))return;if(homePaintQueued)return;homePaintQueued=true;requestAnimationFrame(()=>{homePaintQueued=false;if(document.querySelector('main.view-home')&&!document.querySelector('#ultimate-dashboard'))render()})}).observe(app,{childList:true});render();load();chargerEphemeride();setInterval(load,1800000);let lastDay=new Date().toDateString();setInterval(()=>{const day=new Date().toDateString();if(day!==lastDay){lastDay=day;chargerEphemeride();load()}},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){const day=new Date().toDateString();if(day!==lastDay){lastDay=day;chargerEphemeride()}load()}})}
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
 const home=document.querySelector('main.view-home');
 const head=home?.querySelector('#ultimate-module-grid .umod-heading');
 const fab=document.querySelector('button.fab[data-act="quickAdd"]');
 if(false&&head&&fab&&!head.contains(fab)){
  fab.classList.add('v3-fab-in-grid');
  head.appendChild(fab);
 }
}
document.addEventListener('click',e=>{
 if(e.target.closest('#ultimate-family-personalize')||e.target.closest('[data-act="homePersonalize"]')){e.preventDefault();window.maisonneeModuleGrid?.openEditor()}
});
let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;sync()})}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();
