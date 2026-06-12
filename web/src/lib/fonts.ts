import type { CSSProperties } from "react";

// Linear-style single-voice typography: Inter carries everything.
// Roles differ by weight, size, and tracking — not by family.
// - display: headings, weight 600 (500 for card titles), negative tracking
// - body: paragraphs, buttons, labels — weight 400/500
// - serif: kept as an alias for quotes (same voice, regular weight)
// - accent: emphasized words inside headings — color emphasis in brand teal
//   (Linear uses its lavender the same scarce way); override `color` on dark.
export const display: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
};

export const body: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
};

export const serif: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
};

export const accent: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontWeight: 600,
  color: "#14919B",
};
