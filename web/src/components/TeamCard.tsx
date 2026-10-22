import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { body, display } from "../lib/fonts";
import {
  memberGradients,
  memberInitials,
  type TeamMember,
} from "../lib/team";

export function MemberPhoto({
  member,
  index = 0,
  className = "",
}: {
  member: TeamMember;
  index?: number;
  className?: string;
}) {
  if (member.photo) {
    return (
      <img
        src={member.photo}
        alt={member.name}
        loading="lazy"
        className={`object-cover object-top w-full h-full ${className}`}
      />
    );
  }
  // TODO: replace with real half-body portraits (web/public/brand/team/<slug>.webp)
  return (
    <div
      className={`w-full h-full flex items-center justify-center ${className}`}
      style={{ background: memberGradients[index % memberGradients.length] }}
    >
      <span
        className="text-4xl sm:text-5xl font-semibold text-white/90"
        style={display}
      >
        {memberInitials(member.name)}
      </span>
    </div>
  );
}

// Member card, with the same hover as the Field Notes cards: the card lifts,
// the portrait zooms slowly under a soft gradient that carries the member's
// group, the name turns teal and the arrow turns to point the way.
export function TeamCard({
  member,
  index,
}: {
  member: TeamMember;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ delay: (index % 4) * 0.08, duration: 0.5, ease: "easeOut" }}
      className="h-full"
    >
      <Link
        to="/team/$slug"
        params={{ slug: member.slug }}
        className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#0B6477]/10 bg-white/90 shadow-[0_14px_40px_-28px_rgba(8,49,58,0.35)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-28px_rgba(8,49,58,0.45)]"
      >
        <div className="relative aspect-[4/5] shrink-0 overflow-hidden bg-[#F3F7F6]">
          <div className="h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]">
            <MemberPhoto member={member} index={index} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#08313A]/55 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <span
            className="pointer-events-none absolute bottom-3 left-4 translate-y-2 text-[11px] font-medium uppercase tracking-[0.1em] text-white/90 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
            style={body}
          >
            {member.category}
          </span>
          {member.coordinator && (
            <span
              className="absolute left-3 top-3 rounded-full bg-[#45DFB1] px-3 py-1 text-[11px] font-semibold text-[#0B2A22]"
              style={body}
            >
              Coordinator
            </span>
          )}
        </div>
        <div className="flex flex-1 items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <div
              className="min-h-[2.6rem] text-base font-medium leading-snug text-neutral-900 transition-colors duration-300 group-hover:text-[#0B6477] sm:text-lg"
              style={display}
            >
              {member.name}
            </div>
            <div className="mt-1 text-sm text-neutral-500" style={body}>
              {member.role}
            </div>
          </div>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#0B6477] transition-[rotate] duration-300 group-hover:rotate-45" />
        </div>
      </Link>
    </motion.div>
  );
}
