import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { body, display } from "../lib/fonts";
import { findPublication } from "../lib/publications";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/publications_/$slug")({
  component: PublicationDetailPage,
  loader: ({ params }) => findPublication(params.slug),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Publications"} — smartagri` },
      ...(loaderData?.abstract
        ? [{ name: "description", content: loaderData.abstract.slice(0, 160) }]
        : []),
    ],
  }),
});

type CrossrefMeta = {
  publishedDate?: string;
  journal?: string;
  volume?: string;
  pages?: string;
  publisher?: string;
  abstract?: string;
  citations?: number;
};

function extractDoi(link?: string): string | null {
  if (!link) return null;
  const match = link.match(/10\.\d{4,9}\/[^\s"']+/);
  return match ? match[0] : null;
}

// Bibliographic data and citation count are fetched live from the Crossref
// API (the official DOI registry) using the publication's DOI.
function useCrossref(doi: string | null) {
  const [meta, setMeta] = useState<CrossrefMeta | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  useEffect(() => {
    if (!doi) return;
    let cancelled = false;
    setStatus("loading");
    fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        const m = data.message ?? {};
        const dateParts: number[] | undefined = m.published?.["date-parts"]?.[0];
        setMeta({
          publishedDate: dateParts?.join("/"),
          journal: m["container-title"]?.[0],
          volume: m.volume,
          pages: m.page,
          publisher: m.publisher,
          abstract: m.abstract
            ? String(m.abstract)
                .replace(/<\/?[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
            : undefined,
          citations: m["is-referenced-by-count"],
        });
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [doi]);

  return { meta, status };
}

function PublicationDetailPage() {
  const pub = Route.useLoaderData();
  const doi = extractDoi(pub?.link);
  const { meta, status } = useCrossref(doi);

  if (!pub) {
    return (
      <main>
        <SiteHeader />
        <section className="bg-[#F3F7F6]">
          <div className="max-w-[760px] mx-auto px-6 py-24 text-center flex flex-col items-center gap-4">
            <h1
              className="text-3xl md:text-4xl font-semibold text-neutral-900"
              style={display}
            >
              Publication not found
            </h1>
            <Link
              to="/publications"
              className="px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
              style={body}
            >
              Back to Publications
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const loadingDots = status === "loading" ? "…" : undefined;
  const abstract = pub.abstract || meta?.abstract;
  const rows: { label: string; value?: string }[] = [
    { label: "Authors", value: pub.authors },
    {
      label: "Publication date",
      value: meta?.publishedDate ?? loadingDots ?? pub.year,
    },
    { label: "Journal", value: pub.venue || meta?.journal },
    { label: "Volume", value: meta?.volume ?? loadingDots },
    { label: "Pages", value: meta?.pages ?? loadingDots },
    { label: "Publisher", value: meta?.publisher ?? loadingDots },
  ];

  return (
    <main>
      <SiteHeader />
      <article className="bg-white">
        <div className="max-w-[860px] mx-auto px-6 pt-12 md:pt-16 pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <Link
              to="/publications"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#0B6477] hover:underline mb-8"
              style={body}
            >
              <ArrowLeft className="w-4 h-4" />
              All publications
            </Link>

            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.025em] leading-[1.15] text-neutral-900 mb-6"
              style={display}
            >
              {pub.title}
            </h1>

            {pub.link && (
              <a
                href={pub.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 h-11 px-6 bg-[#45DFB1] rounded-2xl text-[#0B2A22] font-medium hover:bg-[#80ED99] transition-colors mb-8"
                style={body}
              >
                View at publisher
                <ArrowUpRight className="w-4 h-4" />
              </a>
            )}

            {pub.cover && (
              <img
                src={pub.cover}
                alt=""
                className="w-full max-h-[400px] object-contain bg-[#F3F7F6] rounded-2xl mb-8"
              />
            )}

            <dl className="border-t border-neutral-200">
              {rows
                .filter((row) => row.value)
                .map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[130px_1fr] sm:grid-cols-[170px_1fr] gap-4 py-3 border-b border-neutral-100"
                  >
                    <dt
                      className="text-sm font-normal text-neutral-400"
                      style={body}
                    >
                      {row.label}
                    </dt>
                    <dd
                      className="text-sm sm:text-base font-normal text-neutral-800"
                      style={body}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              {abstract && (
                <div className="grid grid-cols-[130px_1fr] sm:grid-cols-[170px_1fr] gap-4 py-3 border-b border-neutral-100">
                  <dt
                    className="text-sm font-normal text-neutral-400"
                    style={body}
                  >
                    Description
                  </dt>
                  <dd
                    className="text-sm sm:text-base font-normal text-neutral-800 leading-relaxed"
                    style={body}
                  >
                    {abstract}
                  </dd>
                </div>
              )}
              {(meta?.citations !== undefined || status === "loading") && (
                <div className="grid grid-cols-[130px_1fr] sm:grid-cols-[170px_1fr] gap-4 py-3 border-b border-neutral-100">
                  <dt
                    className="text-sm font-normal text-neutral-400"
                    style={body}
                  >
                    Total citations
                  </dt>
                  <dd
                    className="text-sm sm:text-base font-medium text-[#0B6477]"
                    style={body}
                  >
                    {meta?.citations !== undefined
                      ? `Cited by ${meta.citations}`
                      : "…"}
                  </dd>
                </div>
              )}
            </dl>

            {doi && (
              <p
                className="mt-6 text-xs font-normal text-neutral-400"
                style={body}
              >
                Bibliographic data and citation count are retrieved live from
                Crossref via DOI {doi}.
              </p>
            )}
          </motion.div>
        </div>
      </article>
      <Footer />
    </main>
  );
}
