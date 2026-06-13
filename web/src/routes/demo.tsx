import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { DEMOS, type WorkflowDemo } from "../lib/demos";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import CallToAction from "../components/CallToAction";
import WorkflowEmbed from "../components/WorkflowEmbed";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "Interactive Demo | smartagri" },
      {
        name: "description",
        content:
          "Interactive workflow simulations of smartagri systems, from the smart greenhouse agent to irrigation, UAV mapping, and field monitoring.",
      },
    ],
  }),
});

function DemoPage() {
  const [active, setActive] = useState<WorkflowDemo>(DEMOS[0]);

  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="Interactive Demo"
            title={
              <>
                Workflow simulations of <span style={accent}>our systems</span>
              </>
            }
            subtitle="Pick a system to watch how it senses, decides, and acts, the same demos we run live at our booth. More systems are on the way."
          />

          {/* System selector */}
          <div className="flex flex-wrap gap-3 mb-8">
            {DEMOS.map((demo) => {
              const isActive = demo.slug === active.slug;
              const available = Boolean(demo.src);
              return (
                <button
                  key={demo.slug}
                  onClick={() => setActive(demo)}
                  className={
                    isActive
                      ? "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium bg-[#0B6477] text-white transition-colors"
                      : "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium bg-white border border-[#0B6477]/15 text-neutral-600 hover:border-[#0B6477] hover:text-[#0B6477] transition-colors"
                  }
                  style={body}
                >
                  <demo.icon className="w-4 h-4" />
                  {demo.title}
                  {!available && (
                    <span
                      className={
                        isActive
                          ? "rounded-full bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5"
                          : "rounded-full bg-[#0B6477]/10 text-[#0B6477] text-[10px] font-semibold px-2 py-0.5"
                      }
                    >
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active system: description + embed or coming-soon */}
          <motion.div
            key={active.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div className="flex items-start gap-4 max-w-[760px]">
                <div className="w-12 h-12 rounded-2xl bg-[#0B6477] flex items-center justify-center shrink-0">
                  <active.icon className="w-6 h-6 text-[#45DFB1]" />
                </div>
                <div>
                  <h2
                    className="text-xl md:text-2xl font-semibold text-neutral-900 leading-snug"
                    style={display}
                  >
                    {active.title}
                  </h2>
                  <p
                    className="text-sm md:text-base font-normal text-neutral-500 leading-relaxed mt-1"
                    style={body}
                  >
                    {active.desc}
                  </p>
                </div>
              </div>
              {active.src && (
                <a
                  href={active.src}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#0B6477] hover:underline shrink-0"
                  style={body}
                >
                  <Maximize2 className="w-4 h-4" />
                  Open full screen
                </a>
              )}
            </div>

            {active.src ? (
              <WorkflowEmbed
                src={active.src}
                title={`${active.title} workflow`}
                height={active.height ?? 720}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-[#0B6477]/25 bg-white p-12 md:p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#0B6477] flex items-center justify-center mx-auto mb-5">
                  <active.icon className="w-7 h-7 text-[#45DFB1]" />
                </div>
                <h3
                  className="text-xl md:text-2xl font-semibold text-neutral-900"
                  style={display}
                >
                  Workflow simulation coming soon
                </h3>
                <p
                  className="text-sm md:text-base font-normal text-neutral-500 max-w-[480px] mx-auto mt-3"
                  style={body}
                >
                  We're building an interactive walkthrough of the {active.title}{" "}
                  system. In the meantime, come see it live at our booth.
                </p>
              </div>
            )}
          </motion.div>

          <p
            className="text-xs font-normal text-neutral-400 mt-4"
            style={body}
          >
            Tip: each simulation runs on its own, with play/pause, scenario
            navigation, and a speed control inside the panel.
          </p>
        </div>
      </section>

      <CallToAction />
      <Footer />
    </main>
  );
}
