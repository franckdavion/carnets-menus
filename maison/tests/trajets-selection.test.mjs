// Tests de non-régression de la sélection mensuelle des trajets.
// Fonctions extraites du code réellement chargé par Maisonnée, sans base de données.
// Aucun appel Google/Supabase, aucune écriture de kilométrage.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"maison/presences-trajets.js"),"utf8");
const a=source.indexOf("function ptChangeMonth(");
const b=source.indexOf("function ptOptions(",a);
assert.ok(a>=0&&b>a,"Fonctions de sélection Trajets introuvables");
const fragment=source.slice(a,b);
assert.ok(!/\b(fetch|supabase|\.from\s*\(|\.insert\s*\(|\.upsert\s*\()/.test(fragment),
  "Le module de sélection semble appeler une écriture externe : vérifier avant de tester");

const counts={sync:0,render:0,softRender:0,forms:[],toasts:[],close:0};
const PT={
 month:"2026-11",monthSynced:"2026-11",child:"",
 suggestions:[
  {key:"a",day:"2026-11-02",child_id:"matheo"},
  {key:"b",day:"2026-11-09",child_id:"matheo"}, // date future
  {key:"c",day:"2026-11-03",child_id:"kais"}
 ],ruleExcluded:[],selected:new Set(),batch:[],batchTotal:0,
};
const original=JSON.stringify(PT.suggestions);
const library=new Function("env",`
 const PT=env.PT;
 const today=env.today,ptIncludesChild=env.ptIncludesChild,ptDisplayedSuggestions=env.ptDisplayedSuggestions;
 const ptRenderSelectionNow=env.render,ptSync=env.sync,softRender=env.softRender;
 const toast=env.toast,ptTripForm=env.form,closeSheet=env.close;
 ${fragment}
 return {ptChangeMonth,ptSelectedTrips,ptSelectAll,ptClearSelection,ptBatchStart,ptBatchStop,ptBatchAdvance};
`)({
 PT,
 today:()=>"2026-11-06",
 ptIncludesChild:(event,id)=>!id||event.child_id===id,
 ptDisplayedSuggestions:items=>items.map(event=>({event,group:[event]})),
 render:()=>counts.render++,
 sync:()=>counts.sync++,
 softRender:()=>counts.softRender++,
 toast:message=>counts.toasts.push(message),
 form:event=>counts.forms.push(event.key),
 close:()=>counts.close++,
});
let passed=0;
function check(label,fn){fn();passed++;console.log("✓ "+label);}

check("Ne sélectionner que des dates déjà passées",()=>assert.deepEqual(library.ptSelectedTrips().map(x=>x.event.key),["a","c"]));
check("Tout sélectionner exclut les déplacements futurs",()=>{library.ptSelectAll();assert.deepEqual([...PT.selected].sort(),["a","c"]);});
check("Une sélection seule ne déclenche aucun formulaire ni enregistrement",()=>assert.equal(counts.forms.length,0));
check("Commencer le lot ouvre uniquement le premier trajet sélectionné",()=>{library.ptBatchStart();assert.deepEqual(PT.batch,["a","c"]);assert.deepEqual(counts.forms,["a"]);});
check("Un déplacement traité est retiré de la sélection",()=>{library.ptBatchAdvance([{key:"a"}]);assert.ok(!PT.selected.has("a"));assert.deepEqual(counts.forms,["a","c"]);});
check("La fin du lot ne valide pas les autres trajets",()=>{library.ptBatchAdvance([{key:"c"}]);assert.equal(PT.batch.length,0);assert.equal(PT.selected.size,0);assert.ok(counts.toasts.at(-1).includes("Le reste du mois"));});
check("Sans sélection, aucun lot ne démarre",()=>{library.ptBatchStart();assert.equal(PT.batch.length,0);assert.ok(counts.toasts.at(-1).includes("Cochez"));});
check("Le filtre par enfant limite les trajets",()=>{PT.child="matheo";assert.deepEqual(library.ptSelectedTrips().map(x=>x.event.key),["a"]);});
check("Annuler la sélection vide le lot",()=>{PT.selected.add("a");PT.batch=["a"];PT.batchTotal=1;library.ptClearSelection();assert.equal(PT.selected.size,0);assert.equal(PT.batch.length,0);assert.equal(PT.batchTotal,0);});
check("Annuler le lot ferme la fenêtre sans enregistrer",()=>{PT.batch=["a"];PT.batchTotal=1;library.ptBatchStop();assert.equal(counts.close,1);assert.equal(PT.batch.length,0);});
check("Changer de mois réinitialise les sélections",()=>{PT.selected.add("a");library.ptChangeMonth("2026-10");assert.equal(PT.month,"2026-10");assert.equal(PT.selected.size,0);assert.equal(PT.batch.length,0);});
check("Changer de mois déclenche un rafraîchissement",()=>{assert.ok(counts.render>=1);assert.equal(counts.sync,1);});
check("Un mois invalide est refusé sans nouvelle synchronisation",()=>{library.ptChangeMonth("2026-13");assert.equal(PT.month,"2026-10");assert.equal(counts.sync,1);});
check("Rechoisir le même mois ne recharge pas les données",()=>{library.ptChangeMonth("2026-10");assert.equal(counts.sync,1);});
check("Les événements fictifs initiaux n'ont pas été altérés",()=>assert.equal(original,JSON.stringify([
 {key:"a",day:"2026-11-02",child_id:"matheo"},
 {key:"b",day:"2026-11-09",child_id:"matheo"},
 {key:"c",day:"2026-11-03",child_id:"kais"},
])));
console.log(`Trajets : ${passed} contrôles réussis, aucun enregistrement réel.`);
