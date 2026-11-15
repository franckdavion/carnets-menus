const P = require("./carnet-photos.js");

async function wikiSearch(q) {
  const url = "https://fr.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=0&gsrlimit=8&prop=pageimages|description|extracts&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=640&gsrsearch=" + encodeURIComponent(q);
  const d = await (await fetch(url, { headers: { "User-Agent": "CarnetsMenusPhotoTest/1.0 (local; franck@local)" } })).json();
  return Object.values((d.query || {}).pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0)).map(pg => ({
    u: (pg.thumbnail && pg.thumbnail.source) || "",
    title: pg.title || "",
    desc: pg.description || "",
    extract: pg.extract || "",
    src: "Wikipédia"
  })).filter(x => x.u);
}

async function check(name, expectRejectTitles) {
  const qs = P.searchQueries(name);
  let all = [];
  for (const q of qs) all = all.concat(await wikiSearch(q));
  const auto = P.rank(name, all, "auto");
  const titles = all.map(c => c.title);
  const rejected = expectRejectTitles.filter(t => titles.some(x => x.toLowerCase().includes(t.toLowerCase())));
  const leaked = auto.filter(c => expectRejectTitles.some(t => (c.title || "").toLowerCase().includes(t.toLowerCase())));
  return { name, queries: qs, firstTitles: titles.slice(0, 6), autoTitles: auto.map(c => c.title + " (" + c.score + ")"), rejectedSeen: rejected, leaked: leaked.map(c => c.title) };
}

(async () => {
  const bowl = await check("Bowl poulet, boulgour et crudités", ["KFC", "Camilla", "Bowles"]);
  const vel = await check("Velouté de brocoli", []);
  const crab = await check("Bouchées de crabe", []);
  const borek = await check("Börek", []);
  const las = await check("Lasagnes bolognaises", []);
  const out = { bowl, vel, crab, borek, las };
  console.log(JSON.stringify(out, null, 2));
  if (bowl.leaked.length) {
    console.error("FAIL: off-topic auto for bowl:", bowl.leaked);
    process.exit(1);
  }
  if (!las.autoTitles.length) console.warn("WARN: no auto photo for lasagnes (network/filter)");
  console.log("live wiki: KFC/Camilla not auto-selected");
})().catch(e => { console.error(e); process.exit(1); });
