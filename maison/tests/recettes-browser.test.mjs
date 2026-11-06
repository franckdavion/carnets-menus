// Validation d'interface Recettes dans un navigateur isolé (iPhone + Mac).
// ZÉRO compte, ZÉRO accès Supabase/GitHub : tout accès réseau extérieur est bloqué.
// Utilise seulement les recettes de démonstration embarquées dans l'application.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = "http://127.0.0.1:8765";
const OUT = path.join(ROOT, "test-results");
const server = spawn("python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1"], {
  cwd: ROOT, stdio: ["ignore", "pipe", "pipe"],
});
let browser;
async function ready() {
  for (let n = 0; n < 80; n++) {
    if (server.exitCode !== null) throw Error("Le serveur local s'est arrêté");
    try { const response = await fetch(BASE + "/index.html"); if (response.ok) return; } catch {}
    await delay(250);
  }
  throw Error("Le serveur local ne répond pas sur 8765");
}
async function checkScenario(name, config) {
  const ctx = await browser.newContext({
    viewport: config.viewport, deviceScaleFactor: config.mobile ? 2 : 1,
    isMobile: config.mobile, hasTouch: config.mobile,
    serviceWorkers: "block",
    locale: "fr-FR",
  });
  // Aucun appel vers les comptes ou données de production, même accidentel.
  await ctx.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== BASE) return route.abort();
    return route.continue();
  });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on("pageerror", e => jsErrors.push(e.message));
  try {
    await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.locator('[data-act="tab"][data-v="rec"]').first().click();
    await page.waitForFunction(() => document.querySelectorAll("#recList article").length > 0, null, { timeout: 20000 });
    assert.equal(await page.locator("#v-rec").isVisible(), true);
    assert.ok(await page.locator("#recList article").count() > 0, "Recettes de démonstration absentes");

    // Basculement Galerie -> Liste avec choix mémorisé localement.
    await page.locator('[data-act="recLayout"][data-v="gallery"]').click();
    assert.ok(await page.locator("#recList").evaluate(x => x.classList.contains("rec-gallery")), "Galerie non activée");
    assert.equal(await page.locator('[data-act="recLayout"][data-v="gallery"]').getAttribute("aria-pressed"), "true");
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("cm_rec_layout"))), "gallery");
    // Une carte ne doit jamais forcer un défilement horizontal sur l'écran.
    const pageWidth = await page.evaluate(() => ({
      full: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      viewport: innerWidth,
    }));
    assert.ok(pageWidth.full <= pageWidth.viewport + 2,
      "Débordement horizontal sur " + name + " : " + JSON.stringify(pageWidth));
    await page.screenshot({ path: path.join(OUT, "recettes-" + name + "-galerie.png"), fullPage: true });

    // Favori sur un jeu de démonstration local, sans synchronisation vers l'extérieur.
    const recipe = page.locator("#recList article").first();
    const fav = recipe.locator('[data-act="fav"]');
    const initial = await fav.getAttribute("aria-pressed");
    await fav.click();
    const updated = await page.locator("#recList article").first().locator('[data-act="fav"]').getAttribute("aria-pressed");
    assert.notEqual(updated, initial, "Le favori n'a pas changé");

    await page.locator('[data-act="recLayout"][data-v="list"]').click();
    assert.equal(await page.locator("#recList").evaluate(x => x.classList.contains("rec-gallery")), false);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-act="tab"][data-v="rec"]').first().click();
    await page.waitForFunction(() => document.querySelectorAll("#recList article").length > 0);
    assert.equal(await page.locator("#recList").evaluate(x => x.classList.contains("rec-gallery")), false, "La liste n'est pas mémorisée");

    // Recherche et réinitialisation.
    await page.locator("#q").fill("___aucune_recette_test___");
    assert.ok((await page.locator("#recList article").count()) === 0, "La recherche ne filtre pas");
    await page.locator('[data-act="recAll"]').click();
    assert.ok((await page.locator("#recList article").count()) > 0, "Le bouton Toutes ne réinitialise pas");
    
    // Menu Ajouter : ouverture, navigation et fermeture.
    await page.locator("#recActions summary").click();
    assert.equal(await page.locator("#recActions").evaluate(x => x.open), true);
    await page.locator('#recActions [data-act="goFind"]').click();
    assert.equal(await page.locator("#recWebPanel").evaluate(x => x.open), true, "Panneau Import Internet non déplié");
    assert.equal(await page.locator("#recActions").evaluate(x => x.open), false, "Menu Ajouter resté ouvert");
    await page.locator("#recActions summary").click();
    await page.locator('#recActions [data-act="newRecipe"]').click();
    assert.equal(await page.locator("#sheet").isVisible(), true, "Formulaire nouvelle recette absent");

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      html: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    console.log(name + " : " + (await page.locator("#recList article").count()) + " cartes, largeur " + JSON.stringify(overflow));
    if (jsErrors.length) throw Error("Erreur(s) JavaScript : " + jsErrors.join(" | "));
    console.log("OK : interface " + name);
  } finally {
    await ctx.close();
  }
}
try {
  await fs.mkdir(OUT, { recursive: true });
  await ready();
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  await checkScenario("iphone-compact", { viewport: { width: 320, height: 667 }, mobile: true });
  await checkScenario("iphone", { viewport: { width: 390, height: 844 }, mobile: true });
  await checkScenario("tablette", { viewport: { width: 820, height: 1180 }, mobile: true });
  await checkScenario("mac", { viewport: { width: 1280, height: 800 }, mobile: false });
  console.log("Tests navigateur Recettes réussis. Captures dans test-results/");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
