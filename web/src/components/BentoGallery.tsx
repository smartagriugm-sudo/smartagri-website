import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Expand } from "lucide-react";
import { body } from "../lib/fonts";
import PhotoLightbox from "./PhotoLightbox";

// Bento photo grid for one album (after the 21st.dev "Interactive Image Bento
// Gallery"), in smartagri colours. It flows down the page inside the content
// width: a repeating mix of tile sizes, tiles rising in as they scroll into
// view, the photo number on hover, and the lightbox on click.

// Seven tiles fill exactly three rows of four columns (12 cells) on md+, and
// six rows of two on phones, so the grid packs without holes mid-way.
const SPANS = [
  "col-span-2 row-span-2", // large
  "",
  "",
  "row-span-2", // tall
  "",
  "col-span-2", // wide
  "",
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function BentoGallery({
  photos,
  caption,
}: {
  photos: string[];
  /** Shown under the photo number on hover, e.g. the album date and place */
  caption?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-[1360px] px-6 md:px-12">
      <p className="text-sm text-neutral-500" style={body}>
        <span className="font-medium text-neutral-800">{photos.length} photos</span>
        <span> · Click any photo to expand</span>
      </p>

      <div className="mt-6 grid grid-flow-row-dense grid-cols-2 auto-rows-[10rem] gap-3 sm:auto-rows-[13rem] md:grid-cols-4 md:auto-rows-[15rem] md:gap-4">
        {photos.map((src, i) => (
          <motion.button
            key={src}
            type="button"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "0px 0px -8% 0px" }}
            transition={{ delay: (i % 4) * 0.06, duration: 0.6, ease: EASE }}
            onClick={() => setOpen(i)}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            className={`group relative flex items-end overflow-hidden rounded-2xl border border-[#0B6477]/10 bg-[#0B6477] p-4 text-left shadow-[0_14px_40px_-28px_rgba(8,49,58,0.45)] transition-shadow duration-500 hover:shadow-[0_24px_50px_-24px_rgba(8,49,58,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14919B] focus-visible:ring-offset-2 ${SPANS[i % SPANS.length]}`}
          >
            <img
              src={src}
              alt=""
              loading={i < 7 ? "eager" : "lazy"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08313A]/85 via-[#08313A]/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="pointer-events-none relative z-10 flex w-full translate-y-3 items-end justify-between gap-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
              <span style={body}>
                <span className="block text-base font-semibold text-white tabular-nums">
                  Photo {String(i + 1).padStart(2, "0")}
                </span>
                {caption && (
                  <span className="mt-0.5 hidden text-[13px] text-white/75 sm:block">
                    {caption}
                  </span>
                )}
              </span>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#45DFB1] text-[#08313A]">
                <Expand className="h-4 w-4" />
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {open !== null && (
          <PhotoLightbox
            photos={photos}
            index={open}
            onIndex={setOpen}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
