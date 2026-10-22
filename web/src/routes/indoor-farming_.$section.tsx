import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { MotionConfig, motion } from "framer-motion";
import { ArrowDownRight, ArrowRight } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { indoorFarmingPhoto } from "../lib/assets";
import { IF_PILLARS, findIFSection, type IFGroup, type IFSection } from "../lib/indoor-farming";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingNav from "../components/IndoorFarmingNav";
import IndoorFarmingCrumb from "../components/IndoorFarmingCrumb";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import { RevealPhoto } from "../components/ResearchPhotos";
import { EASE, MaskLine, META } from "../components/NoteParts";
import { Eyebrow, IFNotFound, SectionCard, fadeUp } from "../components/IndoorFarmingParts";

export const Route = createFileRoute("/indoor-farming_/$section")({
  component: IndoorFarmingSectionPage,
  // Return only the slug (serializable). The section object holds `icon`
  // components (functions), which can't be serialized to the client, so the
  // full section is resolved from the slug inside the component/head instead.
  loader: ({ params }) => {
    if (!findIFSection(params.section)) throw notFound();
    return { section: params.section };
  },
  head: ({ loaderData }) => {
    const section = loaderData ? findIFSection(loaderData.section) : undefined;
    return {
      meta: [
        {
          title: section
            ? `${section.label} · Indoor Farming | smartagri`
            : "Indoor Farming | smartagri",
        },
        ...(section?.lede
          ? [{ name: "description", content: section.lede }]
          : []),
      ],
    };
  },
  notFoundComponent: SectionNotFound,
});

// One Indoor Farming section (approach, cultivation, technology, greenhouses):
// masthead with a strip of its groups, one row per group (photo, intro, the
// topics it covers), the other sections, and the landing call to action.

function SectionNotFound() {
  return <IFNotFound message="That part of the Indoor Farming section does not exist." />;
}

