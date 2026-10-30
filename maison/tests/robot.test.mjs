import { parseIng, parseRecipeText, guessRayon } from "../../robot.mjs";

let fail = 0;
const ok = (name, cond) => { console.log((cond ? "ok  " : "FAIL ") + name); if (!cond) fail++; };

const farine = parseIng("200 g de farine");
ok("200 g de farine", farine && farine.q === 200 && farine.u === "g" && farine.n === "farine");
const cs = parseIng("2 cuillères à soupe d'huile");
ok("cuillère à soupe", cs && cs.q === 2 && cs.u === "c. à s." && cs.n === "huile");
const tomates = parseIng("3 tomates");
ok("3 tomates", tomates && tomates.q === 3 && tomates.u === "pièce" && tomates.n === "tomates");
ok("poulet en boucherie", guessRayon("poulet") === "Boucherie & poisson");
ok("tomate au rayon légumes", guessRayon("tomate") === "Fruits & légumes");
ok("farine en épicerie", guessRayon("farine") === "Épicerie");

const rec = parseRecipeText("Soupe de tomates\nPour 4 personnes\nIngrédients\n2 tomates\n100 g de poulet\nPréparation\nCouper les tomates.\nCuire 10 min.");
ok("nom de la recette", rec.name === "Soupe de tomates");
ok("quatre personnes", rec.serves === 4);
ok("deux ingrédients", rec.ing.length === 2 && rec.ing[0].n === "tomates" && rec.ing[1].q === 100);
ok("deux étapes", rec.steps.length === 2 && rec.steps[0].startsWith("Couper"));

if (fail) { console.log(fail + " échec(s)"); process.exit(1); }
console.log("robot ok");
