import { Award, GraduationCap, Handshake, Mic2, Sprout, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Documentation of smartagri activities, grouped into albums. Content lives in
// src/content/gallery/*.json (one file per album), managed through the /admin
// CMS (gallery collection) or by hand. Photos uploaded via the CMS land in
// public/brand/uploads/gallery and are referenced as /brand/uploads/gallery/...
export const GALLERY_CATEGORIES = [
  "Exhibition",
  "Conference",
  "Field Activity",
  "Workshop & Training",
  "Collaboration",
  "Award",
] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

// Per-category icon + chip color, cycling the brand palette.
export const categoryMeta: Record<
  GalleryCategory,
  { icon: LucideIcon; chip: string }
> = {
  Exhibition: { icon: Store, chip: "bg-[#0B6477] text-white" },
  Conference: { icon: Mic2, chip: "bg-[#14919B] text-white" },
  "Field Activity": { icon: Sprout, chip: "bg-[#45DFB1] text-[#0B2A22]" },
  "Workshop & Training": { icon: GraduationCap, chip: "bg-[#0AD1C8] text-[#0B2A22]" },
  Collaboration: { icon: Handshake, chip: "bg-[#80ED99] text-[#0B2A22]" },
  Award: { icon: Award, chip: "bg-[#0B6477] text-white" },
};

export type GalleryAlbum = {
  slug: string;
  title: string;
  /** ISO date (YYYY-MM-DD), used for sorting newest first */
  date: string;
  /** Human label shown on the card, derived from `date` (e.g. "August 2025") */
  dateLabel: string;
  category: GalleryCategory;
  location: string;
  excerpt: string;
  /** Optional real cover photo (e.g. /brand/uploads/gallery/foo.webp) */
  cover?: string;
  /** Effective photo count: real photos if uploaded, else the placeholder count */
  photoCount: number;
  /** Real photo paths uploaded via the CMS; when present they replace placeholders */
  photos?: string[];
};

// Placeholder cover gradients, cycled when an album has no real cover yet.
export const galleryCovers = [
  "linear-gradient(135deg, #0B6477 0%, #14919B 60%, #0AD1C8 100%)",
  "linear-gradient(135deg, #08313A 0%, #0B6477 70%, #14919B 100%)",
  "linear-gradient(135deg, #14919B 0%, #45DFB1 100%)",
  "linear-gradient(135deg, #0B6477 0%, #45DFB1 100%)",
];

// One JSON file per album, edited through the /admin CMS (or by hand). Dates
// are stored as ISO (YYYY-MM-DD).
type GalleryFile = {
  title: string;
  date: string;
  category: GalleryCategory;
  location: string;
  excerpt: string;
  cover?: string;
  /** Placeholder tile count used until real photos are uploaded */
  photoCount?: number;
  photos?: string[];
};

const albumFiles = import.meta.glob<GalleryFile>("../content/gallery/*.json", {
  eager: true,
  import: "default",
});

function formatMonthYear(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export const albums: GalleryAlbum[] = Object.entries(albumFiles)
  .map(([path, file]) => ({
    ...file,
    slug: path.split("/").pop()!.replace(/\.json$/, ""),
    photoCount: file.photos?.length || file.photoCount || 0,
  }))
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((album) => ({ ...album, dateLabel: formatMonthYear(album.date) }));

export function findAlbum(slug: string): GalleryAlbum | undefined {
  return albums.find((album) => album.slug === slug);
}

// Filter pills only list categories that actually have albums.
export const GALLERY_FILTERS: string[] = [
  "All",
  ...GALLERY_CATEGORIES.filter((category) =>
    albums.some((album) => album.category === category),
  ),
];
