// Enriches publications that have a DOI link from the public Crossref API
// (api.crossref.org/works/<doi>):
//   - `publisher`: added when missing (values set by hand or in the /admin CMS
//     are left alone);
//   - `citations` (with --citations): refreshed to Crossref's current
//     is-referenced-by-count, the same figure the publication page shows live,
//     so the list, the landing totals and the detail page agree.
// Papers without a DOI, or whose DOI Crossref doesn't know, keep their values.
//
//   node scripts/enrich-publications.mjs               # add missing publishers
//   node scripts/enrich-publications.mjs --citations   # also refresh citations
//   node scripts/enrich-publications.mjs --dry         # report only

import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("src/content/publications");
const DRY = process.argv.includes("--dry");
const CITATIONS = process.argv.includes("--citations");
// Crossref asks API users to identify themselves ("polite pool").
const UA = "smartagri-website/1.0 (mailto:hello@smart-agri.id)";

const doiOf = (link = "") => link.match(/10\.\d{4,9}\/[^\s?#]+/)?.[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
let publishers = 0;
let changed = 0;
let skipped = 0;
let failed = 0;
let before = 0;
let after = 0;

for (const file of files) {
  const full = path.join(DIR, file);
  const pub = JSON.parse(fs.readFileSync(full, "utf8"));
  const doi = doiOf(pub.link);
  before += pub.citations ?? 0;
  if (!doi || (!CITATIONS && pub.publisher)) {
    after += pub.citations ?? 0;
    skipped++;
    continue;
  }
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const msg = (await res.json())?.message ?? {};
    let dirty = false;

    const publisher = msg.publisher?.trim();
    if (!pub.publisher && publisher) {
      pub.publisher = publisher;
      publishers++;
      dirty = true;
      console.log(`+ ${file}: publisher ${publisher}`);
    }

    const count = msg["is-referenced-by-count"];
    if (CITATIONS && typeof count === "number" && count !== pub.citations) {
      console.log(`~ ${file}: citations ${pub.citations ?? 0} -> ${count}`);
      pub.citations = count;
      changed++;
      dirty = true;
    }

    if (dirty && !DRY) fs.writeFileSync(full, JSON.stringify(pub, null, 2) + "\n");
  } catch (err) {
    console.warn(`! ${file}: ${err.message}`);
    failed++;
  }
  after += pub.citations ?? 0;
  await sleep(120);
}

console.log(
  `\n${publishers} publishers added` +
    (CITATIONS ? `, ${changed} citation counts updated (total ${before} -> ${after})` : "") +
    `, ${skipped} skipped, ${failed} not found on Crossref` +
    (DRY ? " (dry run)" : ""),
);
