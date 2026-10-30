/* ---------- shared recipe book (read only): publish mine, follow someone else's ---------- */
// Publisher: a JSON file on the app's own site. Own recipes go in full; recipes imported from a website only as name + link.
const APP_URL=location.origin+location.pathname.replace(/index\.html$/,"");
function shareFileUrl(id){return shareBookUrl(siteRepo(),id);}
function shareLink(){const sh=menu.share;return sh&&sh.id?APP_URL+"?carnet="+encodeURIComponent(shareFileUrl(sh.id)):"";}
function shareData(){
  const out={};
  const builtIn=id=>!!SEED[id]||Object.values(PACKS).some(pk=>!!pk[id]); // everyone already has these
  for(const[id,r]of Object.entries(recipes)){if(r.shared||builtIn(id))continue;
    out[id]=r.source?{name:r.name,cat:r.cat,cats:r.cats,time:r.time,source:r.source,linkOnly:true,image:r.image}
      :{name:r.name,cat:r.cat,cats:r.cats,time:r.time,serves:r.serves,ing:r.ing,steps:r.steps,tags:r.tags,light:r.light,mainFactor:r.mainFactor};}
  const done=LS.get("cm_share_photos",{}),photos={};
  for(const[id,r]of Object.entries(recipes))if(!r.shared&&r.photo&&done[id]===r.photo)photos[id]=sharePhotoUrl(id,r.photo);
  for(const[id,r]of Object.entries(recipes))if(!r.shared&&!photos[id]&&r.pick&&r.pick.u)photos[id]=r.pick.u; // a photo chosen on the internet
  return{app:"carnet-menus",owner:(menu.share&&menu.share.name)||"Carnet partagé",inbox:shareInbox(),photos,updated:new Date().toISOString(),recipes:out};
}
let shareBusy=false;
// recipe photos go to the public site next to the book file: partage-photos/<book>/<recipe>-<version>.jpg
function sharePhotoUrl(rid,ts){return menu.share?sharePhotoPublicUrl(siteRepo(),menu.share.id,rid,ts):"";}
async function uploadSharePhotos(){const done=LS.get("cm_share_photos",{}),cache=rPhotos();let changed=false;
  for(const[id,r]of Object.entries(recipes)){if(r.shared||!r.photo||done[id]===r.photo||!cache[id])continue;
    try{const p=await gh("PUT",{message:"Photo de recette partagée",content:cache[id].split(",")[1]},siteRepo(),sharePhotoRel(menu.share.id,id,r.photo));
      if(p.ok||p.status===422){done[id]=r.photo;changed=true;}}catch(e){}}
  if(changed)LS.set("cm_share_photos",done);return done;}
async function publishShare(force){
  const sh=menu.share;if(!sh||!sh.on||!sh.id||!sync||!siteRepo()||shareBusy)return;
  shareBusy=true;try{await uploadSharePhotos();}catch(e){}shareBusy=false;
  const d=shareData(),body=J(Object.assign({},d,{updated:""}));if(!force&&LS.get("cm_share_last","")===body)return;
  shareBusy=true;
  try{const path="partage-"+sh.id+".json";let sha;const g=await gh("GET",null,siteRepo(),path);if(g.status===200)sha=(await g.json()).sha;
    const p=await gh("PUT",Object.assign({message:"Carnet partagé",content:b64e(J(d))},sha?{sha}:{}),siteRepo(),path);
    if(p.ok){LS.set("cm_share_last",body);LS.set("cm_share_at",Date.now());}
  }catch(e){}finally{shareBusy=false;if(!$("#shareSheet").hidden)renderShare();}
}
// Follower: books I follow, refreshed when the app opens; their recipes are read only in my notebook
let follows=LS.get("cm_follows",[]);
/* ---------- who follows my book: followers drop their first name in a private mailbox on ntfy.sh ---------- */
const NTFY="https://ntfy.sh";
function shareInbox(){const sh=menu.share;if(!sh)return"";if(!sh.inbox){sh.inbox="cm-"+Array.from(crypto.getRandomValues(new Uint8Array(15)),b=>"abcdefghijklmnopqrstuvwxyz0123456789"[b%36]).join("");saveMenu();}return sh.inbox;}
const myUid=()=>{let u=LS.get("cm_uid","");if(!u){u=Math.random().toString(36).slice(2,12);LS.set("cm_uid",u);}return u;};
const myName=()=>LS.get("cm_myname","");
// follower side: say hello once (with a real notification), then a silent "seen" at most once a day
async function pingBook(f,kind){
  if(!f.inbox||!myName())return;
  const name=myName(),join=kind==="join";
  try{await fetch(NTFY+"/",{method:"POST",body:J({topic:f.inbox,title:"Carnet de menus",
      message:join?`${name} a rejoint ton carnet de recettes 🍽️`:`${name} a ouvert ton carnet`,
      tags:[join?"join":"seen","uid-"+myUid()],priority:join?4:1})});
    if(join)f.joined=myName();f.ping=Date.now();LS.set("cm_follows",follows);}catch(e){}
}
function pingFollows(){follows.forEach(f=>{if(!f.inbox||!myName())return;if(f.joined!==myName())pingBook(f,"join");else if(Date.now()-(f.ping||0)>20*3600e3)pingBook(f,"seen");});}
// publisher side: read the mailbox (ntfy keeps messages about 12 h) and keep the list in my synced menu
let subsBusy=false;
async function pollSubs(){
  const sh=menu.share;if(!sh||!sh.on||!sh.inbox||subsBusy)return;subsBusy=true;
  try{const r=await fetch(`${NTFY}/${sh.inbox}/json?poll=1&since=${sh.subsSince||"all"}`,{cache:"no-store"});if(!r.ok)throw 0;
    const lines=(await r.text()).split("\n").filter(Boolean);let fresh=[],changed=false;sh.subs=sh.subs||{};
    let nProps=0;
    for(const l of lines){let m;try{m=JSON.parse(l);}catch(e){continue;}if(m.event!=="message")continue;sh.subsSince=m.id;
      {const pr=await readProposal(m,sh);if(pr){if(pr==="new")nProps++;changed=true;continue;}}
      const uid=((m.tags||[]).find(t=>/^uid-/.test(t))||"").slice(4),nm=String(m.message||"").match(/^(.+?) a (?:rejoint|ouvert) ton carnet/);
      if(!uid||!nm)continue;const name=nm[1].slice(0,40),at=(m.time||0)*1000,s=sh.subs[uid];
      if(!s){sh.subs[uid]={name,joined:at,seen:at};fresh.push(name);}else{s.name=name;s.seen=Math.max(s.seen||0,at);}changed=true;}
    if(changed||lines.length){saveMenu();if(!$("#shareSheet").hidden)renderShare();}
    if(fresh.length)toast(`🆕 ${fresh.join(", ")} ${fresh.length>1?"ont":"a"} rejoint ton carnet`);
    if(nProps){renderProps();setTimeout(()=>toast(`📥 ${nProps} recette${nProps>1?"s":""} proposée${nProps>1?"s":""} : voyez l'onglet Recettes`),nProps&&fresh.length?2500:0);}
  }catch(e){}finally{subsBusy=false;}
}
/* ---------- recipes proposed by the people who follow my book (they send them to my mailbox; I add or refuse) ---------- */
const PROP_MAX=3800;
async function packRecipe(o){const j=J(o);if(j.length<=PROP_MAX)return"j:"+j;
  try{const cs=new Blob([j]).stream().pipeThrough(new CompressionStream("gzip"));const buf=new Uint8Array(await new Response(cs).arrayBuffer());let bin="";buf.forEach(x=>bin+=String.fromCharCode(x));const z="z:"+btoa(bin);if(z.length<=PROP_MAX)return z;}catch(e){}
  return null;}
async function unpackRecipe(t){t=String(t||"");if(t.startsWith("j:"))return JSON.parse(t.slice(2));
  if(t.startsWith("z:")){const bin=atob(t.slice(2)),u=Uint8Array.from(bin,c=>c.charCodeAt(0));const ds=new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"));return JSON.parse(await new Response(ds).text());}
  return null;}
// follower side: what I proposed, and the answers
let myProps=LS.get("cm_props",{});
function propsFor(rid){return Object.entries(myProps).filter(([,p])=>p.rid===rid);}
async function proposeRecipe(rid,f){const r=recipes[rid];if(!r||!f||!f.inbox)return;
  if(!myName()){toast("Indiquez d'abord votre prénom (Réglages › Partage)");return;}
  const pid=Object.entries(myProps).find(([,p])=>p.rid===rid&&p.to===f.url&&p.st!=="no")?.[0]||Math.random().toString(36).slice(2,10);
  const o={name:r.name,cat:r.cat,cats:r.cats,time:r.time,serves:r.serves,ing:(r.ing||[]).map(i=>({q:i.q,u:i.u,n:i.n,r:i.r})),steps:String(r.steps||"")};
  const ph=rPhotoSrc(rid);if(ph&&/^https:/.test(ph))o.image=ph;
  const body=await packRecipe(o);if(!body){toast("Recette trop longue pour être envoyée : raccourcissez les étapes");return;}
  try{const res=await fetch(NTFY+"/",{method:"POST",body:J({topic:f.inbox,title:"Recette proposée",message:body,tags:["recipe","uid-"+myUid(),"pid-"+pid,"by-"+encodeURIComponent(myName()).slice(0,60)],priority:3})});if(!res.ok)throw 0;
    myProps[pid]={rid,to:f.url,toName:f.name||"",at:Date.now(),sent:Date.now(),n:(myProps[pid]?.n||0)+1,st:"sent"};LS.set("cm_props",myProps);
    toast(`📤 Proposée à ${f.name||"votre proche"}`);lastRecHtml="";renderRecSheet();}
  catch(e){toast("Envoi impossible pour l'instant (pas de réseau ?)");}}
// answers come on <inbox>-ack ; unanswered proposals are sent again (the mailbox keeps messages about 12 h)
async function pollPropAcks(){const pend=Object.entries(myProps).filter(([,p])=>p.st==="sent");if(!pend.length)return;
  for(const f of follows){if(!f.inbox||!pend.some(([,p])=>p.to===f.url))continue;
    try{const r=await fetch(`${NTFY}/${f.inbox}-ack/json?poll=1&since=all`,{cache:"no-store"});if(!r.ok)continue;
      for(const l of (await r.text()).split("\n").filter(Boolean)){let m;try{m=JSON.parse(l);}catch(e){continue;}if(m.event!=="message")continue;
        const tg=m.tags||[],pid=(tg.find(t=>/^pid-/.test(t))||"").slice(4);if(!tg.includes("uid-"+myUid())||!myProps[pid])continue;
        const st=tg.includes("ok")?"ok":tg.includes("no")?"no":"got";if(myProps[pid].st!==st&&!(myProps[pid].st!=="sent"&&st==="got")){myProps[pid].st=st;myProps[pid].ans=(m.time||0)*1000;
          if(st!=="got")toast(st==="ok"?`✅ ${myProps[pid].toName||"Votre proche"} a ajouté « ${(recipes[myProps[pid].rid]||{}).name||"votre recette"} »`:`${myProps[pid].toName||"Votre proche"} n'a pas retenu « ${(recipes[myProps[pid].rid]||{}).name||"votre recette"} »`);}}
      LS.set("cm_props",myProps);}catch(e){}}
  for(const[pid,p]of Object.entries(myProps))if(p.st==="sent"&&Date.now()-p.sent>10*3600e3&&(p.n||0)<8){const f=follows.find(x=>x.url===p.to);if(f&&recipes[p.rid]){const keep=p.n;await proposeRecipe(p.rid,f);if(myProps[pid])myProps[pid].n=keep+1;}}
  if(!$("#recSheet").hidden){lastRecHtml="";renderRecSheet();}}
function proposeHtml(id){const r=recipes[id];if(!r||r.shared)return"";const fl=follows.filter(f=>f.inbox);if(!fl.length)return"";
  const ps=propsFor(id);
  return`<div class="prop-row">${fl.map(f=>{const p=ps.find(([,x])=>x.to===f.url),st=p&&p[1].st;
    return st==="ok"?`<span class="muted">✅ Ajoutée par ${esc(f.name||"votre proche")} dans son carnet</span>`
      :st==="sent"||st==="got"?`<span class="muted">📤 Proposée à ${esc(f.name||"votre proche")} · ${st==="got"?"reçue, ":""}en attente de sa réponse</span> <button type="button" class="link" data-act="propSend" data-id="${esc(id)}" data-f="${esc(f.url)}">Renvoyer</button>`
      :`<button type="button" class="btn" data-act="propSend" data-id="${esc(id)}" data-f="${esc(f.url)}">📤 Proposer à ${esc(f.name||"mon proche")}${st==="no"?" (à nouveau)":""}</button>`;}).join("")}</div>`;}
// owner side: the proposals waiting, shown on Recettes
async function readProposal(m,sh){const tg=m.tags||[];if(!tg.includes("recipe"))return false;
  const uid=(tg.find(t=>/^uid-/.test(t))||"").slice(4),pid=(tg.find(t=>/^pid-/.test(t))||"").slice(4);if(!uid||!pid)return true;
  sh.props=sh.props||{};const old=sh.props[pid];if(old&&old.st!=="new"){ackProp(pid,uid,old.st);return true;}
  let r=null;try{r=await unpackRecipe(m.message);}catch(e){}if(!r||!r.name)return true;
  let by=decodeURIComponent((tg.find(t=>/^by-/.test(t))||"").slice(3))||(sh.subs&&sh.subs[uid]&&sh.subs[uid].name)||"Un proche";
  sh.props[pid]={uid,by:by.slice(0,40),at:(m.time||0)*1000,st:"new",r};ackProp(pid,uid,"got");return"new";}
function ackProp(pid,uid,st){const sh=menu.share;if(!sh||!sh.inbox)return;fetch(NTFY+"/",{method:"POST",body:J({topic:sh.inbox+"-ack",message:st,tags:["uid-"+uid,"pid-"+pid,st],priority:1})}).catch(()=>{});}
let propOpen=null;
function renderProps(){const el=$("#propBox");if(!el)return;const sh=menu.share||{},l=Object.entries(sh.props||{}).filter(([,p])=>p.st==="new").sort((a,b)=>b[1].at-a[1].at);
  if(!l.length){el.innerHTML="";return;}
  el.innerHTML=`<div class="prop-box"><span class="label">📥 Recettes proposées · ${l.length}</span>${l.map(([pid,p])=>{const r=p.r,op=propOpen===pid;
    return`<div class="prop-it"><div class="prop-h">${r.image?`<img src="${esc(r.image)}" alt="" class="dish-ph">`:`<span class="dish-ph ph-none">🍽️</span>`}<div><b>${esc(r.name)}</b><div class="muted" style="font-size:12px">de ${esc(p.by)} · ${ago(p.at)}${r.time?" · "+esc(r.time)+" min":""}</div></div></div>
      ${op?`<ul class="ings">${(r.ing||[]).map(i=>`<li class="q">${esc(fmt(...toBase(i.q,i.u)))}</li><li>${esc(i.n)}</li>`).join("")}</ul>${r.steps?`<ol class="steps">${String(r.steps).split("\n").filter(x=>x.trim()).map(x=>`<li>${esc(x)}</li>`).join("")}</ol>`:""}`:""}
      <div class="row"><button type="button" class="btn primary" data-act="propAdd" data-p="${pid}">Ajouter à mon carnet</button><button type="button" class="btn" data-act="propView" data-p="${pid}">${op?"Masquer":"Voir"}</button><button type="button" class="btn ghost" data-act="propNo" data-p="${pid}">Refuser</button></div></div>`;}).join("")}</div>`;}
function propAnswer(pid,ok){const sh=menu.share,p=sh&&sh.props&&sh.props[pid];if(!p)return;
  if(ok){const r=p.r,slug=norm(r.name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"recette",nid=slug+"-"+Math.random().toString(36).slice(2,6);
    const n={name:String(r.name).slice(0,120),cat:CATS.includes(r.cat)?r.cat:"Plat",time:Number(r.time)||0,serves:Math.max(1,Number(r.serves)||4),ing:(Array.isArray(r.ing)?r.ing:[]).filter(i=>i&&i.n).map(i=>({q:Number(i.q)||0,u:String(i.u||""),n:String(i.n).slice(0,80),r:String(i.r||"")})),steps:String(r.steps||"").slice(0,6000),createdAt:new Date().toISOString(),proposedBy:p.by};
    const cs=(Array.isArray(r.cats)?r.cats:[]).filter(c=>CATS.includes(c)&&c!==n.cat);if(cs.length)n.cats=cs;
    if(r.image&&/^https:\/\/\S+$/.test(r.image))n.pick={u:r.image,src:"photo de "+p.by};
    saveRecipe(nid,n);toast(`« ${n.name} » ajoutée à votre carnet`);}
  else toast("Proposition refusée");
  p.st=ok?"ok":"no";p.done=Date.now();ackProp(pid,p.uid,p.st);saveMenu();renderProps();if(ok)render();}
const ago=t=>{const d=Math.floor((Date.now()-t)/864e5);return d<=0?"aujourd'hui":d===1?"hier":d<14?`il y a ${d} jours`:`il y a ${Math.round(d/7)} sem.`;};
function subsHtml(){const sh=menu.share||{};if(!sh.on)return"";const list=Object.entries(sh.subs||{}).filter(([,s])=>!s.hidden).sort((a,b)=>b[1].seen-a[1].seen);
  return`<div class="field" style="border-top:1px solid var(--line);padding-top:14px"><span class="label">Qui suit mon carnet${list.length?" · "+list.length:""}</span>
    ${list.length?list.map(([u,s])=>`<div class="sub-row"><span class="av">${esc((s.name||"?").charAt(0).toUpperCase())}</span><span style="flex:1;min-width:0"><b>${esc(s.name)}</b><small>a rejoint le ${new Date(s.joined).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})} · vu ${ago(s.seen)}</small></span><button type="button" class="x" data-act="subHide" data-u="${esc(u)}" aria-label="Retirer ${esc(s.name)} de la liste">✕</button></div>`).join("")
      :`<p class="muted" style="margin:0;font-size:13px">Personne pour l'instant. Quand un proche ouvre votre lien et donne son prénom, il apparaît ici.</p>`}
    <span class="muted" style="font-size:12px">Astuce : installez l'appli gratuite « ntfy » et abonnez-vous à <code style="user-select:all">${esc(sh.inbox||"")}</code> pour être prévenu même appli fermée.</span></div>`;}
function openWelcome(owner){if(myName()||!$("#welcomeSheet").hidden)return;LS.set("cm_welcome_at",Date.now());$("#welcomeTxt").textContent=`${owner||"Un proche"} te partage son carnet de recettes 🍽️`;$("#welcomeNote").textContent=`${owner||"Il"} saura que tu as rejoint son carnet.`;$("#welcomeSheet").hidden=false;}
// what changed in a followed book since last time: shown as "Nouveautés" until the recipe is opened
let shNews=LS.get("cm_sh_news",{}); // {recipeId:{k:"new"|"maj",by,at}}
const strHash=s=>{let x=5381;for(let i=0;i<s.length;i++)x=(x*33^s.charCodeAt(i))>>>0;return x.toString(36);};
function seenNews(id){if(shNews[id]){delete shNews[id];LS.set("cm_sh_news",shNews);}}
const newsCount=()=>Object.keys(shNews).filter(id=>recipes[id]).length;
async function refreshFollow(f,quiet){
  try{const r=await fetch(f.url+(f.url.includes("?")?"&":"?")+"t="+Date.now(),{cache:"no-store"});if(!r.ok)throw r.status;
    const d=await r.json();if(!d||typeof d.recipes!=="object")throw"format";
    const first=!f.sig, sig={};let nNew=0,nMaj=0;
    for(const[id,x]of Object.entries(d.recipes)){if(!x||!x.name)continue;const nid="sh-"+f.key+"-"+id,hs=strHash(J(x));sig[id]=hs;
      if(first)continue;const was=f.sig[id];
      if(!was){shNews[nid]={k:"new",by:d.owner||f.name,at:Date.now()};nNew++;}
      else if(was!==hs&&!(shNews[nid]&&shNews[nid].k==="new")){shNews[nid]={k:"maj",by:d.owner||f.name,at:Date.now()};nMaj++;}}
    f.sig=sig;LS.set("cm_sh_news",shNews);
    {const ph=LS.get("cm_sh_photos",{});for(const k of Object.keys(ph))if(ph[k].from===f.url)delete ph[k];
     for(const[id,u]of Object.entries(d.photos&&typeof d.photos==="object"?d.photos:{})){if(typeof u!=="string"||!/^https:\/\/\S+$/.test(u))continue;
       const target=recipes["sh-"+f.key+"-"+id]||d.recipes[id]?"sh-"+f.key+"-"+id:id;ph[target]={u,from:f.url,by:d.owner||f.name};}
     LS.set("cm_sh_photos",ph);}
    if(nNew||nMaj)setTimeout(()=>toast(`🆕 ${d.owner||f.name} : `+[nNew?`${nNew} nouvelle${nNew>1?"s":""} recette${nNew>1?"s":""}`:"",nMaj?`${nMaj} modifiée${nMaj>1?"s":""}`:""].filter(Boolean).join(", ")),400);
    const favs=new Set(Object.keys(recipes).filter(k=>recipes[k].shared===f.url&&recipes[k].fav));
    for(const k of Object.keys(recipes))if(recipes[k].shared===f.url)delete recipes[k];
    for(const[id,x]of Object.entries(d.recipes)){if(!x||!x.name)continue;const nid="sh-"+f.key+"-"+id;
      recipes[nid]=Object.assign({ing:[],steps:""},x,{shared:f.url,sharedBy:d.owner||f.name},favs.has(nid)?{fav:true}:{});}
    f.name=d.owner||f.name;f.n=Object.keys(d.recipes).length;f.at=Date.now();f.err="";f.inbox=typeof d.inbox==="string"&&/^[\w-]{1,64}$/.test(d.inbox)?d.inbox:"";
    if(f.inbox){if(!myName()&&(f.fresh||Date.now()-LS.get("cm_welcome_at",0)>20*3600e3))openWelcome(f.name);else pingFollows();}delete f.fresh; // no first name yet: asked again once a day
  }catch(e){f.err=quiet?f.err:"Carnet introuvable pour l'instant (il peut mettre quelques minutes à être publié).";}
  LS.set("cm_follows",follows);LS.set("cm_recipes",recipes);render();if(!$("#shareSheet").hidden)renderShare();
}
function refreshFollows(){follows.forEach(f=>{if(Date.now()-(f.at||0)>3*60e3)refreshFollow(f,true);});}
function followUrl(raw){let u=String(raw).trim();try{const m=u.match(/[?&]carnet=([^&\s]+)/);if(m)u=decodeURIComponent(m[1]);}catch(e){}
  if(!/^https:\/\/[^\s]+\.json$/i.test(u))return"";return u;}
function addFollow(raw){const url=followUrl(raw);if(!url){toast("Ce lien de carnet n'est pas reconnu");return false;}
  if(follows.some(f=>f.url===url)){toast("Ce carnet est déjà suivi");return false;}
  const f={url,key:Math.random().toString(36).slice(2,7),name:"Carnet partagé",fresh:true};follows.push(f);LS.set("cm_follows",follows);refreshFollow(f);toast("Carnet ajouté : ses recettes arrivent");return true;}
function removeFollow(url){for(const k of Object.keys(recipes))if(recipes[k].shared===url)delete recipes[k];follows=follows.filter(f=>f.url!==url);LS.set("cm_follows",follows);LS.set("cm_recipes",recipes);render();renderShare();toast("Carnet retiré");}
function copyShared(id){const r=recipes[id];if(!r)return;const n=JSON.parse(JSON.stringify(r));delete n.shared;delete n.sharedBy;n.createdAt=new Date().toISOString();
  const nid=(norm(r.name).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"recette")+"-"+Math.random().toString(36).slice(2,6);
  saveRecipe(nid,n);toast("Copiée dans votre carnet : vous pouvez la modifier");openRecSheet(nid);}
// the message sent with the link: a short how-to for iPhone and Android
function shareInvite(){const who=(menu.share&&menu.share.name)||"";
  return`Bonjour,

Je te partage mon carnet de recettes sur « Carnet de menus », une appli que j'ai imaginée et créée pour organiser nos repas de la semaine.

Avec elle, tu peux :
• consulter toutes mes recettes, avec les ingrédients et les étapes
• composer tes menus de la semaine (midi, soir, entrée, dessert)
• avoir ta liste de courses toute faite, rayon par rayon
• trouver un vin ou une boisson pour chaque plat
• savoir quoi cuisiner avec ce qu'il reste dans le frigo

Pour l'installer (2 minutes) :
1. Ouvre ce lien : ${shareLink()}
   iPhone : dans Safari · Android : dans Chrome
2. Ajoute l'appli sur ton écran d'accueil
   iPhone : bouton Partager (carré avec flèche) → « Sur l'écran d'accueil »
   Android : menu ⋮ → « Installer l'application »
3. Ouvre-la depuis sa nouvelle icône : mes recettes sont marquées « de ${who||"moi"} ».

Bon à savoir : tes menus et tes courses restent à toi. Mes nouvelles recettes arrivent toutes seules, et tu peux copier une recette dans ton carnet pour l'adapter.

Bonne cuisine !
${who}`.trim();}
function renderShare(){
  const sh=menu.share||{},can=!!(sync&&siteRepo());
  const at=LS.get("cm_share_at",0);
  $("#shareMine").innerHTML=!can?`<p class="muted" style="margin:0">Pour partager vos recettes, activez d'abord « Partage entre téléphones » (dans Réglages).</p>`
    :`<div class="pref-row"><div><strong>Partager mes recettes</strong><div class="muted" style="font-size:13px">sans vos menus, courses ni vins</div></div><div class="chips"><button type="button" class="chip" data-act="shareOn" data-v="1" aria-pressed="${!!sh.on}">Oui</button><button type="button" class="chip" data-act="shareOn" data-v="0" aria-pressed="${!sh.on}">Non</button></div></div>
      ${sh.on?`<label class="field"><span class="label">Nom affiché chez les autres</span><input id="shareName" value="${esc(sh.name||"")}" placeholder="Ex. Franck" autocomplete="off"></label>
      <div class="field"><span class="label">Lien à envoyer</span><code class="share-link">${esc(shareLink())}</code>
        <div class="row"><button type="button" class="btn primary" data-act="shareMail">✉️ Par mail</button><button type="button" class="btn" data-act="shareSend">💬 SMS, WhatsApp…</button><button type="button" class="btn" data-act="shareCopy">Copier le lien</button></div>
        <details class="share-msg"><summary class="muted" style="font-size:13px">Le lien part avec une petite procédure (iPhone et Android) · voir le message</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:13px;margin:8px 0 0">${esc(shareInvite())}</pre></details>
        <span class="muted" style="font-size:12px">${at?"Mis à jour le "+new Date(at).toLocaleString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})+". ":""}Les nouvelles recettes sont ajoutées automatiquement. Comptez quelques minutes avant que le lien marche la première fois.</span></div>`:""}`;
  $("#shareSubs").innerHTML=subsHtml();if(document.activeElement!==$("#myNameIn"))$("#myNameIn").value=myName();$("#myNameRow").hidden=!follows.length;
  $("#shareFollow").innerHTML=(follows.length?follows.map(f=>`<div class="pref-row"><div><strong>${esc(f.name)}</strong><div class="muted" style="font-size:13px">${f.err?esc(f.err):(f.n||0)+" recettes"+(f.at?" · mis à jour "+new Date(f.at).toLocaleString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"")}</div></div>
      <div class="row" style="gap:6px"><button type="button" class="btn" data-act="followRefresh" data-u="${esc(f.url)}">↻</button><button type="button" class="btn danger" data-act="followRm" data-u="${esc(f.url)}">Retirer</button></div></div>`).join(""):`<p class="muted" style="margin:0;font-size:13px">Aucun carnet suivi.</p>`);
}

