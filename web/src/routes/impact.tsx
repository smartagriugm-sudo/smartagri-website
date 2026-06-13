import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sprout, FlaskConical, Landmark } from "lucide-react";
import { accent, body, display, serif } from "../lib/fonts";
import { stats } from "../components/Impact";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/impact")({
  component: ImpactPage,
  head: () => ({
    meta: [
      {
        title: "Impact | smartagri",
      },
      {
        name: "description",
        content:
          "How the Smart Agriculture Research Center's work lands in the real world: for farmers, for science, and for policy.",
      },
    ],
  }),
});

const outcomes = [
  {
    icon: Sprout,
    title: "For farmers",
    desc: "Less water, fewer losses, better harvest timing. Our partner cooperatives use live field data to decide when to irrigate, scout, and sell.",
  },
  {
    icon: FlaskConical,
    title: "For science",
    desc: "Open datasets, reproducible models, and peer-reviewed methods that other research groups in the region can build on.",
  },
  {
    icon: Landmark,
    title: "For policy & partners",
    desc: "Evidence local governments and agribusiness partners use to target subsidies, insurance, and extension programs where they matter most.",
  },
];

function ImpactPage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="Impact"
            title={
              <>
                Research that <span style={accent}>delivers in the field</span>
              </>
            }
            subtitle="Numbers we hold ourselves to, and what they mean for the farmers, scientists, and policymakers we work with."
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-3xl bg-[#08313A] px-6 py-12 md:p-14 grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center text-center gap-2"
              >
                <div
                  className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] text-[#45DFB1]"
                  style={display}
                >
                  {stat.value}
                </div>
                <div
                  className="text-sm md:text-base font-normal text-white/70 max-w-[220px]"
                  style={body}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <h2
            className="text-center text-3xl md:text-4xl font-semibold tracking-[-0.025em] text-neutral-900 mb-12"
            style={display}
          >
            Where the impact <span style={accent}>lands</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {outcomes.map((outcome, i) => (
              <motion.div
                key={outcome.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.15, duration: 0.55, ease: "easeOut" }}
                className="rounded-3xl bg-[#F3F7F6] p-8 flex flex-col gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0B6477] flex items-center justify-center">
                  <outcome.icon className="w-6 h-6 text-[#45DFB1]" />
                </div>
                <h3
                  className="text-xl md:text-2xl font-medium text-neutral-900"
                  style={display}
                >
                  {outcome.title}
                </h3>
                <p
                  className="text-sm md:text-base font-normal text-neutral-500 leading-relaxed"
                  style={body}
                >
                  {outcome.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.blockquote
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-[820px] mx-auto text-center"
          >
            <p
              className="text-2xl md:text-3xl text-neutral-900 leading-snug"
              style={serif}
            >
              “Instead of guessing when to irrigate or treat crops, we now act
              on real data, like having an agronomist watching every plot, day
              and night.”
            </p>
            <footer className="mt-6">
              <span
                className="text-lg text-black"
                style={{ ...serif, fontStyle: "italic", fontWeight: 500 }}
              >
                Bayu Pratama,
              </span>{" "}
              <span
                className="text-base font-normal text-black/50"
                style={body}
              >
                Farm Cooperative Lead, Sleman
              </span>
            </footer>
          </motion.blockquote>
        </div>
      </section>
      <Footer />
    </main>
  );
}
