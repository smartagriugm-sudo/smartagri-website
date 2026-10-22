import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useScroll, useSpring, type Variants } from "framer-motion";
import { ArrowLeft, ArrowUpRight, type LucideIcon } from "lucide-react";
import { indoorFarmingPhoto } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import { IF_SECTIONS, type IFGroup } from "../lib/indoor-farming";
import { EASE, META } from "./NoteParts";
import SiteHeader from "./SiteHeader";
import Footer from "./Footer";
import { ping } from "./ResearchAreas";

// Pieces shared by the Indoor Farming pages: the eyebrow, icon tiles that act
// out their subject on hover, the dark-on-hover section card and the process
// steps with a connector drawn as the section scrolls by.

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p
      className={`flex items-center gap-2 ${dark ? "text-[#45DFB1]" : "text-[#14919B]"} ${META}`}
      style={body}
    >
      <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
      {children}
    </p>
  );
}

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { delay, duration: 0.7, ease: EASE },
});

const loop = (duration: number, repeatDelay = 0) => ({
  duration,
  repeat: Infinity,
  repeatDelay,
  ease: "easeInOut" as const,
});
const rest = { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 };

// One motion per subject. Keys are section slugs, tropical conditions and the
// generic fallbacks used by the instrumentation cards.
export const IF_ICON_MOTION: Record<string, Variants> = {
  // Approach: a target being sighted, then locking on.
  approach: {
    show: rest,
    hover: { scale: [1, 0.8, 1.15, 1], rotate: [0, -20, 0], transition: loop(1.3, 0.3) },
  },
  // Cultivation: a leaf swaying from its stem.
  cultivation: {
    show: rest,
    hover: { rotate: [0, -12, 9, -5, 0], transition: loop(1.5) },
  },
  // Technology: a controller ticking through steps.
  technology: {
    show: rest,
    hover: {
      rotate: [0, 90, 90, 180, 180],
      scale: [1, 0.9, 1, 0.9, 1],
      transition: { duration: 1.6, times: [0, 0.2, 0.5, 0.7, 1], repeat: Infinity, ease: "easeInOut" },
    },
  },
  // Greenhouses: the structure going up.
  greenhouses: {
    show: { ...rest, scaleY: 1 },
    hover: { scaleY: [1, 0.6, 1.12, 1], transition: loop(1.2, 0.3) },
  },
  // Humidity: air blowing through.
  wind: {
    show: rest,
    hover: { x: [0, 6, -6, 0], opacity: [1, 0.4, 0.4, 1], transition: loop(1.2) },
  },
  // Light and heat: the sun turning.
  sun: {
    show: rest,
    hover: { rotate: [0, 180], scale: [1, 1.12, 1], transition: { duration: 2.4, repeat: Infinity, ease: "linear" } },
  },
  // Pests: a bug scuttling.
  bug: {
    show: rest,
    hover: { x: [0, -3, 3, -2, 0], rotate: [0, -10, 10, -6, 0], transition: loop(0.8, 0.3) },
  },
  // Rain: a cloud dropping its load.
  rain: {
    show: rest,
    hover: { y: [0, -3, 3, 0], transition: loop(0.9, 0.2) },
  },
  // Fallbacks: a sensor pulsing and a gentle float.
  pulse: {
    show: rest,
    hover: { scale: [1, 1.15, 1], transition: loop(1, 0.2) },
  },
  float: {
    show: rest,
    hover: { y: [0, -4, 0], transition: loop(1.1) },
  },
};

// Pivot at the base for things that grow or stand up.
const GROUNDED = new Set(["cultivation", "greenhouses"]);

