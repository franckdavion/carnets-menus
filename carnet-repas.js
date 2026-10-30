/* ---------- what we ate in addition (history only, never in the shopping list) ---------- */
const SIDES=[
 ["Charcuterie",["Pâté","Jambon","Saucisson","Rillettes","Terrine","Jambon cru","Chorizo"]],
 ["Fromages & laitages",["Fromage","Camembert","Comté","Chèvre","Yaourt","Fromage blanc","Petit-suisse"]],
 ["Accompagnements",["Pain","Salade verte","Crudités","Soupe","Cornichons","Chips","Frites","Œuf"]],
 ["Sucré",["Fruit","Compote","Chocolat","Glace","Gâteau","Biscuits","Crème dessert","Pâtisserie"]],
 ["Boissons",["Vin","Bière","Jus de fruits","Soda","Apéritif"]],
];
let sideKey=null;
function extrasHtml(k,s,edit){
  const xs=(s&&s.extra)||[];
  if(!xs.length)return edit?"":(isPast(k)&&s&&s.id?`<span class="extras"><button class="link" data-act="openSide" data-k="${k}">+ En plus</button></span>`:"");
  return`<div class="extras">En plus : ${xs.map((x,ix)=>`<span class="xchip">${esc(x)}<button type="button" data-act="rmSide" data-k="${k}" data-i="${ix}" aria-label="Retirer ${esc(x)}">✕</button></span>`).join("")}${edit?"":`<button class="link" data-act="openSide" data-k="${k}">+ Ajouter</button>`}</div>`;
}
function renderSide(){
  const s=W()[sideKey]; if(!s){$("#sideSheet").hidden=true;return;}
  $("#sideTitle").textContent="En plus · "+slotLabel(sideKey);
  const cur=s.extra||[], has=t=>cur.some(x=>norm(x)===norm(t));
  const chip=(t,own)=>`<span class="dchip${has(t)?" on":""}"><button type="button" data-act="sideToggle" data-t="${esc(t)}" aria-pressed="${has(t)}">${has(t)?"✓ ":""}${esc(t)}</button>${own?`<button type="button" class="rm" data-act="sideForget" data-t="${esc(t)}" aria-label="Supprimer ${esc(t)} de mes ajouts">✕</button>`:""}</span>`;
  const mine=menu.sides||[];
  $("#sideList").innerHTML=(mine.length?`<div class="field"><span class="label">Mes ajouts</span><div class="dchips">${mine.map(t=>chip(t,true)).join("")}</div></div>`:"")
    +SIDES.map(([g,its])=>`<div class="field"><span class="label">${esc(g)}</span><div class="dchips">${its.map(t=>chip(t,false)).join("")}</div>${g==="Boissons"?wineSideHtml():""}</div>`).join("");
}
function wineSideHtml(){
  const ws=wineFor(sideKey), drank=(W()[sideKey].extra||[]).some(x=>/^(vin|bière|apéritif)$/i.test(x));
  return`<div class="wine-side">${ws.map(w=>`<button type="button" class="wine-chip" data-act="wineOpen" data-id="${w.id}">${w.color==="bière"?"🍺":"🍷"} ${esc(wineLabel(w))} ›</button>`).join("")}
    ${drank||ws.length?`<div class="row"><button type="button" class="btn" data-act="wineNew">📷 Noter le vin bu</button><button type="button" class="btn" data-act="wineNew" data-beer="1">📷 Noter la bière</button></div>`:`<span class="muted" style="font-size:12px">Touchez Vin ou Bière pour pouvoir noter ce que vous avez bu.</span>`}</div>`;
}
function toggleSide(t){const s=W()[sideKey];if(!s)return;const xs=s.extra||[];const i=xs.findIndex(x=>norm(x)===norm(t));
  if(i>=0)xs.splice(i,1);else xs.push(t);
  if(xs.length)s.extra=xs;else delete s.extra;}
$("#sideForm").addEventListener("submit",e=>{e.preventDefault();const v=$("#sideIn").value.trim();if(!v||!W()[sideKey])return;
  const known=[...(menu.sides||[]),...SIDES.flatMap(x=>x[1])];
  if(!known.some(t=>norm(t)===norm(v)))menu.sides=[...(menu.sides||[]),v];
  const s=W()[sideKey];if(!(s.extra||[]).some(x=>norm(x)===norm(v)))s.extra=[...(s.extra||[]),v];
  $("#sideIn").value="";render();renderSide();saveMenu();});

/* ---------- propose only some days ---------- */
let pickDays=[], pickMeals=["midi","soir"];
function renderDays(){
  const ws=weekStartDate();
  $("#daysPick").innerHTML=DAYS.map((d,i)=>{const past=isPast(slotKey(d,"soir")),on=pickDays.includes(d);
    return`<span class="dchip${on?" on":""}"${past?' style="opacity:.45"':""}><button type="button" data-act="dayToggle" data-d="${d}" aria-pressed="${on}" ${past?"disabled":""}>${on?"✓ ":""}${d} ${addDays(ws,i).getDate()}</button></span>`;}).join("");
  $("#mealsPick").innerHTML=MEALS.map(([m,l])=>{const on=pickMeals.includes(m);return`<span class="dchip${on?" on":""}"><button type="button" data-act="mealToggle" data-m="${m}" aria-pressed="${on}">${on?"✓ ":""}${l}</button></span>`;}).join("");
  const n=pickDays.length, both=pickMeals.length===2, ok=n&&pickMeals.length;
  $("#proposeDaysBtn").disabled=!ok;
  $("#proposeDaysBtn").textContent=!n?"Choisissez au moins un jour":!pickMeals.length?"Choisissez midi, soir ou les deux":`Proposer ${both?"":pickMeals[0]==="midi"?"les midis ":"les soirs "}pour ${n} jour${n>1?"s":""}`;
}

/* ---------- meal history: a month calendar of what was on the menu ---------- */
let histMonth=null, histSel=null;
function mealsOn(date){
  const wk=(menu.weeks||{})[ymd(mondayOf(date))]; if(!wk)return[];
  const dn=DAYS[(date.getDay()+6)%7];
  return MEALS.map(([m,l])=>{const k=slotKey(dn,m),s=wk[k],r=s&&recipes[s.id];return r?{l,r,s,k,w:ymd(mondayOf(date))}:null;}).filter(Boolean);
}
function renderHist(){
  const t=new Date(), m0=histMonth||new Date(t.getFullYear(),t.getMonth(),1);histMonth=m0;
  $("#histTitle").textContent=m0.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  const first=mondayOf(m0), cells=[];
  for(let i=0;i<42;i++){const d=addDays(first,i);if(i>=35&&d.getMonth()!==m0.getMonth())break;cells.push(d);}
  const sel=histSel||ymd(t);
  $("#histCal").innerHTML=["L","M","M","J","V","S","D"].map(x=>`<span class="wd">${x}</span>`).join("")+cells.map(d=>{const out=d.getMonth()!==m0.getMonth(),k=ymd(d),has=mealsOn(d).length;
    return`<button type="button" data-act="histDay" data-d="${k}" class="${has?"has":""}${k===ymd(t)?" today":""}${k===sel?" sel":""}" ${out?"disabled":""}>${d.getDate()}<span class="pt"></span></button>`;}).join("");
  const sd=parseYmd(sel), ms=mealsOn(sd);
  $("#histDay").innerHTML=`<div class="hday"><strong style="text-transform:capitalize">${esc(sd.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}))}</strong>`+
    (ms.length?ms.map(({l,r,s,k,w})=>`<div class="hmeal"><span class="meal">${l}</span><button type="button" class="link dish" data-act="viewRec" data-id="${esc(s.id)}">${esc(r.name)}</button>
      ${["entree","dessert"].filter(c=>s[c]&&recipes[s[c]]).map(c=>`<span class="sub">${c==="entree"?"Entrée":"Dessert"} : ${esc(recipes[s[c]].name)}</span>`).join("")}
      ${s.extra&&s.extra.length?`<span class="sub">En plus : ${esc(s.extra.join(", "))}</span>`:""}${wineFor(k,w).map(x=>`<button type="button" class="link" data-act="wineOpen" data-id="${x.id}" style="display:block;text-align:left">${x.color==="bière"?"🍺":"🍷"} ${esc(wineLabel(x))}${x.grapes?" ("+esc(x.grapes)+")":""}</button>`).join("")}<span class="sub">${s.n} pers. · ${esc(fmtNut(slotNut(s),true))}</span></div>`).join("")+`<span class="day-nut">Journée : ${esc(fmtNut(sumNut(ms.map(x=>slotNut(x.s)))))} / pers.</span>`
      :'<span class="muted" style="font-size:14px">Aucun repas noté ce jour-là.</span>')+`</div>`;
}

/* ---------- calories and carbs: rough estimate from average values per 100 g ---------- */
// [pattern, kcal/100 g, carbs g/100 g, grams for one piece/slice/tin/bunch/sachet]
const NUT=[
 [/foie gras/,460,2],[/saint-jacques/,90,3,30],[/huîtres?/,70,4,15],[/chapon/,230,0,2200],[/magret/,300,0,350],[/gigot/,200,0],[/crème de marrons/,270,60],[/(marrons|châtaignes)(?! glacés)/,200,40],[/marrons glacés/,320,75,20],[/figues?/,75,16,50],[/pamplemousse/,40,9,300],[/porto|rhum/,160,12],[/meringues?/,390,95,15],[/blinis/,230,40,15],[/boudoirs/,390,80,6],[/glace (vanille|chocolat|café|à)|sorbet/,180,28],[/fruits rouges/,45,8],
 [/^(riz complet)/,350,72],[/riz/,350,77],[/pâtes complètes/,340,62],[/(pâtes|spaghetti|lasagne|crozets|nouilles|coquillettes|tagliatelle|macaroni|penne)/,355,70],
 [/semoule/,360,72],[/boulgour/,350,70],[/quinoa/,370,64],[/lentilles.*cuites/,115,16,265],[/lentilles/,330,50],
 [/pois chiches/,140,17,265],[/haricots rouges/,115,15,265],[/haricots blancs/,100,13,265],[/haricots verts/,30,4],[/petits pois/,80,10],[/maïs/,85,15,285],
 [/maïzena|fécule/,380,88],[/farine/,360,74],[/patates? douces?/,86,20,300],[/pommes? de terre/,80,17,150],
 [/pain de mie/,265,48,25],[/baguette/,270,55,250],[/pain/,250,49,400],[/croûtons/,420,65,75],[/tortilla/,300,50,40],
 [/pâte brisée|pâte feuilletée/,400,45,230],[/pâte sablée/,450,55,230],[/sucre vanillé/,400,100,7.5],[/sucre/,400,100],[/miel/,320,80],
 [/chocolat/,550,35],[/cacao/,360,12],[/levure/,100,25,11],[/confiture/,250,60],
 [/beurre/,745,0.5],[/crème légère/,120,4],[/crème/,300,3],[/lait de coco léger/,80,2],[/lait de coco/,180,3],[/lait/,46,4.8],
 [/fromage frais|ricotta|mascarpone/,230,3],[/yaourt grec|skyr/,110,4],[/yaourt/,60,5,125],[/fromage blanc/,75,4],
 [/(gruyère|emmental|comté|cheddar)/,400,0.5,20],[/parmesan/,400,0],[/mozzarella/,250,1,125],[/feta/,270,1],[/reblochon/,330,0,450],[/raclette|camembert|chèvre/,320,0.5],
 [/œufs?|oeufs?/,140,1,55],
 [/poulet entier/,170,0,1200],[/cuisses? de poulet/,190,0,220],[/(blancs? de poulet|escalopes? de dinde|dinde|poulet)/,110,0,120],
 [/haché 5/,130,0],[/haché/,250,0],[/(bœuf|boeuf|veau|agneau)/,150,0],[/lardons/,300,0],[/jambon/,115,1,40],[/(saucisse|chorizo|merguez)/,300,1,60],
 [/saumon fumé/,180,0],[/saumon/,200,0,125],[/(cabillaud|colin|merlu|lieu|poisson)/,80,0,130],[/crevettes/,90,0],[/thon/,110,0,140],[/anchois/,200,0,50],
 [/graines/,570,5],[/carottes?/,40,7.5,100],[/courgettes?/,17,2,200],[/aubergines?/,25,3,300],[/poivrons?/,30,5,180],[/tomates? cerises?/,20,3],[/tomates? concassées|pulpe/,25,4,400],
 [/coulis|sauce tomate/,30,5],[/tomates?/,18,3,130],[/oignons? nouveaux/,30,5,100],[/oignons?/,40,8,120],[/échalotes?/,70,15,30],[/ail/,140,30,5],
 [/champignons?/,25,1],[/brocolis?/,35,4,400],[/chou-fleur/,25,3,800],[/chou/,25,4,800],[/épinards|pousses/,25,1.5],[/poireaux?/,30,5,200],[/navets?/,25,4,150],
 [/(potiron|butternut|courge)/,30,6,1000],[/betteraves?/,45,8,150],[/(salade|laitues?|mâche|roquette)/,15,1.5,300],[/concombres?/,15,2.5,300],[/avocats?/,200,2,150],
 [/citrons?/,30,3,100],[/pommes?/,52,12,150],[/bananes?/,90,20,120],[/(persil|ciboulette|basilic|menthe|aneth|coriandre|thym)/,40,5,30],[/gingembre/,80,15,30],
 [/huile/,900,0,13],[/olives?/,300,2],[/pesto/,450,5,190],[/(noix|noisettes|pécan|pignons|amande|cajou)/,650,8],[/coco râpée/,650,7],
 [/mayonnaise/,700,1],[/moutarde/,150,5],[/sauce soja/,60,6],[/sauce césar/,450,5],[/vinaigre/,20,1],[/bouillon/,250,30,10],[/pâte de curry/,150,15],[/vin/,35,2],
 [/(cumin|curry|paprika|cannelle|muscade|poivre|piment|herbes|sel|épices|vanille|baies)/,0,0,1],
];
// a portion of each "En plus": [kcal, carbs g]
const SIDE_NUT={"pâté":[160,1],"jambon":[45,0.5],"saucisson":[120,0.5],"rillettes":[180,0],"terrine":[130,1],"jambon cru":[75,0],"chorizo":[135,1],
 "fromage":[110,0],"camembert":[85,0],"comté":[125,0],"chèvre":[90,0.5],"yaourt":[75,6],"fromage blanc":[75,4],"petit-suisse":[80,3],
 "pain":[135,28],"salade verte":[50,2],"crudités":[70,6],"soupe":[100,12],"cornichons":[10,1],"chips":[160,15],"frites":[400,45],"œuf":[75,0.5],
 "fruit":[70,16],"compote":[70,16],"chocolat":[110,9],"glace":[200,25],"gâteau":[300,35],"biscuits":[130,18],"crème dessert":[140,22],"pâtisserie":[350,40],
 "vin":[85,1],"bière":[105,9],"jus de fruits":[90,20],"soda":[140,35],"apéritif":[120,8]};
