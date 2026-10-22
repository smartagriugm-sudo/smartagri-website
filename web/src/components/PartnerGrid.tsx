import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { body } from "../lib/fonts";
import { ACTIVE_PARTNERS, type Partner } from "../lib/partners";

// Partner logos as a framed grid of six cells per page, separated by thin
// rules (after a "tech stack" grid reference): each cell is labelled
// "01 // UNIVERSITY",
// logos sit in grey until hovered, then show in their own colours over a soft
// glow of the logo's dominant colour, with the partner's name underneath.
// Arrows page through the whole roster (ACTIVE_PARTNERS, grouped by type).

const PER_PAGE = 6;
const EASE = [0.16, 1, 0.3, 1] as const;

// Short labels for the cell headers.
const GROUP_LABEL: Record<Partner["group"], string> = {
  University: "University",
  Ministry: "Ministry",
  "Government Institution": "Government",
  "State-Owned Enterprise": "State-owned",
  "Private Company": "Industry",
  "Research Center & Organization": "Research & Org",
  "Farmer Group": "Farmer group",
};

type Rgb = [number, number, number];
const FALLBACK: Rgb = [20, 145, 155]; // teal600

// Dominant colour of a logo, read from its saturated pixels on a small canvas
// (logos are served from our own origin, so the canvas stays readable).
const colourCache = new Map<string, Rgb>();
function useLogoColour(src: string | null): Rgb {
  const [rgb, setRgb] = useState<Rgb>(
    () => (src && colourCache.get(src)) || FALLBACK,
  );
  useEffect(() => {
    if (!src) return;
    const cached = colourCache.get(src);
    if (cached) {
      setRgb(cached);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const size = 48;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      // Bucket saturated pixels by hue (12 x 30°) and average only the
      // heaviest bucket, so a red-and-green logo glows red or green, not the
      // muddy brown an overall average would give.
      const buckets = Array.from({ length: 12 }, () => ({
        r: 0,
        g: 0,
        b: 0,
        w: 0,
      }));
      for (let i = 0; i < data.length; i += 4) {
        const [pr, pg, pb, pa] = [
          data[i],
          data[i + 1],
          data[i + 2],
          data[i + 3],
        ];
        if (pa < 128) continue;
        const max = Math.max(pr, pg, pb);
        const min = Math.min(pr, pg, pb);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat < 0.25 || max < 40) continue; // skip greys, white and black
        const d = max - min;
        let hue =
          max === pr
            ? ((pg - pb) / d) % 6
            : max === pg
              ? (pb - pr) / d + 2
              : (pr - pg) / d + 4;
        hue = (hue * 60 + 360) % 360;
        const k = buckets[Math.floor(hue / 30) % 12];
        k.r += pr * sat;
        k.g += pg * sat;
        k.b += pb * sat;
        k.w += sat;
      }
      const top = buckets.reduce((a, c) => (c.w > a.w ? c : a));
      const out: Rgb =
        top.w > 0
          ? ([top.r / top.w, top.g / top.w, top.b / top.w].map(
              Math.round,
            ) as Rgb)
          : [60, 60, 60];
      colourCache.set(src, out);
      setRgb(out);
    };
    img.src = src;
  }, [src]);
  return rgb;
}

// Darkens a colour toward the brand ink so text stays readable on white.
const ink = ([r, g, b]: Rgb, k = 0.35): string =>
  `rgb(${Math.round(r * (1 - k) + 11 * k)}, ${Math.round(g * (1 - k) + 42 * k)}, ${Math.round(b * (1 - k) + 34 * k)})`;

