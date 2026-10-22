import { isValidElement, useEffect, useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Link2 } from "lucide-react";
import { A } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import { findNote, notes, type Note } from "../lib/notes";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import { CategoryChip, EASE, META, NoteCard, initials } from "../components/NoteParts";

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

// Natural sizes of article images, read up front (headers only) so portrait
// photos can be laid out side by side before the reader scrolls to them.
function useImageSizes(srcs: string[]) {
  const key = srcs.join("|");
  const [sizes, setSizes] = useState<Record<string, [number, number]>>({});
  useEffect(() => {
    if (!key) return;
    key.split("|").forEach((src) => {
      const probe = new Image();
      probe.onload = () =>
        setSizes((s) => ({ ...s, [src]: [probe.naturalWidth, probe.naturalHeight] }));
      probe.src = src;
    });
  }, [key]);
  return sizes;
}

const isPortrait = (size?: [number, number]) => !!size && size[1] > size[0] * 1.05;

// Writers position images via the alt text in the CMS markdown editor:
//   ![Caption|left](/brand/uploads/x.jpg)  → floats left, text wraps right
//   ![Caption|right](/brand/uploads/x.jpg) → floats right, text wraps left
//   ![Caption](/brand/uploads/x.jpg)       → full column width (default);
//                                            a lone portrait shot is narrowed
//                                            and centred instead
function ArticleImage(props: { src?: string; alt?: string }) {
  const [caption, align] = (props.alt ?? "").split("|");
  const sizes = useImageSizes(props.src && !align ? [props.src] : []);
  const cls =
    align === "left"
      ? "sm:float-left sm:w-1/2 sm:mr-6 my-2 rounded-2xl"
      : align === "right"
        ? "sm:float-right sm:w-1/2 sm:ml-6 my-2 rounded-2xl"
        : isPortrait(props.src ? sizes[props.src] : undefined)
          ? "mx-auto block w-full sm:w-2/3 rounded-2xl"
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
  properties?: { src?: string; alt?: string; dataImageRun?: string };
  children?: HastNode[];
};

const isBlank = (n: HastNode) => n.type === "text" && !(n.value ?? "").trim();

// The single <img> of a paragraph that holds nothing else, if it is one.
function loneImage(n: HastNode): HastNode | null {
  if (n.tagName !== "p") return null;
  const kids = (n.children ?? []).filter((k) => !isBlank(k));
  return kids.length === 1 && kids[0].tagName === "img" ? kids[0] : null;
}

// Rehype step: photos written one per paragraph, back to back, become one
// "image run" so the renderer can line portrait shots up side by side.
function rehypeImageRuns() {
  return (tree: HastNode) => {
    const out: HastNode[] = [];
    let run: HastNode[] = [];
    let pending: HastNode[] = []; // blank text between paragraphs in a run
    const flush = () => {
      if (run.length >= 2) {
        out.push({
          type: "element",
          tagName: "div",
          properties: { dataImageRun: "" },
          children: run,
        });
      } else if (run.length === 1) {
        out.push({ type: "element", tagName: "p", properties: {}, children: run });
      }
      out.push(...pending);
      run = [];
      pending = [];
    };
    for (const node of tree.children ?? []) {
      const img = loneImage(node);
      if (img) {
        run.push(img);
        pending = [];
      } else if (run.length && isBlank(node)) {
        pending.push(node);
      } else {
        flush();
        out.push(node);
      }
    }
    flush();
    tree.children = out;
  };
}

// Splits n items into the fewest rows of at most 3, as even as possible
// (4 → 2 + 2, 5 → 3 + 2).
function balancedRows<T>(items: T[]): T[][] {
  const rows = Math.ceil(items.length / 3);
  const out: T[][] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const size = Math.ceil((items.length - i) / (rows - r));
    out.push(items.slice(i, i + size));
    i += size;
  }
  return out;
}

