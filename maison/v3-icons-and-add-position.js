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
