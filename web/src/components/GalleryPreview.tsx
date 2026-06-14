import { motion } from "framer-motion";
import { Link, createLink } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, Camera, MapPin } from "lucide-react";
import { A } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import { albums, categoryMeta, galleryCovers } from "../lib/gallery";

const MotionLink = createLink(motion.a);

// Latest three albums for the home preview.
const preview = albums.slice(0, 3);

export default function GalleryPreview() {
  return (
    <section id="gallery" className="bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
        <div
          className="text-center text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
          style={body}
        >
          Gallery
        </div>
        <h2
          className="text-center text-4xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] mb-4 text-neutral-900"
          style={display}
        >
          Moments from <span style={accent}>our work</span>
        </h2>
        <p
          className="text-center text-base md:text-lg font-normal text-neutral-500 max-w-[560px] mx-auto mb-10"
          style={body}
        >
          Documentation from exhibitions, conferences, field deployments, and
          workshops across the smartagri program.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {preview.map((album, i) => {
            const meta = categoryMeta[album.category];
            const Icon = meta.icon;
            return (
              <MotionLink
                key={album.slug}
                to="/gallery"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                className="group flex flex-col overflow-hidden rounded-3xl bg-white border border-[#0B6477]/10 hover:shadow-xl transition-shadow"
              >
                <div
                  className="relative h-[200px] overflow-hidden"
                  style={{ background: galleryCovers[i % galleryCovers.length] }}
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
                      <img
                        src={A.iconWhite}
                        alt=""
                        className="h-12 w-auto opacity-40"
                      />
                    </div>
                  )}
                  <span
                    className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white"
                    style={body}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {album.photoCount}
                  </span>
                </div>

                <div className="p-6 flex flex-col gap-3 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.chip}`}
                      style={body}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {album.category}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 text-sm font-normal text-neutral-400"
                      style={body}
                    >
                      <CalendarDays className="w-4 h-4" />
                      {album.dateLabel}
                    </span>
                  </div>
                  <span
                    className="text-lg md:text-xl font-medium leading-snug text-neutral-900 group-hover:text-[#0B6477] transition-colors"
                    style={display}
                  >
                    {album.title}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-normal text-neutral-400"
                    style={body}
                  >
                    <MapPin className="w-4 h-4" />
                    {album.location}
                  </span>
                </div>
              </MotionLink>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          className="flex justify-center mt-10"
        >
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] text-lg font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
            style={body}
          >
            View full gallery
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
