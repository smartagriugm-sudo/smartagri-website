import { useState } from "react";
import { motion } from "framer-motion";
import { Link, createLink } from "@tanstack/react-router";

// Router-typed Link that also accepts framer-motion animation props
const MotionLink = createLink(motion.a);
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { A } from "../lib/assets";
import { body, display } from "../lib/fonts";
import {
  NOTE_FILTERS,
  categoryChip,
  covers,
  notes,
  type Note,
  type NoteFilter,
} from "../lib/notes";

function Cover({
  index,
  featured,
  photo,
}: {
  index: number;
  featured?: boolean;
  photo?: string;
}) {
  return (
    <div
      className={
        featured
          ? "relative h-[220px] lg:h-auto lg:min-h-full lg:w-[46%] shrink-0"
          : "relative h-[180px]"
      }
      style={{ background: covers[index % covers.length] }}
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={A.iconWhite} alt="" className="h-12 w-auto opacity-50" />
        </div>
      )}
    </div>
  );
}

function Meta({ note }: { note: Note }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryChip(note.category)}`}
        style={body}
      >
        {note.category}
      </span>
      <span
        className="inline-flex items-center gap-1.5 text-sm font-normal text-neutral-400"
        style={body}
      >
        <CalendarDays className="w-4 h-4" />
        {note.date}
      </span>
    </div>
  );
}

function ReadMore() {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[#0B6477] font-medium transition-transform group-hover:translate-x-0.5"
      style={body}
    >
      Continue reading
      <ArrowUpRight className="w-4 h-4" />
    </span>
  );
}

export default function NotesExplorer({
  limit,
  showViewAll = false,
}: {
  limit?: number;
  showViewAll?: boolean;
}) {
  const [filter, setFilter] = useState<NoteFilter>("All");

  const pool = limit ? notes.slice(0, limit) : notes;
  const filtered =
    filter === "All" ? pool : pool.filter((note) => note.category === filter);
  const [featured, ...rest] = filtered;

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {NOTE_FILTERS.map((item) => (
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

      {featured && (
        <MotionLink
          key={`featured-${filter}-${featured.title}`}
          to="/field-notes/$slug"
          params={{ slug: featured.slug }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="group flex flex-col lg:flex-row overflow-hidden rounded-3xl bg-white border border-[#0B6477]/10 hover:shadow-xl transition-shadow mb-6"
        >
          <Cover index={0} featured photo={featured.cover} />
          <div className="flex flex-col gap-4 p-7 md:p-10 justify-center">
            <Meta note={featured} />
            <span
              className="text-2xl md:text-3xl font-medium leading-snug text-neutral-900"
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
            <ReadMore />
          </div>
        </MotionLink>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rest.map((note, i) => (
          <MotionLink
            key={`${filter}-${note.title}`}
            to="/field-notes/$slug"
            params={{ slug: note.slug }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ delay: (i % 3) * 0.08, duration: 0.5, ease: "easeOut" }}
            className="group flex flex-col overflow-hidden rounded-3xl bg-white border border-[#0B6477]/10 hover:shadow-xl transition-shadow"
          >
            <Cover index={i + 1} photo={note.cover} />
            <div className="flex flex-col gap-3 p-6 flex-1">
              <Meta note={note} />
              <span
                className="text-lg md:text-xl font-medium leading-snug text-neutral-900"
                style={display}
              >
                {note.title}
              </span>
              <span
                className="text-sm font-normal text-neutral-500 leading-relaxed"
                style={body}
              >
                {note.excerpt}
              </span>
              <div className="mt-auto pt-2">
                <ReadMore />
              </div>
            </div>
          </MotionLink>
        ))}
      </div>

      {showViewAll && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          className="flex justify-center mt-10"
        >
          <Link
            to="/field-notes"
            className="px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] text-lg font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
            style={body}
          >
            View all field notes
          </Link>
        </motion.div>
      )}
    </div>
  );
}
