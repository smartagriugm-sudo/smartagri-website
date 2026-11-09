// The headbar's search: pages of the ERP, running batches, and the exact code of a
// hole or a tray. Plain functions over plain data, so the rules can be tested
// without a browser. It looks only at what the client already holds.

export type SearchHit = {
  key: string;
  kind: "Page" | "Batch" | "Hole" | "Tray";
  title: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
};

export type SearchSource = {
  pages: readonly { to: string; label: string; group: string }[];
  batches: readonly { id?: string; code: string; crop: string; stage?: string }[];
  /** True when this code is a real hole of the plant factory. */
  isHole: (code: string) => boolean;
  /** True when this code is a real tray position of the chamber. */
  isSlot: (code: string) => boolean;
};

const words = (s: string) => s.toLowerCase().trim().split(/\s+/).filter(Boolean);

/** 0 for a miss, higher for a better match: the start of the title beats the middle of the detail. */
export function matchScore(query: string, title: string, detail = "") {
  const q = words(query);
  if (q.length === 0) return 0;
  const t = title.toLowerCase();
  const all = `${t} ${detail.toLowerCase()}`;
  if (!q.every((w) => all.includes(w))) return 0;
  if (t.startsWith(q.join(" "))) return 3;
  if (q.every((w) => t.includes(w))) return 2;
  return 1;
}

export function searchErp(query: string, source: SearchSource, limit = 8): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const code = q.toUpperCase();
  const exact: SearchHit[] = [];
  if (source.isHole(code)) exact.push({ key: `hole-${code}`, kind: "Hole", title: code, detail: "Open in the plant factory model", to: "/erp/plant-factory", search: { hole: code } });
  if (source.isSlot(code)) exact.push({ key: `slot-${code}`, kind: "Tray", title: code, detail: "Open in the seedling model", to: "/erp/seedlings", search: { slot: code } });

  const ranked = [
    ...source.batches.map((b) => ({
      hit: {
        key: `batch-${b.code}`,
        kind: "Batch" as const,
        title: b.code,
        detail: b.stage ? `${b.crop} · ${b.stage}` : b.crop,
        ...(b.id ? { to: "/erp/batch/$id", params: { id: b.id } } : { to: "/erp/batch" }),
      },
      score: matchScore(q, b.code, b.crop),
    })),
    ...source.pages.map((p) => ({
      hit: { key: `page-${p.to}`, kind: "Page" as const, title: p.label, detail: p.group, to: p.to },
      score: matchScore(q, p.label, p.group),
    })),
  ]
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return [...exact, ...ranked.map((r) => r.hit)].slice(0, limit);
}
