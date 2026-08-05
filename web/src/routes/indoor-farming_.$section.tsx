import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { IF_SECTIONS, findIFSection } from "../lib/indoor-farming";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingNav from "../components/IndoorFarmingNav";
import PhotoSlot from "../components/PhotoSlot";
import Footer from "../components/Footer";

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

function SectionNotFound() {
  return (
    <main>
      <SiteHeader />
      <IndoorFarmingNav />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[760px] mx-auto px-6 py-24 text-center flex flex-col items-center gap-4">
          <h1
            className="text-3xl md:text-4xl font-semibold text-neutral-900"
            style={display}
          >
            Page not found
          </h1>
          <p className="text-neutral-500" style={body}>
            That part of the Indoor Farming section does not exist.
          </p>
          <Link
            to="/indoor-farming"
            className="inline-flex items-center gap-2 text-[#0B6477] font-medium hover:underline"
            style={body}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Indoor Farming
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function IndoorFarmingSectionPage() {
  const { section: slug } = Route.useLoaderData();
  const section = findIFSection(slug);
  if (!section) return <SectionNotFound />;

  const index = IF_SECTIONS.findIndex((s) => s.slug === section.slug);
  const next = IF_SECTIONS[index + 1];

  return (
    <main>
      <SiteHeader />
      <IndoorFarmingNav />

      {/* Section header */}
      <section className="bg-white border-b border-[#0B6477]/10">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-12 md:pt-16 pb-10 md:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
              style={body}
            >
              {section.eyebrow}
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.05] text-neutral-900 max-w-[820px]"
              style={display}
            >
              {section.title} <span style={accent}>{section.accent}</span>
            </h1>
            <p
              className="mt-5 text-base md:text-lg font-normal text-neutral-500 leading-relaxed max-w-[680px]"
              style={body}
            >
              {section.lede}
            </p>
          </motion.div>

          {/* Jump links */}
          {section.groups.length > 1 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {section.groups.map((group) => (
                <a
                  key={group.slug}
                  href={`#${group.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[#0B6477]/15 bg-[#F3F7F6] px-4 py-2 text-sm font-medium text-neutral-600 hover:border-[#14919B]/40 hover:text-[#0B6477] transition-colors"
                  style={body}
                >
                  <group.icon className="w-4 h-4 text-[#14919B]" />
                  {group.title}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Groups */}
      {section.groups.map((group, gi) => (
        <section
          key={group.slug}
          id={group.slug}
          className={`scroll-mt-32 ${gi % 2 === 0 ? "bg-white" : "bg-[#F3F7F6]"}`}
        >
          <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-14 md:py-20">
            <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-14">
              {/* Group intro */}
              <div className="lg:sticky lg:top-36 lg:self-start">
                <div className="w-12 h-12 rounded-2xl bg-[#0B6477]/8 flex items-center justify-center mb-5">
                  <group.icon className="w-5.5 h-5.5 text-[#0B6477]" />
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] leading-[1.15] text-neutral-900"
                  style={display}
                >
                  {group.title}
                </h2>
                <p
                  className="mt-4 text-base font-normal text-neutral-500 leading-relaxed max-w-[420px]"
                  style={body}
                >
                  {group.intro}
                </p>
                <PhotoSlot
                  icon={group.icon}
                  caption={`Photo: ${group.title.toLowerCase()}`}
                  ratio="aspect-[16/10]"
                  className="mt-7 hidden lg:block max-w-[420px]"
                  tone={gi % 2 === 0 ? "light" : "dark"}
                />
              </div>

              {/* Topics */}
              <div className="grid sm:grid-cols-2 gap-5">
                {group.topics.map((topic, ti) => (
                  <motion.article
                    key={topic.slug}
                    id={topic.slug}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{
                      delay: Math.min(ti, 3) * 0.06,
                      duration: 0.45,
                      ease: "easeOut",
                    }}
                    className={`scroll-mt-32 flex flex-col gap-3 rounded-3xl border border-[#0B6477]/10 p-7 ${
                      gi % 2 === 0 ? "bg-[#F3F7F6]" : "bg-white"
                    } ${
                      group.topics.length % 2 === 1 &&
                      ti === group.topics.length - 1
                        ? "sm:col-span-2"
                        : ""
                    }`}
                  >
                    <h3
                      className="text-lg font-medium text-neutral-900 leading-snug"
                      style={display}
                    >
                      {topic.title}
                    </h3>
                    <p
                      className="text-sm font-normal text-neutral-500 leading-relaxed"
                      style={body}
                    >
                      {topic.summary}
                    </p>
                    <ul className="mt-1 flex flex-col gap-2">
                      {topic.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2.5 text-sm font-normal text-neutral-600"
                          style={body}
                        >
                          <Check className="w-4 h-4 shrink-0 mt-0.5 text-[#14919B]" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Next section + CTA */}
      <section className="bg-white border-t border-[#0B6477]/10">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-14 md:py-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2
                className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-neutral-900"
                style={display}
              >
                {next ? (
                  <>
                    Next: <span style={accent}>{next.label}</span>
                  </>
                ) : (
                  <>
                    Ready to talk it <span style={accent}>through?</span>
                  </>
                )}
              </h2>
              <p
                className="mt-3 text-base font-normal text-neutral-500 max-w-[560px]"
                style={body}
              >
                {next
                  ? next.lede
                  : "Bring us the crop, the site, and the goal. We will tell you what a controlled environment can realistically deliver."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              {next ? (
                <Link
                  to="/indoor-farming/$section"
                  params={{ section: next.slug }}
                  className="inline-flex items-center gap-2 h-12 px-7 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-base font-medium hover:bg-[#80ED99] transition-colors"
                  style={body}
                >
                  {next.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/contact-us"
                  className="inline-flex items-center gap-2 h-12 px-7 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-base font-medium hover:bg-[#80ED99] transition-colors"
                  style={body}
                >
                  Discuss a project
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link
                to="/indoor-farming"
                className="inline-flex items-center gap-2 h-12 px-7 rounded-2xl border border-[#0B6477]/20 text-[#0B6477] text-base font-medium hover:bg-[#F3F7F6] transition-colors"
                style={body}
              >
                Overview
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
