import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { body, display } from "./fonts";

export type PageHeroProps = {
  /** Small teal eyebrow above the title. */
  eyebrow: string;
  /** Page title; accepts an accent <span> for the emphasized word. */
  title: ReactNode;
  /** Supporting sentence under the title. */
  subtitle: string;
};

// Shared page intro for non-landing routes: eyebrow + H1 + subtitle.
export function PageHero({ eyebrow, title, subtitle }: PageHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="text-center mb-12"
    >
      <div
        className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
        style={body}
      >
        {eyebrow}
      </div>
      <h1
        className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.035em] leading-[1.1] mb-4 text-neutral-900"
        style={display}
      >
        {title}
      </h1>
      <p
        className="text-base md:text-lg font-normal text-neutral-500 max-w-[600px] mx-auto"
        style={body}
      >
        {subtitle}
      </p>
    </motion.div>
  );
}
