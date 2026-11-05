/**
 * Nettoyage exceptionnel des 10 branches deja integrees dans main.
 * Mode simulation par defaut ; liste blanche nominative + SHA immuable.
 * Ce script refuse tout depot, branche ou evenement inattendu.
 */
const REPOSITORY = 'franckdavion/carnets-menus';
const MAIN = 'main';
const CONFIRMATION = 'SUPPRIMER-LES-10-BRANCHES-CONTROLEES';
const candidates = new Map([
  ['correctif-rafraichissement-trajets-20261105', '3209a2ebf045e99b728f9c4007314d7adfd26cb9'],
  ['publication-presences-trajets-20261105', '0e14375fe2fc57ccff063c7f1d1b866da4dc73e0'],
  ['sauvegarde-avant-correctif-sync-trajets-20261105', 'e117c88adde56146d1c8baf0191145c9e969d283'],
  ['sauvegarde-avant-courses-hors-ligne-20261105', '84a65c5348f0b7a47409c394fa9deb93de7056a7'],
  ['sauvegarde-avant-publication-maisonnee-2026-11-04', '63fb18f28feddd9c11cd5b0994db8507438cc8b7'],
  ['sauvegarde-avant-publication-repas-google-20261105', 'c14f54551b4b36b3aa7dceea2ef784be8645d450'],
  ['sauvegarde-avant-trajets-20261105', '4fc8e3a131d6c02f829f0fb9fb56798d39107edd'],
  ['sauvegarde-main-avant-publication-v1-20261104', '8ec7e2b81661b687a49775182d5938ba1807e5ac'],
  ['sauvegarde-main-avant-v1-20261104', '92d1b565dd203dc74cff45781de42772b87bf49f'],
  ['test-agenda-mois-repliable-20261104', '17580102c027da65b7bb86c69f7d58663131f7f5'],
]);

const mode = process.env.CLEANUP_MODE || 'simulation';
if (!['simulation', 'suppression'].includes(mode)) throw Error('Mode inconnu : aucune suppression');
if (mode === 'suppression' && process.env.CLEANUP_CONFIRMATION !== CONFIRMATION)
  throw Error('Phrase de confirmation incorrecte : aucune suppression');
// Simulation sur la Pull Request ; sur main, simulation puis nettoyage apres
// fusion explicitement demandee. Tout autre contexte est refuse.
const event = process.env.GITHUB_EVENT_NAME;
const ref = process.env.GITHUB_REF;
const inMain = ref === `refs/heads/${MAIN}` && ['workflow_dispatch', 'push'].includes(event);
const inReview = event === 'pull_request' &&
  (ref || '').startsWith('refs/pull/') &&
  (ref || '').endsWith('/merge') &&
  process.env.GITHUB_BASE_REF === MAIN;
if (process.env.GITHUB_REPOSITORY !== REPOSITORY ||
    !(mode === 'simulation' ? (inReview || inMain) : inMain))
  throw Error('Contexte inattendu : aucune suppression');
if (!process.env.GITHUB_TOKEN) throw Error('Jeton GitHub absent');

const base = `/repos/${REPOSITORY}`;
async function github(path, method = 'GET') {
  const response = await fetch(`https://api.github.com${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'carnet-menus-branch-cleanup',
    },
  });
  if (response.status === 404 && method === 'GET') return null;
  if (!response.ok) throw Error(`GitHub ${response.status} ${method} ${path} : ${(await response.text()).slice(0, 300)}`);
  return response.status === 204 ? null : response.json();
}

// Fail-closed : la liste des candidats est fixe, on ne parcourt jamais les autres branches.
let eligible = 0;
let skipped = 0;
let deleted = 0;
for (const [name, expectedSha] of candidates) {
  try {
    const branch = await github(`/branches/${encodeURIComponent(name)}`);
    if (!branch) { console.log(`[IGNORE] ${name} : deja absente`); skipped++; continue; }
    if (branch.protected || branch.commit?.sha !== expectedSha) {
      console.log(`[PROTEGEE] ${name} : branche protegee ou commit modifie`); skipped++; continue;
    }
    const diff = await github(`/compare/${MAIN}...${encodeURIComponent(name)}`);
    if (!diff || diff.ahead_by !== 0 || !['behind', 'identical'].includes(diff.status)) {
      console.log(`[PROTEGEE] ${name} : contient des commits non integres`); skipped++; continue;
    }
    const openPrs = await github(`/pulls?state=open&head=${encodeURIComponent(`franckdavion:${name}`)}&per_page=1`);
    if (!Array.isArray(openPrs) || openPrs.length) {
      console.log(`[PROTEGEE] ${name} : PR ouverte ou verification impossible`); skipped++; continue;
    }
    // Verifier a nouveau la reference, juste avant l'operation irreversible.
    const current = await github(`/git/ref/heads/${encodeURIComponent(name)}`);
    if (!current || current.object?.sha !== expectedSha) {
      console.log(`[PROTEGEE] ${name} : reference modifiee depuis le controle`); skipped++; continue;
    }
    eligible++;
    if (mode === 'simulation') {
      console.log(`[SIMULATION] ${name} : deletion possible, aucune action`);
      continue;
    }
    await github(`/git/refs/heads/${encodeURIComponent(name)}`, 'DELETE');
    deleted++;
    console.log(`[SUPPRIMEE] ${name}`);
  } catch (e) {
    // Ne pas supprimer les autres branches si GitHub renvoie une erreur inattendue.
    console.error(`[ERREUR] ${name} : ${String(e)}`);
    process.exitCode = 1;
    break;
  }
}
console.log(`Bilan ${mode} : ${eligible} eligibles, ${skipped} ignorees, ${deleted} supprimees.`);