function ingGrams(i,row){
  const q=Number(i.q)||0, u=i.u||"", piece=row[3]||100;
  if(u==="g")return q; if(u==="kg")return q*1000; if(u==="cl")return q*10; if(u==="ml")return q; if(u==="l")return q*1000;
  if(u==="c. à s.")return q*(row[3]===13?13:15); if(u==="c. à c.")return q*5; if(u==="pincée")return q*0.5;
  if(u==="boîte")return q*(row[3]||400); if(u==="botte")return q*(row[3]||30); if(u==="sachet")return q*(row[3]||10);
  return q*piece; // pièce, tranche, empty
}
const nutCache=new WeakMap();
function nutri(r){ // per person: {k: kcal, g: carbs, part: some ingredient unknown}
  if(!r)return null; if(nutCache.has(r))return nutCache.get(r);
  if(!(r.ing||[]).length){const z={k:0,g:0,part:true,none:true};nutCache.set(r,z);return z;}
  let k=0,g=0,part=false;
  for(const i of r.ing||[]){const n=norm(i.n);if(!n)continue;const row=NUT.find(x=>x[0].test(n));
    if(!row){part=true;continue;} const gr=ingGrams(i,row)/100; k+=gr*row[1]; g+=gr*row[2];}
  const s=r.serves||4, res={k:k/s,g:g/s,part};
  nutCache.set(r,res); return res;
}
function slotNut(s){ // a whole meal for one person: dish + starter + dessert + extras
  if(!s)return null; let k=0,g=0,part=false,any=false;
  for(const [id,role] of [[s.id,"main"],[s.entree,"entree"],[s.dessert,"dessert"]]){const r=id&&recipes[id];if(!r)continue;const n0=nutri(r),f=portionFactor(r,role),n={k:n0.k*f,g:n0.g*f,part:n0.part};k+=n.k;g+=n.g;part=part||n.part;any=true;}
  for(const x of s.extra||[]){const v=SIDE_NUT[norm(x)];if(v){k+=v[0];g+=v[1];}else part=true;}
  return any?{k,g,part}:null;
}
function sumNut(list){const ns=list.filter(Boolean);return ns.length?{k:ns.reduce((a,n)=>a+n.k,0),g:ns.reduce((a,n)=>a+n.g,0),part:ns.some(n=>n.part)}:null;}
function fmtNut(n,short){if(!n||n.none)return"";const k=Math.round(n.k/10)*10,g=Math.round(n.g);
  return`${n.part?"≥ ":"≈ "}${k.toLocaleString("fr-FR")} kcal · ${g} g ${short?"gluc.":"glucides"}`;}

/* ---------- drink suggestions: simple pairing rules from the dish ---------- */
const DRINKS=[
 [r=>r.cat==="Dessert"&&/chocolat|brownie|cacao/i.test(nm(r)),"Banyuls ou Maury","Chocolat chaud ou café"],
 [r=>/magret|canard/i.test(r.name),"Rouge du Sud-Ouest (Madiran, Cahors)","Jus de raisin"],
 [r=>/wellington|filet de bœuf|gigot/i.test(r.name),"Grand rouge (Saint-Émilion, Pauillac)","Jus de raisin"],
 [r=>/chapon|dinde aux marrons/i.test(r.name),"Bourgogne rouge (Pinot noir) ou Meursault","Jus de raisin"],
 [r=>r.cat==="Dessert"&&hasTheme(r,"fete"),"Champagne demi-sec ou Muscat","Cidre doux ou jus de pomme pétillant"],
 [r=>r.cat==="Dessert","Muscat ou cidre doux","Thé ou infusion"],
 [r=>/croziflette|tartiflette|raclette|fondue|reblochon|crozets/i.test(nm(r)),"Blanc de Savoie (Apremont, Chignin)","Jus de pomme"],
 [r=>/curry|dahl|chili|wok|tacos|sin carne|thaï|asiat/i.test(r.name),"Bière blonde ou blanc aromatique (Gewurztraminer)","Thé glacé maison ou lassi"],
 [r=>/blanquette/i.test(nm(r)),"Blanc de Bourgogne (Mâcon, Chardonnay)","Jus de raisin blanc"],
 [r=>kindOf(r)==="poisson"&&/saumon/i.test(nm(r)),"Blanc de Bourgogne (Chardonnay) ou rosé","Eau pétillante au citron"],
 [r=>kindOf(r)==="poisson","Blanc sec (Muscadet, Sancerre)","Eau pétillante au citron"],
 [r=>kindOf(r)==="rouge"&&/bourguignon|braiser/i.test(nm(r)),"Bourgogne rouge (Pinot noir)","Jus de raisin"],
 [r=>r.cat==="Soupe","Pas besoin de vin, ou un blanc léger","Eau ou infusion"],
 [r=>/pesto|lasagnes|risotto|carbonara|bolognaise|pâtes|spaghetti/i.test(r.name),"Rouge italien (Chianti) ou blanc (Pinot grigio)","Eau pétillante, citron"],
 [r=>kindOf(r)==="rouge","Rouge (Côtes-du-Rhône, Bordeaux)","Jus de raisin"],
 [r=>kindOf(r)==="volaille"&&/basquaise|provençal|soleil/i.test(nm(r)),"Rosé (Côtes-de-Provence) ou rouge léger (Irouléguy)","Jus de tomate ou eau pétillante"],
 [r=>kindOf(r)==="volaille","Rouge léger (Beaujolais) ou blanc (Chardonnay)","Jus de pomme pétillant"],
 [r=>kindOf(r)==="porc","Blanc d'Alsace (Riesling) ou rouge léger (Beaujolais)","Jus de pomme"],
 [r=>r.cat==="Soupe","Pas besoin de vin, ou un blanc léger","Eau ou infusion"],
 [r=>/ratatouille|tian|provençal|tomate|poivron|aubergine/i.test(nm(r)),"Rosé de Provence","Eau pétillante, citron"],
 [r=>true,"Blanc fruité (Côtes-de-Gascogne) ou rosé","Eau aromatisée maison"],
];
function nm(r){return r.name+" "+(r.ing||[]).map(i=>i.n).join(" ");}
// starters get their own pairings (apéritif style)
const ENTREE_DRINKS=[
 [/foie gras/,"Sauternes ou Jurançon moelleux","Jus de raisin blanc"],
 [/saint-jacques|gravlax|saumon|huître|crevette|thon|poisson|fruits de mer|moules|crabe|accras|morue/,"Champagne ou Muscadet","Eau pétillante au citron"],
 [/terrine|pâté|charcuterie|jambon|rillettes|saucisson/,"Beaujolais","Jus de raisin"],
 [/quiche|tarte|feuilleté|gougère|cake|fromage|chèvre/,"Blanc d'Alsace (Pinot blanc) ou Bourgogne aligoté","Jus de pomme"],
 [/salade|crudités|taboulé|carotte|concombre|tomate|gaspacho/,"Rosé de Provence ou blanc sec (Sauvignon)","Eau pétillante, menthe"],
 [/soupe|velouté|potage|bouillon|minestrone/,"Blanc léger (Mâcon, Sauvignon)","Eau ou infusion"],
];
function drinkFor(r,role){
  if(role==="entree"||r.cat==="Entrée"){const t=norm(r.name);const e=ENTREE_DRINKS.find(x=>x[0].test(t))||(r.cat==="Soupe"?ENTREE_DRINKS[5]:null);
    return e?[e[1],e[2]]:["Blanc sec ou crémant","Eau pétillante, citron"];}
  const d=DRINKS.find(x=>x[0](r));return[d[1],d[2]];}
function drinkLine(r,role){const d=drinkFor(r,role);return"🍷 "+d[0]+" · 🥤 "+d[1];}

/* ---------- nature of foods and strict food combining (dissociation) ---------- */
// families: prot (meat, fish, eggs, cheese and dairy), star (starches), legu (pulses), veg, fruit, fat, sugar, spice
const NAT_LABEL={prot:"Protéines",star:"Féculents",legu:"Légumineuses",veg:"Légumes",fruit:"Fruits",fat:"Matières grasses",sugar:"Sucres",spice:"Épices et condiments",unk:"À classer"};
const NAT_ORDER=["prot","star","legu","veg","fruit","fat","sugar","spice","unk"];
const NAT_RULES=[
 ["veg",/tomates?|poireaux?|champignons?/],
 ["fat",/lait de coco|huile|beurre|margarine|crème(?! dessert)|mayonnaise|pesto|olives?|noix(?! de saint)|noisettes|amandes?|pignons de pin|pécan|cajou|graines|coco râpée|avocats?/],
 ["star",/marrons|châtaignes|blinis|boudoirs|meringues?|pommes? de terre|patates? douces?|riz|pâtes|pâte brisée|pâte sablée|pâte feuilletée|spaghetti|lasagne|crozets|nouilles|tagliatelle|macaroni|penne|coquillettes|semoule|boulgour|quinoa|polenta|farine|maïzena|fécule|pain|baguette|tortilla|croûtons|chapelure|maïs|céréales|blé|avoine|biscottes|frites|chips|gâteau|biscuits|pâtisserie|crêpes/],
 ["spice",/sauce soja|soja sauce/],
 ["legu",/lentilles|pois chiches|haricots (rouges|blancs|secs|noirs)|flageolets|fèves|pois cassés|soja(?! sauce)|tofu|houmous/],
 ["prot",/foie gras|saint-jacques|huîtres?|homard|langoust|chapon|magret|gigot|poulet|dinde|canard|pintade|volaille|bœuf|boeuf|(?:^|\s)veau|agneau|porc|lardons|jambon|bacon|saucisse|saucisson|chorizo|merguez|steak|viande|pâté|rillettes|terrine|saumon|cabillaud|colin|merlu|lieu|thon|sardine|maquereau|truite|dorade|poisson|crevettes|moules|anchois|œufs?|oeufs?|fromage|gruyère|emmental|comté|cheddar|parmesan|mozzarella|feta|reblochon|raclette|camembert|chèvre|ricotta|mascarpone|lait(?!ue)|yaourts?|skyr|petit-suisse|crème dessert/],
 ["sugar",/sucre|miel|chocolat|cacao|confiture|sirop|glace|sorbet|caramel|meringues?/],
 ["fruit",/pamplemousses?|figues?|fruits rouges|clémentines?|mandarines?|pommes?|poires?|bananes?|citrons?|oranges?|fraises|framboises|myrtilles|cerises|abricots|pêches|raisins|ananas|mangues?|kiwis?|fruits?|compote/],
 ["spice",/porto|rhum|baies roses|gros sel|sel|poivre|épices|cumin|curry|paprika|cannelle|muscade|piment|herbes de provence|vanille|bouillon|sauce soja|soja sauce|moutarde|vinaigre|vin|bière|levure|pâte de curry|gingembre en poudre|sauce césar|apéritif|jus|soda/],
 ["veg",/carottes?|courgettes?|aubergines?|poivrons?|tomates?|coulis|oignons?|échalotes?|ail|champignons?|brocolis?|chou|épinards|pousses|poireaux?|navets?|potiron|butternut|courge|betteraves?|salade|laitues?|mâche|roquette|concombres?|céleri|fenouil|asperges|artichauts?|radis|endives?|haricots verts|petits pois|cornichons|crudités|soupe|persil|ciboulette|basilic|menthe|aneth|coriandre|thym|romarin|laurier|gingembre|légumes?/],
];
function natureOf(name){
  const n=norm(name), ov=(menu.natures||{})[n]; if(ov)return ov;
  const hit=NAT_RULES.find(([,re])=>re.test(n)); return hit?hit[0]:"unk";
}
function famsOf(names){return new Set(names.map(natureOf));}
// conflicts in strict combining: protein with starch, protein with pulses, pulses with starch
function dissocCheck(fams){
  const bad=[];
  if(fams.has("prot")&&fams.has("star"))bad.push("protéine + féculent");
  if(fams.has("prot")&&fams.has("legu"))bad.push("protéine + légumineuse");
  if(fams.has("legu")&&fams.has("star"))bad.push("légumineuse + féculent");
  return{ok:!bad.length&&!fams.has("unk"),bad,unk:fams.has("unk")};
}
function recipeDissoc(r){return dissocCheck(famsOf((r.ing||[]).map(i=>i.n)));}
function mealDissoc(s){
  const names=[];[s.id,s.entree,s.dessert].forEach(id=>{const r=id&&recipes[id];if(r)(r.ing||[]).forEach(i=>names.push(i.n));});
  (s.extra||[]).forEach(x=>names.push(x));
  return dissocCheck(famsOf(names));
}
function dissocBadge(d){
  return d.bad.length?`<span class="dbadge bad">⚠ ${esc(d.bad[0].charAt(0).toUpperCase()+d.bad[0].slice(1))}</span>`
    :d.unk?`<span class="dbadge unk">? Dissociation à vérifier</span>`:`<span class="dbadge ok">✓ Dissocié</span>`;
}
let natAsk=null;
function natureHtml(r){
  const groups={};(r.ing||[]).forEach(i=>{if(!i.n)return;const f=natureOf(i.n);(groups[f]=groups[f]||[]).push(i.n);});
  return`<span class="label">Nature des aliments</span><div class="nat-list">${NAT_ORDER.filter(f=>groups[f]).map(f=>`<div class="nat-row"><span class="ntag n-${f}">${NAT_LABEL[f]}</span><span class="nat-items">${groups[f].map(n=>
      `<button type="button" class="nat-ing${f==="unk"?" unk":""}" data-act="natAsk" data-n="${esc(n)}">${esc(n)}${f==="unk"?" ?":""}</button>`).join(", ")}</span></div>`).join("")}</div>
    ${natAsk?`<div class="nat-pick"><span class="muted" style="font-size:13px">« ${esc(natAsk)} » est :</span><div class="dchips">${NAT_ORDER.filter(f=>f!=="unk").map(f=>`<span class="dchip${natureOf(natAsk)===f?" on":""}"><button type="button" data-act="natSet" data-f="${f}">${NAT_LABEL[f]}</button></span>`).join("")}</div></div>`:""}`;
}

