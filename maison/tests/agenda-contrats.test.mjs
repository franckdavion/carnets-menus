// Contrôles de contrat de l'Agenda : formulaires, validation et destinations.
// Test purement statique, sans navigateur ni connexion Google/Supabase.
// La présence réelle des colonnes SQL est vérifiée séparément en lecture seule.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "maison/app.js"), "utf8");
let verified = 0;
const check = (label, fn) => { fn(); verified++; console.log("✓ " + label); };
check("Le menu + conserve l'option Tâche", () => {
  assert.ok(source.includes('data-act="calCreateTask"'));
  assert.ok(source.includes('case "calCreateTask": taskSheet(null, calSel);'));
});
check("Le menu + conserve rendez-vous et événements", () => {
  assert.ok(source.includes('data-act="newEvent"'));
  assert.ok(source.includes('data-act="calCreateToggle"'));
});
check("La destination distingue les tâches familiales et Google", () => {
  assert.ok(source.includes('value="local">Maisonnée'));
  assert.ok(source.includes('value="google">Google Tasks'));
});
check("Le formulaire local contient une date prévue", () =>
  assert.ok(source.includes('name="next_due" type="date"')));
check("Le formulaire local contient l'heure facultative", () =>
  assert.ok(source.includes('name="due_time" type="time"')));
check("Le formulaire local contient une date limite facultative", () =>
  assert.ok(source.includes('name="deadline_on" type="date"')));
check("L'heure est transmise dans le brouillon de tâche", () =>
  assert.ok(source.includes("due_time: fd.due_time || null")));
check("La date limite est transmise dans le brouillon de tâche", () =>
  assert.ok(source.includes("deadline_on: fd.deadline_on || null")));
check("Une date limite antérieure à la date prévue est rejetée", () =>
  assert.ok(source.includes("row.deadline_on < row.next_due")));
check("L'affichage des tâches indique horaire et échéance", () => {
  assert.ok(source.includes("if (t.due_time)"));
  assert.ok(source.includes("if (t.deadline_on)"));
});
console.log(`Agenda : ${verified} contrats d'interface vérifiés, sans données réelles.`);