$("#followForm").addEventListener("submit",e=>{e.preventDefault();if(addFollow($("#followIn").value))$("#followIn").value="";});
/* ---------- everyday products ---------- */
const DAILY=[
 ["Hygiène",["Papier toilette","Mouchoirs","Dentifrice","Brosses à dents","Gel douche","Shampoing","Savon","Déodorant","Coton-tiges","Cotons démaquillants","Rasoirs","Protections hygiéniques","Crème hydratante"]],
 ["Entretien",["Essuie-tout (Sopalin)","Liquide vaisselle","Pastilles lave-vaisselle","Sel lave-vaisselle","Lessive","Adoucissant","Éponges","Sacs poubelle","Nettoyant multi-usage","Javel","Nettoyant WC","Lingettes ménagères"]],
 ["Cuisine",["Papier aluminium","Film étirable","Papier cuisson","Sacs congélation","Filtres à café"]],
 ["Épicerie de base",["Café","Thé","Sucre","Sel","Poivre","Huile d'olive","Farine","Pâtes","Riz","Céréales","Confiture","Biscuits","Eau"]],
 ["Frais",["Lait","Œufs","Beurre","Pain","Yaourts","Fromage râpé","Jambon"]],
 ["Divers",["Piles","Ampoules","Allumettes"]],
];
const nk=s=>norm(String(s));
const inExtras=t=>(menu.extras||[]).findIndex(x=>nk(x.t)===nk(t));
const dailyCat=t=>(menu.dailyCat||{})[t]||"Mes produits";
const dailyCatOf=t=>(menu.daily||[]).includes(t)?(DAILY.some(([g])=>g===dailyCat(t))?dailyCat(t):"Mes produits"):((DAILY.find(([,its])=>its.includes(t))||["Mes produits"])[0]);
// editing: tap a product to rename it, move it to another category or delete it (built-in products too); "Annuler" puts everything back as it was when the window opened
let dailyEdit=false, dailyOpenSnap=null, dailyEditT=null;
const dailyHidden=t=>(menu.dailyHidden||[]).includes(t);
function renderDaily(){
  $("#dailyHelp").textContent=dailyEdit?"Touchez un produit pour le renommer, changer sa catégorie ou le supprimer.":"Touchez un produit pour l'ajouter à la liste de courses, touchez-le encore pour le retirer.";
  $("#dailyModeBtn").textContent=dailyEdit?"✓ Fin des modifications":"✏️ Modifier";$("#dailyModeBtn").classList.toggle("primary",dailyEdit);
  const chip=(t,own)=>{const on=inExtras(t)>=0;return`<span class="dchip${on&&!dailyEdit?" on":""}${dailyEdit&&dailyEditT===t?" editing":""}"><button type="button" data-act="${dailyEdit?"dailyPick":"dailyToggle"}" data-t="${esc(t)}" aria-pressed="${on}">${dailyEdit?"✏️ ":on?"✓ ":""}${esc(t)}</button>${own&&!dailyEdit?`<button type="button" class="rm" data-act="dailyRm" data-t="${esc(t)}" aria-label="Supprimer ${esc(t)} de mes produits">✕</button>`:""}</span>`;};
  const cats=["Mes produits",...DAILY.map(x=>x[0])];
  const editor=g=>{if(!dailyEdit||!dailyEditT||dailyCatOf(dailyEditT)!==g)return"";const t=dailyEditT;
    return`<div class="daily-ed"><input id="dailyEdName" value="${esc(t)}" aria-label="Nom du produit"><select id="dailyEdCat" aria-label="Catégorie">${cats.map(c=>`<option${c===g?" selected":""}>${esc(c)}</option>`).join("")}</select>
      <div class="row"><button type="button" class="btn primary" data-act="dailyEdSave">Enregistrer</button><button type="button" class="btn danger" data-act="dailyEdDel">Supprimer</button><button type="button" class="btn ghost" data-act="dailyEdClose">Fermer</button></div></div>`;};
  const mine=menu.daily||[],loose=mine.filter(t=>!DAILY.some(([g])=>g===dailyCat(t)));
  const favs=(menu.dailyFav||[]).filter(t=>!dailyEdit);
  $("#dailyList").innerHTML=(favs.length?`<div class="field"><span class="label">⭐ Mes favoris</span><div class="dchips">${favs.map(t=>chip(t,(menu.daily||[]).includes(t))).join("")}</div></div>`:"")+(loose.length?`<div class="field"><span class="label">Mes produits</span><div class="dchips">${loose.map(t=>chip(t,true)).join("")}</div>${editor("Mes produits")}</div>`:"")
    +DAILY.map(([g,its])=>{const own=mine.filter(t=>dailyCat(t)===g),base=its.filter(t=>!dailyHidden(t));if(!base.length&&!own.length)return"";
      return`<div class="field"><span class="label">${esc(g)}</span><div class="dchips">${base.map(t=>chip(t,false)).join("")}${own.map(t=>chip(t,true)).join("")}</div>${editor(g)}</div>`;}).join("");
  const sel=$("#dailyCat"),cur=sel.value;sel.innerHTML=["Mes produits",...DAILY.map(x=>x[0])].map(g=>`<option${g===cur?" selected":""}>${esc(g)}</option>`).join("");
}
$("#dailyForm").addEventListener("submit",e=>{e.preventDefault();const v=$("#dailyIn").value.trim();if(!v)return;
  const all=[...(menu.daily||[]),...DAILY.flatMap(x=>x[1])];
  if(all.some(t=>nk(t)===nk(v))){toast("Ce produit est déjà dans la liste");$("#dailyIn").value="";return;}
  menu.daily=[...(menu.daily||[]),v];const g=$("#dailyCat").value;if(g&&g!=="Mes produits")menu.dailyCat=Object.assign({},menu.dailyCat,{[v]:g});
  if(inExtras(v)<0)menu.extras=[...(menu.extras||[]),{t:v,done:false}];
  $("#dailyIn").value="";render();renderDaily();saveMenu();toast(`${v} ajouté dans « ${dailyCat(v)} » et aux courses`);});

/* ---------- actions ---------- */
let tt=null;
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>el.hidden=true,2600);}

