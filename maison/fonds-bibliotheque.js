/* Maisonnée — bibliothèque de fonds (production).
   Fonds horaires et météo : photos, animations, photos animées, vidéos.
   Les médias personnels importés restent dans IndexedDB de cet appareil. */
(()=>{'use strict';
  const VERSION=2, KEY='mn_bg_library_v1', DB='mn-background-media-v1', STORE='files';
  // Mode allégé : kiosque Pixar, et tablette / tactile (Ken Burns + vidéo font ramer le scroll).
  const PIXAR_KIOSK_LITE=window.self!==window.top&&new URLSearchParams(location.search).get('pixar_kiosk')==='1';
  function deviceLite(){
    try{
      const touch=(navigator.maxTouchPoints||0)>=1;
      const compact=Math.min(screen.width||9999,screen.height||9999)<=1366;
      return PIXAR_KIOSK_LITE||(touch&&compact)||matchMedia('(pointer: coarse)').matches||matchMedia('(hover: none)').matches;
    }catch(_){return PIXAR_KIOSK_LITE}
  }
  const PERIODS=[['matin','Matin'],['aprem','Après-midi'],['soir','Soir'],['nuit','Nuit']];
  const TYPES=[['photo','Photos'],['illustration','Animations'],['photo-animee','Photos animées'],['video','Vidéos']];
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
  // Vidéos paysagères libres choisies par moment de la journée.
  // Wikimedia Commons : URL de redirection vers le fichier originel, crédits et licence conservés.
  // Aucun média n'est téléchargé tant qu'il n'est pas sélectionné.
  function commonsVideo(id,name,file,period,weather,author,license){
    const filename=file.replace(/ /g,'_');
    const source='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(filename);
    return {id,name,type:'video',media:'video',period,weather,builtin:true,
      src:'https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(filename),
      source,author,license};
  }
  const LANDSCAPE_VIDEOS=[
    commonsVideo('wm-aube-plage','Lever de soleil sur la plage','Sunrise timelapse.webm','matin','clear','James West','CC BY-SA 2.0'),
    commonsVideo('wm-aube-lumiere','Premières lueurs du jour','Sunrise time lapse.webm','matin','clear','Aravind Samala','CC BY 2.0'),
    commonsVideo('wm-matin-nuages','Nuages du matin · montagne','Machu Picchu Timelapse—Cloudy Morning 02.webm','matin','clouds','Subhashish Panigrahi','CC BY-SA 4.0'),
    commonsVideo('wm-matin-brume','Brume sur les montagnes','Fog covering mountain time lapse.webm','matin','fog','Athulvis','CC BY-SA 4.0'),
    commonsVideo('wm-midi-nuages','Ciel nuageux du Doubs','Clouds Time Lapse.webm','aprem','clouds','madlag','CC BY-SA 2.0'),
    commonsVideo('wm-midi-ciel','Nuages qui défilent','Clouds (time lapse).webm','aprem','clouds','Editor','CC BY 3.0'),
    commonsVideo('wm-midi-pluie','Pluie et nuages','Rain and cloud.webm','aprem','rain','FAYAZ SHUJA','CC BY-SA 4.0'),
    commonsVideo('wm-midi-averse','Grosse averse','Rainfall.webm','aprem','rain','Swantata','CC BY-SA 4.0'),
    commonsVideo('wm-soir-nuages','Nuages au coucher du soleil','Clouds at sunset (time lapse).webm','soir','clouds','Editor','CC BY 3.0'),
    commonsVideo('wm-soir-horizon','Crépuscule orangé','Time Lapse Sunset (HD 720p).webm','soir','clear','mockmoon2000','CC BY 3.0'),
    commonsVideo('wm-soir-dore','Coucher de soleil doré','Free HD Stock Video - Time lapse sunset (see description for HQ download).webm','soir','clear','Johann Mynhardt','CC BY 3.0'),
    commonsVideo('wm-nuit-etoiles','Nuit étoilée','Star Timelapse.webm','nuit','clear','John Fowler','CC BY 2.0'),
    commonsVideo('wm-nuit-filante','Étoile filante','Short Time-lapse Video of Stars including a Shooting Star.webm','nuit','clear','Kai Bader','CC BY 3.0'),
    commonsVideo('wm-nuit-polaire','Étoile polaire','Starry sky with North Star circled.webm','nuit','clear','Thomas Bresson','CC BY 3.0'),
    // Sélection additionnelle : fichiers identifiés sur Wikimedia Commons.
    commonsVideo('wm2-aube-fog','Aube brumeuse en ville','Rotunda-And-Lawn-Foggy-Sunrise-Timelapse.webm','matin','fog','JuxtaposedJacob','CC0'),
    commonsVideo('wm2-matin-fog-park','Brume dans un parc','Fog in a park in London.webm','matin','fog','David Holt','CC BY-SA 2.0'),
    commonsVideo('wm2-matin-fog-mountain','Brume des montagnes','Montoj apud Maĉupikĉuo.webm','matin','fog','RG72','CC BY-SA 4.0'),
    commonsVideo('wm2-aprem-snow','Tempête de neige','Snowstorm2021.webm','aprem','snow','WarDestroyer88','CC BY-SA 4.0'),
    commonsVideo('wm2-aprem-thunder','Orage sur Versailles','Orage 2014 06 08.webm','aprem','storm','totoz','CC BY 3.0'),
    commonsVideo('wm2-soir-stormclouds','Nuages avant l’orage','Cloudy sunset on the edge of small town. HD 1080p Timelapse (video).webm','soir','storm','Sparkus Design','CC BY 2.0'),
    commonsVideo('wm2-nuit-lightning','Éclairs dans la nuit','Lightnings 2016 05 21 - Massy.webm','nuit','storm','François Varas-Genestier','CC BY 3.0'),
    commonsVideo('wm2-nuit-snow','Neige nocturne','Heavy snow in Xinyang at night.webm','nuit','snow','Fumikas Sagisavas','CC BY 4.0')
  ];
  // Photographies réelles : CSS Ken Burns + effets de météo existants.
  // Les liens en largeur 1280/320 limitent la bande passante sur iPhone.
  function commonsMotion(id,name,file,period,weather,author,license){
    const filename=file.replace(/ /g,'_');
    const fileUrl='https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(filename);
    return {id,name,type:'photo-animee',media:'image-motion',period,weather,builtin:true,
      src:fileUrl+'?width=1280',thumb:fileUrl+'?width=320',
      source:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(filename),author,license};
  }
  const LANDSCAPE_MOTION=[
    commonsMotion('im-aube-soleil','Soleil dans la forêt','Sunrise at forest.jpg','matin','clear','YoshiniSivakumar 123','CC BY-SA 4.0'),
    commonsMotion('im-matin-brume','Forêt au petit matin','Foggy Forest (29705040580).jpg','matin','fog','Daniel Walker','CC BY-SA 2.0'),
    commonsMotion('im-matin-nuages','Nuages et premiers rayons','A Cloudy sky.jpg','matin','clouds','Priscilleluc','CC BY-SA 4.0'),
    commonsMotion('im-matin-pluie','Gouttes du matin','Rainy window.jpg','matin','rain','Minesshubham','CC BY-SA 4.0'),
    commonsMotion('im-aprem-nuages','Grand ciel bleu nuageux','Blue Cloudy Sky.jpg','aprem','clouds','Akthakur255','CC BY-SA 4.0'),
    commonsMotion('im-aprem-orage','Éclair dans le ciel','Lightning Illuminated Storm.jpg','aprem','storm','Stefan Klein','CC BY-SA 4.0'),
    commonsMotion('im-aprem-neige','Chemin forestier enneigé','Snowy Forest Track.jpg','aprem','snow','Sudzie','CC BY-SA 4.0'),
    commonsMotion('im-aprem-pluie','Gouttes sur la vitre','Rain Water Drops.jpg','aprem','rain','Lawanga Ranwala','CC BY-SA 4.0'),
    commonsMotion('im-soir-soleil','Coucher de soleil orangé','Orange Sunset & Clouds.jpg','soir','clear','Aryan Patidar','CC BY 4.0'),
    commonsMotion('im-soir-nuages','Nuages du crépuscule','Orange sunset Clouds.jpg','soir','clouds','Noah Wulf','CC BY-SA 4.0'),
    commonsMotion('im-soir-pluie','Pluie en fin de journée','Rain Droplets.jpg','soir','rain','Tony5875','CC BY-SA 4.0'),
    commonsMotion('im-nuit-etoiles','Ciel étoilé et constellation','Starry night 2025.jpg','nuit','clear','Talesofaviewfinder','CC BY-SA 4.0'),
    commonsMotion('im-nuit-pluie','Reflets de pluie en ville','Late night Rain City.jpg','nuit','rain','MunixShadow','CC BY 4.0'),
    commonsMotion('im-nuit-brouillard','Forêt brumeuse nocturne','Cold and foggy forest.jpg','nuit','fog','Allancarvlho','CC BY-SA 4.0')
  ];
  const licenseUrl=code=>{
    const m=String(code||'').match(/^CC BY(-SA)? ([\d.]+)$/);
    return m?'https://creativecommons.org/licenses/by'+(m[1]?'-sa':'')+'/'+m[2]+'/':'';
  };
  const builtins=[...PERIODS.flatMap(([p,label])=>[
    {id:'p-'+p,name:'Photo '+label,type:'photo',media:'image',src:photos[p],period:p,builtin:true},
    {id:'a-'+p,name:'Animation '+label,type:'illustration',media:'svg-native',src:'',period:p,builtin:true},
    {id:'m-'+p,name:'Photo en mouvement '+label,type:'photo-animee',media:'image-motion',src:photos[p],period:p,builtin:true}
  ]),{id:'v-flower',name:'Fleur qui éclot · vidéo',type:'video',media:'video',
    src:'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',period:'aprem',builtin:true,weather:'clear',author:'MDN',license:'CC0'} ,
  ...LANDSCAPE_VIDEOS,...LANDSCAPE_MOTION];
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
    // Les anciennes vidéos enregistrées dans « Photos animées » deviennent des « Vidéos ».
    const type=item?.media==='video'&&item?.type==='photo-animee'?'video':item?.type;
    if(!item||!safeId(item.id)||!isType(type)||!item.name||item.name.length>70)return null;
    if(!['image','image-motion','video','svg-native'].includes(item.media))return null;
    if(item.media==='svg-native')return null; // seules les 4 illustrations intégrées sont autorisées
    if((item.media==='video')!==(type==='video'))return null;
    if(type==='photo-animee'&&item.media!=='image-motion')return null;
    const local=!!item.local;
    if(local&&!/^user_[a-z0-9_-]+$/.test(item.id))return null;
    const src=local?'':safeUrl(item.src,item.media==='video'?'video':'image');
    if(!src&&!local)return null;
    return {id:item.id,name:String(item.name).slice(0,70),type,media:item.media,src,period:isPeriod(item.period)?item.period:'matin',local,builtin:false};
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
    const items=[...builtins,...p.custom];
    const ids=new Set(items.map(a=>a.id));
    // Migration des réglages existants sans supprimer les sélections ni les fichiers.
    if(Number(x.version||1)<2&&x.type==='photo-animee'){
      const selected=[x.fixed,...Object.values(x.chosen||{}),...Object.values(x.weatherChoices||{})];
      const hasVideo=selected.some(id=>items.some(item=>item.id===id&&item.media==='video'));
      const hasMotion=selected.some(id=>items.some(item=>item.id===id&&item.media==='image-motion'));
      if(((p.mode==='auto'||p.mode==='weather')&&!hasMotion)||hasVideo)p.type='video';
    }
    // Normaliser les anciens choix, puis replacer les vidéos enregistrées
    // dans une mauvaise plage sur leur horaire d'origine.
    const entry=id=>items.find(item=>item.id===id);
    p.chosen={};
    for(const [period] of PERIODS){
      const id=x.chosen?.[period],item=entry(id);
      if(item&&(item.type!=='video'||item.period===period))p.chosen[period]=id;
    }
    for(const [period] of PERIODS){
      const id=x.chosen?.[period],item=entry(id);
      if(item?.type==='video'&&item.period!==period&&!p.chosen[item.period])p.chosen[item.period]=id;
    }
    p.weatherChoices={};
    for(const [condition] of CONDITIONS)for(const [period] of PERIODS){
      const key=condition+':'+period,id=x.weatherChoices?.[key],item=entry(id);
      if(item&&(item.type!=='video'||item.period===period))p.weatherChoices[key]=id;
    }
    for(const [condition] of CONDITIONS)for(const [period] of PERIODS){
      const id=x.weatherChoices?.[condition+':'+period],item=entry(id);
      if(item?.type!=='video'||item.period===period)continue;
      const destination=condition+':'+item.period;
      if(!p.weatherChoices[destination])p.weatherChoices[destination]=id;
    }
    if(!ids.has(p.fixed))p.fixed='p-matin';
    // Ancien « fond fixe » vidéo : réaffecter la vidéo à son horaire au lieu
    // de la diffuser pendant toute la journée. Les autres plages restent auto.
    if(p.type==='video'&&p.mode==='fixed'){
      const fixedItem=items.find(item=>item.id===p.fixed&&item.type==='video');
      if(fixedItem)p.chosen[fixedItem.period]=fixedItem.id;
      p.mode='custom';
    }
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
  const defaultId=(type,period)=>type==='video'?recommendedVideo(period):
    type==='photo-animee'?recommendedMotion(period):
    (({photo:'p-',illustration:'a-'}[type]||'p-')+period);
  // Courtes vidéos de référence pour le mode automatique : une par période.
  const AUTO_VIDEO={matin:'wm-aube-plage',aprem:'wm-midi-nuages',soir:'wm-soir-dore',nuit:'wm-nuit-filante'};
  function recommendedVideo(period,weather){
    const exact=LANDSCAPE_VIDEOS.find(v=>v.period===period&&v.weather===weather);
    return exact?.id||AUTO_VIDEO[period]||'v-flower';
  }
  const AUTO_MOTION={matin:'im-aube-soleil',aprem:'im-aprem-nuages',soir:'im-soir-soleil',nuit:'im-nuit-etoiles'};
  function recommendedMotion(period,weather){
    const exact=LANDSCAPE_MOTION.find(v=>v.period===period&&v.weather===weather);
    return exact?.id||AUTO_MOTION[period]||'m-'+period;
  }
  const currentPeriod=()=>document.querySelector('.mn-dayframe')?.dataset.mnBand||window.mnJour?.at?.(new Date())?.id||'matin';
  // Verrouillage : une vidéo ne peut être diffusée que dans sa propre plage
  // horaire (matin 5-11, après-midi 11-18, soir 18-22, nuit 22-5).
  const isAllowedAt=(item,period)=>!!item&&(item.type!=='video'||item.period===period);
  const validChoice=(item,period)=>isAllowedAt(item,period)&&item.type===prefs.type;
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
      wanted=validChoice(chosen,period)?chosen.id:prefs.type==='video'?
        recommendedVideo(period,cat):prefs.type==='photo-animee'?
        recommendedMotion(period,cat):defaultId(prefs.type,period);
    }else if(prefs.mode==='fixed'){
      const fixed=find(prefs.fixed);
      wanted=validChoice(fixed,period)?fixed.id:defaultId(prefs.type,period);
    }else if(prefs.mode==='custom'){
      const chosen=find(prefs.chosen[period]);
      wanted=validChoice(chosen,period)?chosen.id:defaultId(prefs.type,period);
    }else wanted=defaultId(prefs.type,period);
    // Dernière barrière de sécurité contre une ancienne sélection incorrecte.
    const candidate=find(wanted);
    if(isAllowedAt(candidate,period))return candidate;
    const fallback=find(prefs.type==='video'?recommendedVideo(period):defaultId(prefs.type,period));
    return isAllowedAt(fallback,period)?fallback:find('p-'+period);
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
  function effectiveMotion(){return !deviceLite()&&prefs.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches}
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
    if(hero&&!deviceLite()&&!hero.querySelector(':scope > .mn-bg-sky-fx')){
      const fx=document.createElement('div');fx.className='mn-bg-sky-fx';fx.setAttribute('aria-hidden','true');
      hero.insertBefore(fx,hero.querySelector('.mn-band-copy'));
    }
    const l=layer(frame);
    l.replaceChildren();
    if(!deviceLite()&&category!=='none'&&category!=='unknown'){
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
      if(moving&&!document.hidden)video.play().catch(()=>{
        if(!video.isConnected)return;
        const still=document.createElement('div');
        still.className='mn-bg-photo';
        still.style.backgroundImage='url("'+imageFallback+'")';
        video.replaceWith(still);
      });
      else video.pause();
    }else{
      const still=document.createElement('div');
      still.className='mn-bg-photo'+(item.media==='image-motion'&&moving?' mn-bg-kenburns':'');
      l.appendChild(still);
      const url=await mediaSrc(item);
      if(frame.dataset.mnBgItem!==item.id||!still.isConnected)return;
      // URL externe ou fichier iPhone indisponible : fond d'origine conservé.
      // La deuxième couche garantit un fond si l'image distante échoue sur iPhone.
      const mainUrl=(url||imageFallback).replace(/"/g,'%22');
      still.style.backgroundImage='url("'+mainUrl+'"),url("'+imageFallback+'")';
    }
  }
  function tile(item){
    const wanted=currentItem(modalPeriod,prefs.mode==='weather'?modalWeather:undefined).id;
    const chosen=wanted===item.id;
    const selected=chosen?' is-selected':'';
    let visual;
    if(item.media==='svg-native'){
      visual='<div class="mn-bg-mini-art mn-bg-mini-'+esc(item.period)+'">✦</div>';
    }else if(item.local){
      visual='<div class="mn-bg-mini-art mn-bg-mini-local" data-mn-bg-thumb="'+esc(item.id)+'">▧</div>';
    }else if(item.media==='video'){
      // Miniature locale : aucune vidéo n'est chargée dans les grilles.
      visual='<div class="mn-bg-mini-art mn-bg-mini-video" style="background-image:url(&quot;'+
        esc(photos[item.period]||photos.aprem)+'&quot;)"><span>▶</span></div>';
    }else{
      visual='<img loading="lazy" decoding="async" alt="" src="'+esc(item.thumb||item.src)+'">';
    }
    return '<div class="mn-bg-tile'+selected+'"><button type="button" class="mn-bg-tile-pick" data-mn-bg-act="choose" data-id="'+esc(item.id)+'">'+
      '<span class="mn-bg-tile-preview">'+visual+'</span><span class="mn-bg-tile-name">'+esc(item.name)+'</span>'+
      '<span class="mn-bg-tile-type">'+(chosen?'✓ Sélectionné · ':'')+
      (item.media==='video'?'Vidéo · '+(PERIODS.find(x=>x[0]===item.period)?.[1]||''):
       item.media==='image-motion'?'Mouvement doux':item.media==='svg-native'?'Illustration SVG':'Photographie')+
      (item.weather?' · '+(CONDITIONS.find(x=>x[0]===item.weather)?.[1]||''):'')+'</span></button>'+
      (item.source&&item.author?
        '<span class="mn-bg-video-credit">'+esc(item.author)+' · '+
        '<a target="_blank" rel="noopener noreferrer" href="'+esc(item.source)+'">Source</a>'+
        (licenseUrl(item.license)?' · <a target="_blank" rel="noopener noreferrer" href="'+esc(licenseUrl(item.license))+'">'+esc(item.license)+'</a>':'')+
        '</span>':'')+
      (!item.builtin?'<button type="button" class="mn-bg-delete" data-mn-bg-act="remove" data-id="'+esc(item.id)+'" aria-label="Supprimer '+esc(item.name)+'">×</button>':'')+
      '</div>';
  }
  function currentPreview(){
    const item=currentItem(modalPeriod,modalWeather);
    const cond=prefs.mode==='weather'?' data-mn-bg-preview-weather="'+esc(modalWeather)+'"':'';
    const label=PERIODS.find(x=>x[0]===modalPeriod)?.[1]||'Matin';
    const intro=modalPeriod==='matin'?'Bonjour':modalPeriod==='aprem'?'Bel après-midi':
      modalPeriod==='soir'?'Bonsoir':'Bonne nuit';
    const weatherLabel=modalPeriod==='nuit'&&modalWeather==='clear'?'Ciel dégagé':
      (CONDITIONS.find(x=>x[0]===modalWeather)?.[1]||'Météo');
    const labelWeather=prefs.mode==='weather'?weatherLabel+' · ':'';
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
    const snapshot=conditionNow(),name=snapshot.category==='clear'&&currentPeriod()==='nuit'?'Ciel dégagé':
      (CONDITIONS.find(x=>x[0]===snapshot.category)?.[1]||'indisponible');
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
          '<option value="'+k+'"'+(prefs.mode===k?' selected':'')+(k==='fixed'&&kind==='video'?' disabled':'')+'>'+v+'</option>').join('')+'</select></label></div>'+
      (kind==='video'?'<p class="mn-bg-lock-help">Vidéos verrouillées par horaire : matin 5–11 h, après-midi 11–18 h, soir 18–22 h, nuit 22–5 h. Une vidéo choisie dans une autre période lui sera réservée.</p>':'')+
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
        prefs.mode==='auto'?(prefs.type==='video'?'Une véritable vidéo est choisie automatiquement selon l’heure. Pour choisir chaque vidéo, passez en mode personnalisé.':
          prefs.type==='photo-animee'?'Une photo à mouvement doux est choisie selon l’heure.':
          'Le fond suit automatiquement le moment de la journée. Choisis un fond pour personnaliser cette période.'):
        prefs.mode==='fixed'?'Le fond choisi sera utilisé toute la journée.':'Sélectionne un fond différent pour chaque période.')+'</p>'+
      currentPreview()+
      (kind==='video'||kind==='photo-animee'?
        '<div class="mn-bg-video-groups">'+
          PERIODS.map(([period,label])=>{
            const group=all.filter(x=>x.period===period);
            return '<section class="mn-bg-video-group" aria-label="'+esc(label)+'">'+
              '<h3>'+esc(label)+' <small>'+group.length+' choix</small></h3>'+
              '<div class="mn-bg-gallery" role="group">'+group.map(tile).join('')+'</div>'+
            '</section>';
          }).join('')+'</div>':
        '<div class="mn-bg-gallery" role="group" aria-label="'+esc(typelabel)+'">'+all.map(tile).join('')+'</div>')+
      '<label class="mn-bg-motion-label"><input type="checkbox" data-mn-bg-motion '+(prefs.motion?'checked':'')+'> Autoriser les animations (si l’appareil le permet)</label>'+
      '<details class="mn-bg-add" '+(addOpen?'open':'')+'><summary>＋ Ajouter à la bibliothèque « '+esc(typelabel)+' »</summary>'+
      '<form data-mn-bg-url-form><label class="field"><span class="label">Nom du fond</span><input class="input" required maxlength="70" name="name" placeholder="Ex. Ciel d’été"></label>'+
      '<label class="field"><span class="label">Adresse directe du fichier (https)</span><input class="input" type="url" required name="url" placeholder="'+(kind==='video'?'https://…/video.mp4':'https://…/image.webp')+'"></label>'+
      '<button type="submit" class="btn primary block">Ajouter cette adresse</button></form>'+
      '<div class="mn-bg-separator">ou depuis cet appareil</div>'+
      '<label class="mn-bg-upload btn">Importer un fichier '+(kind==='video'?'MP4 ou WebM':kind==='photo-animee'?'image pour mouvement doux':'image (JPG, PNG, WebP, GIF)')+
        '<input type="file" data-mn-bg-file accept="'+(kind==='video'?'video/mp4,video/webm':'image/png,image/jpeg,image/webp,image/gif,image/avif')+'"></label>'+
      '<p class="muted small">Fichiers importés : disponibles hors ligne sur cet appareil. Les liens Web et les réglages se synchronisent avec ton compte ; les fichiers personnels restent locaux.</p></details>'+
      '<p class="muted small mn-bg-foot">'+
        (kind==='video'?'Bibliothèque · '+catalog().filter(x=>x.type==='video').length+
          ' vidéos réelles · Lecture sans son · Une vidéo chargée à la fois.':
          kind==='photo-animee'?'Bibliothèque · '+catalog().filter(x=>x.type==='photo-animee').length+
            ' photos avec mouvement doux, classées par moment de la journée.':
          'Médias organisés par type et par moment de la journée.')+'</p>'+
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
      const still=()=>{
        if(!element.isConnected)return;
        const image=document.createElement('div');
        image.className='mn-bg-preview-photo';
        image.style.backgroundImage='url("'+(photos[item?.period]||photos[modalPeriod])+'")';
        element.replaceWith(image);
      };
      element.addEventListener('error',still,{once:true});
      if(!item||!effectiveMotion()){element.pause();return;}
      const src=await mediaSrc(item);
      if(!element.isConnected||!src){still();return;}
      if(!element.src)element.src=src;
      element.play().catch(still);
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
    if(checked.type==='video'&&prefs.mode==='fixed')prefs.mode='custom';
    if(prefs.mode==='weather')prefs.weatherChoices[modalWeather+':'+checked.period]=checked.id;
    else if(prefs.mode==='fixed')prefs.fixed=checked.id;
    else {prefs.mode='custom';prefs.chosen[checked.type==='video'?checked.period:modalPeriod]=checked.id;}
    persist();draw();
  }
  async function addFile(file){
    if(!file)return;
    const video=/^video\/(mp4|webm)$/.test(file.type);
    const image=/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type);
    if(!video&&!image)throw new Error('Fichier non compatible : utilisez JPG, PNG, WebP, GIF, MP4 ou WebM.');
    if(video&&modalType!=='video')throw new Error('Les vidéos MP4 et WebM vont dans la catégorie Vidéos.');
    if(!video&&modalType==='video')throw new Error('Dans Vidéos, importez uniquement un fichier MP4 ou WebM.');
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
    if(action==='type'&&isType(v)){
      modalType=v;prefs.type=v;
      if(v==='video'&&prefs.mode==='fixed')prefs.mode='auto';
      persist();draw();return
    }
    if(action==='period'&&isPeriod(v)){modalPeriod=v;previewPeriod(v);draw();return}
    if(action==='condition'&&isCondition(v)){modalWeather=v;draw();return}
    if(action==='refreshWeather'){gps.lastAttempt=0;void refreshGPS(true);draw();return}
    if(action==='choose'){
      const item=find(id);if(!item||item.type!==modalType)return;
      // Cliquer sur une vidéo du matin pendant l'aperçu « Nuit » règle
      // automatiquement le matin, jamais la nuit.
      if(item.type==='video'&&item.period!==modalPeriod)modalPeriod=item.period;
      previewPeriod(modalPeriod);
      if(item.type==='video'&&prefs.mode==='fixed')prefs.mode='custom';
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
      const mode=['auto','weather','custom','fixed'].includes(el.value)?el.value:'auto';
      // « Toute la journée » est impossible avec une vraie vidéo.
      prefs.mode=modalType==='video'&&mode==='fixed'?'auto':mode;
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
      if(video&&modalType!=='video')throw new Error('Ajoutez les vidéos dans la catégorie Vidéos.');
      if(!video&&modalType==='video')throw new Error('Dans Vidéos, utilisez un lien direct MP4 ou WebM.');
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
        '<p class="muted small">Photos, animations, photos animées et vidéos selon l’heure et la météo.</p></div>'+
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
    // API catalogue pour les quatre catégories de fonds.
    register(item){addItem(item)}};
})();