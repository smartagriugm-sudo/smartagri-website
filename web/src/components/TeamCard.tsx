import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
        className="group flex flex-col h-full rounded-3xl bg-white border border-[#0B6477]/10 overflow-hidden hover:shadow-xl transition-shadow"
      >
        <div className="aspect-[4/5] overflow-hidden relative shrink-0">
          <MemberPhoto member={member} index={index} />
          {member.coordinator && (
            <span
              className="absolute top-3 left-3 rounded-full bg-[#45DFB1] text-[#0B2A22] text-[11px] font-semibold px-3 py-1"
              style={body}
            >
              Coordinator
            </span>
          )}
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <div
            className="text-base sm:text-lg font-medium text-neutral-900 leading-snug group-hover:text-[#0B6477] transition-colors min-h-[2.6rem]"
            style={display}
          >
            {member.name}
          </div>
          <div
            className="text-sm font-normal text-neutral-500 mt-1"
            style={body}
          >
            {member.role}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
