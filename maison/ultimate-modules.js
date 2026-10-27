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
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Array.isArray(x.order)&&Array.isArray(x.hidden))return x}catch{}return {order:items.map(x=>x[0]),hidden:[]}}
let config=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(config))}catch(e){console.warn('Disposition non sauvegardée',e)}}
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
 ${edit?`<div class="umod-hidden"><h3>Modules masqués</h3>${hidden.length?hidden.map(([k,t])=>`<button type="button" data-umod="show" data-id="${k}">＋ ${t}</button>`).join(''):'<p>Aucun module masqué.</p>'}<button type="button" data-umod="reset">Réinitialiser la disposition</button><p>Sur cet appareil uniquement. Masquer un raccourci ne supprime aucune donnée.</p></div>`:''}`;
}
function mount(main){
 const dashboard=main.querySelector('#ultimate-dashboard');if(!dashboard)return;
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
