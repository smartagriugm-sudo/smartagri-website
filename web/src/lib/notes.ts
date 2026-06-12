export type NoteCategory = "News" | "Research" | "Knowledge" | "Events";

export const NOTE_FILTERS = [
  "All",
  "News",
  "Research",
  "Knowledge",
  "Events",
] as const;
export type NoteFilter = (typeof NOTE_FILTERS)[number];

export type Note = {
  category: NoteCategory;
  /** Display date, e.g. "June 2, 2026" */
  date: string;
  title: string;
  excerpt: string;
  /** Optional cover image path (e.g. /brand/uploads/foo.jpg) */
  cover?: string;
};

export const categoryChip: Record<NoteCategory, string> = {
  News: "bg-[#14919B] text-white",
  Research: "bg-[#0B6477] text-white",
  Knowledge: "bg-[#45DFB1] text-[#0B2A22]",
  Events: "bg-[#80ED99] text-[#0B2A22]",
};

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
  cover?: string;
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

export const notes: Note[] = Object.values(noteFiles)
  .slice()
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((note) => ({ ...note, date: formatDate(note.date) }));
