import { useMemo, useState } from "react";
import { createFileRoute, createLink } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, Search } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { PUBLICATIONS } from "../lib/publications";
import PageHero from "../components/PageHero";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

const MotionLink = createLink(motion.a);

export const Route = createFileRoute("/publications")({
  component: PublicationsPage,
  head: () => ({
    meta: [
      { title: "Publications | smartagri" },
      {
        name: "description",
        content:
          "Peer-reviewed publications from the Smart Agriculture Research Center on AI, IoT sensing, and data-driven agriculture.",
      },
    ],
  }),
});

const YEARS = [...new Set(PUBLICATIONS.map((p) => p.year))].sort(
  (a, b) => Number(b) - Number(a),
);

type SortKey = "newest" | "oldest" | "cited";

const selectClass =
  "h-11 rounded-xl border border-[#0B6477]/20 bg-white px-3.5 text-sm text-neutral-700 outline-none focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/25 transition-colors";

function PublicationsPage() {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = PUBLICATIONS.filter((p) => {
      if (year !== "all" && p.year !== year) return false;
      if (!q) return true;
      return `${p.title} ${p.authors} ${p.venue}`.toLowerCase().includes(q);
    });
    const sorted = [...list];
    if (sort === "oldest") sorted.reverse();
    else if (sort === "cited")
      sorted.sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0));
    // "newest" keeps PUBLICATIONS' default (year desc) order
    return sorted;
  }, [query, year, sort]);

  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1000px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-20">
          <PageHero
            eyebrow="Publications"
            title={
              <>
                From the field to <span style={accent}>peer review</span>
              </>
            }
            subtitle="Our peer-reviewed work on sensing, modeling, and the human side of data-driven agriculture. Search, filter by year, or sort by citations."
          />

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, author, or journal"
                className="w-full h-11 rounded-xl border border-[#0B6477]/20 bg-white pl-10 pr-4 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/25 transition-colors"
                style={body}
              />
            </div>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={selectClass}
              style={body}
              aria-label="Filter by year"
            >
              <option value="all">All years</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={selectClass}
              style={body}
              aria-label="Sort"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="cited">Most cited</option>
            </select>
          </div>

          {/* Result count */}
          <div className="text-sm text-neutral-500 mb-3" style={body}>
            {results.length} publication{results.length === 1 ? "" : "s"}
          </div>

          {/* Column header (Scholar-style) */}
          <div className="hidden sm:flex items-center gap-4 px-5 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400">
            <span className="flex-1" style={body}>
              Title
            </span>
            <span className="w-20 text-center" style={body}>
              Cited by
            </span>
            <span className="w-14 text-right" style={body}>
              Year
            </span>
          </div>

          {/* List */}
          <div className="rounded-2xl bg-white border border-[#0B6477]/10 overflow-hidden">
            {results.length === 0 ? (
              <p className="p-8 text-center text-neutral-500" style={body}>
                No publications match your search.
              </p>
            ) : (
              results.map((pub) => (
                <MotionLink
                  key={pub.slug}
                  to="/publications/$slug"
                  params={{ slug: pub.slug }}
                  className="group flex items-start gap-4 px-5 py-4 border-b border-[#0B6477]/8 last:border-0 hover:bg-[#F3F7F6]/70 transition-colors"
                >
                  <span className="flex-1 min-w-0">
                    <span
                      className="block text-[15px] md:text-base font-medium text-neutral-900 leading-snug group-hover:text-[#0B6477] transition-colors"
                      style={display}
                    >
                      {pub.title}
                    </span>
                    <span
                      className="block text-[13px] md:text-sm font-normal text-neutral-500 mt-1"
                      style={body}
                    >
                      {pub.venue ? `${pub.authors} · ${pub.venue}` : pub.authors}
                    </span>
                    {/* Mobile meta */}
                    <span className="sm:hidden mt-2 flex items-center gap-4 text-xs text-neutral-400" style={body}>
                      <span>Cited by {pub.citations ?? 0}</span>
                      <span>{pub.year}</span>
                    </span>
                  </span>
                  <span
                    className="hidden sm:block w-20 text-center text-[15px] tabular-nums text-neutral-700"
                    style={body}
                  >
                    {pub.citations ?? 0}
                  </span>
                  <span
                    className="hidden sm:block w-14 text-right text-[15px] tabular-nums text-neutral-500"
                    style={body}
                  >
                    {pub.year}
                  </span>
                  <ArrowUpRight className="hidden md:block shrink-0 w-4 h-4 text-[#0B6477] opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </MotionLink>
              ))
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
