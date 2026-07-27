export type Publication = {
  /** URL slug, derived from the content filename */
  slug: string;
  year: string;
  title: string;
  venue: string;
  authors: string;
  /** DOI / external URL, also used to auto-fetch metadata from Crossref */
  link?: string;
  /** Manual abstract shown on the detail page (Crossref often lacks one) */
  abstract?: string;
  /** Optional cover/figure image for the detail page */
  cover?: string;
  /** Citation count snapshot from Crossref (is-referenced-by-count) */
  citations?: number;
};

type PublicationFile = Omit<Publication, "slug">;

// Content lives in src/content/publications/*.json, one file per paper,
// managed through the /admin CMS (or by hand). Sorted newest year first;
// within a year, files sort by filename (prefix with 1-, 2-, ... to control).
const pubFiles = import.meta.glob<PublicationFile>(
  "../content/publications/*.json",
  { eager: true, import: "default" },
);

export const PUBLICATIONS: Publication[] = Object.entries(pubFiles)
  .sort(([pathA, a], [pathB, b]) => {
    const byYear = Number(b.year) - Number(a.year);
    return byYear !== 0 ? byYear : pathA.localeCompare(pathB);
  })
  .map(([path, pub]) => ({
    ...pub,
    slug: path.split("/").pop()!.replace(/\.json$/, ""),
  }));

export function findPublication(slug: string): Publication | undefined {
  return PUBLICATIONS.find((pub) => pub.slug === slug);
}