document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]"); if(!b)return;
  const a=b.dataset.act, id=b.dataset.id;
  if(a==="check"||a==="checkX")return; // handled on change
  if(a==="closeSet"||(a==="tab"&&b.dataset.v==="set"&&view==="set")){view=LS.get("cm_prevview","menu");if(view==="set")view="menu";LS.set("cm_view",view);render();window.scrollTo(0,0);return;} // back to the page we came from
  if(a==="tab"&&b.dataset.v==="set"&&view!=="set")LS.set("cm_prevview",view);
  if(a==="tab"){clearSheetBack();document.querySelectorAll(".sheet:not([hidden])").forEach(s=>s.hidden=true);slotK=null;view=b.dataset.v;LS.set("cm_view",view);render();window.scrollTo(0,0);}
  else if(a==="startView"){LS.set("cm_start",b.dataset.v);renderStart();toast(b.dataset.v==="last"?"L'appli rouvrira la dernière page utilisée":"L'appli s'ouvrira sur « "+b.textContent+" »");}
  else if(a==="ppl"){menu.people=Math.max(1,Math.min(30,menu.people+Number(b.dataset.d)));render();saveMenu(500);}
  else if(a==="toggle"){if(b.closest("#recSheet"))$("#recSheet").hidden=true; /* the recipe comes back when this window closes */ openAdd(id);}
  else if(a==="addWeekSel"){addWeek=b.dataset.w;addAsk=null;renderAdd();}
  else if(a==="addCell")addCellTap(b.dataset.key);
  else if(a==="addNum"){addN=Math.max(1,Math.min(50,addN+Number(b.dataset.d)));renderAdd();}
  else if(a==="addAs"){if(addAsk){addSel.set(addAsk,b.dataset.role);addAsk=null;renderAdd();}}
  else if(a==="addAskNo"){addAsk=null;renderAdd();}
  else if(a==="addOk")applyAdd();
  else if(a==="closeAdd"){if(!$("#addOk").disabled)applyAdd();else $("#addSheet").hidden=true;} // closing keeps what was ticked
  else if(["serv","swap","lock","pick"].includes(a)&&b.dataset.k&&isPast(b.dataset.k)){toast("Ce jour est passé : son menu ne se modifie plus");}
  else if(a==="serv"){const sl=W()[b.dataset.k];if(sl){
    const previous=sl.n;
    sl.n=Math.max(1,sl.n+Number(b.dataset.d));
    if(sl.lock&&sl.n!==previous){
      const day=ymd(addDays(parseYmd(curWeek),DAYS.indexOf(b.dataset.k.split("|")[0])));
      menu.shopDays=[...new Set([...(menu.shopDays||selectedShopDates().map(x=>x.key)),day])].sort();
    }
    render();saveMenu();
    if(sl.lock&&sl.n!==previous)toast("Courses actualisées pour "+sl.n+" personnes : compléments à acheter affichés");
  }}
  else if(a==="applyAll"){for(const k in W())if(!isPast(k))W()[k].n=menu.people;render();saveMenu();}
  else if(a==="clearMenu"){for(const k in W())if(!W()[k].lock&&!isPast(k))delete W()[k];menu.checked={};proposeAsk=0;render();saveMenu();}
  else if(a==="propose"){
    const had=SLOT_ORDER.some(k=>W()[k]&&!W()[k].lock&&!isPast(k));
    undoWeek=had?{week:curWeek,slots:JSON.parse(JSON.stringify(W())),locked:SLOT_ORDER.some(k=>W()[k]&&W()[k].lock)}:null;
    planWeek(true);}
  else if(a==="openDays"){pickDays=pickDays.filter(d=>!isPast(slotKey(d,"soir")));renderDays();$("#daysSheet").hidden=false;}
  else if(a==="closeDays"){$("#daysSheet").hidden=true;}
  else if(a==="mealToggle"){const m=b.dataset.m;pickMeals=pickMeals.includes(m)?pickMeals.filter(x=>x!==m):[...pickMeals,m];renderDays();}
  else if(a==="dayToggle"){const d=b.dataset.d;pickDays=pickDays.includes(d)?pickDays.filter(x=>x!==d):[...pickDays,d];renderDays();}
  else if(a==="proposeDays"){if(!pickDays.length||!pickMeals.length)return;
    const had=SLOT_ORDER.some(k=>W()[k]&&!W()[k].lock&&!isPast(k));
    undoWeek=had?{week:curWeek,slots:JSON.parse(JSON.stringify(W())),locked:SLOT_ORDER.some(k=>W()[k]&&W()[k].lock)}:null;
    $("#daysSheet").hidden=true;planWeek(true,DAYS.filter(d=>pickDays.includes(d)),pickMeals);}
  else if(a==="proposeUndo"){if(undoWeek&&undoWeek.week===curWeek){menu.weeks[curWeek]=undoWeek.slots;undoWeek=null;render();saveMenu();toast("Ancienne semaine remise");}}
  else if(a==="swap"){const k=b.dataset.k;if(!W()[k])return;openPick(k,"main",true);}
  else if(a==="moreSugg"){suggSeen.push(...suggNow);renderSugg();}
  else if(a==="moreFav"){favLimit+=50;renderSugg();}
  else if(a==="lock"){const sl=W()[b.dataset.k];if(sl){if(sl.lock){cmSetMealStatus(sl,"Gardé");toast("Retiré des courses : ses ingrédients sortent de la liste");}else{cmSetMealStatus(sl,"En courses");toast("Ajouté aux courses : ses ingrédients sont dans la liste");}render();saveMenu();}}
  else if(a==="vserv"){const r=recipes[id];if(!r)return;const sl=slotsOf(id);
    const cur=viewServ[id]||(sl.length?W()[sl[0]].n:menu.people);viewServ[id]=Math.max(1,Math.min(50,cur+Number(b.dataset.d)));
    // A planned meal is the single source of truth for quantities sent to courses.
    if(recMealCtx&&W()[recMealCtx]&&W()[recMealCtx].id===id){W()[recMealCtx].n=viewServ[id];if(W()[recMealCtx].lock)cmEnsureShoppingDay(recMealCtx);saveMenu();}
    render();}
  else if(a==="vplat"){const r=recipes[id];if(!r)return;const sl=slotsOf(id),S=r.serves||4,cur=viewServ[id]||(sl.length?W()[sl[0]].n:menu.people),k=Math.max(1,platsFor(r,cur)+Number(b.dataset.d));viewServ[id]=Math.min(50,k*S);
    if(recMealCtx&&W()[recMealCtx]&&W()[recMealCtx].id===id){W()[recMealCtx].n=viewServ[id];if(W()[recMealCtx].lock)cmEnsureShoppingDay(recMealCtx);saveMenu();}
    render();}
  else if(a==="vservApply"){const n=viewServ[id];if(n){slotsOf(id).forEach(k=>W()[k].n=n);render();saveMenu();toast("Portions du menu mises à jour");}}
  else if(a==="week"){curWeek=b.dataset.w;LS.set("cm_week",curWeek);proposeAsk=0;render();}
  else if(a==="openPrefs")openPrefs();
  else if(a==="look")setLook(b.dataset.k,b.dataset.v);
  else if(a==="pickImport"){const k=pickKey,role=pickRole,w=curWeek;
    sendImport($("#pwLinks").value,t=>{$("#pwMsg").textContent=t;},{w,k,role}).then(ok=>{if(ok){$("#pwLinks").value="";
      const t0=Date.now();$("#pwMsg").textContent="⏳ Le robot lit la recette… elle sera placée sur "+slotLabel(k)+". Vous pouvez fermer cette fenêtre.";
      const tick=setInterval(()=>{const m=$("#pwMsg");if(!m.textContent.startsWith("⏳")||$("#pickSheet").hidden){clearInterval(tick);return;}
        m.textContent="⏳ Le robot lit la recette ("+Math.round((Date.now()-t0)/1000)+" s)… elle sera placée sur "+slotLabel(k)+". Vous pouvez fermer cette fenêtre.";},1000);}});}
  else if(a==="mealPortion"||a==="mealPortionCustom"){
    const k=b.dataset.k,sl=W()[k];if(!sl)return;
    let v=Number(b.dataset.v);
    if(a==="mealPortionCustom"){const x=prompt("Coefficient de portion pour ce repas (entre 0,25 et 4)",String(mealPortionFactor(sl)).replace('.',','));if(x===null)return;v=Number(x.replace(',','.'));}
    if(!Number.isFinite(v)||v<0.25||v>4){toast("Indiquez un coefficient entre 0,25 et 4");return;}
    sl.portionMultiplier=v;saveMenu();lastRecHtml="";render();renderRecSheet();toast("Portions mises à jour dans les deux applications");
  }
  else if(a==="recAlso"){const id=recSheetId,r=recipes[id];if(!r)return;saveRecipe(id,Object.assign({},r,{mainFactor:Number(b.dataset.v)}));renderRecSheet();}
  else if(a==="propSend"){const f=follows.find(x=>x.url===b.dataset.f);proposeRecipe(b.dataset.id,f);}
  else if(a==="propAdd"){propAnswer(b.dataset.p,true);}
  else if(a==="propNo"){propAnswer(b.dataset.p,false);}
  else if(a==="propView"){propOpen=propOpen===b.dataset.p?null:b.dataset.p;renderProps();}
  else if(a==="scanClose"){$("#scanSheet").hidden=true;impFile=null;$("#scanImg").classList.remove("big");if(!impFromForm){view="rec";render();}}
  else if(a==="impZoom"){openPV($("#scanImg").src,($("#qi-name").value||"recette").trim());}
  else if(a==="pvClose"){$("#photoView").hidden=true;}
  else if(a==="pvSave"){pvSave();}
  else if(a==="impOpen"){impOpen(true);}
  else if(a==="impPaste"){impOpen(false);}
  else if(a==="impOpenForm"){$("#sheet").hidden=true;impOpen(true,true);}
  else if(a==="pageZoom"){openPV(b.src,(recipes[recSheetId]||{}).name||"recette");}
  else if(a==="impCopy"){const t=$("#impPromptTxt").textContent;navigator.clipboard.writeText(t).then(()=>toast("Consigne copiée ✓"),()=>{const r=document.createRange();r.selectNodeContents($("#impPromptTxt"));const sl=getSelection();sl.removeAllRanges();sl.addRange(r);toast("Sélectionnée : touchez Copier");});}
  else if(a==="impCreate"){const text=$("#qi-text").value;if(!text.trim()){toast("Collez d'abord le texte de la recette");return;}
    const r0=ocrSplit(ocrClean(text)),nm=$("#qi-name").value.trim(),pf=impFile;
    $("#scanSheet").hidden=true;impFile=null;openSheet();setTimeout(clearSheetBack,60);
    fillForm({name:nm||r0.name,time:r0.time,serves:r0.serves,ing:r0.ing.map(l=>parseIng(l)).filter(Boolean),steps:r0.steps});formPage=pf||null;
    toast(`${r0.ing.length} ingrédients, ${r0.steps.length} étapes : vérifiez puis « Enregistrer la recette »`);}
  else if(a==="scanSave"){const name=$("#qi-name").value.trim()||"Recette du livre",text=$("#qi-text").value.replace(/\r/g,"").trim();
    const id=(norm(name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"recette")+"-"+Math.random().toString(36).slice(2,6);
    saveRecipe(id,{name,cat:"Plat",time:0,serves:4,ing:[],steps:text,createdAt:new Date().toISOString()});const pf=impFile;if(pf)savePagePhoto(id,pf);
    $("#scanSheet").hidden=true;impFile=null;view="rec";render();openRecSheet(id);setTimeout(clearSheetBack,60);toast("Recette ajoutée · ✏️ Modifier pour ajouter les ingrédients aux courses");}
  else if(a==="openAcct"){$("#acctSheet").hidden=false;renderAcct();}
  else if(a==="closeAcct"){$("#acctSheet").hidden=true;}
  else if(a==="acctMode"){acctMode=b.dataset.v;renderAcct();}
  else if(a==="acctGo"){acctSubmit();}
  else if(a==="acctOut"){cloudSignOut();}
  else if(a==="acctSync"){cloudSync(true);}
  else if(a==="acctMigrate"){cloudMigrate();}
  else if(a==="acctMembers"){loadMembers();}
  else if(a==="memSet"){setMember(b.dataset.id,b.dataset.s,b.dataset.r||null);}
  else if(a==="acctPseudo"){savePseudo();}
  else if(a==="cropCancel"){const c=crop;crop=null;$("#cropSheet").hidden=true;if(c&&c.isNew)toast("Photo non ajoutée");}
  else if(a==="cropOk"){cropSave();}
  else if(a==="cropFit"){if(crop){crop.fit=b.dataset.v;crop.z=1;crop.ox=crop.oy=0;$("#cropZoom").value=1;drawCrop();}}
  else if(a==="cropRot"){if(crop){crop.rot=(crop.rot+1)%4;crop.ox=crop.oy=0;drawCrop();}}
  else if(a==="cropReset"){if(crop){Object.assign(crop,{z:1,ox:0,oy:0,rot:0,fit:"contain"});$("#cropZoom").value=1;drawCrop();}}
  else if(a==="cropEdit"){const id2=b.dataset.id,o=cropOrig(id2),src=o||rPhotoSrc(id2);if(src)openCrop(id2,src,false).catch(()=>toast("Cette photo n'a pas pu être chargée"));}
  else if(a==="fCat"){const c=b.dataset.c;if(formCats.includes(c)){if(formCats.length===1){toast("Gardez au moins une catégorie");return;}formCats=formCats.filter(x=>x!==c);}else formCats=[...formCats,c];renderFormCats();}
  else if(a==="recCat"){const id=b.dataset.id||recSheetId,r=recipes[id],c=b.dataset.c;if(!r)return;let list=catsOf(r);
    if(list.includes(c)){if(list.length===1){toast("Une recette garde au moins une catégorie");return;}list=list.filter(x=>x!==c);}else list=[...list,c];
    const n=Object.assign({},r,{cat:list[0]});delete n.alsoMain;delete n.alsoEntree;if(list.length>1)n.cats=list.slice(1);else delete n.cats;
    saveRecipe(id,n);if(!$("#sheet").hidden)renderRecSheet();renderRecipes();toast(list.join(" · "));}
  else if(a==="recSearch"){filter.q=b.dataset.q;$("#q").value=b.dataset.q;recLimit=50;renderRecipes();}
  else if(a==="natAsk"){natAsk=natAsk===b.dataset.n?null:b.dataset.n;renderRecSheet();}
  else if(a==="natSet"){if(natAsk){menu.natures=Object.assign({},menu.natures,{[norm(natAsk)]:b.dataset.f});natAsk=null;render();renderRecSheet();saveMenu();toast("Classement retenu pour toutes les recettes");}}
  else if(a==="prefDissoc"){prefDraft.dissoc=b.dataset.v==="1";$("#pd-on").setAttribute("aria-pressed",prefDraft.dissoc);$("#pd-off").setAttribute("aria-pressed",!prefDraft.dissoc);}
  else if(a==="showSet"){LS.set("cm_show"+b.dataset.k,b.dataset.v);applyShow();renderShow();}
  else if(a==="closePrefs")$("#prefSheet").hidden=true;
  else if(a==="prefStep"){const f=b.dataset.f;prefDraft[f]=Math.max(0,Math.min(14,prefDraft[f]+Number(b.dataset.d)));$("#p-"+f).textContent=prefDraft[f];}
  else if(a==="prefLight"){prefDraft.lightEve=b.dataset.v==="1";$("#pl-on").setAttribute("aria-pressed",prefDraft.lightEve);$("#pl-off").setAttribute("aria-pressed",!prefDraft.lightEve);}
  else if(a==="prefSkip"){const d=b.dataset.d,i=prefDraft.skip.indexOf(d);if(i<0)prefDraft.skip.push(d);else prefDraft.skip.splice(i,1);b.setAttribute("aria-pressed",i<0);}
  else if(a==="pick")openPick(b.dataset.k,b.dataset.role||"main");
  else if(a==="todayPick"){const cw=ymd(mondayOf(new Date()));if(curWeek!==cw){curWeek=cw;LS.set("cm_week",cw);render();}openPick(b.dataset.k,"main");}
  else if(a==="frImport"){sendImport($("#frLinks").value,t=>{$("#frWebMsg").textContent=t;},{fr:true}).then(ok=>{if(ok)$("#frLinks").value="";});}
  else if(a==="goFridge"){const f=$("#frForm");f.scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>$("#frIn").focus({preventScroll:true}),350);}
  else if(a==="pickSet")setPicked(id);
  else if(a==="pickRandom"){
    if(pickRole==="main"){const cur=W()[pickKey];const id=bestFor(pickKey,cur?[cur.id]:[]);if(id)setPicked(id);else toast("Pas d'autre recette disponible");}
    else{const from=pickPool();if(from.length)setPicked(from[Math.floor(Math.random()*from.length)]);}}
  else if(a==="pickClear"){if(pickRole==="main")detachRemovedMealPurchases(curWeek,pickKey);if(pickRole==="main")delete W()[pickKey];else if(W()[pickKey])delete W()[pickKey][pickRole];$("#pickSheet").hidden=true;render();saveMenu();flashSlot(pickKey);}
  else if(a==="rmCourse"){removePart(b.dataset.k,b.dataset.role);}
  else if(a==="shopDel"){const i=shopping(true).find(x=>x.key===b.dataset.k);if(i){const snap=shopSnap();eraseItem(i);render();saveMenu();showUndo(i.n+" (liste de courses)",snap);}}
  else if(a==="shopClear"){shopClearAsk=true;render();}
  else if(a==="shopClearNo"){shopClearAsk=false;render();}
  else if(a==="shopClearYes"){const snap=shopSnap(); // empty list = no validated meal on these days (the menus stay planned, ready to validate again)
    for(const x of selectedShopDates())for(const[m]of MEALS){const s=x.wk[slotKey(x.dn,m)];if(s)delete s.lock;}
    menu.extras=[];menu.shopExtra={};menu.checked={};shopClearAsk=false;render();saveMenu();showUndo("toute la liste de courses",snap);}
  else if(a==="shopAdd"){const r=recipes[id];if(!r)return;
    const v=validatedUses(id);if(v.length){toast(`Déjà dans la liste avec le menu validé (${v.join(", ")}) : pour changer les quantités, touchez « Dans les courses » dans Courses`);return;}const sl=slotsOf(id);const n=viewServ[id]||(sl.length?W()[sl[0]].n:menu.people);
    menu.shopExtra=Object.assign({},menu.shopExtra,{[id]:n});render();saveMenu();toast(`${r.name} (${n} pers.) ajoutée aux courses`);}
  else if(a==="shopRm"){if(menu.shopExtra){delete menu.shopExtra[b.dataset.id];render();saveMenu();}}
  else if(a==="closePick"){$("#pickSheet").hidden=true;shopSwapCtx=null;}
  else if(a==="ideaMode"){ideaMode=b.dataset.v;favShown=10;render();}
  else if(a==="ideaFavMore"){favShown+=20;render();}
  else if(a==="reroll"){ideaSeen=[...ideaSeen,...ideaIds].slice(-30);ideaIds=[];render();}
  else if(a==="open"){confirmDel=null;seenNews(id);openRecSheet(id);} // one recipe sheet everywhere
  else if(a==="cook"){const r=recipes[id];const sl=slotsOf(id);$("#recSheet").hidden=true;startCook(id,viewServ[id]||(sl.length?W()[sl[0]].n:menu.people));}
  else if(a==="cookNext"){if(!cook)return;if(cook.i<cook.steps.length-1)cook.i++;else cook.done=true;renderCook();$("#cookIn").scrollTop=0;}
  else if(a==="cookPrev"){if(cook&&cook.i>0){cook.i--;renderCook();}}
  else if(a==="cookClose"){stopCook();}
  else if(a==="cookTimer"){if(cookTimer){cookTimer=null;}else{const s=Number(b.dataset.s)||0;if(s){const st=cook.steps[cook.i]||"";cookTimer={end:Date.now()+s*1000,label:"étape "+(cook.i+1)+" · "+recipes[cook.id].name,half:/mi-cuisson/i.test(st)&&s>=240?Date.now()+s*500:0,halfMsg:/secou/i.test(st)?"secouez le panier":/arros/i.test(st)?"arrosez":"retournez"};}
      try{const c=new(window.AudioContext||window.webkitAudioContext)();c.resume&&c.resume();}catch(e){} /* unlock sound on iPhone */}renderCook();}
  else if(a==="rateOpen"){$("#recSheet").hidden=true;openRate(id);}
  else if(a==="rateMeal"){const[w,k]=b.dataset.key.split("#");const s=((menu.weeks||{})[w]||{})[k];if(s)openRate(s.id,b.dataset.key);}
  else if(a==="rateSkip"){const[w,k]=b.dataset.key.split("#");const s=((menu.weeks||{})[w]||{})[k];if(s){s.noRate=true;saveMenu();render();}}
  else if(a==="rateStar"){const d=rateDraft[id]=rateDraft[id]||{stars:0,tags:[]};d.stars=Number(b.dataset.n);const box=cook&&cook.done&&!$("#cookSheet").hidden?$("#cookIn"):$("#rateBody");if(box===$("#cookIn"))renderCook();else box.innerHTML=rateHtml(id);}
  else if(a==="rateTag"){const d=rateDraft[id]=rateDraft[id]||{stars:0,tags:[]};const t=b.dataset.t;d.tags=d.tags.includes(t)?d.tags.filter(x=>x!==t):[...d.tags,t];if(cook&&cook.done&&!$("#cookSheet").hidden)renderCook();else $("#rateBody").innerHTML=rateHtml(id);}
  else if(a==="rateSave"){saveRating(id);if(cook&&cook.done)stopCook();$("#rateSheet").hidden=true;render();}
  else if(a==="rateClose"){$("#rateSheet").hidden=true;}
  else if(a==="cookModeSet"){cookModePick[b.dataset.id]=b.dataset.v;LS.set("cm_cookmode",cookModePick);lastRecHtml="";renderRecSheet();}
  else if(a==="cookModeGo"){if(!cook)return;cookModePick[cook.id]=b.dataset.v;LS.set("cm_cookmode",cookModePick);const sx=stepsFor(cook.id,b.dataset.v);Object.assign(cook,{steps:sx.steps,prep:sx.prep,mode:sx.mode,sx,i:0,choose:false});renderCook();}
  else if(a==="stepMode"){const v=b.dataset.v==="det"?"det":"court",d=detailOf(recipes[recSheetId],recSheetId);stepPick[recSheetId]=v;if(d&&d.same){stepMode=v;LS.set("cm_stepmode",v);}lastRecHtml="";renderRecSheet();}
  else if(a==="recTab"){switchRecTab(b.dataset.v,!b.closest(".rs-tabs"));}
  else if(a==="seeNews"){view="rec";LS.set("cm_view",view);filter.theme="nouveau";filter.q="";if($("#q"))$("#q").value="";recLimit=50;render();window.scrollTo(0,0);}
  else if(a==="cat"){filter.cat=filter.cat===b.dataset.c?"Toutes":b.dataset.c;recLimit=50;render();}
  else if(a==="openFilt"){renderFilt();$("#filtSheet").hidden=false;}
  else if(a==="closeFilt"){$("#filtSheet").hidden=true;}
  else if(a==="filtReset"){Object.assign(filter,{cats:[],kinds:[],quick:false,light:false,theme:""});recLimit=50;renderRecipes();}
  else if(a==="fT"){const k=b.dataset.k,v=b.dataset.v;if(k==="cats"||k==="kinds"){const l=filter[k]||[];filter[k]=l.includes(v)?l.filter(x=>x!==v):[...l,v];}else if(k==="theme")filter.theme=filter.theme===v?"":v;else filter[k]=!filter[k];recLimit=50;renderRecipes();}
  else if(a==="catAll"){Object.assign(filter,{cat:"Toutes",fav:false,kind:"",quick:false,light:false,theme:""});recLimit=50;render();}
  else if(a==="more"){recLimit+=50;renderRecipes();}
  else if(a==="kind"){filter.kind=b.dataset.v;recLimit=50;renderRecipes();}
  else if(a==="kindQuick"){filter.quick=!filter.quick;recLimit=50;renderRecipes();}
  else if(a==="kindLight"){filter.light=!filter.light;recLimit=50;renderRecipes();}
  else if(a==="kindTheme"){filter.theme=filter.theme===b.dataset.v?"":b.dataset.v;recLimit=50;renderRecipes();}
  else if(a==="pkindTheme"){pickTheme=pickTheme===b.dataset.v?"":b.dataset.v;renderPick();}
  else if(a==="kindFav"){filter.fav=!filter.fav;recLimit=50;renderRecipes();}
  else if(a==="pkind"){pickKind=b.dataset.v;renderPick();}
  else if(a==="pkindQuick"){pickQuick=!pickQuick;renderPick();}
  else if(a==="pkindLight"){pickLight=!pickLight;renderPick();}
  else if(a==="pkindFav"||a==="pickFavMode"){pickFav=!pickFav;syncFavMode();renderSugg();renderPick();if(pickFav)$("#pickQ").focus();}
  else if(a==="fav"){const r=recipes[id];if(!r)return;const nr=Object.assign({},r);if(nr.fav)delete nr.fav;else nr.fav=true;
    saveRecipe(id,nr);toast(nr.fav?"Ajoutée aux favoris":"Retirée des favoris");}
  else if(a==="viewRec")openRecSheet(id);
  else if(a==="closeRec"){if(fromMz){fromMz=false;location.assign(APP_URL+"maison/");return;}$("#recSheet").hidden=true;}
  else if(a==="recInList"){const rid=recSheetId;$("#recSheet").hidden=true;openRecipe(rid);}
  else if(a==="del"){confirmDel=id;render();if(!$("#recSheet").hidden){lastRecHtml="";renderRecSheet();}}
  else if(a==="delNo"){confirmDel=null;render();}
  else if(a==="delYes"){confirmDel=null;openId=null;if(recSheetId===id)$("#recSheet").hidden=true;removeRecipe(id);toast("Recette supprimée");}
  else if(a==="fDel"){const id2=editId;if(!id2)return;if(!confirm("Supprimer définitivement « "+(recipes[id2]||{}).name+" » ? Elle sera aussi retirée du menu et des courses."))return;editId=null;editBack=false;$("#sheet").hidden=true;$("#recSheet").hidden=true;removeRecipe(id2);toast("Recette supprimée");}
  else if(a==="webReplace"){const id2=editId;if(!id2)return;sendImport($("#webLink").value,t=>{$("#webMsg").textContent=t;},{replace:id2});}
  else if(a==="uncheck"){menu.checked={};(menu.extras||[]).forEach(x=>x.done=false);render();saveMenu();}
  else if(a==="openStore"){finishAsk=false;renderStore();$("#storeSheet").hidden=false;$("#storeSheet .sheet-in").scrollTop=0;}
  else if(a==="closeStore"){$("#storeSheet").hidden=true;}
  else if(a==="storeTick"){const s=b.dataset.s;
    if(s.startsWith("k:")){const k=s.slice(2);if(menu.checked[k]){delete menu.checked[k];if(menu.checkedQty)delete menu.checkedQty[k];}else{menu.checked[k]=true;(menu.checkedQty||(menu.checkedQty={}))[k]=(shopping(true).find(i=>i.key===k)||{}).q||0;}}
    else{const x=(menu.extras||[])[Number(s.slice(2))];if(x)x.done=!x.done;}
    render();renderStore();saveMenu(300);}
  else if(a==="openSide"){sideKey=b.dataset.k;renderSide();$("#sideSheet").hidden=false;$("#sideSheet .sheet-in").scrollTop=0;}
  else if(a==="closeSide"){$("#sideSheet").hidden=true;}
  else if(a==="sideToggle"){toggleSide(b.dataset.t);render();renderSide();saveMenu(300);}
  else if(a==="sideForget"){const t=b.dataset.t;menu.sides=(menu.sides||[]).filter(x=>x!==t);render();renderSide();saveMenu();}
  else if(a==="rmSide"){removePart(b.dataset.k,"extra",b.dataset.i);}
  else if(a==="shopDay"){const keys=visibleShopDates().map(x=>x.key),day=b.dataset.d;setVisibleShopDays(keys.includes(day)?keys.filter(x=>x!==day):[...keys,day]);}
  else if(a==="dsTog"){daySel[b.dataset.k]=daySel[b.dataset.k]===false;renderDaySheet();}
  else if(a==="dsSee"){const w=b.dataset.w;$("#daySheet").hidden=true;if(curWeek!==w){curWeek=w;LS.set("cm_week",w);render();}slotK=b.dataset.k;renderSlotSheet();$("#slotSheet").hidden=false;}
  else if(a==="dsApply"||a==="dsRemove"){const r=dayApply(a==="dsApply");$("#daySheet").hidden=true;render();saveMenu(300);toast(r);}
  else if(a==="closeDay")$("#daySheet").hidden=true;
  else if(a==="cmCancelCourses"){
    const k=b.dataset.k,sl=W()[k];
    if(sl&&sl.id===recSheetId&&!isPast(k)&&!["Courses faites","Terminé"].includes(cmMealStatus(sl))){
      cmSetMealStatus(sl,"Gardé");if(menu.shopExtra&&menu.shopExtra[sl.id]&&!validatedUses(sl.id).length)delete menu.shopExtra[sl.id];render();saveMenu();lastRecHtml="";renderRecSheet();toast("Repas conservé au menu, retiré des courses");
    }
  }
  else if(a==="cmRemoveMenu"){
    const k=b.dataset.k,sl=W()[k];
    if(sl&&sl.id===recSheetId&&!isPast(k)){
      const label=(recipes[sl.id]||{}).name||"ce repas";
      if(confirm("Retirer « "+label+" » du menu ?\n\nLa recette sera conservée. Les achats déjà effectués resteront enregistrés.")){
        const snap=snapshotSlot(k);
        const removedId=sl.id;
        detachRemovedMealPurchases(curWeek,k);
        if(hasSide(sl)){delete sl.id;delete sl.lock;delete sl.keep;delete sl.mealState;}
        else delete W()[k];
        // A legacy recipe-level addition can survive removal of the planned meal.
        // Clear it only if no other planned, validated meal uses this recipe.
        if(menu.shopExtra&&menu.shopExtra[removedId]&&!validatedUses(removedId).length){delete menu.shopExtra[removedId];}
        recMealCtx=null;$("#recSheet").hidden=true;render();saveMenu();showUndo(label+" ("+slotLabel(k)+")",snap);
        toast("Repas retiré du menu ; recette conservée");
      }
    }
  }
  else if(a==="cmToggleCourses"){
    const k=b.dataset.k,sl=W()[k];
    if(sl&&sl.id===recSheetId&&!isPast(k)){
      if(["Courses faites","Terminé"].includes(cmMealStatus(sl))){toast("Ce repas est déjà finalisé : ses achats sont conservés.");return;}
      const next=sl.lock?"Gardé":"En courses";
      if(next==="En courses"){
        // V7: explicit choice only when an earlier purchase covers ingredients.
        // A new preparation has separate shopping keys; no historic purchase is deleted.
        const recipe=recipes[sl.id];
        const alreadyBought=(recipe?.ing||[]).some(i=>{
          if(!i.n)return false;
          const [,u]=recipeIngredientBase(recipe,i,sl.n,"main");
          const key=norm(i.n)+"|"+u;
          const bgt=menu.bought?.[key];
          return (bgt&&bgt.until>=ymd(new Date())&&Number(bgt.q)>0)||!!menu.checked?.[key];
        });
        if(alreadyBought){
          const restart=confirm("Des ingrédients de ce repas ont déjà été achetés.\n\nOK : Recommencer les courses (nouvelle préparation).\nAnnuler : Conserver les achats précédents.");
          if(restart)sl.freshShopKey="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
          else delete sl.freshShopKey;
        }else delete sl.freshShopKey;
      }
      cmSetMealStatus(sl,next);
      if(next==="En courses")cmEnsureShoppingDay(k);
      // Legacy recipe-level additions must not double count a scheduled meal.
      // Preserve manually added articles and all other recipes.
      if(next==="En courses"&&menu.shopExtra&&menu.shopExtra[sl.id])delete menu.shopExtra[sl.id];
      saveMenu();render();lastRecHtml="";renderRecSheet();
      toast(next==="En courses"?"Repas envoyé aux courses":"Repas retiré des courses");
    }
  }
  else if(a==="cmMealState"){
    const k=b.dataset.k,state=b.dataset.state,sl=W()[k];
    if(sl&&!isPast(k)&&CM_MEAL_STATES.includes(state)){
      cmSetMealStatus(sl,state);if(state==="En courses")cmEnsureShoppingDay(k);render();saveMenu();
      if(!$("#recSheet").hidden){lastRecHtml="";renderRecSheet();}
      if(!$("#slotSheet").hidden)renderSlotSheet();
      toast("État du repas : "+state);
    }
  }
  else if(a==="shopLock"){const s=((menu.weeks||{})[b.dataset.w]||{})[b.dataset.k];if(s){if(["Courses faites","Terminé"].includes(cmMealStatus(s))){toast("Repas déjà finalisé");}else if(s.lock)lockPreview([{w:b.dataset.w,k:b.dataset.k}],true);else lockPreview([{w:b.dataset.w,k:b.dataset.k}]);}}
  else if(a==="shopSwap"&&!b.dataset.go&&mealBought(b.dataset.w,b.dataset.k)){bumpCtx={w:b.dataset.w,k:b.dataset.k};const s=menu.weeks[bumpCtx.w][bumpCtx.k];
    $("#bumpTxt").textContent=`« ${recipes[s.id].name} » (${slotLabel(bumpCtx.k)}) : ses ingrédients ont déjà été achetés. Que voulez-vous en faire ?`;$("#bumpSheet").hidden=false;}
  else if(a==="bumpClose"){$("#bumpSheet").hidden=true;bumpCtx=null;}
  else if(a==="bumpGo"){const c=bumpCtx;if(!c)return;$("#bumpSheet").hidden=true;bumpCtx=null;bumpDo(c,b.dataset.v);}
  else if(a==="useFirstDone"){menu.useFirst=(menu.useFirst||[]).filter(x=>x.id!==b.dataset.id);saveMenu();render();}
  else if(a==="shopSwap"){const w=b.dataset.w,k=b.dataset.k;shopSwapCtx={w,k};if(curWeek!==w){curWeek=w;LS.set("cm_week",w);render();}openPick(k,"main");}
  else if(a==="shopLockAll"){const t=[];for(const x of selectedShopDates())for(const[m]of MEALS){const s=x.wk[slotKey(x.dn,m)];if(s&&recipes[s.id]&&!s.lock&&!(["Courses faites","Terminé"].includes(cmMealStatus(s))))t.push({w:ymd(mondayOf(x.d)),k:slotKey(x.dn,m)});}lockPreview(t);}
  else if(a==="lockYes")lockConfirm();
  else if(a==="lockTog"){const i=lockItems.find(x=>x.key===b.dataset.k);if(i){i.buy=!i.buy;renderLock();}}
  else if(a==="lockQ"){const i=lockItems.find(x=>x.key===b.dataset.k);if(i){const st=qStep(i.u,i.bq);i.bq=Math.max(0,Math.round((i.bq+Number(b.dataset.d)*st)/st)*st);if(i.bq<=1e-6){i.bq=i.d;i.buy=false;}renderLock();}}
  else if(a==="lockAll"){lockItems.forEach(i=>i.buy=b.dataset.v==="1");renderLock();}
  else if(a==="lockNo"){lockOrigN.forEach(({t,n})=>{const s=((menu.weeks||{})[t.w]||{})[t.k];if(s)s.n=n;});lockOrigN=[];lockPend=[];lockEdit=false;$("#lockSheet").hidden=true;render();}
  else if(a==="lockN"){const t=lockPend[Number(b.dataset.i)],s=t&&((menu.weeks||{})[t.w]||{})[t.k];if(s){s.n=Math.max(1,Math.min(50,s.n+Number(b.dataset.d)));lockPreview(lockPend,lockEdit,true);}}
  else if(a==="lockUndo"){for(const t of lockPend){const s=((menu.weeks||{})[t.w]||{})[t.k];if(s)delete s.lock;}lockPend=[];lockItems=[];lockEdit=false;lockOrigN=[];$("#lockSheet").hidden=true;render();saveMenu();toast("Retiré des courses : ses ingrédients sortent de la liste");}
  else if(a==="shopDaysAll"){setVisibleShopDays(shopDates().map(x=>x.key));}
  else if(a==="shopDaysNone"){setVisibleShopDays([]);}
  else if(a==="haveRayon"){const ry=b.dataset.r,u=haveUntil();menu.have=Object.assign({},menu.have);
    shopping().filter(i=>(RAYONS.includes(i.r)?i.r:"Divers")===ry).forEach(i=>{menu.have[i.key]=u;});
    render();saveMenu(300);toast("Rayon « "+ry+" » retiré : vous avez déjà tout");}
  else if(a==="finishAsk"){finishAsk=true;renderStore();$("#storeEnd").scrollIntoView({block:"end",behavior:"smooth"});}
  else if(a==="finishNo"){finishAsk=false;renderStore();}
  else if(a==="finishYes")finishTrip();
  else if(a==="finishUndo")undoFinish();
  else if(a==="driveSel"){menu.driveSel=b.dataset.n;render();saveMenu();}
  else if(a==="openDrives"){$("#drivesSheet").hidden=false;renderDrives();}
  else if(a==="closeDrives"){$("#drivesSheet").hidden=true;}
  else if(a==="driveDel"){const ds=[...drives()];ds.splice(Number(b.dataset.i),1);menu.drives=ds;render();renderDrives();saveMenu();}
  else if(a==="tripReuse"){const t=(menu.trips||[])[Number(b.dataset.i)];if(!t)return;
    const have=new Set((menu.extras||[]).map(x=>norm(x.t)));let n=0;
    t.got.forEach(x=>{const lab=x.n+(x.q?" : "+x.q:"");if(!have.has(norm(lab))){menu.extras=[...(menu.extras||[]),{t:lab,done:false}];n++;}});
    render();saveMenu();toast(n+" article"+(n>1?"s":"")+" remis dans la liste");}
  else if(a==="driveGo"||a==="cartUndo"){const ref=b.dataset.ref,on=a==="driveGo";
    if(ref.startsWith("k:")){const k=ref.slice(2);if(on){menu.checked[k]=true;(menu.checkedQty||(menu.checkedQty={}))[k]=(shopping(true).find(i=>i.key===k)||{}).q||0;}else{delete menu.checked[k];if(menu.checkedQty)delete menu.checkedQty[k];}}
    else{const x=(menu.extras||[])[Number(ref.slice(2))];if(x)x.done=on;}
    // let the link open first, then refresh the list
    if(on)setTimeout(()=>{render();saveMenu(300);},400);else{render();saveMenu(300);}}
  else if(a==="haveIt"){e.preventDefault();const k=b.dataset.k;menu.have=Object.assign({},menu.have,{[k]:haveUntil()});
    for(const x in menu.have)if(menu.have[x]<ymd(new Date()))delete menu.have[x];
    render();saveMenu(300);toast("Retiré de la liste : vous l'avez déjà");}
  else if(a==="haveUndo"){if(menu.have){delete menu.have[b.dataset.k];render();saveMenu(300);}}
  else if(a==="haveReset"){menu.have={};render();saveMenu();}
  else if(a==="openHist"){histMonth=null;histSel=null;renderHist();$("#histSheet").hidden=false;}
  else if(a==="closeHist"){$("#histSheet").hidden=true;}
  else if(a==="histMonth"){const m=histMonth;histMonth=new Date(m.getFullYear(),m.getMonth()+Number(b.dataset.d),1);renderHist();}
  else if(a==="histDay"){histSel=b.dataset.d;renderHist();}
  else if(a==="wineNew"){openWine({k:sideKey,beer:b.dataset.beer==="1"});}
  else if(a==="wineNewFree"){openWine({});}
  else if(a==="wineOpen"&&b.closest("#recSheet")&&($("#recSheet").hidden=true,false)){}
  else if(a==="wineOpen"){openWine({id:b.dataset.id});}
  else if(a==="closeWine"){wineDraft=null;$("#wineSheet").hidden=true;}
  else if(a==="winePhotoAgain"){$("#wineFile").click();}
  else if(a==="wineParse"){wineCollect();const t=$("#wineText").value;if(!t.trim()){toast("Collez d'abord le texte de l'étiquette");return;}
    const r=parseLabel(t),d=wineDraft;["name","app","year","color","grapes"].forEach(f=>{if(r[f]&&!d[f])d[f]=r[f];});if(r.grapes&&!d.grapes)d.grapes=r.grapes;d.grapesAuto=r.grapesAuto;
    renderWineForm();toast("Fiche remplie : vérifiez et corrigez si besoin");}
  else if(a==="wineColor"){wineCollect();wineDraft.color=b.dataset.v;renderWineForm();}
  else if(a==="wineNote"){wineCollect();const v=Number(b.dataset.v);wineDraft.note=wineDraft.note===v?0:v;renderWineForm();}
  else if(a==="wineSave")wineSave();
  else if(a==="wineDel"){const id=wineDraft&&wineDraft.id;menu.wines=(menu.wines||[]).filter(w=>w.id!==id);const m=wPhotos();delete m[id];try{localStorage.setItem(WPH,JSON.stringify(m));}catch(x){}
    wineDraft=null;$("#wineSheet").hidden=true;render();saveMenu();renderWines();if(!$("#sideSheet").hidden)renderSide();toast("Vin supprimé");}
  else if(a==="openWines"){wineQ="";$("#winesQ").value="";document.querySelectorAll(".sheet").forEach(x=>x.hidden=true);view="wine";LS.set("cm_view",view);render();}
  else if(a==="winePhotoRm"){if(wineDraft){wineCollect();wineDraft._photo="";wineDraft._rm=true;wineDraft.photo=false;renderWineForm();}}
  else if(a==="winesMode"){winesMode=b.dataset.v;renderWines();}
  else if(a==="wStock"){if(wineDraft){wineCollect();wineDraft.stock=Math.max(0,(wineDraft.stock||0)+Number(b.dataset.d));renderWineForm();}}
  else if(a==="wStockL"){const w=(menu.wines||[]).find(x=>x.id===b.dataset.id);if(w){w.stock=Math.max(0,(w.stock||0)+Number(b.dataset.d));saveMenu();renderWines();if(!w.stock&&b.dataset.d==="-1")toast("Plus de bouteille de ce vin en cave");}}
  else if(a==="closeWines"){$("#winesSheet").hidden=true;}
  else if(a==="wcell"){const k=b.dataset.k;slotK=k;slotFree=null;if(!W()[k]&&!isPast(k)){openPick(k,"main",true);return;}renderSlotSheet();const panel=$("#slotSheet");panel.hidden=false;panel.querySelector(".sheet-in").scrollTop=0;const planned=W()[k];if(planned&&planned.id&&recipes[planned.id]){$("#slotSheet").hidden=true;openRecSheet(planned.id,k);}}
  else if(a==="slotValidate"){const k=b.dataset.k,s=W()[k];if(s){$("#slotSheet").hidden=true;lockPreview([{w:curWeek,k}],!!s.lock);}}
  else if(a==="weekMode"){LS.set("cm_wmode",b.dataset.v);render();}
  else if(a==="weekMore"){const m=$("#weekMoreMenu");m.hidden=!m.hidden;b.setAttribute("aria-expanded",!m.hidden);}
  else if(a==="weekValidate"){const t=weekToValidate();if(t.length)lockPreview(t);}
  else if(a==="proposeGo"){view="week";LS.set("cm_view",view);render();window.scrollTo(0,0);document.querySelector('#v-week [data-act=propose]').click();}
  else if(a==="closeSlot"){$("#slotSheet").hidden=true;slotK=null;}
  else if(a==="slotClear"){const k=b.dataset.k;if(W()[k]&&!W()[k].lock){const snap=snapshotSlot(k);delete W()[k];$("#slotSheet").hidden=true;slotK=null;render();saveMenu();showUndo("toute la case ("+slotLabel(k)+")",snap);}}
  else if(a==="wRm"){e.stopPropagation();removePart(b.dataset.k,b.dataset.part,b.dataset.i);if(!W()[b.dataset.k]){$("#slotSheet").hidden=true;slotK=null;}}
  else if(a==="weekEdit"){weekEdit=!weekEdit;renderWeek();}
  else if(a==="undoRemove")undoRemove();
  else if(a==="shareWeek")shareWeek();
  else if(a==="printWeek")printWeek();
  else if(a==="openPrefsAt"){openPrefs();const to=b.dataset.to||"menus"; // each Réglages row shows only its own part
    const T={equip:"Mon équipement",menus:"Préférences des menus",days:"Style de chaque jour",avoid:"Ingrédients à éviter",show:"Afficher dans le menu",look:"Apparence"};
    $("#prefTitle").textContent=T[to]||"Préférences";document.querySelectorAll("#prefForm [data-sec]").forEach(el=>{el.hidden=!el.dataset.sec.split(" ").includes(to);});
    if(to==="equip")renderEquip();$("#prefSheet .sheet-in").scrollTop=0;}
  else if(a==="equipSet"){const e=Object.assign({},menu.equip||{}),k=b.dataset.k,v=b.dataset.v;e[k]=k==="crans"||k==="af"?+v:k==="pc"?v==="1":v;menu.equip=e;saveMenu();lastRecHtml="";renderEquip();render();}
  else if(a==="openShare"){renderShare();$("#shareSheet").hidden=false;pollSubs();}
  else if(a==="closeShare"){const n=$("#shareName");if(n&&menu.share&&n.value.trim()!==(menu.share.name||"")){menu.share=Object.assign({},menu.share,{name:n.value.trim()});saveMenu();publishShare(true);}
    const mn=$("#myNameIn").value.trim().slice(0,40);if(mn&&mn!==myName()){LS.set("cm_myname",mn);pingFollows();}$("#shareSheet").hidden=true;}
  else if(a==="shareOn"){const on=b.dataset.v==="1";menu.share=Object.assign({id:Math.random().toString(36).slice(2,12),name:""},menu.share,{on});shareInbox();saveMenu();renderShare();if(on){publishShare(true);pollSubs();}}
  else if(a==="welcomeOk"){const n=$("#welcomeName").value.trim().slice(0,40);if(!n){$("#welcomeName").focus();toast("Indique ton prénom");return;}LS.set("cm_myname",n);$("#welcomeSheet").hidden=true;pingFollows();toast("Bienvenue "+n+" !");}
  else if(a==="welcomeSkip"){$("#welcomeSheet").hidden=true;}
  else if(a==="subHide"){const s=((menu.share||{}).subs||{})[b.dataset.u];if(s){s.hidden=true;saveMenu();renderShare();}}
  else if(a==="shareMail"){ // a real mail keeps its line breaks and paragraphs
    location.href="mailto:?subject="+encodeURIComponent("Mon carnet de recettes 🍽️")+"&body="+encodeURIComponent(shareInvite().replace(/\n/g,"\r\n"));}
  else if(a==="shareSend"){const t=shareInvite();
    if(navigator.share)navigator.share({title:"Mon carnet de recettes",text:t}).catch(()=>{});else navigator.clipboard.writeText(t).then(()=>toast("Message copié : collez-le dans un SMS ou un mail"),()=>{});}
  else if(a==="shareCopy"){navigator.clipboard.writeText(shareLink()).then(()=>toast("Lien copié"),()=>toast("Copie impossible : sélectionnez le lien à la main"));}
  else if(a==="followRefresh"){const f=follows.find(x=>x.url===b.dataset.u);if(f)refreshFollow(f);}
  else if(a==="followRm"){removeFollow(b.dataset.u);}
  else if(a==="copyShared"){copyShared(recSheetId);}
  else if(a==="openDaily"){dailyEdit=false;dailyEditT=null;dailyOpenSnap=JSON.parse(J({extras:menu.extras||[],daily:menu.daily||[],dailyCat:menu.dailyCat||{},dailyHidden:menu.dailyHidden||[]}));renderDaily();$("#dailySheet").hidden=false;$("#dailySheet .sheet-in").scrollTop=0;}
  else if(a==="closeDaily"){$("#dailySheet").hidden=true;dailyOpenSnap=null;}
  else if(a==="dailyCancel"){if(dailyOpenSnap){Object.assign(menu,dailyOpenSnap);dailyOpenSnap=null;render();saveMenu();toast("Produits remis comme avant");}$("#dailySheet").hidden=true;}
  else if(a==="dailyEditMode"){dailyEdit=!dailyEdit;dailyEditT=null;renderDaily();}
  else if(a==="dailyPick"){dailyEditT=dailyEditT===b.dataset.t?null:b.dataset.t;renderDaily();const i=$("#dailyEdName");if(i){i.scrollIntoView({block:"center"});}}
  else if(a==="dailyEdClose"){dailyEditT=null;renderDaily();}
  else if(a==="dailyEdDel"){const t=dailyEditT;if(!t)return;
    if((menu.daily||[]).includes(t)){menu.daily=menu.daily.filter(x=>x!==t);if(menu.dailyCat)delete menu.dailyCat[t];}else menu.dailyHidden=[...new Set([...(menu.dailyHidden||[]),t])];
    dailyEditT=null;renderDaily();render();saveMenu();toast(t+" supprimé des produits");}
  else if(a==="dailyEdSave"){const t=dailyEditT;if(!t)return;const nn=$("#dailyEdName").value.trim(),g=$("#dailyEdCat").value;if(!nn){toast("Donnez un nom au produit");return;}
    const exists=nn!==t&&[...(menu.daily||[]),...DAILY.flatMap(x=>x[1]).filter(x=>!dailyHidden(x))].some(x=>nk(x)===nk(nn));if(exists){toast("Ce produit existe déjà");return;}
    if((menu.daily||[]).includes(t))menu.daily=menu.daily.map(x=>x===t?nn:x);
    else{menu.dailyHidden=[...new Set([...(menu.dailyHidden||[]),t])];menu.daily=[...(menu.daily||[]),nn];} // a built-in product becomes my own version
    menu.dailyCat=Object.assign({},menu.dailyCat);delete menu.dailyCat[t];if(g!=="Mes produits")menu.dailyCat[nn]=g;
    menu.extras=(menu.extras||[]).map(x=>nk(x.t)===nk(t)?Object.assign({},x,{t:nn}):x); // also in the shopping list
    dailyEditT=null;renderDaily();render();saveMenu();toast("Produit modifié");}
  else if(a==="dailyToggle"){const t=b.dataset.t,i=inExtras(t);
    if(i>=0)menu.extras.splice(i,1);else menu.extras=[...(menu.extras||[]),{t,done:false}];
    render();renderDaily();saveMenu();}
  else if(a==="dailyRm"){const t=b.dataset.t;menu.daily=(menu.daily||[]).filter(x=>x!==t);if(menu.dailyCat)delete menu.dailyCat[t];render();renderDaily();saveMenu();toast(t+" retiré de vos produits");}
  else if(a==="rmX"){e.preventDefault();menu.extras.splice(Number(b.dataset.i),1);render();saveMenu();}
  else if(a==="copy")copyList();
  else if(a==="shareList")shareList();
  else if(a==="backup")backup();
  else if(a==="pasteRecipe"){openSheet();$("#f-title").textContent="Coller une recette";$("#pasteBox").open=true;setTimeout(()=>$("#pasteIn").focus(),80);}
  else if(a==="parsePaste"){
    const r0=ocrSplit(ocrClean($("#pasteIn").value)),r={name:r0.name,time:r0.time,serves:r0.serves,ing:r0.ing.map(l=>parseIng(l)).filter(Boolean),steps:r0.steps}, msg=$("#pasteMsg");
    if(!r.ing.length&&!r.steps.length){msg.textContent="Je n'ai pas reconnu de recette dans ce texte.";return;}
    fillForm(r);
    toast(`${r.ing.length} ingrédients, ${r.steps.length} étapes : vérifiez puis enregistrez`);
    $("#pasteBox").open=false;$("#f-name").scrollIntoView({block:"start",behavior:"smooth"});
  }
  else if(a==="openSync")openSync();
  else if(a==="copyIcs"){const u=icsUrl();try{navigator.clipboard.writeText(u).then(()=>toast("Adresse copiée"),()=>toast(u));}catch(x){toast(u);}}
  else if(a==="closeSync")$("#syncSheet").hidden=true;
  else if(a==="syncNow")runSync();
  else if(a==="syncOff"){sync=null;["cm_sync","cm_base"].forEach(k=>{try{localStorage.removeItem(k);}catch(x){}});clearTimeout(syncTimer);setStatus("off");$("#syncSheet").hidden=true;toast("Ce téléphone n'est plus synchronisé. Vos données restent ici.");}
  else if(a==="newRecipe")openSheet();
  else if(a==="goFind"){$("#findForm").scrollIntoView({block:"start",behavior:"smooth"});}
  else if(a==="closeSheet"){$("#sheet").hidden=true;editId=null;} // the window it came from reopens by itself
  else if(a==="rphotoRm"){removeRecipePhoto(id);}
  else if(a==="autoNext"){const r=recipes[id],l=autoList(id).filter(x=>!rejected(r).has(x.u));if(r&&l.length>1){const cur=l.findIndex(x=>x.u===r.autoPick),ni=((cur>=0?cur:Number(r.autoIdx)||0)+1)%l.length;saveRecipe(id,Object.assign({},r,{autoIdx:ni,autoPick:l[ni].u}));}else toast("Pas d'autre photo trouvée pour ce plat");}
  else if(a==="photoPick"){openPhotoPick(id);}
  else if(a==="openReview"){reviewMode="all";reviewLimit=60;renderReview();$("#reviewSheet").hidden=false;$("#reviewSheet .sheet-in").scrollTop=0;}
  else if(a==="closeReview"){$("#reviewSheet").hidden=true;}
  else if(a==="reviewMode"){reviewMode=b.dataset.v;reviewLimit=60;renderReview();}
  else if(a==="reviewMore"){reviewLimit+=60;renderReview();}
  else if(a==="reviewPick"){openPhotoPick(id);}
  else if(a==="closePhoto"){$("#photoSheet").hidden=true;}
  else if(a==="photoReject"){const c=photoCands[Number(b.dataset.i)],r=recipes[photoId];if(c&&r){const n=Object.assign({},r,{noPh:[...new Set([...(r.noPh||[]),c.u])].slice(-40)});
      if(n.pick&&n.pick.u===c.u)delete n.pick;if(n.autoPick===c.u)delete n.autoPick;saveRecipe(photoId,n);renderPhotoGrid();toast("Photo supprimée pour ce plat");}}
  else if(a==="photoChoose"){choosePhoto(photoCands[Number(b.dataset.i)]);}
  else if(a==="photoPaste"){pasteImage();}
  else if(a==="photoUrlOk"){const u=$("#photoUrl").value.trim();if(!/^https:\/\/\S+$/.test(u)){toast("Collez une adresse qui commence par https://");return;}
    const t=new Image();t.onload=()=>choosePhoto({u,page:u,src:(()=>{try{return new URL(u).hostname.replace(/^www\./,"");}catch(e){return"internet";}})()});t.onerror=()=>toast("Cette adresse n'est pas une image lisible");t.src=u;}
  else if(a==="siteOff"){const r=recipes[id];if(r){const n=Object.assign({},r);delete n.image;delete n.noAuto;saveRecipe(id,n);}}
  else if(a==="autoOn"){const r=recipes[id];if(r){const n=Object.assign({},r);delete n.noAuto;saveRecipe(id,n);}}
  else if(a==="autoOff"){const r=recipes[id];if(r){const n=Object.assign({},r,{noAuto:true});delete n.pick;delete n.autoPick;delete n.image;saveRecipe(id,n);toast("Photo retirée : « Ajouter ma photo » reste possible");}}
  else if(a==="editRec"){editRecipe(b.dataset.id||recSheetId);}
  else if(a==="variantRec"){createRecipeVariant(b.dataset.id||recSheetId);}
  else if(a==="addIng")addIngRow();
  else if(a==="rmIng")b.closest(".ing-block").remove();
});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.dataset.act==="check"){if(t.checked){menu.checked[t.dataset.k]=true;(menu.checkedQty||(menu.checkedQty={}))[t.dataset.k]=(shopping(true).find(i=>i.key===t.dataset.k)||{}).q||0;}else{delete menu.checked[t.dataset.k];if(menu.checkedQty)delete menu.checkedQty[t.dataset.k];}render();saveMenu(300);}
  if(t.dataset.act==="checkX"){menu.extras[Number(t.dataset.i)].done=t.checked;render();saveMenu(300);}
});
$("#q").value=filter.q||"";
$("#q").addEventListener("input",e=>{filter.q=e.target.value;recLimit=50;renderRecipes();const w=$("#recList .web-find");if(w)setTimeout(()=>{const r=w.getBoundingClientRect(),vh=window.visualViewport?visualViewport.height:innerHeight;if(r.bottom>vh)w.scrollIntoView({block:"end",behavior:"smooth"});},250);});
$("#extraForm").addEventListener("submit",e=>{e.preventDefault();const v=$("#extraIn").value.trim();if(!v)return;
  menu.extras=[...(menu.extras||[]),{t:v,done:false}];$("#extraIn").value="";render();saveMenu();});

