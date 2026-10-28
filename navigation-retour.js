/* Navigation non destructive : restauration du contexte lors de la fermeture
   d'une fenêtre et au retour depuis une autre page. */
(() => {
  'use strict';
  const KEY = 'app-navigation-retour:' + location.pathname;
  const selectors = 'dialog[open], [role="dialog"][aria-modal="true"], .modal.show, .modal.open, .overlay.show, .overlay.open';
  let last = null;
  const snapshot = () => ({x:scrollX,y:scrollY,active:document.activeElement?.id||null,at:Date.now()});
  const restore = state => {
    if (!state) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo(state.x,state.y);
      if(state.active){const el=document.getElementById(state.active);if(el && !el.closest(selectors)) {try{el.focus({preventScroll:true})}catch(_){}}}
    }));
  };
  const count = () => document.querySelectorAll(selectors).length;
  let opened = count();
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest(selectors)) last = snapshot();
  }, {capture:true,passive:true});
  const observer = new MutationObserver(() => {
    const now=count();
    if(now>opened && !last) last=snapshot();
    if(now<opened && now===0){const previous=last;last=null;restore(previous)}
    opened=now;
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open','class','aria-modal']});
  window.addEventListener('pagehide',()=>{try{sessionStorage.setItem(KEY,JSON.stringify(snapshot()))}catch(_){}});
  window.addEventListener('pageshow', e=>{
    if(!e.persisted) return;
    try{const saved=JSON.parse(sessionStorage.getItem(KEY));if(saved)restore(saved)}catch(_){}
  });
})();
