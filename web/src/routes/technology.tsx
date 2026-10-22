import { useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type TargetAndTransition,
} from "framer-motion";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { A, researchPhoto } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import { TECHNOLOGIES, type Technology } from "../lib/technology";
import { RESEARCH_AREAS } from "../lib/research";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import { EASE, MaskLine, META } from "../components/NoteParts";

export const Route = createFileRoute("/technology")({
  component: TechnologyPage,
  head: () => ({
    meta: [
      { title: "Technology | smartagri" },
      {
        name: "description",
        content:
          "Explore the core technologies behind smartagri: from IoT sensor networks and UAV platforms to machine learning and decision support, and how they interconnect.",
      },
    ],
  }),
});

// The technology stack as an interactive map (two rings: data & intelligence
// inside, field sensing & actuation outside) with a detail panel, then every
// technology as a card grouped by ring, then the landing CTA.

const RING_RADIUS: Record<1 | 2, number> = { 1: 25, 2: 42 };
const RING_NAME: Record<1 | 2, string> = {
  1: "Data & intelligence",
  2: "Field sensing & actuation",
};

// Node positions on two concentric rings, in percent of the map container.
const POSITIONS: Record<string, { x: number; y: number }> = (() => {
  const positions: Record<string, { x: number; y: number }> = {};
  ([1, 2] as const).forEach((ring) => {
    const ringTechs = TECHNOLOGIES.filter((tech) => tech.ring === ring);
    const radius = RING_RADIUS[ring];
    ringTechs.forEach((tech, i) => {
      // Offset the inner ring half a step so labels don't stack vertically
      const offset = ring === 1 ? Math.PI / ringTechs.length : 0;
      const angle = (i / ringTechs.length) * Math.PI * 2 - Math.PI / 2 + offset;
      positions[tech.id] = {
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
      };
    });
  });
  return positions;
})();

const areaByLabel = (label: string) =>
  RESEARCH_AREAS.find((a) => a.label === label);
const techById = (id: string) => TECHNOLOGIES.find((t) => t.id === id);

// One small motion per technology, acting out what it does. Played in a loop
// on the active map node and while a card or chip is hovered, and once when
// the detail panel switches to a technology.
type IconMove = {
  keys: TargetAndTransition;
  duration: number;
  originY?: number;
};
const ICON_MOVES: Record<string, IconMove> = {
  // Antenna broadcasting.
  iot: {
    keys: { scale: [1, 1.18, 1, 1.1, 1], opacity: [1, 0.7, 1, 0.8, 1] },
    duration: 1.4,
  },
  // Drone flying a short pass.
  uav: {
    keys: { x: [0, 3, -2, 0], y: [0, -3, 1, 0], rotate: [0, -10, 6, 0] },
    duration: 1.4,
  },
  // Camera taking a shot.
  multispectral: {
    keys: { scale: [1, 0.85, 1.1, 1], rotate: [0, -6, 4, 0] },
    duration: 0.9,
  },
  // Spectrum bands rising.
  hyperspectral: {
    keys: { y: [0, -3, 0], scaleY: [1, 1.15, 1] },
    duration: 1.1,
    originY: 1,
  },
  // Eye blinking.
  vision: { keys: { scaleY: [1, 1, 0.1, 1, 1] }, duration: 1.6 },
  // Brain thinking.
  ml: {
    keys: { rotate: [0, 8, -8, 4, 0], scale: [1, 1.08, 1.08, 1.04, 1] },
    duration: 1.4,
  },
  // Signal pulsing along.
  eis: {
    keys: { x: [0, 2.5, -2.5, 0], scaleX: [1, 1.15, 1.15, 1] },
    duration: 1.1,
  },
  // Temperature rising.
  "climate-control": {
    keys: { y: [0, -3, 0, -1.5, 0] },
    duration: 1.2,
    originY: 1,
  },
  // Droplets dripping.
  irrigation: {
    keys: { y: [0, -2, 3, 0], scaleY: [1, 1.08, 0.88, 1] },
    duration: 1,
    originY: 1,
  },
  // Map unfolding.
  geospatial: { keys: { scaleX: [1, 0.7, 1.08, 1] }, duration: 1.1 },
  // Cloud drifting past the sun.
  weather: {
    keys: { x: [0, 2.5, -2, 0], rotate: [0, 6, -4, 0] },
    duration: 1.6,
  },
  // Dashboard tiles rearranging.
  dss: {
    keys: { rotate: [0, 90, 90, 0], scale: [1, 0.85, 0.85, 1] },
    duration: 1.4,
  },
};