/* ---------- wine (and beer) journal: photo of the label, details, grape varieties ---------- */
// typical grape varieties by appellation (they can vary from one estate to another)
const APPELLATIONS=[
 ["Champagne",/champagne/,"blanc","Chardonnay, Pinot noir, Pinot meunier"],
 ["Crémant d'Alsace",/crémant d.?alsace/,"blanc","Pinot blanc, Riesling, Pinot gris, Chardonnay"],
 ["Crémant de Loire",/crémant de loire/,"blanc","Chenin, Chardonnay, Cabernet franc"],
 ["Crémant de Bourgogne",/crémant de bourgogne/,"blanc","Chardonnay, Pinot noir"],
 ["Chablis",/chablis/,"blanc","Chardonnay"],
 ["Pouilly-Fuissé",/pouilly.fuiss/,"blanc","Chardonnay"],
 ["Pouilly-Fumé",/pouilly.fum/,"blanc","Sauvignon blanc"],
 ["Meursault",/meursault/,"blanc","Chardonnay"],
 ["Puligny-Montrachet",/montrachet/,"blanc","Chardonnay"],
 ["Mâcon",/m[âa]con/,"blanc","Chardonnay"],
 ["Gevrey-Chambertin",/gevrey|chambertin/,"rouge","Pinot noir"],
 ["Nuits-Saint-Georges",/nuits.saint.georges/,"rouge","Pinot noir"],
 ["Pommard",/pommard/,"rouge","Pinot noir"],["Volnay",/volnay/,"rouge","Pinot noir"],
 ["Beaune",/beaune/,"rouge","Pinot noir"],["Mercurey",/mercurey/,"rouge","Pinot noir"],
 ["Bourgogne",/bourgogne/,"rouge","Pinot noir (rouge) · Chardonnay (blanc)"],
 ["Beaujolais",/beaujolais|morgon|fleurie|brouilly|juliénas|moulin.à.vent|chiroubles|chénas|régnié|saint.amour/,"rouge","Gamay"],
 ["Sancerre",/sancerre/,"blanc","Sauvignon blanc (blanc) · Pinot noir (rouge)"],
 ["Menetou-Salon",/menetou/,"blanc","Sauvignon blanc · Pinot noir"],
 ["Muscadet",/muscadet/,"blanc","Melon de Bourgogne"],
 ["Vouvray",/vouvray/,"blanc","Chenin"],["Montlouis",/montlouis/,"blanc","Chenin"],["Savennières",/savenni/,"blanc","Chenin"],
 ["Chinon",/chinon/,"rouge","Cabernet franc"],["Bourgueil",/bourgueil/,"rouge","Cabernet franc"],["Saumur-Champigny",/saumur.champigny/,"rouge","Cabernet franc"],
 ["Saumur",/saumur/,"rouge","Cabernet franc · Chenin (blanc)"],["Anjou",/anjou/,"rouge","Cabernet franc, Cabernet sauvignon · Chenin (blanc)"],
 ["Pomerol",/pomerol/,"rouge","Merlot, Cabernet franc"],
 ["Saint-Émilion",/saint.[ée]milion/,"rouge","Merlot, Cabernet franc"],
 ["Pauillac",/pauillac/,"rouge","Cabernet sauvignon, Merlot"],["Margaux",/margaux/,"rouge","Cabernet sauvignon, Merlot"],
 ["Saint-Julien",/saint.julien/,"rouge","Cabernet sauvignon, Merlot"],["Saint-Estèphe",/saint.est[èe]phe/,"rouge","Cabernet sauvignon, Merlot"],
 ["Haut-Médoc",/haut.m[ée]doc/,"rouge","Cabernet sauvignon, Merlot"],["Médoc",/m[ée]doc/,"rouge","Cabernet sauvignon, Merlot"],
 ["Pessac-Léognan",/pessac/,"rouge","Cabernet sauvignon, Merlot · Sauvignon, Sémillon (blanc)"],
 ["Graves",/graves/,"rouge","Merlot, Cabernet sauvignon · Sauvignon, Sémillon (blanc)"],
 ["Sauternes",/sauternes|barsac|loupiac/,"blanc","Sémillon, Sauvignon blanc"],
 ["Entre-deux-Mers",/entre.deux.mers/,"blanc","Sauvignon blanc, Sémillon"],
 ["Bordeaux",/bordeaux|côtes de bourg|blaye|fronsac|castillon/,"rouge","Merlot, Cabernet sauvignon, Cabernet franc"],
 ["Bergerac",/bergerac|monbazillac|pécharmant/,"rouge","Merlot, Cabernet sauvignon · Sémillon (blanc)"],
 ["Cahors",/cahors/,"rouge","Malbec (Côt), Merlot"],["Madiran",/madiran/,"rouge","Tannat"],
 ["Jurançon",/jurançon|jurancon/,"blanc","Gros Manseng, Petit Manseng"],["Irouléguy",/iroul/,"rouge","Tannat, Cabernet franc"],
 ["Gaillac",/gaillac/,"rouge","Duras, Braucol, Syrah · Mauzac (blanc)"],["Fronton",/fronton/,"rouge","Négrette"],
 ["Côtes de Gascogne",/gascogne/,"blanc","Colombard, Ugni blanc, Gros Manseng"],
 ["Châteauneuf-du-Pape",/ch[âa]teauneuf/,"rouge","Grenache, Syrah, Mourvèdre"],
 ["Gigondas",/gigondas/,"rouge","Grenache, Syrah, Mourvèdre"],["Vacqueyras",/vacqueyras/,"rouge","Grenache, Syrah"],
 ["Côte-Rôtie",/c[ôo]te.r[ôo]tie/,"rouge","Syrah, Viognier"],["Condrieu",/condrieu/,"blanc","Viognier"],
 ["Hermitage",/hermitage/,"rouge","Syrah · Marsanne, Roussanne (blanc)"],["Saint-Joseph",/saint.joseph/,"rouge","Syrah · Marsanne, Roussanne (blanc)"],
 ["Cornas",/cornas/,"rouge","Syrah"],["Tavel",/tavel/,"rosé","Grenache, Cinsault"],
 ["Côtes-du-Rhône",/c[ôo]tes?.du.rh[ôo]ne|ventoux|luberon|rasteau|cairanne/,"rouge","Grenache, Syrah, Mourvèdre"],
 ["Bandol",/bandol/,"rouge","Mourvèdre, Grenache, Cinsault"],
 ["Côtes-de-Provence",/provence|bandol ros|cassis/,"rosé","Grenache, Cinsault, Syrah, Mourvèdre"],
 ["Corse",/corse|patrimonio|ajaccio/,"rouge","Nielluccio, Sciaccarello · Vermentino (blanc)"],
 ["Picpoul de Pinet",/picpoul/,"blanc","Piquepoul"],
 ["Banyuls",/banyuls|maury|rivesaltes/,"rouge","Grenache"],
 ["Languedoc",/languedoc|corbières|minervois|faugères|saint.chinian|pic.saint.loup|fitou|roussillon|terrasses du larzac/,"rouge","Syrah, Grenache, Carignan, Mourvèdre"],
 ["Savoie",/savoie|apremont|chignin|abymes|jongieux/,"blanc","Jacquère · Mondeuse (rouge)"],
 ["Jura",/jura|arbois|château.chalon|vin jaune|l.étoile/,"blanc","Savagnin, Chardonnay · Poulsard, Trousseau (rouge)"],
 ["Alsace",/alsace/,"blanc","Riesling, Gewurztraminer, Pinot gris, Sylvaner, Muscat"],
 ["Chianti",/chianti/,"rouge","Sangiovese"],["Prosecco",/prosecco/,"blanc","Glera"],
 ["Rioja",/rioja/,"rouge","Tempranillo"],["Porto",/porto/,"rouge","Touriga nacional, Tinta roriz"],
];
const GRAPES=["Cabernet sauvignon","Cabernet franc","Merlot","Malbec","Pinot noir","Pinot gris","Pinot blanc","Pinot meunier","Gamay","Syrah","Grenache","Mourvèdre","Cinsault","Carignan","Tannat","Chardonnay","Sauvignon blanc","Sauvignon","Sémillon","Chenin","Riesling","Gewurztraminer","Sylvaner","Muscat","Viognier","Marsanne","Roussanne","Vermentino","Colombard","Melon de Bourgogne","Jacquère","Mondeuse","Savagnin","Sangiovese","Tempranillo","Nebbiolo","Zinfandel","Albariño"];
// keep only the grapes of the wine's colour when the appellation lists several ("Sauvignon blanc (blanc) · Pinot noir (rouge)")
function grapesForColor(s,color){const parts=String(s).split(" · ");if(parts.length<2||!color)return String(s).replace(/ \((blanc|rouge|rosé)\)/g,"");
  const tagged=parts.find(x=>x.includes("("+color+")"));if(tagged)return tagged.replace(/ \(.*?\)/,"");
  const plain=parts.find(x=>!/\((blanc|rouge|rosé)\)/.test(x));return(plain||parts[0]).replace(/ \(.*?\)/,"");}
function findAppellation(text){const n=norm(text);return APPELLATIONS.find(a=>a[1].test(n))||null;}
function grapesFromText(text){const n=norm(text);return GRAPES.filter(g=>n.includes(norm(g))).filter((g,i,arr)=>!(g==="Sauvignon"&&arr.includes("Sauvignon blanc")));}
// read what Live Text copied from the label: name, appellation, vintage, colour, grapes
function parseLabel(text){
  const lines=String(text).split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const year=(String(text).match(/\b(19[5-9]\d|20[0-4]\d)\b/)||[])[1]||"";
  const app=findAppellation(text);
  const nameLine=lines.find(l=>/(ch[âa]teau|domaine|clos|mas |cave|cuv[ée]e|maison)/i.test(l))||lines.find(l=>!/appellation|contr[ôo]l|prot[ée]g|mis en bouteille|produit de|product of|alc|vol|\bcl\b|\bml\b|^\d/.test(norm(l)))||"";
  const n=norm(text);
  const color=/champagne|crémant|brut|mousseux|pétillant|prosecco/.test(n)?"effervescent":/ros[ée]/.test(n)?"rosé":/\bblanc\b/.test(n)?"blanc":/\brouge\b/.test(n)?"rouge":app?app[2]:"";
  const gr=grapesFromText(text);
  return{name:nameLine,app:app?app[0]:"",year,color,grapes:gr.length?gr.join(", "):(app?grapesForColor(app[3],color):""),grapesAuto:!gr.length&&!!app};
}
// photos: small JPEG kept on this phone, copied to the private data repository when sharing is on
const WPH="cm_wphotos";
function wPhotos(){return LS.get(WPH,{});}
function saveWPhoto(id,data){const m=wPhotos();m[id]=data;let keys=Object.keys(m);
  for(;;){try{localStorage.setItem(WPH,JSON.stringify(m));break;}catch(e){if(keys.length<=1)break;delete m[keys.shift()];}}}
