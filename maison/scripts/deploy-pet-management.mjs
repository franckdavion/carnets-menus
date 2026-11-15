#!/usr/bin/env node
/**
 * Déploie animal-public + maison-push-dispatch via Management API (multipart).
 * Usage:
 *   export SUPABASE_ACCESS_TOKEN='sbp_…'
 *   node scripts/deploy-pet-management.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FN = path.join(ROOT, "supabase/functions");
const REF = "cluqleqbbidozpioekog";

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens, scope edge_functions:write)");
  process.exit(1);
}

function read(rel) {
  return fs.readFileSync(path.join(FN, rel), "utf8");
}

const bundles = [
  {
    slug: "animal-public",
    metadata: { name: "animal-public", entrypoint_path: "index.ts", verify_jwt: false },
    files: [
      ["index.ts", read("animal-public/index.ts")],
      ["../_shared/cors.ts", read("_shared/cors.ts")],
      ["../_shared/pet-push.ts", read("_shared/pet-push.ts")],
      ["../_shared/pet-notify-core.js", read("_shared/pet-notify-core.js")],
    ],
  },
  {
    slug: "maison-push-dispatch",
    metadata: { name: "maison-push-dispatch", entrypoint_path: "index.ts", verify_jwt: false },
    files: [
      ["index.ts", read("maison-push-dispatch/index.ts")],
      ["../_shared/cal.js", read("_shared/cal.js")],
      ["../_shared/pet-push.ts", read("_shared/pet-push.ts")],
      ["../_shared/pet-notify-core.js", read("_shared/pet-notify-core.js")],
    ],
  },
];

for (const b of bundles) {
  for (const [, content] of b.files) {
    if (content.includes("PLACEHOLDER")) {
      console.error(`Refusing deploy ${b.slug}: PLACEHOLDER in sources`);
      process.exit(1);
    }
  }
  const form = new FormData();
  form.append("metadata", JSON.stringify(b.metadata));
  for (const [name, content] of b.files) {
    form.append("file", new Blob([content], { type: "text/plain" }), name);
  }
  const url = `https://api.supabase.com/v1/projects/${REF}/functions/deploy?slug=${encodeURIComponent(b.slug)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Deploy ${b.slug} failed`, res.status, text.slice(0, 500));
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  console.log(`OK ${b.slug} → version ${data.version ?? "?"} id ${data.id ?? ""}`);
}