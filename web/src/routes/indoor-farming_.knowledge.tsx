import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, BookOpen } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { IF_NOTE_TAGS } from "../lib/indoor-farming";
import { categoryChip, covers, notes } from "../lib/notes";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingNav from "../components/IndoorFarmingNav";
import Footer from "../components/Footer";

export const Route = createFileRoute("/indoor-farming_/knowledge")({
  component: IndoorFarmingKnowledge,
  head: () => ({
    meta: [
      { title: "Knowledge · Indoor Farming | smartagri" },
      {
        name: "description",
        content:
          "Field notes, trials, and publications on controlled-environment agriculture in the tropics from the Smart Agriculture Research Center, Universitas Gadjah Mada.",
      },
    ],
  }),
});

// Notes that touch controlled-environment growing, matched by tag or by
// keyword so the page stays useful even before the tags are tidied up in the CMS.
const KEYWORDS = [
  "greenhouse",
  "indoor farming",
  "plant factory",
  "hydroponic",
  "vpd",
  "vapor pressure",
  "vapour pressure",
  "controlled environment",
  "hyperspectral",
  "microgreen",
  "fertigation",
  "nutrient",
];

function isRelevant(note: (typeof notes)[number]): boolean {
  if (note.tags?.some((tag) => IF_NOTE_TAGS.includes(tag))) return true;
  const hay = `${note.title} ${note.excerpt}`.toLowerCase();
  return KEYWORDS.some((kw) => hay.includes(kw));
}

function IndoorFarmingKnowledge() {
  const related = notes.filter(isRelevant);

  return (
    <main>
      <SiteHeader />
      <IndoorFarmingNav />

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
              Knowledge
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.05] text-neutral-900 max-w-[820px]"
              style={display}
            >
              What we are learning, as we{" "}
              <span style={accent}>learn it</span>
            </h1>
            <p
              className="mt-5 text-base md:text-lg font-normal text-neutral-500 leading-relaxed max-w-[680px]"
              style={body}
            >
              Trials, installations, and training from our greenhouses and plant
              factory. Written up as they happen rather than saved for a final
              report.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-14 md:py-20">
          {related.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#0B6477]/25 bg-white p-10 text-center">
              <p
                className="text-base font-normal text-neutral-500 max-w-[520px] mx-auto"
                style={body}
              >
                Articles on controlled-environment growing will appear here as
                they are published. In the meantime, browse all of our field
                notes.
              </p>
              <Link
                to="/field-notes"
                className="mt-6 inline-flex items-center gap-2 h-12 px-7 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-base font-medium hover:bg-[#80ED99] transition-colors"
                style={body}
              >
                All field notes
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <h2
                  className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-neutral-900"
                  style={display}
                >
                  {related.length} related{" "}
                  <span style={accent}>
                    {related.length === 1 ? "article" : "articles"}
                  </span>
                </h2>
                <Link
                  to="/field-notes"
                  className="inline-flex items-center gap-1.5 text-[#0B6477] font-medium hover:underline"
                  style={body}
                >
                  Browse all field notes
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {related.map((note, i) => (
                  <motion.div
                    key={note.slug}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      delay: Math.min(i, 5) * 0.05,
                      duration: 0.45,
                      ease: "easeOut",
                    }}
                  >
                    <Link
                      to="/field-notes/$slug"
                      params={{ slug: note.slug }}
                      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#0B6477]/10 bg-white transition-colors hover:border-[#14919B]/40"
                    >
                      <div
                        className="aspect-[16/10] w-full overflow-hidden"
                        style={
                          note.cover
                            ? undefined
                            : { background: covers[i % covers.length] }
                        }
                      >
                        {note.cover && (
                          <img
                            src={note.cover}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-7">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryChip(note.category)}`}
                          style={body}
                        >
                          {note.category}
                        </span>
                        <span
                          className="text-sm font-normal text-neutral-400"
                          style={body}
                        >
                          {note.date}
                        </span>
                      </div>
                      <h3
                        className="text-lg font-medium text-neutral-900 leading-snug group-hover:text-[#0B6477] transition-colors"
                        style={display}
                      >
                        {note.title}
                      </h3>
                      <p
                        className="text-sm font-normal text-neutral-500 leading-relaxed line-clamp-3"
                        style={body}
                      >
                        {note.excerpt}
                      </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Publications pointer */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-14 md:py-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-3xl border border-[#0B6477]/10 bg-[#F3F7F6] p-8 md:p-10">
            <div className="flex gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-white flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#0B6477]" />
              </div>
              <div>
                <h2
                  className="text-xl sm:text-2xl font-semibold tracking-[-0.025em] text-neutral-900"
                  style={display}
                >
                  Peer-reviewed <span style={accent}>publications</span>
                </h2>
                <p
                  className="mt-2 text-base font-normal text-neutral-500 max-w-[560px]"
                  style={body}
                >
                  The underlying science, including work on plant sensing,
                  climate control, and controlled-environment production.
                </p>
              </div>
            </div>
            <Link
              to="/publications"
              className="inline-flex items-center gap-2 h-12 px-7 shrink-0 rounded-2xl border border-[#0B6477]/20 text-[#0B6477] text-base font-medium hover:bg-white transition-colors"
              style={body}
            >
              Browse publications
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
