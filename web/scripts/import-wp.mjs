// Import news from the old WordPress site (smartagri.tp.ugm.ac.id) into the
// new site's Field Notes content, converting images to WebP and HTML to
// Markdown. Idempotent: posts already imported (by wpId) or whose target file
// exists are skipped, so it is safe to run on a schedule or webhook.
//
// Run from the web/ directory:  node scripts/import-wp.mjs
// Optional: IMPORT_LIMIT=5 node scripts/import-wp.mjs   (cap new posts per run)
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

const WP_BASE = "https://smartagri.tp.ugm.ac.id/wp-json/wp/v2";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOTES_DIR = path.join(ROOT, "src", "content", "notes");
const IMG_DIR = path.join(ROOT, "public", "brand", "uploads", "notes");
const IMG_PUBLIC_PREFIX = "/brand/uploads/notes";
const LIMIT = Number(process.env.IMPORT_LIMIT || 0); // 0 = no limit

// The new site's fixed Field Note vocabularies (keep in sync with
// src/lib/notes.ts and public/admin/config.yml).
const CATEGORY_WHITELIST = new Set([
  "News", "Research", "Knowledge", "Events", "Collaboration Research",
  "Conference", "Achievement", "Field Activity", "Guest Lecture", "Information",
  "Public Lecture", "Publication", "Student Exchange", "Uncategorized",
  "Visiting Research", "Workshop Training",
]);
const TAG_WHITELIST = [
  "Smart Farming", "Precision Agriculture", "IoT & Sensors", "Drone & UAV",
  "AI & Machine Learning", "Remote Sensing", "Irrigation",
  "Greenhouse & Indoor Farming", "Data Science", "Sustainability", "SDGs",
  "Student Activity", "International Collaboration", "Industry Partnership",
  "Community & Farmers", "Award", "UGM", "INAGRITECH 2026",
];
const TAG_BY_LOWER = new Map(TAG_WHITELIST.map((t) => [t.toLowerCase(), t]));
// A few obvious aliases from WP tag names to the whitelist.
const TAG_ALIASES = new Map([
  ["smart agriculture", "Smart Farming"],
  ["smart agriculture ugm", "Smart Farming"],
  ["smartagriculture", "Smart Farming"],
  ["modernisasi irigasi", "Irrigation"],
  ["artificial inteligence", "AI & Machine Learning"],
  ["ugm ai", "AI & Machine Learning"],
  ["nvidia", "Industry Partnership"],
]);

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});
// The old posts use mid-sentence <br> tags (pasted from PDF/Word), which would
// otherwise turn into choppy hard line breaks. Treat them as plain spaces.
turndown.addRule("softBreak", { filter: "br", replacement: () => " " });

const entityDoc = new JSDOM("").window.document;
function decodeEntities(s = "") {
  const el = entityDoc.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}
// Plain text from HTML, inserting spaces at <br> and block boundaries so words
// split across line breaks don't merge ("Gadjah<br>Mada" -> "Gadjah Mada").
function htmlToText(s = "") {
  const spaced = s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|figcaption|blockquote|section|article)>/gi, "$& ");
  const el = entityDoc.createElement("div");
  el.innerHTML = spaced;
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}
function cleanExcerpt(html) {
  return htmlToText(html)
    .replace(/\[(?:…|\.\.\.|hellip)\]\s*$/i, "")
    .replace(/(?:read more|selengkapnya|continue reading)\s*$/i, "")
    .replace(/\s*…\s*$/, "")
    .trim();
}
// First ~45 words of the article, used as the card excerpt. Derived from the
// full content (not WP's excerpt.rendered, which has the merged-words bug).
function truncateWords(text, words = 45) {
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length <= words) return text;
  return parts.slice(0, words).join(" ") + "…";
}

