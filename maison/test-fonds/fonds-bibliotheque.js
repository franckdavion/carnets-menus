/* Maisonnée — bibliothèque de fonds V1 (aperçu isolé).
   Catalogue typé, média par période, photos, illustrations animées et photos animées.
   Les médias importés sont stockés uniquement dans IndexedDB sur cet appareil. */
(()=>{'use strict';
  const VERSION=1, KEY='mn_bg_library_v1', DB='mn-background-media-v1', STORE='files';
  const PERIODS=[['matin','Matin'],['aprem','Après-midi'],['soir','Soir'],['nuit','Nuit']];
  const TYPES=[['photo','Photos'],['illustration','Animations'],['photo-animee','Photos animées']];
  const CONDITIONS=[['clear','Soleil'],['clouds','Nuageux'],['rain','Pluie'],['storm','Orage'],['snow','Neige'],['fog','Brouillard']];
  const isCondition=c=>CONDITIONS.some(x=>x[0]===c);
  // Codes WMO utilisés par Open-Meteo : même convention que la météo d'accueil.
  function weatherFromCode(value){
    if(value===null||value===undefined||value==='')return {category:'unknown',intensity:'normal'};
    const n=Number(value);
    if(!Number.isInteger(n))return {category:'unknown',intensity:'normal'};
    if(n===0)return {category:'clear',intensity:'normal'};
    if([1,2,3].includes(n))return {category:'clouds',intensity:'normal'};
    if([45,48].includes(n))return {category:'fog',intensity:'normal'};
    if([95,96,99].includes(n))return {category:'storm',intensity:'strong'};
    if([71,73,75,77,85,86].includes(n))return {category:'snow',intensity:[75,86].includes(n)?'strong':'normal'};
    if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(n))
      return {category:'rain',intensity:[65,67,82].includes(n)?'strong':[51,53,61,80].includes(n)?'light':'normal'};
    return {category:'unknown',intensity:'normal'};
  }
  const photos={matin:'assets/fonds/matin.png',aprem:'assets/fonds/apres-midi.png',soir:'assets/fonds/soir.png',nuit:'assets/fonds/nuit.png'};
  const builtins=[...PERIODS.flatMap(([p,label])=>[
    {id:'p-'+p,name:'Photo '+label,type:'photo',media:'image',src:photos[p],period:p,builtin:true},
    {id:'a-'+p,name:'Animation '+label,type:'illustration',media:'svg-native',src:'',period:p,builtin:true},
    {id:'m-'+p,name:'Photo en mouvement '+label,type:'photo-animee',media:'image-motion',src:photos[p],period:p,builtin:true}
  ]),{id:'v-flower',name:'Fleur qui éclot · vidéo',type:'photo-animee',media:'video',
    src:'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',period:'aprem',builtin:true}];
  const defaultPrefs=()=>({version:VERSION,mode:'auto',type:'photo',period:'matin',fixed:'p-matin',
    chosen:{},weatherSource:'city',weatherChoices:{},motion:true,custom:[]});
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
    p.mode=['auto','custom','fixed','weather'].includes(x.mode)?x.mode:'auto';
    p.type=isType(x.type)?x.type:'photo';
    p.period=isPeriod(x.period)?x.period:'matin';
    p.fixed=safeId(x.fixed)?x.fixed:'p-matin';
    p.motion=x.motion!==false;
    p.weatherSource=x.weatherSource==='gps'?'gps':'city';
    p.custom=Array.isArray(x.custom)?x.custom.map(validateItem).filter(Boolean).slice(0,60):[];
    const ids=new Set([...builtins,...p.custom].map(a=>a.id));
    p.chosen={};
    for(const [period] of PERIODS)if(ids.has(x.chosen?.[period]))p.chosen[period]=x.chosen[period];
    p.weatherChoices={};
    for(const [condition] of CONDITIONS)for(const [period] of PERIODS){
      const key=condition+':'+period;
      if(ids.has(x.weatherChoices?.[key]))p.weatherChoices[key]=x.weatherChoices[key];
    }
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
  let lastMediaSig='',lastEnabled=null,previewing=false,modalWeather='clear';
  // Coordonnées GPS en mémoire uniquement, jamais dans le profil ni localStorage.
  const gps={code:null,at:0,lastAttempt:0,pending:false,error:''};
  const catalog=()=>[...builtins,...prefs.custom];
  const find=id=>catalog().find(x=>x.id===id);
  const defaultId=(type,period)=>({photo:'p-',illustration:'a-','photo-animee':'m-'}[type]||'p-')+period;
  const currentPeriod=()=>document.querySelector('.mn-dayframe')?.dataset.mnBand||'matin';
  function conditionNow(){
    const home=typeof window.maisonneeHomeWeather==='function'?window.maisonneeHomeWeather():{};
    const usingGPS=prefs.weatherSource==='gps'&&gps.code!==null&&Date.now()-gps.at<35*60000;
    const code=usingGPS?gps.code:home.code, weather=weatherFromCode(code);
    return {...weather,code,source:usingGPS?'gps':'city',fallback:prefs.weatherSource==='gps'&&!usingGPS,
      city:home.city||'ville du foyer',stale:usingGPS?false:!!home.stale};
  }
  function currentItem(period=currentPeriod(),condition){
    let wanted;
    if(prefs.mode==='weather'){
      const cat=isCondition(condition)?condition:conditionNow().category;
      const entry=prefs.weatherChoices[cat+':'+period];
      const chosen=find(entry);
      wanted=chosen?.type===prefs.type?chosen.id:defaultId(prefs.type,period);
    }else wanted=prefs.mode==='fixed'?prefs.fixed:prefs.mode==='custom'?
      (prefs.chosen[period]||defaultId(prefs.type,period)):defaultId(prefs.type,period);
    return find(wanted)||find(defaultId('photo',period));
  }
  async function refreshGPS(force=false){
    if(prefs.mode!=='weather'||prefs.weatherSource!=='gps'||document.hidden)return;
    if(gps.pending||(!force&&Date.now()-gps.lastAttempt<15*60000))return;
    gps.lastAttempt=Date.now();gps.pending=true;gps.error='';
    try{
      if(!navigator.geolocation)throw new Error('Géolocalisation non disponible');
      const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,
        {enableHighAccuracy:false,timeout:12000,maximumAge:600000}));
      // L'emplacement précis part uniquement vers l'API météo ; il n'est pas enregistré.
      const params=new URLSearchParams({latitude:String(pos.coords.latitude),longitude:String(pos.coords.longitude),
        current:'weather_code',timezone:'auto',forecast_days:'1'});
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
      let response;
      try{response=await fetch('https://api.open-meteo.com/v1/forecast?'+params,{cache:'no-store',signal:controller.signal})}
      finally{clearTimeout(timer)}
      if(!response.ok)throw new Error('Prévisions GPS momentanément indisponibles');
      const j=await response.json(),code=Number(j.current?.weather_code);
      if(!Number.isInteger(code)||weatherFromCode(code).category==='unknown')throw new Error('Conditions météo non reconnues');
      gps.code=code;gps.at=Date.now();
    }catch(e){gps.code=null;gps.error=e?.code===1?'Accès à la position refusé':String(e.message||'Position indisponible');}
    finally{gps.pending=false;lastMediaSig='';void apply(document);draw();}
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
  async function apply(root=document){
    hydrate();
    const frame=root.querySelector?.('.mn-dayframe')||(root.matches?.('.mn-dayframe')?root:null);
    if(!frame)return;
    if(prefs.mode==='weather'&&prefs.weatherSource==='gps')void refreshGPS();
    const period=frame.dataset.mnBand||'matin',forecast=prefs.mode==='weather'?conditionNow():null;
    const category=forecast?.category||'none',item=currentItem(period,category),moving=effectiveMotion();
    const sig=[item.id,period,moving,document.hidden,category,forecast?.code??'',forecast?.source??''].join('|');
    if(sig===lastMediaSig&&frame.dataset.mnBgItem===item.id)return;
    lastMediaSig=sig;
    frame.dataset.mnBgItem=item.id;
    frame.dataset.mnBgWeather=category;
    frame.dataset.mnBgStrength=forecast?.intensity||'normal';
    frame.dataset.mnBgArt=item.media==='svg-native'?item.period:'';
    frame.classList.toggle('mn-bg-illustration',item.media==='svg-native');
    frame.classList.toggle('mn-bg-motion-off',!moving);
    // Effets dans le bandeau, toujours derrière le texte (et sans clic capturé).
    const hero=frame.querySelector('.ultimate-hero');
    if(hero&&!hero.querySelector(':scope > .mn-bg-sky-fx')){
      const fx=document.createElement('div');fx.className='mn-bg-sky-fx';fx.setAttribute('aria-hidden','true');
      hero.insertBefore(fx,hero.querySelector('.mn-band-copy'));
    }
    const l=layer(frame);
    l.replaceChildren();
    if(category!=='none'&&category!=='unknown'){
      const atmosphere=document.createElement('div');atmosphere.className='mn-bg-weather-fx';
      atmosphere.setAttribute('aria-hidden','true');l.appendChild(atmosphere);
    }
    // Sans personnalisation : conserver exactement le fond photo d'origine,
    // sans calque supplémentaire ni changement d'opacité.
    if(prefs.mode!=='weather'&&item.builtin&&item.media==='image'&&item.id==='p-'+period){
      l.style.display='none';
      frame.style.removeProperty('background-image');
      return;
    }
    l.style.display='';
    if(item.media==='svg-native'){
      frame.style.setProperty('background-image','none','important');
      return;
    }
    frame.style.removeProperty('background-image');
    const imageFallback=photos[period];
    if(item.media==='video'){
      if(!moving||document.hidden){
        const still=document.createElement('div');still.className='mn-bg-photo';
        still.style.backgroundImage='url("'+imageFallback+'")';l.appendChild(still);
        return;
      }
      const video=document.createElement('video');
      video.className='mn-bg-video';
      video.autoplay=moving&&!document.hidden;video.muted=true;video.loop=true;video.playsInline=true;
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
    const wanted=prefs.mode==='weather'?
      (prefs.weatherChoices[modalWeather+':'+modalPeriod]||defaultId(prefs.type,modalPeriod)):
      (prefs.mode==='fixed'?prefs.fixed:prefs.chosen[modalPeriod]||defaultId(prefs.type,modalPeriod));
    const chosen=wanted===item.id;
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
  function currentPreview(){
    const item=currentItem(modalPeriod,modalWeather);
    const cond=prefs.mode==='weather'?' data-mn-bg-preview-weather="'+esc(modalWeather)+'"':'';
    const label=PERIODS.find(x=>x[0]===modalPeriod)?.[1]||'Matin';
    const intro=modalPeriod==='matin'?'Bonjour':modalPeriod==='aprem'?'Bel après-midi':
      modalPeriod==='soir'?'Bonsoir':'Bonne nuit';
    const labelWeather=prefs.mode==='weather'?CONDITIONS.find(x=>x[0]===modalWeather)?.[1]+' · ':'';
    const text='<span class="mn-bg-preview-caption">'+intro+' · '+esc(labelWeather)+esc(item.name)+'</span>';
    if(item.media==='svg-native'){
      return '<div class="mn-bg-live-preview mn-bg-preview-art mn-bg-mini-'+esc(modalPeriod)+'"'+cond+'><span class="mn-bg-preview-star">✦</span>'+text+'</div>';
    }
    if(item.media==='video'){
      return '<div class="mn-bg-live-preview"'+cond+'>'+
        '<video data-mn-bg-preview-video="'+esc(item.id)+'" muted loop autoplay playsinline preload="metadata" poster="'+esc(photos[modalPeriod])+'"'+
        (!item.local?' src="'+esc(item.src)+'"':'')+'></video>'+text+'</div>';
    }
    const moving=item.media==='image-motion'&&effectiveMotion();
    return '<div class="mn-bg-live-preview"'+cond+'><div class="mn-bg-preview-photo'+(moving?' mn-bg-preview-moving':'')+'"'+
      (item.local?' data-mn-bg-preview-local="'+esc(item.id)+'"':
      ' style="background-image:url(&quot;'+esc(item.src)+'&quot;)"')+'></div>'+text+'</div>';
  }
  function weatherStatus(){
    const snapshot=conditionNow(),name=CONDITIONS.find(x=>x[0]===snapshot.category)?.[1]||'indisponible';
    const time=snapshot.stale?' (dernière prévision)':'';
    if(prefs.weatherSource==='gps'){
      if(gps.pending)return 'Recherche de la météo à la position actuelle…';
      if(snapshot.source==='gps')return 'Position actuelle : '+name+'. Dernière lecture GPS : '+new Date(gps.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'.';
      return (gps.error?gps.error+'. ':'Position GPS non renseignée. ')+
        'Repli sur '+snapshot.city+' : '+name+time+'.';
    }
    return snapshot.city+' : '+name+time+'.';
  }
  function html(){
    const kind=modalType,all=catalog().filter(x=>x.type===kind);
    const typelabel=TYPES.find(t=>t[0]===kind)?.[1]||'Photos';
    return '<div class="mn-bg-lib">'+
      '<p class="muted small">Personnalise le fond derrière la météo. Les textes et les prévisions restent inchangés.</p>'+
      '<div class="mn-bg-tabs" role="tablist" aria-label="Type de fonds">'+TYPES.map(([id,name])=>
        '<button type="button" role="tab" aria-selected="'+(id===kind)+'" data-mn-bg-act="type" data-v="'+id+'">'+name+'</button>').join('')+'</div>'+
      '<div class="mn-bg-mode"><label class="field"><span class="label">Affichage</span><select class="input" data-mn-bg-mode>'+
        [['auto','Automatique selon l’heure'],['weather','Météo réelle (heure + conditions)'],['custom','Choisir chaque période'],['fixed','Un seul fond toute la journée']].map(([k,v])=>
          '<option value="'+k+'"'+(prefs.mode===k?' selected':'')+'>'+v+'</option>').join('')+'</select></label></div>'+
      (prefs.mode==='weather'?
        '<div class="mn-bg-weather-settings"><label class="field"><span class="label">Météo de référence</span>'+
        '<select class="input" data-mn-bg-source>'+
        '<option value="city"'+(prefs.weatherSource==='city'?' selected':'')+'>Ville météo de Maisonnée</option>'+
        '<option value="gps"'+(prefs.weatherSource==='gps'?' selected':'')+'>Position de cet appareil (GPS)</option></select></label>'+
        '<p class="muted small" role="status">'+esc(weatherStatus())+'</p>'+
        (prefs.weatherSource==='gps'?'<button type="button" class="btn" data-mn-bg-act="refreshWeather">Actualiser ma météo GPS</button>':'')+
        '<p class="muted small">GPS facultatif, utilisé seulement pour la météo du fond. Coordonnées envoyées à Open-Meteo sans être enregistrées dans Maisonnée.</p>'+
        '<b class="mn-bg-settings-label">Prévisualiser une condition</b>'+
        '<div class="mn-bg-conditions" role="group" aria-label="Conditions à personnaliser">'+CONDITIONS.map(([id,label])=>
          '<button type="button" data-mn-bg-act="condition" data-v="'+id+'" aria-pressed="'+(modalWeather===id)+'">'+label+'</button>').join('')+'</div></div>':'')+
      '<div class="mn-bg-periods" aria-label="Période à personnaliser">'+PERIODS.map(([id,name])=>
        '<button type="button" data-mn-bg-act="period" data-v="'+id+'" aria-pressed="'+(id===modalPeriod)+'">'+name+'</button>').join('')+'</div>'+
      '<p class="mn-bg-help">'+(prefs.mode==='weather'?
        'Le temps actuel choisit automatiquement les effets ; cette sélection règle le fond pour la condition et l’heure affichées.':
        prefs.mode==='auto'?'Le fond suit automatiquement le moment de la journée. Choisis un fond pour personnaliser cette période.':
        prefs.mode==='fixed'?'Le fond choisi sera utilisé toute la journée.':'Sélectionne un fond différent pour chaque période.')+'</p>'+
      currentPreview()+
      '<div class="mn-bg-gallery" role="group" aria-label="'+esc(typelabel)+'">'+all.map(tile).join('')+'</div>'+
      '<label class="mn-bg-motion-label"><input type="checkbox" data-mn-bg-motion '+(prefs.motion?'checked':'')+'> Autoriser les animations (si l’appareil le permet)</label>'+
      '<details class="mn-bg-add" '+(addOpen?'open':'')+'><summary>＋ Ajouter à la bibliothèque « '+esc(typelabel)+' »</summary>'+
      '<form data-mn-bg-url-form><label class="field"><span class="label">Nom du fond</span><input class="input" required maxlength="70" name="name" placeholder="Ex. Ciel d’été"></label>'+
      '<label class="field"><span class="label">Adresse directe du fichier (https)</span><input class="input" type="url" required name="url" placeholder="'+(kind==='photo-animee'?'https://…/video.mp4':'https://…/image.webp')+'"></label>'+
      '<button type="submit" class="btn primary block">Ajouter cette adresse</button></form>'+
      '<div class="mn-bg-separator">ou depuis cet appareil</div>'+
      '<label class="mn-bg-upload btn">Importer un fichier '+(kind==='photo-animee'?'MP4, WebM, GIF ou photo':'image (JPG, PNG, WebP, GIF)')+
        '<input type="file" data-mn-bg-file accept="'+(kind==='photo-animee'?'image/*,video/mp4,video/webm':'image/png,image/jpeg,image/webp,image/gif,image/avif')+'"></label>'+
      '<p class="muted small">Fichiers importés : disponibles hors ligne sur cet appareil. Les liens Web et les réglages se synchronisent avec ton compte ; les fichiers personnels restent locaux.</p></details>'+
      '<p class="muted small mn-bg-foot">Bibliothèque V1 · 4 fonds par catégorie, plus une vidéo libre de démonstration · JPG, PNG, WebP, GIF, MP4 et WebM.</p>'+
      '<button type="button" class="btn primary block" data-mn-bg-act="done">Terminé</button></div>';
  }
  function draw(){
    const host=document.querySelector('#sheetIn [data-mn-bg-library]');
    if(!host)return;
    const scroll=document.querySelector('#sheetIn')?.scrollTop||0;
    host.innerHTML=html();
    requestAnimationFrame(()=>{const el=document.querySelector('#sheetIn');if(el)el.scrollTop=scroll;});
    host.querySelectorAll('[data-mn-bg-preview-local]').forEach(async element=>{
      const item=find(element.dataset.mnBgPreviewLocal),src=await mediaSrc(item);
      if(element.isConnected&&src)element.style.backgroundImage='url("'+src.replace(/"/g,'%22')+'")';
    });
    host.querySelectorAll('[data-mn-bg-preview-video]').forEach(async element=>{
      const item=find(element.dataset.mnBgPreviewVideo);
      if(!item||!effectiveMotion()){element.pause();return;}
      const src=await mediaSrc(item);
      if(!element.isConnected||!src)return;
      if(!element.src)element.src=src;
      element.play().catch(()=>{});
    });
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
    const actual=conditionNow().category;
    modalWeather=isCondition(actual)?actual:'clear';
    if(prefs.mode==='weather'&&prefs.weatherSource==='gps')void refreshGPS();
    openSheet('Bibliothèque des fonds','<div data-mn-bg-library></div>');
    draw();
  }
  const makeId=()=>('user_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)).toLowerCase();
  function addItem(item){
    const checked=validateItem(item);
    if(!checked)throw new Error('Format ou adresse non valide.');
    prefs.custom=[...prefs.custom,checked].slice(-60);
    prefs.type=checked.type;
    if(prefs.mode==='weather')prefs.weatherChoices[modalWeather+':'+modalPeriod]=checked.id;
    else if(prefs.mode==='fixed')prefs.fixed=checked.id;
    else {prefs.mode='custom';prefs.chosen[modalPeriod]=checked.id;}
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
    if(action==='condition'&&isCondition(v)){modalWeather=v;draw();return}
    if(action==='refreshWeather'){gps.lastAttempt=0;void refreshGPS(true);draw();return}
    if(action==='choose'){
      const item=find(id);if(!item)return;
      previewPeriod(modalPeriod);
      if(prefs.mode==='fixed')prefs.fixed=item.id;
      else if(prefs.mode==='weather')prefs.weatherChoices[modalWeather+':'+modalPeriod]=item.id;
      else {prefs.mode='custom';prefs.chosen[modalPeriod]=item.id}
      prefs.type=modalType;persist();draw();return;
    }
    if(action==='remove'){
      const item=prefs.custom.find(x=>x.id===id);if(!item||!confirm('Supprimer « '+item.name+' » de la bibliothèque ?'))return;
      prefs.custom=prefs.custom.filter(x=>x.id!==id);
      for(const [period]of PERIODS)if(prefs.chosen[period]===id)delete prefs.chosen[period];
      for(const key of Object.keys(prefs.weatherChoices))if(prefs.weatherChoices[key]===id)delete prefs.weatherChoices[key];
      if(prefs.fixed===id)prefs.fixed='p-matin';
      if(item.local){await dbRun('delete',id).catch(()=>{});const old=objectUrls.get(id);if(old)URL.revokeObjectURL(old);objectUrls.delete(id)}
      persist();draw();
    }
  });
  document.addEventListener('change',async e=>{
    const el=e.target;
    if(el.matches('[data-mn-bg-mode]')){
      prefs.mode=['auto','weather','custom','fixed'].includes(el.value)?el.value:'auto';
      persist();if(prefs.mode==='weather'&&prefs.weatherSource==='gps')void refreshGPS();
      draw();return;
    }
    if(el.matches('[data-mn-bg-source]')){
      prefs.weatherSource=el.value==='gps'?'gps':'city';
      gps.error='';persist();
      if(prefs.weatherSource==='gps')void refreshGPS(true);
      draw();return;
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
  // Réglage accessible dans Ma famille, pas sur le bandeau météo.
  // Seule la vue existante est étendue ; aucune autre navigation n'est remplacée.
  if(typeof VIEWS!=='undefined'&&typeof VIEWS.foyer==='function'){
    const originalFamilyView=VIEWS.foyer;
    VIEWS.foyer=function(){
      const original=originalFamilyView.apply(this,arguments);
      const panel='<h2>Personnalisation de l’accueil</h2>'+
        '<div class="card mn-bg-family-card">'+
        '<div class="mn-bg-family-desc"><strong>Fonds d’écran</strong>'+
        '<p class="muted small">Photos, animations et photos animées. Choisissez un fond pour chaque moment de la journée.</p></div>'+
        '<button type="button" class="btn mn-bg-family-action" data-mn-bg-act="open">Choisir les fonds</button>'+
        '</div>';
      return original.includes('<h2>Membres</h2>')?
        original.replace('<h2>Membres</h2>',panel+'<h2>Membres</h2>'):original+panel;
    };
  }
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
    weatherChanged(){lastMediaSig='';void apply(document);draw()},
    // API catalogue compatible avec les trois types existants.
    register(item){addItem(item)}};
})();