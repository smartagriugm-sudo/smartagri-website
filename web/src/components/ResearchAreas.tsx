import { createLink } from "@tanstack/react-router";
import { MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { RESEARCH_AREAS } from "../lib/research";

// Router-typed Link that also accepts framer-motion animation props.
const MotionLink = createLink(motion.a);

// Card states. Children inherit the labels, so hovering anywhere on a card
// plays its icon animation and "show" brings everything back to rest.
const card: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
  hover: { y: -4, transition: { duration: 0.3, ease: "easeOut" } },
};

const loop = (duration: number, repeatDelay = 0) => ({
  duration,
  repeat: Infinity,
  repeatDelay,
  ease: "easeInOut" as const,
});

const rest = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  opacity: 1,
  transition: { duration: 0.3 },
};

// One motion per research area, each acting out its topic.
export const ICON_MOTION: Record<string, Variants> = {
  // A sprout pushing up out of the soil, then swaying.
  "open-field-technology": {
    show: rest,
    hover: {
      scaleY: [1, 0.7, 1.15, 1],
      rotate: [0, 0, -6, 6, 0],
      transition: loop(1.4, 0.3),
    },
  },
  // Water drops falling and splashing.
  "irrigation-modernization": {
    show: { ...rest, scaleY: 1 },
    hover: {
      y: [0, -4, 4, 0],
      scaleY: [1, 1.08, 0.86, 1],
      transition: loop(0.9, 0.2),
    },
  },
  // Plantation trees bending in the wind.
  "smart-estate-technology": {
    show: rest,
    hover: { rotate: [0, -9, 7, -4, 0], transition: loop(1.6) },
  },
  // A drone flying out to the top right and coming back in from the bottom left.
  "smart-uav-technology": {
    show: rest,
    hover: {
      x: [0, 30, -30, 0],
      y: [0, -30, 30, 0],
      opacity: [1, 0, 0, 1],
      transition: {
        duration: 1.1,
        times: [0, 0.4, 0.41, 1],
        repeat: Infinity,
        repeatDelay: 0.5,
        ease: "easeInOut",
      },
    },
  },
  // Grow lights switching on inside the plant factory.
  "indoor-farming-technology": {
    show: { ...rest, filter: "drop-shadow(0 0 0px rgba(69,223,177,0))" },
    hover: {
      scale: [1, 1.12, 1],
      filter: [
        "drop-shadow(0 0 0px rgba(69,223,177,0))",
        "drop-shadow(0 0 6px rgba(69,223,177,0.9))",
        "drop-shadow(0 0 0px rgba(69,223,177,0))",
      ],
      transition: loop(1.2),
    },
  },
  // A processor ticking through steps.
  "agro-informatics": {
    show: rest,
    hover: {
      rotate: [0, 90, 90, 180, 180],
      scale: [1, 0.9, 1, 0.9, 1],
      transition: {
        duration: 1.6,
        times: [0, 0.2, 0.5, 0.7, 1],
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  },
};

// Icons that grow or sway pivot at their base; the rest turn about their centre.
export const GROUNDED = new Set([
  "open-field-technology",
  "irrigation-modernization",
  "smart-estate-technology",
]);

// Sensor ping around the icon tile, shared by every card.
export const ping: Variants = {
  show: { scale: 1, opacity: 0 },
  hover: {
    scale: [1, 1.45],
    opacity: [0.6, 0],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeOut" },
  },
};

export default function ResearchAreas() {
  return (
    <MotionConfig reducedMotion="user">
      <section id="research" className="relative">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-16 pb-20">
          <h2
            className="text-center text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.1] mb-12 text-neutral-900"
            style={display}
          >
            <span style={accent}>Smart research</span> for the
            <br />
            fields of tomorrow
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {RESEARCH_AREAS.map((area, i) => (
              <MotionLink
                key={area.label}
                to="/research/$slug"
                params={{ slug: area.slug }}
                variants={card}
                initial="hidden"
                whileInView="show"
                whileHover="hover"
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  delay: (i % 3) * 0.1,
                  duration: 0.55,
                  ease: "easeOut",
                }}
                className="group rounded-3xl bg-white border border-[#0B6477]/10 hover:bg-[#08313A] hover:border-[#08313A] p-7 flex flex-col gap-4 hover:shadow-xl transition-[box-shadow,border-color,background-color] duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="relative w-12 h-12">
                    <motion.span
                      variants={ping}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-2xl border-2 border-[#45DFB1]"
                    />
                    <div className="relative w-12 h-12 rounded-2xl bg-[#0B6477] group-hover:bg-[#45DFB1] transition-colors duration-300 flex items-center justify-center overflow-hidden">
                      <motion.span
                        variants={ICON_MOTION[area.slug]}
                        className="inline-flex"
                        style={{ originY: GROUNDED.has(area.slug) ? 1 : 0.5 }}
                      >
                        <area.icon className="w-6 h-6 text-[#45DFB1] group-hover:text-[#08313A] transition-colors duration-300" />
                      </motion.span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-[#0B6477] group-hover:text-[#45DFB1] transition-[rotate,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-45" />
                </div>
                <h3
                  className="text-xl md:text-2xl font-medium text-neutral-900 group-hover:text-white transition-colors duration-300 leading-snug"
                  style={display}
                >
                  {area.label}
                </h3>
                <p
                  className="text-sm md:text-base font-normal text-neutral-500 group-hover:text-white/70 transition-colors duration-300 leading-relaxed"
                  style={body}
                >
                  {area.desc}
                </p>
              </MotionLink>
            ))}
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
