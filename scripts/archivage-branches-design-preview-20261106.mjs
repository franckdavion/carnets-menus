/**
 * Archivage sécurisé de DEUX anciennes branches de présentation.
 * La branche entière est conservée via une étiquette Git légère portant
 * exactement son SHA AVANT toute suppression de sa référence de branche.
 * N'écrit jamais dans main, Supabase ni dans les fichiers de l'application.
 */
const REPO="franckdavion/carnets-menus";
const EXPECTED_MAIN="3f11f57eed0529bf488402b783f0666e7796e2df";
const items=[
  {branch:"design-c-ultra-premium-accueil-explorer",sha:"581933e071b2fbbf4084317fafe4964492eb5dd6",tag:"archive/2026-11-06/design-c-ultra-premium-accueil-explorer"},
  {branch:"online-preview-maisonnee-agenda-20261104",sha:"27f6bb2ce3bcef2b3303cd5dcf6d7ed24fda263e",tag:"archive/2026-11-06/online-preview-maisonnee-agenda-20261104"},
];
const mode=process.env.ARCHIVE_MODE||"simulation";
if(!["simulation","archivage","suppression"].includes(mode))throw Error("Mode interdit");
if(process.env.GITHUB_REPOSITORY!==REPO ||
   process.env.GITHUB_REF!=="refs/heads/test" ||
   process.env.GITHUB_EVENT_NAME!=="push")throw Error("Contexte interdit");
if(!process.env.GITHUB_TOKEN)throw Error("Jeton manquant");
if(mode!=="simulation"&&process.env.ARCHIVE_CONFIRMATION!=="ARCHIVER-AVANT-DE-SUPPRIMER-20261106")
  throw Error("Confirmation manquante");
async function gh(path,method="GET",body=null){
  const r=await fetch("https://api.github.com/repos/"+REPO+path,{
    method,
    headers:{
      Authorization:"Bearer "+process.env.GITHUB_TOKEN,
      Accept:"application/vnd.github+json",
      "X-GitHub-Api-Version":"2022-11-28",
      "User-Agent":"branch-archive-20261106",
      ...(body?{"Content-Type":"application/json"}:{})
    },
    ...(body?{body:JSON.stringify(body)}:{})
  });
  if(method==="GET"&&r.status===404)return null;
  if(!r.ok)throw Error("GitHub "+r.status+" "+method+" "+path+": "+(await r.text()).slice(0,200));
  return r.status===204?null:r.json();
}
async function checkMain(){
  const m=await gh("/git/ref/heads/main");
  if(m?.object?.sha!==EXPECTED_MAIN)throw Error("Production a changé : aucune action");
}
async function branchCheck(x){
  const [b,ref,prs]=await Promise.all([
    gh("/branches/"+encodeURIComponent(x.branch)),
    gh("/git/ref/heads/"+encodeURIComponent(x.branch)),
    gh("/pulls?state=open&head="+encodeURIComponent("franckdavion:"+x.branch)+"&per_page=5")
  ]);
  if(!b||b.protected||b.commit?.sha!==x.sha||ref?.object?.sha!==x.sha ||
     !Array.isArray(prs)||prs.length)throw Error("Branche différente, protégée ou PR ouverte : "+x.branch);
}
async function archived(x){
  const ref=await gh("/git/ref/tags/"+x.tag);
  if(!ref||ref.ref!=="refs/tags/"+x.tag||ref.object?.sha!==x.sha||ref.object?.type!=="commit")
    throw Error("L'archive Git manque ou ne correspond pas : "+x.branch);
}
await checkMain();
if(mode==="simulation"){
  for(const x of items){
    await branchCheck(x);
    const tag=await gh("/git/ref/tags/"+x.tag);
    if(tag && (tag.object?.sha!==x.sha||tag.object?.type!=="commit"))
      throw Error("Un tag existe avec un contenu différent : "+x.tag);
    console.log("[SIMULATION] "+x.branch+" ; commit "+x.sha+" ; archive "+x.tag);
  }
  console.log("[SIMULATION] 2 branches candidates ; aucune écriture.");
}else if(mode==="archivage"){
  // Phase 1 : jamais de suppression. Créer et vérifier les DEUX tags.
  for(const x of items){
    await branchCheck(x);
    const existing=await gh("/git/ref/tags/"+x.tag);
    if(existing){
      await archived(x);
      console.log("[CONSERVEE] Archive existante et identique "+x.tag);
    }else{
      await gh("/git/refs","POST",{ref:"refs/tags/"+x.tag,sha:x.sha});
      await archived(x);
      console.log("[ARCHIVEE] "+x.branch+" => "+x.tag+" ("+x.sha+")");
    }
  }
  for(const x of items)await archived(x);
  console.log("[ARCHIVAGE] Tous les commits et fichiers historiques sont accessibles par tag.");
}else{
  // Phase 2 : suppression uniquement si les DEUX archives existent et si rien n'a changé.
  for(const x of items){await archived(x);await branchCheck(x);}
  await checkMain();
  for(const x of items){
    await archived(x);await branchCheck(x);await checkMain();
    await gh("/git/refs/heads/"+encodeURIComponent(x.branch),"DELETE");
    await archived(x);
    console.log("[SUPPRIMEE AVEC ARCHIVE] "+x.branch+" => "+x.tag);
  }
  console.log("[TERMINE] 2 références de branches supprimées ; 2 tags de sauvegarde vérifiés.");
}
