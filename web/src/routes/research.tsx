import { createFileRoute, createLink } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { RESEARCH_AREAS } from "../lib/research";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

const MotionLink = createLink(motion.a);

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

const steps = [
  {
    number: "01",
    title: "Sense",
    desc: "Soil probes, weather stations, and drone surveys capture what is actually happening in the field, hour by hour.",
  },
  {
    number: "02",
    title: "Model",
    desc: "Machine-learning models turn raw readings into early warnings, forecasts, and per-plot recommendations.",
  },
  {
    number: "03",
    title: "Act",
    desc: "Farmers and cooperatives get advice they can act on: when to irrigate, where to scout, what to expect at harvest.",
  },
];

function ResearchPage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="Research"
            title={
              <>
                <span style={accent}>Smart research</span> for the fields of
                tomorrow
              </>
            }
            subtitle="Six focus areas, one goal: turning field data into healthier, more sustainable harvests for farmers."
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {RESEARCH_AREAS.map((area, i) => (
              <MotionLink
                key={area.label}
                to="/research/$slug"
                params={{ slug: area.slug }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: (i % 3) * 0.1, duration: 0.55, ease: "easeOut" }}
                className="group rounded-3xl bg-white border border-[#0B6477]/10 p-7 flex flex-col gap-4 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B6477] flex items-center justify-center">
                    <area.icon className="w-6 h-6 text-[#45DFB1]" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-[#0B6477] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <h2
                  className="text-xl md:text-2xl font-medium text-neutral-900 leading-snug"
                  style={display}
                >
                  {area.label}
                </h2>
                <p
                  className="text-sm md:text-base font-normal text-neutral-500 leading-relaxed"
                  style={body}
                >
                  {area.desc}
                </p>
              </MotionLink>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <h2
            className="text-center text-3xl md:text-4xl font-semibold tracking-[-0.025em] text-neutral-900 mb-12"
            style={display}
          >
            How our research <span style={accent}>reaches the field</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.15, duration: 0.55, ease: "easeOut" }}
                className="rounded-3xl bg-[#08313A] p-8 flex flex-col gap-3"
              >
                <div
                  className="text-5xl font-semibold text-[#45DFB1]"
                  style={display}
                >
                  {step.number}
                </div>
                <div
                  className="text-2xl font-medium text-white"
                  style={display}
                >
                  {step.title}
                </div>
                <p
                  className="text-base font-normal text-white/70 leading-relaxed"
                  style={body}
                >
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
