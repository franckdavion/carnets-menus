// Ajoute à l'appli iOS les réglages de position en arrière-plan (Info.plist).
// À lancer après « npx cap add ios » (npm run preparer-ios le fait tout seul).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const PLIST = "ios/App/App/Info.plist";
if (!existsSync(PLIST)) { console.error(`Introuvable : ${PLIST}. Lancez d'abord « npx cap add ios ».`); process.exit(1); }

const keys = {
  NSLocationWhenInUseUsageDescription:
    "<string>Maisonnée partage votre position avec les membres de votre foyer, uniquement si vous l'avez activé.</string>",
  NSLocationAlwaysAndWhenInUseUsageDescription:
    "<string>Pour que votre foyer voie votre position même quand Maisonnée est en arrière-plan. Elle n'est envoyée que lorsque vous vous déplacez de plus de 50 m.</string>",
  UIBackgroundModes:
    "<array>\n\t\t<string>location</string>\n\t</array>"
};

let xml = readFileSync(PLIST, "utf8"), added = [];
for (const [k, v] of Object.entries(keys)) {
  if (xml.includes(`<key>${k}</key>`)) {
    if (k === "UIBackgroundModes" && !/<key>UIBackgroundModes<\/key>\s*<array>[\s\S]*?<string>location<\/string>/.test(xml)) {
      xml = xml.replace(/(<key>UIBackgroundModes<\/key>\s*<array>)/, "$1\n\t\t<string>location</string>");
      added.push(k + " (location)");
    }
    continue;
  }
  const end = xml.lastIndexOf("</dict>");
  xml = xml.slice(0, end) + `\t<key>${k}</key>\n\t${v}\n` + xml.slice(end);
  added.push(k);
}
writeFileSync(PLIST, xml);
console.log(added.length ? "Info.plist : ajouté " + added.join(", ") : "Info.plist : déjà configuré.");
