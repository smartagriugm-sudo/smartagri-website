import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, Camera, MapPin } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { albums, findAlbum, type GalleryAlbum } from "../lib/gallery";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import BentoGallery from "../components/BentoGallery";
import { AlbumCard, photosOf } from "../components/GalleryPreview";
import { CategoryChip, EASE } from "../components/NoteParts";

export const Route = createFileRoute("/gallery_/$slug")({
  component: AlbumPage,
  loader: ({ params }) => findAlbum(params.slug),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Gallery"} | smartagri` },
      ...(loaderData?.excerpt
        ? [{ name: "description", content: loaderData.excerpt }]
        : []),
    ],
  }),
});

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: EASE },
});

// Same category first, then the newest albums, never the one being viewed.
function relatedTo(album: GalleryAlbum) {
  const others = albums.filter((a) => a.slug !== album.slug);
  return [
    ...others.filter((a) => a.category === album.category),
    ...others.filter((a) => a.category !== album.category),
  ].slice(0, 3);
}

// One album (one activity): masthead in the Field Notes reading-page style,
// then the draggable bento strip of its photos, then more albums.
function AlbumPage() {
  const album = Route.useLoaderData();

  if (!album) {
    return (
      <main>
        <SiteHeader />
        <section className="bg-[#F3F7F6]">
          <div className="max-w-[760px] mx-auto px-6 py-24 text-center flex flex-col items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900" style={display}>
              Album not found
            </h1>
            <p className="text-neutral-500" style={body}>
              The album you're looking for doesn't exist or may have been moved.
            </p>
            <Link
              to="/gallery"
              className="px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
              style={body}
            >
              Back to Gallery
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const photos = photosOf(album);
  const related = relatedTo(album);
  const caption = [album.dateLabel, album.location].filter(Boolean).join(" · ");

  return (
    <main>
      <SiteHeader />
      <div className="relative overflow-clip bg-white">
        <AmbientWash count={4} />

        <article className="relative" key={album.slug}>
          <header className="mx-auto max-w-[1360px] px-6 pt-10 md:px-12 md:pt-16">
            <motion.div {...rise(0)}>
              <Link
                to="/gallery"
                className="group inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-[#0B6477]"
                style={body}
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Gallery
              </Link>
            </motion.div>
            <motion.div {...rise(0.08)} className="mt-6">
              <CategoryChip>{album.category}</CategoryChip>
            </motion.div>
            <div className="mt-5 overflow-hidden pb-[0.08em]">
              <motion.h1
                initial={{ y: "40%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.9, ease: EASE }}
                className="max-w-[920px] text-[clamp(2rem,4.6vw,3.9rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-neutral-900"
                style={display}
              >
                {album.title}
              </motion.h1>
            </div>
            {album.excerpt && (
              <motion.p
                {...rise(0.3)}
                className="mt-6 max-w-[680px] text-lg leading-relaxed text-neutral-500 md:text-xl"
                style={body}
              >
                {album.excerpt}
              </motion.p>
            )}
            <motion.div
              {...rise(0.4)}
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-600"
              style={body}
            >
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-[#14919B]" />
                {album.dateLabel}
              </span>
              {album.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#14919B]" />
                  {album.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-[#14919B]" />
                {photos.length} photos
              </span>
            </motion.div>
          </header>

          <motion.div {...rise(0.5)} className="pb-20 pt-12 md:pb-24 md:pt-16">
            <BentoGallery photos={photos} caption={caption} />
          </motion.div>
        </article>

        {related.length > 0 && (
          <section className="relative border-t border-[#0B6477]/10">
            <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-24">
              <div className="mb-10 flex items-end justify-between gap-6">
                <h2
                  className="text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                  style={display}
                >
                  More
                  <br />
                  <span style={accent}>albums.</span>
                </h2>
                <Link
                  to="/gallery"
                  className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                  style={body}
                >
                  Full gallery
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {related.map((a, i) => (
                  <motion.div
                    key={a.slug}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: i * 0.08, duration: 0.55, ease: EASE }}
                    className={i === 2 ? "md:hidden lg:block" : ""}
                  >
                    <AlbumCard album={a} index={i + 1} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
}
