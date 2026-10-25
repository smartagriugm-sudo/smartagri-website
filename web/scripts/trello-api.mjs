// Read-only Trello REST calls for scripts/import-trello.mjs: the full comment
// history (the JSON export stops at 1000 actions) and cover image downloads.
// Credentials go in the Authorization header, never in URLs, so they do not
// end up in logs. Trello allows about 100 requests per 10 seconds per token;
// 429 answers are retried with a growing pause.
import sharp from "sharp";

const API = "https://api.trello.com/1";

export function trelloAuth(key, token) {
  return { Authorization: `OAuth oauth_consumer_key="${key}", oauth_token="${token}"` };
}

async function request(url, headers, attempt = 0) {
  const res = await fetch(url, { headers });
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    return request(url, headers, attempt + 1);
  }
  if (res.status === 401) throw new Error("Trello rejected the key or token (401). Check TRELLO_KEY and TRELLO_TOKEN.");
  if (!res.ok) throw new Error(`Trello ${res.status} for ${new URL(url).pathname}`);
  return res;
}

// Every commentCard action on the board, newest first, paged 1000 at a time.
export async function fetchAllComments(boardId, headers, onPage = () => {}) {
  const all = [];
  let before = null;
  for (;;) {
    const params = new URLSearchParams({ filter: "commentCard", limit: "1000" });
    if (before) params.set("before", before);
    const res = await request(`${API}/boards/${boardId}/actions?${params}`, headers);
    const page = await res.json();
    all.push(...page);
    onPage(all.length);
    if (page.length < 1000) break;
    before = page[page.length - 1].id;
  }
  return all;
}

// Smallest preview that is still at least `minWidth` wide, else the original.
export function pickImageUrl(attachment, minWidth = 1000) {
  const previews = [...(attachment.previews ?? [])].filter((p) => p.url).sort((a, b) => a.width - b.width);
  const big = previews.find((p) => p.width >= minWidth);
  return big?.url ?? attachment.url;
}

// Resize to at most `width` px wide and encode as WebP (like the site's images).
export async function toWebp(buffer, width = 1200, quality = 78) {
  return sharp(buffer).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
}

export async function downloadCover(attachment, headers) {
  const res = await request(pickImageUrl(attachment), headers);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error(`not an image (${type || "unknown type"})`);
  return toWebp(Buffer.from(await res.arrayBuffer()));
}

// Run `task` over `items` with at most `limit` in flight.
export async function pool(items, limit, task) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await task(items[i], i);
    }
  });
  await Promise.all(workers);
}
