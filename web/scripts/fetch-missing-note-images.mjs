// Bring hotlinked note images into the repo.
//
// Most note images are imported by scripts/import-wp.mjs. A handful were not:
// Google Docs exports its images to lh7-rt.googleusercontent.com under paths
// with no file extension, and the importer used to reject those on sight, so
// they stayed as hotlinks. Those URLs are signed and rotate, so the pictures
// disappear from the site without anything in the repo changing.
//
// This script finds whatever is still hotlinked, downloads it, converts it to
// WebP beside the other note images, and rewrites the note to point at the
// local copy. It is idempotent: a file already downloaded is left alone, and a
// run with nothing left to do changes nothing.
//
// Run from the web/ directory:  node scripts/fetch-missing-note-images.mjs
// Add --dry-run to list what it would fetch without writing anything.

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// sharp is loaded on demand so --dry-run works on a checkout that has not
// installed it, which is the mode someone reaches for first.
let sharp;
async function loadSharp() {
  if (!sharp) ({ default: sharp } = await import("sharp"));
  return sharp;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOTES_DIR = path.join(ROOT, "src", "content", "notes");
const IMG_DIR = path.join(ROOT, "public", "brand", "uploads", "notes");
const IMG_PUBLIC_PREFIX = "/brand/uploads/notes";
const DRY_RUN = process.argv.includes("--dry-run");

// Any http(s) image that is not already served from this site.
const EXTERNAL_IMAGE = /https?:\/\/(?!localhost)[^\s"')]+/g;
const NON_RASTER = [".svg", ".pdf", ".mp4", ".webm", ".zip", ".doc", ".docx"];

const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (compatible; smartagri-site-importer/1.0; +https://www.smart-agri.id)",
};

/** Is this URL worth trying to pull in as a picture? */
function looksLikeImage(url) {
  const clean = url.split("?")[0];
  let ext = "";
  try {
    ext = path.extname(new URL(clean).pathname).toLowerCase();
  } catch {
    return false;
  }
  if (NON_RASTER.includes(ext)) return false;
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return true;
  // No extension at all: only hosts we know serve images this way, so a link
  // to an article is never mistaken for a picture.
  return /googleusercontent\.com|drive\.google\.com/.test(url);
}

function localNameFor(url, wpId, idx) {
  const clean = url.split("?")[0];
  let base = "";
  try {
    const ext = path.extname(new URL(clean).pathname);
    base = path
      .basename(new URL(clean).pathname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  } catch {
    /* fall through to the hash */
  }
  // A signed Google path has a 200-character token where a filename would be.
  // Keeping it would blow past the 260-character path limit on Windows, which
  // the WordPress importer already caps its slugs for, so anything that long is
  // replaced by a short hash of the URL. The hash is stable, so a second run
  // finds the file already there and skips the download.
  if (!base || base.length > 40) {
    base = createHash("sha1").update(clean).digest("hex").slice(0, 10);
  }
  return `${wpId ?? "x"}-${idx}-${base}.webp`;
}

async function download(url, dest) {
  let res;
  for (let i = 0; i < 4; i++) {
    try {
      res = await fetch(url, { headers: REQUEST_HEADERS });
      if (res.ok) break;
    } catch {
      res = null;
    }
    if (i < 3) await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  if (!res || !res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  const sh = await loadSharp();
  await sh(buf)
    .rotate()
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(dest);
  return true;
}

const files = (await readdir(NOTES_DIR)).filter((f) => f.endsWith(".json"));
let scanned = 0;
let fetched = 0;
let rewritten = 0;
let failed = 0;

for (const file of files) {
  const full = path.join(NOTES_DIR, file);
  const raw = await readFile(full, "utf8");
  const note = JSON.parse(raw);

  const urls = [...new Set((raw.match(EXTERNAL_IMAGE) || []).filter(looksLikeImage))];
  if (urls.length === 0) continue;
  scanned++;

  let out = raw;
  for (const [idx, url] of urls.entries()) {
    const name = localNameFor(url, note.wpId, idx);
    const dest = path.join(IMG_DIR, name);
    const publicPath = `${IMG_PUBLIC_PREFIX}/${name}`;

    if (DRY_RUN) {
      console.log(`would fetch  ${url.slice(0, 72)}\n          -> ${publicPath}`);
      continue;
    }

    if (!existsSync(dest)) {
      const ok = await download(url, dest);
      if (!ok) {
        console.warn(`FAILED   ${url.slice(0, 72)}`);
        failed++;
        continue;
      }
      fetched++;
      console.log(`fetched  ${publicPath}`);
    }
    // Replace every occurrence, including the query string some copies carry.
    out = out.split(url).join(publicPath);
  }

  if (!DRY_RUN && out !== raw) {
    await writeFile(full, out);
    rewritten++;
  }
}

console.log(
  DRY_RUN
    ? `\n${scanned} notes still hotlink images. Re-run without --dry-run to bring them in.`
    : `\n${scanned} notes scanned, ${fetched} images fetched, ${rewritten} notes rewritten, ${failed} failed.`,
);
if (failed > 0) process.exitCode = 1;
