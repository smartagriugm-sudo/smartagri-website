// Import gallery photos from a Google Drive folder.
//
// Structure on Drive: a ROOT folder shared "anyone with the link", with one
// SUBFOLDER per album (the subfolder name becomes the album title). Images go
// directly inside each subfolder.
//
// For each image this script: downloads it, resizes to max 1600px wide,
// composites the smartagri watermark (icon + smart-agri.id, bottom-right),
// writes a WebP to public/brand/uploads/gallery/<album-slug>/, and upserts the
// album JSON in src/content/gallery/. Re-runs skip images already downloaded
// and preserve album metadata edited in the /admin CMS (only photos + cover
// are refreshed).
//
// Env: GOOGLE_API_KEY (Drive API enabled), DRIVE_GALLERY_FOLDER_ID.
// Run:  GOOGLE_API_KEY=... DRIVE_GALLERY_FOLDER_ID=... node scripts/import-gallery.mjs

import sharp from "sharp";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UPLOADS = join(ROOT, "public/brand/uploads/gallery");
const CONTENT = join(ROOT, "src/content/gallery");
const ICON = join(ROOT, "public/brand/icon-white.svg");

const KEY = process.env.GOOGLE_API_KEY;
const FOLDER = process.env.DRIVE_GALLERY_FOLDER_ID;
if (!KEY || !FOLDER) {
  console.error("Set GOOGLE_API_KEY and DRIVE_GALLERY_FOLDER_ID env vars.");
  process.exit(1);
}

const slugify = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

async function driveList(q, fields = "files(id,name,mimeType,createdTime),nextPageToken") {
  const out = [];
  let pageToken = "";
  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", q);
    url.searchParams.set("key", KEY);
    url.searchParams.set("fields", fields);
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Drive list ${res.status}: ${await res.text()}`);
    const data = await res.json();
    out.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return out;
}

async function driveDownload(id) {
  const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${KEY}&supportsAllDrives=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Drive download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const WATERMARK_TEXT = "smartagri";

// Pill sized to fit its content (icon + text), driven by a target height H.
async function buildWatermark(H) {
  const pad = Math.round(H * 0.24);
  const iconSize = H - pad * 2;
  const fontSize = Math.round(H * 0.42);
  const gap = Math.round(H * 0.14);
  const textW = Math.ceil(WATERMARK_TEXT.length * fontSize * 0.56);
  const W = pad + iconSize + gap + textW + pad;
  const r = Math.round(H / 2);
  const textX = pad + iconSize + gap;
  const pill = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${W}" height="${H}" rx="${r}" ry="${r}" fill="#08313A" fill-opacity="0.5"/><text x="${textX}" y="${Math.round(H / 2)}" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" fill-opacity="0.96">${WATERMARK_TEXT}</text></svg>`;
  const pillPng = await sharp(Buffer.from(pill)).png().toBuffer();
  const icon = await sharp(ICON, { density: 400 })
    .resize(iconSize, iconSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  return sharp(pillPng).composite([{ input: icon, left: pad, top: pad }]).png().toBuffer();
}

async function watermarkToWebp(buf, dest) {
  const resized = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).toBuffer();
  const m = await sharp(resized).metadata();
  const H = Math.min(Math.max(Math.round(m.width * 0.058), 46), 92);
  const wm = await buildWatermark(H);
  const wmM = await sharp(wm).metadata();
  const margin = Math.round(m.width * 0.028);
  await sharp(resized)
    .composite([{ input: wm, left: m.width - wmM.width - margin, top: m.height - wmM.height - margin }])
    .webp({ quality: 82 })
    .toFile(dest);
}

const FOLDER_MIME = "application/vnd.google-apps.folder";
const isoDate = (s) => (s ? s.slice(0, 10) : "");
const CURATED_FOLDER = "kurasi konten website"; // only import from this subfolder

// Parse an album folder name "DDMMYY - Nama Kegiatan" -> { iso, title }.
function parseAlbumName(name) {
  const m = name.match(/^\s*(\d{2})(\d{2})(\d{2})\s*-\s*(.+?)\s*$/);
  if (m) {
    const [, dd, mm, yy, title] = m;
    const day = +dd, mon = +mm;
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      return { iso: `20${yy}-${mm}-${dd}`, title };
    }
  }
  return { iso: null, title: name.trim() };
}

const albumFolders = await driveList(
  `'${FOLDER}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
);
console.log(`Found ${albumFolders.length} activity folders.`);

for (const album of albumFolders) {
  // Find the "Kurasi Konten Website" subfolder; skip activities not yet curated.
  const subfolders = await driveList(
    `'${album.id}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
  );
  const curated = subfolders.find(
    (f) => f.name.trim().toLowerCase() === CURATED_FOLDER,
  );
  if (!curated) {
    console.log(`  skip "${album.name}": no "Kurasi Konten Website" folder`);
    continue;
  }

  const { iso, title } = parseAlbumName(album.name);
  const slug = `${iso || "undated"}-${slugify(title)}`;
  const outDir = join(UPLOADS, slug);
  await mkdir(outDir, { recursive: true });

  const images = (
    await driveList(
      `'${curated.id}' in parents and mimeType contains 'image/' and trashed = false`,
    )
  ).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const photos = [];
  let earliest = "";
  for (const img of images) {
    const fname = `${slug}-${img.id}.webp`;
    const dest = join(outDir, fname);
    const webPath = `/brand/uploads/gallery/${slug}/${fname}`;
    if (!existsSync(dest)) {
      try {
        await watermarkToWebp(await driveDownload(img.id), dest);
      } catch (e) {
        console.log(`  skip ${img.name}: ${e.message}`);
        continue;
      }
    }
    photos.push(webPath);
    const d = isoDate(img.createdTime);
    if (d && (!earliest || d < earliest)) earliest = d;
  }

  if (photos.length === 0) {
    console.log(`  skip "${album.name}": "Kurasi Konten Website" is empty`);
    continue;
  }

  const jsonPath = join(CONTENT, `${slug}.json`);
  let data = {
    title,
    date: iso || earliest || new Date().toISOString().slice(0, 10),
    category: "Field Activity",
    location: "",
    excerpt: "",
  };
  if (existsSync(jsonPath)) {
    data = { ...data, ...JSON.parse(await readFile(jsonPath, "utf8")) };
  }
  data.photos = photos;
  data.cover = data.cover || photos[0];
  data.photoCount = photos.length;
  await writeFile(jsonPath, JSON.stringify(data, null, 2) + "\n");
  console.log(`  ${album.name}: ${photos.length} photos -> ${slug}.json`);
}
console.log("Done.");
