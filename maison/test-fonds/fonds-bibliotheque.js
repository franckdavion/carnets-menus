/* Maisonnée — bibliothèque de fonds V1 (aperçu isolé).
   Catalogue typé, média par période, photos, illustrations animées et photos animées.
   Les médias importés sont stockés uniquement dans IndexedDB sur cet appareil. */
(()=>{'use strict';
  const VERSION=1, KEY='mn_bg_library_v1', DB='mn-background-media-v1', STORE='files';
  const PERIODS=[['matin','Matin'],['aprem','Après-midi'],['soir','Soir'],['nuit','Nuit']];
  const TYPES=[['photo','Photos'],['illustration','Animations'],['photo-animee','Photos animées']];
  const photos={matin:'assets/fonds/matin.png',aprem:'assets/fonds/apres-midi.png',soir:'assets/fonds/soir.png',nuit:'assets/fonds/nuit.png'};
  const builtins=PERIODS.flatMap(([p,label])=>[
    {id:'p-'+p,name:'Photo '+label,type:'photo',media:'image',src:photos[p],period:p,builtin:true},
    {id:'a-'+p,name:'Animation '+label,type:'illustration',media:'svg-native',src:'',period:p,builtin:true},
    {id:'m-'+p,name:'Photo en mouvement '+label,type:'photo-animee',media:'image-motion',src:photos[p],period:p,builtin:true}
  ]);
  const defaultPrefs=()=>({version:VERSION,mode:'auto',type:'photo',period:'matin',fixed:'p-matin',chosen:{},motion:true,custom:[]});
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const memberId=()=>typeof S!=='undefined'&&S.me?String(S.me):'local';
  const storageKey=()=>KEY+'_'+memberId();
  const safeId=s=>/^[a-z0-9_-]{2,64}$/.test(String(s||''));
  const isType=t=>TYPES.some(x=>x[0]===t);
  const isPeriod=p=>PERIODS.some(x=>x[0]===p);
  const safeUrl=(value,kind)=>{
    try{
      const u=new URL(String(value||''),document.baseURI);
      if(!['https:','http:'].includes(u.protocol))return '';
      if(u.protocol==='http:'&&u.origin!==location.origin)return '';
      const path=u.pathname.toLowerCase();
      if(kind==='video'&&!/\.(mp4|webm)$/.test(path))return '';
      if(kind==='image'&&!/\.(png|jpe?g|webp|avif|gif|svg)$/.test(path))return '';
      return u.href;
    }catch(_){return '';}
  };
  const validateItem=item=>{
    if(!item||!safeId(item.id)||!isType(item.type)||!item.name||item.name.length>70)return null;
    if(!['image','image-motion','video','svg-native'].includes(item.media))return null;
    if(item.media==='svg-native')return null; // seules les 4 illustrations intégrées sont autorisées
    const local=!!item.local;
    if(local&&!/^user_[a-z0-9_-]+$/.test(item.id))return null;
    const src=local?'':safeUrl(item.src,item.media==='video'?'video':'image');
    if(!src&&!local)return null;
    return {id:item.id,name:String(item.name).slice(0,70),type:item.type,media:item.media,src,period:isPeriod(item.period)?item.period:'matin',local,builtin:false};
  };
  const normalize=x=>{
    const p=defaultPrefs();if(!x||typeof x!=='object')return p;
    p.mode=['auto','custom','fixed'].includes(x.mode)?x.mode:'auto';
    p.type=isType(x.type)?x.type:'photo';
    p.period=isPeriod(x.period)?x.period:'matin';
    p.fixed=safeId(x.fixed)?x.fixed:'p-matin';
    p.motion=x.motion!==false;
    p.custom=Array.isArray(x.custom)?x.custom.map(validateItem).filter(Boolean).slice(0,60):[];
    const ids=new Set([...builtins,...p.custom].map(a=>a.id));
    p.chosen={};
    for(const [period] of PERIODS)if(ids.has(x.chosen?.[period]))p.chosen[period]=x.chosen[period];
    if(!ids.has(p.fixed))p.fixed='p-matin';
    return p;
  };
  const localRead=()=>{try{return JSON.parse(localStorage.getItem(storageKey())||'null')}catch(_){return null}};
  const memberPrefs=()=>{try{const me=typeof meM==='function'?meM():null;return me?.home_prefs?.background_media_v1||null}catch(_){return null}};
  let prefs=normalize(memberPrefs()||localRead());
  let owner=memberId(),remoteLoaded=!!memberPrefs();
  function hydrate(){
    const id=memberId();
    if(id!==owner){owner=id;prefs=normalize(memberPrefs()||localRead());remoteLoaded=!!memberPrefs();lastMediaSig='';}
    const remote=memberPrefs();
    if(remote&&!remoteLoaded){prefs=normalize(remote);remoteLoaded=true;lastMediaSig='';}
  }
  let modalType=prefs.type,modalPeriod=prefs.period,addOpen=false,objectUrls=new Map(),saving=false,needCloudSave=false;
  let lastMediaSig='',lastEnabled=null,previewing=false;
  const catalog=()=>[...builtins,...prefs.custom];
  const find=id=>catalog().find(x=>x.id===id);
  const defaultId=(type,period)=>({photo:'p-',illustration:'a-','photo-animee':'m-'}[type]||'p-')+period;
  const currentPeriod=()=>document.querySelector('.mn-dayframe')?.dataset.mnBand||'matin';
  function currentItem(period=currentPeriod()){
    const wanted=prefs.mode==='fixed'?prefs.fixed:prefs.mode==='custom'?
      (prefs.chosen[period]||defaultId(prefs.type,period)):defaultId(prefs.type,period);
    return find(wanted)||find(defaultId('photo',period));
  }
  async function save(){
    localStorage.setItem(storageKey(),JSON.stringify(prefs));
    remoteLoaded=true;
    try{
      const me=typeof meM==='function'?meM():null;
      if(!me||typeof S==='undefined'||!S.members)return;
      // Fusion impérative : préserver les préférences de grille et les autres modules.
      const next={...(me.home_prefs||{}),background_media_v1:prefs};
      me.home_prefs=next;
      if(typeof saveLocal==='function')saveLocal();
      if(typeof mode!=='undefined'&&mode==='cloud'&&typeof sb!=='undefined'&&sb){
        needCloudSave=true;
        if(saving)return;
        saving=true;
        try{
          while(needCloudSave){
            needCloudSave=false;
            const current=typeof meM==='function'?meM():me;
            const newest={...(current?.home_prefs||{}),background_media_v1:prefs};
            const {error}=await sb.from('household_members').update({home_prefs:newest}).eq('id',me.id);
            if(error)console.warn('Bibliothèque de fonds : synchronisation',error.message);
          }
        }finally{saving=false;}
      }
    }catch(e){console.warn('Bibliothèque de fonds : préférences locales conservées',e)}
  }
  function persist(){prefs=normalize(prefs);void save();apply(document);}
  function openDB(){
    return new Promise((resolve,reject)=>{
      if(!window.indexedDB)return reject(new Error('Stockage local indisponible'));
      const q=indexedDB.open(DB,1);
      q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};
      q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error||new Error('Stockage impossible'));
    });
  }
  async function dbRun(action,key,blob){
    const db=await openDB();
    try{return await new Promise((resolve,reject)=>{
      const t=db.transaction(STORE,action==='get'?'readonly':'readwrite');
      const store=t.objectStore(STORE),req=action==='get'?store.get(key):action==='put'?store.put(blob,key):store.delete(key);
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Erreur stockage'));
    })}finally{db.close()}
  }
  async function mediaSrc(item){
    if(!item?.local)return item?.src||'';
    if(objectUrls.has(item.id))return objectUrls.get(item.id);
    try{
      const blob=await dbRun('get',item.id);
      if(!blob)return '';
      const url=URL.createObjectURL(blob);objectUrls.set(item.id,url);return url;
    }catch(_){return ''}
  }
  function effectiveMotion(){return prefs.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches}
  function layer(frame){
    let el=frame.querySelector(':scope > .mn-bg-layer');
    if(!el){el=document.createElement('div');el.className='mn-bg-layer';el.setAttribute('aria-hidden','true');frame.prepend(el)}
    return el;
  }
  function updateControls(frame){
    const hero=frame.querySelector('.ultimate-hero');
    if(!hero||hero.querySelector('[data-mn-bg-act="open"]'))return;
    hero.insertAdjacentHTML('beforeend','<button type="button" class="mn-bg-open" data-mn-bg-act="open" aria-label="Choisir le fond d’accueil" title="Bibliothèque de fonds">▧</button>');
  }
  async function apply(root=document){
    hydrate();
    const frame=root.querySelector?.('.mn-dayframe')||(root.matches?.('.mn-dayframe')?root:null);
    if(!frame)return;
    updateControls(frame);
    const period=frame.dataset.mnBand||'matin',item=currentItem(period),moving=effectiveMotion();
    const sig=[item.id,period,moving,document.hidden].join('|');
    if(sig===lastMediaSig&&frame.dataset.mnBgItem===item.id)return;
    lastMediaSig=sig;
    frame.dataset.mnBgItem=item.id;
    frame.classList.toggle('mn-bg-illustration',item.media==='svg-native');
    frame.classList.toggle('mn-bg-motion-off',!moving);
    const l=layer(frame);
    l.replaceChildren();
    if(item.media==='svg-native'){
      frame.style.setProperty('background-image','none','important');
      return;
    }
    frame.style.removeProperty('background-image');
    const imageFallback=photos[period];
    if(item.media==='video'){
      const video=document.createElement('video');
      video.className='mn-bg-video';
      video.autoplay=true;video.muted=true;video.loop=true;video.playsInline=true;
      video.preload='metadata';video.setAttribute('aria-hidden','true');
      video.poster=imageFallback;video.addEventListener('error',()=>{
        if(!video.isConnected)return;
        const still=document.createElement('div');still.className='mn-bg-photo';
        still.style.backgroundImage='url("'+imageFallback+'")';video.replaceWith(still);
      },{once:true});
      l.appendChild(video);
      const url=await mediaSrc(item);
      if(frame.dataset.mnBgItem!==item.id||!video.isConnected)return;
      if(!url){video.dispatchEvent(new Event('error'));return}
      video.src=url;
      if(moving&&!document.hidden)video.play().catch(()=>{video.poster=imageFallback});
      else video.pause();
    }else{
      const still=document.createElement('div');
      still.className='mn-bg-photo'+(item.media==='image-motion'&&moving?' mn-bg-kenburns':'');
      l.appendChild(still);
      const url=await mediaSrc(item);
      if(frame.dataset.mnBgItem!==item.id||!still.isConnected)return;
      // URL externe ou fichier iPhone indisponible : fond d'origine conservé.
      still.style.backgroundImage='url("'+(url||imageFallback).replace(/"/g,'%22')+'")';
    }
  }
  function tile(item){
    const chosen=(prefs.mode==='fixed'?prefs.fixed:prefs.chosen[modalPeriod]||defaultId(prefs.type,modalPeriod))===item.id;
    const selected=chosen?' is-selected':'';
    let visual;
    if(item.media==='svg-native'){
      visual='<div class="mn-bg-mini-art mn-bg-mini-'+esc(item.period)+'">✦</div>';
    }else if(item.local){
      visual='<div class="mn-bg-mini-art mn-bg-mini-local" data-mn-bg-thumb="'+esc(item.id)+'">▧</div>';
    }else if(item.media==='video'){
      visual='<div class="mn-bg-mini-art mn-bg-mini-video">▶</div>';
    }else{
      visual='<img loading="lazy" alt="" src="'+esc(item.src)+'">';
    }
    return '<div class="mn-bg-tile'+selected+'"><button type="button" class="mn-bg-tile-pick" data-mn-bg-act="choose" data-id="'+esc(item.id)+'">'+
      '<span class="mn-bg-tile-preview">'+visual+'</span><span class="mn-bg-tile-name">'+esc(item.name)+'</span>'+
      '<span class="mn-bg-tile-type">'+(chosen?'✓ Sélectionné':item.media==='video'?'Vidéo':item.media==='image-motion'?'Mouvement doux':item.media==='svg-native'?'Illustration SVG':'Photographie')+'</span></button>'+
      (!item.builtin?'<button type="button" class="mn-bg-delete" data-mn-bg-act="remove" data-id="'+esc(item.id)+'" aria-label="Supprimer '+esc(item.name)+'">×</button>':'')+
      '</div>';
  }
  function html(){
    const kind=modalType,all=catalog().filter(x=>x.type===kind);
    const typelabel=TYPES.find(t=>t[0]===kind)?.[1]||'Photos';
    return '<div class="mn-bg-lib">'+
      '<p class="muted small">Personnalise le fond derrière la météo. Les textes et les prévisions restent inchangés.</p>'+
      '<div class="mn-bg-tabs" role="tablist" aria-label="Type de fonds">'+TYPES.map(([id,name])=>
        '<button type="button" role="tab" aria-selected="'+(id===kind)+'" data-mn-bg-act="type" data-v="'+id+'">'+name+'</button>').join('')+'</div>'+
      '<div class="mn-bg-mode"><label class="field"><span class="label">Affichage</span><select class="input" data-mn-bg-mode>'+
        [['auto','Automatique selon l’heure'],['custom','Choisir chaque période'],['fixed','Un seul fond toute la journée']].map(([k,v])=>
          '<option value="'+k+'"'+(prefs.mode===k?' selected':'')+'>'+v+'</option>').join('')+'</select></label></div>'+
      '<div class="mn-bg-periods" aria-label="Période à personnaliser">'+PERIODS.map(([id,name])=>
        '<button type="button" data-mn-bg-act="period" data-v="'+id+'" aria-pressed="'+(id===modalPeriod)+'">'+name+'</button>').join('')+'</div>'+
      '<p class="mn-bg-help">'+(prefs.mode==='auto'?'La photo suit automatiquement le moment de la journée. Choisis un fond pour personnaliser cette période.':
        prefs.mode==='fixed'?'Le fond choisi sera utilisé toute la journée.':'Sélectionne un fond différent pour chaque période.')+'</p>'+
      '<div class="mn-bg-gallery" role="group" aria-label="'+esc(typelabel)+'">'+all.map(tile).join('')+'</div>'+
      '<label class="mn-bg-motion-label"><input type="checkbox" data-mn-bg-motion '+(prefs.motion?'checked':'')+'> Autoriser les animations (si l’appareil le permet)</label>'+
      '<details class="mn-bg-add" '+(addOpen?'open':'')+'><summary>＋ Ajouter à la bibliothèque « '+esc(typelabel)+' »</summary>'+
      '<form data-mn-bg-url-form><label class="field"><span class="label">Nom du fond</span><input class="input" required maxlength="70" name="name" placeholder="Ex. Ciel d’été"></label>'+
      '<label class="field"><span class="label">Adresse directe du fichier (https)</span><input class="input" type="url" required name="url" placeholder="'+(kind==='photo-animee'?'https://…/video.mp4':'https://…/image.webp')+'"></label>'+
      '<button type="submit" class="btn primary block">Ajouter cette adresse</button></form>'+
      '<div class="mn-bg-separator">ou depuis cet appareil</div>'+
      '<label class="mn-bg-upload btn">Importer un fichier '+(kind==='photo-animee'?'MP4, WebM, GIF ou photo':'image (JPG, PNG, WebP, GIF)')+
        '<input type="file" data-mn-bg-file accept="'+(kind==='photo-animee'?'image/*,video/mp4,video/webm':'image/png,image/jpeg,image/webp,image/gif,image/avif')+'" hidden></label>'+
      '<p class="muted small">Fichiers importés : disponibles hors ligne sur cet appareil. Les liens Web et les réglages se synchronisent avec ton compte ; les fichiers personnels restent locaux.</p></details>'+
      '<p class="muted small mn-bg-foot">Bibliothèque V1 · 4 fonds par catégorie déjà intégrés · formats compatibles : JPG, PNG, WebP, SVG intégrés, GIF, MP4 et WebM.</p>'+
      '<button type="button" class="btn primary block" data-mn-bg-act="done">Terminé</button></div>';
  }
  function draw(){
    const host=document.querySelector('#sheetIn [data-mn-bg-library]');
    if(!host)return;
    const scroll=document.querySelector('#sheetIn')?.scrollTop||0;
    host.innerHTML=html();
    requestAnimationFrame(()=>{const el=document.querySelector('#sheetIn');if(el)el.scrollTop=scroll;});
    host.querySelectorAll('[data-mn-bg-thumb]').forEach(async element=>{
      const item=find(element.dataset.mnBgThumb),src=await mediaSrc(item);
      if(element.isConnected&&src)element.style.backgroundImage='url("'+src.replace(/"/g,'%22')+'")';
    });
  }
  function previewPeriod(period){
    // L'aperçu utilise l'API du bandeau existant, sans changer ses horaires.
    previewing=!!period;
    if(window.mnJour?.preview)window.mnJour.preview(period);
    lastMediaSig='';
    void apply(document);
  }
  function open(){
    hydrate();
    modalPeriod=currentPeriod();
    modalType=prefs.type;addOpen=false;
    openSheet('Bibliothèque des fonds','<div data-mn-bg-library></div>');
    draw();
  }
  const makeId=()=>('user_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)).toLowerCase();
  function addItem(item){
    const checked=validateItem(item);
    if(!checked)throw new Error('Format ou adresse non valide.');
    prefs.custom=[...prefs.custom,checked].slice(-60);
    prefs.mode='custom';prefs.type=checked.type;prefs.chosen[modalPeriod]=checked.id;
    persist();draw();
  }
  async function addFile(file){
    if(!file)return;
    const video=/^video\/(mp4|webm)$/.test(file.type);
    const image=/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type);
    if(!video&&!image)throw new Error('Fichier non compatible : utilisez JPG, PNG, WebP, GIF, MP4 ou WebM.');
    if(video&&modalType!=='photo-animee')throw new Error('Les vidéos sont à ajouter dans Photos animées.');
    if(file.size>(video?20:8)*1024*1024)throw new Error(video?'Vidéo trop lourde (20 Mo maximum).':'Image trop lourde (8 Mo maximum).');
    const item={id:makeId(),name:file.name.replace(/\.[^.]+$/,'').slice(0,60)||'Mon fond',type:modalType,
      media:video?'video':modalType==='photo-animee'?'image-motion':'image',src:'',local:true,period:modalPeriod};
    await dbRun('put',item.id,file);
    addItem(item);
  }
  document.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-mn-bg-act]');if(!btn)return;
    const action=btn.dataset.mnBgAct,v=btn.dataset.v||'',id=btn.dataset.id||'';
    if(action==='open'){open();return}
    if(action==='done'){closeSheet();previewPeriod(null);return}
    if(action==='type'&&isType(v)){modalType=v;prefs.type=v;persist();draw();return}
    if(action==='period'&&isPeriod(v)){modalPeriod=v;previewPeriod(v);draw();return}
    if(action==='choose'){
      const item=find(id);if(!item)return;
      previewPeriod(modalPeriod);
      if(prefs.mode==='fixed')prefs.fixed=item.id;
      else {prefs.mode='custom';prefs.chosen[modalPeriod]=item.id}
      prefs.type=modalType;persist();draw();return;
    }
    if(action==='remove'){
      const item=prefs.custom.find(x=>x.id===id);if(!item||!confirm('Supprimer « '+item.name+' » de la bibliothèque ?'))return;
      prefs.custom=prefs.custom.filter(x=>x.id!==id);
      for(const [period]of PERIODS)if(prefs.chosen[period]===id)delete prefs.chosen[period];
      if(prefs.fixed===id)prefs.fixed='p-matin';
      if(item.local){await dbRun('delete',id).catch(()=>{});const old=objectUrls.get(id);if(old)URL.revokeObjectURL(old);objectUrls.delete(id)}
      persist();draw();
    }
  });
  document.addEventListener('change',async e=>{
    const el=e.target;
    if(el.matches('[data-mn-bg-mode]')){
      prefs.mode=el.value;persist();draw();return;
    }
    if(el.matches('[data-mn-bg-motion]')){
      prefs.motion=el.checked;persist();draw();return;
    }
    if(el.matches('[data-mn-bg-file]')&&el.files?.[0]){
      try{await addFile(el.files[0]);toast('Média ajouté à la bibliothèque de cet appareil.')}
      catch(err){toast(err.message||'Import impossible');}
    }
  });
  document.addEventListener('submit',e=>{
    const form=e.target.closest('[data-mn-bg-url-form]');if(!form)return;
    e.preventDefault();e.stopImmediatePropagation();
    const fd=new FormData(form),name=String(fd.get('name')||'').trim(),raw=String(fd.get('url')||'').trim();
    const video=/\.(mp4|webm)(?:[?#]|$)/i.test(raw);
    const media=video?'video':modalType==='photo-animee'?'image-motion':'image';
    try{
      if(!name)throw new Error('Donne un nom au fond.');
      if(video&&modalType!=='photo-animee')throw new Error('Vidéo à ajouter dans Photos animées.');
      const url=safeUrl(raw,video?'video':'image');
      if(!url)throw new Error('Ajoute un lien direct HTTPS vers JPG, PNG, WebP, GIF, MP4 ou WebM.');
      addItem({id:makeId(),name,type:modalType,media,src:url,period:modalPeriod});
      toast('Fond ajouté.');addOpen=false;
    }catch(err){toast(err.message||'Lien invalide');}
  },true);
  document.addEventListener('toggle',e=>{
    if(e.target.matches('.mn-bg-add'))addOpen=e.target.open;
  },true);
  // Compatibilité avec le bandeau existant, sans altérer la météo ni sa logique.
  if(window.mnJour?.mount){
    const original=window.mnJour.mount;
    window.mnJour.mount=function(root){original(root);void apply(root)};
  }
  document.querySelector('#sheet')?.addEventListener('close',()=>{
    if(previewing)previewPeriod(null);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)document.querySelectorAll('.mn-bg-video').forEach(v=>v.pause());
    else void apply(document);
  });
  setInterval(()=>{if(!document.hidden)void apply(document)},30000);
  window.maisonneeFondBibliotheque={open,apply,catalog,prefs:()=>JSON.parse(JSON.stringify(prefs)),
    // API d'ajout standardisée : manifeste versionné, sans duplicata de CSS.
    register(item){addItem(item)}};
})();