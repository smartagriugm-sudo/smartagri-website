import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Cpu, Sparkles } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { findResearchArea, RESEARCH_AREAS } from "../lib/research";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/research_/$slug")({
  component: ResearchDetailPage,
  // Return only the slug (serializable). The area object holds an `icon`
  // component (a function), which can't be serialized to the client, so we
  // resolve the full area from the slug inside the component/head instead.
  loader: ({ params }) => ({ slug: params.slug }),
  head: ({ loaderData }) => {
    const area = loaderData ? findResearchArea(loaderData.slug) : undefined;
    return {
      meta: [
        { title: `${area?.label ?? "Research"} | smartagri` },
        ...(area
          ? [{ name: "description", content: area.overview.slice(0, 160) }]
          : []),
      ],
    };
  },
});

function ResearchDetailPage() {
  const { slug } = Route.useLoaderData();
  const area = findResearchArea(slug);

  if (!area) {
    return (
      <main>
        <SiteHeader />
        <section className="bg-[#F3F7F6]">
          <div className="max-w-[760px] mx-auto px-6 py-24 text-center flex flex-col items-center gap-4">
            <h1
              className="text-3xl md:text-4xl font-semibold text-neutral-900"
              style={display}
            >
              Research area not found
            </h1>
            <Link
              to="/research"
              className="px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
              style={body}
            >
              Back to Research
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const others = RESEARCH_AREAS.filter((a) => a.slug !== area.slug);

  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 pt-12 md:pt-16 pb-16 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <Link
              to="/research"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#0B6477] hover:underline mb-8"
              style={body}
            >
              <ArrowLeft className="w-4 h-4" />
              All research areas
            </Link>

            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#0B6477] flex items-center justify-center shrink-0">
                <area.icon className="w-8 h-8 text-[#45DFB1]" />
              </div>
              <div>
                <div
                  className="text-[13px] font-medium tracking-[0.12em] text-[#14919B] uppercase mb-2"
                  style={body}
                >
                  Research Area
                </div>
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
                  style={display}
                >
                  {area.label}
                </h1>
              </div>
            </div>

            <p
              className="text-lg md:text-xl font-normal text-neutral-600 leading-relaxed mt-8 max-w-[760px]"
              style={body}
            >
              {area.overview}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-14 md:py-20">
          <div className="grid md:grid-cols-2 gap-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div
                className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-neutral-900 uppercase mb-4"
                style={body}
              >
                <Sparkles className="w-4 h-4 text-[#14919B]" />
                What we do
              </div>
              <ul className="flex flex-col gap-3">
                {area.capabilities.map((cap) => (
                  <li
                    key={cap}
                    className="flex items-start gap-3 text-base font-normal text-neutral-600"
                    style={body}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#45DFB1] mt-2.5 shrink-0" />
                    {cap}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            >
              <div
                className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-neutral-900 uppercase mb-4"
                style={body}
              >
                <CheckCircle2 className="w-4 h-4 text-[#14919B]" />
                Why it matters
              </div>
              <ul className="flex flex-col gap-3">
                {area.outcomes.map((outcome) => (
                  <li
                    key={outcome}
                    className="flex items-start gap-3 text-base font-normal text-neutral-600"
                    style={body}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0B6477] mt-2.5 shrink-0" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
            className="mt-12 rounded-3xl bg-[#F3F7F6] p-7 md:p-9"
          >
            <div
              className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-neutral-900 uppercase mb-4"
              style={body}
            >
              <Cpu className="w-4 h-4 text-[#14919B]" />
              Core technologies behind it
            </div>
            <div className="flex flex-wrap gap-2.5">
              {area.technologies.map((tech) => (
                <Link
                  key={tech}
                  to="/technology"
                  className="rounded-full bg-white border border-[#0B6477]/20 px-4 py-2 text-sm font-medium text-[#0B6477] hover:bg-[#0B6477] hover:text-white transition-colors"
                  style={body}
                >
                  {tech}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-14 md:py-20">
          <h2
            className="text-2xl md:text-3xl font-semibold tracking-[-0.025em] text-neutral-900 mb-8"
            style={display}
          >
            Explore other <span style={accent}>research areas</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {others.map((other) => (
              <Link
                key={other.slug}
                to="/research/$slug"
                params={{ slug: other.slug }}
                className="group rounded-2xl bg-white border border-[#0B6477]/10 p-6 flex items-center gap-4 hover:shadow-lg transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-[#0B6477] flex items-center justify-center shrink-0">
                  <other.icon className="w-5 h-5 text-[#45DFB1]" />
                </div>
                <span
                  className="text-base font-medium text-neutral-900 leading-snug group-hover:text-[#0B6477] transition-colors"
                  style={display}
                >
                  {other.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
