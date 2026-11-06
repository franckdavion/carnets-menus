/**
 * Archivage réversible de trois anciennes branches Agenda / Trajets.
 * Exécution exclusivement via le workflow de test, en trois étapes :
 * simulation, création/vérification des tags, suppression sous garde-fous.
 * Ni main, ni les données Supabase, ni l'application ne sont modifiées.
 */
const REPO="franckdavion/carnets-menus";
const EXPECTED_MAIN="3f11f57eed0529bf488402b783f0666e7796e2df";
const entries=[
  {branch:"test-agenda-plus-google-style-20261104",sha:"3986607192a2da4c5e6ec5422b84fbc5dfbba361"},
  {branch:"test-presences-trajets-exclusions-20261105",sha:"79388ac3bec25881a53cd74a34cc0c10a5b3a512"},
  {branch:"test-selection-mensuelle-trajets-20261105",sha:"6eb18be2ca3dae1ffe48b977d411e09b943af812"}
].map(e=>({...e,tag:"archive/2026-11-06/"+e.branch}));
const mode=process.env.ARCHIVE_MODE||"simulation";
if(!["simulation","archivage","suppression"].includes(mode))throw Error("Mode non autorise");
if(process.env.GITHUB_REPOSITORY!==REPO ||
   process.env.GITHUB_REF!=="refs/heads/test" ||
   process.env.GITHUB_EVENT_NAME!=="push")throw Error("Le workflow doit fonctionner sur test seulement");
if(!process.env.GITHUB_TOKEN)throw Error("Jeton absent");
if(mode!=="simulation"&&process.env.ARCHIVE_CONFIRMATION!=="ARCHIVER-TROIS-BRANCHES-20261106")
  throw Error("Confirmation d'archivage manquante");
async function gh(path,method="GET",body=null){
  const res=await fetch("https://api.github.com/repos/"+REPO+path,{
    method,
    headers:{
      Authorization:"Bearer "+process.env.GITHUB_TOKEN,
      Accept:"application/vnd.github+json",
      "X-GitHub-Api-Version":"2022-11-28",
      "User-Agent":"archive-agenda-trajets-20261106",
      ...(body?{"Content-Type":"application/json"}:{})
    },
    ...(body?{body:JSON.stringify(body)}:{})
  });
  if(method==="GET"&&res.status===404)return null;
  if(!res.ok)throw Error("GitHub "+res.status+" "+method+" "+path+" : "+(await res.text()).slice(0,300));
  return res.status===204?null:res.json();
}
async function checkProduction(){
  const main=await gh("/git/ref/heads/main");
  if(main?.object?.sha!==EXPECTED_MAIN)throw Error("main a evolue : arret preventif");
}
async function checkBranch(e){
  const [branch,ref,prs]=await Promise.all([
    gh("/branches/"+encodeURIComponent(e.branch)),
    gh("/git/ref/heads/"+encodeURIComponent(e.branch)),
    gh("/pulls?state=open&head="+encodeURIComponent("franckdavion:"+e.branch)+"&per_page=20")
  ]);
  if(!branch||branch.protected||branch.commit?.sha!==e.sha||
     ref?.object?.sha!==e.sha||!Array.isArray(prs)||prs.length)
    throw Error("Branche modifiee, protegee ou associee a une PR ouverte : "+e.branch);
}
async function tagRef(e){
  return gh("/git/ref/tags/"+e.tag);
}
async function assertTag(e){
  const ref=await tagRef(e);
  if(!ref||ref.ref!=="refs/tags/"+e.tag||
     ref.object?.sha!==e.sha||ref.object?.type!=="commit")
    throw Error("Archive manquante ou incorrecte : "+e.tag);
}
await checkProduction();
if(mode==="simulation"){
  for(const e of entries){
    await checkBranch(e);
    const existing=await tagRef(e);
    if(existing&&(existing.object?.sha!==e.sha||existing.object?.type!=="commit"))
      throw Error("Conflit avec un tag existant : "+e.tag);
    console.log("[SIMULATION] "+e.branch+" ("+e.sha+") -> "+e.tag);
  }
  console.log("[OK] Trois branches verifiees, aucune ecriture");
}else if(mode==="archivage"){
  for(const e of entries){
    await checkProduction();await checkBranch(e);
    const existing=await tagRef(e);
    if(!existing)await gh("/git/refs","POST",{ref:"refs/tags/"+e.tag,sha:e.sha});
    await assertTag(e);
    console.log("[ARCHIVE VERIFIEE] "+e.tag+" -> "+e.sha);
  }
  for(const e of entries)await assertTag(e);
  console.log("[OK] Les trois commits complets sont conserves par tags");
}else{
  for(const e of entries){await assertTag(e);await checkBranch(e);}
  await checkProduction();
  for(const e of entries){
    await assertTag(e);await checkBranch(e);await checkProduction();
    await gh("/git/refs/heads/"+encodeURIComponent(e.branch),"DELETE");
    await assertTag(e);
    const after=await gh("/git/ref/heads/"+encodeURIComponent(e.branch));
    if(after)throw Error("Branche toujours active : "+e.branch);
    console.log("[RANGEE] "+e.branch+" ; archive intacte : "+e.tag);
  }
  console.log("[OK] Trois branches rangees, main et Supabase inchanges");
}