async function shrinkPhoto(file){
  const url=URL.createObjectURL(file);
  try{const img=await new Promise((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ko;i.src=url;});
    const s=Math.min(1,560/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);return c.toDataURL("image/jpeg",0.68);}
  finally{URL.revokeObjectURL(url);}
}
async function uploadWPhoto(id,data){if(!sync)return;try{const path="photos/"+id+".jpg";let sha;const g=await gh("GET",null,sync.repo,path);if(g.status===200)sha=(await g.json()).sha;
  await gh("PUT",Object.assign({message:"Photo de vin",content:data.split(",")[1]},sha?{sha}:{}),sync.repo,path);}catch(e){}}
const wFetching=new Set();
function wPhotoSrc(w){const m=wPhotos();if(m[w.id])return m[w.id];
  if(w.photo&&sync&&!wFetching.has(w.id)){wFetching.add(w.id);gh("GET",null,sync.repo,"photos/"+w.id+".jpg").then(r=>r.status===200?r.json():null).then(d=>{if(d&&d.content){saveWPhoto(w.id,"data:image/jpeg;base64,"+d.content.replace(/\s/g,""));renderWines();if(!$("#wineSheet").hidden)renderWineForm();}}).catch(()=>{});}
  return"";}
/* ---------- recipe photos: taken or chosen on the phone, kept small here and copied to the private data repository ---------- */
const RPH="cm_rphotos";
function rPhotos(){return LS.get(RPH,{});}
function saveRPhoto(id,data){const m=rPhotos();if(data)m[id]=data;else delete m[id];let keys=Object.keys(m);
  for(;;){try{localStorage.setItem(RPH,JSON.stringify(m));break;}catch(e){if(keys.length<=1)break;delete m[keys.shift()];keys=Object.keys(m);}}}
const rFetching=new Set();
/* matching photo for every recipe: free photos from Wikipédia / Wikimedia Commons, found by the recipe's name; "Autre photo" cycles */
/* v4: better search (key words, Openverse), no maps / coats of arms; older caches are dropped */ const AUTOPH="cm_autoph5";try{["cm_autoph","cm_autoph2","cm_autoph3","cm_autoph4"].forEach(k=>localStorage.removeItem(k));}catch(e){}
// not a picture of food: maps, flags, coats of arms, logos, places, people…
const PH_BAD=/\b(map|carte|plan|locator|location|localisation|situation|blason|armoiries|coat[ _]of[ _]arms|flag|drapeau|logo|icon|ic[oô]ne|diagram|sch[ée]ma|chart|graph|signature|portrait|panneau|sign|stamp|timbre|carton|poster|affiche|book|livre|page|scan|osm|relief|commune|village|church|[ée]glise|ch[aâ]teau|street|rue|gare|station|vache|cow|bull|cattle|ox|taureau|b[œo]euf[ _]?(de|du)?[ _]?(race|breed))\b/i;
const PH_PLACE=/commune|ville|village|hameau|rivi[eè]re|fleuve|d[ée]partement|r[ée]gion|pays|personnalit|footballeur|joueur|homme politique|femme politique|chanteu|acteur|actrice|r[ée]alisat|film|album|chanson|groupe|entreprise|soci[ée]t[ée]|famille|genre|esp[eè]ce|race|navire|[ée]mission|s[ée]rie|roman|personnage/i;let autoCache=LS.get(AUTOPH,{}),autoQ=[],autoBusy=0,autoPend=new Set(),autoT=null;
const autoKey=r=>norm(r.name);
function autoList(id){const r=recipes[id];if(!r)return[];const c=autoCache[autoKey(r)];if(c)return c.list||[];
  if(!autoPend.has(id)){autoPend.add(id);autoQ.push(id);autoPump();}return[];}
function autoPump(){while(autoBusy<4&&autoQ.length){const id=autoQ.shift();autoBusy++;
  findPhotos(recipes[id]).then(list=>{const r=recipes[id];if(r){autoCache[autoKey(r)]={list,t:Date.now()};try{LS.set(AUTOPH,autoCache);}catch(e){}}})
    .catch(()=>{}).finally(()=>{autoBusy--;autoPend.delete(id);if(!autoT)autoT=setTimeout(()=>{autoT=null;render();},600);autoPump();});}}
