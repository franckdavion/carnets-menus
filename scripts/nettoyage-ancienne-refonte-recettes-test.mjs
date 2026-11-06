/**
 * Suppression exceptionnelle d'UNE ancienne branche, uniquement depuis `test`.
 * Ne modifie aucun fichier de `main`, aucune recette et aucune donnée Supabase.
 * Deux controles independants avant suppression, refus en cas de divergence.
 */
const REPO="franckdavion/carnets-menus";
const OLD="test-refonte-recettes-photos-20261105";
const EXPECTED_OLD="06218c3c769d833779af2821ec07fc58b7fcbbeb";
const EXPECTED_MAIN="3f11f57eed0529bf488402b783f0666e7796e2df";
const ORIGINAL_BASE="93d49b2bc681dc44a10d65bbe3d8dc80f303fae5";
const FILES=new Map([
  ["index.html","8bea21853d709b79af662608b4a544667f893675"],
  ["carnet.css","538dc5d04e135705ae46645bd50fae779a5ee3ea"],
  ["carnet-partage.js","e3ffb6e1b4019b335f60258b569ebcfe4c35f750"],
]);
const mode=process.env.CLEANUP_MODE||"simulation";
const allowed=process.env.GITHUB_REPOSITORY===REPO &&
 process.env.GITHUB_REF==="refs/heads/test" &&
 process.env.GITHUB_EVENT_NAME==="push";
if(!allowed)throw Error("Refuse : contexte ou dépôt inattendu");
if(!["simulation","suppression"].includes(mode))throw Error("Mode invalide");
if(mode==="suppression" && process.env.CLEANUP_CONFIRMATION!=="UNE-BRANCHE-RECETTES-VERIFIEE")throw Error("Confirmation absente");
if(!process.env.GITHUB_TOKEN)throw Error("Token absent");
async function github(path,method="GET"){
 const r=await fetch("https://api.github.com/repos/"+REPO+path,{
   method,headers:{
     Authorization:"Bearer "+process.env.GITHUB_TOKEN,
     Accept:"application/vnd.github+json",
     "X-GitHub-Api-Version":"2022-11-28",
     "User-Agent":"recettes-legacy-cleanup",
   }
 });
 if(r.status===404 && method==="GET")return null;
 if(!r.ok)throw Error("GitHub "+r.status+" "+method+" "+path+": "+(await r.text()).slice(0,180));
 return r.status===204?null:r.json();
}
async function verify(){
 const [main,old,openPrs,diff,mt,bt]=await Promise.all([
   github("/branches/main"),
   github("/branches/"+OLD),
   github("/pulls?state=open&head=franckdavion%3A"+OLD+"&per_page=1"),
   github("/compare/"+ORIGINAL_BASE+"..."+OLD),
   github("/git/trees/main?recursive=1"),
   github("/git/trees/"+OLD+"?recursive=1"),
 ]);
 if(!main || main.commit?.sha!==EXPECTED_MAIN)throw Error("main a évolué : annulation");
 if(!old || old.commit?.sha!==EXPECTED_OLD || old.protected)throw Error("ancienne branche absente, modifiée ou protégée");
 if(!Array.isArray(openPrs)||openPrs.length)throw Error("PR ouverte ou réponse inattendue");
 if(!diff || diff.ahead_by!==8 || !Array.isArray(diff.files) ||
    diff.files.length!==FILES.size ||
    diff.files.some(f=>!FILES.has(f.filename)))throw Error("Périmètre de l'ancienne branche changé");
 if(!mt || !bt || mt.truncated || bt.truncated ||
    !Array.isArray(mt.tree) || !Array.isArray(bt.tree))throw Error("Arbre manquant ou incomplet");
 const current=new Map(mt.tree.map(f=>[f.path,f.sha]));
 const legacy=new Map(bt.tree.map(f=>[f.path,f.sha]));
 for(const [path,sha] of FILES){
   if(current.get(path)!==sha || legacy.get(path)!==sha)throw Error("Contenu non identique: "+path);
 }
 const [mainRef,oldRef]=await Promise.all([
    github("/git/ref/heads/main"),github("/git/ref/heads/"+OLD),
 ]);
 if(mainRef?.object?.sha!==EXPECTED_MAIN || oldRef?.object?.sha!==EXPECTED_OLD)
   throw Error("Référence déplacée depuis la comparaison");
 return true;
}
await verify();
if(mode==="simulation"){
 console.log("[SIMULATION] Une branche Recettes strictement redondante : aucune suppression.");
}else{
 // Vérification répétée juste avant l'action irréversible.
 await verify();
 await github("/git/refs/heads/"+OLD,"DELETE");
 console.log("[SUPPRIMEE] "+OLD+" — tous les fichiers modifiés sont dans main.");
}
