import { motion } from "framer-motion";
import { body, display } from "./fonts";

// Portrait fallback gradients + initials, mirrored from the app's team lib so
// the card renders standalone (no data-source coupling).
const memberGradients = [
  "linear-gradient(160deg, #0B6477 0%, #14919B 100%)",
  "linear-gradient(160deg, #14919B 0%, #0AD1C8 100%)",
  "linear-gradient(160deg, #08313A 0%, #0B6477 100%)",
  "linear-gradient(160deg, #14919B 0%, #45DFB1 100%)",
];

function memberInitials(name: string) {
  return name
    .split(" ")
    .filter((part) => /^[A-Z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export type TeamCardMember = {
  /** Display name. */
  name: string;
  /** Role / title line under the name. */
  role: string;
  /** Optional portrait photo; a gradient + initials render when absent. */
  photo?: string;
  /** Shows the mint "Coordinator" badge when true. */
  coordinator?: boolean;
  /** Optional link target for the whole card. */
  href?: string;
};

export type TeamCardProps = {
  /** The member to render. */
  member: TeamCardMember;
  /** Position in the grid; drives the stagger delay and fallback gradient. */
  index?: number;
};

export function MemberPhoto({
  member,
  index = 0,
  className = "",
}: {
  member: TeamCardMember;
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

// Team member card: portrait (or gradient + initials fallback) over a white
// rounded card with an optional Coordinator badge. Router-free — pass `href`
// for the link target.
export function TeamCard({ member, index = 0 }: TeamCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ delay: (index % 4) * 0.08, duration: 0.5, ease: "easeOut" }}
      className="h-full"
    >
      <a
        href={member.href ?? "#"}
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
      </a>
    </motion.div>
  );
}
