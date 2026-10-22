import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { researchPhoto, researchPhotoAlt } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import { RESEARCH_AREAS, type ResearchArea } from "../lib/research";
import { EVIDENCE_TOTALS, evidenceFor } from "../lib/research-evidence";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import { PhotoPair } from "../components/ResearchPhotos";
import { EASE, MaskLine, META } from "../components/NoteParts";
import { EvidenceHeading, Roadmap } from "../components/ResearchEvidence";

export const Route = createFileRoute("/research")({
  component: ResearchPage,
  head: () => ({
    meta: [
      {
        title: "Research | smartagri",
      },
      {
        name: "description",
        content:
          "The six focus areas where the Smart Agriculture Research Center combines AI, IoT sensing, and agronomy, from open fields to indoor farming.",
      },
    ],
  }),
});

// Research overview laid out after the Blitz "services" page: a headline, a
// strip of six photo cards that jump to each area, one section per area
// (overview, what we do, why it matters, technologies, headline evidence,
// photo), the center's roadmap, and the same closing call to action as the
// landing page. smartagri colours and type.

function AreaCard({ area, i }: { area: ResearchArea; i: number }) {
  return (
    <motion.a
      href={`#${area.slug}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + i * 0.07, duration: 0.6, ease: EASE }}
      className="group flex flex-col gap-3"
    >
      <span className="relative block overflow-hidden rounded-2xl">
        <img
          src={researchPhoto[area.slug]}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-[4/5] w-full object-cover grayscale-[35%] transition-[transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:grayscale-0"
        />
        <span className="absolute inset-0 bg-[#08313A]/35 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-0" />
        <span className="absolute bottom-3 right-3 grid h-9 w-9 translate-y-2 place-items-center rounded-full bg-[#45DFB1] text-[#08313A] opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <area.icon className="h-4 w-4" />
        </span>
      </span>
      <span className="flex items-start justify-between gap-2">
        <span
          className="text-[13px] font-semibold uppercase leading-snug tracking-[0.06em] text-neutral-900 transition-colors group-hover:text-[#0B6477]"
          style={body}
        >
          {area.label}
        </span>
        <ArrowDownRight className="mt-0.5 h-4 w-4 shrink-0 text-[#0B6477] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
      </span>
    </motion.a>
  );
}

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

function AreaSection({ area, i }: { area: ResearchArea; i: number }) {
  const photoLeft = i % 2 === 0;
  return (
    <section
      id={area.slug}
      className={`scroll-mt-24 border-t border-[#0B6477]/10 ${i % 2 === 1 ? "bg-[#F3F7F6]/70" : ""}`}
    >
      <div className="mx-auto grid max-w-[1360px] gap-10 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-12 lg:gap-14">
        {/* Main photo with a smaller supporting one tucked beneath it */}
        <div className={`lg:col-span-5 ${photoLeft ? "" : "lg:order-2"}`}>
          <PhotoPair
            main={researchPhoto[area.slug]}
            second={researchPhotoAlt[area.slug]}
            side={photoLeft ? "left" : "right"}
            label={area.label}
          />
        </div>

        {/* Copy */}
        <div className={`lg:col-span-7 lg:pt-6 ${photoLeft ? "" : "lg:order-1"}`}>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.5 }}
            className={`flex items-center gap-2 text-[#14919B] ${META}`}
            style={body}
          >
            <area.icon className="h-3.5 w-3.5" aria-hidden="true" />
            Research area
          </motion.p>
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-neutral-900 md:text-5xl"
            style={display}
          >
            <MaskLine delay={0.05}>{area.label}</MaskLine>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
            className="mt-6 max-w-[640px] text-base leading-relaxed text-neutral-600 md:text-lg"
            style={body}
          >
            {area.overview}
          </motion.p>

          <div className="mt-10 grid gap-10 border-t border-[#0B6477]/12 pt-8 md:grid-cols-2">
            <div>
              <p className={`mb-4 text-neutral-400 ${META}`} style={body}>
                What we do
              </p>
              <motion.ul
                variants={list}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.5 }}
                className="flex flex-col gap-3"
                style={body}
              >
                {area.capabilities.map((c) => (
                  <motion.li key={c} variants={item} className="flex gap-2.5 text-[15px] leading-snug text-neutral-800">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#14919B]" />
                    {c}
                  </motion.li>
                ))}
              </motion.ul>
            </div>
            <div>
              <p className={`mb-4 text-neutral-400 ${META}`} style={body}>
                Why it matters
              </p>
              <motion.ul
                variants={list}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.5 }}
                className="flex flex-col gap-3"
                style={body}
              >
                {area.outcomes.map((o) => (
                  <motion.li key={o} variants={item} className="flex gap-2.5 text-[15px] leading-snug text-neutral-800">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#14919B]" />
                    {o}
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </div>

          <div className="mt-8">
            <p className={`mb-3 text-neutral-400 ${META}`} style={body}>
              Built on
            </p>
            <motion.ul
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.6 }}
              className="flex flex-wrap gap-2"
            >
              {area.technologies.map((t) => (
                <motion.li
                  key={t}
                  variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
                  className="rounded-full border border-[#0B6477]/15 bg-white/80 px-3 py-1.5 text-[13px] text-[#0B6477]"
                  style={body}
                >
                  {t}
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {(() => {
            const ev = evidenceFor(area.slug);
            const top = ev.highlights[0];
            if (!top) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mt-8 flex flex-col gap-4 rounded-[20px] border border-[#0B6477]/12 bg-white/80 p-5 backdrop-blur sm:flex-row sm:items-center sm:gap-6"
              >
                <span className="flex items-baseline gap-3 sm:max-w-[60%]">
                  <span
                    className="shrink-0 text-3xl font-semibold tracking-[-0.03em] text-[#0B6477]"
                    style={display}
                  >
                    {top.value}
                  </span>
                  <span className="text-[14px] leading-snug text-neutral-600" style={body}>
                    {top.label}
                  </span>
                </span>
                <span
                  className={`flex flex-wrap gap-x-4 gap-y-1 text-neutral-400 sm:ml-auto sm:flex-col sm:text-right ${META}`}
                  style={body}
                >
                  <span>
                    {ev.projects.length} center {ev.projects.length === 1 ? "project" : "projects"}
                  </span>
                  {ev.studies.length > 0 && (
                    <span>
                      {ev.studies.length} student {ev.studies.length === 1 ? "thesis" : "theses"}
                    </span>
                  )}
                </span>
              </motion.div>
            );
          })()}

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              to="/research/$slug"
              params={{ slug: area.slug }}
              className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#08313A] px-6 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0B6477]"
              style={body}
            >
              Explore {area.label}
              <ArrowRight className="h-4 w-4 text-[#45DFB1] transition-transform group-hover:translate-x-1" />
            </Link>
            {area.slug === "indoor-farming-technology" && (
              <Link
                to="/indoor-farming"
                className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                style={body}
              >
                Indoor Farming section
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResearchPage() {
  return (
    <main>
      <SiteHeader />
      <div className="relative overflow-clip bg-white">
        <AmbientWash count={6} />
        <div className="relative">
          {/* Masthead */}
          <section className="mx-auto max-w-[1360px] px-6 pb-16 pt-12 md:px-12 md:pb-20 md:pt-20">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
              <motion.h1
                initial="hidden"
                animate="show"
                className="text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[80px] lg:col-span-7"
                style={display}
              >
                <MaskLine delay={0}>Smart research</MaskLine>
                <MaskLine delay={0.12}>
                  for the fields <span style={accent}>of tomorrow.</span>
                </MaskLine>
              </motion.h1>
              <div className="lg:col-span-4 lg:col-start-9">
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                  className="text-base leading-relaxed text-neutral-600 md:text-lg"
                  style={body}
                >
                  Six focus areas, one goal: turning field data into healthier, more sustainable
                  harvests for farmers, from open fields and canals to estates and plant
                  factories.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                  className="mt-6"
                >
                  <Link
                    to="/contact-us"
                    hash="inquiry"
                    className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#45DFB1] px-6 text-sm font-medium uppercase tracking-[0.08em] text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
                    style={body}
                  >
                    Start a project
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
                <motion.dl
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                  className="mt-8 flex gap-8 border-t border-[#0B6477]/12 pt-6"
                >
                  {[
                    { value: EVIDENCE_TOTALS.projects, label: "Center projects" },
                    { value: EVIDENCE_TOTALS.studies, label: "Student theses" },
                    { value: RESEARCH_AREAS.length, label: "Focus areas" },
                  ].map((f) => (
                    <div key={f.label}>
                      <dd
                        className="text-3xl font-semibold leading-none tracking-[-0.035em] text-neutral-900"
                        style={display}
                      >
                        {f.value}
                      </dd>
                      <dt className={`mt-2 text-neutral-400 ${META}`} style={body}>
                        {f.label}
                      </dt>
                    </div>
                  ))}
                </motion.dl>
              </div>
            </div>

            {/* Strip of the six areas; each jumps to its section below. */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 md:gap-5">
              {RESEARCH_AREAS.map((area, i) => (
                <AreaCard key={area.slug} area={area} i={i} />
              ))}
            </div>
          </section>

          {RESEARCH_AREAS.map((area, i) => (
            <AreaSection key={area.slug} area={area} i={i} />
          ))}

          {/* Where the center is heading */}
          <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
            <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
              <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className={`flex items-center gap-2 text-[#14919B] ${META}`} style={body}>
                    <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
                    Roadmap 2012–2030
                  </p>
                  <EvidenceHeading first="From foundations" second="to full ecosystems." />
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
                  className="max-w-[460px] text-base leading-relaxed text-neutral-500 md:text-lg"
                  style={body}
                >
                  Six stages, supported throughout by research on environmental monitoring and control
                  and on knowledge and information management.
                </motion.p>
              </div>
              <Roadmap />
            </div>
          </section>

          {/* Same closing call to action as the landing page. */}
          <CallToAction />
        </div>
      </div>
      <Footer />
    </main>
  );
}
