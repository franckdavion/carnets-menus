"use strict";
/* Maisonnée · Trajets associés aux enfants. Module supplémentaire indépendant
   des règles des présences. Les km restent PROPOSÉS jusqu'à validation. */
const PT = {
  month: today().slice(0,7), child:"", places:null, records:null,
  suggestions:[], loading:false, syncing:false, monthSynced:"",
  error:"", syncError:"", calculated:null
};
const ptEsc = s => esc(String(s == null ? "" : s));
const ptFmt = n => Number(n || 0).toLocaleString("fr-FR",{minimumFractionDigits:1,maximumFractionDigits:1});
const ptHome = () => (PT.places || []).find(x=>x.is_home);
const ptKey = r => r.calendar_id+"|"+r.event_id+"|"+r.child_id;
const ptMonthBounds = () => {
  const [y,m]=PT.month.split("-").map(Number);
  return [PRC.mFirst(y,m),PRC.mLast(y,m)];
};
const ptMonthText = () => new Date(PT.month+"-15T12:00:00").toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
const ptAuthorized = () => prOn() && !!PR.data && !!sb;
async function ptLoad(force=false) {
  if (!ptAuthorized() || PT.loading || (PT.places && !force)) return;
  PT.loading=true; PT.error="";
  try {
    const q=t=>sb.from(t).select("*").eq("household_id",S.hh.id);
    const [a,b]=await Promise.all([q("child_trip_places"),q("child_trips")]);
    if (a.error || b.error) throw new Error((a.error||b.error).message);
    PT.places=(a.data||[]).sort((a,b)=>Number(b.is_home)-Number(a.is_home)||a.label.localeCompare(b.label,"fr"));
    PT.records=(b.data||[]).sort((a,b)=>b.day.localeCompare(a.day));
  } catch(e){PT.error=e.message||"Chargement impossible";}
  finally {PT.loading=false;softRender();}
  if(PT.places && !PT.monthSynced) ptSync();
}
async function ptSync(force=false) {
  if (!ptAuthorized() || PT.syncing || !PT.places) return;
  const key=PT.month, cals=prSet().cals||[];
  if (!cals.length) {PT.syncError="Choisissez d'abord les agendas Google dans Enfants.";softRender();return;}
  if (!force && PT.monthSynced===key) return;
  PT.syncing=true; PT.syncError="";softRender();
  try {
    if (!(await gEnsure())) throw new Error("Connectez Google Agenda sur cet appareil.");
    const [from,to]=ptMonthBounds();
    const tMin=PRC.dAdd(from,-1)+"T21:00:00Z";
    const tMax=PRC.dAdd(to,1)+"T02:00:00Z";
    const found=[];
    for (const cal of cals) {
      let page="";
      do {
        const fields="items(id,status,summary,location,start,end,recurringEventId),nextPageToken";
        const url="calendars/"+encodeURIComponent(cal)+"/events?singleEvents=true&maxResults=2500&timeZone=Europe%2FParis&timeMin="+encodeURIComponent(tMin)+"&timeMax="+encodeURIComponent(tMax)+"&fields="+encodeURIComponent(fields)+(page?"&pageToken="+encodeURIComponent(page):"");
        const j=await prApi(url);
        found.push(...PRTR.make(j.items||[],cal,PR.data.children,PRC));
        page=j.nextPageToken||"";
      }while(page);
    }
    const confirmed=new Set((PT.records||[]).map(ptKey));
    PT.suggestions=found.filter(x=>x.day>=from&&x.day<=to&&!confirmed.has(x.key))
      .sort((a,b)=>a.day.localeCompare(b.day)||a.title.localeCompare(b.title,"fr"));
    PT.monthSynced=key;
  }catch(e){PT.syncError=e.message||"Synchronisation impossible";}
  finally{PT.syncing=false;softRender();}
}
function ptOptions(selected,includeOther=true) {
  const saved=(PT.places||[]).map(p=>'<option value="'+ptEsc(p.id)+'"'+(selected===p.id?' selected':'')+'>'+ptEsc(p.label)+'</option>').join("");
  return saved+(includeOther?'<option value="other"'+(selected==="other"?' selected':'')+'>Autre adresse (saisir ci-dessous)</option>':"");
}
function ptPlaceForm(place) {
  const isHome=place?place.is_home:!ptHome();
  const disabled=!!ptHome() && (!place || !place.is_home);
  openSheet(place?"Modifier le lieu":"Ajouter un lieu",'<form data-form="ptPlace">'+
    '<label class="field"><span class="label">Nom du lieu</span><input class="input" name="label" required maxlength="90" value="'+ptEsc(place?place.label:(isHome?"Domicile":""))+'" placeholder="Ex. Ping-pong"></label>'+
    '<label class="field"><span class="label">Adresse complète</span><input class="input" name="address" required maxlength="400" value="'+ptEsc(place?.address||"")+'" placeholder="Numéro, rue, code postal, ville"></label>'+
    '<label class="field"><span class="label">Abréviations Google Agenda (facultatif)</span><input class="input" name="keywords" maxlength="300" value="'+ptEsc(place?.keywords||"")+'" placeholder="Ex. PP, ping-pong"></label>'+
    '<label class="field"><input type="checkbox" name="is_home" '+(isHome?'checked':'')+' '+(disabled?'disabled':'')+'> Lieu de départ par défaut (domicile)</label>'+
    (disabled?'<p class="muted small">Pour changer le domicile, modifiez d’abord la fiche « Domicile ».</p>':'')+
    '<p class="muted small">Les coordonnées sont vérifiées avec le service public Géoplateforme. Vérifiez que l’adresse proposée est correcte.</p>'+
    '<div class="sheet-sticky btns"><button class="btn primary block" type="submit">Vérifier et enregistrer</button></div></form>',{ptPlace:place?.id||""});
}
async function ptGeo(address) {
  const q=String(address||"").trim();
  if(q.length<5)throw new Error("Renseignez une adresse complète.");
  const r=await fetch("https://data.geopf.fr/geocodage/search?index=address&q="+encodeURIComponent(q)+"&limit=3",{cache:"no-store"});
  if(!r.ok)throw new Error("Le service de recherche d'adresse est momentanément indisponible.");
  const j=await r.json(), features=(j.features||[]).filter(f=>Array.isArray(f.geometry?.coordinates)&&f.geometry.coordinates.length===2);
  const f=features[0];
  if(!f)throw new Error("Adresse introuvable. Indiquez la rue, le code postal et la commune.");
  if(f.properties?.score!=null&&Number(f.properties.score)<0.45)throw new Error("Adresse trop imprécise : complétez-la.");
  return {lon:+f.geometry.coordinates[0],lat:+f.geometry.coordinates[1],label:f.properties?.label||q};
}
async function ptSavePlace(form) {
  const fd=new FormData(form), id=sheetCtx?.ptPlace;
  const label=String(fd.get("label")||"").trim(),address=String(fd.get("address")||"").trim(),keywords=String(fd.get("keywords")||"").trim();
  if(!label||!address){toast("Indiquez le nom et l'adresse.");return;}
  const is_home=fd.has("is_home");
  if(is_home&&ptHome()&&ptHome().id!==id){toast("Modifiez le domicile existant.");return;}
  const btn=form.querySelector("[type=submit]");if(btn)btn.disabled=true;
  try{
    const coords=await ptGeo(address);
    const ok=confirm("Adresse trouvée : "+coords.label+"\n\nEst-ce bien ce lieu ?");
    if(!ok)return;
    const row={household_id:S.hh.id,label,address:coords.label,keywords,is_home,longitude:coords.lon,latitude:coords.lat};
    const q=id?sb.from("child_trip_places").update(row).eq("id",id).eq("household_id",S.hh.id):sb.from("child_trip_places").insert(row);
    const {error}=await q;
    if(error)throw error;
    closeSheet();await ptLoad(true);toast("Lieu enregistré.");
  }catch(e){toast("Lieu non enregistré : "+e.message);}
  finally{if(btn&&btn.isConnected)btn.disabled=false;}
}
const ptPlaceById = id => (PT.places||[]).find(p=>p.id===id);
function ptTripForm(ev){
  const home=ptHome(), auto=PRTR.placeFor(ev,PT.places||[]);
  const match=(PT.places||[]).find(p=>ev.location&&PRTR.norm(p.address)===PRTR.norm(ev.location));
  const dst=auto||match;
  const child=prChild(ev.child_id);
  PT.calculated=null;
  openSheet("Trajet · "+(child?.first_name||"Enfant"),'<div class="card"><strong>'+ptEsc(ev.title)+'</strong><small>'+ptEsc(prDL(ev.day))+'</small></div>'+
    '<form data-form="ptTrip">'+
    '<label class="field"><span class="label">Départ (domicile par défaut)</span><select class="input" name="origin">'+ptOptions(home?.id||"other")+'</select></label>'+
    '<label class="field"><span class="label">Autre départ, si sélectionné</span><input class="input" name="origin_text" placeholder="Adresse de départ"></label>'+
    '<label class="field"><span class="label">Destination</span><select class="input" name="destination">'+
    (ev.location?'<option value="google"'+(!dst?' selected':'')+'>Adresse du rendez-vous Google</option>':"")+
    ptOptions(dst?.id||(!ev.location?"other":"google"))+'</select></label>'+
    '<label class="field"><span class="label">Autre destination, si sélectionnée</span><input class="input" name="destination_text" placeholder="Adresse du lieu"></label>'+
    (ev.location?'<p class="muted small">Google Agenda : '+ptEsc(ev.location)+'</p>':'')+
    '<label class="field"><span class="label">Type de déplacement</span><select class="input" name="trip_mode">'+
    [['four','Deux allers-retours (déposer puis rechercher)'],['round','Un aller-retour'],['one','Aller simple'],['custom','Retour à une autre adresse']].map(([value,label])=>'<option value="'+value+'"'+(ev.mode===value?' selected':'')+'>'+label+'</option>').join("")+
    '</select></label>'+
    '<label class="field"><span class="label">Lieu de retour (uniquement pour le mode personnalisé)</span><select class="input" name="return_to">'+ptOptions(home?.id||"other")+'</select></label>'+
    '<label class="field"><span class="label">Autre adresse de retour, si sélectionnée</span><input class="input" name="return_text" placeholder="Adresse du retour"></label>'+
    '<div class="pr-note">Les trajets scolaires ne sont jamais proposés. Les kilomètres restent une estimation tant que vous ne les avez pas validés.</div>'+
    '<div id="ptDistance" class="pr-note">Aucune distance calculée.</div>'+
    '<div class="btns"><button type="button" class="btn" data-act="ptCalc">Calculer les kilomètres</button></div>'+
    '<div class="sheet-sticky btns"><button class="btn primary block" type="submit" '+(ev.day>today()?'disabled':'')+'>Confirmer le déplacement effectué</button></div>'+
    (ev.day>today()?'<p class="muted small">La confirmation sera possible le jour du rendez-vous ou après.</p>':'')+
    '</form>',{ptTrip:ev.key});
}
function ptFields(form){
  return Object.fromEntries(new FormData(form).entries());
}
function ptSelected(key,manual){
  if(key==="google")return {label:PT.current?.location||"",coords:null};
  if(key==="other")return {label:String(manual||"").trim(),coords:null};
  const p=ptPlaceById(key);
  if(!p)throw new Error("Sélectionnez un lieu valide.");
  return {label:p.label+" — "+p.address,coords: Number.isFinite(p.longitude)&&Number.isFinite(p.latitude)?{lon:p.longitude,lat:p.latitude}:null};
}
async function ptCoordinates(place) {
  if(place.coords)return place.coords;
  const r=await ptGeo(place.label);
  return {lon:r.lon,lat:r.lat};
}
async function ptRoute(a,b){
  const params=new URLSearchParams({resource:"bdtopo-osrm",start:a.lon+","+a.lat,end:b.lon+","+b.lat,
    profile:"car",optimization:"fastest",distanceUnit:"kilometer",timeUnit:"minute",crs:"EPSG:4326"});
  const r=await fetch("https://data.geopf.fr/navigation/itineraire?"+params.toString(),{cache:"no-store"});
  if(!r.ok)throw new Error("Calcul routier indisponible ("+r.status+").");
  const j=await r.json(),d=Number(j.distance);
  if(!Number.isFinite(d)||d<0)throw new Error("Distance routière non disponible pour ces adresses.");
  return d;
}
async function ptCalculate(){
  const form=document.querySelector("#sheetIn form[data-form=ptTrip]");
  if(!form||!sheetCtx?.ptTrip)return;
  const ev=PT.suggestions.find(x=>x.key===sheetCtx.ptTrip);if(!ev)return;
  PT.current=ev;
  const f=ptFields(form), panel=document.querySelector("#ptDistance");
  PT.calculated=null;panel.textContent="Calcul en cours…";
  try{
    const from=ptSelected(f.origin,f.origin_text),to=ptSelected(f.destination,f.destination_text);
    const back=ptSelected(f.return_to,f.return_text);
    if(!from.label||!to.label)throw new Error("Indiquez l’adresse de départ et celle d’arrivée.");
    if(f.trip_mode==="custom"&&!back.label)throw new Error("Indiquez le lieu de retour.");
    const locs=PRTR.legs(f.trip_mode,from,to,back);
    const coords=new Map();
    for(const pair of locs)for(const place of pair)if(!coords.has(place.label))coords.set(place.label,await ptCoordinates(place));
    const cache=new Map(),done=[];
    for(const [a,b] of locs){
      const key=a.label+"⇒"+b.label;
      if(!cache.has(key))cache.set(key,await ptRoute(coords.get(a.label),coords.get(b.label)));
      done.push({from:a.label,to:b.label,km:Math.round(cache.get(key)*10)/10});
    }
    const km=PRTR.total(done.map(x=>x.km));
    if(km<=0)throw new Error("La distance est nulle. Vérifiez les adresses.");
    PT.calculated={key:ev.key,signature:JSON.stringify(f),km,done,from:from.label,to:to.label,back:back.label,mode:f.trip_mode};
    panel.textContent=done.map(x=>x.from+" → "+x.to+" : "+ptFmt(x.km)+" km").join(" · ")+" | Total estimé : "+ptFmt(km)+" km";
  }catch(e){panel.textContent="Calcul impossible : "+e.message;}
}
async function ptSaveTrip(form) {
  const ev=PT.suggestions.find(x=>x.key===sheetCtx?.ptTrip),calc=PT.calculated;
  if(!ev||!calc||calc.key!==ev.key||calc.signature!==JSON.stringify(ptFields(form))){
    toast("Calculez d’abord les kilomètres pour ce trajet.");return;
  }
  if(ev.day>today()){toast("Impossible de confirmer un trajet futur.");return;}
  const row={
    household_id:S.hh.id,child_id:ev.child_id,calendar_id:ev.calendar,event_id:ev.event_id,
    day:ev.day,title:ev.title,category:ev.kind,
    origin_label:calc.from,destination_label:calc.to,return_label:calc.back,
    trip_mode:calc.mode,calculated_km:calc.km,distance_km:calc.km,legs:calc.done
  };
  const btn=form.querySelector('[type="submit"]');if(btn)btn.disabled=true;
  try{
    const {error}=await sb.from("child_trips").upsert(row,{onConflict:"household_id,child_id,calendar_id,event_id"});
    if(error)throw error;
    PT.calculated=null;closeSheet();await ptLoad(true);
    PT.suggestions=PT.suggestions.filter(x=>x.key!==ev.key);softRender();toast("Trajet confirmé et conservé dans l’historique.");
  }catch(e){toast("Trajet non enregistré : "+e.message);}
  finally{if(btn&&btn.isConnected)btn.disabled=false;}
}
function ptEditSheet(id){
  const row=(PT.records||[]).find(x=>x.id===id);if(!row)return;
  openSheet("Corriger le kilométrage",'<form data-form="ptEdit">'+
    '<p><strong>'+ptEsc(row.title)+'</strong> · '+ptEsc(prD(row.day))+'</p>'+
    '<p class="muted small">Distance calculée initialement : '+ptFmt(row.calculated_km)+' km. Une correction ne modifie pas les événements Google.</p>'+
    '<label class="field"><span class="label">Kilomètres réellement parcourus</span><input class="input" name="distance" type="number" min="0" max="99999" step="0.1" required value="'+Number(row.distance_km)+'"></label>'+
    '<div class="sheet-sticky btns"><button class="btn primary block" type="submit">Enregistrer la correction</button></div>'+
    '</form><div class="btns"><button class="btn" data-act="ptDelete" data-v="'+ptEsc(id)+'">Supprimer ce trajet confirmé</button></div>',{ptEdit:id});
}
async function ptEditSave(form){
  const id=sheetCtx?.ptEdit,km=Number(new FormData(form).get("distance"));
  if(!id||!Number.isFinite(km)||km<0||km>99999)return toast("Distance non valide.");
  const {error}=await sb.from("child_trips").update({distance_km:Math.round(km*10)/10}).eq("id",id).eq("household_id",S.hh.id);
  if(error)return toast(error.message);
  closeSheet();await ptLoad(true);toast("Kilométrage mis à jour.");
}
async function ptDelete(id){
  const rec=(PT.records||[]).find(x=>x.id===id);
  if(!rec||!confirm("Supprimer définitivement ce trajet de l’historique ?"))return;
  const {error}=await sb.from("child_trips").delete().eq("id",id).eq("household_id",S.hh.id);
  if(error)return toast(error.message);
  closeSheet();await ptLoad(true);PT.monthSynced="";ptSync(true);toast("Trajet supprimé.");
}
function ptExport(){
  const [from,to]=ptMonthBounds();
  const records=(PT.records||[]).filter(x=>x.day>=from&&x.day<=to&&(!PT.child||x.child_id===PT.child));
  const csv=rows=>rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
  const lines=[["Date","Enfant","Motif","Départ","Destination","Retour","Type","Calculé (km)","Retenu (km)"]];
  for(const r of records)lines.push([prD(r.day),prChild(r.child_id)?.first_name||"",r.title,r.origin_label,r.destination_label,r.return_label,r.trip_mode,ptFmt(r.calculated_km),ptFmt(r.distance_km)]);
  lines.push(["TOTAL","","","","","","","",ptFmt(records.reduce((s,r)=>s+Number(r.distance_km),0))]);
  prDeliver(new Blob(["\uFEFF"+csv(lines)],{type:"text/csv;charset=utf-8"}),"Trajets-enfants-"+PT.month+".csv");
}
function ptTripsView(){
  if(!ptAuthorized())return '<div class="pr-panel">Trajets disponibles après connexion au foyer.</div>';
  if(!PT.places&&!PT.loading&&!PT.error)ptLoad();
  if(PT.loading||!PT.places)return '<section class="pr-panel"><h2 class="pr-h">Trajets des enfants</h2><p class="muted">'+ptEsc(PT.error||"Chargement des lieux et de l’historique…")+'</p>'+(PT.error?'<button class="btn" data-act="ptReload">Réessayer</button>':"")+'</section>';
  const [from,to]=ptMonthBounds(),kids=PR.data.children,rec=(PT.records||[]).filter(x=>x.day>=from&&x.day<=to&&(!PT.child||x.child_id===PT.child));
  const suggestions=PT.suggestions.filter(x=>!PT.child||x.child_id===PT.child);
  const total=rec.reduce((s,r)=>s+Number(r.distance_km||0),0);
  const byKid=kids.filter(c=>rec.some(r=>r.child_id===c.id)).map(c=>'<span class="pr-word">'+ptEsc(c.first_name)+' : '+ptFmt(rec.filter(r=>r.child_id===c.id).reduce((s,r)=>s+Number(r.distance_km),0))+' km</span>').join(" ");
  const header='<div class="pr-head"><button class="pr-arrow" data-act="ptMonth" data-v="-1" aria-label="Mois précédent">‹</button><h2 class="pr-title static">Trajets · '+ptEsc(ptMonthText())+'</h2><button class="pr-arrow" data-act="ptMonth" data-v="1" aria-label="Mois suivant">›</button></div>';
  const places='<section class="pr-panel"><h2 class="pr-h">Lieux habituels</h2>'+
    '<p class="muted small">Domicile par défaut, mais départ et retour modifiables pour chaque trajet. Les trajets vers l’école sont exclus.</p>'+
    (PT.places||[]).map(p=>'<button class="pr-krow" data-act="ptPlaceEdit" data-v="'+ptEsc(p.id)+'"><span class="pr-kn"><b>'+ptEsc(p.is_home?"Domicile · "+p.label:p.label)+'</b><small>'+ptEsc(p.address)+(p.keywords?' · Google : '+ptEsc(p.keywords):'')+'</small></span>›</button>').join("")+
    '<button class="btn" data-act="ptPlaceNew">+ Ajouter un lieu</button></section>';
  const suggestBlock='<section class="pr-panel"><h2 class="pr-h">À vérifier · '+suggestions.length+' déplacement(s)</h2>'+
    '<p class="muted small">'+(PT.syncing?"Lecture des rendez-vous Google…":PT.syncError?"Google : "+ptEsc(PT.syncError):"Rendez-vous liés à un seul enfant ; aucun trajet scolaire n’est proposé.")+'</p>'+
    (suggestions.length?suggestions.map(x=>'<button class="pr-krow" data-act="ptTrip" data-v="'+ptEsc(x.key)+'"><span class="pr-kn"><b>'+ptEsc(x.title)+'</b><small>'+ptEsc(prD(x.day))+' · '+ptEsc(prChild(x.child_id)?.first_name||"")+' · '+(x.mode==="four"?"2 allers-retours":"Aller-retour")+(x.location?' · '+ptEsc(x.location):'')+'</small></span>›</button>').join(""):'<p class="muted small">Aucune proposition pour ce mois, ou tous les trajets sont déjà confirmés.</p>')+
    '<button class="btn" data-act="ptSync"'+(PT.syncing?' disabled':'')+'>↻ Relire Google Agenda</button></section>';
  const history='<section class="pr-panel"><h2 class="pr-h">Trajets confirmés · '+rec.length+'</h2>'+byKid+
    (rec.length?rec.map(x=>'<button class="pr-krow" data-act="ptEdit" data-v="'+ptEsc(x.id)+'"><span class="pr-kn"><b>'+ptEsc(x.title)+'</b><small>'+ptEsc(prD(x.day))+' · '+ptEsc(prChild(x.child_id)?.first_name||"")+' · '+ptEsc(x.origin_label)+' → '+ptEsc(x.destination_label)+'</small></span><strong>'+ptFmt(x.distance_km)+' km</strong></button>').join(""):'<p class="muted small">Aucun déplacement confirmé sur cette période.</p>')+
    '<button class="btn" data-act="ptExport">Exporter le mois (Excel / CSV)</button></section>';
  return '<div class="pr pt">'+header+
    '<section class="pr-panel"><div class="pr-bilan"><div><b>'+ptFmt(total)+' km</b><small>Confirmés</small></div><div><b>'+rec.length+'</b><small>Trajets effectués</small></div><div><b>'+suggestions.length+'</b><small>À vérifier</small></div></div>'+
    '<label class="field"><span class="label">Filtrer les enfants</span><select class="input" data-pt-child><option value="">Tous les enfants</option>'+kids.map(c=>'<option value="'+ptEsc(c.id)+'"'+(PT.child===c.id?' selected':'')+'>'+ptEsc(c.first_name)+'</option>').join("")+'</select></label></section>'+
    (!ptHome()?'<section class="pr-panel"><p class="pr-note warn"><b>Première étape :</b> ajoutez le domicile pour calculer vos trajets.</p><button class="btn primary" data-act="ptPlaceNew">Configurer le domicile</button></section>':"")+
    suggestBlock+history+places+'</div>';
}
document.addEventListener("click",async e=>{
  const b=e.target.closest('[data-act^="pt"]');if(!b)return;
  const a=b.dataset.act,v=b.dataset.v;
  if(a==="ptMonth"){
    const [y,m]=PT.month.split("-").map(Number),d=new Date(Date.UTC(y,m-1+Number(v),15));
    PT.month=d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0");PT.monthSynced="";PT.suggestions=[];softRender();ptSync(true);
  }else if(a==="ptReload")ptLoad(true);
  else if(a==="ptSync")ptSync(true);
  else if(a==="ptPlaceNew")ptPlaceForm(null);
  else if(a==="ptPlaceEdit")ptPlaceForm(ptPlaceById(v));
  else if(a==="ptTrip"){const ev=PT.suggestions.find(x=>x.key===v);if(ev)ptTripForm(ev);}
  else if(a==="ptCalc")ptCalculate();
  else if(a==="ptEdit")ptEditSheet(v);
  else if(a==="ptDelete")ptDelete(v);
  else if(a==="ptExport")ptExport();
});
document.addEventListener("change",e=>{
  if(e.target.matches("[data-pt-child]")){PT.child=e.target.value;softRender();}
  if(e.target.closest('form[data-form="ptTrip"]'))PT.calculated=null;
});
document.addEventListener("input",e=>{
  if(e.target.closest('form[data-form="ptTrip"]'))PT.calculated=null;
});
document.addEventListener("submit",async e=>{
  const f=e.target.closest('form[data-form^="pt"]');if(!f)return;e.preventDefault();
  if(f.dataset.form==="ptPlace")await ptSavePlace(f);
  else if(f.dataset.form==="ptTrip")await ptSaveTrip(f);
  else if(f.dataset.form==="ptEdit")await ptEditSave(f);
});
