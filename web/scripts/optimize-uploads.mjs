// One-off / maintenance script: convert every JPEG/PNG in
// public/brand/uploads to WebP (max 2048px, q82), rename to a clean slug,
// update all references in src/content/**/*.json, then delete the originals.
//
// New uploads from the /admin CMS are converted automatically by Sveltia
// (see public/admin/config.yml → media_libraries) — run this only for files
// that entered the repo by other means:
//   node scripts/optimize-uploads.mjs
import { readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const UPLOADS = path.join(ROOT, "public", "brand", "uploads");
const CONTENT = path.join(ROOT, "src", "content");

const RASTER = /\.(jpe?g|png)$/i;

function slugifyBase(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Strict RFC3986-style encoding (what the CMS writes into markdown URLs)
function encodeName(name) {
  return encodeURIComponent(name).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

const files = (await readdir(UPLOADS)).filter((f) => RASTER.test(f));
if (files.length === 0) {
  console.log("No JPEG/PNG files to convert.");
  process.exit(0);
}

const mapping = [];
for (const file of files) {
  const target = `${slugifyBase(file)}.webp`;
  const src = path.join(UPLOADS, file);
  const out = path.join(UPLOADS, target);
  const before = (await readFile(src)).length;
  await sharp(src)
    .rotate()
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  const after = (await readFile(out)).length;
  mapping.push({ from: file, to: target });
  console.log(
    `${file} → ${target}  (${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB)`,
  );
}

// Update references in every content JSON (raw and URL-encoded variants)
async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith(".json")) yield full;
  }
}

for await (const jsonPath of walk(CONTENT)) {
  let text = await readFile(jsonPath, "utf8");
  const original = text;
  for (const { from, to } of mapping) {
    text = text.replaceAll(encodeName(from), to).replaceAll(from, to);
  }
  if (text !== original) {
    await writeFile(jsonPath, text, "utf8");
    console.log(`updated refs: ${path.relative(ROOT, jsonPath)}`);
  }
}

// Remove originals only after everything else succeeded
for (const { from } of mapping) {
  await rm(path.join(UPLOADS, from));
}
console.log(`Done: ${mapping.length} file(s) converted.`);