function TechIcon({
  tech,
  play,
  className,
}: {
  tech: Technology;
  /** "loop" keeps moving, "once" plays a single pass, false rests */
  play: "loop" | "once" | false;
  className: string;
}) {
  const move = ICON_MOVES[tech.id];
  const rest = {
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
  };
  return (
    <motion.span
      className="inline-flex"
      style={{ originY: move?.originY ?? 0.5 }}
      animate={play && move ? move.keys : rest}
      transition={
        play && move
          ? {
              duration: move.duration,
              ease: "easeInOut",
              repeat: play === "loop" ? Infinity : 0,
              repeatDelay: 0.5,
            }
          : { duration: 0.3 }
      }
    >
      <tech.icon className={className} />
    </motion.span>
  );
}

function TechMap({
  active,
  onSelect,
}: {
  active: Technology;
  onSelect: (tech: Technology) => void;
}) {
  const from = POSITIONS[active.id];

  return (
    <div className="relative aspect-square w-full select-none">
      {/* Orbit guides, turning very slowly. */}
      <div className="absolute inset-[8%] animate-[spin_120s_linear_infinite] rounded-full border border-dashed border-[#0B6477]/20 motion-reduce:animate-none" />
      <div className="absolute inset-[25%] animate-[spin_90s_linear_infinite_reverse] rounded-full border border-dashed border-[#0B6477]/20 motion-reduce:animate-none" />

      {/* Centre: the smartagri mark. */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center">
        <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-[#08313A] shadow-lg sm:h-16 sm:w-16 sm:rounded-2xl">
          <span className="absolute inset-0 rounded-xl bg-[#45DFB1]/30 animate-pulse-ring sm:rounded-2xl" />
          <img
            src={A.iconWhite}
            alt=""
            className="relative h-5 w-auto sm:h-8"
          />
        </span>
        <span
          className={`hidden text-neutral-500 sm:block ${META}`}
          style={body}
        >
          Core technology
        </span>
      </div>

      {/* Links from the active node, with readings flowing along them. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <AnimatePresence mode="popLayout">
          {active.related.map((relatedId, i) => {
            const to = POSITIONS[relatedId];
            if (!to) return null;
            return (
              <motion.g key={`${active.id}-${relatedId}`} exit={{ opacity: 0 }}>
                <motion.path
                  d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                  stroke="#14919B"
                  strokeWidth={0.35}
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.55 }}
                  transition={{
                    pathLength: {
                      delay: i * 0.05,
                      duration: 0.4,
                      ease: "easeOut",
                    },
                    opacity: { duration: 0.2 },
                  }}
                />
                <motion.circle
                  r={0.9}
                  fill="#45DFB1"
                  initial={{ cx: from.x, cy: from.y, opacity: 0 }}
                  animate={{
                    cx: [from.x, to.x],
                    cy: [from.y, to.y],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 1.6,
                    delay: 0.4 + i * 0.15,
                    repeat: Infinity,
                    repeatDelay: 0.4,
                    ease: "easeInOut",
                  }}
                />
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Technology nodes */}
      {TECHNOLOGIES.map((tech, i) => {
        const { x, y } = POSITIONS[tech.id];
        const isActive = tech.id === active.id;
        const isRelated = active.related.includes(tech.id);
        return (
          <motion.button
            key={tech.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.04, duration: 0.5, ease: EASE }}
            onMouseEnter={() => onSelect(tech)}
            onFocus={() => onSelect(tech)}
            onClick={() => onSelect(tech)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={tech.label}
            aria-pressed={isActive}
          >
            {isActive && (
              <span
                className="absolute inset-0 rounded-full bg-[#45DFB1]/40 animate-pulse-ring"
                aria-hidden="true"
              />
            )}
            <span
              className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                isActive
                  ? "h-12 w-12 scale-110 bg-[#08313A] text-[#45DFB1] shadow-lg shadow-[#08313A]/30 sm:h-16 sm:w-16"
                  : isRelated
                    ? "h-10 w-10 border-2 border-[#14919B] bg-white text-[#14919B] sm:h-14 sm:w-14"
                    : "h-10 w-10 border-2 border-neutral-200 bg-white text-neutral-300 opacity-60 sm:h-14 sm:w-14"
              }`}
            >
              <TechIcon
                tech={tech}
                play={isActive ? "loop" : false}
                className="h-4 w-4 sm:h-6 sm:w-6"
              />
            </span>
            <span
              className={`absolute left-1/2 top-full mt-1.5 w-24 -translate-x-1/2 text-center text-[9px] font-medium uppercase leading-tight tracking-[0.04em] transition-colors duration-300 sm:w-28 sm:text-[11px] ${
                isActive
                  ? "text-[#0B6477]"
                  : isRelated
                    ? "text-neutral-600"
                    : "text-neutral-300"
              }`}
              style={body}
            >
              {tech.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function DetailContent({
  tech,
  onSelect,
  live,
}: {
  tech: Technology;
  onSelect: (t: Technology) => void;
  /** false for the invisible sizers that only hold the panel height */
  live: boolean;
}) {
  return (
    <>
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#08313A] text-[#45DFB1]">
          <TechIcon
            tech={tech}
            play={live ? "once" : false}
            className="h-6 w-6"
          />
        </span>
        <div>
          <p className={`text-[#14919B] ${META}`} style={body}>
            {RING_NAME[tech.ring]}
          </p>
          <h2
            className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.025em] text-neutral-900 md:text-[28px]"
            style={display}
          >
            {tech.label}
          </h2>
        </div>
      </div>

      <p
        className="text-lg font-medium leading-snug tracking-[-0.01em] text-neutral-900 md:text-xl"
        style={display}
      >
        {tech.tagline}
      </p>
      <p className="text-[15px] leading-relaxed text-neutral-600" style={body}>
        {tech.description}
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className={`mb-3 text-neutral-400 ${META}`} style={body}>
            Key benefits
          </p>
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{
              show: {
                transition: { staggerChildren: 0.06, delayChildren: 0.1 },
              },
            }}
            className="flex flex-col gap-2"
            style={body}
          >
            {tech.benefits.map((b) => (
              <motion.li
                key={b}
                variants={{
                  hidden: { opacity: 0, x: -8 },
                  show: { opacity: 1, x: 0 },
                }}
                className="flex gap-2 text-[14px] leading-snug text-neutral-800"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#14919B]" />
                {b}
              </motion.li>
            ))}
          </motion.ul>
        </div>
        <div>
          <p className={`mb-3 text-neutral-400 ${META}`} style={body}>
            Common applications
          </p>
          <div className="flex flex-wrap gap-2">
            {tech.applications.map((app) => (
              <span
                key={app}
                className="rounded-full border border-[#0B6477]/15 bg-[#F3F7F6] px-3 py-1 text-[13px] text-[#0B6477]"
                style={body}
              >
                {app}
              </span>
            ))}
          </div>
        </div>
      </div>

      {tech.related.length > 0 && (
        <div>
          <p className={`mb-3 text-neutral-400 ${META}`} style={body}>
            Connected technologies
          </p>
          <div className="flex flex-wrap gap-2">
            {tech.related.map((id) => {
              const t = techById(id);
              if (!t) return null;
              return (
                <ChipButton key={id} tech={t} onClick={() => onSelect(t)} />
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-[#0B6477]/10 pt-5">
        <p className={`mb-3 text-neutral-400 ${META}`} style={body}>
          Powers these research areas
        </p>
        <div className="flex flex-col gap-2">
          {tech.areas.map((label) => {
            const area = areaByLabel(label);
            if (!area) return null;
            return (
              <Link
                key={label}
                to="/research/$slug"
                params={{ slug: area.slug }}
                className="group flex items-center gap-3 rounded-xl border border-[#0B6477]/10 bg-[#F3F7F6]/70 p-2 pr-4 transition-colors hover:border-[#0B6477]/30 hover:bg-white"
                style={body}
              >
                <span className="h-10 w-14 shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={researchPhoto[area.slug]}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </span>
                <span className="flex-1 text-[14px] font-medium text-neutral-800">
                  {label}
                </span>
                <ArrowUpRight className="h-4 w-4 text-[#0B6477] transition-[rotate] duration-300 group-hover:rotate-45" />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Detail panel. Every technology's content is also laid out invisibly in the
// same grid cell, so the panel always takes the height of the longest one and
// the page doesn't jump as the visitor moves between technologies.
function TechDetail({
  tech,
  onSelect,
}: {
  tech: Technology;
  onSelect: (t: Technology) => void;
}) {
  return (
    <div className="grid">
      {TECHNOLOGIES.map((t) => (
        <div
          key={t.id}
          aria-hidden="true"
          className="invisible flex flex-col gap-6 [grid-area:1/1]"
        >
          <DetailContent tech={t} onSelect={onSelect} live={false} />
        </div>
      ))}
      <AnimatePresence mode="wait">
        <motion.div
          key={tech.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="flex flex-col gap-6 [grid-area:1/1]"
        >
          <DetailContent tech={tech} onSelect={onSelect} live />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// "Connected technologies" chip whose icon moves while hovered.
function ChipButton({
  tech,
  onClick,
}: {
  tech: Technology;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#0B6477]/20 bg-white px-3 py-1 text-[13px] text-neutral-700 transition-colors hover:border-[#08313A] hover:bg-[#08313A] hover:text-white"
      style={body}
    >
      <TechIcon
        tech={tech}
        play={hover ? "loop" : false}
        className="h-3.5 w-3.5"
      />
      {tech.label}
    </button>
  );
}

function StackCard({
  tech,
  onPick,
}: {
  tech: Technology;
  onPick: (t: Technology) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <motion.button
      type="button"
      onClick={() => onPick(tech)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="group flex h-full flex-col gap-4 rounded-[24px] border border-[#0B6477]/10 bg-white/90 p-6 text-left transition-[background-color,border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-[#08313A] hover:bg-[#08313A] hover:shadow-xl"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B6477] text-[#45DFB1] transition-colors duration-300 group-hover:bg-[#45DFB1] group-hover:text-[#08313A]">
          <TechIcon
            tech={tech}
            play={hover ? "loop" : false}
            className="h-5 w-5"
          />
        </span>
        <span className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] transition-colors duration-300 ${
              tech.ring === 1
                ? "bg-[#08313A] text-[#45DFB1] group-hover:bg-[#45DFB1] group-hover:text-[#08313A]"
                : "border border-[#14919B]/40 text-[#14919B] group-hover:border-white/30 group-hover:text-white/80"
            }`}
            style={body}
          >
            {tech.ring === 1 ? "Data" : "Field"}
          </span>
          <ArrowUpRight className="h-4 w-4 text-[#0B6477] transition-[rotate,color] duration-300 group-hover:rotate-45 group-hover:text-[#45DFB1]" />
        </span>
      </span>
      <span
        className="text-lg font-medium leading-snug tracking-[-0.02em] text-neutral-900 transition-colors duration-300 group-hover:text-white"
        style={display}
      >
        {tech.label}
      </span>
      <span
        className="text-[14px] leading-relaxed text-neutral-500 transition-colors duration-300 group-hover:text-white/70"
        style={body}
      >
        {tech.tagline}
      </span>
      <span className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {tech.applications.slice(0, 3).map((app) => (
          <span
            key={app}
            className="rounded-full bg-[#F3F7F6] px-2.5 py-0.5 text-[12px] text-[#0B6477] transition-colors duration-300 group-hover:bg-white/10 group-hover:text-[#80ED99]"
            style={body}
          >
            {app}
          </span>
        ))}
      </span>
    </motion.button>
  );
}

function TechnologyPage() {
  const [active, setActive] = useState<Technology>(TECHNOLOGIES[0]);
  const explorer = useRef<HTMLDivElement>(null);

  const pick = (t: Technology) => {
    setActive(t);
    const el = explorer.current;
    if (el)
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 100,
        behavior: "smooth",
      });
  };

  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={5} />
          <div className="relative">
            {/* Masthead */}
            <section className="mx-auto max-w-[1360px] px-6 pt-12 md:px-12 md:pt-20">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <motion.h1
                  initial="hidden"
                  animate="show"
                  className="text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[80px]"
                  style={display}
                >
                  <MaskLine delay={0}>Explore our</MaskLine>
                  <MaskLine delay={0.12}>
                    <span style={accent}>core technologies.</span>
                  </MaskLine>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                  className="max-w-[460px] text-base leading-relaxed text-neutral-600 md:text-lg"
                  style={body}
                >
                  {TECHNOLOGIES.length} technologies in two rings: field sensing
                  and actuation on the outside, data and intelligence at the
                  core. Hover or tap one to see what it does and what it
                  connects to.
                </motion.p>
              </div>
            </section>

            {/* Explorer: map + detail */}
            <section
              ref={explorer}
              className="mx-auto max-w-[1360px] px-6 pb-20 pt-12 md:px-12 md:pb-28 md:pt-14"
            >
              <div className="grid items-stretch gap-6 lg:grid-cols-[1.15fr_1fr]">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.7, ease: EASE }}
                  className="flex h-full flex-col justify-center rounded-[28px] border border-[#0B6477]/10 bg-white/85 p-6 shadow-[0_30px_80px_-50px_rgba(8,49,58,0.45)] backdrop-blur sm:p-10"
                >
                  <TechMap active={active} onSelect={setActive} />
                  <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
                    <span
                      className="flex items-center gap-2 text-[13px] text-neutral-500"
                      style={body}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-[#08313A]" />
                      Inner ring: {RING_NAME[1].toLowerCase()}
                    </span>
                    <span
                      className="flex items-center gap-2 text-[13px] text-neutral-500"
                      style={body}
                    >
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-[#14919B] bg-white" />
                      Outer ring: {RING_NAME[2].toLowerCase()}
                    </span>
                  </div>
                </motion.div>
                <motion.aside
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
                  className="h-full rounded-[28px] border border-[#0B6477]/10 bg-white/90 p-6 shadow-[0_30px_80px_-50px_rgba(8,49,58,0.45)] backdrop-blur sm:p-8"
                >
                  <TechDetail tech={active} onSelect={setActive} />
                </motion.aside>
              </div>
            </section>

            {/* The whole stack, ring by ring. */}
            <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
              <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <motion.h2
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.6 }}
                    className="text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                    style={display}
                  >
                    <MaskLine delay={0}>The full</MaskLine>
                    <MaskLine delay={0.1}>
                      <span style={accent}>stack.</span>
                    </MaskLine>
                  </motion.h2>
                  <p
                    className="max-w-[440px] text-base leading-relaxed text-neutral-500 md:text-lg"
                    style={body}
                  >
                    Every technology we build with: field sensing and actuation,
                    then the data and intelligence that turn readings into
                    decisions. Pick one to open it on the map.
                  </p>
                </div>

                <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...TECHNOLOGIES]
                    .sort((a, b) => b.ring - a.ring)
                    .map((t) => (
                      <StackCard key={t.id} tech={t} onPick={pick} />
                    ))}
                </div>

                <div className="mt-12">
                  <Link
                    to="/research"
                    className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                    style={body}
                  >
                    See where they are used
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </section>

            <CallToAction />
          </div>
        </div>
        <Footer />
      </main>
    </MotionConfig>
  );
}
