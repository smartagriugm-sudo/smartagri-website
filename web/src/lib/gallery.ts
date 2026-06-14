import { Award, GraduationCap, Handshake, Mic2, Sprout, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Documentation of smartagri activities, grouped into albums. This is a lib
// data module (same pattern as research.ts / partners.ts / exhibition.ts), so
// the team can edit entries here directly. Replace the gradient placeholders
// with real photos by setting `cover` and filling `photos` with paths under
// /brand/uploads/ (referenced as plain strings, mirroring note covers).
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
  /** ISO date (YYYY-MM-DD), used only for sorting newest first */
  date: string;
  /** Human label shown on the card, e.g. "August 2025" */
  dateLabel: string;
  category: GalleryCategory;
  location: string;
  excerpt: string;
  /** Optional real cover photo (e.g. /brand/uploads/foo.webp) */
  cover?: string;
  /** Number of photos in the album; drives placeholder tiles until real
   *  photos are added. */
  photoCount: number;
  /** Optional real photo paths; when present they replace the placeholders. */
  photos?: string[];
};

// Placeholder cover gradients, cycled when an album has no real cover yet.
export const galleryCovers = [
  "linear-gradient(135deg, #0B6477 0%, #14919B 60%, #0AD1C8 100%)",
  "linear-gradient(135deg, #08313A 0%, #0B6477 70%, #14919B 100%)",
  "linear-gradient(135deg, #14919B 0%, #45DFB1 100%)",
  "linear-gradient(135deg, #0B6477 0%, #45DFB1 100%)",
];

// Example albums drawn from real smartagri activities. Titles reflect actual
// events; locations, dates, and photo counts are placeholders for the team to
// confirm and complete with real documentation.
const ALBUMS: GalleryAlbum[] = [
  {
    slug: "aesap-2026",
    title: "Three studies presented at AESAP 2026",
    date: "2026-05-20",
    dateLabel: "May 2026",
    category: "Conference",
    location: "Indonesia",
    excerpt:
      "Our researchers presented three studies at the Asian and European Symposium on Agricultural Practices, sharing results on controlled-environment and precision farming.",
    photoCount: 9,
  },
  {
    slug: "agrotropikal-2026-best-presenter",
    title: "Best Presenter awards at the National Agrotropikal Seminar",
    date: "2026-05-12",
    dateLabel: "May 2026",
    category: "Award",
    location: "Yogyakarta",
    excerpt:
      "smartagri researchers were recognized with Best Presenter awards for their work on smart and sustainable agriculture at the 2026 National Agrotropikal Seminar.",
    photoCount: 6,
  },
  {
    slug: "agrotropikal-2026",
    title: "National Agrotropikal Seminar 2026",
    date: "2026-04-30",
    dateLabel: "April 2026",
    category: "Conference",
    location: "Yogyakarta",
    excerpt:
      "The team joined the 2026 National Agrotropikal Seminar to present research and connect with peers across Indonesia's agricultural science community.",
    photoCount: 8,
  },
  {
    slug: "rgbi-2026-proposal",
    title: "2026 RGBI proposal presentation selection",
    date: "2026-04-20",
    dateLabel: "April 2026",
    category: "Collaboration",
    location: "Yogyakarta",
    excerpt:
      "The smartagri research team took part in the 2026 RGBI proposal presentation selection, advancing collaborative research funding with partners.",
    photoCount: 5,
  },
  {
    slug: "field-sensor-deployment-sleman",
    title: "Field sensor deployment in Sleman",
    date: "2026-03-18",
    dateLabel: "March 2026",
    category: "Field Activity",
    location: "Sleman, Yogyakarta",
    excerpt:
      "Installing soil-moisture and microclimate sensors across partner plots, calibrating gateways, and walking farmers through the live dashboard.",
    photoCount: 14,
  },
  {
    slug: "farmer-irrigation-workshop",
    title: "Smart irrigation workshop with farmers",
    date: "2026-02-10",
    dateLabel: "February 2026",
    category: "Workshop & Training",
    location: "Sleman, Yogyakarta",
    excerpt:
      "A hands-on session with cooperative farmers on reading sensor data and scheduling irrigation from demand, not habit.",
    photoCount: 11,
  },
  {
    slug: "greenhouse-lab-documentation",
    title: "Inside the greenhouse and lab",
    date: "2026-01-15",
    dateLabel: "January 2026",
    category: "Field Activity",
    location: "FTP UGM, Yogyakarta",
    excerpt:
      "Documentation of the controlled-environment greenhouse and instrumentation lab where the smartagri systems are built and tested.",
    photoCount: 10,
  },
  {
    slug: "inagritech-2025",
    title: "smartagri at INAGRITECH 2025",
    date: "2025-08-05",
    dateLabel: "August 2025",
    category: "Exhibition",
    location: "JIExpo Kemayoran, Jakarta",
    excerpt:
      "Three days on the show floor with live demos and cross-sector conversations, closing with more than 2,000 visitors at the booth.",
    photoCount: 18,
  },
];

export const albums: GalleryAlbum[] = [...ALBUMS].sort((a, b) =>
  b.date.localeCompare(a.date),
);

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
