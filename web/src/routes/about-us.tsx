import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { MotionConfig, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Users } from "lucide-react";
import { A, researchPhoto } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import { RESEARCH_AREAS } from "../lib/research";
import { TECHNOLOGIES } from "../lib/technology";
import { PUBLICATIONS } from "../lib/publications";
import { ACTIVE_PARTNERS } from "../lib/partners";
import { notes } from "../lib/notes";
import { TEAM, coreMembers } from "../lib/team";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import PartnerGrid from "../components/PartnerGrid";
import { TeamCard } from "../components/TeamCard";
import { EASE, MaskLine, META } from "../components/NoteParts";
import { GROUNDED, ICON_MOTION, ping } from "../components/ResearchAreas";
import type { ResearchArea } from "../lib/research";

export const Route = createFileRoute("/about-us")({
  component: AboutUsPage,
  head: () => ({
    meta: [
      {
        title: "About Us | smartagri",
      },
      {
        name: "description",
        content:
          "Who we are: the mission, expertise, and people behind the Smart Agriculture Research Center.",
      },
    ],
  }),
});

// About the center: masthead with the team photo, figures counted from the
// site's own data, mission and home, what we're good at (the research areas),
// who we work with (partners), the team, and the landing CTA.

const team = coreMembers();

// Every figure is derived from the content on this site.
const FIGURES = [
  { value: RESEARCH_AREAS.length, label: "Research areas", to: "/research" as const },
  { value: TECHNOLOGIES.length, label: "Core technologies", to: "/technology" as const },
  { value: PUBLICATIONS.length, label: "Publications", to: "/publications" as const },
  { value: ACTIVE_PARTNERS.length, label: "Partners", to: undefined },
  { value: TEAM.filter((m) => m.category !== "Past Member").length, label: "People on the team", to: "/team" as const },
  { value: notes.length, label: "Field notes", to: "/field-notes" as const },
];

// Counts up to the value the first time it scrolls into view.
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
          const p = Math.min(1, (now - start) / 1400);
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
        {shown.toLocaleString("en-US")}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { delay, duration: 0.6, ease: EASE },
});

function SectionLabel({ children, tone = "light" }: { children: string; tone?: "light" | "dark" }) {
  return (
    <p
      className={`flex items-center gap-2 ${META} ${tone === "dark" ? "text-[#45DFB1]" : "text-[#14919B]"}`}
      style={body}
    >
      <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
      {children}
    </p>
  );
}

function SectionHeading({ first, second }: { first: string; second: string }) {
  return (
    <motion.h2
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
      className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
      style={display}
    >
      <MaskLine delay={0}>{first}</MaskLine>
      <MaskLine delay={0.1}>
        <span style={accent}>{second}</span>
      </MaskLine>
    </motion.h2>
  );
}