// Icon tile with the sensor ping. `state` comes from the card's hover.
export function IconTile({
  icon: Icon,
  motionKey,
  state,
  size = "md",
}: {
  icon: LucideIcon;
  motionKey: string;
  state: "show" | "hover";
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "h-12 w-12" : "h-11 w-11";
  return (
    <span className={`relative block shrink-0 ${box}`}>
      <motion.span
        variants={ping}
        initial="show"
        animate={state}
        aria-hidden="true"
        className="absolute inset-0 rounded-xl border-2 border-[#45DFB1]"
      />
      <span
        className={`relative grid ${box} place-items-center overflow-hidden rounded-xl bg-[#0B6477] text-[#45DFB1] transition-colors duration-300 group-hover:bg-[#45DFB1] group-hover:text-[#08313A]`}
      >
        <motion.span
          variants={IF_ICON_MOTION[motionKey] ?? IF_ICON_MOTION.pulse}
          initial="show"
          animate={state}
          className="inline-flex"
          style={{ originY: GROUNDED.has(motionKey) ? 1 : 0.5 }}
        >
          <Icon className="h-5 w-5" />
        </motion.span>
      </span>
    </span>
  );
}

export function useHover() {
  const [hover, setHover] = useState(false);
  return {
    state: (hover ? "hover" : "show") as "show" | "hover",
    bind: { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) },
  };
}

// Photo for a section: its first group's photo.
export function sectionPhoto(slug: string) {
  const section = IF_SECTIONS.find((s) => s.slug === slug);
  return section ? indoorFarmingPhoto(`${section.slug}-${section.groups[0]!.slug}.webp`) : undefined;
}