function Cell({ partner, number }: { partner: Partner; number: number }) {
  const rgb = useLogoColour(partner.logo);
  const [active, setActive] = useState(false); // tap toggle on touch screens
  const colour = `rgb(${rgb.join(", ")})`;
  const text = ink(rgb);
  return (
    <button
      type="button"
      onClick={() => setActive((a) => !a)}
      onMouseLeave={() => setActive(false)}
      data-active={active || undefined}
      className="group relative flex h-full min-h-[150px] w-full flex-col overflow-hidden px-5 pb-4 pt-4 text-left outline-none md:min-h-[190px] md:px-6"
      aria-label={`${partner.name}${partner.note ? `, ${partner.note}` : ""}`}
    >
      {/* Glow in the logo's dominant colour. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[85%] -translate-x-1/2 -translate-y-1/2 scale-75 rounded-full opacity-0 blur-2xl transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 group-data-[active]:scale-100 group-data-[active]:opacity-100"
        style={{
          background: `radial-gradient(closest-side, rgba(${rgb.join(",")},0.28), rgba(${rgb.join(",")},0.08) 60%, transparent)`,
        }}
      />
      <span
        className="relative text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400 transition-colors duration-300 md:text-[11px] group-hover:text-[var(--c)] group-focus-visible:text-[var(--c)] group-data-[active]:text-[var(--c)]"
        style={{ ...body, ["--c" as string]: text }}
      >
        {String(number).padStart(2, "0")} // {GROUP_LABEL[partner.group]}
      </span>

      <span className="relative flex flex-1 items-center justify-center py-3">
        {partner.logo ? (
          <img
            src={partner.logo}
            alt={partner.name}
            loading="lazy"
            decoding="async"
            className="h-12 w-auto max-w-[78%] object-contain opacity-55 grayscale transition-[filter,opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0 group-data-[active]:scale-105 group-data-[active]:opacity-100 group-data-[active]:grayscale-0 md:h-14"
          />
        ) : (
          <span className="text-lg font-semibold text-neutral-400" style={body}>
            {partner.name}
          </span>
        )}
      </span>

      {/* Name (and verified note) slide up on hover. */}
      <span
        className="relative translate-y-2 text-[12px] leading-snug opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-data-[active]:translate-y-0 group-data-[active]:opacity-100 md:text-[13px]"
        style={{ ...body, color: text }}
      >
        <span className="block font-medium">{partner.name}</span>
        {partner.note && (
          <span className="block opacity-80">{partner.note}</span>
        )}
      </span>

      {/* Hover accent: a small cross in the logo colour at the cell corner. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-data-[active]:opacity-100"
        style={{ color: colour }}
      >
        <span className="absolute bottom-0 right-0 h-px w-3 bg-current" />
        <span className="absolute bottom-0 right-0 h-3 w-px bg-current" />
      </span>
    </button>
  );
}

export default function PartnerGrid() {
  const pages = Math.ceil(ACTIVE_PARTNERS.length / PER_PAGE);
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const go = (d: number) => {
    setDir(d);
    setPage((p) => (p + d + pages) % pages);
  };
  const slice = ACTIVE_PARTNERS.slice(
    page * PER_PAGE,
    page * PER_PAGE + PER_PAGE,
  );
  const first = page * PER_PAGE + 1;
  const last = page * PER_PAGE + slice.length;

  return (
    <div>
      {/* Framed grid: outer frame, inner rounded panel, and thin rules
          between the partners. */}
      <div className="rounded-[28px] border border-[#0B6477]/10 bg-white/70 p-2 shadow-[0_30px_80px_-50px_rgba(8,49,58,0.45)] backdrop-blur md:p-3">
        <div className="relative overflow-clip rounded-[22px] border border-[#0B6477]/10 bg-[#0B6477]/12">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={page}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 40 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -40 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: EASE }}
              // gap-px over the tinted panel draws the thin rules between cells
              className="grid grid-cols-2 gap-px lg:grid-cols-3"
            >
              {Array.from({ length: PER_PAGE }, (_, i) => {
                const partner = slice[i];
                return (
                  <div
                    key={partner?.name ?? `empty-${i}`}
                    className="relative bg-white"
                  >
                    {partner ? (
                      <Cell
                        partner={partner}
                        number={page * PER_PAGE + i + 1}
                      />
                    ) : (
                      <div className="min-h-[150px] md:min-h-[190px]" />
                    )}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Pager: which partners are showing, dots, and arrows. */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <span
          className="text-[13px] tabular-nums text-neutral-500"
          style={body}
        >
          {String(first).padStart(2, "0")}–{String(last).padStart(2, "0")}{" "}
          <span className="text-neutral-400">
            of {ACTIVE_PARTNERS.length} partners
          </span>
        </span>
        <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
          {Array.from({ length: pages }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === page ? "w-6 bg-[#14919B]" : "w-1.5 bg-[#0B6477]/20"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => go(d)}
              aria-label={d < 0 ? "Previous partners" : "Next partners"}
              className="grid h-11 w-11 place-items-center rounded-full border border-[#0B6477]/20 bg-white/80 text-[#0B6477] transition-colors hover:border-[#08313A] hover:bg-[#08313A] hover:text-[#45DFB1]"
            >
              {d < 0 ? (
                <ArrowLeft className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
