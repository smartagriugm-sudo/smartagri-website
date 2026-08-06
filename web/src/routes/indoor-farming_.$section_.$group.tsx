import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { findIFSection } from "../lib/indoor-farming";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingCrumb from "../components/IndoorFarmingCrumb";
import PhotoSlot from "../components/PhotoSlot";
import Footer from "../components/Footer";

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

function GroupNotFound() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[760px] mx-auto px-6 py-24 text-center flex flex-col items-center gap-4">
          <h1
            className="text-3xl md:text-4xl font-semibold text-neutral-900"
            style={display}
          >
            Page not found
          </h1>
          <p className="text-neutral-500" style={body}>
            That topic does not exist in the Indoor Farming section.
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

function IndoorFarmingGroupPage() {
  const { section: sectionSlug, group: groupSlug } = Route.useLoaderData();
  const section = findIFSection(sectionSlug);
  const group = section?.groups.find((g) => g.slug === groupSlug);
  if (!section || !group) return <GroupNotFound />;

  const siblings = section.groups.filter((g) => g.slug !== group.slug);

  return (
    <main>
      <SiteHeader />

      {/* Header */}
      <section className="bg-white">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 pt-8 md:pt-10 pb-10 md:pb-14">
          <IndoorFarmingCrumb
            section={{ slug: section.slug, label: section.label }}
            current={group.title}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="mt-6 grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-14 items-center"
          >
            <div>
              <div
                className="flex items-center gap-2 text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
                style={body}
              >
                <group.icon className="w-4 h-4" />
                {section.label}
              </div>
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.05] text-neutral-900"
                style={display}
              >
                {group.title}
              </h1>
              <p
                className="mt-5 text-base md:text-lg font-normal text-neutral-500 leading-relaxed"
                style={body}
              >
                {group.lede ?? group.intro}
              </p>
            </div>
            <PhotoSlot
              icon={group.icon}
              caption={`Photo: ${group.title.toLowerCase()}`}
              ratio="aspect-[4/3]"
            />
          </motion.div>
        </div>
      </section>

      {/* Topics */}
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-14 md:py-20">
          <div className="grid sm:grid-cols-2 gap-5">
            {group.topics.map((topic, i) => (
              <motion.article
                key={topic.slug}
                id={topic.slug}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  delay: Math.min(i, 3) * 0.06,
                  duration: 0.45,
                  ease: "easeOut",
                }}
                className={`scroll-mt-28 flex flex-col gap-3 rounded-3xl border border-[#0B6477]/10 bg-white p-7 ${
                  group.topics.length % 2 === 1 &&
                  i === group.topics.length - 1
                    ? "sm:col-span-2"
                    : ""
                }`}
              >
                <h2
                  className="text-lg font-medium text-neutral-900 leading-snug"
                  style={display}
                >
                  {topic.title}
                </h2>
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
      </section>

      {/* Siblings within the same section */}
      {siblings.length > 0 && (
        <section className="bg-white">
          <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-14 md:py-20">
            <h2
              className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-neutral-900 mb-8"
              style={display}
            >
              More in <span style={accent}>{section.label}</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {siblings.map((other) => (
                <Link
                  key={other.slug}
                  to="/indoor-farming/$section/$group"
                  params={{ section: section.slug, group: other.slug }}
                  className="group rounded-2xl bg-[#F3F7F6] border border-[#0B6477]/10 p-6 flex items-center gap-4 hover:border-[#14919B]/40 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#0B6477] flex items-center justify-center shrink-0">
                    <other.icon className="w-5 h-5 text-[#45DFB1]" />
                  </div>
                  <span
                    className="text-base font-medium text-neutral-900 leading-snug group-hover:text-[#0B6477] transition-colors"
                    style={display}
                  >
                    {other.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-14 md:py-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2
                className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-neutral-900"
                style={display}
              >
                Ready to talk it <span style={accent}>through?</span>
              </h2>
              <p
                className="mt-3 text-base font-normal text-neutral-500 max-w-[560px]"
                style={body}
              >
                Bring us the crop, the site, and the goal. We will tell you what
                a controlled environment can realistically deliver.
              </p>
            </div>
            <Link
              to="/contact-us"
              className="inline-flex items-center gap-2 h-12 px-7 shrink-0 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-base font-medium hover:bg-[#80ED99] transition-colors"
              style={body}
            >
              Discuss a project
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
