import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { findIFSection } from "../lib/indoor-farming";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingCrumb from "../components/IndoorFarmingCrumb";
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

  return (
    <main>
      <SiteHeader />

      {/* Header */}
      <section className="bg-white">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 pt-8 md:pt-10 pb-10 md:pb-14">
          <IndoorFarmingCrumb current={section.label} />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="mt-6"
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
              className="mt-5 text-base md:text-lg font-normal text-neutral-500 leading-relaxed max-w-[640px]"
              style={body}
            >
              {section.lede}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Overview rows: image and text alternate, each linking to its own page */}
      <section className="bg-white">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 pb-16 md:pb-24">
          {section.groups.map((group, i) => {
            const imageRight = i % 2 === 1;
            return (
              <motion.div
                key={group.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center py-10 md:py-14 ${
                  i > 0 ? "border-t border-neutral-200" : ""
                }`}
              >
                <PhotoSlot
                  icon={group.icon}
                  caption={`Photo: ${group.title.toLowerCase()}`}
                  ratio="aspect-[4/3]"
                  className={imageRight ? "md:order-2" : ""}
                />
                <div className={imageRight ? "md:order-1" : ""}>
                  <h2
                    className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] leading-[1.15] text-neutral-900"
                    style={display}
                  >
                    {group.title}
                  </h2>
                  <p
                    className="mt-4 text-base font-normal text-neutral-500 leading-relaxed"
                    style={body}
                  >
                    {group.intro}
                  </p>
                  <Link
                    to="/indoor-farming/$section/$group"
                    params={{ section: section.slug, group: group.slug }}
                    className="group mt-5 inline-flex items-center gap-1.5 text-[#0B6477] font-medium hover:underline"
                    style={body}
                  >
                    {group.linkLabel}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

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
