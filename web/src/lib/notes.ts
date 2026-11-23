import { localeOf, type Lang } from "./i18n-core";
// All Field Note categories selectable in the /admin CMS (keep in sync with
// public/admin/config.yml).
export const NOTE_CATEGORIES = [
  "News",
  "Research",
  "Knowledge",
  "Events",
  "Collaboration Research",
  "Conference",
  "Achievement",
  "Field Activity",
  "Guest Lecture",
  "Information",
  "Public Lecture",
  "Publication",
  "Student Exchange",
  "Uncategorized",
  "Visiting Research",
  "Workshop Training",
] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export type Note = {
  /** URL slug, derived from the content filename */
  slug: string;
  category: NoteCategory;
  /** Display date, e.g. "June 2, 2026" */
  date: string;
  title: string;
  excerpt: string;
  /** Optional one-line dek shown under the headline on the article page */
  subtitle?: string;
  /** Optional eyebrow label above the headline (defaults to the category) */
  eyebrow?: string;
  /** Optional place of reporting, prefixed to the date (e.g. "Jakarta") */
  dateline?: string;
  /** Optional author name shown on the article page */
  author?: string;
  /** Optional topic tags shown on the article page */
  tags?: string[];
  /** Optional cover image path (e.g. /brand/uploads/foo.webp) */
  cover?: string;
  /** Optional article body in Markdown (edited via the /admin CMS) */
  body?: string;
  /** Set on auto-imported posts: link to the original article on the old site */
  sourceUrl?: string;
  /** When true, the note stays in the repo but is hidden from every listing */
  hidden?: boolean;
  /** ISO date (YYYY-MM-DD) behind `date`, used for localized date labels */
  isoDate: string;
  /**
   * Indonesian source article of an auto-imported post (the English fields
   * are machine translations made by scripts/import-wp.mjs).
   */
  original?: NoteOriginal;
};

export type NoteOriginal = {
  lang: "id";
  title: string;
  excerpt: string;
  body?: string;
};

// Chip colors cycle through the brand palette per category.
const chipStyles = [
  "bg-[#0B6477] text-white",
  "bg-[#14919B] text-white",
  "bg-[#45DFB1] text-[#0B2A22]",
  "bg-[#80ED99] text-[#0B2A22]",
];

export function categoryChip(category: string): string {
  const index = NOTE_CATEGORIES.indexOf(category as NoteCategory);
  return chipStyles[(index < 0 ? 0 : index) % chipStyles.length];
}

// Placeholder cover art for notes without a photo; cycle brand gradients.
export const covers = [
  "linear-gradient(135deg, #0B6477 0%, #14919B 60%, #0AD1C8 100%)",
  "linear-gradient(135deg, #08313A 0%, #0B6477 70%, #14919B 100%)",
  "linear-gradient(135deg, #14919B 0%, #45DFB1 100%)",
];

// Content lives in src/content/notes/*.json, one file per article, managed
// through the /admin CMS (or by hand). Dates are stored as ISO (YYYY-MM-DD).
type NoteFile = {
  category: NoteCategory;
  date: string;
  title: string;
  excerpt: string;
  subtitle?: string;
  eyebrow?: string;
  dateline?: string;
  author?: string;
  tags?: string[];
  cover?: string;
  body?: string;
  sourceUrl?: string;
  hidden?: boolean;
  original?: NoteOriginal;
};

const noteFiles = import.meta.glob<NoteFile>("../content/notes/*.json", {
  eager: true,
  import: "default",
});

function formatDate(iso: string, lang: Lang = "en") {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(localeOf(lang), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Displayed text never carries an em dash; same rule as `noEmDash` in
// scripts/import-wp.mjs (a dash between words becomes a colon).
const EM_DASH = new RegExp(`\\s*${String.fromCharCode(0x2014)}(\\*{0,2})\\s*`, "g");
function noEmDash(s: string): string;
function noEmDash(s: string | undefined): string | undefined;
function noEmDash(s: string | undefined) {
  return s === undefined ? s : s.replace(EM_DASH, ":$1 ");
}

function cleanOriginal(original: NoteOriginal | undefined): NoteOriginal | undefined {
  if (!original?.title) return undefined;
  return {
    ...original,
    title: noEmDash(original.title),
    excerpt: noEmDash(original.excerpt ?? ""),
    body: noEmDash(original.body),
  };
}

export const notes: Note[] = Object.entries(noteFiles)
  .map(([path, note]) => ({
    ...note,
    slug: path.split("/").pop()!.replace(/\.json$/, ""),
  }))
  .filter((note) => !note.hidden)
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((note) => ({
    ...note,
    original: cleanOriginal(note.original),
    isoDate: note.date,
    date: formatDate(note.date),
  }));

export function findNote(slug: string): Note | undefined {
  return notes.find((note) => note.slug === slug);
}

// Filter pills only list categories that actually have articles, so the
// filter row stays compact however many categories the CMS offers.
export const NOTE_FILTERS: string[] = [
  "All",
  ...NOTE_CATEGORIES.filter((category) =>
    notes.some((note) => note.category === category),
  ),
];
export type NoteFilter = string;

// ---- Bahasa Indonesia (see lib/i18n.tsx) ----
// Imported posts keep their Indonesian source under `original`; notes written
// in English only (no `original`) stay in English.
export function localizeNote(note: Note, lang: Lang): Note {
  if (lang !== "id") return note;
  const o = note.original;
  return {
    ...note,
    date: formatDate(note.isoDate, lang),
    ...(o
      ? { title: o.title, excerpt: o.excerpt || note.excerpt, body: o.body ?? note.body }
      : {}),
  };
}

/** True when the note has its own Indonesian text (not a fallback). */
export function hasIndonesian(note: Note): boolean {
  return Boolean(note.original);
}

const NOTE_CATEGORY_ID: Record<string, string> = {
  All: "Semua",
  News: "Berita",
  Research: "Riset",
  Knowledge: "Pengetahuan",
  Events: "Acara",
  "Collaboration Research": "Riset Kolaborasi",
  Conference: "Konferensi",
  Achievement: "Prestasi",
  "Field Activity": "Kegiatan Lapangan",
  "Guest Lecture": "Kuliah Tamu",
  Information: "Informasi",
  "Public Lecture": "Kuliah Umum",
  Publication: "Publikasi",
  "Student Exchange": "Pertukaran Mahasiswa",
  Uncategorized: "Lainnya",
  "Visiting Research": "Kunjungan Riset",
  "Workshop Training": "Workshop dan Pelatihan",
};

/** Display label for a note category or filter ("All"). */
export function noteCategoryLabel(category: string, lang: Lang): string {
  return lang === "id" ? (NOTE_CATEGORY_ID[category] ?? category) : category;
}