function GroupChip({ section, group, i }: { section: string; group: IFGroup; i: number }) {
  return (
    <motion.a
      href={`#${group.slug}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + i * 0.07, duration: 0.6, ease: EASE }}
      className="group flex flex-col gap-3"
    >
      <span className="relative block overflow-hidden rounded-2xl bg-[#DCEFEA]">
        <img
          src={indoorFarmingPhoto(`${section}-${group.slug}.webp`)}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover grayscale-[35%] transition-[transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:grayscale-0"
        />
        <span className="absolute inset-0 bg-[#08313A]/35 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-0" />
        <span className="absolute bottom-3 right-3 grid h-9 w-9 translate-y-2 place-items-center rounded-full bg-[#45DFB1] text-[#08313A] opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <group.icon className="h-4 w-4" />
        </span>
      </span>
      <span className="flex items-start justify-between gap-2">
        <span
          className="text-[13px] font-semibold uppercase leading-snug tracking-[0.06em] text-neutral-900 transition-colors group-hover:text-[#0B6477]"
          style={body}
        >
          {group.title}
        </span>
        <ArrowDownRight className="mt-0.5 h-4 w-4 shrink-0 text-[#0B6477] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
      </span>
    </motion.a>
  );
}

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

function GroupRow({ section, group, i }: { section: IFSection; group: IFGroup; i: number }) {
  const photoLeft = i % 2 === 0;
  return (
    <section
      id={group.slug}
      className={`scroll-mt-40 border-t border-[#0B6477]/10 ${i % 2 === 1 ? "bg-[#F3F7F6]/70" : ""}`}
    >
      <div className="mx-auto grid max-w-[1360px] gap-10 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-12 lg:gap-14">
        <div className={`lg:col-span-5 ${photoLeft ? "" : "lg:order-2"}`}>
          <RevealPhoto
            src={indoorFarmingPhoto(`${section.slug}-${group.slug}.webp`)}
            side={photoLeft ? "left" : "right"}
            alt={group.title}
          />
        </div>

        <div className={`lg:col-span-7 lg:pt-6 ${photoLeft ? "" : "lg:order-1"}`}>
          <motion.div {...fadeUp(0)}>
            <Eyebrow>
              <group.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {section.label} · {group.topics.length} topics
            </Eyebrow>
          </motion.div>
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-neutral-900 md:text-5xl"
            style={display}
          >
            <MaskLine delay={0.05}>{group.title}</MaskLine>
          </motion.h2>
          <motion.p
            {...fadeUp(0.15)}
            className="mt-6 max-w-[640px] text-base leading-relaxed text-neutral-600 md:text-lg"
            style={body}
          >
            {group.intro}
          </motion.p>

          <div className="mt-10 border-t border-[#0B6477]/12 pt-8">
            <p className={`mb-4 text-neutral-400 ${META}`} style={body}>
              What it covers
            </p>
            <motion.ul
              variants={list}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              className="grid gap-x-8 gap-y-1 sm:grid-cols-2"
            >
              {group.topics.map((topic) => (
                <motion.li key={topic.slug} variants={item}>
                  <Link
                    to="/indoor-farming/$section/$group"
                    params={{ section: section.slug, group: group.slug }}
                    hash={topic.slug}
                    className="group flex items-center justify-between gap-3 border-b border-[#0B6477]/10 py-3 text-[15px] text-neutral-800 transition-colors hover:text-[#0B6477]"
                    style={body}
                  >
                    {topic.title}
                    <ArrowRight className="h-4 w-4 shrink-0 -translate-x-1 text-[#14919B] opacity-40 transition-[translate,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          <motion.div {...fadeUp(0.2)} className="mt-10">
            <Link
              to="/indoor-farming/$section/$group"
              params={{ section: section.slug, group: group.slug }}
              className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#08313A] px-6 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0B6477]"
              style={body}
            >
              {group.linkLabel}
              <ArrowRight className="h-4 w-4 text-[#45DFB1] transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function IndoorFarmingSectionPage() {
  const { section: slug } = Route.useLoaderData();
  const section = findIFSection(slug);
  if (!section) return <SectionNotFound />;
  const others = IF_PILLARS.filter((p) => p.slug !== section.slug);
  const topics = section.groups.reduce((n, g) => n + g.topics.length, 0);

  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader subnav={<IndoorFarmingNav />} />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={7} />
          <div className="relative">
            {/* Masthead */}
            <section className="mx-auto max-w-[1360px] px-6 pb-16 pt-12 md:px-12 md:pb-20 md:pt-16">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <IndoorFarmingCrumb current={section.label} />
              </motion.div>
              <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end">
                <motion.h1
                  initial="hidden"
                  animate="show"
                  className="text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[72px] lg:col-span-8"
                  style={display}
                >
                  <MaskLine delay={0}>{section.title}</MaskLine>
                  <MaskLine delay={0.12}>
                    <span style={accent}>{section.accent}.</span>
                  </MaskLine>
                </motion.h1>
                <div className="lg:col-span-4">
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                    className="text-base leading-relaxed text-neutral-600 md:text-lg"
                    style={body}
                  >
                    {section.lede}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                    className={`mt-5 text-neutral-400 ${META}`}
                    style={body}
                  >
                    {section.groups.length} groups · {topics} topics
                  </motion.p>
                </div>
              </div>

              <div
                className={`mt-14 grid grid-cols-2 gap-4 md:gap-5 ${
                  section.groups.length === 4 ? "lg:grid-cols-4" : "sm:grid-cols-3"
                }`}
              >
                {section.groups.map((group, i) => (
                  <GroupChip key={group.slug} section={section.slug} group={group} i={i} />
                ))}
              </div>
            </section>

            {section.groups.map((group, i) => (
              <GroupRow key={group.slug} section={section} group={group} i={i} />
            ))}

            {/* The other sections */}
            <section className="border-t border-[#0B6477]/10">
              <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                <div className="mb-12">
                  <Eyebrow>Keep exploring</Eyebrow>
                  <motion.h2
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.6 }}
                    className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                    style={display}
                  >
                    <MaskLine delay={0}>Elsewhere in</MaskLine>
                    <MaskLine delay={0.1}>
                      <span style={accent}>Indoor Farming.</span>
                    </MaskLine>
                  </motion.h2>
                </div>
                <div className="grid gap-5 md:grid-cols-3">
                  {others.map((pillar, i) => (
                    <motion.div
                      key={pillar.slug}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ delay: i * 0.08, duration: 0.7, ease: EASE }}
                    >
                      <SectionCard {...pillar} />
                    </motion.div>
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