// "Gratin de chou-fleur léger au fromage frais" → "gratin chou-fleur": the words that name the dish
const PH_STOP=new Set("de du des d la le les l au aux à a et en avec sans sur pour façon style ma mon mes maison express rapide facile léger légère légers légères allégé allégée crémeux crémeuse crémeuses fondant fondante simple simplifié simplifiée revisité revisitée minute moelleux moelleuse croustillant croustillante gourmand gourmande healthy recette meilleure".split(" "));
function phKeywords(name){return name.toLowerCase().replace(/[()&,:;!?.«»"]/g," ").replace(/(pommes?|noix|fruits?|haricots?) de (terre|saint-jacques|coco|mer|cajou)/g,"$1_de_$2").split(/\s+/).filter(w=>w&&!PH_STOP.has(w)&&!/^\d/.test(w)&&!/^(d|l|qu)'/.test(w)).slice(0,3).join(" ").replace(/_/g," ");}
async function findPhotos(r,max){
  const name=String(r.name||"").replace(/\([^)]*\)/g," ").replace(/\s+/g," ").trim(),out=[],seen=new Set();
  const add=x=>{if(x&&x.u&&!seen.has(x.u)){seen.add(x.u);out.push(x);}};
  const head=name.split(/,| & | et | aux | au | à la | à l'| sauce /i)[0].trim(),key=phKeywords(name),key2=key.split(" ").slice(0,2).join(" ");
  const want=max||8;
  // 1. Wikipédia: the article of the dish (best match for classic dishes)
  for(const t of [...new Set([name,head])]){if(out.length)break;try{const x=await fetch("https://fr.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(t.replace(/ /g,"_")));
    if(x.ok){const d=await x.json();if(d&&d.type==="standard"&&d.thumbnail&&d.thumbnail.source&&!PH_PLACE.test(d.description||"")&&!PH_BAD.test(d.thumbnail.source)){const o=d.originalimage||{};
      add({u:o.source&&o.width&&o.width<=1600?o.source:(o.width>640?d.thumbnail.source.replace(/\/\d+px-/,"/640px-"):d.thumbnail.source),page:d.content_urls&&d.content_urls.desktop&&d.content_urls.desktop.page,src:"Wikipédia"});}}}catch(e){}}
  // 2. Wikipédia search: the dish articles that match the key words (their main picture)
  for(const q of [...new Set([key,key2].filter(Boolean))]){if(out.length>=3)break;
    try{const x=await fetch("https://fr.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=0&gsrlimit=5&prop=pageimages|description&piprop=thumbnail&pithumbsize=640&gsrsearch="+encodeURIComponent(q));
      if(x.ok){const d=await x.json();const pages=Object.values((d.query||{}).pages||{}).sort((a,b)=>(a.index||0)-(b.index||0));
        for(const pg of pages){if(pg.thumbnail&&pg.thumbnail.source&&!PH_PLACE.test(pg.description||"")&&!PH_BAD.test(pg.thumbnail.source))add({u:pg.thumbnail.source,page:"https://fr.wikipedia.org/wiki/"+encodeURIComponent((pg.title||"").replace(/ /g,"_")),src:"Wikipédia"});}}}catch(e){}}
  // 3. Wikimedia Commons
  for(const q of [...new Set([key,head,key2].filter(Boolean))]){if(out.length>=(max?want:2))break; // automatic: Commons only when Wikipédia found little
    try{const x=await fetch("https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit="+want+"&prop=imageinfo&iiprop=url&iiurlwidth=640&gsrsearch="+encodeURIComponent(q+" filetype:bitmap"));
      if(!x.ok)continue;const d=await x.json();const pages=Object.values((d.query||{}).pages||{}).sort((a,b)=>(a.index||0)-(b.index||0));
      for(const pg of pages){const ii=(pg.imageinfo||[])[0];if(ii&&ii.thumburl&&!/\.(svg|gif|tiff?|pdf|djvu)$/i.test(pg.title||"")&&!PH_BAD.test(pg.title||""))add({u:ii.thumburl,page:ii.descriptionurl,src:"Wikimedia Commons"});}}catch(e){}}
  if(max&&out.length<max){try{const x=await fetch("https://api.openverse.org/v1/images/?page_size=16&mature=false&q="+encodeURIComponent(key||name));
    if(x.ok){const d=await x.json();for(const it of d.results||[]){if(PH_BAD.test((it.title||"")+" "+(it.tags||[]).map(t=>t.name||"").join(" ")))continue;const u=it.url&&/\.(jpe?g|png|webp)(\?|$)/i.test(it.url)?it.url:it.thumbnail;if(u)add({u,page:it.foreign_landing_url||it.url,src:it.source?("Openverse · "+it.source):"Openverse"});}}}catch(e){}}
  return out.slice(0,want);}
/* photo chooser: candidates found on the internet, a free search, my own photo, or the address of any image */
let photoId=null;
async function openPhotoPick(id){const r=recipes[id];if(!r)return;photoId=id;$("#photoQ").value=r.name;$("#photoUrl").value="";
  $("#photoGalleryIn").dataset.id=id;$("#pasteZone").textContent="Restez appuyé ici → Coller";
  $("#photoMine").innerHTML=`<label class="btn rp-pick">📷 Ma photo (appareil ou photothèque)<input type="file" accept="image/*" class="rphoto-in" data-id="${esc(id)}" hidden></label>`;
  $("#recSheet").hidden=true; /* the recipe comes back when this window closes */ $("#photoSheet").hidden=false;$("#photoSheet .sheet-in").scrollTop=0;photoSearch(r.name,true);}
async function photoSearch(q,first){const id=photoId;if(!id)return;q=String(q||"").trim();if(!q)return;
  $("#photoGoogle").href="https://www.google.com/search?tbm=isch&q="+encodeURIComponent(q+" recette");
  $("#photoMsg").textContent="Recherche de photos…";$("#photoGrid").innerHTML="";
  let list=first?autoList(id):[];if(list.length<6){try{list=[...list,...(await findPhotos({name:q},16))];}catch(e){}}
  const seen=new Set(),nope=rejected(recipes[id]);list=list.filter(x=>x&&x.u&&!nope.has(x.u)&&!seen.has(x.u)&&seen.add(x.u));if(photoId!==id)return;
  photoCands=list;const cur=rPhotoSrc(id);
  $("#photoMsg").textContent=list.length?"Touchez une photo pour la choisir.":"Aucune photo trouvée : essayez un autre mot (ex. le plat principal), ou collez l'adresse d'une image.";
  renderPhotoGrid();}
function renderPhotoGrid(){const id=photoId,cur=rPhotoSrc(id),nope=rejected(recipes[id]);
  $("#photoGrid").innerHTML=photoCands.map((x,i)=>nope.has(x.u)?"":`<div class="ph-w"><button type="button" class="ph-c${x.u===cur?" on":""}" data-act="photoChoose" data-i="${i}"><img src="${esc(x.u)}" alt="" loading="lazy" onerror="this.closest('.ph-w').remove()"></button><button type="button" class="ph-x" data-act="photoReject" data-i="${i}" aria-label="Supprimer cette photo">✕</button></div>`).join("");
  if(!$("#photoGrid").children.length)$("#photoMsg").textContent="Plus de photo ici : cherchez avec d'autres mots, ou utilisez Google Images.";}
let photoCands=[];
// a pasted image (or image link) in the paste box: works on iPhone and Android with the long-press "Coller"
// pasted image: from the clipboard data when the phone gives it, otherwise let the phone insert it in the box and read what it inserted
async function usePastedSrc(id,src){if(!src)return false;
  if(/^(data:image|blob:)/.test(src)){try{const bl=await(await fetch(src)).blob();if(bl.size&&/^image\//.test(bl.type||"image/")){$("#photoSheet").hidden=true;await setRecipePhoto(id,new File([bl],"photo",{type:bl.type||"image/jpeg"}));return true;}}catch(e){}return false;}
  if(/^https?:\/\//.test(src)){$("#photoUrl").value=src.replace(/^http:/,"https:");document.querySelector('[data-act=photoUrlOk]').click();return true;}return false;}
function pasteFail(){$("#pasteZone").innerHTML="Ce collage n'a pas marché. Sur Google, ouvrez d'abord la photo en grand, restez appuyé dessus → « Copier », puis réessayez ici. Sinon : « Choisir dans mes photos » après l'avoir enregistrée.";}
$("#pasteZone").addEventListener("paste",e=>{const id=photoId;if(!id){e.preventDefault();return;}const dt=e.clipboardData;
  const f=[...(dt&&dt.files||[])].find(x=>!x.type||x.type.startsWith("image/"))||[...(dt&&dt.items||[])].filter(i=>i.kind==="file").map(i=>i.getAsFile()).filter(Boolean)[0];
  const html=dt&&dt.getData("text/html")||"",m=html.match(/<img[^>]+src=["']([^"']+)["']/i),t=((dt&&(dt.getData("text/uri-list")||dt.getData("text/plain")))||"").trim().split(/\s+/)[0];
  const src=m?m[1].replace(/&amp;/g,"&"):(/^(https?:\/\/|data:image)\S+$/.test(t)?t:"");
  if(f){e.preventDefault();$("#photoSheet").hidden=true;setRecipePhoto(id,f.type?f:new File([f],"photo",{type:"image/jpeg"}));return;}
  if(src){e.preventDefault();usePastedSrc(id,src).then(ok=>{if(!ok)pasteFail();});return;}
  // nothing readable: let the phone paste into the box, then look for the picture it inserted
  $("#pasteZone").textContent="";
  setTimeout(async()=>{const img=$("#pasteZone").querySelector("img");const ok=img&&await usePastedSrc(id,img.currentSrc||img.src);if(!ok)pasteFail();},150);});
$("#pasteZone").addEventListener("beforeinput",e=>{if(e.inputType!=="insertFromPaste")e.preventDefault();});
let reviewMode="all",reviewLimit=60;
function renderReview(){const all=Object.entries(recipes).sort((a,b)=>a[1].name.localeCompare(b[1].name,"fr"));
  const list=reviewMode==="none"?all.filter(([id])=>!rPhotoSrc(id)):reviewMode==="mine"?all.filter(([,r])=>r.photo||r.pick):all;
  $("#reviewChips").innerHTML=[["all","Toutes"],["none","Sans photo"],["mine","Choisies par moi"]].map(([v,l])=>`<button type="button" class="chip" data-act="reviewMode" data-v="${v}" aria-pressed="${reviewMode===v}">${l}</button>`).join("");
  $("#reviewGrid").innerHTML=list.slice(0,reviewLimit).map(([id,r])=>{const s=rPhotoSrc(id);return`<button type="button" class="rv" data-act="reviewPick" data-id="${esc(id)}">${s?`<img src="${esc(s)}" alt="" loading="lazy"${!r.photo&&!r.pick?` data-auto="${esc(id)}"`:""}>`:`<span class="rv-none">📷</span>`}<span class="rv-n">${esc(r.name)}</span></button>`;}).join("")
    +(list.length>reviewLimit?`<button type="button" class="btn" data-act="reviewMore" style="grid-column:1/-1">Afficher plus (${list.length-reviewLimit} restantes)</button>`:"")
    +(list.length?"":`<p class="muted" style="grid-column:1/-1">Aucune recette ici.</p>`);}
// an image copied in Safari / Google Images (or its link): read from the clipboard after the phone's "Coller" confirmation
async function pasteImage(){const id=photoId;if(!id)return;
  try{if(navigator.clipboard&&navigator.clipboard.read){const items=await navigator.clipboard.read();
      for(const it of items){const ty=it.types.find(t=>t.startsWith("image/"));if(ty){const blob=await it.getType(ty);$("#photoSheet").hidden=true;await setRecipePhoto(id,new File([blob],"photo",{type:ty}));return;}
        if(it.types.includes("text/plain")){const t=(await(await it.getType("text/plain")).text()).trim();if(/^https:\/\/\S+$/.test(t)){$("#photoUrl").value=t;document.querySelector('[data-act=photoUrlOk]').click();return;}}}}
    else if(navigator.clipboard&&navigator.clipboard.readText){const t=(await navigator.clipboard.readText()).trim();if(/^https:\/\/\S+$/.test(t)){$("#photoUrl").value=t;document.querySelector('[data-act=photoUrlOk]').click();return;}}
    toast("Rien à coller automatiquement : restez appuyé dans le cadre puis « Coller »");$("#pasteZone").focus();}
  catch(e){toast("Ce téléphone refuse le collage automatique : restez appuyé dans le cadre puis « Coller »");$("#pasteZone").focus();}}
function choosePhoto(c){const r=recipes[photoId];if(!r||!c)return;const n=Object.assign({},r,{pick:{u:c.u,page:c.page||"",src:c.src||"internet"}});delete n.noAuto;
  saveRecipe(photoId,n);$("#photoSheet").hidden=true;toast("Photo choisie");}
$("#photoForm").addEventListener("submit",e=>{e.preventDefault();photoSearch($("#photoQ").value);});
document.addEventListener("error",e=>{const im=e.target;if(!im||im.tagName!=="IMG")return;
  if(im.dataset.site){const bad=LS.get("cm_badimg",{});bad[im.dataset.site]=1;LS.set("cm_badimg",bad);clearTimeout(autoT);autoT=setTimeout(()=>{autoT=null;render();},200);return;}
  if(!im.dataset.auto)return;
  const r=recipes[im.dataset.auto];if(!r)return;if(r.autoPick===im.getAttribute("src")){delete r.autoPick;autoPickSave();clearTimeout(autoT);autoT=setTimeout(()=>{autoT=null;render();},200);}const c=autoCache[autoKey(r)];if(!c||!c.list)return;
  const n=c.list.length;c.list=c.list.filter(x=>x.u!==im.getAttribute("src"));if(c.list.length!==n){try{LS.set(AUTOPH,autoCache);}catch(x){}clearTimeout(autoT);autoT=setTimeout(()=>{autoT=null;render();},200);}},true);
const rejected=r=>new Set((r&&r.noPh)||[]);
let autoPickT=null;function autoPickSave(){clearTimeout(autoPickT);autoPickT=setTimeout(()=>{LS.set("cm_recipes",recipes);cloudSoon();},3000);}
function autoPhoto(id){const r=recipes[id],nope=rejected(r),l=autoList(id).filter(x=>!nope.has(x.u));if(!l.length)return null;return l[(Number(r.autoIdx)||0)%l.length];}
function rPhotoSrc(id){const r=recipes[id];if(!r)return"";
  if(!r.photo){if(r.cloudPhoto)return r.cloudPhoto; // a member's own photo, from the common book
    const sp=LS.get("cm_sh_photos",{})[id];if(sp)return sp.u; // a photo from a book I follow
    if(r.pick&&r.pick.u)return r.pick.u; // chosen in "Choisir une photo"
    if(r.image&&!LS.get("cm_badimg",{})[id])return r.image; // photo of the site the recipe came from
    if(r.noAuto)return"";
    // the photo found automatically is remembered in the shared carnet, so every phone of the household shows the same one
    if(r.autoPick&&!rejected(r).has(r.autoPick))return r.autoPick;
    const a=autoPhoto(id);if(a&&cloudCarnet()){r.autoPick=a.u;autoPickSave();}return a?a.u:"";}
  const m=rPhotos();if(m[id])return m[id];if(r.cloudPhoto)return r.cloudPhoto; // my photo, taken on another phone of the household
  if(sync&&!rFetching.has(id)){rFetching.add(id);gh("GET",null,sync.repo,recipeDataPhotoPath(id)).then(x=>x.status===200?x.json():null).then(d=>{if(d&&d.content){saveRPhoto(id,"data:image/jpeg;base64,"+d.content.replace(/\s/g,""));render();}}).catch(()=>{});}
  return"";}
/* ---------- Recadrer: frame 3:2 like the recipe photo; drag, pinch / slider zoom, fill or whole photo, rotate ---------- */
const CROP_W=780,CROP_H=520,ORIG="cm_rph_orig";
let crop=null;
function cropOrig(id,data){try{const m=LS.get(ORIG,{});if(data===undefined)return m[id]||"";m[id]=data;const k=Object.keys(m);while(k.length>25)delete m[k.shift()];
  try{localStorage.setItem(ORIG,JSON.stringify(m));}catch(e){const k2=Object.keys(m);while(k2.length>3){delete m[k2.shift()];try{localStorage.setItem(ORIG,JSON.stringify(m));break;}catch(x){}}}}catch(e){}return"";}
function loadImg(src,cors){return new Promise((ok,ko)=>{const i=new Image();if(cors)i.crossOrigin="anonymous";i.onload=()=>ok(i);i.onerror=ko;i.src=src;});}
async function openCrop(id,src,isNew){let img;
  if(/^https?:/.test(src)){try{img=await loadImg(src,true);const t=document.createElement("canvas");t.width=t.height=2;t.getContext("2d").drawImage(img,0,0,2,2);t.toDataURL();}
    catch(e){toast("Ce site ne permet pas de recadrer sa photo : enregistrez-la dans vos photos puis « 📷 Ma photo ».");return;}}
  else img=await loadImg(src);
  crop={id,img,src,isNew,z:1,ox:0,oy:0,rot:0,fit:"contain"};
  $("#cropSheet").hidden=false;$("#cropZoom").value=1;requestAnimationFrame(()=>drawCrop());}
function cropDims(){const r=crop.rot%2,iw=r?crop.img.height:crop.img.width,ih=r?crop.img.width:crop.img.height;return{iw,ih};}
function clampCrop(W,H){const{iw,ih}=cropDims(),b=crop.fit==="cover"?Math.max(W/iw,H/ih):Math.min(W/iw,H/ih),s=b*crop.z,lx=Math.abs(iw*s-W)/2/W,ly=Math.abs(ih*s-H)/2/H;
  crop.ox=Math.max(-lx,Math.min(lx,crop.ox));crop.oy=Math.max(-ly,Math.min(ly,crop.oy));return s;}
function paintCrop(cv,W,H){const c=cv.getContext("2d"),s=clampCrop(W,H);c.fillStyle="#EEEAE0";c.fillRect(0,0,W,H);
  c.save();c.translate(W/2+crop.ox*W,H/2+crop.oy*H);c.rotate(crop.rot*Math.PI/2);c.imageSmoothingQuality="high";
  c.drawImage(crop.img,-crop.img.width*s/2,-crop.img.height*s/2,crop.img.width*s,crop.img.height*s);c.restore();}
function drawCrop(){if(!crop)return;const cv=$("#cropCv"),st=$("#cropStage"),d=Math.min(2,window.devicePixelRatio||1),W=Math.round(st.clientWidth*d)||600,H=Math.round(W*2/3);
  cv.width=W;cv.height=H;paintCrop(cv,W,H);$("#cropCover").setAttribute("aria-pressed",crop.fit==="cover");$("#cropContain").setAttribute("aria-pressed",crop.fit==="contain");}
async function cropSave(){if(!crop)return;const c=crop,cv=document.createElement("canvas");cv.width=CROP_W;cv.height=CROP_H;paintCrop(cv,CROP_W,CROP_H);
  let data;try{data=cv.toDataURL("image/jpeg",0.78);}catch(e){toast("Cette photo ne peut pas être recadrée");return;}
  if(c.isNew||!cropOrig(c.id)){try{const o=document.createElement("canvas"),k=Math.min(1,1400/Math.max(c.img.width,c.img.height));o.width=Math.round(c.img.width*k);o.height=Math.round(c.img.height*k);
    o.getContext("2d").drawImage(c.img,0,0,o.width,o.height);cropOrig(c.id,o.toDataURL("image/jpeg",0.8));}catch(e){}}
  crop=null;$("#cropSheet").hidden=true;await storeRecipePhoto(c.id,data,!c.isNew);}
// gestures on the frame: one finger moves, two fingers zoom
(()=>{const st=$("#cropStage"),pts=new Map();let last=null;
  const dist=()=>{const p=[...pts.values()];return p.length>1?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;};
  st.addEventListener("pointerdown",e=>{if(!crop)return;st.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});last={d:dist(),x:e.clientX,y:e.clientY};});
  st.addEventListener("pointermove",e=>{if(!crop||!pts.has(e.pointerId))return;const prev=pts.get(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size>1){const d=dist();if(last&&last.d){crop.z=Math.max(1,Math.min(4,crop.z*d/last.d));$("#cropZoom").value=crop.z;}last={d};}
    else{const W=st.clientWidth,H=st.clientHeight;crop.ox+=(e.clientX-prev.x)/W;crop.oy+=(e.clientY-prev.y)/H;}
    drawCrop();});
  const up=e=>{pts.delete(e.pointerId);last={d:dist()};};st.addEventListener("pointerup",up);st.addEventListener("pointercancel",up);
  $("#cropZoom").addEventListener("input",e=>{if(!crop)return;crop.z=Number(e.target.value)||1;drawCrop();});
  window.addEventListener("resize",()=>{if(crop&&!$("#cropSheet").hidden)drawCrop();});})();
// a new photo (pasted, chosen, taken) first goes through "Recadrer"
async function setRecipePhoto(id,file){if(!recipes[id]||!file)return;
  const url=URL.createObjectURL(file);try{await openCrop(id,url,true);}catch(e){toast("Cette image n'a pas pu être lue");}finally{setTimeout(()=>URL.revokeObjectURL(url),60000);}}
async function storeRecipePhoto(id,data,quiet){const r=recipes[id];if(!r||!data)return;
  try{saveRPhoto(id,data);saveRecipe(id,Object.assign({},r,{photo:Date.now()}));toast(quiet?"Photo recadrée":"Photo ajoutée à la recette");
    if(sync){try{const path=recipeDataPhotoPath(id);let sha;const g=await gh("GET",null,sync.repo,path);if(g.status===200)sha=(await g.json()).sha;
      await gh("PUT",Object.assign({message:"Photo de recette",content:data.split(",")[1]},sha?{sha}:{}),sync.repo,path);}catch(e){}}}
  catch(e){toast("Cette image n'a pas pu être lue");}}
function removeRecipePhoto(id){const r=recipes[id];if(!r)return;saveRPhoto(id,null);const n=Object.assign({},r);delete n.photo;saveRecipe(id,n);toast("Photo retirée");}
document.addEventListener("change",e=>{const t=e.target;if(t&&t.classList&&t.classList.contains("rphoto-in")&&t.files&&t.files[0]){setRecipePhoto(t.dataset.id,t.files[0]);t.value="";$("#photoSheet").hidden=true;}});
// small photo of a recipe for lists (suggestions, favourites, choosing a dish)
function thumbHtml(id,cls){const r=recipes[id],s=r?rPhotoSrc(id):"";
  return s?`<img class="${cls}" src="${esc(s)}" alt="" loading="lazy"${r&&!r.photo&&!r.pick&&s!==r.image?` data-auto="${esc(id)}"`:""}>`:`<span class="${cls} ph-none" aria-hidden="true" data-th="${esc(id)}" data-cls="${esc(cls)}">🍽️</span>`;}
// lists drawn once (e.g. "Qu'est-ce que je fais avec…") get their photo when it arrives
function refreshThumbs(){document.querySelectorAll(".ph-none[data-th]").forEach(el=>{const id=el.dataset.th;if(recipes[id]&&rPhotoSrc(id))el.outerHTML=thumbHtml(id,el.dataset.cls);});}
function recPhotoBlock(id,big){const r=recipes[id],src=rPhotoSrc(id);if(r.shared&&!src)return"";
  const pick=label=>r.shared?"":`<label class="btn rp-pick">${label}<input type="file" accept="image/*" class="rphoto-in" data-id="${esc(id)}" hidden></label>`;
  const from=!r.photo&&(LS.get("cm_sh_photos",{})[id]||{}).by,site=!r.photo&&!from&&src&&src===r.image,auto=!r.photo&&!from&&!site&&src?(autoList(id).find(x=>x.u===src)||autoPhoto(id)):null;
  if(!r.photo&&!from&&r.pick&&src===r.pick.u)return`<div class="rp${big?" big":""}"><img src="${esc(src)}" alt="" loading="lazy"><span class="muted rp-credit">Photo choisie${r.pick.page?` · <a href="${esc(r.pick.page)}" target="_blank" rel="noopener">${esc(r.pick.src||"source")}</a>`:""}</span>
    ${r.shared?"":`<div class="row rp-acts"><button type="button" class="btn" data-act="cropEdit" data-id="${esc(id)}">✂️ Recadrer</button><button type="button" class="btn" data-act="photoPick" data-id="${esc(id)}">🔎 Autre photo</button>${pick("📷 Ma photo")}<button type="button" class="btn ghost" data-act="autoOff" data-id="${esc(id)}">Sans photo</button></div>`}</div>`;
  if(site)return`<div class="rp${big?" big":""}"><img src="${esc(src)}" alt="" data-site="${esc(id)}" loading="lazy"><span class="muted rp-credit">Photo du site d'origine${r.source?` · <a href="${esc(r.source)}" target="_blank" rel="noopener">${esc((()=>{try{return new URL(r.source).hostname.replace(/^www\./,"");}catch(e){return"voir";}})())}</a>`:""}</span>
    ${r.shared?"":`<div class="row rp-acts"><button type="button" class="btn" data-act="cropEdit" data-id="${esc(id)}">✂️ Recadrer</button>${pick("📷 Ma photo")}<button type="button" class="btn" data-act="photoPick" data-id="${esc(id)}">🔎 Autre photo</button></div>`}</div>`;
  if(auto)return`<div class="rp${big?" big":""}"><img src="${esc(src)}" alt="" data-auto="${esc(id)}" loading="lazy"><span class="muted rp-credit">Photo d'illustration · <a href="${esc(auto.page||"#")}" target="_blank" rel="noopener">${esc(auto.src)}</a></span>
    ${r.shared?"":`<div class="row rp-acts"><button type="button" class="btn" data-act="cropEdit" data-id="${esc(id)}">✂️ Recadrer</button><button type="button" class="btn" data-act="photoPick" data-id="${esc(id)}">🔎 Autre photo</button>${pick("📷 Ma photo")}<button type="button" class="btn ghost" data-act="autoOff" data-id="${esc(id)}">Sans photo</button></div>`}</div>`;
  if(src)return`<div class="rp${big?" big":""}"><img src="${src}" alt="Photo de ${esc(r.name)}" loading="lazy">${from?`<span class="muted" style="font-size:12px">Photo de ${esc(from)}</span>`:""}${r.shared?"":r.photo?`<div class="row rp-acts"><button type="button" class="btn" data-act="cropEdit" data-id="${esc(id)}">✂️ Recadrer</button><button type="button" class="btn" data-act="photoPick" data-id="${esc(id)}">🔎 Autre photo</button><button type="button" class="btn ghost" data-act="rphotoRm" data-id="${esc(id)}">Retirer</button></div>`:`<div class="row rp-acts">${pick("📷 Mettre ma photo")}</div>`}</div>`;
  return pick("📷 Ajouter ma photo")+(r.shared?"":`<button type="button" class="btn" data-act="photoPick" data-id="${esc(id)}">🔎 Chercher une photo</button>`)+(r.noAuto&&!r.shared?`<button type="button" class="btn ghost" data-act="autoOn" data-id="${esc(id)}">Photo d'illustration</button>`:"");}
const WCOLORS=[["rouge","Rouge"],["blanc","Blanc"],["rosé","Rosé"],["effervescent","Pétillant"],["bière","Bière"],["autre","Autre"]];
let wineDraft=null;
function wineFor(k,week){return(menu.wines||[]).filter(w=>w.k===k&&w.w===(week||curWeek));}
function openWine(opts){
  const ex=opts.id&&(menu.wines||[]).find(w=>w.id===opts.id);
  wineDraft=ex?JSON.parse(JSON.stringify(ex)):{id:"w"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),w:curWeek,k:opts.k||"",color:opts.beer?"bière":"",name:"",app:"",year:"",grapes:"",note:0,comment:"",photo:false,_new:true,_photo:""};
  renderWineForm();$("#wineSheet").hidden=false;$("#wineSheet .sheet-in").scrollTop=0;
}
function renderWineForm(){
  const d=wineDraft;if(!d)return;const src=d._photo||wPhotoSrc(d);const beer=d.color==="bière";
  $("#wineTitle").textContent=(d._new?"Noter ":"")+(beer?"une bière":"un vin")+(d.k?" · "+slotLabel(d.k):"");
  $("#wineBody").innerHTML=`
    <div class="wine-photo">${src?`<img src="${src}" alt="Étiquette">`:`<span class="lbl-ph lbl-big"><b>${beer?"🍺":"🍷"}</b><i>Étiquette</i></span>`}</div>
    <div class="row wine-ph-btns"><label class="btn">📷 Prendre en photo<input type="file" accept="image/*" capture="environment" class="wine-file" hidden></label><label class="btn">🖼️ Choisir dans la galerie<input type="file" accept="image/*" class="wine-file" hidden></label>${src?`<button type="button" class="btn ghost" data-act="winePhotoRm">Retirer</button>`:""}</div>
    <details class="field" ${d._new&&!d.name?"open":""}><summary class="label" style="cursor:pointer">Remplir depuis l'étiquette (texte en direct)</summary>
      <span class="muted" style="font-size:13px">Dans Photos, appuyez longuement sur le texte de l'étiquette → Copier, puis collez ici.</span>
      <textarea id="wineText" class="search" rows="3" placeholder="Collez le texte de l'étiquette"></textarea>
      <button type="button" class="btn" data-act="wineParse" style="align-self:flex-start">Remplir la fiche</button></details>
    <label class="field"><span class="label">Nom</span><input id="w-name" value="${esc(d.name)}" placeholder="${beer?"Ex. Brasserie du Mont Blanc, La Blonde":"Ex. Château Lagrange"}" autocomplete="off"></label>
    <div class="dchips">${WCOLORS.map(([v,l])=>`<span class="dchip${d.color===v?" on":""}"><button type="button" data-act="wineColor" data-v="${v}">${l}</button></span>`).join("")}</div>
    ${beer?"":`<div class="grid2"><label class="field"><span class="label">Appellation</span><input id="w-app" value="${esc(d.app)}" placeholder="Ex. Saint-Julien" autocomplete="off" list="w-apps"></label>
      <label class="field"><span class="label">Millésime</span><input id="w-year" value="${esc(d.year)}" inputmode="numeric" placeholder="2019" autocomplete="off"></label></div>
      <datalist id="w-apps">${APPELLATIONS.map(a=>`<option value="${esc(a[0])}">`).join("")}</datalist>
      <label class="field"><span class="label">Cépages</span><input id="w-grapes" value="${esc(d.grapes)}" placeholder="Remplis selon l'appellation" autocomplete="off"></label>
      <span class="muted" id="w-gnote" style="font-size:12px">${d.grapesAuto?"Cépages typiques de l'appellation : ils peuvent varier selon le domaine.":""}</span>`}
    <div class="pref-row"><div><strong>En cave</strong><div class="muted" style="font-size:13px">bouteilles qu'il vous reste</div></div><div class="ctl"><button type="button" class="step sm" data-act="wStock" data-d="-1" aria-label="Une bouteille de moins">−</button><span class="n">${d.stock||0}</span><button type="button" class="step sm" data-act="wStock" data-d="1" aria-label="Une bouteille de plus">+</button></div></div>
    <label class="field"><span class="label">Va bien avec la recette</span><input id="w-rec" value="${esc(d.rec&&recipes[d.rec]?recipes[d.rec].name:"")}" list="w-recs" placeholder="Ex. Bœuf bourguignon" autocomplete="off"></label>
    <datalist id="w-recs">${Object.values(recipes).filter(r=>!r.shared||true).map(r=>`<option value="${esc(r.name)}">`).slice(0,900).join("")}</datalist>
    <label class="field"><span class="label">À servir avec un repas prévu</span><select id="w-meal"><option value="">—</option>${upcomingMeals().map(m=>`<option value="${m.w}#${m.k}"${d.w===m.w&&d.k===m.k?" selected":""}>${esc(m.label)}</option>`).join("")}</select></label>
    <div class="field"><span class="label">Ma note</span><div class="stars">${[1,2,3,4,5].map(i=>`<button type="button" data-act="wineNote" data-v="${i}" aria-label="${i} sur 5" class="${d.note>=i?"on":""}">★</button>`).join("")}</div></div>
    <label class="field"><span class="label">Notes de dégustation</span><textarea id="w-comment" class="search" rows="2" placeholder="Ex. parfait avec le bœuf, à racheter">${esc(d.comment||"")}</textarea></label>
    ${d.color!=="bière"&&(d.name||d.app)?`<div>${vivinoLink([d.name,d.app].filter(Boolean).join(" "),"Voir ce vin sur Vivino")}</div>`:""}
    <div class="row"><button type="button" class="btn primary" data-act="wineSave">Enregistrer</button>${d._new?"":`<button type="button" class="btn danger" data-act="wineDel">Supprimer</button>`}</div>`;
  document.querySelectorAll("#wineBody .wine-file").forEach(inp=>inp.addEventListener("change",async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;
    try{wineCollect();wineDraft._photo=await shrinkPhoto(f);delete wineDraft._rm;renderWineForm();}catch(x){toast("Photo illisible, réessayez");}}));
  const app=$("#w-app");if(app)app.addEventListener("change",()=>{const a=findAppellation(app.value),g=$("#w-grapes");if(a&&g&&!g.value.trim()){g.value=grapesForColor(a[3],wineDraft.color);$("#w-gnote").textContent="Cépages typiques de l'appellation : ils peuvent varier selon le domaine.";wineDraft.grapesAuto=true;}});
}
// the meals of the next 3 weeks that have a dish, to serve a wine with
function upcomingMeals(){const out=[],today=ymd(new Date());for(let wi=0;wi<3;wi++){const w=ymd(addDays(mondayOf(new Date()),7*wi)),wk=(menu.weeks||{})[w]||{};
  DAYS.forEach((dn,i)=>{const dt=addDays(parseYmd(w),i);if(ymd(dt)<today)return;MEALS.forEach(([m,lab])=>{const k=slotKey(dn,m),s=wk[k];if(s&&recipes[s.id])out.push({w,k,label:`${dn} ${dt.getDate()} ${lab.toLowerCase()} · ${recipes[s.id].name}`});});});}return out;}
function wineCollect(){const d=wineDraft,v=id=>{const e=$(id);return e?e.value.trim():undefined;};
  d.name=v("#w-name")??d.name;{const rn=v("#w-rec");if(rn!==undefined){const id=Object.keys(recipes).find(k=>recipes[k].name===rn);if(id)d.rec=id;else if(!rn)delete d.rec;}
    const ml=$("#w-meal");if(ml&&ml.value){const[w,k]=ml.value.split("#");d.w=w;d.k=k;delete d.date;}}if($("#w-app")){d.app=v("#w-app");d.year=v("#w-year");d.grapes=v("#w-grapes");}d.comment=v("#w-comment")??d.comment;}
/* Vivino: open the search for a wine (its name, else its appellation) */
function vivinoUrl(q){return"https://www.vivino.com/search/wines?q="+encodeURIComponent(String(q).trim());}
function vivinoLink(q,label){return q?`<a class="vivino" href="${vivinoUrl(q)}" target="_blank" rel="noopener">${label||"Voir sur Vivino"} ↗</a>`:"";}
// from a pairing like "Blanc sec (Muscadet, Sancerre)" keep something Vivino can search: "Muscadet"
function pairingQuery(s){const first=String(s).split(" ou ")[0].trim();if(/^(pas besoin|bière)/i.test(first))return"";
  const m=first.match(/^(.*?)\s*\((.*)\)/);if(!m)return first;
  return/^(blanc|rouge|rosé)(?=\s|$)/i.test(m[1])?m[2].split(",")[0].trim():m[1].trim();}
function wineLabel(w){return[w.name||(w.color==="bière"?"Bière":"Vin"),w.app,w.year].filter(Boolean).join(" · ");}
function wineSave(){
  wineCollect();const d=wineDraft;if(!d.name&&!d.app&&!d._photo&&!d.photo){toast("Ajoutez au moins une photo ou un nom");return;}
  if(d._photo){saveWPhoto(d.id,d._photo);uploadWPhoto(d.id,d._photo);d.photo=true;}else if(d._rm){const m=wPhotos();delete m[d.id];try{localStorage.setItem(WPH,JSON.stringify(m));}catch(e){}d.photo=false;}
  if(!d.date){const wk=parseYmd(d.w),i=d.k?DAYS.indexOf(d.k.split("|")[0]):-1;d.date=i>=0?ymd(addDays(wk,i)):ymd(new Date());}
  const clean=Object.fromEntries(Object.entries(d).filter(([k])=>!k.startsWith("_")));
  menu.wines=[...(menu.wines||[]).filter(w=>w.id!==d.id),clean].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  if(d.k){const s=(menu.weeks[d.w]||{})[d.k];if(s){const tag=d.color==="bière"?"Bière":"Vin";if(!(s.extra||[]).includes(tag))s.extra=[...(s.extra||[]),tag];}}
  wineDraft=null;$("#wineSheet").hidden=true;render();saveMenu();if(!$("#sideSheet").hidden)renderSide();renderWines();toast("Enregistré dans Mes vins");
}
let wineQ="",winesMode=(LS.get("cm_menu",{}).wines||[]).some(w=>w.stock>0)?"cave":"all";
function renderWines(){
  if(view!=="wine")return;
  $("#winesMode").innerHTML=[["all","Tous"],["cave","🍾 En cave"]].map(([v,l])=>`<button type="button" class="chip" data-act="winesMode" data-v="${v}" aria-pressed="${winesMode===v}">${l}</button>`).join("");
  const q=norm(wineQ), list=(menu.wines||[]).filter(w=>(winesMode!=="cave"||(w.stock||0)>0)&&(!q||norm([w.name,w.app,w.year,w.grapes,w.color,w.comment,w.rec&&recipes[w.rec]?recipes[w.rec].name:""].join(" ")).includes(q)));
  $("#winesList").innerHTML=list.length?list.map(w=>{const src=wPhotoSrc(w);return`<button type="button" class="wine-row" data-act="wineOpen" data-id="${w.id}">
      <span class="wine-thumb">${src?`<img src="${src}" alt="">`:`<span class="lbl-ph"><b>${w.color==="bière"?"🍺":"🍷"}</b><i>${esc(w.year||"")}</i></span>`}</span>
      <span class="nm"><strong>${esc(w.name||(w.color==="bière"?"Bière":"Vin"))}</strong><span class="sub">${esc([w.app,w.year,(WCOLORS.find(c=>c[0]===w.color)||[0,w.color])[1]].filter(Boolean).join(" · "))}</span>
      ${w.grapes?`<span class="sub">Cépages : ${esc(w.grapes)}</span>`:""}<span class="sub">${esc(parseYmd(w.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}))}${w.k?" · "+esc(w.k.split("|")[1]):""}${w.note?" · "+"★".repeat(w.note):""}</span>${w.rec&&recipes[w.rec]?`<span class="sub">🍽️ avec ${esc(recipes[w.rec].name)}</span>`:""}</span></button>
      <div class="wine-stock"><span>🍾 En cave : <b>${w.stock||0}</b></span><button type="button" class="step sm" data-act="wStockL" data-id="${w.id}" data-d="-1" aria-label="Une bouteille de moins">−</button><button type="button" class="step sm" data-act="wStockL" data-id="${w.id}" data-d="1" aria-label="Une bouteille de plus">+</button></div>${w.color!=="bière"&&(w.name||w.app)?`<div class="wine-viv">${vivinoLink([w.name,w.app].filter(Boolean).join(" "))}</div>`:""}`;}).join("")
    :`<p class="muted">${(menu.wines||[]).length?"Aucun vin ne correspond.":"Aucun vin noté pour l'instant. Dans « En plus » d'un repas, touchez Vin ou Bière puis « Noter ce que j'ai bu »."}</p>`;
}

$("#winesQ").addEventListener("input",e=>{wineQ=e.target.value;renderWines();});
/* ---------- "Semaine" tab: the whole week at a glance, editable, shareable, printable ---------- */
let slotK=null;
function weekOptions(){const cur=ymd(mondayOf(new Date()));return[[cur,"Cette semaine"],[ymd(addDays(parseYmd(cur),7)),"Prochaine"],[ymd(addDays(parseYmd(cur),14)),"Dans 2 sem."]];}
let weekEdit=false;
function renderWeek(){
  const eb=$("#weekEditBtn");if(eb){eb.textContent=weekEdit?"Terminé":"Modifier";eb.classList.toggle("primary",weekEdit);}
  const el=$("#weekGrid");if(!el)return;
  const ws=weekStartDate(), today=ymd(new Date());
  $("#weekTitle").textContent="Semaine du "+shortDate(ws);
  $("#weekChips").innerHTML=weekOptions().map(([v,l])=>`<button class="chip" data-act="week" data-w="${v}" aria-pressed="${v===curWeek}">${l}</button>`).join("");
  const cell=(d,i,m)=>{const k=slotKey(d,m),s=W()[k],r=s&&recipes[s.id],date=ymd(addDays(ws,i)),past=date<today,isT=date===today;
    const side=!r&&hasSide(s), ed=weekEdit&&!past&&(r||side), x=(part,i2)=>ed&&!(part==="main"&&s.lock)?`<button type="button" class="wx" data-act="wRm" data-k="${k}" data-part="${part}"${i2!=null?` data-i="${i2}"`:""} aria-label="Retirer">✕</button>`:"";
    const line=(cls,txt,part,i2)=>`<span class="${cls}"><span>${txt}</span>${x(part,i2)}</span>`;
    let inner=r||side?(r?line("wn",esc(r.name)+(s.lock?' <span class="wl" aria-label="dans les courses">🛒</span>':''),"main"):s.note?line("wn","✏️ "+esc(s.note),"note"):s.left?line("wn","🥡 Restes : "+esc(s.left),"left"):`<span class="wn"><span class="muted">Plat à choisir</span></span>`)
      +(s.entree&&recipes[s.entree]?line("ws","Entrée : "+esc(recipes[s.entree].name),"entree"):"")
      +(s.dessert&&recipes[s.dessert]?line("ws","Dessert : "+esc(recipes[s.dessert].name),"dessert"):"")
      +(s.extra||[]).map((t,j)=>line("ws","+ "+esc(t),"extra",j)).join("")
      +(s.n!==menu.people?`<span class="ws">${s.n} pers.</span>`:""):(past?"—":"+ Choisir");
    return`<div role="button" tabindex="0" class="wc${isT?" today":""}${past?" past":""}${r||(s&&(s.left||s.note))?"":" empty"}${ed?" editing":""}" data-act="wcell" data-k="${k}" data-wslot="${k}">${inner}</div>`;};
  el.innerHTML=`<span class="wh"></span><span class="wh">MIDI</span><span class="wh">SOIR</span>`+DAYS.map((d,i)=>{const date=addDays(ws,i),isT=ymd(date)===today;
    return`<span class="wd${isT?" today":""}">${d.slice(0,3)}<small>${date.getDate()}</small></span>${cell(d,i,"midi")}${cell(d,i,"soir")}`;}).join("");
}
function renderSlotSheet(){
  const k=slotK,s=W()[k],r=s&&recipes[s.id];if(!k){$("#slotSheet").hidden=true;return;}
  if(slotFree)return renderSlotFree();
  const past=isPast(k);
  $("#slotTitle").textContent=slotLabel(k)+" · "+shortDate(addDays(weekStartDate(),DAYS.indexOf(k.split("|")[0])));
  const btn=(act,label,extra="",cls="btn")=>`<button type="button" class="${cls}" data-act="${act}" data-k="${k}" ${extra}>${label}</button>`;
  let h="";
  if(r||hasSide(s)){
    const rx=(part,i2)=>past?"":`<button type="button" class="rx" data-act="wRm" data-k="${k}" data-part="${part}"${i2!=null?` data-i="${i2}"`:""}>✕ Retirer</button>`;
    h+=r?`<div class="sl-line"><button type="button" class="slot-dish" data-act="viewRec" data-id="${esc(s.id)}"><strong>${esc(r.name)}&nbsp;›</strong><span class="muted" style="font-size:13px">${KIND_LABEL[kindOf(r)]}${cmShopBought(s)?" · acheté":s.lock?" · dans les courses":""}</span></button>${s.lock?"":rx("main")}</div>`
      :s.note||s.left?`<div class="sl-line"><strong>${s.note?"✏️ "+esc(s.note):"🥡 Restes : "+esc(s.left)}</strong>${rx(s.note?"note":"left")}</div><span class="muted" style="font-size:13px">Sans recette : rien à acheter, « Proposer ma semaine » ne le change pas.</span><div class="slot-acts2">${btn("freeNote","✏️ Noter autre chose")+btn("freeLeft","🥡 Restes")}${past?"":btn("pick","Choisir un plat à la place")}</div>`
      :`<div class="sl-line"><span class="muted">Plat à choisir</span>${past?"":btn("pick","+ Choisir un plat","","btn primary")}</div>`;
    ["entree","dessert"].forEach(c=>{if(s[c]&&recipes[s[c]])h+=`<div class="sl-line"><button type="button" class="slot-dish sub" data-act="viewRec" data-id="${esc(s[c])}">${c==="entree"?"Entrée":"Dessert"} : ${esc(recipes[s[c]].name)}&nbsp;›</button>${rx(c)}</div>`;});
    (s.extra||[]).forEach((t,j)=>{h+=`<div class="sl-line"><span class="muted" style="font-size:14px">En plus : ${esc(t)}</span>${rx("extra",j)}</div>`;});
    if(r&&!past){const nut=slotNut(s);const info=[showOn("nut")&&nut?fmtNut(nut,true):"",showOn("wine")?drinkLine(r):""].filter(Boolean).join(" · ");if(info)h+=`<span class="muted" style="font-size:13px">${esc(info)}</span>`;}
    if(r)h+=cmStatusChips(k,s);
    if(!past)h+=`<div class="pref-row"><div><strong>Personnes</strong></div><div class="ctl"><button class="step sm" data-act="serv" data-k="${k}" data-d="-1" ${s.n<=1?"disabled":""} aria-label="Une de moins">−</button><span class="n">${s.n}</span><button class="step sm" data-act="serv" data-k="${k}" data-d="1" aria-label="Une de plus">+</button></div></div>`;
    h+=`<div class="slot-acts2">`+(past?btn("openSide","+ En plus"):
      (r?(cmShopBought(s)?"":btn("slotValidate",s.lock?"✓ Dans les courses · ingrédients":"🛒 Ajouter aux courses","","btn primary"))+(s.lock?"":btn("swap","↻ Changer de plat"))+`<button type="button" class="btn" data-act="viewRec" data-id="${esc(s.id)}">📖 Voir la recette</button>`:"")
      +btn("pick",s.entree?"↻ Entrée":"+ Entrée",'data-role="entree"')+btn("pick",s.dessert?"↻ Dessert":"+ Dessert",'data-role="dessert"')
      +btn("openSide","+ En plus")+(s.lock?"":btn("slotClear","Vider la case","","btn danger")))+`</div>`;
  }else h+=(past?`<p class="muted">Aucun repas noté ce jour-là.</p>`:"")+`<div class="slot-acts2">${past?"":btn("pick","+ Choisir un plat")}${btn("freeNote","✏️ Noter un repas")}${btn("freeLeft","🥡 Restes")}</div>`;
  $("#slotBody").innerHTML=h;
}
function weekText(){
  const ws=weekStartDate(),lines=["Menus de la semaine du "+shortDate(ws),""];
  DAYS.forEach((d,i)=>{const part=m=>{const s=W()[slotKey(d,m)],r=s&&recipes[s.id];if(!r)return s&&(s.left||s.note)?(m==="midi"?"midi ":"soir ")+(s.note||"restes ("+s.left+")"):"";
      const x=[s.entree&&recipes[s.entree]?"entrée : "+recipes[s.entree].name:"",s.dessert&&recipes[s.dessert]?"dessert : "+recipes[s.dessert].name:""].filter(Boolean);
      return(m==="midi"?"midi ":"soir ")+r.name+(x.length?" ("+x.join(", ")+")":"");};
    const p=[part("midi"),part("soir")].filter(Boolean);if(p.length)lines.push(d+" "+addDays(ws,i).getDate()+" : "+p.join(" · "));});
  return lines.join("\n");
}
async function shareWeek(){const t=weekText();
  if(navigator.share){try{await navigator.share({title:"Menus de la semaine",text:t});return;}catch(e){if(e&&e.name==="AbortError")return;}}
  try{await navigator.clipboard.writeText(t);toast("Menus copiés : collez-les où vous voulez");}catch(e){toast("Partage impossible ici");}}
function printWeek(){
  const ws=weekStartDate();
  $("#printArea").innerHTML=`<h1>Menus · semaine du ${esc(shortDate(ws))}</h1><table><thead><tr><th></th><th>Midi</th><th>Soir</th></tr></thead><tbody>${DAYS.map((d,i)=>{const c=m=>{const s=W()[slotKey(d,m)],r=s&&recipes[s.id];if(!r)return s&&s.note?`<td><b>${esc(s.note)}</b></td>`:s&&s.left?`<td><b>Restes</b><br><small>${esc(s.left)}</small></td>`:"<td></td>";
      return`<td><b>${esc(r.name)}</b>${s.entree&&recipes[s.entree]?`<br><small>Entrée : ${esc(recipes[s.entree].name)}</small>`:""}${s.dessert&&recipes[s.dessert]?`<br><small>Dessert : ${esc(recipes[s.dessert].name)}</small>`:""}</td>`;};
    return`<tr><th>${d}<br><small>${addDays(ws,i).getDate()}</small></th>${c("midi")}${c("soir")}</tr>`;}).join("")}</tbody></table>`;
  setTimeout(()=>window.print(),60);
}

$("#slotSheet").addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(b&&["viewRec","swap","pick","openSide"].includes(b.dataset.act))$("#slotSheet").hidden=true;},true);
/* ---------- "+ Menu": pick one or several meals; on a meal already planned, choose what to do ---------- */
let addId=null, addRole="main", addWeek=null, addSel=new Map(), addInit=new Map(), addAsk=null, addN=4, addN0=4;
const ROLE_FIELD={main:"id",entree:"entree",dessert:"dessert"};
const ROLE_AS={main:"en plat",entree:"en entrée",dessert:"en dessert"};
// a meal can hold a starter or dessert while its main dish is still to choose
const hasSide=s=>!!s&&(!!recipes[s.entree]||!!recipes[s.dessert]||!!(s.extra||[]).length||!!s.left||!!s.note); // s.left = « 🥡 Restes », s.note = « ✏️ repas noté » (sans recette)
const slotUsed=s=>!!s&&(!!recipes[s.id]||hasSide(s));
function openAdd(id){
  const r=recipes[id];if(!r)return;addId=id;
  addRole=r.cat==="Dessert"?"dessert":(r.cat==="Entrée"&&!canMain(r))?"entree":"main"; // used on free meals
  addWeek=curWeek;addAsk=null;addSel=new Map();addN=viewServ[id]||menu.people;
  for(const w of weekOptions().map(x=>x[0]))for(const[k,s]of Object.entries((menu.weeks||{})[w]||{})){if(!s)continue;
    const role=s.id===addId?"main":s.entree===addId?"entree":s.dessert===addId?"dessert":null;if(role)addSel.set(w+"#"+k,role);}
  addInit=new Map(addSel);
  {const first=[...addSel].find(([,r])=>r==="main");if(first){const[w,k]=first[0].split("#");addN=((menu.weeks[w]||{})[k]||{}).n||addN;}} // already planned: start from its number of people
  addN0=addN;renderAdd();$("#addSheet").hidden=false;$("#addSheet .sheet-in").scrollTop=0;
}
function addChanges(){let add=0,rem=0;if(addN!==addN0)for(const[k,r]of addSel)if(addInit.get(k)===r&&r==="main")add++;for(const k of new Set([...addInit.keys(),...addSel.keys()])){const a=addInit.get(k),b=addSel.get(k);if(a===b)continue;if(b)add++;else rem++;}return[add,rem];}
function renderAdd(){
  const r=recipes[addId];if(!r){$("#addSheet").hidden=true;return;}
  $("#addTitle").textContent="Ajouter « "+r.name+" »";
  $("#addPeople").innerHTML=`<div><strong>Pour combien de personnes ?</strong><div class="muted" style="font-size:13px">recette prévue pour ${r.serves||4} · modifiable ensuite</div></div><div class="ctl"><button type="button" class="step sm" data-act="addNum" data-d="-1" ${addN<=1?"disabled":""} aria-label="Une personne de moins">−</button><span class="n">${addN}</span><button type="button" class="step sm" data-act="addNum" data-d="1" aria-label="Une personne de plus">+</button></div>`;
  $("#addWeeks").innerHTML=weekOptions().slice(0,2).map(([v,l])=>`<button type="button" class="chip" data-act="addWeekSel" data-w="${v}" aria-pressed="${addWeek===v}">${l} · ${shortDate(parseYmd(v))}</button>`).join("");
  const wk=(menu.weeks||{})[addWeek]||{}, ws=parseYmd(addWeek), today=ymd(new Date());
  const nm=id=>recipes[id]?recipes[id].name:"";
  const cell=(d,i,m)=>{const k=slotKey(d,m),key=addWeek+"#"+k,s=wk[k],past=ymd(addDays(ws,i))<today,role=addSel.get(key);
    let note=past?"passé":!slotUsed(s)?"Libre":recipes[s.id]?nm(s.id)+(s.lock?" 🛒":""):"plat à choisir";
    if(role)note=ROLE_AS[role]+(role==="main"&&s&&recipes[s.id]&&s.id!==addId?" · remplace "+nm(s.id):"");
    else if(!past&&slotUsed(s))note+=" · toucher pour choisir";
    return`<button type="button" class="as${role?" on":""}${past?" dis":""}${addAsk===key?" ask":""}" data-act="addCell" data-key="${key}" ${past?"disabled":""}>${role?"✓ ":""}${m==="midi"?"Midi":"Soir"}<small>${esc(note)}</small></button>`;};
  const ask=()=>{if(!addAsk||!addAsk.startsWith(addWeek+"#"))return"";const k=addAsk.split("#")[1],s=wk[k]||{};
    const opt=(role,title,sub,dis)=>`<button type="button" class="btn" data-act="addAs" data-role="${role}" ${dis?"disabled":""}><span>${title}${sub?`<small>${esc(sub)}</small>`:""}</span></button>`;
    return`<div class="aask"><b>${esc(slotLabel(k))} : que faire de « ${esc(r.name)} » ?</b>
      ${opt("main",recipes[s.id]?"Remplacer le plat":"Mettre en plat",recipes[s.id]?(s.lock?"repas dans les courses":"à la place de "+nm(s.id)):"",s.lock&&recipes[s.id])}
      ${opt("entree","Mettre en entrée",s.entree&&recipes[s.entree]?"à la place de "+nm(s.entree):recipes[s.id]?"avant "+nm(s.id):"")}
      ${opt("dessert","Mettre en dessert",s.dessert&&recipes[s.dessert]?"à la place de "+nm(s.dessert):recipes[s.id]?"après "+nm(s.id):"")}
      <button type="button" class="btn ghost" data-act="addAskNo">Annuler</button></div>`;};
  $("#addGrid").innerHTML=DAYS.map((d,i)=>{const row=`<span class="ad">${d.slice(0,3)} ${addDays(ws,i).getDate()}</span>${cell(d,i,"midi")}${cell(d,i,"soir")}`;
    return row+(addAsk&&addAsk.startsWith(addWeek+"#"+d+"|")?ask():"");}).join("");
  const[add,rem]=addChanges();
  $("#addOk").textContent=add||rem?[add?`Ajouter ${add} repas aux courses`:"",rem?`retirer de ${rem}`:""].filter(Boolean).join(", "):"Touchez un ou plusieurs repas";
  $("#addOk").disabled=!(add||rem);
}
function addCellTap(key){
  if(addSel.has(key)){addSel.delete(key);addAsk=null;renderAdd();return;}
  const[w,k]=key.split("#"),s=((menu.weeks||{})[w]||{})[k];
  if(!slotUsed(s)){addSel.set(key,addRole);addAsk=null;}else addAsk=addAsk===key?null:key; // a planned meal: ask what to do
  renderAdd();
}
function applyAdd(){
  let n=0;
  for(const key of new Set([...addInit.keys(),...addSel.keys()])){const was=addInit.get(key),now=addSel.get(key);
    if(was===now){if(now==="main"&&addN!==addN0){const[w,k]=key.split("#"),s=(menu.weeks[w]||{})[k];if(s){s.n=addN;n++;}}continue;}
    const[w,k]=key.split("#");menu.weeks[w]=menu.weeks[w]||{};const wk=menu.weeks[w];
    if(was&&wk[k]){const s=wk[k];
      if(was==="main"){if(!s.lock){if(hasSide(s))delete s.id;else delete wk[k];}}
      else{delete s[ROLE_FIELD[was]];if(!slotUsed(s))delete wk[k];}}
    if(now){const s=wk[k]||{};
      wk[k]=Object.assign({n:addN},s,{[ROLE_FIELD[now]]:addId});if(now==="main"&&(wk[k].left||wk[k].note)){delete wk[k].left;delete wk[k].note;delete wk[k].keep;}if(now==="main"||!slotUsed(s))wk[k].n=addN;n++;} // a starter or dessert joins the meal's own number of people
  }
  $("#addSheet").hidden=true;addAsk=null;if(addId===ideaId)ideaId=null;render();saveMenu();
  document.querySelectorAll(`#frOut [data-act=toggle][data-id="${addId}"]`).forEach(x=>{const on=onMenu(addId);x.classList.toggle("on",on);x.textContent=on?"✓ Au menu":"+ Menu";});
  toast(n?`« ${recipes[addId].name} » ajouté à ${n} repas`:"Menu mis à jour");
}

/* ---------- removing with "Annuler" ---------- */
let undoStack=[], undoTimer=null;
function snapshotSlot(k){const s=W()[k];return{w:curWeek,k,before:s?JSON.parse(JSON.stringify(s)):null};}
function showUndo(label,snap){undoStack.push(snap);if(undoStack.length>20)undoStack.shift();
  const bar=$("#undoBar");$("#undoText").textContent="Retiré : "+label;bar.hidden=false;clearTimeout(undoTimer);undoTimer=setTimeout(()=>{bar.hidden=true;},7000);}
function undoRemove(){const u=undoStack.pop();if(!u)return;
  if(u.type==="shop"){Object.assign(menu,u.before);render();saveMenu();if(!undoStack.length)$("#undoBar").hidden=true;toast("Liste remise comme avant");return;}
  menu.weeks[u.w]=menu.weeks[u.w]||{};
  if(u.before)menu.weeks[u.w][u.k]=u.before;else delete menu.weeks[u.w][u.k];
  render();saveMenu();if(u.w===curWeek)flashSlot(u.k);
  if(undoStack.length){$("#undoText").textContent="Remis. Encore "+undoStack.length+" retrait"+(undoStack.length>1?"s":"")+" à annuler";clearTimeout(undoTimer);undoTimer=setTimeout(()=>{$("#undoBar").hidden=true;},7000);}
  else $("#undoBar").hidden=true;toast("Remis comme avant");}
// remove part of a meal: main dish (whole meal), starter, dessert or one "en plus"
function removePart(k,part,i){
  const s=W()[k];if(!s||isPast(k))return;if(part==="main"&&s.lock){toast("Ce repas est dans les courses : retirez-le d'abord des courses");return;}
  const snap=snapshotSlot(k);let label="";
  if(part==="main"){label=(recipes[s.id]||{}).name||"le plat";if(hasSide(s)){delete s.id;delete s.lock;}else delete W()[k];} // the starter and dessert stay
  else if(part==="entree"||part==="dessert"){label=(recipes[s[part]]||{}).name||part;delete s[part];}
  else if(part==="extra"){const xs=s.extra||[];label=xs[Number(i)]||"";xs.splice(Number(i),1);if(!xs.length)delete s.extra;}
  else if(part==="left"){label="les restes";delete s.left;delete s.keep;}
  else if(part==="note"){label=s.note||"le repas noté";delete s.note;delete s.keep;}
  if(W()[k]&&!slotUsed(W()[k]))delete W()[k];
  render();saveMenu();showUndo(label+" ("+slotLabel(k)+")",snap);
}