// Renders an image run: consecutive portrait shots sit up to three per row
// at a shared 3:4 crop; landscape shots keep the full column width.
function ImageRun({ images }: { images: { src: string; alt: string }[] }) {
  const sizes = useImageSizes(images.map((i) => i.src));
  const blocks: { portrait: boolean; items: typeof images }[] = [];
  for (const img of images) {
    const portrait = isPortrait(sizes[img.src]);
    const last = blocks[blocks.length - 1];
    if (portrait && last?.portrait) last.items.push(img);
    else blocks.push({ portrait, items: [img] });
  }
  return (
    <div className="not-prose my-8 flex flex-col gap-4">
      {blocks.flatMap((block, b) =>
        block.portrait && block.items.length > 1
          ? balancedRows(block.items).map((row, r) => (
              <div
                key={`${b}-${r}`}
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
              >
                {row.map((img) => (
                  <img
                    key={img.src}
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[3/4] w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            ))
          : block.items.map((img) => (
              <img
                key={img.src}
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                className={`rounded-2xl ${
                  block.portrait ? "mx-auto w-full sm:w-2/3" : "w-full"
                }`}
              />
            )),
      )}
    </div>
  );
}

function ArticleDiv({
  node,
  children,
  ...rest
}: {
  node?: HastNode;
  children?: ReactNode;
}) {
  if (node?.properties?.dataImageRun !== undefined) {
    const images = (node.children ?? [])
      .filter((k) => k.tagName === "img")
      .map((k) => ({
        src: k.properties?.src ?? "",
        alt: (k.properties?.alt ?? "").split("|")[0],
      }));
    return <ImageRun images={images} />;
  }
  return <div {...rest}>{children}</div>;
}

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
// callout box (used for the "About" boilerplate); every other blockquote is a
// pull quote (large text, mint rule) as in the Quayside journal.
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

// Heading ids for the "On this page" list, matched by the h2/h3 renderers.
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function headingsOf(markdown?: string) {
  return [...(markdown ?? "").matchAll(/^(##|###)\s+(.+)$/gm)].map((m) => {
    const text = m[2].replace(/[*_`]/g, "").trim();
    return { id: slugify(text), text, level: m[1].length };
  });
}

function textOf(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) return children.map(textOf).join("");
  // Headings written in bold or italics arrive as elements: read inside them.
  if (isValidElement<{ children?: ReactNode }>(children)) {
    return textOf(children.props.children);
  }
  return "";
}

function ArticleH2({ children }: { children?: ReactNode }) {
  return (
    <h2 id={slugify(textOf(children))} className="scroll-mt-28">
      {children}
    </h2>
  );
}

function ArticleH3({ children }: { children?: ReactNode }) {
  return (
    <h3 id={slugify(textOf(children))} className="scroll-mt-28">
      {children}
    </h3>
  );
}

// Highlights the heading currently being read (scroll spy).
function useActiveHeading(ids: string[]) {
  const key = ids.join("|");
  const [active, setActive] = useState(ids[0] ?? "");
  useEffect(() => {
    if (!key) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    key.split("|").forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [key]);
  return active;
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(window.location.href).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        });
      }}
      className="inline-flex items-center gap-2 rounded-full border border-[#0B6477]/20 bg-white/80 px-4 py-2 text-sm font-medium text-[#0B6477] transition-colors hover:border-[#0B6477]/50"
      style={body}
    >
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}

const AUTHOR_FALLBACK = "Smart Agriculture Research Center";

function Avatar({ note, size = "h-10 w-10" }: { note: Note; size?: string }) {
  return note.author ? (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full bg-[#F3F7F6] text-[13px] font-semibold text-[#0B6477]`}
      style={body}
    >
      {initials(note.author)}
    </span>
  ) : (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-[#F3F7F6]`}>
      <img src={A.iconColor} alt="" className="h-4 w-auto" />
    </span>
  );
}

// Side column: "On this page" for notes with two or more sections, otherwise
// the note's details. Sticky beside the article on large screens.
function Aside({ note, minutes }: { note: Note; minutes: number }) {
  const toc = headingsOf(note.body);
  const active = useActiveHeading(toc.length >= 2 ? toc.map((h) => h.id) : []);

  if (toc.length >= 2) {
    return (
      <nav aria-label="On this page">
        <p className={`mb-4 text-neutral-400 ${META}`} style={body}>
          On this page
        </p>
        <ul className="flex flex-col border-l border-[#0B6477]/15" style={body}>
          {toc.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={`-ml-px block border-l-2 py-1.5 text-sm transition-colors ${
                  h.level === 3 ? "pl-6" : "pl-4"
                } ${
                  active === h.id
                    ? "border-[#14919B] text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  const rows: [string, string][] = [
    ["Category", note.category],
    ["Published", note.date],
    ...(note.dateline ? ([["Location", note.dateline]] as [string, string][]) : []),
    ["Reading time", `${minutes} min`],
  ];
  return (
    <div>
      <p className={`mb-4 text-neutral-400 ${META}`} style={body}>
        In this note
      </p>
      <dl className="flex flex-col border-l border-[#0B6477]/15" style={body}>
        {rows.map(([k, v]) => (
          <div key={k} className="py-1.5 pl-4">
            <dt className="text-[12px] text-neutral-400">{k}</dt>
            <dd className="m-0 text-sm text-neutral-800">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// Same category first, then the newest notes, never the one being read.
function relatedTo(note: Note) {
  const others = notes.filter((n) => n.slug !== note.slug);
  return [
    ...others.filter((n) => n.category === note.category),
    ...others.filter((n) => n.category !== note.category),
  ].slice(0, 3);
}

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: EASE },
});

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

  const minutes = readingMinutes(note.body);
  const related = relatedTo(note);

  return (
    <main>
      <SiteHeader />
      <div className="relative overflow-clip bg-white">
        <AmbientWash count={4} />

        <article className="relative" key={note.slug}>
          {/* Masthead: back link, category, title sliding up, dek, byline. */}
          <header className="mx-auto max-w-[1200px] px-6 pt-10 md:px-12 md:pt-16">
            <motion.div {...rise(0)}>
              <Link
                to="/field-notes"
                className="group inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-[#0B6477]"
                style={body}
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Field Notes
              </Link>
            </motion.div>
            <motion.div {...rise(0.08)} className="mt-6">
              <CategoryChip>{note.eyebrow || note.category}</CategoryChip>
            </motion.div>
            <div className="mt-5 overflow-hidden pb-[0.08em]">
              <motion.h1
                initial={{ y: "40%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.9, ease: EASE }}
                className="max-w-[920px] text-[clamp(2rem,4.6vw,3.9rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-neutral-900"
                style={display}
              >
                {note.title}
              </motion.h1>
            </div>
            {note.subtitle && (
              <motion.p
                {...rise(0.3)}
                className="mt-6 max-w-[680px] text-lg leading-relaxed text-neutral-500 md:text-xl"
                style={body}
              >
                {note.subtitle}
              </motion.p>
            )}
            <motion.div
              {...rise(0.4)}
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3"
            >
              <div className="flex items-center gap-3">
                <Avatar note={note} />
                <span style={body}>
                  <span className="block text-sm font-medium text-neutral-900">
                    {note.author ?? AUTHOR_FALLBACK}
                  </span>
                  {note.dateline && (
                    <span className="block text-[13px] text-neutral-500">
                      {note.dateline}
                    </span>
                  )}
                </span>
              </div>
              <span className={`text-neutral-400 ${META}`} style={body}>
                {note.date} · {minutes} min read
              </span>
            </motion.div>
          </header>

          {note.cover && (
            <motion.figure
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.9, ease: EASE }}
              className="mx-auto mt-10 max-w-[1200px] px-6 md:mt-14 md:px-12"
            >
              <div className="relative overflow-hidden rounded-[28px] shadow-[0_30px_80px_-40px_rgba(8,49,58,0.5)]">
                <img
                  src={note.cover}
                  alt=""
                  className="aspect-[16/10] w-full object-cover md:aspect-[16/8]"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#08313A]/60 to-transparent" />
                <span
                  className={`absolute bottom-5 left-6 text-white/85 ${META}`}
                  style={body}
                >
                  {note.category}
                </span>
              </div>
            </motion.figure>
          )}

          {/* Body: sticky side column + article. */}
          <div className="mx-auto grid max-w-[1200px] gap-12 px-6 pb-20 pt-14 md:px-12 md:pt-20 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <Aside note={note} minutes={minutes} />
                <div className="mt-8">
                  <CopyLink />
                </div>
              </div>
            </aside>

            <div className="min-w-0 max-w-[700px]">
              <div
                className="prose prose-neutral prose-lg max-w-none prose-headings:font-semibold prose-headings:tracking-[-0.025em] prose-h2:mt-14 prose-a:text-[#0B6477] prose-blockquote:my-10 prose-blockquote:border-l-[3px] prose-blockquote:border-l-[#45DFB1] prose-blockquote:pl-6 prose-blockquote:not-italic prose-blockquote:text-xl md:prose-blockquote:text-2xl prose-blockquote:font-medium prose-blockquote:leading-snug prose-blockquote:tracking-[-0.015em] prose-blockquote:text-neutral-800 prose-li:marker:text-[#14919B] prose-strong:text-neutral-900 [&::after]:content-[''] [&::after]:block [&::after]:clear-both"
                style={body}
              >
                {note.body ? (
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeImageRuns]}
                    components={{
                      img: ArticleImage,
                      p: ArticleParagraph,
                      div: ArticleDiv,
                      blockquote: ArticleBlockquote,
                      h2: ArticleH2,
                      h3: ArticleH3,
                    }}
                  >
                    {note.body}
                  </Markdown>
                ) : (
                  <p>{note.excerpt}</p>
                )}
              </div>

              {note.tags && note.tags.length > 0 && (
                <div className="mt-12 flex flex-wrap items-center gap-2">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#0B6477]/20 bg-white/70 px-3 py-1 text-sm text-[#0B6477]"
                      style={body}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Sign-off: who wrote it, share link, original source. */}
              <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#0B6477]/12 pt-8">
                <div className="flex items-center gap-3">
                  <Avatar note={note} size="h-11 w-11" />
                  <span style={body}>
                    <span className="block text-[13px] text-neutral-400">Written by</span>
                    <span className="block text-[15px] font-medium text-neutral-900">
                      {note.author ?? AUTHOR_FALLBACK}
                    </span>
                  </span>
                </div>
                <CopyLink />
              </div>
              {note.sourceUrl && (
                <p className="mt-6 text-sm text-neutral-400" style={body}>
                  Originally published on our previous site.{" "}
                  <a
                    href={note.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[#0B6477] hover:underline"
                  >
                    Read the original
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </p>
              )}
            </div>
          </div>
        </article>

        {/* Keep reading: three more notes, same category first. */}
        {related.length > 0 && (
          <section className="relative border-t border-[#0B6477]/10">
            <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-12 md:py-24">
              <div className="mb-10 flex items-end justify-between gap-6">
                <h2
                  className="text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                  style={display}
                >
                  Keep
                  <br />
                  <span style={accent}>reading.</span>
                </h2>
                <Link
                  to="/field-notes"
                  className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                  style={body}
                >
                  All notes
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {related.map((n, i) => (
                  <motion.div
                    key={n.slug}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: i * 0.08, duration: 0.55, ease: EASE }}
                    className={i === 2 ? "md:hidden lg:block" : ""}
                  >
                    <NoteCard note={n} index={i + 1} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
}
