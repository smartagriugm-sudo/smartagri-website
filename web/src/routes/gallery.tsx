import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Camera, Images, MapPin, X } from "lucide-react";
import { A } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import {
  GALLERY_FILTERS,
  albums,
  categoryMeta,
  galleryCovers,
  type GalleryAlbum,
} from "../lib/gallery";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/gallery")({
  component: GalleryPage,
  head: () => ({
    meta: [
      { title: "Gallery | smartagri" },
      {
        name: "description",
        content:
          "Documentation of smartagri activities: exhibitions, conferences, field work, workshops, and collaborations from the Smart Agriculture Research Center.",
      },
    ],
  }),
});

function CategoryChip({ category }: { category: GalleryAlbum["category"] }) {
  const meta = categoryMeta[category];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.chip}`}
      style={body}
    >
      <Icon className="w-3.5 h-3.5" />
      {category}
    </span>
  );
}

function AlbumCover({
  album,
  index,
  featured,
}: {
  album: GalleryAlbum;
  index: number;
  featured?: boolean;
}) {
  return (
    <div
      className={
        featured
          ? "relative h-[240px] lg:h-auto lg:min-h-full lg:w-[48%] shrink-0 overflow-hidden"
          : "relative h-[200px] overflow-hidden"
      }
      style={{ background: galleryCovers[index % galleryCovers.length] }}
    >
      {album.cover ? (
        <img
          src={album.cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={A.iconWhite} alt="" className="h-12 w-auto opacity-40" />
        </div>
      )}
      {/* photo-count badge */}
      <span
        className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white"
        style={body}
      >
        <Camera className="w-3.5 h-3.5" />
        {album.photoCount}
      </span>
    </div>
  );
}

function AlbumMeta({ album }: { album: GalleryAlbum }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <CategoryChip category={album.category} />
      <span
        className="inline-flex items-center gap-1.5 text-sm font-normal text-neutral-400"
        style={body}
      >
        <CalendarDays className="w-4 h-4" />
        {album.dateLabel}
      </span>
      <span
        className="inline-flex items-center gap-1.5 text-sm font-normal text-neutral-400"
        style={body}
      >
        <MapPin className="w-4 h-4" />
        {album.location}
      </span>
    </div>
  );
}

// Lightbox-style album preview. Shows real photos when present, otherwise
// placeholder tiles sized to the album's photo count.
function AlbumModal({
  album,
  index,
  onClose,
}: {
  album: GalleryAlbum;
  index: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const tiles = album.photos?.length
    ? album.photos
    : Array.from({ length: album.photoCount }, () => null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-start md:items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={album.title}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[920px] my-auto rounded-3xl bg-white overflow-hidden shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div
          className="relative h-[200px] md:h-[260px]"
          style={{ background: galleryCovers[index % galleryCovers.length] }}
        >
          {album.cover ? (
            <img
              src={album.cover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <img src={A.iconWhite} alt="" className="h-14 w-auto opacity-40" />
            </div>
          )}
        </div>

        <div className="p-6 md:p-9">
          <AlbumMeta album={album} />
          <h2
            className="text-2xl md:text-3xl font-semibold tracking-[-0.025em] text-neutral-900 mt-4"
            style={display}
          >
            {album.title}
          </h2>
          <p
            className="text-sm md:text-base font-normal text-neutral-500 leading-relaxed mt-3 max-w-[680px]"
            style={body}
          >
            {album.excerpt}
          </p>

          <div className="flex items-center gap-2 mt-8 mb-4 text-[#0B6477]">
            <Images className="w-4 h-4" />
            <span className="text-sm font-medium" style={body}>
              {album.photoCount} photos
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {tiles.map((photo, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-xl overflow-hidden"
                style={{
                  background: galleryCovers[(index + i) % galleryCovers.length],
                }}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
          {!album.photos?.length && (
            <p
              className="text-xs font-normal text-neutral-400 mt-4"
              style={body}
            >
              Documentation photos for this activity will be added here soon.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function GalleryPage() {
  const [filter, setFilter] = useState<string>("All");
  const [active, setActive] = useState<{ album: GalleryAlbum; index: number } | null>(
    null,
  );

  const filtered =
    filter === "All"
      ? albums
      : albums.filter((album) => album.category === filter);
  const [featured, ...rest] = filtered;

  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="Gallery"
            title={
              <>
                Documenting our work, <span style={accent}>in the field and beyond</span>
              </>
            }
            subtitle="A visual record of what smartagri does: exhibitions, conferences, field deployments, workshops with farmers, and the collaborations behind the research."
          />

          {/* Filter pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {GALLERY_FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={
                  filter === item
                    ? "rounded-full px-5 py-2 text-sm font-medium bg-[#0B6477] text-white transition-colors"
                    : "rounded-full px-5 py-2 text-sm font-medium border border-[#0B6477]/20 text-neutral-600 hover:border-[#0B6477] hover:text-[#0B6477] bg-white transition-colors"
                }
                style={body}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Featured album */}
          {featured && (
            <motion.button
              key={`featured-${filter}-${featured.slug}`}
              type="button"
              onClick={() => setActive({ album: featured, index: 0 })}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="group w-full text-left flex flex-col lg:flex-row overflow-hidden rounded-3xl bg-white border border-[#0B6477]/10 hover:shadow-xl transition-shadow mb-6"
            >
              <AlbumCover album={featured} index={0} featured />
              <div className="flex flex-col gap-4 p-7 md:p-10 justify-center">
                <AlbumMeta album={featured} />
                <span
                  className="text-2xl md:text-3xl font-medium leading-snug text-neutral-900 group-hover:text-[#0B6477] transition-colors"
                  style={display}
                >
                  {featured.title}
                </span>
                <span
                  className="text-base font-normal text-neutral-500 leading-relaxed max-w-[560px]"
                  style={body}
                >
                  {featured.excerpt}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-[#0B6477] font-medium transition-transform group-hover:translate-x-0.5"
                  style={body}
                >
                  <Images className="w-4 h-4" />
                  View album
                </span>
              </div>
            </motion.button>
          )}

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((album, i) => (
              <motion.button
                key={`${filter}-${album.slug}`}
                type="button"
                onClick={() => setActive({ album, index: i + 1 })}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.5, ease: "easeOut" }}
                className="group text-left flex flex-col overflow-hidden rounded-3xl bg-white border border-[#0B6477]/10 hover:shadow-xl transition-shadow"
              >
                <AlbumCover album={album} index={i + 1} />
                <div className="flex flex-col gap-3 p-6 flex-1">
                  <AlbumMeta album={album} />
                  <span
                    className="text-lg md:text-xl font-medium leading-snug text-neutral-900 group-hover:text-[#0B6477] transition-colors"
                    style={display}
                  >
                    {album.title}
                  </span>
                  <span
                    className="text-sm font-normal text-neutral-500 leading-relaxed line-clamp-3"
                    style={body}
                  >
                    {album.excerpt}
                  </span>
                  <span
                    className="mt-auto pt-2 inline-flex items-center gap-1.5 text-[#0B6477] font-medium transition-transform group-hover:translate-x-0.5"
                    style={body}
                  >
                    <Images className="w-4 h-4" />
                    View album
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {active && (
          <AlbumModal
            album={active.album}
            index={active.index}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}