// Card for one of the four sections; turns dark on hover like the research cards.
export function SectionCard({
  slug,
  label,
  blurb,
  icon,
}: {
  slug: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
}) {
  const { state, bind } = useHover();
  const section = IF_SECTIONS.find((s) => s.slug === slug);
  const photo = sectionPhoto(slug);
  const groups = section?.groups.length ?? 0;
  return (
    <Link
      to="/indoor-farming/$section"
      params={{ section: slug }}
      {...bind}
      className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#0B6477]/10 bg-white/90 transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#08313A] hover:bg-[#08313A] hover:shadow-xl"
    >
      <span className="relative block h-[180px] overflow-hidden bg-[#DCEFEA]">
        {photo && (
          <img
            src={photo}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover grayscale-[30%] transition-[transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:grayscale-0"
          />
        )}
        <span className="absolute left-4 top-4">
          <IconTile icon={icon} motionKey={slug} state={state} />
        </span>
        {groups > 0 && (
          <span
            className={`absolute bottom-4 right-4 rounded-full bg-white/90 px-2.5 py-1 text-[#0B6477] backdrop-blur ${META}`}
            style={body}
          >
            {groups} topics
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-3 p-6">
        <span className="flex items-start justify-between gap-3">
          <span
            className="text-xl font-medium leading-snug tracking-[-0.02em] text-neutral-900 transition-colors duration-300 group-hover:text-white"
            style={display}
          >
            {label}
          </span>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#0B6477] transition-[rotate,color] duration-300 group-hover:rotate-45 group-hover:text-[#45DFB1]" />
        </span>
        <span
          className="text-[15px] leading-relaxed text-neutral-500 transition-colors duration-300 group-hover:text-white/70"
          style={body}
        >
          {blurb}
        </span>
      </span>
    </Link>
  );
}

// Card for one group (topic page) inside a section, same treatment.
export function GroupCard({ section, group }: { section: string; group: IFGroup }) {
  const { state, bind } = useHover();
  return (
    <Link
      to="/indoor-farming/$section/$group"
      params={{ section, group: group.slug }}
      {...bind}
      className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#0B6477]/10 bg-white/90 transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#08313A] hover:bg-[#08313A] hover:shadow-xl"
    >
      <span className="relative block h-[180px] overflow-hidden bg-[#DCEFEA]">
        <img
          src={indoorFarmingPhoto(`${section}-${group.slug}.webp`)}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover grayscale-[30%] transition-[transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:grayscale-0"
        />
        <span className="absolute left-4 top-4">
          <IconTile icon={group.icon} motionKey="pulse" state={state} />
        </span>
        <span
          className={`absolute bottom-4 right-4 rounded-full bg-white/90 px-2.5 py-1 text-[#0B6477] backdrop-blur ${META}`}
          style={body}
        >
          {group.topics.length} topics
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-3 p-6">
        <span className="flex items-start justify-between gap-3">
          <span
            className="text-xl font-medium leading-snug tracking-[-0.02em] text-neutral-900 transition-colors duration-300 group-hover:text-white"
            style={display}
          >
            {group.title}
          </span>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#0B6477] transition-[rotate,color] duration-300 group-hover:rotate-45 group-hover:text-[#45DFB1]" />
        </span>
        <span
          className="line-clamp-3 text-[15px] leading-relaxed text-neutral-500 transition-colors duration-300 group-hover:text-white/70"
          style={body}
        >
          {group.intro}
        </span>
      </span>
    </Link>
  );
}

// Light card that goes dark on hover, with an icon that acts out its subject.
export function FeatureCard({
  icon,
  motionKey,
  title,
  children,
  className = "",
}: {
  icon: LucideIcon;
  motionKey: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const { state, bind } = useHover();
  return (
    <div
      {...bind}
      className={`group flex h-full flex-col gap-5 rounded-[24px] border border-[#0B6477]/10 bg-white/85 p-7 backdrop-blur transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#08313A] hover:bg-[#08313A] hover:shadow-xl ${className}`}
    >
      <IconTile icon={icon} motionKey={motionKey} state={state} />
      <div>
        <h3
          className="text-xl font-medium leading-snug tracking-[-0.02em] text-neutral-900 transition-colors duration-300 group-hover:text-white"
          style={display}
        >
          {title}
        </h3>
        <div
          className="mt-3 text-[15px] leading-relaxed text-neutral-500 transition-colors duration-300 group-hover:text-white/70"
          style={body}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// Process steps joined by a line that draws as the row scrolls through the
// viewport. On small screens the line runs down the left edge instead.
export function ProcessSteps({ steps }: { steps: { step: string; title: string; body: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <div ref={ref} className="relative">
      {/* Horizontal connector through the nodes (lg) */}
      <div
        aria-hidden="true"
        className="absolute left-[12.5%] right-[12.5%] top-[7px] hidden h-px bg-[#0B6477]/15 lg:block"
      >
        <motion.div className="h-full origin-left bg-[#14919B]" style={{ scaleX: progress }} />
      </div>
      {/* Vertical connector (below lg) */}
      <div aria-hidden="true" className="absolute bottom-6 left-[7px] top-2 w-px bg-[#0B6477]/15 lg:hidden">
        <motion.div className="h-full w-full origin-top bg-[#14919B]" style={{ scaleY: progress }} />
      </div>

      <div className="grid gap-10 lg:grid-cols-4 lg:gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: i * 0.1, duration: 0.7, ease: EASE }}
            className="relative flex gap-6 lg:flex-col lg:items-center lg:gap-0"
          >
            <span className="relative z-[1] mt-0 grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full border border-[#14919B] bg-white lg:mb-6">
              <span className="h-[7px] w-[7px] rounded-full bg-[#45DFB1]" />
            </span>
            <div className="group flex-1 rounded-[24px] border border-[#0B6477]/10 bg-white/85 p-7 backdrop-blur transition-[background-color,border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-[#08313A] hover:bg-[#08313A] hover:shadow-xl lg:w-full">
              <span className={`text-[#14919B] transition-colors group-hover:text-[#45DFB1] ${META}`} style={body}>
                Step {s.step}
              </span>
              <h3
                className="mt-4 text-xl font-medium leading-snug tracking-[-0.02em] text-neutral-900 transition-colors duration-300 group-hover:text-white"
                style={display}
              >
                {s.title}
              </h3>
              <p
                className="mt-3 text-[15px] leading-relaxed text-neutral-500 transition-colors duration-300 group-hover:text-white/70"
                style={body}
              >
                {s.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Not-found page shared by the section and topic routes.
export function IFNotFound({ message }: { message: string }) {
  return (
    <main>
      <SiteHeader />
      <section className="bg-white">
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-5 px-6 py-28 text-center">
          <Eyebrow>Indoor Farming</Eyebrow>
          <h1
            className="text-4xl font-semibold tracking-[-0.035em] text-neutral-900 md:text-5xl"
            style={display}
          >
            Page <span style={accent}>not found.</span>
          </h1>
          <p className="text-neutral-500" style={body}>
            {message}
          </p>
          <Link
            to="/indoor-farming"
            className="group mt-2 inline-flex h-12 items-center gap-3 rounded-lg bg-[#08313A] px-6 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0B6477]"
            style={body}
          >
            <ArrowLeft className="h-4 w-4 text-[#45DFB1] transition-transform group-hover:-translate-x-1" />
            Back to Indoor Farming
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