// Research area card: photo, icon tile with the area's own motion and a mint
// ping while hovered (same motions as the landing Research cards).
function AreaCard({ area }: { area: ResearchArea }) {
  const [hover, setHover] = useState(false);
  const state = hover ? "hover" : "show";
  return (
    <Link
      to="/research/$slug"
      params={{ slug: area.slug }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#0B6477]/10 bg-white transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#08313A] hover:bg-[#08313A] hover:shadow-xl"
    >
      <span className="relative block h-[180px] overflow-hidden">
        <img
          src={researchPhoto[area.slug]}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover grayscale-[30%] transition-[transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:grayscale-0"
        />
        <span className="absolute left-4 top-4 h-11 w-11">
          <motion.span
            variants={ping}
            initial="show"
            animate={state}
            aria-hidden="true"
            className="absolute inset-0 rounded-xl border-2 border-[#45DFB1]"
          />
          <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-[#0B6477] text-[#45DFB1] transition-colors duration-300 group-hover:bg-[#45DFB1] group-hover:text-[#08313A]">
            <motion.span
              variants={ICON_MOTION[area.slug]}
              initial="show"
              animate={state}
              className="inline-flex"
              style={{ originY: GROUNDED.has(area.slug) ? 1 : 0.5 }}
            >
              <area.icon className="h-5 w-5" />
            </motion.span>
          </span>
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-3 p-6">
        <span className="flex items-start justify-between gap-3">
          <span className="text-xl font-medium leading-snug tracking-[-0.02em] text-neutral-900 transition-colors duration-300 group-hover:text-white" style={display}>
            {area.label}
          </span>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#0B6477] transition-[rotate,color] duration-300 group-hover:rotate-45 group-hover:text-[#45DFB1]" />
        </span>
        <span className="text-[15px] leading-relaxed text-neutral-500 transition-colors duration-300 group-hover:text-white/70" style={body}>
          {area.desc}
        </span>
      </span>
    </Link>
  );
}

function AboutUsPage() {
  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={7} />
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
                  <MaskLine delay={0}>The people</MaskLine>
                  <MaskLine delay={0.12}>
                    behind <span style={accent}>smartagri.</span>
                  </MaskLine>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                  className="max-w-[480px] text-base leading-relaxed text-neutral-600 md:text-lg"
                  style={body}
                >
                  A research center at Universitas Gadjah Mada that believes the future of farming
                  is grown together, by agronomists, engineers, and farmers.
                </motion.p>
              </div>

              {/* Team photo: wipes up into view. */}
              <motion.figure
                initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
                animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
                transition={{ delay: 0.35, duration: 1.2, ease: EASE }}
                className="relative mt-12 overflow-hidden rounded-[32px] shadow-[0_40px_90px_-50px_rgba(8,49,58,0.6)]"
              >
                <motion.img
                  src={A.heroPhoto}
                  alt="The Smart Agriculture Research Center team"
                  initial={{ scale: 1.12 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.35, duration: 1.8, ease: EASE }}
                  className="aspect-[16/9] w-full object-cover object-[50%_18%] md:aspect-[21/9]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#08313A]/70 to-transparent" />
                <figcaption
                  className={`absolute bottom-5 left-6 flex items-center gap-2 text-white/90 md:bottom-7 md:left-8 ${META}`}
                  style={body}
                >
                  <Users className="h-3.5 w-3.5 text-[#45DFB1]" />
                  Smart Agriculture Research Center, UGM
                </figcaption>
              </motion.figure>
            </section>

            {/* Figures */}
            <section className="mx-auto max-w-[1360px] px-6 pt-14 md:px-12 md:pt-16">
              <div className="grid grid-cols-2 gap-px overflow-clip rounded-[24px] border border-[#0B6477]/12 bg-[#0B6477]/12 sm:grid-cols-3 lg:grid-cols-6">
                {FIGURES.map((f, i) => {
                  const inner = (
                    <>
                      <span className="block text-4xl font-semibold leading-none tracking-[-0.035em] text-neutral-900 transition-colors duration-300 group-hover:text-[#0B6477] md:text-5xl" style={display}>
                        <CountUp value={f.value} />
                      </span>
                      <span className="mt-3 flex items-center gap-1.5 text-[13px] text-neutral-500" style={body}>
                        {f.label}
                        {f.to && <ArrowUpRight className="h-3.5 w-3.5 text-[#14919B] opacity-0 transition-opacity group-hover:opacity-100" />}
                      </span>
                    </>
                  );
                  return (
                    <motion.div key={f.label} {...fadeUp(i * 0.06)} className="bg-white/90">
                      {f.to ? (
                        <Link to={f.to} className="group flex h-full flex-col p-6 transition-colors hover:bg-[#F3F7F6]">
                          {inner}
                        </Link>
                      ) : (
                        <div className="group flex h-full flex-col p-6">{inner}</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* Mission + home */}
            <section className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
              <div className="grid gap-6 lg:grid-cols-12">
                <motion.div
                  {...fadeUp()}
                  data-header-theme="dark"
                  className="relative overflow-clip rounded-[32px] bg-[#08313A] p-8 text-white md:p-12 lg:col-span-7"
                >
                  <div className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full bg-[#14919B]/30 blur-3xl animate-wash-a" />
                  <div className="relative">
                    <SectionLabel tone="dark">Our mission</SectionLabel>
                    <p className="mt-6 text-2xl font-medium leading-snug tracking-[-0.02em] md:text-[34px]" style={display}>
                      Harness AI, sensing, and agronomy so every farmer, whatever the size of their
                      plot, can grow <span style={{ ...accent, color: "#80ED99" }}>more with less.</span>
                    </p>
                    <p className="mt-6 max-w-[560px] text-base leading-relaxed text-white/70" style={body}>
                      Climate volatility, shrinking land, and rising costs hit smallholders first.
                      We build and test the technology that helps them monitor crops, predict
                      yields, and act with confidence.
                    </p>
                  </div>
                </motion.div>
                <motion.div
                  {...fadeUp(0.12)}
                  className="flex flex-col justify-between gap-8 rounded-[32px] border border-[#0B6477]/10 bg-white/90 p-8 md:p-12 lg:col-span-5"
                >
                  <div>
                    <SectionLabel>Rooted in research</SectionLabel>
                    <p className="mt-6 text-[17px] leading-relaxed text-neutral-700" style={body}>
                      The Smart Agriculture Research Center is part of the Department of
                      Agricultural and Biosystems Engineering, Faculty of Agricultural Technology,
                      Universitas Gadjah Mada, in Yogyakarta. Our team unites researchers across
                      AI, IoT systems, remote sensing, and agronomy.
                    </p>
                  </div>
                  <p className="border-t border-[#0B6477]/12 pt-6 text-xl font-medium leading-snug tracking-[-0.015em] text-neutral-900" style={display}>
                    Everything we publish is field-tested with the cooperatives we serve.{" "}
                    <span style={accent}>Research is only finished when a farmer can use it.</span>
                  </p>
                </motion.div>
              </div>
            </section>

            {/* What we're good at */}
            <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
              <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <SectionLabel>What we're good at</SectionLabel>
                    <SectionHeading first="Six areas," second="one goal." />
                  </div>
                  <Link
                    to="/technology"
                    className="group inline-flex items-center gap-2 self-start border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477] lg:self-auto"
                    style={body}
                  >
                    The {TECHNOLOGIES.length} technologies behind them
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {RESEARCH_AREAS.map((area, i) => (
                    <motion.div key={area.slug} {...fadeUp((i % 3) * 0.08)}>
                      <AreaCard area={area} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Who we work with */}
            <section className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
              <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <SectionLabel>Who we work with</SectionLabel>
                  <SectionHeading first="In collaboration" second="with leading partners." />
                </div>
                <motion.p {...fadeUp(0.2)} className="max-w-[460px] text-base leading-relaxed text-neutral-500 md:text-lg" style={body}>
                  Universities, ministries, government institutions, industry and farmer groups we
                  research, build and deploy with, at home and abroad.
                </motion.p>
              </div>
              <PartnerGrid />
            </section>

            {/* Team */}
            <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
              <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <SectionLabel>The team</SectionLabel>
                    <SectionHeading first="Meet the people" second="doing the work." />
                  </div>
                  <Link
                    to="/team"
                    className="group inline-flex items-center gap-2 self-start border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477] lg:self-auto"
                    style={body}
                  >
                    View all members
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
                <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                  {team.map((member, i) => (
                    <TeamCard key={member.slug} member={member} index={i} />
                  ))}
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
