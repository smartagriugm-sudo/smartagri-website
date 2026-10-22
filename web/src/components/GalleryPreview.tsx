import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Camera, MapPin } from "lucide-react";
import { A } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import {
  GALLERY_FILTERS,
  albums,
  galleryCovers,
  type GalleryAlbum,
} from "../lib/gallery";
import { CategoryChip, EASE, MaskLine, META } from "./NoteParts";

// Gallery, built like Field Notes (Quayside journal): masked headline,
// category pills, one featured album (a three-photo mosaic so it reads as a
// gallery), then album cards. Two modes:
//   - landing section: featured + 3 cards and a link to the full gallery;
//   - `archive` (/gallery): page h1 and every album.
// Every album opens its own page, /gallery/<slug>. The drifting washes behind
// it come from AmbientWash on the route.

export function photosOf(album: GalleryAlbum) {
  const list = album.photos?.length
    ? album.photos
    : album.cover
      ? [album.cover]
      : [];
  return album.cover
    ? [album.cover, ...list.filter((p) => p !== album.cover)]
    : list;
}

// One photo tile with a slow zoom on hover; brand gradient + icon when empty.
function Tile({
  src,
  index,
  className = "",
}: {
  src?: string;
  index: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: galleryCovers[index % galleryCovers.length] }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={A.iconWhite} alt="" className="h-10 w-auto opacity-40" />
        </div>
      )}
    </div>
  );
}

function PhotoCount({ album }: { album: GalleryAlbum }) {
  return (
    <span
      className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#08313A]/55 px-3 py-1 text-white backdrop-blur-sm ${META}`}
      style={body}
    >
      <Camera className="h-3.5 w-3.5" />
      {album.photoCount} photos
    </span>
  );
}

function Place({ album }: { album: GalleryAlbum }) {
  return (
    <span className="text-[13px] text-neutral-500" style={body}>
      {album.dateLabel}
      {album.location && (
        <>
          {" · "}
          <MapPin className="mb-0.5 inline h-3.5 w-3.5" /> {album.location}
        </>
      )}
    </span>
  );
}

