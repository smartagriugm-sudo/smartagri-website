import { createFileRoute, createLink } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const MotionLink = createLink(motion.a);
import { accent, body, display } from "../lib/fonts";
import { PUBLICATIONS } from "../lib/publications";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/publications")({
  component: PublicationsPage,
  head: () => ({
    meta: [
      {
        title: "Publications | smartagri",
      },
      {
        name: "description",
        content:
          "Peer-reviewed publications from the Smart Agriculture Research Center on AI, IoT sensing, and data-driven agriculture.",
      },
    ],
  }),
});

const years = [...new Set(PUBLICATIONS.map((pub) => pub.year))];

function PublicationsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="Publications"
            title={
              <>
                From the field to <span style={accent}>peer review</span>
              </>
            }
            subtitle="Our peer-reviewed work on sensing, modeling, and the human side of data-driven agriculture, newest first."
          />
          <div className="max-w-[900px] mx-auto flex flex-col gap-12">
            {years.map((year) => (
              <div key={year}>
                <h2
                  className="text-2xl md:text-3xl font-semibold text-[#0B6477] mb-5"
                  style={display}
                >
                  {year}
                </h2>
                <div className="flex flex-col gap-4">
                  {PUBLICATIONS.filter((pub) => pub.year === year).map(
                    (pub, i) => (
                      <MotionLink
                        key={pub.title}
                        to="/publications/$slug"
                        params={{ slug: pub.slug }}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{
                          delay: i * 0.08,
                          duration: 0.5,
                          ease: "easeOut",
                        }}
                        className="group rounded-2xl bg-white border border-[#0B6477]/10 hover:shadow-lg transition-shadow p-6 md:p-7 flex items-start gap-5"
                      >
                        <span className="flex-1">
                          <span
                            className="block text-lg md:text-xl font-medium text-neutral-900 leading-snug"
                            style={display}
                          >
                            {pub.title}
                          </span>
                          <span
                            className="block text-sm md:text-base font-normal text-neutral-500 mt-1"
                            style={body}
                          >
                            {pub.authors} · {pub.venue}
                          </span>
                        </span>
                        <ArrowUpRight className="shrink-0 w-6 h-6 text-[#0B6477] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </MotionLink>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
