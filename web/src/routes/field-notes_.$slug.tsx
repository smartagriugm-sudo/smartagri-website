import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { body, display } from "../lib/fonts";
import { findNote } from "../lib/notes";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export const Route = createFileRoute("/field-notes_/$slug")({
  component: NoteDetailPage,
  loader: ({ params }) => findNote(params.slug),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Field Notes"} | smartagri` },
      ...(loaderData?.excerpt
        ? [{ name: "description", content: loaderData.excerpt }]
        : []),
    ],
  }),
});

// Writers position images via the alt text in the CMS markdown editor:
//   ![Caption|left](/brand/uploads/x.jpg)  → floats left, text wraps right
//   ![Caption|right](/brand/uploads/x.jpg) → floats right, text wraps left
//   ![Caption](/brand/uploads/x.jpg)       → full column width (default)
function ArticleImage(props: { src?: string; alt?: string }) {
  const [caption, align] = (props.alt ?? "").split("|");
  const cls =
    align === "left"
      ? "sm:float-left sm:w-1/2 sm:mr-6 my-2 rounded-2xl"
      : align === "right"
        ? "sm:float-right sm:w-1/2 sm:ml-6 my-2 rounded-2xl"
        : "w-full rounded-2xl";
  return (
    <img
      src={props.src}
      alt={caption}
      loading="lazy"
      decoding="async"
      className={cls}
    />
  );
}

type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: { src?: string; alt?: string };
  children?: HastNode[];
};

// Two or more images written on the same line render as a side-by-side
// gallery row (3 per row max, wrapping to the next line):
//   ![](/brand/uploads/a.jpg) ![](/brand/uploads/b.jpg) ![](/brand/uploads/c.jpg)
function ArticleParagraph({
  node,
  children,
}: {
  node?: HastNode;
  children?: React.ReactNode;
}) {
  const kids = node?.children ?? [];
  const images = kids.filter((kid) => kid.tagName === "img");
  const onlyImages =
    images.length >= 2 &&
    kids.every(
      (kid) =>
        kid.tagName === "img" ||
        kid.tagName === "br" ||
        (kid.type === "text" && !(kid.value ?? "").trim()),
    );

  if (onlyImages) {
    const columns = Math.min(images.length, 3);
    return (
      <div
        className="grid gap-4 my-6"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {images.map((img, i) => (
          <img
            key={i}
            src={img.properties?.src}
            alt={(img.properties?.alt ?? "").split("|")[0]}
            loading="lazy"
            decoding="async"
            className="w-full h-auto rounded-xl !my-0"
          />
        ))}
      </div>
    );
  }
  return <p>{children}</p>;
}

function hastText(node?: HastNode): string {
  if (!node) return "";
  if (node.value) return node.value;
  return (node.children ?? []).map(hastText).join("");
}

// A blockquote whose first line is `[!LABEL] Title` renders as a soft, rounded
// callout box (used for the "About" boilerplate); every other blockquote keeps
// the default pull-quote styling (teal vertical rule).
function ArticleBlockquote({
  node,
  children,
}: {
  node?: HastNode;
  children?: React.ReactNode;
}) {
  const firstP = (node?.children ?? []).find((kid) => kid.tagName === "p");
  const marker = hastText(firstP).match(/^\[!(\w+)\]\s*(.*)$/);
  if (marker) {
    const title = marker[2];
    const rest = (Array.isArray(children) ? children : [children]).filter(
      (child) => typeof child !== "string" || child.trim(),
    );
    rest.shift(); // drop the marker paragraph
    return (
      <aside className="not-prose my-8 rounded-2xl border border-[#0B6477]/15 bg-[#F3F7F6] p-6 sm:p-8">
        {title && (
          <p
            className="mb-3 text-[13px] font-medium tracking-[0.03em] text-[#0B6477]"
            style={body}
          >
            {title}
          </p>
        )}
        <div
          className="text-[15px] font-normal leading-relaxed text-neutral-600 [&_em]:italic"
          style={body}
        >
          {rest}
        </div>
      </aside>
    );
  }
  return <blockquote>{children}</blockquote>;
}

// ~200 words per minute, rounded, never below 1.
function readingMinutes(markdown?: string): number {
  const words = (markdown ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function NoteDetailPage() {
  const note = Route.useLoaderData();

  if (!note) {
    return (
      <main>
        <SiteHeader />
        <section className="bg-[#F3F7F6]">
          <div className="max-w-[760px] mx-auto px-6 py-24 text-center flex flex-col items-center gap-4">
            <h1
              className="text-3xl md:text-4xl font-semibold text-neutral-900"
              style={display}
            >
              Article not found
            </h1>
            <p className="text-neutral-500" style={body}>
              The note you're looking for doesn't exist or may have been moved.
            </p>
            <Link
              to="/field-notes"
              className="px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
              style={body}
            >
              Back to Field Notes
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <SiteHeader />
      <article className="bg-white">
        <div className="max-w-[760px] mx-auto px-6 pt-12 md:pt-16 pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <Link
              to="/field-notes"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#0B6477] hover:underline mb-8"
              style={body}
            >
              <ArrowLeft className="w-4 h-4" />
              All field notes
            </Link>
            <p
              className="text-[13px] font-medium tracking-[0.03em] text-[#0B6477] mb-4"
              style={body}
            >
              {note.eyebrow || note.category}
            </p>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
              style={display}
            >
              {note.title}
            </h1>
            {note.subtitle && (
              <p
                className="mt-5 text-lg md:text-xl font-normal italic text-neutral-500 leading-relaxed"
                style={body}
              >
                {note.subtitle}
              </p>
            )}
            <div
              className="mt-6 mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-normal text-neutral-400"
              style={body}
            >
              <span className="font-medium text-neutral-600">
                {note.dateline ? `${note.dateline}, ${note.date}` : note.date}
              </span>
              {note.author && (
                <>
                  <span aria-hidden>·</span>
                  <span>{note.author}</span>
                </>
              )}
              <span aria-hidden>·</span>
              <span>± {readingMinutes(note.body)} min read</span>
            </div>
            {note.cover && (
              <img
                src={note.cover}
                alt=""
                className="w-full max-h-[440px] object-cover rounded-3xl mb-10"
              />
            )}
            <div
              className="prose prose-neutral prose-lg max-w-none prose-headings:font-semibold prose-headings:tracking-[-0.02em] prose-a:text-[#0B6477] prose-blockquote:border-l-[#14919B] prose-blockquote:not-italic prose-blockquote:font-normal prose-blockquote:text-neutral-700 prose-li:marker:text-[#14919B] [&::after]:content-[''] [&::after]:block [&::after]:clear-both"
              style={body}
            >
              {note.body ? (
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ArticleImage,
                    p: ArticleParagraph,
                    blockquote: ArticleBlockquote,
                  }}
                >
                  {note.body}
                </Markdown>
              ) : (
                <p>{note.excerpt}</p>
              )}
            </div>
            {note.tags && note.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-neutral-200 flex flex-wrap items-center gap-2">
                <span
                  className="text-sm font-medium text-neutral-400 mr-1"
                  style={body}
                >
                  Tags:
                </span>
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#0B6477]/25 px-3 py-1 text-sm font-normal text-[#0B6477]"
                    style={body}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {note.sourceUrl && (
              <p
                className="mt-8 text-sm font-normal text-neutral-400"
                style={body}
              >
                Originally published on our previous site.{" "}
                <a
                  href={note.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#0B6477] font-medium hover:underline"
                >
                  Read the original
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </p>
            )}
          </motion.div>
        </div>
      </article>
      <Footer />
    </main>
  );
}
