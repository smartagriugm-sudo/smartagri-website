import { IF_NOTE_TAGS } from "./indoor-farming";
import { notes, type Note } from "./notes";
import { PUBLICATIONS, type Publication } from "./publications";

// Field notes and papers that touch controlled-environment growing, used by
// the Indoor Farming landing and Knowledge pages. Notes match by tag or by
// keyword so the pages stay useful before the CMS tags are tidied up.

const NOTE_KEYWORDS = [
  "greenhouse",
  "indoor farming",
  "plant factory",
  "hydroponic",
  "vpd",
  "vapor pressure",
  "vapour pressure",
  "controlled environment",
  "hyperspectral",
  "microgreen",
  "fertigation",
  "nutrient",
];

const PAPER_KEYWORDS = [
  "greenhouse",
  "hydropon",
  "hidropon",
  "plant factory",
  "indoor farm",
  "vapor pressure",
  "vapour pressure",
  "microgreen",
  "fertigation",
  "controlled environment",
  "soilless",
  "nft system",
];

function noteMatches(note: Note): boolean {
  if (note.tags?.some((tag) => IF_NOTE_TAGS.includes(tag))) return true;
  const hay = `${note.title} ${note.excerpt}`.toLowerCase();
  return NOTE_KEYWORDS.some((kw) => hay.includes(kw));
}

export const IF_NOTES: Note[] = notes.filter(noteMatches);

// Newest first; the same paper imported twice (different capitalisation)
// is listed once.
export const IF_PUBLICATIONS: Publication[] = (() => {
  const seen = new Set<string>();
  return PUBLICATIONS.filter((pub) => {
    const title = pub.title.toLowerCase();
    if (!PAPER_KEYWORDS.some((kw) => title.includes(kw))) return false;
    const key = title.replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();