async function shareList(){
  const t=listText(); if(!t){toast("La liste est vide pour l'instant");return;}
  const title="Courses · semaine du "+shortDate(weekStartDate());
  if(navigator.share){
    try{await navigator.share({title,text:title+"\n\n"+t});return;}
    catch(e){if(e&&e.name==="AbortError")return;}
  }
  copyList(); toast("Liste copiée : collez-la dans une note");
}
function listText(){
  const items=shopping().filter(i=>!menu.checked[i.key]);
  const lines=[];
  for(const ry of RAYONS){const its=items.filter(i=>(RAYONS.includes(i.r)?i.r:"Divers")===ry);if(!its.length)continue;
    lines.push(ry.toUpperCase());its.sort((a,b)=>a.n.localeCompare(b.n,"fr")).forEach(i=>{const q=fmt(i.q,i.u);lines.push(i.n+(q?" : "+q:"")+(i.from.length?"  ("+i.from.join(", ")+")":""));});lines.push("");}
  const ex=(menu.extras||[]).filter(x=>!x.done);
  if(ex.length){lines.push("EN PLUS");ex.forEach(x=>lines.push(x.t));}
  return lines.join("\n").trim();
}
function copyList(){
  const t=listText(); if(!t){toast("Rien à copier pour l'instant");return;}
  const fallback=()=>{const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();
    let ok=false;try{ok=document.execCommand("copy");}catch(e){} ta.remove();toast(ok?"Liste copiée":"Copie impossible ici : sélectionnez la liste à la main");};
  try{navigator.clipboard.writeText(t).then(()=>toast("Liste copiée"),fallback);}catch(e){fallback();}
}

/* ---------- new recipe sheet ---------- */
$("#f-cat").innerHTML=CATS.map(c=>`<option>${c}</option>`).join("");
let formCats=["Plat"],formPage=null;
function renderFormCats(){if(!formCats.length)formCats=["Plat"];$("#f-cat").value=formCats[0];
  $("#f-cats").innerHTML=CATS.map(c=>{const on=formCats.includes(c);return`<span class="dchip${on?" on":""}"><button type="button" data-act="fCat" data-c="${c}" aria-pressed="${on}">${on?"✓ ":""}${c}${on&&formCats[0]===c&&formCats.length>1?" (principale)":""}</button></span>`;}).join("");}
