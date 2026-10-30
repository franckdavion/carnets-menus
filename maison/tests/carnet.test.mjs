import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const C = require("../../carnet-calc.js");
let fail = 0;
const ok = (name, cond) => { console.log((cond ? "ok  " : "FAIL ") + name); if (!cond) fail++; };

const quiche = { name: "Quiche lorraine", serves: 4 };
const flour = { n: "farine", q: 200, u: "g" };
const dough = { n: "pâte brisée", q: 1, u: "pièce" };
ok("quiche pour 4 : une tarte", C.platsFor(quiche, 4) === 1);
ok("quiche pour 10 : trois tartes", C.platsFor(quiche, 10) === 3);
ok("farine pour 6 : une tarte et demie", C.recipeIngredientBase(quiche, flour, 6, "main")[0] === 300);
ok("pâte brisée pour 6 : une seule", C.recipeIngredientBase(quiche, dough, 6, "main")[0] === 1);
ok("200 g", C.fmt(200, "g") === "200 g");
ok("1200 g devient 1,2 kg", C.fmt(1200, "g") === "1,2 kg");

const base = { a: 1, b: { x: 1, y: 2 }, c: [1] };
const local = { a: 1, b: { x: 9, y: 2 }, c: [1] };
const remote = { a: 3, b: { x: 1, y: 2 }, c: [1, 2] };
ok("fusion : chaque côté garde ce qu'il a changé", JSON.stringify(C.merge3(base, local, remote)) === JSON.stringify({ a: 3, b: { x: 9, y: 2 }, c: [1, 2] }));
ok("fusion : copie locale inchangée, on prend le distant", JSON.stringify(C.merge3(base, base, remote)) === JSON.stringify(remote));
ok("fusion : distant inchangé, on garde le local", C.merge3(base, local, base).b.x === 9);

ok("adresse du carnet partagé", C.shareBookUrl("FranckDavion/carnets-menus", "abc") === "https://franckdavion.github.io/carnets-menus/partage-abc.json");
ok("photo partagée encodée", C.sharePhotoPublicUrl("FranckDavion/carnets-menus", "abc", "a b", 5) === "https://franckdavion.github.io/carnets-menus/partage-photos/abc/a%20b-5.jpg");
ok("photo du dépôt privé", C.recipeDataPhotoPath("r1") === "photos/r-r1.jpg");
ok("photo du compte", C.cloudRecipePhotoRel("uid", "r1", "photo-9") === "uid/r1-photo-9.jpg");
ok("seau des photos de recettes", C.RECIPE_PHOTO_BUCKET === "recipe-photos");

const grown = C.settleCheckedGrowth(
  { checked: { farine: true }, checkedQty: { farine: 200 }, bought: {} },
  [{ key: "farine", q: 350 }],
  "2026-10-30",
  "2026-11-02"
);
ok("quantité cochée dépassée : l'ancienne part est achetée", grown.changed && !grown.checked.farine && grown.bought.farine.q === 200 && grown.bought.farine.until === "2026-11-02");

const trip = C.applyFinishTrip(
  { checked: { farine: true }, bought: {}, missed: {}, extras: [{ t: "sel", done: false }], trips: [], buyLog: {} },
  [{ key: "farine", n: "farine", q: 200, u: "g", r: "Épicerie" }, { key: "lait", n: "lait", q: 1, u: "l", r: "Crémerie" }],
  "2026-10-30",
  "2026-11-02",
  ["Fruits & légumes", "Boucherie & poisson", "Crémerie", "Épicerie", "Boulangerie", "Surgelés", "Divers"]
);
ok("fin des courses : le coché part, le reste reste", trip.checked && Object.keys(trip.checked).length === 0 && trip.bought.farine.q === 200 && trip.missed.lait === "2026-10-30");
ok("fin des courses : l'extra non coché reste", trip.extras.length === 1 && trip.extras[0].t === "sel" && trip.trips[0].got.length === 1 && trip.trips[0].miss.length === 2);

if (fail) { console.log(fail + " échec(s)"); process.exit(1); }
console.log("carnet ok");
