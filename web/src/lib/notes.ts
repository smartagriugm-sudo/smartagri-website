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
  /** Optional author name shown on the article page */
  author?: string;
  /** Optional topic tags shown on the article page */
  tags?: string[];
  /** Optional cover image path (e.g. /brand/uploads/foo.webp) */
  cover?: string;
  /** Optional article body in Markdown (edited via the /admin CMS) */
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

// Placeholder cover art for notes without a photo — cycle brand gradients.
export const covers = [
  "linear-gradient(135deg, #0B6477 0%, #14919B 60%, #0AD1C8 100%)",
  "linear-gradient(135deg, #08313A 0%, #0B6477 70%, #14919B 100%)",
  "linear-gradient(135deg, #14919B 0%, #45DFB1 100%)",
];

// Content lives in src/content/notes/*.json — one file per article, managed
// through the /admin CMS (or by hand). Dates are stored as ISO (YYYY-MM-DD).
type NoteFile = {
  category: NoteCategory;
  date: string;
  title: string;
  excerpt: string;
  author?: string;
  tags?: string[];
  cover?: string;
  body?: string;
};

const noteFiles = import.meta.glob<NoteFile>("../content/notes/*.json", {
  eager: true,
  import: "default",
});

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const notes: Note[] = Object.entries(noteFiles)
  .map(([path, note]) => ({
    ...note,
    slug: path.split("/").pop()!.replace(/\.json$/, ""),
  }))
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((note) => ({ ...note, date: formatDate(note.date) }));

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
