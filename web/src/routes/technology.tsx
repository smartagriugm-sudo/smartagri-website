import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, BookOpen, CheckCircle2 } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { TECHNOLOGIES, type Technology } from "../lib/technology";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

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

// Node positions on two concentric rings, in percent of the map container.
// Ring 1 (inner) = data & intelligence; ring 2 (outer) = sensing & actuation.
const RING_RADIUS: Record<1 | 2, number> = { 1: 25, 2: 42 };

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
      {/* dashed orbit guides for both rings */}
      <div className="absolute inset-[8%] rounded-full border border-dashed border-[#0B6477]/15" />
      <div className="absolute inset-[25%] rounded-full border border-dashed border-[#0B6477]/15" />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-sm sm:text-lg font-semibold text-neutral-900 tracking-[-0.02em]"
        style={display}
      >
        Core
        <br />
        Technology
      </div>

      {/* animated interconnection lines from the active node */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <AnimatePresence mode="popLayout">
          {active.related.map((relatedId, i) => {
            const to = POSITIONS[relatedId];
            if (!to) return null;
            return (
              <motion.path
                key={`${active.id}-${relatedId}`}
                d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                stroke="#14919B"
                strokeWidth={0.35}
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.55 }}
                exit={{ opacity: 0 }}
                transition={{
                  pathLength: { delay: i * 0.05, duration: 0.35, ease: "easeOut" },
                  opacity: { duration: 0.2 },
                }}
              />
            );
          })}
        </AnimatePresence>
      </svg>

      {/* technology nodes */}
      {TECHNOLOGIES.map((tech) => {
        const { x, y } = POSITIONS[tech.id];
        const isActive = tech.id === active.id;
        const isRelated = active.related.includes(tech.id);
        return (
          <button
            key={tech.id}
            onMouseEnter={() => onSelect(tech)}
            onFocus={() => onSelect(tech)}
            onClick={() => onSelect(tech)}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={tech.label}
            aria-pressed={isActive}
          >
            <span
              className={
                isActive
                  ? "w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#0B6477] text-white shadow-lg shadow-[#0B6477]/30 scale-110 flex items-center justify-center transition-all duration-300"
                  : isRelated
                    ? "w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-[#14919B] text-[#14919B] flex items-center justify-center transition-all duration-300"
                    : "w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-neutral-200 text-neutral-300 opacity-50 flex items-center justify-center transition-all duration-300"
              }
            >
              <tech.icon className="w-4 h-4 sm:w-6 sm:h-6" />
            </span>
            <span
              className={`absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-24 sm:w-28 text-center text-[9px] sm:text-[11px] font-medium leading-tight uppercase tracking-[0.04em] transition-colors duration-300 ${
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
          </button>
        );
      })}
    </div>
  );
}

function TechDetail({ tech }: { tech: Technology }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tech.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col gap-5"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0B6477] flex items-center justify-center shrink-0">
            <tech.icon className="w-6 h-6 text-[#45DFB1]" />
          </div>
          <div>
            <h2
              className="text-xl sm:text-2xl font-semibold text-neutral-900 leading-tight"
              style={display}
            >
              {tech.label}
            </h2>
            <div
              className="text-[11px] font-semibold tracking-[0.12em] text-[#14919B] uppercase mt-1"
              style={body}
            >
              Core Technology
            </div>
          </div>
        </div>

        <p
          className="text-lg sm:text-xl font-medium text-neutral-900 leading-snug"
          style={display}
        >
          {tech.tagline}
        </p>

        <p
          className="text-sm sm:text-base font-normal text-neutral-500 leading-relaxed"
          style={body}
        >
          {tech.description}
        </p>

        <div>
          <div
            className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-neutral-900 uppercase mb-3"
            style={body}
          >
            <CheckCircle2 className="w-4 h-4 text-[#14919B]" />
            Key benefits
          </div>
          <ul className="flex flex-col gap-1.5">
            {tech.benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2 text-sm sm:text-base font-normal text-neutral-600"
                style={body}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#45DFB1] mt-2 shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div
            className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-neutral-900 uppercase mb-3"
            style={body}
          >
            <BookOpen className="w-4 h-4 text-[#14919B]" />
            Common applications
          </div>
          <div className="flex flex-wrap gap-2">
            {tech.applications.map((app) => (
              <span
                key={app}
                className="rounded-full border border-[#0B6477]/25 px-3 py-1 text-sm font-normal text-[#0B6477]"
                style={body}
              >
                {app}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-5">
          <div
            className="text-xs font-semibold tracking-[0.1em] text-neutral-900 uppercase mb-3"
            style={body}
          >
            Related research areas ({tech.areas.length})
          </div>
          <div className="flex flex-col gap-2">
            {tech.areas.map((area) => (
              <Link
                key={area}
                to="/research"
                className="group flex items-center justify-between rounded-xl bg-[#F3F7F6] px-4 py-3 text-sm sm:text-base font-medium text-neutral-800 hover:bg-[#0B6477]/10 transition-colors"
                style={body}
              >
                {area}
                <ArrowUpRight className="w-4 h-4 text-[#0B6477] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function TechnologyPage() {
  const [active, setActive] = useState<Technology>(TECHNOLOGIES[0]);

  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="Technology"
            title={
              <>
                Explore our <span style={accent}>core technologies</span>
              </>
            }
            subtitle="Hover or tap a technology to see what it does, where it's applied, and how it interconnects with the rest of the smartagri stack."
          />
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="rounded-3xl bg-white border border-[#0B6477]/10 p-6 sm:p-10"
            >
              <TechMap active={active} onSelect={setActive} />
              <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
                <div
                  className="flex items-center gap-2 text-xs sm:text-sm font-normal text-neutral-500"
                  style={body}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B6477]" />
                  Inner ring: data &amp; intelligence
                </div>
                <div
                  className="flex items-center gap-2 text-xs sm:text-sm font-normal text-neutral-500"
                  style={body}
                >
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-[#14919B] bg-white" />
                  Outer ring: field sensing &amp; actuation
                </div>
              </div>
            </motion.div>
            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: 0.12, duration: 0.55, ease: "easeOut" }}
              className="rounded-3xl bg-white border border-[#0B6477]/10 p-6 sm:p-8 lg:sticky lg:top-[92px]"
            >
              <TechDetail tech={active} />
            </motion.aside>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
