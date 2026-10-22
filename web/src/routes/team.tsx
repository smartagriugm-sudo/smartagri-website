import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { accent, body, display } from "../lib/fonts";
import { TEAM_CATEGORIES, membersByCategory, type TeamCategory } from "../lib/team";
import { STUDENTS } from "../lib/students";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import { TeamCard } from "../components/TeamCard";
import StudentsTable from "../components/StudentsTable";
import { EASE, MaskLine, META } from "../components/NoteParts";

export const Route = createFileRoute("/team")({
  component: TeamPage,
  head: () => ({
    meta: [
      { title: "Team | smartagri" },
      {
        name: "description",
        content:
          "The lecturers, researchers, and students behind the Smart Agriculture Research Center, Universitas Gadjah Mada.",
      },
    ],
  }),
});

// The team: masthead with counts from the roster, group pills over the member
// cards, the students who have worked with the center (a searchable table),
// and the landing CTA.

const categoryHeadings: Record<TeamCategory, string> = {
  Lecturer: "Lecturers",
  Researcher: "Researchers",
  Student: "Students",
  "Past Member": "Past members",
};

const GROUPS = TEAM_CATEGORIES.map((c) => ({ category: c, members: membersByCategory(c) })).filter(
  (g) => g.members.length > 0,
);
const EASE_FADE = { duration: 0.45, ease: EASE };

const FIGURES = [
  ...GROUPS.map((g) => ({ value: g.members.length, label: categoryHeadings[g.category] })),
  ...(STUDENTS.length ? [{ value: STUDENTS.length, label: "Students so far" }] : []),
];

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / 1300);
          setShown(Math.round(value * (1 - Math.pow(1 - p, 4))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        setShown(0);
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {shown}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}

function Pills<T extends string>({
  items,
  value,
  onChange,
  layoutId,
  label,
}: {
  items: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={label}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={`relative rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-transparent text-white"
                : "border-[#0B6477]/15 bg-white/70 text-neutral-700 hover:border-[#0B6477]/40"
            }`}
            style={body}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-[#08313A]"
                transition={{ duration: 0.45, ease: EASE }}
              />
            )}
            <span className="relative">
              {it.label}
              {it.count !== undefined && (
                <span className={active ? "text-white/60" : "text-neutral-400"}> {it.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TeamPage() {
  const [group, setGroup] = useState<"All" | TeamCategory>("All");
  const shown = group === "All" ? GROUPS : GROUPS.filter((g) => g.category === group);

  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={6} />
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
                  <MaskLine delay={0}>The people growing</MaskLine>
                  <MaskLine delay={0.12}>
                    <span style={accent}>smartagri.</span>
                  </MaskLine>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                  className="max-w-[480px] text-base leading-relaxed text-neutral-600 md:text-lg"
                  style={body}
                >
                  Lecturers, researchers, and students of the Smart Agriculture Research Center,
                  Department of Agricultural and Biosystems Engineering, Universitas Gadjah Mada.
                </motion.p>
              </div>

              <div className="mt-12 flex flex-wrap gap-px overflow-clip rounded-[24px] border border-[#0B6477]/12 bg-[#0B6477]/12">
                {FIGURES.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: EASE }}
                    className="min-w-[160px] flex-1 bg-white/90 p-6"
                  >
                    <span className="block text-4xl font-semibold leading-none tracking-[-0.035em] text-neutral-900 md:text-5xl" style={display}>
                      <CountUp value={f.value} />
                    </span>
                    <span className="mt-3 block text-[13px] text-neutral-500" style={body}>
                      {f.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Members */}
            <section className="mx-auto max-w-[1360px] px-6 pb-20 pt-14 md:px-12 md:pb-28">
              <Pills
                label="Filter members by group"
                layoutId="team-group-pill"
                value={group}
                onChange={setGroup}
                items={[
                  { key: "All", label: "All" },
                  ...GROUPS.map((g) => ({
                    key: g.category,
                    label: categoryHeadings[g.category],
                    count: g.members.length,
                  })),
                ]}
              />
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={group}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={EASE_FADE}
                  className="mt-10 flex flex-col gap-14"
                >
                  {shown.map(({ category, members }) => (
                    <div key={category}>
                      <h2
                        className="mb-6 flex items-baseline gap-3 text-3xl font-semibold tracking-[-0.03em] text-neutral-900 md:text-4xl"
                        style={display}
                      >
                        {categoryHeadings[category]}
                        <span className={`text-neutral-400 ${META}`} style={body}>
                          {members.length} {members.length === 1 ? "person" : "people"}
                        </span>
                      </h2>
                      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                        {members.map((member, i) => (
                          <TeamCard key={member.slug} member={member} index={i} />
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </section>

            {/* Students: searchable, sortable table */}
            {STUDENTS.length > 0 && (
              <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
                <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className={`flex items-center gap-2 text-[#14919B] ${META}`} style={body}>
                        <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
                        Students
                      </p>
                      <motion.h2
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.6 }}
                        className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                        style={display}
                      >
                        <MaskLine delay={0}>Students who</MaskLine>
                        <MaskLine delay={0.1}>
                          <span style={accent}>worked with us.</span>
                        </MaskLine>
                      </motion.h2>
                    </div>
                    <p className="max-w-[440px] text-base leading-relaxed text-neutral-500 md:text-lg" style={body}>
                      Doctoral, postgraduate and undergraduate students who carried out their
                      research with the center. Search by name, filter, or sort any column.
                    </p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="mt-10"
                  >
                    <StudentsTable />
                  </motion.div>
                </div>
              </section>
            )}

            <CallToAction />
          </div>
        </div>
        <Footer />
      </main>
    </MotionConfig>
  );
}
