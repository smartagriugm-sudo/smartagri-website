export type Publication = {
  year: string;
  title: string;
  venue: string;
  authors: string;
  /** Optional DOI / external URL */
  link?: string;
};

// Content lives in src/content/publications/*.json — one file per paper,
// managed through the /admin CMS (or by hand). Sorted newest year first;
// within a year, files sort by filename (prefix with 1-, 2-, ... to control).
const pubFiles = import.meta.glob<Publication>(
  "../content/publications/*.json",
  { eager: true, import: "default" },
);

export const PUBLICATIONS: Publication[] = Object.entries(pubFiles)
  .sort(([pathA, a], [pathB, b]) => {
    const byYear = Number(b.year) - Number(a.year);
    return byYear !== 0 ? byYear : pathA.localeCompare(pathB);
  })
  .map(([, pub]) => pub);