function sanitize(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

// Optional translation of the Indonesian fields to English via the Anthropic
// API. Active only when ANTHROPIC_API_KEY is set; otherwise content stays in
// Indonesian (no error). Returns { title, excerpt, body } in English or null.
const TRANSLATE_MODEL = process.env.TRANSLATE_MODEL || "claude-haiku-4-5-20251001";
async function translateToEnglish({ title, excerpt, body }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const prompt = `You are translating an Indonesian news article from a university smart-agriculture research center into natural, professional English for the center's website.

Rules:
- Translate faithfully; do not add, remove, or summarize content.
- Preserve Markdown exactly, including image syntax (![](...)) and links.
- Keep proper nouns, people's names, institutions, and acronyms unchanged (e.g. SmartAgri, UGM, FTP, BRIN, DTPB).
- Output ONLY the three tagged blocks below, nothing else.

<TITLE>${title}</TITLE>
<EXCERPT>${excerpt}</EXCERPT>
<BODY>
${body}
</BODY>`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: TRANSLATE_MODEL,
          max_tokens: 8000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        console.warn(`  translate HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const text = data?.content?.[0]?.text || "";
      const t = text.match(/<TITLE>([\s\S]*?)<\/TITLE>/);
      const e = text.match(/<EXCERPT>([\s\S]*?)<\/EXCERPT>/);
      const b = text.match(/<BODY>([\s\S]*?)<\/BODY>/);
      if (t && e && b) {
        return { title: t[1].trim(), excerpt: e[1].trim(), body: b[1].trim() };
      }
    } catch (err) {
      console.warn("  translate error:", err.message);
    }
  }
  return null;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

// Download an image and store it as WebP; returns the public path or null.
async function importImage(url, wpId, idx) {
  try {
    const clean = url.split("?")[0];
    const ext = path.extname(new URL(clean).pathname).toLowerCase();
    // Only raster formats go through sharp; leave anything exotic as-is.
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return null;
    const base = sanitize(path.basename(new URL(clean).pathname, ext)) || "img";
    const name = `${wpId}-${idx}-${base}.webp`;
    const dest = path.join(IMG_DIR, name);
    const publicPath = `${IMG_PUBLIC_PREFIX}/${name}`;
    if (existsSync(dest)) return publicPath;
    const res = await fetch(clean);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf)
      .rotate()
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(dest);
    return publicPath;
  } catch {
    return null;
  }
}

function mapCategory(ids, catMap) {
  const names = ids.map((id) => catMap.get(id)).filter(Boolean);
  const primary = names.find((n) => CATEGORY_WHITELIST.has(n) && n !== "Uncategorized");
  if (primary) return primary;
  const any = names.find((n) => CATEGORY_WHITELIST.has(n));
  return any || "Uncategorized";
}

function mapTags(ids, tagMap) {
  const out = new Set();
  for (const id of ids) {
    const name = tagMap.get(id);
    if (!name) continue;
    const lower = name.toLowerCase();
    if (/^sdg\b/.test(lower)) out.add("SDGs");
    else if (TAG_BY_LOWER.has(lower)) out.add(TAG_BY_LOWER.get(lower));
    else if (TAG_ALIASES.has(lower)) out.add(TAG_ALIASES.get(lower));
  }
  return [...out];
}

async function loadExisting() {
  const wpIds = new Set();
  const files = new Set();
  let entries = [];
  try {
    entries = await readdir(NOTES_DIR);
  } catch {
    return { wpIds, files };
  }
  for (const f of entries) {
    if (!f.endsWith(".json")) continue;
    files.add(f);
    try {
      const data = JSON.parse(await readFile(path.join(NOTES_DIR, f), "utf8"));
      if (data.wpId) wpIds.add(Number(data.wpId));
    } catch {
      /* ignore unreadable files */
    }
  }
  return { wpIds, files };
}

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  await mkdir(NOTES_DIR, { recursive: true });

  const catList = await fetchJson(`${WP_BASE}/categories?per_page=100&_fields=id,name`);
  const tagList = await fetchJson(`${WP_BASE}/tags?per_page=100&_fields=id,name`);
  const catMap = new Map(catList.map((c) => [c.id, c.name]));
  const tagMap = new Map(tagList.map((t) => [t.id, t.name]));

  const { wpIds, files } = await loadExisting();

  // Fetch all posts (newest first), paginating in case the site grows.
  const posts = [];
  for (let page = 1; ; page++) {
    const batch = await fetchJson(
      `${WP_BASE}/posts?per_page=100&page=${page}&orderby=date&order=desc` +
        `&_fields=id,date,slug,title,excerpt,content,categories,tags,featured_media,link`,
    );
    posts.push(...batch);
    if (batch.length < 100) break;
  }

  let imported = 0;
  let skipped = 0;
  for (const post of posts) {
    if (LIMIT && imported >= LIMIT) break;
    const date = (post.date || "").slice(0, 10);
    // Cap the slug so the file path stays well under the Windows 260-char limit
    // (and keeps URLs reasonable). Trim any trailing hyphen after slicing.
    const slug = (post.slug || `post-${post.id}`).slice(0, 75).replace(/-+$/, "");
    const file = `${date}-${slug}.json`;
    if (wpIds.has(post.id) || files.has(file)) {
      skipped++;
      continue;
    }

    // Process the article body: localize images, capture a cover candidate.
    const dom = new JSDOM(`<body>${post.content?.rendered || ""}</body>`);
    const doc = dom.window.document;
    let coverFromBody = null;
    let firstImgEl = null;
    const imgs = [...doc.querySelectorAll("img")];
    for (const [i, img] of imgs.entries()) {
      const src = img.getAttribute("src");
      if (!src || !/^https?:\/\//.test(src)) continue;
      const local = await importImage(src, post.id, i);
      if (local) {
        img.setAttribute("src", local);
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        if (!coverFromBody) {
          coverFromBody = local;
          firstImgEl = img;
        }
      }
    }

    // Cover: featured image if set, else the first body image.
    let cover = coverFromBody || undefined;
    if (post.featured_media) {
      try {
        const media = await fetchJson(
          `${WP_BASE}/media/${post.featured_media}?_fields=source_url`,
        );
        if (media?.source_url) {
          const fc = await importImage(media.source_url, post.id, "cover");
          if (fc) cover = fc;
        }
      } catch {
        /* fall back to body cover */
      }
    }

    // When the cover is the first body image, drop it from the body so it
    // doesn't render twice (once as cover, once at the top of the article).
    if (firstImgEl && cover === coverFromBody) {
      const parent = firstImgEl.parentElement;
      firstImgEl.remove();
      if (
        parent &&
        ["FIGURE", "P"].includes(parent.tagName) &&
        !parent.textContent.trim() &&
        parent.querySelectorAll("img").length === 0
      ) {
        parent.remove();
      }
    }

    let body = turndown.turndown(doc.body.innerHTML).trim();
    const fullText = htmlToText(post.content?.rendered || "");
    let excerpt =
      truncateWords(fullText, 45) || cleanExcerpt(post.excerpt?.rendered || "");
    let title = decodeEntities(post.title?.rendered || "").trim();

    // Translate to English when enabled; keep the Indonesian original under
    // `original` so a future bilingual toggle can show both languages.
    let original;
    const translated = await translateToEnglish({ title, excerpt, body });
    if (translated) {
      original = { lang: "id", title, excerpt, body };
      title = translated.title || title;
      excerpt = translated.excerpt || excerpt;
      body = translated.body || body;
    }

    const note = {
      wpId: post.id,
      category: mapCategory(post.categories || [], catMap),
      date,
      title,
      excerpt,
      tags: mapTags(post.tags || [], tagMap),
      ...(cover ? { cover } : {}),
      sourceUrl: post.link,
      body,
      ...(original ? { original } : {}),
    };

    await writeFile(
      path.join(NOTES_DIR, file),
      JSON.stringify(note, null, 2) + "\n",
      "utf8",
    );
    imported++;
    console.log(`+ ${file}  [${note.category}] ${note.title.slice(0, 60)}`);
  }

  console.log(`\nDone. Imported ${imported}, skipped ${skipped}, total WP posts ${posts.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