function FeaturedAlbum({ album }: { album: GalleryAlbum }) {
  const [main, second, third] = photosOf(album);
  return (
    <Link
      to="/gallery/$slug"
      params={{ slug: album.slug }}
      className="group grid overflow-hidden rounded-[28px] border border-[#0B6477]/10 bg-white/85 shadow-[0_20px_60px_-30px_rgba(8,49,58,0.35)] backdrop-blur transition-shadow duration-500 hover:shadow-[0_30px_80px_-30px_rgba(8,49,58,0.45)] lg:grid-cols-2"
    >
      {/* Mosaic: one large photo, two stacked beside it. */}
      <div className="relative grid h-[260px] grid-cols-3 grid-rows-2 gap-1 sm:h-[320px] lg:h-full lg:min-h-[420px]">
        <Tile src={main} index={0} className="col-span-2 row-span-2" />
        <Tile src={second ?? main} index={1} />
        <Tile src={third ?? main} index={2} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#08313A]/60 to-transparent" />
        <span
          className={`absolute bottom-5 left-6 text-white/85 ${META}`}
          style={body}
        >
          {album.category}
        </span>
        <PhotoCount album={album} />
      </div>

      <div className="flex flex-col gap-5 p-7 md:p-10">
        <div>
          <CategoryChip>{album.category}</CategoryChip>
        </div>
        <h3
          className="line-clamp-3 text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-neutral-900 transition-colors duration-300 group-hover:text-[#0B6477] md:text-[32px]"
          style={display}
        >
          {album.title}
        </h3>
        <p
          className="line-clamp-3 text-base leading-relaxed text-neutral-500 md:text-[17px]"
          style={body}
        >
          {album.excerpt}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-2">
          <Place album={album} />
          <span
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#0B6477]"
            style={body}
          >
            View the album
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AlbumCard({
  album,
  index,
}: {
  album: GalleryAlbum;
  index: number;
}) {
  return (
    <Link
      to="/gallery/$slug"
      params={{ slug: album.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#0B6477]/10 bg-white/85 shadow-[0_14px_40px_-28px_rgba(8,49,58,0.35)] backdrop-blur transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-28px_rgba(8,49,58,0.45)]"
    >
      <div className="relative">
        <Tile src={photosOf(album)[0]} index={index} className="h-[220px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#08313A]/60 to-transparent" />
        <span
          className={`absolute bottom-4 left-5 text-white/85 ${META}`}
          style={body}
        >
          {album.category}
        </span>
        <PhotoCount album={album} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div>
          <CategoryChip>{album.category}</CategoryChip>
        </div>
        <h3
          className="line-clamp-2 text-lg font-medium leading-snug tracking-[-0.02em] text-neutral-900 transition-colors duration-300 group-hover:text-[#0B6477] md:text-xl"
          style={display}
        >
          {album.title}
        </h3>
        <p
          className="line-clamp-2 text-[15px] leading-relaxed text-neutral-500"
          style={body}
        >
          {album.excerpt}
        </p>
        <div
          className={`mt-auto flex items-center justify-between gap-3 pt-3 text-neutral-400 ${META}`}
          style={body}
        >
          <span>{album.dateLabel}</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-[#0B6477] transition-[rotate] duration-300 group-hover:rotate-45" />
        </div>
      </div>
    </Link>
  );
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.6 },
  transition: { delay, duration: 0.6, ease: "easeOut" as const },
});

export default function GalleryPreview({
  archive = false,
}: {
  archive?: boolean;
}) {
  const [filter, setFilter] = useState("All");
  const list =
    filter === "All" ? albums : albums.filter((a) => a.category === filter);
  const [featured, ...rest] = list;
  const cards = archive ? rest : rest.slice(0, 3);
  const Heading = archive ? motion.h1 : motion.h2;

  return (
    <section id="gallery" className="relative">
      <div
        className={`relative mx-auto max-w-[1360px] px-6 md:px-12 ${
          archive ? "pb-20 pt-12 md:pb-28 md:pt-20" : "py-20 md:py-28"
        }`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Heading
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.5 }}
              className="text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-900 sm:text-5xl md:text-[64px]"
              style={display}
            >
              {archive ? (
                <>
                  <MaskLine delay={0}>Documenting our work,</MaskLine>
                  <MaskLine delay={0.12}>
                    <span style={accent}>in the field and beyond.</span>
                  </MaskLine>
                </>
              ) : (
                <>
                  <MaskLine delay={0}>Moments from</MaskLine>
                  <MaskLine delay={0.12}>
                    <span style={accent}>our work.</span>
                  </MaskLine>
                </>
              )}
            </Heading>
            <motion.p
              {...fadeUp(0.3)}
              className="mt-5 max-w-[560px] text-base leading-relaxed text-neutral-500 md:text-lg"
              style={body}
            >
              {archive
                ? "A visual record of what smartagri does: exhibitions, conferences, field deployments, workshops with farmers, and the collaborations behind the research."
                : "Documentation from exhibitions, conferences, field deployments and workshops across the smartagri program."}
            </motion.p>
          </div>
          <motion.div {...fadeUp(0.4)}>
            {archive ? (
              <span className={`text-neutral-400 ${META}`} style={body}>
                {list.length} {list.length === 1 ? "album" : "albums"} ·{" "}
                {list.reduce((n, a) => n + a.photoCount, 0)} photos
              </span>
            ) : (
              <Link
                to="/gallery"
                className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                style={body}
              >
                Full gallery
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </motion.div>
        </div>

        {/* Category pills; the dark "active" pill slides between them. */}
        <motion.div
          {...fadeUp(0.5)}
          className="mt-10 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter albums by category"
        >
          {GALLERY_FILTERS.map((f) => {
            const active = f === filter;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f)}
                className={`relative rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-transparent text-white"
                    : "border-[#0B6477]/15 bg-white/70 text-neutral-700 hover:border-[#0B6477]/40"
                }`}
                style={body}
              >
                {active && (
                  <motion.span
                    layoutId={archive ? "gallery-pill-archive" : "gallery-pill"}
                    className="absolute inset-0 rounded-full bg-[#08313A]"
                    transition={{ duration: 0.45, ease: EASE }}
                  />
                )}
                <span className="relative">{f}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Revealed on scroll; switching pills cross-fades the content. */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-8 flex flex-col gap-6"
            >
              {featured && <FeaturedAlbum album={featured} />}
              {rest.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {cards.map((album, i) => (
                    <motion.div
                      key={album.slug}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.12 + i * 0.06,
                        duration: 0.55,
                        ease: EASE,
                      }}
                      className={
                        !archive && i === 2 ? "md:hidden lg:block" : ""
                      }
                    >
                      <AlbumCard album={album} index={i + 1} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