let ingSeq=0;
function addIngRow(init){
  const i=ingSeq++;
  const d=document.createElement("div");d.className="ing-block";
  d.innerHTML=`<div class="ing-row"><input id="iq${i}" class="iq" type="number" min="0" step="any" inputmode="decimal" placeholder="Qté" aria-label="Quantité">
   <select id="iu${i}" class="iu" aria-label="Unité">${UNITS.map(u=>`<option${u==="g"?" selected":""}>${u}</option>`).join("")}</select>
   <input id="in${i}" class="in" placeholder="Ingrédient" aria-label="Ingrédient">
   <button type="button" class="del" data-act="rmIng" aria-label="Retirer l'ingrédient">×</button>
   <span></span><select id="ir${i}" class="ir r" aria-label="Rayon">${RAYONS.map(r=>`<option${r==="Épicerie"?" selected":""}>${r}</option>`).join("")}</select></div>`;
  const nameIn=d.querySelector(".in"), ry=d.querySelector(".ir");
  nameIn.addEventListener("change",()=>{const was=nameIn.dataset.cur||"",now=nameIn.value.trim();if(was&&now&&norm(was)!==norm(now))renameInSteps(was,now);nameIn.dataset.cur=now;});
  ry.addEventListener("change",()=>ry.dataset.touched="1");
  nameIn.addEventListener("input",()=>{if(ry.dataset.touched)return;const g=GUESS.find(([re])=>re.test(nameIn.value));ry.value=g?g[1]:"Épicerie";});
  if(init){d.querySelector(".iq").value=init.q||"";d.querySelector(".iu").value=UNITS.includes(init.u)?init.u:"pièce";nameIn.value=init.n||"";nameIn.dataset.cur=init.n||"";
    ry.value=RAYONS.includes(init.r)?init.r:"Divers";ry.dataset.touched="1";}
  $("#f-ings").appendChild(d);
}
// "lentilles vertes (cuites)" → "crème de soja": change the name in the steps too (with or without what is in brackets)
function renameInSteps(was,now){const ta=$("#f-steps");if(!ta||!ta.value)return;
  const core=s=>s.replace(/\s*\([^)]*\)\s*/g," ").replace(/\s+/g," ").trim();
  const forms=[...new Set([was.trim(),core(was)])].filter(f=>f.length>=3).sort((a,b)=>b.length-a.length);
  let txt=ta.value,n=0;
  if(forms.length){const re=new RegExp("(^|[^a-zà-ÿœæ])("+forms.map(f=>f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")(?=$|[^a-zà-ÿœæ])","gi");
    txt=txt.replace(re,(m,pre)=>{n++;return pre+core(now);});} // one pass, longest form first
  if(n){ta.value=txt;const note=$("#f-stepsNote");note.textContent=`✓ « ${core(was)} » remplacé par « ${core(now)} » dans ${n} étape${n>1?"s":""}. Relisez la préparation et adaptez-la si besoin.`;note.style.color="var(--accent)";ta.classList.add("flash");setTimeout(()=>ta.classList.remove("flash"),1200);}
  else{const note=$("#f-stepsNote");note.textContent=`« ${core(was)} » n'apparaît pas dans les étapes : pensez à adapter la préparation pour « ${core(now)} ».`;note.style.color="";}
}
/* ---------- paste a recipe (text from Live Text, a site, a message) ---------- */
const NB="(?![a-zà-ÿ])";
const UNIT_RE=[
  [new RegExp("^(?:kg|kilos?|kilogrammes?)\\.?"+NB,"i"),"kg"],
  [new RegExp("^(?:g|gr|grs|grammes?)\\.?"+NB,"i"),"g"],
  [new RegExp("^(?:ml|millilitres?)\\.?"+NB,"i"),"ml"],
  [new RegExp("^(?:cl|centilitres?)\\.?"+NB,"i"),"cl"],
  [new RegExp("^(?:dl|d(?:é|e)cilitres?)\\.?"+NB,"i"),"dl"],
  [new RegExp("^(?:l|litres?)\\.?"+NB,"i"),"l"],
  [new RegExp("^(?:cuill?(?:è|e)res?|cuill?\\.?|c\\.?)\\s*(?:à|a)[\\s.]*(?:soupe|s)\\.?"+NB,"i"),"c. à s."],
  [new RegExp("^(?:càs|cas|cs|tbsp)"+NB,"i"),"c. à s."],
  [new RegExp("^(?:cuill?(?:è|e)res?|cuill?\\.?|c\\.?)\\s*(?:à|a)[\\s.]*(?:caf(?:é|e)|c)\\.?"+NB,"i"),"c. à c."],
  [new RegExp("^(?:càc|cac|cc|tsp)"+NB,"i"),"c. à c."],
  [new RegExp("^pinc(?:é|e)es?"+NB,"i"),"pincée"],
  [new RegExp("^bottes?"+NB,"i"),"botte"],
  [new RegExp("^tranches?"+NB,"i"),"tranche"],
  [new RegExp("^bo(?:î|i)tes?"+NB,"i"),"boîte"],
  [new RegExp("^sachets?"+NB,"i"),"sachet"],
];
const FRAC={"½":".5","¼":".25","¾":".75","⅓":".33","⅔":".67","⅛":".125"};
const H_ING=/^(ingr(?:é|e)dients?|il vous faut|pour la (?:pâte|sauce|garniture|farce|p(?:â|a)te)|liste des ingr)/i;
const H_STEP=/^(?:la )?(?:pr(?:é|e)paration|(?:é|e)tapes?|instructions?|m(?:é|e)thode|d(?:é|e)roul(?:é|e)|recette|r(?:é|e)alisation|progression)\s*:?\s*$/i;
const TIME=/^(?:temps(?:\s+de)?|pr(?:é|e)paration|cuisson|repos|total|dur(?:é|e)e)[^\d]{0,25}(\d+)\s*(min|mn|h|heures?)\b\.?\s*(\d+)?/i;
const META=/(temps|pr(?:é|e)paration|cuisson|repos|difficult|co(?:û|u)t|budget|portions?|personnes?|parts?|calories|kcal)/i;
function pnum(s){
  s=String(s).replace(/[½¼¾⅓⅔⅛]/g,m=>FRAC[m]).replace(",",".").trim();
  let m;
  if((m=s.match(/^(\d+)\s+(\d+)\/(\d+)$/)))return +m[1]+ +m[2]/ +m[3];
  if((m=s.match(/^(\d+)\/(\d+)$/)))return +m[1]/ +m[2];
  if((m=s.match(/^(\d*)\.?(\d+)$/))&&!/^\d+$/.test(s)&&s.startsWith("."))return parseFloat("0"+s);
  if((m=s.match(/^(\d+)\.(\d+)$/)))return parseFloat(s);
  if((m=s.match(/^(\d+)(\.\d+)?$/)))return parseFloat(s);
  return NaN;
}
const QTY="(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?\\s*[½¼¾⅓⅔⅛]?|[½¼¾⅓⅔⅛])";
const WORDNUM={"un":1,"une":1,"deux":2,"trois":3,"quatre":4,"cinq":5,"six":6,"sept":7,"huit":8,"dix":10,"douze":12,"demi":0.5,"une demi":0.5};
function cleanName(n){
  return n.replace(/^\s*(de\s+|d['’]\s*|des\s+|du\s+)/i,"").replace(/\s+/g," ").replace(/[.;,:]+$/,"").trim();
}
function unitAndName(rest){
  rest=rest.trim();
  for(const[re,u]of UNIT_RE){const m=rest.match(re);if(m)return{u,n:cleanName(rest.slice(m[0].length))};}
  return{u:"pièce",n:cleanName(rest)};
}
function parseIng(line){
  let l=line.replace(/^[\s•·\-–—*▪◦○●✓☐]+/,"").replace(/\s+/g," ").trim();
  if(!l)return null;
  let m, q=0, u="pièce", n=l;
  if((m=l.match(new RegExp("^"+QTY+"\\s*(.*)$")))){
    q=pnum(m[1].replace(/\s+(?=[½¼¾⅓⅔⅛])/,"")); ({u,n}=unitAndName(m[2]));
    if(isNaN(q))q=0;
  }else if((m=l.match(/^(une demi|un|une|deux|trois|quatre|cinq|six|sept|huit|dix|douze|demi)\s+(.*)$/i))){
    q=WORDNUM[m[1].toLowerCase()]; ({u,n}=unitAndName(m[2]));
  }else if((m=l.match(new RegExp("^(.+?)\\s*[:\\-–—]\\s*"+QTY+"\\s*(.*)$")))){
    q=pnum(m[2]); const r=unitAndName(m[3]||""); u=r.u; n=cleanName(m[1]);
    if(r.n)n+=" "+r.n;
  }else if((m=l.match(new RegExp("^(.+?)\\s*\\(\\s*"+QTY+"\\s*([^)]*)\\)\\s*$")))){
    q=pnum(m[2]); const r=unitAndName(m[3]||""); u=r.u; n=cleanName(m[1]);
  }
  if(u==="dl"){q=q*10;u="cl";}
  n=n.replace(/\s*\((?:facultatif|optionnel)\)/i,"").trim();
  if(!n)return null;
  if(n.length>1&&n.slice(1)!==n.slice(1).toUpperCase())n=n.charAt(0).toLowerCase()+n.slice(1);
  return{q:Math.round(q*100)/100,u,n,r:guessRayon(n)};
}
function guessRayon(n){const g=GUESS.find(([re])=>re.test(n));return g?g[1]:"Épicerie";}
function looksLikeIng(l){
  const s=l.replace(/^[\s•·\-–—*▪◦○●✓☐]+/,"").trim();
  if(!s||s.length>90)return false;
  if(/^(\d+)\s*[.)]\s+\S/.test(s)&&s.length>40)return false;            // "1. Préchauffez le four…"
  if(new RegExp("^"+QTY).test(s))return true;
  if(/^(une demi|un|une|deux|trois|quatre|cinq|six|huit|dix|douze)\s+\S/i.test(s)&&s.split(" ").length<=7)return true;
  if(/^[^.!?]{2,40}\s*[:\-–]\s*\d/.test(s))return true;
  if(/\(\s*\d/.test(s)&&s.length<50)return true;
  if(/^(sel|poivre|sel et poivre|huile|beurre|persil|ciboulette|thym|laurier|muscade)\b/i.test(s)&&s.length<40)return true;
  return false;
}
function stepText(l){return l.replace(/^[\s•·\-–—*]+/,"").replace(/^(?:(?:é|e)tape\s*)?\d+\s*[.):\-–]?\s*/i,"").trim();}
function parseRecipeText(text){
  const raw=String(text||"").replace(/\r/g,"").split("\n").map(s=>s.replace(/\s+/g," ").trim()).filter(Boolean);
  const out={name:"",serves:0,time:0,ing:[],steps:[]};
  let mode="", minutes=0;
  for(const line of raw){
    const sv=line.match(/(?:pour|recette pour)\s*(\d+)\s*(?:personnes?|pers\.?|parts?|portions?|couverts?)|(\d+)\s*(?:personnes?|pers\.|parts|portions|couverts)\b/i);
    if(sv&&!out.serves&&line.length<60){out.serves=+(sv[1]||sv[2]);if(!H_ING.test(line))continue;}
    const tm=line.length<60&&line.match(TIME);
    if(tm){
      if(/^total|temps total/i.test(line)){minutes=-1e6;} // a total wins over the parts
      const v=/^h/i.test(tm[2])?(+tm[1])*60+(tm[3]?+tm[3]:0):+tm[1];
      if(/total/i.test(line))minutes=v+1e7; else if(minutes<1e6)minutes+=v;
      continue;
    }
    if(H_ING.test(line)&&line.length<50){mode="ing";const rest=line.replace(H_ING,"").replace(/^[\s:]+/,"");
      const sv2=rest.match(/(\d+)/); if(sv2&&!out.serves&&/pers|part|portion/i.test(rest))out.serves=+sv2[1];
      continue;}
    if(H_STEP.test(line)&&line.length<40){mode="step";continue;}
    if(!out.name&&!mode&&line.length<80&&!looksLikeIng(line)){out.name=line.replace(/[.:]+$/,"");continue;}
    if(mode==="ing"||(!mode||mode==="")&&looksLikeIng(line)){
      if(mode!=="ing"&&!looksLikeIng(line)){mode="step";}
      else if(mode==="ing"&&line.length>90){mode="step";}
      else{const p=parseIng(line);if(p)out.ing.push(p);continue;}
    }
    if(mode==="step"||line.length>=40||out.ing.length){mode="step";const t=stepText(line);
      if(t){ // glue lines broken in the middle of a sentence (Live Text wraps them)
        const prev=out.steps[out.steps.length-1];
        if(prev&&!/[.!?:]$/.test(prev)&&/^[a-zàâçéèêëîïôûù]/.test(t)&&!/^\d/.test(line))out.steps[out.steps.length-1]=prev+" "+t;
        else out.steps.push(t);}
    }
  }
  out.time=minutes>=1e7?minutes-1e7:Math.max(0,minutes);
  if(out.name&&out.name===out.name.toUpperCase())out.name=out.name.charAt(0)+out.name.slice(1).toLowerCase();
  if(!out.serves)out.serves=0;
  return out;
}

/* ---------- week planner ---------- */
let proposeAsk=0, undoWeek=null, prefDraft=null, rerollAvoid=[];
const KIND_LABEL={poisson:"poisson",rouge:"viande rouge",volaille:"volaille",porc:"porc",vege:"végé"};
const THEMES=[["nouveau","🆕 Nouveautés"],["partage","Partagées"],["fete","Fêtes"],["dissocie","Dissocié"],["lowkcal","Peu calorique"],["lowcarb","Peu de glucides"],["legumes","Légumes"],["reequilibrage","Rééquilibrage"],["dessert-legumes","Desserts aux légumes"],["detail","📝 Étapes détaillées"],["airfryer","🌀 Faisable à l'air fryer"]];
const THEME_LABEL=Object.fromEntries(THEMES);
// computed from the calorie estimate: main dishes ≤ 350 kcal (desserts ≤ 200), ≤ 20 g of carbs per person
function isLowKcal(r){const n=nutri(r);return !!n&&!n.part&&n.k<=(r.cat==="Dessert"?200:350);}
function isLowCarb(r){const n=nutri(r);return !!n&&!n.part&&n.g<=20;}
const hasTheme=(r,t)=>(t==="detail"&&!!detailOf(r))||(t==="airfryer"&&(()=>{const d=detailOf(r);return!!(d&&d.modes&&d.modes.airfryer);})())||(t==="nouveau"&&!!r.shared&&Object.keys(shNews).some(id=>recipes[id]===r))||(t==="partage"&&!!r.shared)||(t==="dissocie"&&recipeDissoc(r).ok)||(r.tags||[]).includes(t)||(t==="lowcarb"&&isLowCarb(r))||(t==="lowkcal"&&isLowKcal(r));
const KIND_CHIPS=[["","Tout"],["poisson","Poisson"],["volaille","Volaille"],["rouge","Viande rouge"],["porc","Porc"],["vege","Végé"]];
const deacc=t=>norm(t).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/œ/g,"oe");
/* search words that mean a family of recipes */
const FAMILY=[[/^(favoris?|favorites?|prefere(e|es|s)?)$/,r=>!!r.fav],[/^(leger|legers|legere|legeres|light)$/,r=>isLight(r)],[/^(poissons?|fruits? de mer|mer)$/,r=>kindOf(r)==="poisson"],[/^viandes?$/,r=>["rouge","volaille","porc"].includes(kindOf(r))],
  [/^(vege|vegetariens?|vegetariennes?|sans viande)$/,r=>kindOf(r)==="vege"],[/^(volailles?)$/,r=>kindOf(r)==="volaille"],
  [/^(viande rouge|boeuf)$/,r=>kindOf(r)==="rouge"],[/^(rapides?|express)$/,r=>r.cat==="Rapide"||(r.time||0)&&r.time<=30]];
const LIGHT_RE=/salade|papillote|vapeur|velout|bouillon|soupe|carpaccio|tartare|gaspacho|omelette|po(?:ê|e)l(?:é|e)e de l(?:é|e)gumes|wok de l(?:é|e)gumes|bowl|ceviche|gravlax|rouleaux de printemps/i;
const HEAVY_RE=/gratin|tartiflette|raclette|fondue|lasagnes|cassoulet|choucroute|croziflette|aligot|truffade|mont-d'or|baeckeoffe|potée|pot-au-feu|burger|frites|carbonade|confit|cordon bleu|macaroni|pizza|flammekueche|welsh/i;
function isLight(r){if(!r)return false;if(r.light)return true;if(HEAVY_RE.test(r.name))return false;return r.cat==="Soupe"||LIGHT_RE.test(r.name);}
function isHeavy(r){return !!r&&!r.light&&(HEAVY_RE.test(r.name)||(r.time||0)>=90);}
// likeness of two words from shared letter pairs (tatzaki ~ tzatziki)
function bigrams(s){const t=deacc(s).replace(/[^a-z0-9]/g,"");const b=[];for(let i=0;i<t.length-1;i++)b.push(t.slice(i,i+2));return b;}
function likeness(a,b){const x=bigrams(a),y=bigrams(b);if(!x.length||!y.length)return 0;const m=[...y];let c=0;x.forEach(g=>{const i=m.indexOf(g);if(i>=0){c++;m.splice(i,1);}});return 2*c/(x.length+y.length);}
function closeNames(q,ids){const words=deacc(q).split(/\s+/).filter(w=>w.length>2);if(!words.length)return[];
  return ids.map(id=>{const nw=deacc(recipes[id].name).split(/[\s,'’-]+/);const s=words.reduce((a,w)=>a+Math.max(...nw.map(n=>likeness(w,n))),0)/words.length;return[id,s];})
    .filter(x=>x[1]>=0.45).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);}
function recMatch(r,q,kind,quick,light,fav,theme){
  if(fav&&!r.fav)return false;
  if(theme&&!hasTheme(r,theme))return false;
  if(light&&!isLight(r))return false;
  if(kind&&kindOf(r)!==kind)return false;
  if(quick&&!(r.time&&r.time<=30))return false;
  const nq=deacc(q||"").trim(); if(!nq)return true;
  if(/^(desserts? (aux |de |avec des )?legumes|gateaux? (aux )?legumes)$/.test(nq))return hasTheme(r,"dessert-legumes");
  if(/^(reequilibrage|equilibre|equilibres?|sain|sains)$/.test(nq))return hasTheme(r,"reequilibrage");
  if(/^(low ?carb|sans glucides|peu de glucides|pauvre en glucides|allege en glucides|glucides)$/.test(nq))return hasTheme(r,"lowcarb");
  if(/^(peu calorique|peu de calories|pauvre en calories|calories|leger en calories|minceur)$/.test(nq))return hasTheme(r,"lowkcal");
  const fam=FAMILY.find(([re])=>re.test(nq)); if(fam)return fam[1](r);
  const words=nq.split(/\s+/);
  const hay=deacc(r.name+" "+(r.cat||"")+" "+KIND_LABEL[kindOf(r)]+" "+(r.ing||[]).map(i=>i.n).join(" "));
  return words.every(w=>hay.includes(w));
}
function renderFilt(){const ch=(k,v,l,on)=>`<button type="button" class="chip" data-act="fT" data-k="${k}" data-v="${esc(v)}" aria-pressed="${on}">${on?"✓ ":""}${l}</button>`;
  const n=Object.entries(recipes).length;
  const anyShared=Object.values(recipes).some(r=>r.shared);
  $("#filtBody").innerHTML=`<div class="field"><span class="label">Type de plat</span><div class="filt-grid">${CATS.map(c=>ch("cats",c,c,(filter.cats||[]).includes(c))).join("")}</div></div>
   <div class="field"><span class="label">Régime</span><div class="filt-grid">${[["vege","Végé"],["poisson","Poisson"],["volaille","Volaille"],["rouge","Viande rouge"],["porc","Porc"]].map(([v,l])=>ch("kinds",v,l,(filter.kinds||[]).includes(v))).join("")}${ch("light","1","Léger",!!filter.light)}</div></div>
   <div class="field"><span class="label">Temps</span><div class="filt-grid">${ch("quick","1","⏱ 30 min et moins",!!filter.quick)}</div></div>
   <div class="field"><span class="label">Thèmes (un seul)</span><div class="filt-grid">${THEMES.filter(([v])=>v!=="partage"||anyShared).map(([v,l])=>ch("theme",v,l,filter.theme===v)).join("")}</div></div>`;
  const cnt=document.querySelectorAll("#recList article").length;$("#filtOk").textContent="Voir les recettes";}
function kindChipsHtml(act,cur,quick,light,fav,theme){
  // choosing a dessert: "Desserts aux légumes" replaces "Légumes"; choosing a main dish: no dessert filter
  const anyShared=Object.values(recipes).some(r=>r.shared);
  const th=THEMES.filter(([v])=>(v!=="partage"||anyShared)&&(v!=="nouveau"||(act==="kind"&&(newsCount()||theme==="nouveau")))&&(act!=="pkind"?true:pickRole==="dessert"?v!=="legumes":v!=="dessert-legumes"));
  return th.map(([v,l])=>`<button type="button" class="chip" data-act="${act}Theme" data-v="${v}" aria-pressed="${theme===v}">${l}</button>`).join("")+KIND_CHIPS.map(([v,l])=>`<button type="button" class="chip" data-act="${act}" data-v="${v}" aria-pressed="${cur===v}">${l}</button>`).join("")
    +`<button type="button" class="chip" data-act="${act}Quick" aria-pressed="${quick}">30 min et moins</button>`
    +`<button type="button" class="chip" data-act="${act}Light" aria-pressed="${!!light}">Léger</button>`
    +(act==="kind"?"":`<button type="button" class="chip" data-act="${act}Fav" aria-pressed="${!!fav}">★ Favoris</button>`);
}
const KIND_RE=[["poisson",/saint-jacques|huître|homard|langoust|saumon|cabillaud|thon|crevette|poisson|colin|merlu|truite|sardine|maquereau|moule|lieu|dorade|bar\b/i],
  ["rouge",/b(?:œ|oe)uf|veau|agneau|steaks? hach|entrecôte|tournedos|bourguignon|bavette|kefta|merguez|gigot|mouton|chevreuil|sanglier|biche/i],
  ["volaille",/poulet|dinde|canard|volaille|pintade|chapon|magret|lapin|caille|coquelet|oie\b/i],
  ["porc",/porc|lardon|jambon|saucisse|chorizo|bacon|rôti de porc|chipolata/i]];
// match only at the start of a word ("moule" must not match "semoule")
KIND_RE.forEach(x=>{x[1]=new RegExp("(?:^|[^a-zà-ÿœ])(?:"+x[1].source+")","i");});
const kindCache=new Map();
function kindOf(r){
  const key=r.name+"|"+(r.ing||[]).map(i=>i.n).join(",");
  if(kindCache.has(key))return kindCache.get(key);
  const names=(r.ing||[]).map(i=>i.n).filter(n=>!/bouillon|fond de/i.test(n)).join(" ")+" "+r.name;
  const k=(KIND_RE.find(([,re])=>re.test(names))||["vege"])[0];
  kindCache.set(key,k);return k;
}
const isWeekday=k=>DAYS.indexOf(k.split("|")[0])<5;
const skipped=k=>k.endsWith("|midi")&&menu.prefs.skip.includes(k.split("|")[0]);
function avoidList(){return menu.prefs.avoid.split(",").map(norm).filter(Boolean);}
function eligible(){
  const av=avoidList();
  return Object.keys(recipes).filter(id=>{const r=recipes[id];if(!canMain(r))return false;
    if(r.linkOnly)return false;
    if(menu.prefs.dissoc&&!recipeDissoc(r).ok)return false;
    return !av.some(a=>norm(r.name).includes(a)||(r.ing||[]).some(i=>norm(i.n).includes(a)));});
}
/* style chosen per day in the preferences */
const DAY_STYLES=[["","Libre"],["reequilibrage","Rééquilibrage"],["legumes","Légumes"],["vege","Végétarien"],["poisson","Poisson"],["lowkcal","Peu calorique"],["lowcarb","Peu de glucides"],["rapide","Rapide"],["plaisir","Plaisir"],["fete","Fête"]];
const STYLE_OK={
  reequilibrage:r=>hasTheme(r,"reequilibrage")||(isLight(r)&&!isHeavy(r)),
  legumes:r=>hasTheme(r,"legumes")||(kindOf(r)==="vege"&&isLight(r)),
  vege:r=>kindOf(r)==="vege",
  poisson:r=>kindOf(r)==="poisson",
  lowcarb:r=>hasTheme(r,"lowcarb"),
  lowkcal:r=>hasTheme(r,"lowkcal"),
  rapide:r=>r.cat==="Rapide"||(r.time||0)>0&&r.time<=30,
  fete:r=>hasTheme(r,"fete"),
  plaisir:r=>!!r.fav||isHeavy(r)||r.cat==="Plat"&&!isLight(r),
};
function scoreFor(id,k,week){
  const r=recipes[id], kd=kindOf(r), t=r.time||0, midi=k.endsWith("midi"), wd=isWeekday(k);
  let sc=Math.random()*1.5;
  {const rt=ratingOf(r);if(rt)sc+=(rt.avg-3)*0.8;} // well-rated dishes come back more often
  if(midi&&wd){if(r.cat==="Rapide"||t<=30)sc+=2;else if(t>45)sc-=2.5;}
  if(t>=75)sc+=wd?-3:1.5;
  if(r.cat==="Soupe")sc+=midi?-1.5:0.8;
  if(r.fav)sc+=1;
  const st=(menu.prefs.days||{})[k.split("|")[0]];
  if(st&&STYLE_OK[st])sc+=STYLE_OK[st](r)?6:-2;
  if(!midi&&menu.prefs.lightEve){sc+=isLight(r)?3.5:-1.5;if(isHeavy(r))sc-=3;}
  const idx=SLOT_ORDER.indexOf(k), near=[-2,-1,1,2].map(o=>week[SLOT_ORDER[idx+o]]).map(x=>x&&recipes[x]);
  [near[1],near[2]].forEach(n=>{if(n&&kindOf(n)===kd&&kd!=="vege")sc-=3;});
  [near[0],near[3]].forEach(n=>{if(n&&kindOf(n)===kd&&kd!=="vege")sc-=1;});
  if(near.some(n=>n&&n.cat==="Soupe")&&r.cat==="Soupe")sc-=1.5;
  const used=Object.values(week).filter(Boolean);
  if(used.includes(id))sc-=6;
  const count=x=>used.filter(u=>recipes[u]&&kindOf(recipes[u])===x).length;
  const left=SLOT_ORDER.filter(x=>!week[x]&&!skipped(x)).length||1;
  if(kd==="vege"){const need=menu.prefs.veg-count("vege");sc+=need>0?1+need/left*4:-0.3;}
  if(kd==="poisson"){const need=menu.prefs.fish-count("poisson");sc+=need>0?1+need/left*4:-2;}
  const near1=[...weekIds(ymd(addDays(parseYmd(curWeek),-7))),...weekIds(ymd(addDays(parseYmd(curWeek),7)))];
  const near2=[...weekIds(ymd(addDays(parseYmd(curWeek),-14))),...weekIds(ymd(addDays(parseYmd(curWeek),14)))];
  if(rerollAvoid.includes(id))sc-=4;   // a new proposal should really change the week
  const h=[near1,near2,weekIds(ymd(addDays(parseYmd(curWeek),-21)))];
  if((h[0]||[]).includes(id))sc-=3.5; else if((h[1]||[]).includes(id))sc-=1; else if((h[2]||[]).includes(id))sc-=0.5;
  return sc;
}
function weekMap(){const w={};for(const k of SLOT_ORDER){const s=W()[k];if(s&&recipes[s.id])w[k]=s.id;}return w;}
function bestFor(k,exclude){
  const week=weekMap();delete week[k];
  const c=eligible().filter(id=>!exclude.includes(id));
  if(!c.length)return null;
  return c.map(id=>[id,scoreFor(id,k,week)]).sort((a,b)=>b[1]-a[1])[0][0];
}
function planWeek(replaceAll,days,meals){
  const inDays=k=>(!days||days.includes(k.split("|")[0]))&&(!meals||meals.includes(k.split("|")[1]));
  const pool=eligible();
  if(!pool.length){toast("Ajoutez d'abord des recettes (hors desserts)");return;}
  const before=filledSlots().map(k=>W()[k].id);
  rerollAvoid=replaceAll?before:[];
  const week=weekMap(), targets=SLOT_ORDER.filter(k=>inDays(k)&&!isPast(k)&&!skipped(k)&&(!W()[k]||(replaceAll&&!W()[k].lock&&!W()[k].keep)));
  targets.forEach(k=>delete week[k]);
  if(replaceAll)SLOT_ORDER.forEach(k=>{if(inDays(k)&&!isPast(k)&&skipped(k)&&W()[k]&&!W()[k].lock&&!W()[k].keep){delete W()[k];delete week[k];}});
  for(const k of targets){
    const best=pool.map(id=>[id,scoreFor(id,k,week)]).sort((a,b)=>b[1]-a[1])[0][0];
    week[k]=best; const old=W()[k];
    W()[k]=Object.assign({},old||{},{id:best,n:old?old.n:menu.people});
  }
  menu.checked={};
  render();saveMenu();
  toast(targets.length?`${targets.length} repas proposés : « ↻ Autre » pour changer un plat`:"Rien à remplir : toutes les cases sont prises ou verrouillées");
}
/* ---------- look (per phone) and clock ---------- */
const PALS=[["sauge","Sauge","#2E6A45","#F1F4EE"],["faience","Faïence","#2A5CAA","#F4F7FB"],["bistrot","Bistrot","#B23A2B","#FBF7F2"],["provence","Provence","#6B7A1F","#F6F3E6"],["agrumes","Agrumes","#D9631F","#FFF8EC"],["ardoise","Ardoise","#7DC395","#141917"]];
const FONTS=[["carnet","Carnet",'"Young Serif",Georgia,serif'],["moderne","Moderne",'"Instrument Sans",system-ui,sans-serif'],["manuscrit","Manuscrit",'"Caveat",cursive'],["retro","Rétro",'"Abril Fatface",Georgia,serif']];
const DEPTHS=[["plat","Plat"],["pate","Pâte à modeler"],["relief","Cartes en relief"],["verre","Verre dépoli"]];
function look(){const d=document.documentElement;return{pal:d.dataset.pal||"sauge",font:d.dataset.font||"carnet",dark:d.dataset.dark||"auto",depth:d.dataset.depth||"plat"};}
function setLook(k,v){document.documentElement.dataset[k]=v;LS.set("cm_"+k,v);renderLook();
  const bg=getComputedStyle(document.body).backgroundColor;document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute("content",bg));}
function showOn(k){return LS.get("cm_show"+k,"1")!=="0";}
function applyShow(){const d=document.documentElement;d.toggleAttribute("data-hidewine",!showOn("wine"));d.toggleAttribute("data-hidenut",!showOn("nut"));}
function renderShow(){[["wine","#showWine"],["nut","#showNut"]].forEach(([k,sel])=>{const on=showOn(k);$(sel).innerHTML=`<button type="button" class="chip" data-act="showSet" data-k="${k}" data-v="1" aria-pressed="${on}">Oui</button><button type="button" class="chip" data-act="showSet" data-k="${k}" data-v="0" aria-pressed="${!on}">Non</button>`;});}
applyShow();
function renderLook(){
  renderShow();
  const L=look();
  $("#lookPal").innerHTML=PALS.map(([v,n,a,b])=>`<button type="button" class="look" data-act="look" data-k="pal" data-v="${v}" aria-pressed="${L.pal===v}"><span class="sw" style="background:linear-gradient(135deg,${b} 50%,${a} 50%)"></span>${n}</button>`).join("");
  $("#lookFont").innerHTML=FONTS.map(([v,n,f])=>`<button type="button" class="look" data-act="look" data-k="font" data-v="${v}" aria-pressed="${L.font===v}" style="font-family:${f.replace(/"/g,"&quot;")};font-size:${v==="manuscrit"?20:16}px">${n}</button>`).join("");
  $("#lookDepth").innerHTML=DEPTHS.map(([v,n])=>`<button type="button" class="look depth-${v}" data-act="look" data-k="depth" data-v="${v}" aria-pressed="${L.depth===v}">${n}</button>`).join("");
  $("#lookDark").innerHTML=[["auto","Comme l'iPhone"],["off","Jamais"]].map(([v,n])=>`<button type="button" class="look" data-act="look" data-k="dark" data-v="${v}" aria-pressed="${L.dark===v}">${n}</button>`).join("");
}
function renderNow(){
  const d=new Date(), txt=d.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"});
  $("#now").textContent=txt.charAt(0).toUpperCase()+txt.slice(1);
  renderToday();
}
function renderToday(){
  const el=$("#today");if(!el)return;
  const d=new Date(),hr=d.getHours(),sl=(menu.weeks||{})[ymd(mondayOf(d))]||{},day=DAYS[(d.getDay()+6)%7];
  const line=(meal,lab)=>{const k=slotKey(day,meal),s=sl[k],r=s&&recipes[s.id],done=meal==="midi"?hr>=15:hr>=22;
    const sub=s?[s.entree&&recipes[s.entree]?"Entrée : "+recipes[s.entree].name:"",s.dessert&&recipes[s.dessert]?"Dessert : "+recipes[s.dessert].name:""].filter(Boolean).join(" · "):"";
    if(r){const ph=rPhotoSrc(s.id);return`<button type="button" class="tl${done?" done":""}" data-act="viewRec" data-id="${esc(s.id)}">${ph?`<img class="tl-ph" src="${esc(ph)}" alt=""${!r.photo?` data-auto="${esc(s.id)}"`:""}>`:""}<span class="tm">${lab}</span><span class="tn">${esc(r.name)}${sub?`<small>${esc(sub)}</small>`:""}</span><span class="tc" aria-hidden="true">›</span></button>`;}
    return`<button type="button" class="tl tl-empty${done?" done":""}" data-act="todayPick" data-k="${k}"><span class="tm">${lab}</span><span class="tn">${done?"—":"+ Choisir un plat"}${sub?`<small>${esc(sub)}</small>`:""}</span></button>`;};
  const left=+($("#b-shop")&&$("#b-shop").textContent)||0;
  const nn=newsCount(),who=[...new Set(Object.entries(shNews).filter(([id])=>recipes[id]).map(([,v])=>v.by))].join(", ");
  const tr=mealsToRate();const rateCards=tr.map(x=>`<div class="rate-card"><span>C'était comment, <b>${esc(recipes[x.id].name)}</b> <span class="muted">(${x.dn.toLowerCase()} ${x.m})</span> ?</span><div class="row"><button type="button" class="btn primary" data-act="rateMeal" data-key="${x.w}#${x.k}">★ Noter</button><button type="button" class="btn ghost" data-act="rateSkip" data-key="${x.w}#${x.k}">Passer</button></div></div>`).join("");
  const next=(()=>{for(const[m]of MEALS){const k=slotKey(day,m),s=sl[k];if(s&&recipes[s.id]&&!(m==="midi"?hr>=15:hr>=22)&&stepsFor(s.id).steps.length)return s;}return null;})();
  el.innerHTML=rateCards+(nn?`<button type="button" class="news-bar" data-act="seeNews">🆕 <span><b>${nn} nouveauté${nn>1?"s":""}</b> dans le carnet de ${esc(who)}</span><span aria-hidden="true">›</span></button>`:"")+`<div class="today-card">${line("midi","Midi")}${line("soir","Soir")}</div>
    
    <div class="today-acts"><button type="button" class="pill" data-act="tab" data-v="shop">🛒 Courses${left?` · <b>${left}</b>`:""}</button><button type="button" class="pill" data-act="tab" data-v="week">📅 Ma semaine</button><button type="button" class="pill" data-act="openWines">🍷 Ma cave</button><button type="button" class="pill" data-act="goFridge">Qu'est-ce que je fais avec…</button></div>`;
}
function openPrefs(){
  document.querySelectorAll("#prefForm [data-sec]").forEach(el=>{el.hidden=false;});$("#prefTitle").textContent="Préférences de la semaine";
  prefDraft=JSON.parse(JSON.stringify(menu.prefs));
  $("#p-veg").textContent=prefDraft.veg; $("#p-fish").textContent=prefDraft.fish; $("#p-avoid").value=prefDraft.avoid;
  $("#pl-on").setAttribute("aria-pressed",!!prefDraft.lightEve);$("#pd-on").setAttribute("aria-pressed",!!prefDraft.dissoc);$("#pd-off").setAttribute("aria-pressed",!prefDraft.dissoc);$("#pl-off").setAttribute("aria-pressed",!prefDraft.lightEve);
  prefDraft.days=Object.assign({},prefDraft.days);
  $("#p-days").innerHTML=DAYS.map(d=>`<span>${d}</span><select data-day="${d}" aria-label="Style du ${d}">${DAY_STYLES.map(([v,l])=>`<option value="${v}"${(prefDraft.days[d]||"")===v?" selected":""}>${l}</option>`).join("")}</select>`).join("");
  $("#p-skip").innerHTML=DAYS.map(d=>`<button type="button" class="chip" data-act="prefSkip" data-d="${d}" aria-pressed="${prefDraft.skip.includes(d)}">${d}</button>`).join("");
  renderLook();
  $("#prefSheet").hidden=false;
}
$("#prefForm").addEventListener("submit",e=>{e.preventDefault();prefDraft.avoid=$("#p-avoid").value.trim();
  prefDraft.days={};document.querySelectorAll("#p-days select").forEach(s=>{if(s.value)prefDraft.days[s.dataset.day]=s.value;});
  menu.prefs=prefDraft;$("#prefSheet").hidden=true;render();saveMenu();toast("Préférences enregistrées");});
$("#prefSheet").addEventListener("click",e=>{if(e.target.id==="prefSheet")$("#prefSheet").hidden=true;});
/* ---------- « Courses pour » : a day's summary before it goes to the shopping list ---------- */
let dayK=null,daySel={};
const dayInfo=d=>shopDates().find(y=>y.key===d)||null;
function openDaySheet(d){const x=dayInfo(d);if(!x)return;dayK=d;daySel={};const inList=selectedShopDates().some(y=>y.key===d);
  for(const[m]of MEALS){const k=slotKey(x.dn,m),sl=x.wk[k];if(sl&&recipes[sl.id])daySel[k]=inList?!!sl.lock:true;}
  renderDaySheet();$("#daySheet").hidden=false;}
function dayIngCount(x,ks){return new Set(ks.flatMap(k=>{const sl=x.wk[k];return[sl.id,sl.entree,sl.dessert].filter(Boolean).flatMap(id=>((recipes[id]||{}).ing||[]).filter(i=>i.n).map(i=>norm(i.n)));})).size;}
function renderDaySheet(){const x=dayInfo(dayK);if(!x){$("#daySheet").hidden=true;return;}
  const inList=selectedShopDates().some(y=>y.key===dayK),w=ymd(mondayOf(x.d)),ks=Object.keys(daySel).filter(k=>daySel[k]!==false),n=dayIngCount(x,ks);
  const rows=MEALS.map(([m,lab])=>{const k=slotKey(x.dn,m),sl=x.wk[k];if(!sl||!recipes[sl.id])return"";const on=daySel[k]!==false;
    return`<div class="ds-row"><div style="flex:1;min-width:0"><span class="muted" style="font-size:13px">${lab}</span><br><b>${esc(recipes[sl.id].name)}</b> <span class="muted" style="font-size:13px">· ${sl.n||menu.people} pers.</span><br><button type="button" class="link" data-act="dsSee" data-k="${k}" data-w="${w}">voir / changer</button></div>
      <button type="button" class="chip" data-act="dsTog" data-k="${k}" aria-pressed="${on}">${on?"✓ Dans les courses":"Pas cette fois"}</button></div>`;}).join("");
  $("#daySheetIn").innerHTML=`<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><h2>${esc((t=>t.charAt(0).toUpperCase()+t.slice(1))(x.d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})))}</h2><button type="button" class="btn" data-act="closeDay">Fermer</button></div>
    <p class="muted" style="margin:0;font-size:14px">${inList?"Ce jour est dans la liste de courses.":"Ce qui est prévu ce jour-là : choisissez ce qui part dans les courses."}</p>
    <div>${rows||'<p class="muted">Aucun repas prévu ce jour.</p>'}</div>
    <div class="row" style="flex-direction:column;align-items:stretch;gap:8px;margin-top:8px">
      <button type="button" class="btn primary" data-act="dsApply" ${ks.length||inList?"":"disabled"}>${inList?"Mettre à jour":"🛒 Ajouter ce jour aux courses"} · ${ks.length} repas, ${n} ingrédient${n>1?"s":""}</button>
      ${inList?'<button type="button" class="btn ghost" data-act="dsRemove">Retirer ce jour des courses</button>':""}</div>`;}
function dayApply(add){const x=dayInfo(dayK);if(!x)return"";const all=shopDates();let keys=Array.isArray(menu.shopDays)?menu.shopDays.filter(k=>all.some(y=>y.key===k)):defaultShopKeys(all);
  keys=keys.filter(k=>k!==dayK);if(add)keys.push(dayK);menu.shopDays=keys.sort();
  for(const[m]of MEALS){const k=slotKey(x.dn,m),sl=x.wk[k];if(!sl||!recipes[sl.id])continue;if(add&&daySel[k]!==false){if(!["Courses faites","Terminé"].includes(cmMealStatus(sl)))cmSetMealStatus(sl,"En courses");}else if(!["Courses faites","Terminé"].includes(cmMealStatus(sl)))cmSetMealStatus(sl,"Gardé");}
  return add?"Liste de courses mise à jour":"Jour retiré des courses";}
$("#daySheet").addEventListener("click",e=>{if(e.target.id==="daySheet")$("#daySheet").hidden=true;});

let viewServ={}, recLimit=50;
/* recipe shown over the current screen: closing it returns exactly where you were */
let recSheetId=null,recMealCtx=null;
function openRecSheet(id,mealKey=null){ recMealCtx=mealKey; natAsk=null; if(!recipes[id])return; if(recSheetId!==id)recTab="ing"; lastRecHtml=""; if(shNews[id]){seenNews(id);setTimeout(render,0);} recSheetId=id; renderRecSheet(); $("#recSheet").hidden=false; $("#recSheetIn").scrollTop=0; }
let recTab="ing";
/* ---------- detailed steps for beginners: etapes-detaillees.json on the site (id → prep + steps + hash of the short steps they were written from) ---------- */
let DETAIL=LS.get("cm_detail",{recipes:{}}),DETAIL_NAME={};
const stepHash=s=>{const t=String(s||"").split("\n").map(x=>x.trim()).filter(Boolean).join("\n");let h=5381;for(let i=0;i<t.length;i++)h=(((h<<5)+h)+t.charCodeAt(i))>>>0;return h.toString(16);};
function indexDetail(){DETAIL_NAME={};for(const v of Object.values(DETAIL.recipes||{}))if(v&&v.name)DETAIL_NAME[deacc(v.name)]=v;}
indexDetail();
fetch(APP_URL+"etapes-detaillees.json",{cache:"no-cache"}).then(x=>x.ok?x.json():null).then(d=>{if(d&&d.recipes&&JSON.stringify(d)!==JSON.stringify(DETAIL)){DETAIL=d;LS.set("cm_detail",d);indexDetail();lastRecHtml="";render();}}).catch(()=>{});
// the detailed version of a recipe; .same = written from the steps the recipe has now (not changed by you since)
function detailOf(r,id){if(!r)return null;const R=DETAIL.recipes||{};let d=id&&(R[id]||R[String(id).replace(/^sh-.*?-(r\d*-)/,"$1")]);if(!d)d=DETAIL_NAME[deacc(r.name||"")];
  if(!d||!Array.isArray(d.steps)||!d.steps.length)return null;return{prep:d.prep||"",steps:d.steps,same:d.src===stepHash(r.steps),base:d.base||null,modes:d.modes&&typeof d.modes==="object"?d.modes:{}};}
let stepMode=LS.get("cm_stepmode","det"),stepPick={};
// what to show/cook: the detailed version by default, unless you rewrote the steps yourself (then yours) — the toggle switches
/* ---------- my equipment (synced): hob type and levels, oven, air fryer, pressure cooker ---------- */
const EQ_DEF={hob:"induction",crans:9,oven:"ct",af:5,pc:true};
const equip=()=>Object.assign({},EQ_DEF,menu.equip||{});
const MODE_NEED={airfryer:"af",autocuiseur:"pc"};
const hasEq=(k)=>{const e=equip(),n=MODE_NEED[k];return !n||(n==="af"?e.af>0:!!e[n]);};
// turns "feu moyen (5/9)" into your hob's levels, and fan-oven temperatures into a traditional oven's
function adaptTxt(t,mode){const e=equip();t=String(t||"");
  t=t.replace(/\s?\((\d)(?:-(\d))?\/9\)/g,(m,a,b)=>{if(e.hob==="gaz")return"";const N=Math.max(3,Math.min(20,+e.crans||9)),c=x=>Math.max(1,Math.min(N,Math.round(x*N/9)));
    const A=c(+a),B=b?c(+b):A;return` (${A===B?A:A+"-"+B} sur ${N})`;});
  if(mode!=="airfryer"&&e.oven==="trad")t=t.replace(/(\d{3}) °C \(four chaleur tournante \(ou 10 °C de plus en chaleur traditionnelle\), grille au milieu\)/g,(m,x)=>`${+x+15} °C (grille au milieu)`)
    .replace(/(\d{3}) °C \(four chaleur tournante, grille au milieu\)/g,(m,x)=>`${+x+15} °C (grille au milieu)`).replace(/(\d{3}) °C \(four chaleur tournante\)/g,(m,x)=>`${+x+15} °C`);
  else t=t.replace(/four chaleur tournante \(ou 10 °C de plus en chaleur traditionnelle\), /g,"");
  return t;}
let cookModePick=LS.get("cm_cookmode",{});
// the ways this recipe can be cooked with your equipment: [{k,label,time}]
function modesOf(id){const r=recipes[id],d=detailOf(r,id);if(!d||!d.base)return[];
  const l=[{k:d.base.k,label:d.base.label,time:r.time||0}].concat(Object.entries(d.modes).filter(([k])=>hasEq(k)).map(([k,v])=>({k,label:v.label,time:v.time||0})));
  return l.length>1?l:[];}
// what to show/cook: the detailed version by default, unless you rewrote the steps yourself (then yours) — the toggle switches
function stepsFor(id,modeK){const r=recipes[id],d=detailOf(r,id),short=String((r&&r.steps)||"").split("\n").map(x=>x.trim()).filter(Boolean);
  const pick=stepPick[id]||(d&&!d.same&&short.length?"court":stepMode),useDet=!!d&&(pick==="det"||!short.length);
  const ms=useDet?modesOf(id):[];let mk=modeK||cookModePick[id];if(!ms.some(m=>m.k===mk))mk=ms.length?ms[0].k:"";
  const mv=ms.length&&d.base&&mk!==d.base.k?d.modes[mk]:null,mode=ms.find(m=>m.k===mk)||null;
  const steps=useDet?(mv?mv.steps:d.steps).map(x=>adaptTxt(x,mk)):short;
  return{d,short,useDet,steps,prep:useDet?adaptTxt(mv?mv.prep:d.prep,mk):"",modes:ms,mode,batch:!!(mv&&mv.batch)};}
function batchNote(x,n){if(!x.batch||!x.mode||x.mode.k!=="airfryer")return"";const L=equip().af||5,per=Math.max(1,Math.round(L/2)),k=Math.ceil(n/per);
  return k>1?`<p class="batch-note">🧺 Avec votre air fryer de ${L} L : prévoyez ${k} fournées pour ${n} pers. (environ ${per} pers. par fournée).</p>`:"";}
function modeChips(id,x){if(!x.modes.length)return"";
  return`<div class="mode-chips"><span class="label">Comment le cuire ?</span><div class="row">${x.modes.map(m=>`<button type="button" class="chip" data-act="cookModeSet" data-id="${esc(id)}" data-v="${esc(m.k)}" aria-pressed="${x.mode&&x.mode.k===m.k}">${MODE_ICON[m.k]||""} ${esc(m.label)}${m.time?" · "+m.time+" min":""}</button>`).join("")}</div></div>`;}
function renderEquip(){const e=equip(),box=$("#equipBox");if(!box)return;
  const ch=(k,v,l)=>`<button type="button" class="chip" data-act="equipSet" data-k="${k}" data-v="${v}" aria-pressed="${(k==="pc"?(e.pc?"1":"0"):String(e[k]))===String(v)}">${l}</button>`;
  box.innerHTML=`<span class="muted" style="font-size:13px">Les recettes détaillées s'adaptent : crans de votre plaque, température de votre four, modes de cuisson proposés. Partagé entre vos appareils.</span>
   <span class="label" style="margin-top:8px">Plaque de cuisson</span><div class="chips" style="flex-wrap:wrap">${ch("hob","induction","Induction")}${ch("hob","vitro","Vitrocéramique / électrique")}${ch("hob","gaz","Gaz")}</div>
   ${e.hob==="gaz"?`<span class="muted" style="font-size:13px">Au gaz, les recettes parlent de « feu doux / moyen / vif » (taille de la flamme), sans numéro.</span>`:`<span class="muted" style="font-size:13px;margin-top:4px">Nombre de crans (le plus fort)</span><div class="chips" style="flex-wrap:wrap">${[6,9,10,12,14,18].map(n=>ch("crans",n,n)).join("")}</div>`}
   <span class="label" style="margin-top:8px">Four</span><div class="chips" style="flex-wrap:wrap">${ch("oven","ct","Chaleur tournante")}${ch("oven","trad","Traditionnel (haut + bas)")}</div>
   <span class="label" style="margin-top:8px">Air fryer</span><div class="chips" style="flex-wrap:wrap">${ch("af",0,"Je n'en ai pas")}${[3,4,5,6,8,10].map(n=>ch("af",n,n+" L")).join("")}</div>
   <span class="label" style="margin-top:8px">Autocuiseur (cocotte-minute)</span><div class="chips">${ch("pc",1,"Oui")}${ch("pc",0,"Non")}</div>`;
  const se=$("#setEquip");if(se)se.textContent=[e.hob==="gaz"?"Gaz":(e.hob==="induction"?"Induction":"Vitro")+" 1 à "+e.crans,e.oven==="ct"?"chaleur tournante":"four traditionnel",e.af?"air fryer "+e.af+" L":"sans air fryer"].join(" · ");}
try{renderEquip();}catch(e){}
const MODE_ICON={vapeur:"💨",bainmarie:"🔥",casserole:"🥘",wok:"🥢",froid:"🥗",micro:"📟",cocottefour:"🍲",four:"🔥",poele:"🍳",cocotte:"🍲",marmite:"🍲",airfryer:"🌀",autocuiseur:"♨️"};
function stepsToggle(id,x){if(!x.d)return"";
  return`<div class="row step-mode"><button type="button" class="chip" data-act="stepMode" data-v="det" aria-pressed="${x.useDet}">📝 Détaillée</button><button type="button" class="chip" data-act="stepMode" data-v="court" aria-pressed="${!x.useDet}">Courte</button></div>
    ${!x.d.same&&x.short.length?`<p class="muted" style="font-size:13px;margin:4px 0">${x.useDet?"Cette version détaillée a été écrite pour la recette d'origine : vous avez modifié les étapes depuis.":"Vous avez modifié les étapes : votre version est affichée. La version détaillée (écrite pour la recette d'origine) reste disponible."}</p>`:""}`;}
const prepHtml=(t,cls)=>t?`<div class="prep-box${cls?" "+cls:""}"><b>Avant de commencer</b><span>${esc(t)}</span></div>`:"";
/* ---------- "Comment faire ?": the basic techniques found in a step, explained (béchamel, roux, blancs en neige…) ---------- */
const TECH=[
 [/b[ée]chamel/i,"Béchamel","Pour 50 cl : 40 g de beurre, 40 g de farine, 50 cl de lait.|Faire fondre le beurre à feu doux, ajouter la farine d'un coup et remuer 1 à 2 min sans colorer (c'est le roux).|Hors du feu, verser le lait froid petit à petit en fouettant pour éviter les grumeaux.|Remettre sur feu moyen et fouetter sans arrêt jusqu'à ébullition, puis cuire 2 à 3 min : la sauce épaissit.|Saler, poivrer, râper un peu de muscade."],
 [/\broux\b/i,"Roux","Même poids de beurre et de farine.|Faire fondre le beurre, ajouter la farine et remuer 2 min pour un roux blanc (sauces claires), plus longtemps pour un roux blond ou brun.|Ajouter ensuite le liquide froid en fouettant."],
 [/p[âa]te bris[ée]e/i,"Pâte brisée maison","250 g de farine, 125 g de beurre froid en dés, 1 pincée de sel, 5 à 6 cl d'eau froide.|Frotter farine et beurre du bout des doigts jusqu'à obtenir une texture de sable.|Ajouter l'eau peu à peu et former une boule sans trop travailler la pâte.|Filmer et laisser reposer 30 min au frais avant d'étaler."],
 [/(blancs?|œufs?|oeufs?) en neige|monter les blancs/i,"Blancs en neige","Blancs à température ambiante, dans un bol propre et sec, avec une pincée de sel.|Fouetter doucement puis de plus en plus vite.|Ils sont prêts quand ils sont fermes et que la pointe tient au bout du fouet.|Les incorporer délicatement à la maryse, en soulevant la préparation, pour ne pas les casser."],
 [/caramel(?!is)/i,"Caramel","Mettre le sucre dans une casserole avec un peu d'eau (2 c. à s. pour 100 g).|Chauffer à feu moyen sans remuer ; incliner la casserole si besoin.|Arrêter dès que la couleur est ambrée : il continue de foncer hors du feu.|Attention aux brûlures, le caramel est très chaud."],
 [/caram[ée]lis/i,"Caraméliser","Cuire à feu moyen avec un peu de beurre ou de sucre, en remuant de temps en temps, jusqu'à ce que les morceaux soient bien dorés et brillants.|Pour des oignons : feu doux 20 à 30 min, ils deviennent fondants et sucrés."],
 [/d[ée]glac/i,"Déglacer","Après avoir fait dorer la viande ou les légumes, verser un liquide (vin, bouillon, eau, vinaigre) dans la poêle encore chaude.|Gratter le fond avec une spatule pour décoller les sucs : c'est là qu'est le goût.|Laisser réduire quelques minutes."],
 [/\br[ée]dui(re|t|sez)\b|faire r[ée]duire/i,"Réduire","Laisser bouillonner à découvert pour évaporer une partie du liquide.|La sauce devient plus épaisse et plus goûteuse ; goûter avant de saler."],
 [/[ée]minc/i,"Émincer","Couper en tranches fines et régulières, avec un couteau bien aiguisé, les doigts repliés pour se protéger."],
 [/cisel/i,"Ciseler","Oignon ou échalote : couper en deux, faire des entailles horizontales puis verticales sans couper la base, puis trancher : on obtient de petits dés.|Herbes : les rouler en petit fagot et les couper très finement."],
 [/julienne/i,"Julienne","Couper en tranches fines puis en bâtonnets très fins (2 mm environ)."],
 [/brunoise/i,"Brunoise","Couper en tout petits dés réguliers (2 à 3 mm) : d'abord en tranches, puis en bâtonnets, puis en dés."],
 [/blanchi(r|s|ssez)? (les |des )?(jaunes|œufs|oeufs)|jaunes.*blanchi/i,"Blanchir des jaunes","Fouetter les jaunes avec le sucre jusqu'à ce que le mélange devienne pâle, mousseux et double de volume (2 à 3 min)."],
 [/blanchi/i,"Blanchir (légumes)","Plonger les légumes 1 à 3 min dans une grande casserole d'eau bouillante salée.|Les égoutter et les plonger aussitôt dans de l'eau glacée : ils restent verts et croquants."],
 [/bain[- ]marie/i,"Bain-marie","Poser un bol sur une casserole d'eau qui frémit, sans que le fond du bol touche l'eau.|Idéal pour faire fondre le chocolat ou cuire doucement une crème."],
 [/faire suer|faites suer/i,"Faire suer","Cuire à feu doux dans un peu de matière grasse, sans colorer, jusqu'à ce que les légumes soient translucides et rendent leur eau."],
 [/faire revenir|faites revenir|\brevenir\b/i,"Faire revenir","Cuire à feu moyen-vif dans un peu de matière grasse en remuant, jusqu'à ce que ce soit légèrement doré."],
 [/saisi(r|ssez)|faire saisir/i,"Saisir","Bien chauffer la poêle avec un peu de matière grasse avant d'y mettre la viande ou le poisson.|Ne pas les bouger pendant 1 à 2 min pour qu'une croûte dorée se forme, puis retourner."],
 [/mijot/i,"Mijoter","Cuire longtemps à feu doux, à petits frémissements (de petites bulles, pas de gros bouillons), souvent à couvert.|Remuer de temps en temps pour que ça n'attache pas."],
 [/nacr/i,"Nacrer le riz","Faire revenir le riz cru 1 à 2 min dans le beurre ou l'huile chaude en remuant, jusqu'à ce que les grains deviennent translucides.|Ajouter ensuite le liquide (vin, bouillon) petit à petit."],
 [/mayonnaise/i,"Mayonnaise","1 jaune d'œuf, 1 c. à c. de moutarde, sel, poivre, 20 à 25 cl d'huile, le tout à température ambiante.|Mélanger jaune et moutarde, puis verser l'huile en mince filet en fouettant sans arrêt.|Finir avec un trait de vinaigre ou de citron."],
 [/vinaigrette/i,"Vinaigrette","1 c. à s. de vinaigre, sel, poivre (et 1 c. à c. de moutarde si on aime).|Mélanger pour dissoudre le sel, puis ajouter 3 c. à s. d'huile et fouetter."],
 [/cr[èe]me p[âa]tissi[èe]re/i,"Crème pâtissière","50 cl de lait, 4 jaunes, 100 g de sucre, 40 g de maïzena (ou farine), 1 gousse de vanille.|Chauffer le lait avec la vanille.|Fouetter jaunes et sucre jusqu'à blanchiment, ajouter la maïzena.|Verser le lait chaud dessus en fouettant, remettre en casserole et cuire en fouettant jusqu'à ce que ça épaississe, puis 1 min de plus.|Filmer au contact et laisser refroidir."],
 [/ganache/i,"Ganache","Hacher le chocolat.|Porter la crème à ébullition et la verser sur le chocolat.|Attendre 1 min puis mélanger doucement du centre vers l'extérieur jusqu'à ce que ce soit lisse et brillant."],
 [/chantilly|cr[èe]me fouett[ée]e/i,"Crème chantilly","Crème liquide entière (30 % minimum) très froide, dans un bol froid.|Fouetter ; quand elle commence à épaissir, ajouter le sucre glace.|S'arrêter dès qu'elle est ferme, sinon elle tourne en beurre."],
 [/beurre noisette/i,"Beurre noisette","Chauffer le beurre dans une casserole claire : il fond, mousse, puis prend une couleur dorée et une odeur de noisette.|Retirer aussitôt du feu."],
 [/flamb/i,"Flamber","Verser l'alcool dans la poêle chaude, hors de la hotte et loin de tout objet inflammable.|L'enflammer avec une longue allumette, en se tenant à distance, et laisser brûler jusqu'à extinction."],
 [/maïzena|maizena|lier la sauce|\blier\b/i,"Lier une sauce","Délayer 1 c. à s. de maïzena dans un peu d'eau froide.|Verser dans la sauce bouillante en remuant : elle épaissit en 1 min."],
 [/\\bpoch(er|ez|é|ée|és|ées|ant)\\b/i,"Pocher","Cuire dans un liquide (eau, bouillon, lait) qui frémit à peine, sans jamais bouillir fort."],
 [/dor(er|ez) (à|au) (l'œuf|l'oeuf|jaune)/i,"Dorer à l'œuf","Battre un œuf (ou un jaune) avec un peu de lait.|En badigeonner la pâte au pinceau juste avant d'enfourner."],
 [/abaiss|[ée]tal(er|ez) la p[âa]te/i,"Étaler la pâte","Fariner le plan de travail et le rouleau.|Étaler du centre vers l'extérieur en tournant la pâte d'un quart de tour régulièrement, jusqu'à l'épaisseur voulue (3 mm environ)."],
 [/fonc(er|ez)|garni(r|ssez) (le|un) moule/i,"Foncer un moule","Poser la pâte dans le moule, bien la plaquer contre les bords, couper le surplus.|Piquer le fond à la fourchette."],
 [/à blanc/i,"Cuire à blanc","Recouvrir le fond de tarte de papier cuisson et de légumes secs (haricots, riz).|Cuire 15 min à 180 °C, retirer papier et légumes secs, puis 5 min de plus."],
 [/al dente/i,"Al dente","Les pâtes sont cuites mais restent fermes sous la dent : goûter 1 à 2 min avant le temps indiqué sur le paquet."],
 [/pan(er|ez)\b|chapelure/i,"Paner","Passer chaque morceau dans la farine, puis dans l'œuf battu, puis dans la chapelure, dans cet ordre.|Bien tapoter entre chaque étape pour une panure régulière."],
 [/zest/i,"Zester","Râper uniquement la partie colorée de l'écorce (agrume non traité), sans le blanc qui est amer."],
 [/mond(er|ez)|peler les tomates/i,"Monder les tomates","Inciser la peau en croix, plonger 30 s dans l'eau bouillante puis dans l'eau froide : la peau s'enlève toute seule."],
 [/infus/i,"Infuser","Laisser tremper un aromate (vanille, herbes, épices) dans un liquide chaud, à couvert, quelques minutes, puis filtrer."],
];
function techsIn(txt){const out=[],seen=new Set();for(const[re,name,how]of TECH){if(re.test(txt)&&!seen.has(name)){seen.add(name);out.push([name,how]);}}
  return out.filter(([n])=>!(n==="Roux"&&seen.has("Béchamel"))&&!(n==="Blanchir (légumes)"&&seen.has("Blanchir des jaunes"))&&!(n==="Caraméliser"&&seen.has("Caramel"))&&!(n==="Faire revenir"&&seen.has("Faire suer")));}
const techHtml=(list,cls)=>list.map(([n,how])=>`<details class="tech ${cls||""}"><summary>💡 Comment faire : ${esc(n)}</summary><ol>${how.split("|").map(x=>`<li>${esc(x)}</li>`).join("")}</ol></details>`).join("");
/* ---------- cooking mode: one step per screen, screen kept on, timers ---------- */
let cook=null,cookWake=null,cookTimer=null;
function stepIngs(r,txt,f){const t=norm(txt);return(r.ing||[]).filter(i=>{const w=norm(i.n).replace(/\([^)]*\)/g," ").split(/[\s,'’-]+/).filter(x=>x.length>3);return w.some(x=>t.includes(x.replace(/s$/,"")));})
  .map(i=>{const[b,u]=toBase(i.q,i.u);const q=fmt(b*ingMult(r,i,f*(r.serves||4)),u);return(q?q+" ":"")+i.n;});}
function stepDuration(txt){const t=txt.toLowerCase();let m=t.match(/(\d+)\s*h(?:eures?)?\s*(\d+)?/);if(m)return(+m[1])*3600+(m[2]?+m[2]*60:0);
  {const all=[...t.matchAll(/(\d+)\s*(?:à\s*\d+\s*)?min/g)].map(x=>+x[1]);if(all.length)return Math.max(...all)*60;}m=t.match(/(\d+)\s*(?:secondes|sec)\b/);return m?+m[1]:0;}
const dur=s=>s>=3600?`${Math.floor(s/3600)} h ${String(Math.floor(s%3600/60)).padStart(2,"0")}`:`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
async function startCook(id,n){const r=recipes[id];if(!r)return;const sx=stepsFor(id),steps=sx.steps;if(!steps.length)return;
  cook={id,i:0,steps,prep:sx.prep,mode:sx.mode,sx,n:n||viewServ[id]||menu.people,done:false,choose:sx.modes.length>1};renderCook();$("#cookSheet").hidden=false;
  try{if(navigator.wakeLock)cookWake=await navigator.wakeLock.request("screen");}catch(e){}}
function stopCook(){cook=null;try{cookWake&&cookWake.release();}catch(e){}cookWake=null;$("#cookSheet").hidden=true;}
document.addEventListener("visibilitychange",async()=>{if(document.visibilityState==="visible"&&cook&&!cookWake){try{cookWake=await navigator.wakeLock.request("screen");}catch(e){}}});
function renderCook(){if(!cook)return;const r=recipes[cook.id];if(!r){stopCook();return;}const f=cook.n/(r.serves||4);
  if(cook.done){$("#cookIn").innerHTML=`<div class="row cook-top"><span>${esc(r.name)}</span><button type="button" class="btn" data-act="cookClose">Fermer</button></div>
    <div class="cook-big">Bon appétit ! 🍽️</div><p style="opacity:.8;margin:0">C'était comment ?</p>${rateHtml(cook.id)}`;return;}
  if(cook.choose){const sx=stepsFor(cook.id);$("#cookIn").innerHTML=`<div class="row cook-top"><span>${esc(r.name)} · ${cook.n} pers.</span><button type="button" class="btn" data-act="cookClose">Fermer</button></div>
    <div class="cook-big">Comment le cuisez-vous ?</div><div class="cook-modes">${sx.modes.map(m=>`<button type="button" class="btn${sx.mode&&sx.mode.k===m.k?" primary":""}" data-act="cookModeGo" data-v="${esc(m.k)}">${MODE_ICON[m.k]||""} ${esc(m.label)}${m.time?` · ${m.time} min`:""}</button>`).join("")}</div>
    <p style="opacity:.75;margin:0;font-size:14px">Le choix fait dans la recette est en vert. Vous ne pourrez plus changer une fois commencé.</p>`;return;}
  const s=cook.steps[cook.i],ing=stepIngs(r,s,f),d=stepDuration(s);
  $("#cookIn").innerHTML=`<div class="row cook-top"><span>Étape ${cook.i+1} sur ${cook.steps.length}${cook.mode?" · "+esc(cook.mode.label):""} · ${esc(r.name)} · ${cook.n} pers.</span><button type="button" class="btn" data-act="cookClose">Fermer</button></div>
    <div class="cook-dots">${cook.steps.map((_,j)=>`<i class="${j<=cook.i?"on":""}"></i>`).join("")}</div>
    ${cook.i===0?prepHtml(cook.prep,"dark")+batchNote(cook.sx,cook.n):""}<div class="cook-big">${esc(s)}</div>
    ${ing.length?`<div class="cook-ing">${ing.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:""}
    ${techHtml(techsIn(s),"dark")}
    ${d?`<button type="button" class="btn cook-timer" data-act="cookTimer" data-s="${d}">${cookTimer?`⏱ ${dur(Math.max(0,Math.round((cookTimer.end-Date.now())/1000)))} · ${esc(cookTimer.label)} · Arrêter`:`⏱ Lancer le minuteur · ${dur(d)}`}</button>`:(cookTimer?`<button type="button" class="btn cook-timer" data-act="cookTimer">⏱ ${dur(Math.max(0,Math.round((cookTimer.end-Date.now())/1000)))} · ${esc(cookTimer.label)} · Arrêter</button>`:"")}
    <details class="cook-all"><summary>Tous les ingrédients</summary>${(r.ing||[]).map(i=>{const[b,u]=toBase(i.q,i.u);return`<div>${esc(fmt(b*ingMult(r,i,cook.n),u))} ${esc(i.n)}</div>`;}).join("")}</details>
    <div class="row cook-nav"><button type="button" class="btn" data-act="cookPrev" ${cook.i?"":"disabled"}>← Précédente</button><button type="button" class="btn primary" data-act="cookNext">${cook.i<cook.steps.length-1?"Suivante →":"Terminé ✓"}</button></div>`;}
function beep(){try{const c=new(window.AudioContext||window.webkitAudioContext)();[0,.35,.7].forEach(t=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=880;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.25,c.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+t+.3);o.start(c.currentTime+t);o.stop(c.currentTime+t+.3);});}catch(e){}
  try{navigator.vibrate&&navigator.vibrate([300,150,300,150,300]);}catch(e){}}
setInterval(()=>{if(!cookTimer)return;if(cookTimer.half&&Date.now()>=cookTimer.half){cookTimer.half=0;beep();toast("⏱ Mi-cuisson : "+cookTimer.halfMsg);}if(Date.now()>=cookTimer.end){const l=cookTimer.label;cookTimer=null;beep();toast("⏱ Minuteur terminé : "+l);}if(cook)renderCook();},1000);
// swipe between steps
(()=>{let x0=0,y0=0;document.addEventListener("touchstart",e=>{if(!cook||$("#cookSheet").hidden)return;x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  document.addEventListener("touchend",e=>{if(!cook||$("#cookSheet").hidden||cook.done)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.5)return;
    if(dx<0&&cook.i<cook.steps.length-1)cook.i++;else if(dx>0&&cook.i>0)cook.i--;renderCook();},{passive:true});})();
/* ---------- rating after the meal ---------- */
let rateDraft={};
function rateHtml(id){const d=rateDraft[id]||{stars:0,tags:[]};
  return`<div class="rate-stars">${[1,2,3,4,5].map(n=>`<button type="button" data-act="rateStar" data-id="${esc(id)}" data-n="${n}" aria-label="${n} étoile${n>1?"s":""}">${n<=d.stars?"★":"☆"}</button>`).join("")}</div>
    <div class="chips" style="flex-wrap:wrap">${RATE_TAGS.map(t=>`<button type="button" class="chip" data-act="rateTag" data-id="${esc(id)}" data-t="${esc(t)}" aria-pressed="${d.tags.includes(t)}">${esc(t)}</button>`).join("")}</div>
    <button type="button" class="btn primary" data-act="rateSave" data-id="${esc(id)}" ${d.stars?"":"disabled"} style="align-self:flex-start">Enregistrer la note</button>`;}
function openRate(id,slot){rateDraft[id]={stars:0,tags:[],slot};const r=recipes[id];
  $("#rateIn").innerHTML=`<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><h2>C'était comment ?</h2><button type="button" class="btn ghost" data-act="rateClose">Plus tard</button></div><p style="margin:0"><b>${esc(r.name)}</b></p><div id="rateBody">${rateHtml(id)}</div>`;$("#rateSheet").hidden=false;}
function saveRating(id){const d=rateDraft[id],r=recipes[id];if(!d||!d.stars||!r)return;
  saveRecipe(id,Object.assign({},r,{ratings:[...(r.ratings||[]),{at:Date.now(),stars:d.stars,tags:d.tags}].slice(-20)}));
  if(d.slot){const[w,k]=d.slot.split("#");const s=((menu.weeks||{})[w]||{})[k];if(s){s.rated=true;saveMenu();}}
  delete rateDraft[id];toast("Merci ! Note enregistrée");}
// the meals already eaten (today and the 2 days before) that are not rated yet
function mealsToRate(){const out=[],now=new Date(),h=now.getHours();
  for(let back=0;back<3;back++){const d=addDays(new Date(now.getFullYear(),now.getMonth(),now.getDate()),-back),w=ymd(mondayOf(d)),dn=DAYS[(d.getDay()+6)%7],wk=(menu.weeks||{})[w]||{};
    for(const[m]of MEALS){if(back===0&&(m==="midi"?h<14:h<21))continue;const k=slotKey(dn,m),s=wk[k];if(s&&recipes[s.id]&&!s.rated&&!s.noRate)out.push({w,k,id:s.id,dn,m});}}
  return out.slice(0,2);}
// ratings: [{at,stars,tags}] kept in the recipe (synced); the average shows on the sheet and steers suggestions
const RATE_TAGS=["À refaire","Trop long","Trop salé","Pas assez relevé","Les enfants ont aimé","Léger et bon"];
function ratingOf(r){const l=(r&&r.ratings)||[];if(!l.length)return null;return{avg:l.reduce((a,x)=>a+x.stars,0)/l.length,n:l.length,last:l[l.length-1]};}
const starTxt=v=>"★".repeat(Math.round(v))+"☆".repeat(5-Math.round(v));
function renderRecSheet(){
  const id=recSheetId, r=recipes[id]; if(!r){$("#recSheet").hidden=true;return;}
  const sl=slotsOf(id), p=viewServ[id]||(sl.length?W()[sl[0]].n:menu.people), f=p/(r.serves||4), activeSlot=recMealCtx&&W()[recMealCtx]&&W()[recMealCtx].id===id?W()[recMealCtx]:null;
  const ings=(r.ing||[]).map(i=>{const[b,u]=mealIngredientBase(r,i,p,activeSlot);return`<li class="q">${esc(fmt(b,u))}</li><li>${esc(i.n)}</li>`;}).join("");
  const steps=stepsFor(id).steps;
  const shBox=r.shared?`<div class="note" style="display:flex;flex-direction:column;gap:8px"><span>Recette de <b>${esc(r.sharedBy||"un proche")}</b> (lecture seule).${r.linkOnly?" Elle vient d'un site : ouvrez-la avec « Voir la recette d'origine ».":""}</span>
      <div class="row">${r.linkOnly&&r.source?`<a class="btn" href="${esc(r.source)}" target="_blank" rel="noopener">Voir la recette d'origine ↗</a>`:`<button type="button" class="btn" data-act="copyShared">Copier dans mon carnet</button>`}</div></div>`:"";
  const ph=rPhotoSrc(id),rt=ratingOf(r),nut=nutri(r);
  const tab=(v,l)=>`<button type="button" class="chip" data-act="recTab" data-v="${v}" aria-pressed="${recTab===v}">${l}</button>`;
  const cats=`<div class="field"${r.shared?' hidden':""}><span class="label">Catégories (plusieurs possibles)</span><div class="dchips">${CATS.map(c=>{const on=inCat(r,c);return`<span class="dchip${on?" on":""}"><button type="button" data-act="recCat" data-c="${c}" aria-pressed="${on}">${on?"✓ ":""}${c}${r.cat===c&&catsOf(r).length>1?" (principale)":""}</button></span>`;}).join("")}</div>
      ${false?``
       :MAIN_CATS.includes(r.cat)&&inCat(r,"Entrée")?`<span class="muted" style="font-size:13px;margin-top:6px">Servie en entrée, elle compte pour une demi-portion.</span>`:""}</div>`;
  let body="";
  if(recTab==="ing")body=`<div class="serv-row"><span class="label">Ingrédients pour</span>
      <div class="ctl"><button class="step sm" data-act="vserv" data-id="${esc(id)}" data-d="-1" ${p<=1?"disabled":""} aria-label="Une personne de moins">−</button><span class="n">${p} pers.</span><button class="step sm" data-act="vserv" data-id="${esc(id)}" data-d="1" aria-label="Une personne de plus">+</button></div>
      ${platsLine(r,p,id)}<span class="muted" style="font-size:12px">recette prévue pour ${r.serves||4}${dishOf(r)?` (1 ${dishOf(r).one})`:""}</span></div>
    ${activeSlot?`<div style="margin:9px 0 13px;padding:12px;border:1px solid #4b98ff;border-radius:12px;background:#102d4c"><b>🍽️ Adapter les portions</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px">${[[1,"Normale ×1"],[1.5,"Généreuse ×1,5"],[2,"Double ×2"]].map(([v,t])=>`<button type="button" class="btn" data-act="mealPortion" data-k="${esc(recMealCtx)}" data-v="${v}" style="border-color:${mealPortionFactor(activeSlot)===v?'#45dd9c':'#4b98ff'}">${t}</button>`).join("")}<button type="button" class="btn" data-act="mealPortionCustom" data-k="${esc(recMealCtx)}">Personnalisée (${String(mealPortionFactor(activeSlot)).replace('.',',')}×)</button></div><small>Choix enregistré pour ce repas, identique dans Maisonnée et les courses.</small></div>`:""}
    ${ings?`<ul class="ings">${ings}</ul>`:`<p class="muted">Pas d'ingrédients notés.</p>`}
    <div class="recipe-tools"><button type="button" class="btn" data-act="editRec" data-id="${esc(id)}">✏️ Ajouter, supprimer ou remplacer des ingrédients</button></div>
    ${recMealCtx&&W()[recMealCtx]&&W()[recMealCtx].id===id?`<div class="cm-reversible"><button type="button" class="btn ${W()[recMealCtx].lock?"cm-remove":"primary"}" data-act="cmToggleCourses" data-k="${esc(recMealCtx)}">${W()[recMealCtx].lock?"↩ Retirer des courses":"🛒 Ajouter aux courses"} · ${p} pers.</button><div class="muted" style="font-size:12px;margin-top:7px">${W()[recMealCtx].lock?"✓ Ce repas est dans les courses. Les besoins sont recalculés à chaque changement de personnes.":"Ce repas n'est pas dans les courses."}</div></div>`:""}`;
  else if(recTab==="steps"){const sx=stepsFor(id);body=stepsToggle(id,sx)+modeChips(id,sx)+prepHtml(sx.prep)+batchNote(sx,p)+(sx.steps.length?`<ol class="steps">${sx.steps.map(x=>`<li>${esc(x)}${techHtml(techsIn(x))}</li>`).join("")}</ol>`:`<p class="muted">Pas d'étapes notées.${r.source?" Voyez la recette d'origine.":""}</p>`);}
  else body=(()=>{const ws=(menu.wines||[]).filter(w=>w.rec===id);return ws.length?`<div class="note">🍾 Dans votre cave pour ce plat : ${ws.map(w=>`<button type="button" class="link" data-act="wineOpen" data-id="${w.id}">${esc(wineLabel(w))}${w.stock?` (${w.stock})`:" (plus en stock)"}</button>`).join(", ")}</div>`:"";})()+(r.shared?"":`<div class="row" style="justify-content:flex-end">${confirmDel===id?`<span>Supprimer cette recette${slotsOf(id).length?" (elle sera retirée du menu et des courses)":""} ?</span><button type="button" class="btn danger" data-act="delYes" data-id="${esc(id)}">Supprimer</button><button type="button" class="btn ghost" data-act="delNo">Annuler</button>`:`<button type="button" class="btn ghost" data-act="del" data-id="${esc(id)}">🗑️ Supprimer la recette</button>`}</div>`)+`<div class="drink">${(()=>{const d=drinkFor(r);return`🍷 Vin : ${esc(d[0])} ${vivinoLink(pairingQuery(d[0]),"Vivino")}<br>🥤 Sans alcool : ${esc(d[1])}`;})()}</div>
    <div class="nut">${esc(fmtNut(nut))} par personne</div><div>${dissocBadge(recipeDissoc(r))}</div>
    <div class="nat-box">${natureHtml(r)}</div>${cats}
    ${rt?`<div class="field"><span class="label">Vos notes</span>${(r.ratings||[]).slice(-5).reverse().map(x=>`<span style="font-size:13px">${starTxt(x.stars)} · ${new Date(x.at).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}${x.tags&&x.tags.length?" · "+esc(x.tags.join(", ")):""}</span>`).join("")}</div>`:""}
    <div class="row">${photoBtn(r)}${r.source?`<a class="btn" href="${esc(r.source)}" target="_blank" rel="noopener">Recette d'origine ↗</a>`:""}<button type="button" class="btn" data-act="rateOpen" data-id="${esc(id)}">★ Noter</button></div>
    ${r.shared?"":`<div class="row">${confirmDel===id?`<span>Supprimer cette recette ?</span><button class="btn danger" data-act="delYes" data-id="${esc(id)}">Supprimer</button><button class="btn ghost" data-act="delNo">Annuler</button>`:`<button class="x" data-act="del" data-id="${esc(id)}">Supprimer la recette</button>`}</div>`}`;
  const html=`<div class="row rs-head"><span></span><button type="button" class="btn${fromMz?" primary":""}" data-act="closeRec">${fromMz?"← Retour à Maisonnée":"Fermer"}</button></div>
    ${ph?recPhotoBlock(id,true):`<div class="row">${recPhotoBlock(id)}</div>`}
    <div><h2>${r.fav?`<span title="Favorite" style="color:#e6a900">★ </span>`:""}${esc(r.name)}</h2><div class="muted" style="font-size:13px;margin-top:4px"><span class="tag">${esc(catsOf(r).join(" · "))}</span>${r.time?r.time+" min · ":""}${KIND_LABEL[kindOf(r)]}${isLight(r)?" · léger":""}${showOn("nut")?" · "+esc(fmtNut(nut,true)):""}${rt?` · <b class="rs-stars">${starTxt(rt.avg)}</b> (${rt.n})`:""}</div></div>
    ${shBox}
    ${recMealCtx&&W()[recMealCtx]&&W()[recMealCtx].id===id?`<div class="cm-meal-actions">${cmStatusChips(recMealCtx,W()[recMealCtx])}<div class="cm-meal-note">${W()[recMealCtx].lock?"🛒 Ce repas est inclus dans les courses.":"Ce repas n’est pas envoyé aux courses."}</div><div class="cm-meal-buttons"><button type="button" class="btn danger" data-act="cmRemoveMenu" data-k="${esc(recMealCtx)}">🗑️ Retirer du menu</button></div></div>`:""}
    <div class="rs-acts">
      <button type="button" data-act="fav" data-id="${esc(id)}" aria-pressed="${!!r.fav}"><span>${r.fav?"★":"☆"}</span>Favori</button>
      <button type="button" data-act="toggle" data-id="${esc(id)}"><span>📅</span>+ Menu</button>
      
      <button type="button" data-act="editRec" data-id="${esc(id)}"><span>✏️</span>${r.shared?"Personnaliser":"Modifier"}</button><button type="button" data-act="variantRec" data-id="${esc(id)}"><span>📋</span>Créer une variante</button></div>
    ${r.cloudBy?`<div class="muted" style="font-size:13px">👤 Ajoutée par <b>${esc(r.cloudBy)}</b></div>`:""}${proposeHtml(id)}${pageHtml(id)}
    ${steps.length?`<button type="button" class="btn primary rs-cook" data-act="cook" data-id="${esc(id)}">👨‍🍳 Cuisiner pas à pas</button>`:""}
    <div class="chips rs-tabs">${tab("ing","Ingrédients")}${tab("steps","Étapes"+(steps.length?" ("+steps.length+")":""))}${tab("info","Vin & infos")}</div>
    <div class="rs-body">${body}</div>`;
  // only redraw when something changed (photos arriving in the background must not reset what you are reading)
  const box=$("#recSheetIn");if(html===lastRecHtml&&box.childElementCount)return;const oldScroll=box.scrollTop;lastRecHtml=html;
  const opened=[...box.querySelectorAll("details[open] summary")].map(s=>s.textContent);
  box.innerHTML=html;box.querySelectorAll("details summary").forEach(s=>{if(opened.includes(s.textContent))s.parentNode.open=true;});box.scrollTop=oldScroll;
}
let lastRecHtml="";
// switching tab: the tab bar stays exactly where it was under the finger
function switchRecTab(v,toTop){const sc=$("#recSheetIn"),t0=sc.querySelector(".rs-tabs"),before=t0?t0.offsetTop-sc.scrollTop:0;
  recTab=v;renderRecSheet();const t1=sc.querySelector(".rs-tabs");if(!t1)return;
  sc.scrollTop=toTop?Math.max(0,t1.offsetTop-70):Math.max(0,t1.offsetTop-before);}
$("#recSheet").addEventListener("click",e=>{if(e.target.id==="recSheet"){if(fromMz){fromMz=false;location.assign(APP_URL+"maison/");return;}$("#recSheet").hidden=true;}});
function openRecipe(id){
  if(!recipes[id])return;
  $("#pickSheet").hidden=true;
  if(!recMatch(recipes[id],filter.q,"",filter.quick,filter.light,filter.fav,filter.theme==="nouveau"?"":filter.theme)||(filter.cats||[]).length&&!filter.cats.some(c=>inCat(recipes[id],c))||(filter.kinds||[]).length&&!filter.kinds.includes(kindOf(recipes[id]))){filter=Object.assign(filter,{q:"",cat:"Toutes",kind:"",quick:false,light:false,fav:false,theme:"",cats:[],kinds:[]});$("#q").value="";toast("Filtres retirés pour montrer cette recette");}
  view="rec"; LS.set("cm_view",view); openId=id; confirmDel=null; render();
  setTimeout(()=>{const el=document.getElementById("card-"+id);if(el)el.scrollIntoView({block:"start",behavior:"smooth"});},60);
}
let pickKey=null, pickRole="main";
const ROLE_CATS={entree:["Entrée","Soupe"],dessert:["Dessert"]};
// starters and desserts: favourites, not already eaten this week, light in the evening, compatible with strict combining
function roleScore(id){
  const r=recipes[id], s=W()[pickKey]; let sc=Math.random()*1.5;
  if(r.fav)sc+=1.5;
  const usedWeek=Object.entries(W()).some(([k,x])=>k!==pickKey&&x&&(x.entree===id||x.dessert===id));if(usedWeek)sc-=3;
  if(pickKey.endsWith("soir")&&menu.prefs.lightEve)sc+=isLowKcal(r)?1.5:-0.5;
  if(s&&menu.prefs.dissoc){const t=Object.assign({},s,{[pickRole]:id});sc+=mealDissoc(t).ok?4:-3;}
  if(s&&s.id&&recipes[s.id]&&isHeavy(recipes[s.id])&&isLowKcal(r))sc+=1;
  return sc;
}
function pickPool(){
  const cats=ROLE_CATS[pickRole];
  return Object.keys(recipes).filter(x=>cats?inCats(recipes[x],cats):canMain(recipes[x])&&!onMenu(x));
}
function flashSlot(k){setTimeout(()=>{const el=document.querySelector(view==="week"?`[data-wslot="${k}"]`:`[data-slot="${k}"]`);if(!el||(view!=="menu"&&view!=="week"))return;
  el.scrollIntoView({block:"center",behavior:"smooth"});el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),1600);},90);}
/* V6 — Une programmation supprimée ne doit pas réutiliser ses anciens achats.
   Ne libérer que les crédits attribuables au repas retiré et non requis
   par d'autres repas encore en courses. Les achats historiques restent dans trips. */
function detachRemovedMealPurchases(w,k){
  const slot=((menu.weeks||{})[w]||{})[k];
  if(!slot||!slot.id||!slot.lock)return;
  const oldBought=menu.bought||{},oldChecked=menu.checked||{},oldQty=menu.checkedQty||{};
  const before=shopping(true); // déclenche d'abord les ajustements V4 éventuels
  const credits=menu.bought||{};
  const oldLock=slot.lock,oldState=slot.mealState;
  // Mesurer la contribution du repas sans achats déjà déduits.
  const measure=()=>{const save=menu.bought;menu.bought={};try{return Object.fromEntries(shopping(true).map(i=>[i.key,i.q]));}finally{menu.bought=save;}};
  const full=measure();
  delete slot.lock;delete slot.mealState;
  const rest=measure();
  slot.lock=oldLock;slot.mealState=oldState;
  menu.bought=Object.assign({},credits);
  menu.checked=Object.assign({},oldChecked);
  menu.checkedQty=Object.assign({},oldQty);
  const today=ymd(new Date());
  for(const [key,total] of Object.entries(full)){
    const contribution=Math.max(0,total-(rest[key]||0));
    if(contribution<=0.000001)continue;
    // Un produit partagé par plusieurs repas ne doit pas perdre leurs achats.
    if((rest[key]||0)>0.000001)continue;
    const b=menu.bought[key];
    if(b&&b.until>=today){const left=Math.max(0,(Number(b.q)||0)-contribution);
      if(left<=0.000001)delete menu.bought[key];else menu.bought[key]={...b,q:left};}
    delete menu.checked[key];delete menu.checkedQty[key];
  }
}
// changing a dish from Courses: if the meal was already validated, its old ingredients leave the list first
let shopSwapCtx=null;
function releaseMeal(w,k){const s=((menu.weeks||{})[w]||{})[k];if(!s||!s.lock)return 0;
  const q=()=>Object.fromEntries(shopping(true).map(i=>[i.key,i.q]));const bt=menu.bought;
  const L1=q();menu.bought={};const R1=q();menu.bought=bt;delete s.lock;const L0=q();menu.bought={};const R0=q();menu.bought=bt;
  const today=ymd(new Date());let gone=0;menu.bought=Object.assign({},menu.bought);menu.have=Object.assign({},menu.have);
  for(const key of Object.keys(R1)){const d=R1[key]-(R0[key]||0),cur=(L1[key]||0)-(L0[key]||0);if(d<=1e-6)continue;
    if(cur>1e-6)gone++;
    const red=d-cur,b=menu.bought[key];if(red>1e-6&&b&&b.until>=today){const nq=b.q-red;if(nq<=1e-6)delete menu.bought[key];else b.q=nq;} // undo this meal's "j'en ai déjà"
    if(menu.have[key]&&!R0[key])delete menu.have[key];}
  return gone;}
function setPicked(id){
  const k=pickKey, old=W()[k];
  const sw=shopSwapCtx&&shopSwapCtx.k===k&&shopSwapCtx.w===curWeek&&pickRole==="main"&&old&&old.id!==id?shopSwapCtx:null;shopSwapCtx=null;
  if(sw&&old.lock){const gone=releaseMeal(sw.w,k),was=recipes[old.id]?recipes[old.id].name:"l'ancien plat";
    W()[k]=Object.assign({},old,{id});delete W()[k].lock;$("#pickSheet").hidden=true;render();saveMenu();
    toast(`« ${was} » retiré de la liste (${gone} ingrédient${gone>1?"s":""})`);
    setTimeout(()=>lockPreview([{w:sw.w,k}]),120);return;}
  if(pickRole==="main"){W()[k]=Object.assign({},old||{},{id,n:old?old.n:menu.people});if(W()[k].left||W()[k].note){delete W()[k].left;delete W()[k].note;delete W()[k].keep;}}
  else{if(!old)return;old[pickRole]=id;}
  $("#pickSheet").hidden=true;render();saveMenu();flashSlot(k);
  toast(slotLabel(k)+(pickRole==="entree"?" · entrée : ":pickRole==="dessert"?" · dessert : ":" : ")+recipes[id].name);
}
function renderPick(){
  const q=norm($("#pickQ").value), cur=W()[pickKey], cats=ROLE_CATS[pickRole];
  const curId=cur&&(pickRole==="main"?cur.id:cur[pickRole]);
  $("#pickKinds").innerHTML=kindChipsHtml("pkind",pickKind,pickQuick,pickLight,pickFav,pickTheme);
  const all=Object.entries(recipes).filter(([,r])=>(!cats||inCats(r,cats)||!!q)&&recMatch(r,$("#pickQ").value,pickKind,pickQuick,pickLight,pickFav,pickTheme))
    .sort((a,b)=>(cats?(inCats(b[1],cats)-inCats(a[1],cats)):0)||a[1].name.localeCompare(b[1].name,"fr"));
  const list=all.slice(0,80);
  $("#pickList").innerHTML=(list.length?list.map(([id,r])=>`<button class="pick-item${curId===id?" cur":""}" data-act="pickSet" data-id="${esc(id)}">
    ${thumbHtml(id,"pi-ph")}<span class="pi-n">${esc(r.name)}${onMenu(id)?' <span class="muted" style="font-size:12px">· déjà au menu</span>':""}</span><span class="muted" style="font-size:13px;white-space:nowrap">${esc(r.cat||"")}${r.time?" · "+r.time+" min":""}</span></button>`).join("")
    :(()=>{const near=q?closeNames($("#pickQ").value,Object.keys(recipes)):[];
      return near.length?`<p class="muted" style="margin-bottom:4px">Pas de « ${esc($("#pickQ").value.trim())} »… vouliez-vous dire :</p>`+near.map(id=>`<button class="pick-item" data-act="pickSet" data-id="${esc(id)}"><span>${esc(recipes[id].name)}</span><span class="muted" style="font-size:13px;white-space:nowrap">${esc(recipes[id].cat||"")}</span></button>`).join("")
        :`<p class="muted">${q?`Aucune recette « ${esc($("#pickQ").value.trim())} » dans votre carnet.`:"Aucune recette ne correspond."}</p>`;})())+(all.length>list.length?`<p class="muted" style="font-size:13px">${all.length-list.length} autres : précisez la recherche.</p>`:"");
  const web=!!q; $("#pickWeb").hidden=!web; $("#pickSugg").hidden=!!q; $("#pickAllLab").textContent=q?"Résultats":pickRole==="entree"?"Toutes les entrées":pickRole==="dessert"?"Tous les desserts":"Toutes les recettes";
  $("#pwTitle").textContent=all.length?`Pas la bonne ? Chercher « ${$("#pickQ").value.trim()} » sur le web`:`Aucune recette « ${$("#pickQ").value.trim()} » : la trouver sur le web`;
  if(!all.length)$("#pickWeb").open=true;
  if(web){const e=encodeURIComponent($("#pickQ").value.trim());
    $("#pw-m").href=`https://www.marmiton.org/recettes/recherche.aspx?aqt=${e}`;$("#pw-7").href=`https://www.750g.com/recherche?q=${e}`;$("#pw-j").href=`https://www.google.com/search?q=${e}+site%3Ajow.fr`;}
}
let suggSeen=[], suggNow=[], favLimit=8;
function syncFavMode(){
  const btn=$("#pickFavBtn"); btn.setAttribute("aria-pressed",pickFav); btn.classList.toggle("primary",pickFav);
  $("#pickQ").placeholder=pickFav?"Chercher dans vos favoris":pickRole==="dessert"?"Cherchez : chocolat, pomme, tarte…":pickRole==="entree"?"Cherchez : soupe, salade, velouté…":"Cherchez : poisson, poulet, gratin, risotto…";
}
function renderSugg(){
  const box=$("#pickSugg"); if(!suggOn||pickFav){box.innerHTML=pickFav?`<span class="label psec">★ Vos favoris</span>`:"";return;}
  const week=weekMap(); delete week[pickKey];
  const cur=W()[pickKey], main=pickRole==="main", curId=cur&&(main?cur.id:cur[pickRole]);
  const base=main?eligible():pickPool(), skip=new Set([...(curId?[curId]:[]),...suggSeen]);
  let cands=base.filter(id=>!skip.has(id));
  if(cands.length<4){suggSeen=[];cands=base.filter(id=>id!==curId);}
  const score=id=>main?scoreFor(id,pickKey,week):roleScore(id);
  const ranked=cands.map(id=>[id,score(id)]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  const kinds=new Set(); suggNow=[];
  for(const id of ranked){const kd=kindOf(recipes[id]);if(!kinds.has(kd)){kinds.add(kd);suggNow.push(id);}if(suggNow.length>=5)break;}
  for(const id of ranked){if(suggNow.length>=5)break;if(!suggNow.includes(id))suggNow.push(id);}
  const item=id=>{const r=recipes[id];return`<button class="pick-item" data-act="pickSet" data-id="${esc(id)}">${thumbHtml(id,"pi-ph")}<span class="pi-n">${r.fav?"★ ":""}${esc(r.name)}${onMenu(id)?' <span class="muted" style="font-size:12px">· déjà au menu</span>':""}</span><span class="muted" style="font-size:13px;white-space:nowrap">${pickRole==="main"?KIND_LABEL[kindOf(r)]:Math.round(nutri(r).k/10)*10+" kcal"}${r.time?" · "+r.time+" min":""}</span></button>`;};
  const cats=ROLE_CATS[pickRole];
  const favs=Object.keys(recipes).filter(id=>recipes[id].fav&&(cats?inCats(recipes[id],cats):canMain(recipes[id]))&&id!==curId)
    .map(id=>[id,score(id)]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  box.innerHTML=(suggNow.length?`<span class="label psec">${main?"Suggestions pour ce repas":pickRole==="entree"?"Entrées suggérées":"Desserts suggérés"}</span><div class="pick-list">${suggNow.map(item).join("")}</div>
    <button class="link" data-act="moreSugg">↻ D'autres suggestions</button>`:"")
    +`<span class="label psec">★ Vos favoris</span>`
    +(favs.length?`<div class="pick-list">${favs.slice(0,favLimit).map(item).join("")}</div>${favs.length>favLimit?`<button class="link" data-act="moreFav" style="margin-top:6px">Voir les ${favs.length-favLimit} autres favoris</button>`:""}`
      :`<p class="muted" style="font-size:13px;margin:4px 0 0">Aucun favori pour l'instant : dans l'onglet Recettes, touchez l'étoile ☆ d'une recette pour l'ajouter.</p>`);
}
let suggOn=false;
let pickKind="", pickQuick=false, pickLight=false, pickFav=false, pickTheme="";
function openPick(k,role,withSugg){
  pickKind=""; pickQuick=false; pickLight=false; pickFav=false; pickTheme="";
  suggOn=true; suggSeen=[]; favLimit=8;
  pickKey=k; pickRole=role||"main";
  $("#pickTitle").textContent=slotLabel(k)+(pickRole==="entree"?" · entrée":pickRole==="dessert"?" · dessert":"");
  $("#pickQ").value=""; $("#pickClear").hidden=!(pickRole==="main"?W()[k]:W()[k]&&W()[k][pickRole]);
  syncFavMode();
  $("#pickRandomBtn").textContent=(role||"main")==="main"?"Choix automatique":"Au hasard";
  {const pf=$("#pickFree");if(pf)pf.hidden=pickRole!=="main";}
  renderSugg(); renderPick(); $("#pickSheet").hidden=false; $("#pickSheet .sheet-in").scrollTop=0;
}
$("#pickQ").addEventListener("input",renderPick);
$("#pickSheet").addEventListener("click",e=>{if(e.target.id==="pickSheet")$("#pickSheet").hidden=true;});
function fillForm(r){
  if(r.name)$("#f-name").value=r.name;
  if(CATS.includes(r.cat)){$("#f-cat").value=r.cat;formCats=[r.cat];renderFormCats();}
  if(r.time)$("#f-time").value=Number(r.time)||"";
  if(r.serves)$("#f-serves").value=Number(r.serves)||4;
  if(Array.isArray(r.ing)&&r.ing.length){$("#f-ings").innerHTML="";r.ing.filter(i=>i&&i.n).forEach(i=>addIngRow({q:Number(i.q)||0,u:i.u,n:String(i.n),r:i.r}));}
  if(Array.isArray(r.steps))$("#f-steps").value=r.steps.map(String).join("\n");
}
let editId=null, editBack=false, formPhoto=null;
$("#f-photo").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];if(f){formPhoto=f;$("#f-photoMsg").textContent="✓ "+(f.name&&f.name.length<30?f.name:"photo choisie")+" · ajoutée à l'enregistrement";}});
function openSheet(id){
  $("#recForm").reset();$("#f-ings").innerHTML="";$("#f-err").textContent="";
  $("#pasteBox").open=false;$("#pasteIn").value="";$("#pasteMsg").textContent="";
  const r=id&&recipes[id];editId=r?id:null;formPhoto=null;$("#f-photo").value="";$("#f-photoMsg").textContent="facultatif · sinon une photo d'illustration est trouvée";
  $("#f-stepsNote").textContent="Quand vous renommez un ingrédient, son nom est aussi changé dans les étapes. Relisez-les et adaptez la préparation si besoin.";$("#f-stepsNote").style.color="";
  $("#f-title").textContent=r?"Modifier la recette":"Nouvelle recette";$("#pasteBox").hidden=false;$("#pasteBox").open=false;$("#webBox").hidden=!r;$("#webBox").open=false;$("#webMsg").textContent="";$("#webLink").value="";$("#f-delRow").hidden=!r;
  if(r){const q=encodeURIComponent(r.name);$("#webSites").innerHTML=[["Marmiton","https://www.marmiton.org/recettes/recherche.aspx?aqt="+q],["750g","https://www.750g.com/recherche?q="+q],["Google","https://www.google.com/search?q="+q+"+recette"]].map(([l,u])=>`<a class="btn" target="_blank" rel="noopener" href="${u}">${l} ↗</a>`).join("");}
  $("#f-save").textContent=r?"Enregistrer les modifications":"Enregistrer la recette";
  formCats=r?catsOf(r).filter(c=>CATS.includes(c)):["Plat"];renderFormCats();
  if(r){$("#f-name").value=r.name||"";$("#f-time").value=Number(r.time)||"";$("#f-serves").value=Number(r.serves)||4;
    (r.ing||[]).filter(i=>i&&i.n).forEach(i=>addIngRow({q:Number(i.q)||0,u:i.u,n:String(i.n),r:i.r}));addIngRow();
    $("#f-steps").value=Array.isArray(r.steps)?r.steps.join("\n"):String(r.steps||"");}
  else for(let k=0;k<3;k++)addIngRow();
  $("#sheet").hidden=false;$("#recForm").scrollTop=0;if(!r)setTimeout(()=>$("#f-name").focus(),50);
}
// Créer une variante sans jamais écraser la recette source.
let variantPending=null;
function createRecipeVariant(id,week,slot){
  const r=recipes[id];if(!r)return;
  const n=JSON.parse(JSON.stringify(r));delete n.shared;delete n.sharedBy;delete n.cloudAuthor;
  n.name=(r.name||"Recette")+" — variante";n.createdAt=new Date().toISOString();n.variantOf=id;
  const nid="variante-"+Math.random().toString(36).slice(2,11);
  saveRecipe(nid,n);
  variantPending={id:nid,week:week||null,slot:slot||null};
  editRecipe(nid);
}
// edit any recipe from anywhere; a recipe shared by a relative is first copied into my notebook
function editRecipe(id){const r=recipes[id];if(!r)return;
  if(r.shared||(r.cloudAuthor&&cloud.user&&r.cloudAuthor!==cloud.user.id&&!cloud.admin)){const n=JSON.parse(JSON.stringify(r));delete n.shared;delete n.sharedBy;n.createdAt=new Date().toISOString();
    const nid=(norm(r.name).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"recette")+"-"+Math.random().toString(36).slice(2,6);
    saveRecipe(nid,n);toast("Copiée dans votre carnet pour la personnaliser");id=nid;}
  editBack=!$("#recSheet").hidden;if(editBack){recSheetId=id;$("#recSheet").hidden=true;}openSheet(id);}
$("#sheet").addEventListener("click",e=>{if(e.target.id==="sheet")$("#sheet").hidden=true;});
$("#syncSheet").addEventListener("click",e=>{if(e.target.id==="syncSheet")$("#syncSheet").hidden=true;});
$("#recForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const name=$("#f-name").value.trim();
  const ing=[...document.querySelectorAll(".ing-block")].map(b=>({q:Number(b.querySelector(".iq").value)||0,u:b.querySelector(".iu").value,n:b.querySelector(".in").value.trim(),r:b.querySelector(".ir").value})).filter(i=>i.n);
  if(!name){$("#f-err").textContent="Donnez un nom à la recette.";return;}
  if(!ing.length){$("#f-err").textContent="Ajoutez au moins un ingrédient avec son nom.";return;}
  const fc=formCats.length?formCats:["Plat"];
  if(editId&&recipes[editId]){const old=recipes[editId],cat=fc[0];
    const data=Object.assign({},old,{name,cat,time:Number($("#f-time").value)||0,serves:Math.max(1,Number($("#f-serves").value)||4),ing,steps:$("#f-steps").value.trim(),updatedAt:new Date().toISOString()});
    delete data.alsoMain;delete data.alsoEntree;if(fc.length>1)data.cats=fc.slice(1);else delete data.cats;
    const id=editId;editId=null;$("#sheet").hidden=true;await saveRecipe(id,data);if(formPhoto){const f=formPhoto;formPhoto=null;setRecipePhoto(id,f);}
    if(!editBack)openId=id;render();
    if(variantPending&&variantPending.id===id){
      const v=variantPending;variantPending=null;
      if(v.week&&v.slot&&confirm("Remplacer le repas prévu par cette variante ?")){
        const wk=(menu.weeks||{})[v.week];if(wk&&wk[v.slot]){wk[v.slot].id=id;saveMenu();toast("Variante enregistrée et repas remplacé");}
        else toast("Variante enregistrée ; repas prévu introuvable.");
      }else toast("Variante enregistrée sans modifier le planning");
    }else toast("Recette modifiée");return;}
  const slug=norm(name).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"recette";
  const id=slug+"-"+Math.random().toString(36).slice(2,6);
  const data={name,cat:fc[0],...(fc.length>1?{cats:fc.slice(1)}:{}),time:Number($("#f-time").value)||0,serves:Math.max(1,Number($("#f-serves").value)||4),ing,steps:$("#f-steps").value.trim(),createdAt:new Date().toISOString()};
  $("#sheet").hidden=true;
  await saveRecipe(id,data);if(formPhoto){const f=formPhoto;formPhoto=null;setRecipePhoto(id,f);}if(formPage){savePagePhoto(id,formPage);formPage=null;}
  view="rec";render();openRecSheet(id);setTimeout(clearSheetBack,60);toast("Recette enregistrée");
});


/* ---------- import a recipe: photo sent to an AI app (or Live Text), then any text is cleaned and sorted into the fields ---------- */
let impFile=null,impFromForm=false;
const PAGES="cm_pages";
async function savePagePhoto(id,file){const url=URL.createObjectURL(file);try{const img=await loadImg(url),k=Math.min(1,1400/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);const m=LS.get(PAGES,{});m[id]=c.toDataURL("image/jpeg",0.7);const ks=Object.keys(m);
  for(;;){try{localStorage.setItem(PAGES,JSON.stringify(m));break;}catch(e){const k2=Object.keys(m).filter(x=>x!==id);if(!k2.length)break;delete m[k2[0]];}}
  lastRecHtml="";if(!$("#recSheet").hidden)renderRecSheet();cloudSoon();}catch(e){}finally{URL.revokeObjectURL(url);}}
function pageHtml(id){const p=LS.get(PAGES,{})[id]||(recipes[id]&&recipes[id].cloudPage);return p?`<div class="page-ph"><span class="label">📄 Page du livre</span><img src="${p}" alt="Page du livre" data-act="pageZoom"></div>`:"";}
function impOpen(withPhoto,fromForm){impFromForm=!!fromForm;impFile=null;$("#scanImg").hidden=true;$("#scanImg").classList.remove("big");$("#impAi").hidden=true;$("#qi-name").value="";$("#qi-text").value="";
  $("#impPhoto").hidden=!withPhoto;$("#impStep2").textContent=withPhoto?"2 · La recette":"La recette";$("#impTitle").textContent=withPhoto?"📸 Importer une photo":"📝 Nouvelle recette (texte libre)";
  $("#scanSheet").hidden=false;$("#scanSheet .sheet-in").scrollTop=0;if(!withPhoto)setTimeout(()=>$("#qi-name").focus(),80);}
document.addEventListener("change",async e=>{const t=e.target;if(!t.classList||!t.classList.contains("imp-file"))return;const f=t.files&&t.files[0];t.value="";if(!f)return;
  impFile=f;const u=URL.createObjectURL(f);$("#scanImg").src=u;$("#scanImg").hidden=false;$("#impAi").hidden=false;});

// 1. image clean-up: right size, greyscale, contrast stretched (dark text on white)
async function ocrPrep(file){const url=URL.createObjectURL(file);try{const img=await loadImg(url);
  const L=Math.max(img.width,img.height),k=L>2400?2400/L:L<1400?1400/L:1,c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
  const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(img,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height),p=d.data,h=new Uint32Array(256);
  for(let i=0;i<p.length;i+=4){const g=(p[i]*0.299+p[i+1]*0.587+p[i+2]*0.114)|0;p[i]=g;h[g]++;}
  const n=p.length/4;let lo=0,hi=255,acc=0;for(;lo<255;lo++){acc+=h[lo];if(acc>n*0.02)break;}acc=0;for(;hi>0;hi--){acc+=h[hi];if(acc>n*0.10)break;}
  const sc=255/Math.max(30,hi-lo);for(let i=0;i<p.length;i+=4){let v=(p[i]-lo)*sc;v=v<0?0:v>255?255:v;v=255*Math.pow(v/255,1.4);p[i]=p[i+1]=p[i+2]=v;}
  x.putImageData(d,0,0);return{canvas:c,preview:c.toDataURL("image/jpeg",0.6)};}finally{URL.revokeObjectURL(url);}}
// 2. reading order: one or two columns, from the position of each line
function ocrOrder(data,W){const lines=(data.lines||[]).filter(l=>l.text&&l.text.trim()&&l.bbox);if(!lines.length)return data.text||"";
  const left=lines.filter(l=>l.bbox.x1<W*0.56),right=lines.filter(l=>l.bbox.x0>W*0.44),wide=lines.filter(l=>!left.includes(l)&&!right.includes(l));
  const by=a=>a.sort((p,q)=>p.bbox.y0-q.bbox.y0);
  if(left.length>=3&&right.length>=3&&wide.length<=Math.max(2,lines.length*0.2)){const top=Math.min(...left.concat(right).map(l=>l.bbox.y0));
    const head=by(wide.filter(l=>l.bbox.y0<=top+5)),rest=by(wide.filter(l=>l.bbox.y0>top+5));
    return[...head,...by(left),...by(right),...rest].map(l=>l.text.trim()).join("\n");}
  return by(lines).map(l=>l.text.trim()).join("\n");}
// 3. text clean-up
function ocrClean(t){return String(t||"").replace(/\r/g,"")
  .replace(/([a-zàâçéèêëîïôûù])-\n(les|la|le|lui|leur|vous|nous|en|y|moi|toi)\b/g,"$1-$2").replace(/([a-zàâçéèêëîïôûù])-\n([a-zàâçéèêëîïôûù])/g,"$1$2")
  .split("\n").map(l=>l.replace(/^#+\s*/,"").replace(/[|¦_~•·►▪■□©®™<>{}\[\]\\^`"“”*]+/g," ").replace(/^[\s\-–—*+°.,;:]+(?=\D)/,"")
    .replace(/\bc\.?\s?[àa@]\.?\s?s(?:oupe)?\b\.?/gi,"c. à s.").replace(/\bc\.?\s?[àa@]\.?\s?c(?:af[ée])?\b\.?/gi,"c. à c.")
    .replace(/\b(\d+)\s?([gG])r?\b\.?/g,"$1 g").replace(/\b(\d+)\s?(cl|ml|kg|dl|l)\b/gi,(m,a,b)=>a+" "+b.toLowerCase()).replace(/\b0e\b/g,"oe").replace(/oeuf/gi,m=>m[0]==="O"?"Œuf":"œuf")
    .replace(/\s{2,}/g," ").trim())
  .filter(l=>(l.match(/[a-zàâçéèêëîïôûù0-9]/gi)||[]).length>=2&&!/^\d{1,3}$/.test(l))
  .reduce((a,l)=>{const p=a[a.length-1];if(p&&p.length>25&&!/[.!?:]$/.test(p)&&(/^[a-zàâçéèêëîïôûù]/.test(l)||/^\d+\s*(min|minutes|h\b|heures?|°|degr)/i.test(l)))a[a.length-1]=p+" "+l;else a.push(l);return a;},[]).join("\n");}
// 4. blocks: title / ingredients / steps (numbered steps start a new step, lowercase lines continue the previous one)
function ocrSplit(t){t=String(t).split("\n").flatMap(l=>l.length<70&&/^\d/.test(l)&&/[a-zàâçéèêëîïôûùœ]\s+\d/.test(l)&&!/[.!]$/.test(l)?l.split(/(?<=[a-zàâçéèêëîïôûùœ'])\s+(?=\d)/):[l]).join("\n");const r=parseRecipeText(t);const ing=[],st=[];
  for(const i of r.ing){const line=[i.q?String(i.q).replace(".",","):"",i.u&&i.u!=="pièce"?i.u:"",i.n].filter(Boolean).join(" ");if(i.n.length>70&&/\b(faites|ajoutez|mettez|versez|laissez|coupez|mélangez|cuire|cuisez)\b/i.test(i.n))st.push(i.n);else ing.push(line);}
  for(const x of r.steps){if(x.length<45&&looksLikeIng(x)&&!/[.!]$/.test(x))ing.push(x);else st.push(x);}
  return{name:r.name,time:r.time||"",serves:r.serves||"",ing,steps:st};}

/* ---------- what can I make with… ---------- */
function parseHave(){return $("#frIn").value.split(/[,;\n]| et /).map(norm).filter(x=>x.length>1);}
const sing=s=>s.replace(/(s|x)$/,"");
function matchIng(have,name){const n=sing(norm(name));return have.some(h=>{const x=sing(h);return n.includes(x)||x.includes(n);});}
const PANTRY=/sel|poivre|huile|bouillon|farine|piment|sauce soja|pâte de curry/i;
$("#frForm").addEventListener("submit",e=>{e.preventDefault();runFridge();});
function runFridge(){
  const have=parseHave(), out=$("#frOut");
  if(!have.length){out.innerHTML='<p class="muted" style="margin:0">Indiquez au moins un ingrédient, séparés par des virgules.</p>';return;}
  const scored=Object.entries(recipes).map(([id,r])=>{
    const main=(r.ing||[]).filter(i=>!PANTRY.test(i.n));
    const hit=main.filter(i=>matchIng(have,i.n));
    return{id,r,hit:hit.length,tot:main.length,miss:main.filter(i=>!matchIng(have,i.n)).map(i=>i.n)};
  }).filter(x=>x.hit>0).sort((a,b)=>(b.hit/b.tot)-(a.hit/a.tot)||b.hit-a.hit).slice(0,4);
  const rows=scored.length?`<div class="list">${scored.map(x=>`<div class="dish has-ph">${thumbHtml(x.id,"dish-ph")}<div><button type="button" class="idea-name" data-act="viewRec" data-id="${esc(x.id)}" style="border:none;background:none;padding:0;text-align:left"><h3>${esc(x.r.name)}</h3></button>
      <div class="meta">${x.hit} sur ${x.tot} ingrédients${x.miss.length?" · manque : "+esc(x.miss.slice(0,4).join(", "))+(x.miss.length>4?"…":""):""}</div>
      <button type="button" class="link" data-act="viewRec" data-id="${esc(x.id)}">Voir la recette</button></div>
      <div class="ctl"><button type="button" class="add${onMenu(x.id)?" on":""}" data-act="toggle" data-id="${esc(x.id)}">${onMenu(x.id)?"✓ Au menu":"+ Menu"}</button></div></div>`).join("")}</div>`
    :'<p class="muted" style="margin:0">Aucune recette du carnet n\'utilise ces ingrédients.</p>';
  // and on the web: search the recipe sites with these ingredients, then save the one you like by its link
  const q=$("#frIn").value.split(/[,;\n]| et /).map(s=>s.trim()).filter(Boolean).join(" "), e=encodeURIComponent(q);
  const web=`<div class="fr-web"><span class="label">Sur internet</span>
    <div class="row"><a class="btn" target="_blank" rel="noopener" href="https://www.marmiton.org/recettes/recherche.aspx?aqt=${e}">Marmiton ↗</a><a class="btn" target="_blank" rel="noopener" href="https://www.750g.com/recherche?q=${e}">750g ↗</a><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=${e}+site%3Ajow.fr">Jow ↗</a><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=recette+${e}">Google ↗</a></div>
    <span class="muted" style="font-size:13px">Une recette vous plaît ? Partager → Copier le lien, puis collez-le ici pour l'enregistrer dans votre carnet.</span>
    <textarea id="frLinks" class="search" rows="2" placeholder="Collez le lien de la recette"></textarea>
    <button type="button" class="btn primary" data-act="frImport" style="align-self:flex-start">Enregistrer dans mon carnet</button>
    <div id="frWebMsg" class="muted" style="font-size:13px"></div></div>`;
  out.innerHTML=`<span class="label">Dans votre carnet</span>${rows}${web}`;
}

/* ---------- backup ---------- */
async function backup(){
  const name="carnet-menus-"+new Date().toISOString().slice(0,10)+".json";
  const blob=new Blob([JSON.stringify({app:"carnet-menus",v:1,recipes,menu},null,1)],{type:"application/json"});
  try{const f=new File([blob],name,{type:"application/json"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"Carnet de menus"});return;}}catch(e){if(e&&e.name==="AbortError")return;}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}
$("#restoreIn").addEventListener("change",async e=>{
  const f=e.target.files&&e.target.files[0];e.target.value="";if(!f)return;
  try{const d=JSON.parse(await f.text());
    if(!d||typeof d.recipes!=="object")throw 0;
    const n=Object.keys(d.recipes).filter(k=>d.recipes[k]&&d.recipes[k].name&&Array.isArray(d.recipes[k].ing)).length;
    Object.assign(recipes,d.recipes);LS.set("cm_recipes",recipes);
    if(d.menu&&typeof d.menu==="object"){menu=normMenu(d.menu);saveMenu();}
    render();scheduleSync();toast(n+" recettes restaurées");
  }catch(err){toast("Ce fichier n'est pas une sauvegarde du carnet.");}
});

/* ---------- find recipes on the web, import them by link ---------- */
function updateFindLinks(){
  const q=$("#findIn").value.trim(), e=encodeURIComponent(q);
  $("#go-marmiton").href=q?`https://www.marmiton.org/recettes/recherche.aspx?aqt=${e}`:"https://www.marmiton.org";
  $("#go-750g").href=q?`https://www.750g.com/recherche?q=${e}`:"https://www.750g.com";
  $("#go-jow").href=q?`https://www.google.com/search?q=${e}+site%3Ajow.fr`:"https://jow.fr";
}
$("#findIn").addEventListener("input",updateFindLinks);
$("#findIn").addEventListener("keydown",e=>{if(e.key==="Enter")e.preventDefault();});
let imports=LS.get("cm_imports",[]), importTimer=null;
function importMsg(t){$("#importStatus").textContent=t;const f=$("#frWebMsg");if(f)f.textContent=t;}
async function sendImport(text,msg,assign){
  const urls=[...new Set((text.match(/https?:\/\/[^\s<>"'«»]+/g)||[]).map(u=>u.replace(/[).,;]+$/,"")))].slice(0,15);
  if(!urls.length){msg("Collez au moins un lien de recette (il commence par https://).");return false;}
  if(!sync){msg("L'import passe par le robot de votre dépôt GitHub : activez d'abord « Partage entre téléphones » dans Réglages.");return false;}
  const id="i"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  msg("Envoi au robot…");
  try{
    const p=await gh("PUT",{message:"Demande d'import",content:b64e(J({id,type:"import",urls,at:new Date().toISOString()}))},sync.repo,"inbox/"+id+".json");
    if(!p.ok)throw{status:p.status};
  }catch(err){msg(err&&err.status?"Envoi impossible ("+err.status+") : vérifiez la synchro.":"Pas de connexion : réessayez quand le réseau revient.");return false;}
  imports.push(Object.assign({id,n:urls.length,at:Date.now()},assign&&assign.fr?{fr:true}:assign&&assign.replace?{replace:assign.replace}:assign?{assign}:{}));LS.set("cm_imports",imports);
  msg(`Le robot lit ${urls.length} recette${urls.length>1?"s":""}… environ une minute. Vous pouvez continuer à utiliser l'app.`);
  startImportPolling();return true;
}
$("#findForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(await sendImport($("#linksIn").value,importMsg))$("#linksIn").value="";
});
function startImportPolling(){if(!importTimer&&imports.length)importTimer=setInterval(pollImports,8000);}
async function pollImports(){
  if(!sync||!imports.length){clearInterval(importTimer);importTimer=null;return;}
  for(const job of[...imports]){
    if(Date.now()-job.at>8*60e3){imports=imports.filter(x=>x!==job);
      importMsg("Le robot n'a pas répondu. Vérifiez qu'il est installé dans le dépôt des données (fichier .github/workflows/recettes.yml).");if(job.assign)$("#pwMsg").textContent="✗ Le robot n'a pas répondu à temps. Réessayez un peu plus tard.";continue;}
    let g;try{g=await gh("GET",null,sync.repo,"results/"+job.id+".json");}catch(x){return;}
    if(g.status!==200)continue;
    let d;try{d=JSON.parse(b64d((await g.json()).content));}catch(x){continue;}
    imports=imports.filter(x=>x!==job);
    let added=0, firstId=null;
    for(const r of d.recipes||[]){
      if(!r||!r.name||!Array.isArray(r.ing))continue;
      if(job.replace&&recipes[job.replace]&&!added){const old=recipes[job.replace],n=Object.assign({},old,{name:String(r.name),time:Number(r.time)||old.time||0,serves:Number(r.serves)||4,
          ing:r.ing.map(i=>({q:Number(i.q)||0,u:UNITS.includes(i.u)?i.u:"pièce",n:String(i.n),r:RAYONS.includes(i.r)?i.r:"Divers"})),steps:String(r.steps||""),source:String(r.source||""),updatedAt:new Date().toISOString()});
        if(typeof r.image==="string"&&/^https:\/\//.test(r.image)){n.image=r.image;delete n.pick;delete n.photo;saveRPhoto(job.replace,null);}
        recipes[job.replace]=n;added++;firstId=job.replace;
        if(!$("#sheet").hidden&&editId===job.replace){openSheet(job.replace);$("#webMsg").textContent="✓ Recette remplacée : relisez puis « Enregistrer ».";}
        setTimeout(()=>toast("✓ « "+n.name+" » remplacée par la recette du web"),300);continue;}
      const same=Object.keys(recipes).find(k=>recipes[k].source&&recipes[k].source===r.source);
      const rid=same||((norm(r.name).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"recette")+"-"+Math.random().toString(36).slice(2,6));
      recipes[rid]={name:String(r.name),cat:CATS.includes(r.cat)?r.cat:"Plat",time:Number(r.time)||0,serves:Number(r.serves)||4,
        ing:r.ing.map(i=>({q:Number(i.q)||0,u:UNITS.includes(i.u)?i.u:"pièce",n:String(i.n),r:RAYONS.includes(i.r)?i.r:"Divers"})),
        steps:String(r.steps||""),source:String(r.source||""),createdAt:new Date().toISOString()};
      if(typeof r.image==="string"&&/^https:\/\//.test(r.image))recipes[rid].image=r.image; // the site's own photo of the dish
      added++; if(!firstId)firstId=rid;
    }
    if(firstId&&job.assign){const{w,k,role}=job.assign;menu.weeks=menu.weeks||{};const wk=menu.weeks[w]=menu.weeks[w]||{};
      if(role==="main"||!role)wk[k]=Object.assign({},wk[k]||{},{id:firstId,n:wk[k]&&wk[k].n||menu.people});else if(wk[k])wk[k][role]=firstId;
      if(role==="entree"&&!["Entrée","Soupe"].includes(recipes[firstId].cat))recipes[firstId].cat="Entrée";
      if(role==="dessert")recipes[firstId].cat="Dessert";
      saveMenu();
      if(!$("#pickSheet").hidden&&pickKey===k&&curWeek===w){$("#pickSheet").hidden=true;$("#pwMsg").textContent="";}
      if(curWeek===w)flashSlot(k);
      setTimeout(()=>toast("✓ "+recipes[firstId].name+" placée sur "+slotLabel(k)),300);}
    LS.set("cm_recipes",recipes);render();scheduleSync();
    const errs=(d.errors||[]).map(x=>{try{return new URL(x.url).hostname.replace(/^www\./,"")+" : "+x.msg;}catch(y){return x.msg;}});
    importMsg((added?`${added} recette${added>1?"s":""} ajoutée${added>1?"s":""} au carnet.`:"Aucune recette ajoutée.")+(errs.length?" Non importées : "+errs.join(" · "):""));
    if(added)toast(`${added} recette${added>1?"s":""} importée${added>1?"s":""}`);
    if(added&&job.fr&&$("#frIn").value.trim()){const m=$("#frWebMsg")&&$("#frWebMsg").textContent;runFridge();if($("#frWebMsg"))$("#frWebMsg").innerHTML=esc(m)+` <button type="button" class="link" data-act="viewRec" data-id="${esc(firstId)}">Voir « ${esc(recipes[firstId].name)} »</button>`;}
    if(job.replace&&!added){$("#webMsg").textContent="✗ Le robot n'a pas réussi à lire cette page"+(errs.length?" ("+errs.join(" · ")+")":"")+".";}
    if(job.assign&&!added){$("#pwMsg").textContent="✗ Le robot n'a pas réussi à lire cette page"+(errs.length?" ("+errs.join(" · ")+")":"")+". Essayez un autre lien.";}
  }
  LS.set("cm_imports",imports);
  if(!imports.length){clearInterval(importTimer);importTimer=null;}
}

// import window: the text area stays in view above the keyboard (the photo block folds away while typing)
["qi-text","qi-name"].forEach(id=>$("#"+id).addEventListener("focus",e=>{const t=e.target;[120,350,650].forEach(ms=>setTimeout(()=>{if(document.activeElement===t)t.scrollIntoView({block:"center",behavior:"auto"});},ms));}));
/* ---------- photo viewer: big photo + save it to the phone (share sheet → "Enregistrer l'image", or download) ---------- */
let pvName="recette";
function openPV(src,name){if(!src)return;pvName=String(name||"recette").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"recette";$("#pvImg").src=src;$("#photoView").hidden=false;}
async function pvSave(){const src=$("#pvImg").src;try{const bl=await(await fetch(src)).blob(),f=new File([bl],pvName+".jpg",{type:bl.type||"image/jpeg"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f]});return;}catch(e){if(e&&e.name==="AbortError")return;}}
    const u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);toast("Photo téléchargée");}
  catch(e){toast("Impossible d'enregistrer : restez appuyé sur la photo → « Enregistrer »");}}
