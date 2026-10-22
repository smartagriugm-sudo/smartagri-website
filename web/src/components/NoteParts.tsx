import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { A } from "../lib/assets";
import { body, display } from "../lib/fonts";
import { covers, type Note } from "../lib/notes";

// Pieces shared by the landing Field Notes section and the note reading page
// (Quayside journal style): photo, category chip, byline, note card and the
// masked heading line.

export const EASE = [0.16, 1, 0.3, 1] as const;
export const META = "text-[11px] font-medium uppercase tracking-[0.1em]";

export function readMinutes(note: Note) {
  if (!note.body) return null;
  return Math.max(1, Math.round(note.body.split(/\s+/).length / 200));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

// Photo with a slow zoom on hover; brand gradient + icon when there is none.
export function Photo({
  note,
  index,
  className = "",
}: {
  note: Note;
  index: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: covers[index % covers.length] }}
    >
      {note.cover ? (
        <img
          src={note.cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={A.iconWhite} alt="" className="h-12 w-auto opacity-50" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#08313A]/70 to-transparent" />
    </div>
  );
}

export function CategoryChip({ children }: { children: string }) {
  return (
    <span
      className={`inline-flex rounded-full border border-[#0B6477]/15 bg-[#F3F7F6] px-2.5 py-1 text-[#0B6477] ${META}`}
      style={body}
    >
      {children}
    </span>
  );
}

export function Byline({ note }: { note: Note }) {
  const minutes = readMinutes(note);
  return (
    <div className="flex items-center gap-3">
      {note.author ? (
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F3F7F6] text-[12px] font-semibold text-[#0B6477]"
          style={body}
        >
          {initials(note.author)}
        </span>
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F3F7F6]">
          <img src={A.iconColor} alt="" className="h-4 w-auto" />
        </span>
      )}
      <span className="min-w-0" style={body}>
        <span className="block truncate text-sm font-medium text-neutral-900">
          {note.author ?? "Smart Agriculture Research Center"}
        </span>
        <span className="block text-[13px] text-neutral-500">
          {note.date}
          {minutes && ` · ${minutes} min read`}
        </span>
      </span>
    </div>
  );
}

export function NoteCard({ note, index }: { note: Note; index: number }) {
  const minutes = readMinutes(note);
  return (
    <Link
      to="/field-notes/$slug"
      params={{ slug: note.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#0B6477]/10 bg-white/85 shadow-[0_14px_40px_-28px_rgba(8,49,58,0.35)] backdrop-blur transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-28px_rgba(8,49,58,0.45)]"
    >
      <div className="relative">
        <Photo note={note} index={index} className="h-[200px]" />
        <span
          className={`absolute bottom-4 left-5 text-white/85 ${META}`}
          style={body}
        >
          {note.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div>
          <CategoryChip>{note.category}</CategoryChip>
        </div>
        <h3
          className="line-clamp-3 text-lg font-medium leading-snug tracking-[-0.02em] text-neutral-900 transition-colors duration-300 group-hover:text-[#0B6477] md:text-xl"
          style={display}
        >
          {note.title}
        </h3>
        <p
          className="line-clamp-2 text-[15px] leading-relaxed text-neutral-500"
          style={body}
        >
          {note.excerpt}
        </p>
        <div
          className={`mt-auto flex items-center justify-between gap-3 pt-3 text-neutral-400 ${META}`}
          style={body}
        >
          <span>{note.date}</span>
          <span className="inline-flex items-center gap-1.5">
            {minutes && `${minutes} min read`}
            <ArrowUpRight className="h-3.5 w-3.5 text-[#0B6477] transition-[rotate] duration-300 group-hover:rotate-45" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Heading line that slides up from behind a mask. Driven by the heading's
// "show" variant: the hidden line itself never intersects the viewport.
export function MaskLine({
  children,
  delay,
}: {
  children: ReactNode;
  delay: number;
}) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        variants={{
          hidden: { y: "105%" },
          show: { y: 0, transition: { delay, duration: 0.9, ease: EASE } },
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}
