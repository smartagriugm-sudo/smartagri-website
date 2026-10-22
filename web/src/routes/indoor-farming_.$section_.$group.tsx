import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { MotionConfig, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { indoorFarmingPhoto } from "../lib/assets";
import { findIFSection, type IFTopic } from "../lib/indoor-farming";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingNav from "../components/IndoorFarmingNav";
import IndoorFarmingCrumb from "../components/IndoorFarmingCrumb";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import { RevealPhoto } from "../components/ResearchPhotos";
import { EASE, MaskLine, META } from "../components/NoteParts";
import { Eyebrow, GroupCard, IFNotFound, fadeUp } from "../components/IndoorFarmingParts";

export const Route = createFileRoute("/indoor-farming_/$section_/$group")({
  component: IndoorFarmingGroupPage,
  // Only slugs are returned: the content objects carry `icon` components
  // (functions), which cannot be serialized to the client.
  loader: ({ params }) => {
    const section = findIFSection(params.section);
    const group = section?.groups.find((g) => g.slug === params.group);
    if (!section || !group) throw notFound();
    return { section: params.section, group: params.group };
  },
  head: ({ loaderData }) => {
    const section = loaderData ? findIFSection(loaderData.section) : undefined;
    const group = section?.groups.find((g) => g.slug === loaderData?.group);
    return {
      meta: [
        {
          title: group
            ? `${group.title} · Indoor Farming | smartagri`
            : "Indoor Farming | smartagri",
        },
        ...(group?.intro
          ? [{ name: "description", content: group.intro }]
          : []),
      ],
    };
  },
  notFoundComponent: GroupNotFound,
});

// One group of topics: masthead with its photo, the topics with a sticky
// contents list that follows the scroll, previous and next within the
// section, the rest of the section, and the landing call to action.

function GroupNotFound() {
  return <IFNotFound message="That topic does not exist in the Indoor Farming section." />;
}

// The topic nearest the top of the viewport.
function useActiveTopic(key: string) {
  const [active, setActive] = useState(key.split(",")[0]);
  useEffect(() => {
    const ids = key.split(",");
    const onScroll = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 220) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [key]);
  return active;
}

const points = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const point = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

function TopicArticle({ topic, first }: { topic: IFTopic; first: boolean }) {
  return (
    <article
      id={topic.slug}
      className={`scroll-mt-40 ${first ? "" : "border-t border-[#0B6477]/10 pt-12 md:pt-14"}`}
    >
      <motion.h2
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-neutral-900 md:text-4xl"
        style={display}
      >
        <MaskLine delay={0}>{topic.title}</MaskLine>
      </motion.h2>
      <motion.p
        {...fadeUp(0.1)}
        className="mt-5 max-w-[680px] text-base leading-relaxed text-neutral-600 md:text-lg"
        style={body}
      >
        {topic.summary}
      </motion.p>
      <motion.ul
        variants={points}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="mt-7 grid gap-3"
      >
        {topic.points.map((p) => (
          <motion.li
            key={p}
            variants={point}
            className="flex items-start gap-3 rounded-2xl border border-[#0B6477]/10 bg-white/80 px-5 py-4 text-[15px] leading-snug text-neutral-800 backdrop-blur"
            style={body}
          >
            <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#45DFB1]/25 text-[#0B6477]">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {p}
          </motion.li>
        ))}
      </motion.ul>
    </article>
  );
}

function IndoorFarmingGroupPage() {
  const { section: sectionSlug, group: groupSlug } = Route.useLoaderData();
  const section = findIFSection(sectionSlug);
  const group = section?.groups.find((g) => g.slug === groupSlug);
  const active = useActiveTopic(group?.topics.map((t) => t.slug).join(",") ?? "");
  if (!section || !group) return <GroupNotFound />;

  const index = section.groups.indexOf(group);
  const prev = section.groups[index - 1];
  const next = section.groups[index + 1];
  const siblings = section.groups.filter((g) => g.slug !== group.slug);

  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader subnav={<IndoorFarmingNav />} />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={7} />
          <div className="relative">
            {/* Masthead */}
            <section className="mx-auto max-w-[1360px] px-6 pb-16 pt-12 md:px-12 md:pb-20 md:pt-16">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <IndoorFarmingCrumb
                  section={{ slug: section.slug, label: section.label }}
                  current={group.title}
                />
              </motion.div>
              <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
                <div className="lg:col-span-7">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Eyebrow>
                      <group.icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {section.label}
                    </Eyebrow>
                  </motion.div>
                  <motion.h1
                    initial="hidden"
                    animate="show"
                    className="mt-5 text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[72px]"
                    style={display}
                  >
                    <MaskLine delay={0.05}>{group.title}</MaskLine>
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                    className="mt-7 max-w-[640px] text-base leading-relaxed text-neutral-600 md:text-lg"
                    style={body}
                  >
                    {group.lede ?? group.intro}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                    className={`mt-6 text-neutral-400 ${META}`}
                    style={body}
                  >
                    {group.topics.length} topics
                  </motion.p>
                </div>
                <div className="lg:col-span-5">
                  <RevealPhoto
                    src={indoorFarmingPhoto(`${section.slug}-${group.slug}.webp`)}
                    side="right"
                    alt={group.title}
                  />
                </div>
              </div>
            </section>

            {/* Topics with a contents list */}
            <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
              <div className="mx-auto grid max-w-[1360px] gap-12 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-12 lg:gap-14">
                <aside className="hidden lg:col-span-4 lg:block">
                  <nav aria-label="Topics" className="sticky top-[160px]">
                    <p className={`mb-4 text-neutral-400 ${META}`} style={body}>
                      In this topic
                    </p>
                    <ul className="flex flex-col border-l border-[#0B6477]/15">
                      {group.topics.map((t) => {
                        const on = t.slug === active;
                        return (
                          <li key={t.slug} className="relative">
                            {on && (
                              <motion.span
                                layoutId="if-topic-marker"
                                className="absolute -left-px top-0 h-full w-[2px] bg-[#14919B]"
                                transition={{ duration: 0.4, ease: EASE }}
                              />
                            )}
                            <a
                              href={`#${t.slug}`}
                              className={`block py-2.5 pl-5 text-[15px] leading-snug transition-colors ${
                                on ? "font-medium text-[#0B6477]" : "text-neutral-500 hover:text-neutral-900"
                              }`}
                              style={body}
                            >
                              {t.title}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                    <Link
                      to="/contact-us"
                      hash="inquiry"
                      className="group mt-10 inline-flex h-12 items-center gap-3 rounded-lg bg-[#45DFB1] px-6 text-sm font-medium uppercase tracking-[0.08em] text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
                      style={body}
                    >
                      Discuss a project
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </nav>
                </aside>
                <div className="flex flex-col gap-12 md:gap-14 lg:col-span-8">
                  {group.topics.map((t, i) => (
                    <TopicArticle key={t.slug} topic={t} first={i === 0} />
                  ))}
                </div>
              </div>
            </section>

            {/* Previous and next within the section */}
            <section className="mx-auto max-w-[1360px] px-6 pt-20 md:px-12 md:pt-28">
              <div className="grid gap-px overflow-hidden rounded-[24px] border border-[#0B6477]/12 bg-[#0B6477]/12 sm:grid-cols-2">
                {[
                  { g: prev, label: "Previous", dir: -1 },
                  { g: next, label: "Next", dir: 1 },
                ].map(({ g, label, dir }) =>
                  g ? (
                    <Link
                      key={label}
                      to="/indoor-farming/$section/$group"
                      params={{ section: section.slug, group: g.slug }}
                      className={`group flex flex-col gap-3 bg-white/90 p-7 transition-colors hover:bg-[#08313A] md:p-9 ${
                        dir === 1 ? "sm:items-end sm:text-right" : ""
                      }`}
                    >
                      <span
                        className={`inline-flex items-center gap-2 text-neutral-400 transition-colors group-hover:text-[#45DFB1] ${META}`}
                        style={body}
                      >
                        {dir === -1 && <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />}
                        {label}
                        {dir === 1 && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />}
                      </span>
                      <span
                        className="text-2xl font-medium tracking-[-0.02em] text-neutral-900 transition-colors group-hover:text-white"
                        style={display}
                      >
                        {g.title}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      key={label}
                      to="/indoor-farming/$section"
                      params={{ section: section.slug }}
                      className={`group flex flex-col gap-3 bg-white/90 p-7 transition-colors hover:bg-[#08313A] md:p-9 ${
                        dir === 1 ? "sm:items-end sm:text-right" : ""
                      }`}
                    >
                      <span
                        className={`inline-flex items-center gap-2 text-neutral-400 transition-colors group-hover:text-[#45DFB1] ${META}`}
                        style={body}
                      >
                        {dir === -1 && <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />}
                        Back to
                        {dir === 1 && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />}
                      </span>
                      <span
                        className="text-2xl font-medium tracking-[-0.02em] text-neutral-900 transition-colors group-hover:text-white"
                        style={display}
                      >
                        {section.label} overview
                      </span>
                    </Link>
                  ),
                )}
              </div>
            </section>

            {/* Rest of the section */}
            {siblings.length > 0 && (
              <section className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                <div className="mb-12">
                  <Eyebrow>Keep exploring</Eyebrow>
                  <motion.h2
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.6 }}
                    className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                    style={display}
                  >
                    <MaskLine delay={0}>More in</MaskLine>
                    <MaskLine delay={0.1}>
                      <span style={accent}>{section.label}.</span>
                    </MaskLine>
                  </motion.h2>
                </div>
                <div
                  className={`grid gap-5 sm:grid-cols-2 ${siblings.length === 3 ? "lg:grid-cols-3" : ""}`}
                >
                  {siblings.map((g, i) => (
                    <motion.div
                      key={g.slug}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ delay: i * 0.08, duration: 0.7, ease: EASE }}
                      className={siblings.length === 3 && i === 2 ? "sm:col-span-2 lg:col-span-1" : ""}
                    >
                      <GroupCard section={section.slug} group={g} />
                    </motion.div>
                  ))}
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
