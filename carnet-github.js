/* ---------- sync through a private GitHub repository ---------- */
let sync=LS.get("cm_sync",null);
let syncBusy=false, syncAgain=false, syncTimer=null, lastOk=null;
const J=x=>JSON.stringify(x);
const clone=x=>x===undefined?undefined:JSON.parse(J(x));
function getState(){return{recipes,menu};}
function setState(s){recipes=s.recipes||{};menu=normMenu(s.menu);LS.set("cm_recipes",recipes);LS.set("cm_menu",menu);render();}
const b64e=s=>{const by=new TextEncoder().encode(s);let bin="";for(let i=0;i<by.length;i+=0x8000)bin+=String.fromCharCode.apply(null,by.subarray(i,i+0x8000));return btoa(bin);};
const b64d=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));
function gh(method,body,repo,path){
  const[o,r]=(repo||sync.repo).split("/");
  return fetch(`https://api.github.com/repos/${encodeURIComponent(o)}/${encodeURIComponent(r)}/contents/${path||"carnet.json"}`,{
    method,cache:"no-store",
    headers:Object.assign({"Authorization":"Bearer "+sync.token,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},body?{"Content-Type":"application/json"}:{}),
    body:body?J(body):undefined});
}
function setStatus(k,e){
  const chip=$("#syncChip"), line=$("#syncStatus");
  let t;
  if(k==="off")t="Synchro désactivée";
  else if(k==="busy")t="Synchronisation…";
  else if(k==="pending")t="Modifications en attente d'envoi";
  else if(k==="ok")t="Synchronisé à "+lastOk.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  else{const s=e&&e.status;
    t=s===401?"Clé GitHub refusée : vérifiez-la ou créez-en une nouvelle."
     :s===403?"La clé n'a pas le droit d'écrire dans ce dépôt (Contents : Read and write)."
     :s===404?"Dépôt introuvable, ou la clé n'y a pas accès."
     :e&&e.bad?"Le fichier carnet.json du dépôt est illisible."
     :s===409?"Conflit répété avec l'autre téléphone : réessayez dans un instant."
     :"Hors ligne : les modifications sont gardées ici et partiront plus tard.";}
  chip.textContent=t; chip.dataset.state=k; if(line)line.textContent=t;
}
function scheduleSync(ms=800){if(!sync)return;clearTimeout(syncTimer);setStatus("pending");syncTimer=setTimeout(runSync,ms);}
function cloudCarnet(){try{return !!((typeof cloud!=="undefined"&&cloud.owner)||LS.get("cm_state_owner",""));}catch(e){return false;}}
async function runSync(){
  if(!sync)return;
  if(syncBusy){syncAgain=true;return;}
  syncBusy=true; clearTimeout(syncTimer); setStatus("busy");
  try{
    let done=false;
    for(let attempt=0;attempt<4&&!done;attempt++){
      const L0=clone(getState());
      const g=await gh("GET");
      let remote=null,sha=null;
      if(g.status===200){const d=await g.json();sha=d.sha;
        try{remote=JSON.parse(b64d(d.content));}catch(x){throw{bad:true};}
        if(!remote||typeof remote.recipes!=="object")throw{bad:true};}
      else if(g.status!==404)throw{status:g.status};
      // Carnet shared through the household account (Supabase): that is where the week comes from.
      // The GitHub file is then only written (planning, agenda), never read back: reading it brought back old weeks.
      const viaCloud=cloudCarnet();
      if(viaCloud)try{localStorage.removeItem("cm_base");}catch(x){}
      const base=viaCloud?null:LS.get("cm_base",null);
      let merged;
      if(!remote||viaCloud)merged=L0;
      else if(!base){merged=clone(remote);
        for(const[id,r]of Object.entries(L0.recipes))if(!merged.recipes[id]&&!SEED[id])merged.recipes[id]=r;}
      else merged=merge3(base,L0,remote)||{};
      merged={v:1,recipes:merged.recipes||{},menu:normMenu(merged.menu)};
      if(L0.menu.mzBase)merged.menu.mzBase=L0.menu.mzBase;else delete merged.menu.mzBase; // this copy's own bridge bookmark
      // Plain-language plan for Home Assistant: {"Lundi|midi":"Dahl de lentilles corail", ...}
      { const nowSl=merged.menu.weeks[ymd(mondayOf(new Date()))]||{};
        merged.planning=Object.fromEntries(SLOT_ORDER.filter(k=>nowSl[k]&&merged.recipes[nowSl[k].id]).map(k=>[k,merged.recipes[nowSl[k].id].name])); }
      merged.calendar=calendarLog(merged,(remote&&remote.calendar)||(base&&base.calendar)||{});
      if(!remote||J(merged)!==J(remote)){
        const p=await gh("PUT",Object.assign({message:"Carnet de menus : mise à jour",content:b64e(J(merged))},sha?{sha}:{}));
        if(p.status===409||p.status===422)continue;
        if(!p.ok)throw{status:p.status};
      }
      if(!viaCloud){LS.set("cm_base",merged);
        setState(merge3(L0,getState(),merged));} // keep edits made while the request was running
      lastOk=new Date(); setStatus("ok"); done=true;
      publishIcs(merged.calendar); publishAgenda(merged.calendar); publishShare();
    }
    if(!done)throw{status:409};
  }catch(e){setStatus("err",e);}
  finally{syncBusy=false;if(syncAgain){syncAgain=false;scheduleSync(300);}}
}
/* ---------- agenda file (menu.ics) on the app's own site ---------- */
const MEAL_TIME={midi:["120000","133000"],soir:["193000","210000"]};
function calendarLog(m,prev){
  const today=ymd(new Date());
  // past days stay as history; today and later only come from the weekly menus
  const cal=Object.fromEntries(Object.entries(prev||{}).filter(([k])=>k.slice(0,10)<today));
  for(const[wk,slots]of Object.entries(m.menu.weeks||{})){const ws=parseYmd(wk);
    DAYS.forEach((d,i)=>{const date=ymd(addDays(ws,i));
      MEALS.forEach(([meal])=>{const sl=slots[slotKey(d,meal)],r=sl&&m.recipes[sl.id],key=date+"|"+meal;
        const extra=sl?["entree","dessert"].map(c=>sl[c]&&m.recipes[sl[c]]&&m.recipes[sl[c]].name).filter(Boolean):[];
        const t=r&&r.name+(extra.length?" (+ "+extra.join(", ")+")":"");
        if(r)cal[key]=sl.extra&&sl.extra.length?{t,d:"En plus : "+sl.extra.join(", ")}:t; else if(date>=today)delete cal[key];});});}
  const limit=ymd(addDays(new Date(),-371));
  for(const k of Object.keys(cal))if(k.slice(0,10)<limit)delete cal[k];
  return Object.fromEntries(Object.keys(cal).sort().map(k=>[k,cal[k]]));
}
function icsEsc(t){return String(t).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");}
function icsFold(line){const out=[];let cur="";for(const ch of line){if(new TextEncoder().encode(cur+ch).length>74){out.push(cur);cur=" "+ch;}else cur+=ch;}out.push(cur);return out.join("\r\n");}
function buildIcs(cal){
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Carnet de menus//FR","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Repas","X-WR-TIMEZONE:Europe/Paris",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H","X-PUBLISHED-TTL:PT1H",
    "BEGIN:VTIMEZONE","TZID:Europe/Paris",
    "BEGIN:DAYLIGHT","TZOFFSETFROM:+0100","TZOFFSETTO:+0200","TZNAME:CEST","DTSTART:19700329T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU","END:DAYLIGHT",
    "BEGIN:STANDARD","TZOFFSETFROM:+0200","TZOFFSETTO:+0100","TZNAME:CET","DTSTART:19701025T030000","RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU","END:STANDARD",
    "END:VTIMEZONE"];
  for(const[k,v]of Object.entries(cal)){const name=typeof v==="string"?v:v.t, desc=typeof v==="string"?"":v.d||"";const[date,meal]=k.split("|"),d=date.replace(/-/g,""),[t1,t2]=MEAL_TIME[meal]||MEAL_TIME.soir;
    L.push("BEGIN:VEVENT","UID:"+d+"-"+meal+"@carnet-menus","DTSTAMP:"+d+"T000000Z",
      "DTSTART;TZID=Europe/Paris:"+d+"T"+t1,"DTEND;TZID=Europe/Paris:"+d+"T"+t2,
      icsFold("SUMMARY:"+icsEsc((meal==="midi"?"Midi : ":"Soir : ")+name)),...(desc?[icsFold("DESCRIPTION:"+icsEsc(desc))]:[]),"TRANSP:TRANSPARENT","END:VEVENT");}
  L.push("END:VCALENDAR");
  return L.join("\r\n")+"\r\n";
}
const siteRepo=()=>sync&&(sync.site||"");
const icsUrl=()=>githubPagesFileUrl(siteRepo(),"menu.ics");
let icsBusy=false;
async function publishIcs(cal){
  if(!sync||!siteRepo()||icsBusy)return;
  const ics=buildIcs(cal||{});
  if(LS.get("cm_ics_last","")===ics)return;
  icsBusy=true; const line=$("#icsStatus");
  try{
    for(let i=0;i<3;i++){
      const g=await gh("GET",null,siteRepo(),"menu.ics");let sha=null;
      if(g.status===200){const d=await g.json();sha=d.sha;if(b64d(d.content)===ics){LS.set("cm_ics_last",ics);break;}}
      else if(g.status!==404)throw{status:g.status};
      const p=await gh("PUT",Object.assign({message:"Agenda des repas",content:b64e(ics)},sha?{sha}:{}),siteRepo(),"menu.ics");
      if(p.status===409||p.status===422)continue;
      if(!p.ok)throw{status:p.status};
      LS.set("cm_ics_last",ics);break;
    }
    if(line)line.textContent="Agenda publié à "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+". Google le relit toutes les quelques heures.";
  }catch(e){
    if(line)line.textContent=e&&(e.status===403||e.status===404)?"Agenda non publié : la clé n'a pas le droit d'écrire dans "+siteRepo()+" (ajoutez ce dépôt à la clé, Contents : Read and write).":"Agenda non publié pour l'instant, nouvel essai à la prochaine synchronisation.";
  }finally{icsBusy=false;}
}
/* agenda.json in the data repository: the robot copies it into Google Agenda */
let agendaBusy=false;
async function publishAgenda(cal){
  if(!sync||agendaBusy)return;
  const body=J({v:1,times:{midi:["12:00","13:30"],soir:["19:30","21:00"]},calendar:cal||{}});
  if(LS.get("cm_agenda_last","")===body)return;
  agendaBusy=true;
  try{
    for(let i=0;i<3;i++){
      const g=await gh("GET",null,sync.repo,"agenda.json");let sha=null;
      if(g.status===200){const d=await g.json();sha=d.sha;if(b64d(d.content)===body){LS.set("cm_agenda_last",body);break;}}
      else if(g.status!==404)break;
      const p=await gh("PUT",Object.assign({message:"Agenda des repas",content:b64e(body)},sha?{sha}:{}),sync.repo,"agenda.json");
      if(p.status===409||p.status===422)continue;
      if(p.ok)LS.set("cm_agenda_last",body);
      break;
    }
  }catch(e){}finally{agendaBusy=false;}
}
async function showGoogleStatus(){
  const line=$("#gStatus"); if(!line)return; line.textContent="";
  if(!sync)return;
  try{const g=await gh("GET",null,sync.repo,"agenda-status.json");if(g.status!==200)return;
    const d=JSON.parse(b64d((await g.json()).content)), t=new Date(d.at);
    line.textContent=(d.ok?"Google Agenda : ":"Google Agenda, problème : ")+d.msg+" · "+t.toLocaleString("fr-FR",{weekday:"short",hour:"2-digit",minute:"2-digit"});
    line.style.color=d.ok?"":"var(--danger)";
  }catch(e){}
}
function renderIcsBox(){
  const u=icsUrl();
  $("#icsUrlBox").innerHTML=u?`<span class="label">Adresse à ajouter dans Google Agenda</span><div class="row" style="flex-wrap:nowrap"><code style="flex:1;min-width:0;padding:6px 8px;word-break:break-all">${esc(u)}</code><button type="button" class="btn" data-act="copyIcs">Copier</button></div>`:"";
}
function openSync(){
  $("#s-repo").value=sync?sync.repo:""; $("#s-token").value=sync?sync.token:""; $("#s-err").textContent="";
  $("#s-site").value=sync&&sync.site?sync.site:""; renderIcsBox(); showGoogleStatus();
  $("#s-off").hidden=!sync; $("#s-now").hidden=!sync;
  $("#syncSheet").hidden=false;
}
$("#syncForm").addEventListener("submit",e=>{
  e.preventDefault();
  const repo=$("#s-repo").value.trim().replace(/^https?:\/\/github\.com\//,"").replace(/\/+$/,"").replace(/\.git$/,"");
  const token=$("#s-token").value.trim();
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo)){$("#s-err").textContent="Écrivez le dépôt sous la forme nom/depot, par ex. franck/carnet-donnees.";return;}
  if(!token){$("#s-err").textContent="Collez la clé d'accès GitHub.";return;}
  const site=$("#s-site").value.trim().replace(/^https?:\/\/github\.com\//,"").replace(/\/+$/,"").replace(/\.git$/,"");
  if(site&&!/^[\w.-]+\/[\w.-]+$/.test(site)){$("#s-err").textContent="Écrivez le dépôt du site sous la forme nom/depot, par ex. franckdavion/carnets-menus.";return;}
  const changed=!sync||sync.repo!==repo;
  if(!sync||sync.site!==site){try{localStorage.removeItem("cm_ics_last");}catch(x){}}
  sync={repo,token,site}; LS.set("cm_sync",sync); renderIcsBox();
  if(changed){try{localStorage.removeItem("cm_base");}catch(x){}}
  $("#s-off").hidden=false; $("#s-now").hidden=false; $("#s-err").textContent="";
  runSync();
});


